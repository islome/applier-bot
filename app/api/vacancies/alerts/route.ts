import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { alertLanguage, buildJobAlert } from "@/lib/job-alerts";
import { callBotApi } from "@/lib/telegram-bot";
import { matches } from "@/lib/vacancy-match";
import type { WorkType } from "@/lib/candidate-schema";
import type { VacancyRow } from "@/lib/vacancy-types";

// Sending runs after the response (see after() below); give it room for a few thousand messages.
export const maxDuration = 300;

const DEFAULT_APP_URL = "https://applier-bot.vercel.app/";
const SECRET_HEADER = "x-job-alerts-secret";
const DAILY_CAP = 3; // alerts per candidate per rolling 24h
const SEND_INTERVAL_MS = 40; // ~25 msg/s, under Telegram's ~30 msg/s per-bot limit
const PAGE_SIZE = 1000; // PostgREST default max rows
const ID_CHUNK = 200; // candidate ids per `in (...)` filter, keeps the URL short

const VACANCY_COLUMNS =
  "id, title, company, city, major, employment_type, salary_min, salary_max, salary_currency, is_active";

// Accepts { vacancy_id } (manual / cron) or a Supabase Database Webhook payload ({ type, record, old_record }).
const bodySchema = z.object({
  vacancy_id: z.uuid().optional(),
  dry_run: z.boolean().optional(),
  type: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
  record: z.object({ id: z.uuid(), is_active: z.boolean().optional() }).nullish(),
  old_record: z.object({ is_active: z.boolean().optional() }).nullish(),
});

type Vacancy = Pick<
  VacancyRow,
  "id" | "title" | "company" | "city" | "major" | "employment_type" | "salary_min" | "salary_max" | "salary_currency"
> & { is_active: boolean };

type Candidate = {
  id: string;
  telegram_id: number;
  language_code: string | null;
  major: string;
  desired_salary: number | null;
  work_type: WorkType | null;
};

