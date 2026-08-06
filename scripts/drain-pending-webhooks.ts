import "dotenv/config";
import { prisma } from "../lib/db/client";
import { getDMQueue } from "../lib/queue/client";
import { parseCommentEvents } from "../lib/meta/webhook";

async function main() {
  const pending = await prisma.webhookEvent.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  console.log("pending", pending.length);

  const queue = getDMQueue();
  let enqueued = 0;

  for (const ev of pending) {
    try {
      const events = parseCommentEvents(
        ev.payload as Parameters<typeof parseCommentEvents>[0]
      );
      for (const event of events) {
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
        console.log(
          "enqueued",
          JSON.stringify(event.commentText),
          event.commentId,
          "media",
          event.mediaId
        );
        enqueued += 1;
      }
      await prisma.webhookEvent.update({
        where: { id: ev.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("fail", ev.id, message);
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

  console.log("done", { enqueued, counts: await queue.getJobCounts() });
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
