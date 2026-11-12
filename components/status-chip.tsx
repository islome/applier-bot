import { normalizeStatus, type ApplicationStatus } from "@/lib/application-types";
import { useLanguage } from "@/components/language-provider";

const STYLES: Record<ApplicationStatus, string> = {
  new: "bg-chip text-chip-ink",
  confirmed: "bg-accent/10 text-accent-text",
  interview: "bg-warn/15 text-warn",
  hired: "bg-money/12 text-money",
  cancel: "bg-danger/12 text-danger",
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
      className={`inline-block flex-none rounded-full px-2.5 py-1 text-caption font-semibold ${STYLES[s]}`}
    >
      {t(KEYS[s])}
    </span>
  );
}
