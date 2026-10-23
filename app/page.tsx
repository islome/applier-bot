"use client";

import { useTelegram } from "@/lib/use-telegram";
import { CandidateForm } from "@/components/candidate-form";

export default function Home() {
  const { ready, isTelegram, user, initData } = useTelegram();

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </main>
    );
  }

  if (!isTelegram || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold tracking-tight">
            Open inside Telegram
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Open the bot and tap the menu button to continue.
          </p>
        </div>
      </main>
    );
  }

  const defaultName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-5 pb-10">
      <header className="mb-6 flex items-center gap-3">
        {user.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photo_url}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            {user.first_name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Hi, {user.first_name} 👋
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Fill in your profile and get matched with vacancies.
          </p>
        </div>
      </header>

      <CandidateForm initData={initData} defaultName={defaultName} />
    </main>
  );
}