function secretOk(received: string | null): boolean {
  const expected = process.env.JOB_ALERTS_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * POST /api/vacancies/alerts -> message candidates whose profile matches a newly published vacancy.
 * Header `x-job-alerts-secret: $JOB_ALERTS_SECRET`. Add `?dry_run=1` (or `"dry_run": true`) to only log.
 */
export async function POST(req: Request) {
  if (!secretOk(req.headers.get(SECRET_HEADER))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const body = parsed.data;
  const dryRun = body.dry_run === true || new URL(req.url).searchParams.get("dry_run") === "1";

  if (body.type === "DELETE") return NextResponse.json({ skipped: "delete event" });
  // On UPDATE only react when a vacancy goes from inactive to active (draft -> published)
  if (body.type === "UPDATE" && !(body.record?.is_active === true && body.old_record?.is_active === false)) {
    return NextResponse.json({ skipped: "not newly published" });
  }

  const vacancyId = body.vacancy_id ?? body.record?.id;
  if (!vacancyId) return NextResponse.json({ error: "vacancy_id is required" }, { status: 400 });

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  }

  // Always re-read the vacancy: never trust the webhook payload's fields
  const { data: vacancy, error: vErr } = await db
    .from("vacancies")
    .select(VACANCY_COLUMNS)
    .eq("id", vacancyId)
    .maybeSingle<Vacancy>();
  if (vErr) {
    console.error("alerts: vacancy lookup failed:", vErr.message, vErr.code);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!vacancy) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  if (!vacancy.is_active) return NextResponse.json({ skipped: "vacancy is not active" });

  // 1. Candidates in the same major who want alerts (telegram_id < 0 = deleted, anonymised profile)
  const candidates: Candidate[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("candidates")
      .select("id, telegram_id, language_code, major, desired_salary, work_type")
      .eq("major", vacancy.major)
      .eq("job_alerts", true)
      .gt("telegram_id", 0)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("alerts: candidates lookup failed:", error.message, error.code);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    candidates.push(...((data ?? []) as Candidate[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  const matched = candidates.filter((c) => matches(c, vacancy));

  // 2. Skip anyone already alerted for this vacancy, or who hit the daily cap
  const alreadyAlerted = new Set<string>();
  const recentCount = new Map<string, number>();
  const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
  const since = new Date(sinceMs).toISOString();
  for (const ids of chunks(matched.map((c) => c.id), ID_CHUNK)) {
    const { data, error } = await db
      .from("vacancy_alerts")
      .select("vacancy_id, candidate_id, sent_at")
      .in("candidate_id", ids)
      .or(`vacancy_id.eq.${vacancy.id},sent_at.gte.${since}`);
    if (error) {
      console.error("alerts: history lookup failed:", error.message, error.code);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    for (const row of data ?? []) {
      if (row.vacancy_id === vacancy.id) alreadyAlerted.add(row.candidate_id);
      if (new Date(row.sent_at).getTime() >= sinceMs) recentCount.set(row.candidate_id, (recentCount.get(row.candidate_id) ?? 0) + 1);
    }
  }
  const notYet = matched.filter((c) => !alreadyAlerted.has(c.id));
  let recipients = notYet.filter((c) => (recentCount.get(c.id) ?? 0) < DAILY_CAP);

  const summary = {
    vacancy_id: vacancy.id,
    dry_run: dryRun,
    same_major: candidates.length,
    matched: matched.length,
    already_alerted: matched.length - notYet.length,
    over_daily_cap: notYet.length - recipients.length,
  };

  const appUrl = process.env.MINI_APP_URL || DEFAULT_APP_URL;

  if (dryRun) {
    for (const c of recipients) {
      const message = buildJobAlert(vacancy, alertLanguage(c.language_code), appUrl);
      console.log(
        `[job-alerts dry-run] would send to candidate ${c.id} (tg ${c.telegram_id}, ${alertLanguage(c.language_code)}):\n${message.text}\n-> ${message.reply_markup.inline_keyboard[0][0].web_app.url}`,
      );
    }
    console.log("[job-alerts dry-run] summary:", summary);
    return NextResponse.json({
      ...summary,
      would_send: recipients.map((c) => ({ candidate_id: c.id, language: alertLanguage(c.language_code) })),
    });
  }

  // 3. Claim rows first: the primary key makes a concurrent/retried call skip the same people
  const claimed = new Set<string>();
  for (const ids of chunks(recipients.map((c) => c.id), 500)) {
    const { data, error } = await db
      .from("vacancy_alerts")
      .upsert(
        ids.map((candidate_id) => ({ vacancy_id: vacancy.id, candidate_id })),
        { onConflict: "vacancy_id,candidate_id", ignoreDuplicates: true },
      )
      .select("candidate_id");
    if (error) {
      console.error("alerts: claim failed:", error.message, error.code);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    for (const row of data ?? []) claimed.add(row.candidate_id);
  }
  recipients = recipients.filter((c) => claimed.has(c.id));

  // 4. Send after responding, so the DB webhook (short timeout) isn't kept waiting
  after(() => sendAlerts(vacancy, recipients, appUrl));

  return NextResponse.json({ ...summary, queued: recipients.length }, { status: 202 });
}

async function sendAlerts(vacancy: Vacancy, recipients: Candidate[], appUrl: string) {
  const db = getSupabaseAdmin();
  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const c of recipients) {
    const message = buildJobAlert(vacancy, alertLanguage(c.language_code), appUrl);
    let res = await callBotApi("sendMessage", { chat_id: c.telegram_id, ...message });
    if (res.status === 429) {
      await sleep((res.retryAfter ?? 1) * 1000);
      res = await callBotApi("sendMessage", { chat_id: c.telegram_id, ...message });
    }

    if (res.ok) {
      sent += 1;
    } else {
      // Release the claim so a later run can retry; it was never delivered
      const { error } = await db
        .from("vacancy_alerts")
        .delete()
        .eq("vacancy_id", vacancy.id)
        .eq("candidate_id", c.id);
      if (error) console.error("alerts: release claim failed:", error.message);

      if (res.status === 403) {
        // User blocked the bot: stop alerting them until they turn it back on in Settings
        blocked += 1;
        const { error: offError } = await db.from("candidates").update({ job_alerts: false }).eq("id", c.id);
        if (offError) console.error("alerts: disabling job_alerts failed:", offError.message);
      } else {
        failed += 1;
        console.error(`alerts: sendMessage to candidate ${c.id} failed:`, res.status, res.description);
      }
    }

    await sleep(SEND_INTERVAL_MS);
  }

  console.log(`[job-alerts] vacancy ${vacancy.id}: sent ${sent}, blocked ${blocked}, failed ${failed}`);
}
