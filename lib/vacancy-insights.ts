import type { SupabaseClient } from "@supabase/supabase-js";

/** What a candidate may know about a vacancy: only counts and rates, never other people's data. */
export type VacancyInsights = {
  /** everyone who applied and did not withdraw */
  applicants: number;
  hired: number;
  interviewing: number;
  /** share of decided applications (hired / (hired + declined)) in percent, null = not enough data */
  hireRate: { percent: number; basis: "vacancy" | "hr"; sample: number } | null;
  /** median hours until HR first moved an application, null = not enough data */
  responseHours: number | null;
  /** HR was active in the last few minutes (hr_users.last_seen_at); name only when online */
  hr: { online: boolean; name: string | null };
};

type AppRow = {
  status: string;
  cancelled_by?: string | null;
  created_at: string;
  updated_at?: string | null;
};

const ONLINE_WINDOW_MS = 5 * 60_000;
const MIN_SAMPLE = 5; // below this a percentage would be noise

const withdrawn = (a: AppRow) => a.status === "cancel" && a.cancelled_by === "candidate";
const declined = (a: AppRow) => a.status === "cancel" && a.cancelled_by !== "candidate";

function rate(rows: AppRow[]) {
  const hired = rows.filter((a) => a.status === "hired").length;
  const decided = hired + rows.filter(declined).length;
  return decided >= MIN_SAMPLE ? { percent: Math.round((hired / decided) * 100), sample: decided } : null;
}

function medianResponseHours(rows: AppRow[]): number | null {
  const hours = rows
    .filter((a) => a.status !== "new" && !withdrawn(a) && a.updated_at)
    .map((a) => (new Date(a.updated_at as string).getTime() - new Date(a.created_at).getTime()) / 3_600_000)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((x, y) => x - y);
  if (hours.length < 3) return null;
  const mid = Math.floor(hours.length / 2);
  return hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2;
}

/**
 * Builds the insights for one vacancy. Best effort: any failing lookup (missing table/column)
 * just leaves that part empty, so the vacancy page still opens.
 */
export async function loadVacancyInsights(db: SupabaseClient, vacancyId: string): Promise<VacancyInsights | null> {
  try {
    const { data: vac } = await db.from("vacancies").select("hr_user_id").eq("id", vacancyId).maybeSingle();
    const hrId = (vac?.hr_user_id as string | null | undefined) ?? null;

    const { data: own, error: ownError } = await db.from("applications").select("*").eq("vacancy_id", vacancyId);
    if (ownError) {
      console.error("insights: applications failed:", ownError.message);
      return null;
    }
    const rows = ((own ?? []) as AppRow[]).filter((a) => !withdrawn(a));

    // the same HR's other vacancies give a steadier hire rate / response time
    let hrRows: AppRow[] = rows;
    if (hrId) {
      const { data: vacs } = await db.from("vacancies").select("id").eq("hr_user_id", hrId);
      const ids = (vacs ?? []).map((v) => v.id as string);
      if (ids.length > 1) {
        const { data: all } = await db.from("applications").select("*").in("vacancy_id", ids).limit(2000);
        if (all) hrRows = (all as AppRow[]).filter((a) => !withdrawn(a));
      }
    }

    const own5 = rate(rows);
    const hr5 = rate(hrRows);
    const hireRate = own5
      ? { ...own5, basis: "vacancy" as const }
      : hr5
        ? { ...hr5, basis: "hr" as const }
        : null;

    const hr = { online: false, name: null as string | null };
    if (hrId) {
      const { data: u } = await db.from("hr_users").select("*").eq("id", hrId).maybeSingle();
      const seen = u?.last_seen_at ? new Date(u.last_seen_at as string).getTime() : 0;
      if (seen && Date.now() - seen < ONLINE_WINDOW_MS) {
        hr.online = true;
        if (u?.profile_id) {
          const { data: p } = await db.from("hr_profiles").select("hr_name").eq("id", u.profile_id).maybeSingle();
          hr.name = (p?.hr_name as string | null | undefined)?.trim() || null;
        }
      }
    }

    return {
      applicants: rows.length,
      hired: rows.filter((a) => a.status === "hired").length,
      interviewing: rows.filter((a) => a.status === "interview").length,
      hireRate,
      responseHours: medianResponseHours(hrRows),
      hr,
    };
  } catch (e) {
    console.error("insights failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
