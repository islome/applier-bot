"use client";

import { useTelegram } from "@/lib/use-telegram";
import { useLanguage } from "@/components/language-provider";
import type { TelegramUser } from "@/types/telegram";

export function Spinner() {
  const { t } = useLanguage();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      {/* Small ring that only fades in after 400ms, so quick loads show nothing at all */}
      <span
        role="status"
        aria-label={t("common.loading")}
        className="spinner h-6 w-6 rounded-full border-2 border-line border-t-accent"
      />
    </main>
  );
}

/**
 * Wraps a page: shows a spinner while Telegram loads, a hint when opened outside
 * Telegram, and renders `children` only when we have a real Telegram user.
 */
export function TelegramGate({
  children,
}: {
  children: (tg: { user: TelegramUser; initData: string }) => React.ReactNode;
}) {
  const { t } = useLanguage();
  const { ready, isTelegram, user, initData } = useTelegram();

  if (!ready) return <Spinner />;

  if (!isTelegram || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-card bg-surface p-6 text-center">
          <h1 className="text-title font-semibold">{t("profile.telegramOnly")}</h1>
          <p className="mt-2 text-body text-muted">
            {t("profile.telegramHint")}
          </p>
        </div>
      </main>
    );
  }

  return <>{children({ user, initData })}</>;
}
