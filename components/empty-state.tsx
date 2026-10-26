import { useLanguage } from "@/components/language-provider";

export function EmptyState({
  title,
  text,
  icon,
  action,
}: {
  title: string;
  text: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon ? (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-chip text-muted">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-center">
      <p className="text-sm text-red-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white"
      >
        {t("common.tryAgain")}
      </button>
    </div>
  );
}
