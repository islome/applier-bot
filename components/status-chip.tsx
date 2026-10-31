import { normalizeStatus, type ApplicationStatus } from "@/lib/application-types";
import { useLanguage } from "@/components/language-provider";

const STYLES: Record<ApplicationStatus, string> = {
  new: "bg-chip text-chip-ink",
  confirmed: "bg-accent/10 text-accent",
  interview: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  hired: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  cancel: "bg-red-500/15 text-red-800 dark:text-red-300",
};

const KEYS = {
  new: "status.new",
  confirmed: "status.confirmed",
  interview: "status.interview",
  hired: "status.hired",
  cancel: "status.cancel",
} as const;

export function StatusChip({ status }: { status: string }) {
  const { t } = useLanguage();
  const s = normalizeStatus(status);
  return (
    <span
      className={`inline-block flex-none rounded-full px-2.5 py-1 text-xs leading-4 font-bold ${STYLES[s]}`}
    >
      {t(KEYS[s])}
    </span>
  );
}
