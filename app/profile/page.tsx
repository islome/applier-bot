"use client";

import { ProfileScreen } from "@/components/profile-screen";
import { TelegramGate } from "@/components/telegram-gate";

export default function ProfilePage() {
  return (
    <TelegramGate>
      {({ user, initData }) => <ProfileScreen user={user} initData={initData} />}
    </TelegramGate>
  );
}
