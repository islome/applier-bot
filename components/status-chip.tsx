import type { ApplicationStatus } from "@/lib/application-types";
import { useLanguage } from "@/components/language-provider";

const STYLES: Record<ApplicationStatus, string> = {
  new: "bg-chip text-chip-ink",
  reviewed: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  shortlisted: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-800 dark:text-red-300",
};

export function StatusChip({ status }: { status: ApplicationStatus }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs leading-4 font-bold ${STYLES[status]}`}
    >
      {t(`status.${status}` as "status.new" | "status.reviewed" | "status.shortlisted" | "status.rejected")}
    </span>
  );
}
