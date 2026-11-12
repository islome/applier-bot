import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  alertLanguage,
  buildJobAlert,
  buildVacancyStatusNotice,
  type VacancyStatusChange,
} from "@/lib/job-alerts";
import { normalizeStatus, type ApplicationStatus } from "@/lib/application-types";
import { callBotApi } from "@/lib/telegram-bot";
import { matches } from "@/lib/vacancy-match";
import type { WorkType } from "@/lib/candidate-schema";
import type { VacancyRow } from "@/lib/vacancy-types";

// Sending runs after the response (see after() below); give it room for a few thousand messages.
export const maxDuration = 300;

const DEFAULT_APP_URL = "https://applier-bot.vercel.app/";
const SECRET_HEADER = "x-job-alerts-secret";
const DAILY_CAP = 3; // job alerts per candidate per rolling 24h (applicant notices don't count)
const SEND_INTERVAL_MS = 40; // ~25 msg/s, under Telegram's ~30 msg/s per-bot limit
const PAGE_SIZE = 1000; // PostgREST default max rows
const ID_CHUNK = 200; // candidate ids per `in (...)` filter, keeps the URL short
// Applications still in progress: their candidates hear when the vacancy is paused or reopened
const OPEN_STATUSES: ApplicationStatus[] = ["new", "confirmed", "interview"];

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
};

type AlertCandidate = Candidate & {
  major: string;
  desired_salary: number | null;
  work_type: WorkType | null;
};

