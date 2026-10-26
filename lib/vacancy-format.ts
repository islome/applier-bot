import type { EmploymentType, VacancyRow } from "@/lib/vacancy-types";

export const TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  remote: "Remote",
  internship: "Internship",
};

type Salary = Pick<VacancyRow, "salary_min" | "salary_max" | "salary_currency">;

// Manual formatting (no toLocaleString) so the output is the same on every device
function groupDigits(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** "8 000 000 – 14 000 000 UZS" (list cards) */
export function formatSalary({ salary_min: min, salary_max: max, salary_currency: cur }: Salary) {
  if (min != null && max != null) return `${groupDigits(min)} – ${groupDigits(max)} ${cur}`;
  if (min != null) return `from ${groupDigits(min)} ${cur}`;
  if (max != null) return `up to ${groupDigits(max)} ${cur}`;
  return "Salary not specified";
}

/** "8 – 14 mln UZS" (small tiles). Falls back to the full format when it doesn't fit. */
export function formatSalaryShort(s: Salary) {
  const { salary_min: min, salary_max: max, salary_currency: cur } = s;
  const mln = (n: number) => String(Math.round((n / 1_000_000) * 10) / 10);
  const bigEnough = (n: number | null) => n == null || n >= 1_000_000;

  if (cur === "UZS" && bigEnough(min) && bigEnough(max)) {
    if (min != null && max != null) return `${mln(min)} – ${mln(max)} mln UZS`;
    if (min != null) return `from ${mln(min)} mln UZS`;
    if (max != null) return `up to ${mln(max)} mln UZS`;
  }
  return formatSalary(s);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Just now", "5m ago", "2h ago", "Yesterday", "3d ago", "12 Oct" */
export function timeAgo(iso: string, now: number) {
  const then = new Date(iso);
  const diff = Math.max(0, now - then.getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${then.getDate()} ${MONTHS[then.getMonth()]}`;
}
