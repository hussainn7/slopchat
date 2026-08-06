import { prisma } from "@/lib/db/client";
import { getDMQueue } from "@/lib/queue/client";
import { parseCommentEvents } from "@/lib/meta/webhook";

const DONE_STATUSES = ["SENT", "SKIPPED_DEDUP", "SKIPPED_PLAN_LIMIT"] as const;

/**
 * Vercel webhook handlers often hang on Redis (BullMQ TCP) after writing the
 * WebhookEvent row, so events sit at PENDING forever. The worker drains them.
 */
export async function drainPendingWebhooks(limit = 50): Promise<number> {
  const pending = await prisma.webhookEvent.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  if (pending.length === 0) return 0;

  const queue = getDMQueue();
  let enqueued = 0;

  for (const ev of pending) {
    try {
      const events = parseCommentEvents(
        ev.payload as unknown as Parameters<typeof parseCommentEvents>[0]
      );
      for (const event of events) {
        // Meta retries create fresh PENDING rows for the same comment. Don't
        // re-queue ones we already finished or permanently failed.
        const existing = await prisma.dmLog.findFirst({
          where: {
            commentId: event.commentId,
            OR: [
              { status: { in: [...DONE_STATUSES] } },
              {
                status: "FAILED",
                errorMessage: {
                  contains: "outside of allowed window",
                },
              },
            ],
          },
          select: { id: true },
        });
        if (existing) continue;

        await queue.add(
          "process-comment",
          {
            instagramAccountId: event.instagramAccountId,
            commentId: event.commentId,
            commentText: event.commentText,
            commenterId: event.commenterId,
            commenterName: event.commenterName,
            mediaId: event.mediaId,
            source: "WEBHOOK",
          },
          {
            jobId: `comment_${event.instagramAccountId}_${event.commentId}`,
          }
        );
        enqueued += 1;
      }
      await prisma.webhookEvent.update({
        where: { id: ev.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.webhookEvent.update({
        where: { id: ev.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          processedAt: new Date(),
        },
      });
    }
  }

  return enqueued;
}
