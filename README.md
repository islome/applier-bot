This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# job-applier

## Job alerts (bot messages for matching vacancies)

When HR publishes a vacancy, the bot messages every candidate whose profile matches it, with a
button that opens the vacancy in the Mini App.

- Matching rule: `lib/vacancy-match.ts` (same major; `salary_max`, or `salary_min`, reaches `desired_salary`;
  `work_type = remote` only gets remote vacancies). The same rule shows the "Siz uchun" / "Для вас" tag on cards.
- Sending: `POST /api/vacancies/alerts` (`app/api/vacancies/alerts/route.ts`). Skips candidates with
  `job_alerts = false`, anyone already alerted for that vacancy (`vacancy_alerts` table), and anyone who got
  3 alerts in the last 24 hours. Sends at ~25 msg/s. If a user blocked the bot (403), sets `job_alerts = false`.
  Messages are in Russian when the candidate's Telegram `language_code` starts with `ru`, otherwise Uzbek.
- Candidates turn alerts on/off in Profile → Settings ("Yangi vakansiyalar haqida xabar").

### Setup

1. Run `supabase/005_job_alerts.sql` in the Supabase SQL Editor **before** deploying this version
   (the app reads `candidates.job_alerts`).
2. Add an env var to the app (Vercel → Settings → Environment Variables), then redeploy:
   - `JOB_ALERTS_SECRET`: a long random string, e.g. `openssl rand -hex 32`.
   - `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` are already used by the bot.
3. Create the Database Webhook in Supabase Dashboard → Database → Webhooks → **Create a new hook**:
   - Name: `vacancy-job-alerts`
   - Table: `public.vacancies`
   - Events: **Insert**. Also tick **Update** if HR saves drafts (`is_active = false`) and publishes later;
     the route only acts on an update that turns `is_active` from false to true.
   - Type: HTTP Request, Method: `POST`
   - URL: `https://<your-app-domain>/api/vacancies/alerts`
   - HTTP Headers: `Content-Type: application/json` and `x-job-alerts-secret: <JOB_ALERTS_SECRET>`
   - Timeout: 5000 ms. The route answers right after picking recipients and sends in the background.
     Calling it twice for the same vacancy is safe: nobody gets the same vacancy twice.

### Trigger by hand / dry run

`dry_run` logs the messages that would be sent (server logs) and returns the recipients, without sending
or writing anything:

```bash
curl -X POST "https://<your-app-domain>/api/vacancies/alerts?dry_run=1" \
  -H "x-job-alerts-secret: $JOB_ALERTS_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"vacancy_id": "<vacancy uuid>"}'
```

Drop `?dry_run=1` to really send (answers `202` with `queued`).
