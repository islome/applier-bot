"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EditProfileScreen } from "@/components/edit-profile-screen";
import { Spinner, TelegramGate } from "@/components/telegram-gate";

function EditRoute() {
  // /profile/edit?welcome=1 is the first-time onboarding screen
  const welcome = useSearchParams().get("welcome") === "1";

  return (
    <TelegramGate>
      {({ user, initData }) => (
        <EditProfileScreen user={user} initData={initData} welcome={welcome} />
      )}
    </TelegramGate>
  );
}

export default function EditProfilePage() {
  // useSearchParams() needs a Suspense boundary
  return (
    <Suspense fallback={<Spinner />}>
      <EditRoute />
    </Suspense>
  );
}
