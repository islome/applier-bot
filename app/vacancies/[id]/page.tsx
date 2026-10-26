"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Spinner, TelegramGate } from "@/components/telegram-gate";
import { VacancyDetail } from "@/components/vacancy-detail";

function VacancyRoute() {
  const { id } = useParams<{ id: string }>();

  return (
    <TelegramGate>{({ initData }) => <VacancyDetail id={id} initData={initData} />}</TelegramGate>
  );
}

export default function VacancyPage() {
  // useParams() on a dynamic route needs a Suspense boundary
  return (
    <Suspense fallback={<Spinner />}>
      <VacancyRoute />
    </Suspense>
  );
}
