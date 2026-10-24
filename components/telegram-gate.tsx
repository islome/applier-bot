"use client";

import { useTelegram } from "@/lib/use-telegram";
import type { TelegramUser } from "@/types/telegram";

export function Spinner() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
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
  const { ready, isTelegram, user, initData } = useTelegram();

  if (!ready) return <Spinner />;

  if (!isTelegram || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold tracking-tight">Open inside Telegram</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Open the bot and tap the menu button to continue.
          </p>
        </div>
      </main>
    );
  }

  return <>{children({ user, initData })}</>;
}
