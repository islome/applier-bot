"use client";

import Link from "next/link";
import { TabScreen } from "@/components/app-shell";
import { IconFile } from "@/components/icons";
import { TelegramGate } from "@/components/telegram-gate";

// Placeholder so the tab bar has no dead link. The real list comes with the "Apply" step.
export default function ApplicationsPage() {
  return (
    <TelegramGate>
      {() => (
        <TabScreen title="Applications" subtitle="Nothing sent yet">
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-chip text-muted">
              <IconFile className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold">No applications yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted">
              When you apply to a vacancy, it shows up here with its status.
            </p>
            <Link
              href="/vacancies"
              className="mt-6 flex h-12 items-center rounded-[14px] bg-accent px-6 text-[15px] font-bold text-white"
            >
              Browse vacancies
            </Link>
          </div>
        </TabScreen>
      )}
    </TelegramGate>
  );
}
