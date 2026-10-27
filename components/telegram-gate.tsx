"use client";

import { useTelegram } from "@/lib/use-telegram";
import { useLanguage } from "@/components/language-provider";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import type { TelegramUser } from "@/types/telegram";

export function Spinner() {
  const { t } = useLanguage();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoadingAnimation label={t("common.loading")} className="py-0" />
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
        <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold tracking-tight">{t("profile.telegramOnly")}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {t("profile.telegramHint")}
          </p>
        </div>
      </main>
    );
  }

  return <>{children({ user, initData })}</>;
}
