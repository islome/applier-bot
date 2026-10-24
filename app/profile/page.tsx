"use client";

import { useRouter } from "next/navigation";
import { TelegramGate } from "@/components/telegram-gate";
import { CandidateForm } from "@/components/candidate-form";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <TelegramGate>
      {({ user, initData }) => {
        const defaultName = [user.first_name, user.last_name].filter(Boolean).join(" ");

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
                  Fill in your profile to see vacancies.
                </p>
              </div>
            </header>

            <CandidateForm
              initData={initData}
              defaultName={defaultName}
              onSaved={() => router.push("/vacancies")}
            />
          </main>
        );
      }}
    </TelegramGate>
  );
}
