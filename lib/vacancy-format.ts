import type { EmploymentType, VacancyRow } from "@/lib/vacancy-types";
import type { Language } from "@/components/language-provider";

export type Translate = (
  key: "employment.full_time" | "employment.part_time" | "employment.remote" | "employment.internship" |
    "salary.from" | "salary.upTo" | "salary.none" | "salary.million",
  params?: Record<string, string | number>,
) => string;

export function employmentLabel(type: EmploymentType, t: Translate) {
  return t(`employment.${type}`);
}

type Salary = Pick<VacancyRow, "salary_min" | "salary_max" | "salary_currency">;

// Manual formatting (no toLocaleString) so the output is the same on every device
function groupDigits(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** "8 000 000 – 14 000 000 UZS" (list cards) */
export function formatSalary(
  { salary_min: min, salary_max: max, salary_currency: cur }: Salary,
  t: Translate,
) {
  if (min != null && max != null) return `${groupDigits(min)} – ${groupDigits(max)} ${cur}`;
  if (min != null) return t("salary.from", { amount: `${groupDigits(min)} ${cur}` });
  if (max != null) return t("salary.upTo", { amount: `${groupDigits(max)} ${cur}` });
  return t("salary.none");
}

/** "8 – 14 mln UZS" (small tiles). Falls back to the full format when it doesn't fit. */
export function formatSalaryShort(s: Salary, t: Translate) {
  const { salary_min: min, salary_max: max, salary_currency: cur } = s;
  const mln = (n: number) => String(Math.round((n / 1_000_000) * 10) / 10);
  const bigEnough = (n: number | null) => n == null || n >= 1_000_000;

  if (cur === "UZS" && bigEnough(min) && bigEnough(max)) {
    if (min != null && max != null) return `${mln(min)} – ${mln(max)} ${t("salary.million")} UZS`;
    if (min != null) return t("salary.from", { amount: `${mln(min)} ${t("salary.million")} UZS` });
    if (max != null) return t("salary.upTo", { amount: `${mln(max)} ${t("salary.million")} UZS` });
  }
  return formatSalary(s, t);
}

const MONTHS: Record<Language, string[]> = {
  uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
};

/** "Just now", "5m ago", "2h ago", "Yesterday", "3d ago", "12 Oct" */
export function timeAgo(
  iso: string,
  now: number,
  language: Language = "uz",
  t?: (key: "time.justNow" | "time.minutes" | "time.hours" | "time.yesterday" | "time.days", params?: Record<string, string | number>) => string,
) {
  const then = new Date(iso);
  const diff = Math.max(0, now - then.getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t?.("time.justNow") ?? "Just now";
  if (min < 60) return t?.("time.minutes", { count: min }) ?? `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return t?.("time.hours", { count: hours }) ?? `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return t?.("time.yesterday") ?? "Yesterday";
  if (days < 7) return t?.("time.days", { count: days }) ?? `${days}d ago`;
  return `${then.getDate()} ${MONTHS[language][then.getMonth()]}`;
}
