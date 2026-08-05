<div align="center">

# SlopChat

A free, self-hosted ManyChat alternative for Instagram comment-to-DM automation.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)

</div>

When someone comments a keyword on your Instagram reel or post, *SlopChat* automatically sends them a private reply via DM with your link. You can also configure a public comment reply to post under their comment at the same time.

ManyChat does this but charges a monthly fee. SlopChat gives you the exact same core feature—running on your own infrastructure, with no seat limits and no monthly plan caps.

## Why this exists

Comment-to-DM is a simple feature, but SaaS tools charge a recurring subscription for it. The actual logic is just a webhook, a keyword match, and an API call. That does not need to cost anything to run for your personal or business account.

SlopChat uses Meta's official Instagram private replies API. It does not scrape, it does not use browser automation, and it never asks for your Instagram password, keeping your account completely safe and within Meta's guidelines.

## Features

- **Keyword to DM:** Match one or many keywords per post (whole-word or partial).
- **Public Reply:** Post a visible comment reply on top of sending the DM.
- **Tracked Links:** Automatically convert URLs into tracked redirects to see clicks and CTR.
- **Tappable Buttons:** Send up to two link buttons in one DM, each with individual click stats.
- **Follow Gate:** Optionally require users to follow your account before they get the final link.
- **Personalization:** Greet commenters by their username automatically using `{username}`.
- **Rate Limit Queueing:** Stays under Meta's documented limit of 750 private replies per hour, queueing excess comments.
- **Multiple Accounts & Workspaces:** Connect several professional accounts under one team workspace.
- **Inbox:** Read Instagram DM conversations and reply directly from the dashboard.
- **DM Logs:** Every send, failure, or skip is logged for debugging.

## How it works

1. Someone comments on your Instagram post or reel.
2. Meta sends a webhook to your hosted SlopChat instance.
3. SlopChat checks the comment against your active campaigns.
4. On a keyword match, it queues the send job.
5. A background worker sends the private reply (and public reply if enabled).

The web app handles the dashboard and incoming webhooks, while a separate background worker process handles sending DMs (so they survive rate limits and network retries). Both share the same PostgreSQL database and Redis queue.

## Quick Start

To run SlopChat, you need a Meta Developer app, a Resend account for magic login links, and hosting (or docker to run locally).

### Running locally (Docker)

```bash
git clone https://github.com/hussainn7/slopchat.git
cd slopchat
npm install
cp .env.example .env      # then fill in the values, see docs/local-run.md
docker-compose up -d      # starts Postgres and Redis
npm run db:migrate
npm run dev               # dashboard runs on http://localhost:3000
npm run worker            # in a second terminal (sends the DMs)
```

For full environment variable details and how to configure the Meta Developer App, see [docs/setup.md](docs/setup.md).

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Database:** Prisma 7 with PostgreSQL
- **Queue:** BullMQ 5 on Redis
- **Auth:** Auth.js (NextAuth) with Resend email magic links
- **Styling:** Tailwind CSS 4

## Credits & License

This project is maintained by [Hussain](https://github.com/hussainn7). 

SlopChat is a customized fork of OpenReply by [Diwen Huang](https://github.com/diwenne) (originally based on `instagram-comment-to-dm` by Anish Raj).

MIT License. See [LICENSE](LICENSE) for details.