type Outgoing = {
  candidate: Candidate;
  payload: { text: string } & Record<string, unknown>;
  /** Called when Telegram did not deliver (after one 429 retry) */
  onFailed?: () => Promise<void>;
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

class DbError extends Error {}

type Db = ReturnType<typeof getSupabaseAdmin>;

/**
 * POST /api/vacancies/alerts, called by the Supabase webhook on `vacancies` insert/update.
 * - Vacancy published (insert, or inactive -> active): job alerts to matching candidates.
 * - Vacancy paused or reopened (is_active changed): notice to candidates with an open application.
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

  // On UPDATE only react when is_active actually flipped (plain edits are ignored)
  const wasActive = body.old_record?.is_active;
  const isActive = body.record?.is_active;
  let statusChange: VacancyStatusChange | null = null;
  if (body.type === "UPDATE") {
    if (typeof wasActive !== "boolean" || typeof isActive !== "boolean" || wasActive === isActive) {
      return NextResponse.json({ skipped: "active status did not change" });
    }
    statusChange = isActive ? "activated" : "deactivated";
  }

  const vacancyId = body.vacancy_id ?? body.record?.id;
  if (!vacancyId) return NextResponse.json({ error: "vacancy_id is required" }, { status: 400 });

  let db: Db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  }

  try {
    // Always re-read the vacancy: never trust the webhook payload's fields
    const { data: vacancy, error: vErr } = await db
      .from("vacancies")
      .select(VACANCY_COLUMNS)
      .eq("id", vacancyId)
      .maybeSingle<Vacancy>();
    if (vErr) throw new DbError(`vacancy lookup: ${vErr.message}`);
    if (!vacancy) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });

    // HR flipped it again before we ran: the newer webhook call will handle the current state
    if (statusChange && vacancy.is_active !== (statusChange === "activated")) {
      return NextResponse.json({ skipped: "active status changed again" });
    }

    const appUrl = process.env.MINI_APP_URL || DEFAULT_APP_URL;
    const applications = await loadApplications(db, vacancy.id);

    // 1. Applicant notices (paused / reopened)
    const notices: Outgoing[] = [];
    if (statusChange) {
      for (const a of applications) {
        if (!a.open || !a.candidate.notify_status || a.candidate.telegram_id <= 0) continue;
        notices.push({
          candidate: a.candidate,
          payload: buildVacancyStatusNotice(vacancy, statusChange, alertLanguage(a.candidate.language_code), appUrl),
        });
      }
    }

    // 2. Job alerts (only when the vacancy is live; people who already applied are skipped)
    const plan = vacancy.is_active
      ? await planJobAlerts(db, vacancy, new Set(applications.map((a) => a.candidate.id)))
      : null;

    const summary = {
      vacancy_id: vacancy.id,
      dry_run: dryRun,
      status_change: statusChange,
      applicant_notices: notices.length,
      job_alerts: plan?.summary ?? { skipped: "vacancy is not active" },
    };

    if (dryRun) {
      for (const n of notices) logDryRun("applicant notice", n.candidate, n.payload);
      for (const c of plan?.recipients ?? []) {
        logDryRun("job alert", c, buildJobAlert(vacancy, alertLanguage(c.language_code), appUrl));
      }
      console.log("[job-alerts dry-run] summary:", JSON.stringify(summary));
      return NextResponse.json({
        ...summary,
        would_notify: notices.map((n) => ({ candidate_id: n.candidate.id, language: alertLanguage(n.candidate.language_code) })),
        would_alert: (plan?.recipients ?? []).map((c) => ({ candidate_id: c.id, language: alertLanguage(c.language_code) })),
      });
    }

    // Claim job-alert rows first: the primary key makes a concurrent/retried call skip the same people
    const alerts: Outgoing[] = [];
    if (plan?.recipients.length) {
      const claimed = await claimAlerts(db, vacancy.id, plan.recipients.map((c) => c.id));
      for (const c of plan.recipients) {
        if (!claimed.has(c.id)) continue;
        alerts.push({
          candidate: c,
          payload: buildJobAlert(vacancy, alertLanguage(c.language_code), appUrl),
          // Release the claim so a later run can retry; it was never delivered
          onFailed: async () => {
            const { error } = await db
              .from("vacancy_alerts")
              .delete()
              .eq("vacancy_id", vacancy.id)
              .eq("candidate_id", c.id);
            if (error) console.error("alerts: release claim failed:", error.message);
          },
        });
      }
    }

    // Send after responding, so the DB webhook (short timeout) isn't kept waiting
    after(() => sendAll(db, vacancy.id, [...notices, ...alerts]));

    return NextResponse.json({ ...summary, queued: notices.length + alerts.length }, { status: 202 });
  } catch (e) {
    if (!(e instanceof DbError)) throw e;
    console.error("alerts: database error:", e.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

function logDryRun(kind: string, c: Candidate, payload: { text: string }) {
  console.log(
    `[job-alerts dry-run] ${kind} -> candidate ${c.id} (tg ${c.telegram_id}, ${alertLanguage(c.language_code)}):\n${payload.text}`,
  );
}

type ApplicationWithCandidate = {
  open: boolean;
  candidate: Candidate & { notify_status: boolean };
};

/** Every application for the vacancy, with its candidate. `open` = still in progress and not withdrawn. */
async function loadApplications(db: Db, vacancyId: string): Promise<ApplicationWithCandidate[]> {
  type Row = {
    status: string;
    cancelled_by: string | null;
    candidates: (Candidate & { notify_status: boolean }) | null;
  };
  const out: ApplicationWithCandidate[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("applications")
      .select("status, cancelled_by, candidates(id, telegram_id, language_code, notify_status)")
      .eq("vacancy_id", vacancyId)
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
      .returns<Row[]>();
    if (error) throw new DbError(`applications lookup: ${error.message}`);
    for (const row of data ?? []) {
      if (!row.candidates) continue;
      const open = !row.cancelled_by && OPEN_STATUSES.includes(normalizeStatus(row.status));
      out.push({ open, candidate: row.candidates });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

/** Matching candidates who want alerts, minus applicants, already-alerted and over-the-cap ones. */
async function planJobAlerts(db: Db, vacancy: Vacancy, applicantIds: Set<string>) {
  const candidates: AlertCandidate[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("candidates")
      .select("id, telegram_id, language_code, major, desired_salary, work_type")
      .eq("major", vacancy.major)
      .eq("job_alerts", true)
      .gt("telegram_id", 0) // telegram_id < 0 = deleted, anonymised profile
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new DbError(`candidates lookup: ${error.message}`);
    candidates.push(...((data ?? []) as AlertCandidate[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  const matched = candidates.filter((c) => matches(c, vacancy));
  const notApplied = matched.filter((c) => !applicantIds.has(c.id));

  const alreadyAlerted = new Set<string>();
  const recentCount = new Map<string, number>();
  const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
  const since = new Date(sinceMs).toISOString();
  for (const ids of chunks(notApplied.map((c) => c.id), ID_CHUNK)) {
    const { data, error } = await db
      .from("vacancy_alerts")
      .select("vacancy_id, candidate_id, sent_at")
      .in("candidate_id", ids)
      .or(`vacancy_id.eq.${vacancy.id},sent_at.gte.${since}`);
    if (error) throw new DbError(`history lookup: ${error.message}`);
    for (const row of data ?? []) {
      if (row.vacancy_id === vacancy.id) alreadyAlerted.add(row.candidate_id);
      if (new Date(row.sent_at).getTime() >= sinceMs) {
        recentCount.set(row.candidate_id, (recentCount.get(row.candidate_id) ?? 0) + 1);
      }
    }
  }
  const notYet = notApplied.filter((c) => !alreadyAlerted.has(c.id));
  const recipients = notYet.filter((c) => (recentCount.get(c.id) ?? 0) < DAILY_CAP);

  return {
    recipients,
    summary: {
      same_major: candidates.length,
      matched: matched.length,
      already_applied: matched.length - notApplied.length,
      already_alerted: notApplied.length - notYet.length,
      over_daily_cap: notYet.length - recipients.length,
      to_send: recipients.length,
    },
  };
}

async function claimAlerts(db: Db, vacancyId: string, candidateIds: string[]) {
  const claimed = new Set<string>();
  for (const ids of chunks(candidateIds, 500)) {
    const { data, error } = await db
      .from("vacancy_alerts")
      .upsert(
        ids.map((candidate_id) => ({ vacancy_id: vacancyId, candidate_id })),
        { onConflict: "vacancy_id,candidate_id", ignoreDuplicates: true },
      )
      .select("candidate_id");
    if (error) throw new DbError(`claim: ${error.message}`);
    for (const row of data ?? []) claimed.add(row.candidate_id);
  }
  return claimed;
}

async function sendAll(db: Db, vacancyId: string, messages: Outgoing[]) {
  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const m of messages) {
    const body = { chat_id: m.candidate.telegram_id, ...m.payload };
    let res = await callBotApi("sendMessage", body);
    if (res.status === 429) {
      await sleep((res.retryAfter ?? 1) * 1000);
      res = await callBotApi("sendMessage", body);
    }

    if (res.ok) {
      sent += 1;
    } else {
      await m.onFailed?.();
      if (res.status === 403) {
        // User blocked the bot: stop job alerts until they turn them back on in Settings
        blocked += 1;
        const { error } = await db.from("candidates").update({ job_alerts: false }).eq("id", m.candidate.id);
        if (error) console.error("alerts: disabling job_alerts failed:", error.message);
      } else {
        failed += 1;
        console.error(`alerts: sendMessage to candidate ${m.candidate.id} failed:`, res.status, res.description);
      }
    }

    await sleep(SEND_INTERVAL_MS);
  }

  console.log(`[job-alerts] vacancy ${vacancyId}: sent ${sent}, blocked ${blocked}, failed ${failed}`);
}
