"use client";

import { TelegramGate } from "@/components/telegram-gate";
import { VacanciesScreen } from "@/components/vacancies-screen";

export default function VacanciesPage() {
  return (
    <TelegramGate>
      {({ user, initData }) => <VacanciesScreen user={user} initData={initData} />}
    </TelegramGate>
  );
}
