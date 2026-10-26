"use client";

import { ApplicationsScreen } from "@/components/applications-screen";
import { TelegramGate } from "@/components/telegram-gate";

export default function ApplicationsPage() {
  return (
    <TelegramGate>{({ initData }) => <ApplicationsScreen initData={initData} />}</TelegramGate>
  );
}
