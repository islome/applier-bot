"use client";

import Link from "next/link";
import { TelegramGate } from "@/components/telegram-gate";
import { VacancyList } from "@/components/vacancy-list";

export default function VacanciesPage() {
  return (
    <TelegramGate>
      {({ user, initData }) => (
        <main className="mx-auto w-full max-w-md flex-1 p-5 pb-10">
          <header className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Vacancies</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Hi, {user.first_name}. Here is what is open right now.
              </p>
            </div>
            <Link
              href="/profile"
              className="shrink-0 rounded-full border border-black/10 px-3.5 py-1.5 text-sm font-medium dark:border-white/10"
            >
              My profile
            </Link>
          </header>

          <VacancyList initData={initData} />
        </main>
      )}
    </TelegramGate>
  );
}
