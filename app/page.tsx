"use client";

import { useTelegram } from "@/lib/use-telegram";

export default function Home() {
  const { ready, isTelegram, user, platform, colorScheme } = useTelegram();

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Mini App is running
        </span>

        {isTelegram && user ? (
          <>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              Hello, {user.first_name} 👋
            </h1>
            <dl className="mt-6 divide-y divide-black/5 text-sm dark:divide-white/10">
              <Row label="Telegram ID" value={String(user.id)} />
              <Row
                label="Username"
                value={user.username ? `@${user.username}` : "none"}
              />
              <Row label="Language" value={user.language_code ?? "unknown"} />
              <Row label="Platform" value={platform ?? "unknown"} />
              <Row label="Theme" value={colorScheme ?? "unknown"} />
            </dl>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Open inside Telegram
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              The page works, but there's no Telegram data. Open the bot and tap
              the menu button.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
