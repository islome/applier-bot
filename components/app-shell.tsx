"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { useTelegramBackButton } from "@/lib/use-telegram-back-button";
import { IconBriefcase, IconFile, IconUser } from "@/components/icons";

/* ------------------------------------------------------------------ */
/* Tab bar                                                             */
/* ------------------------------------------------------------------ */

const TABS = [
  { href: "/vacancies", label: "Vacancies", Icon: IconBriefcase },
  { href: "/applications", label: "Applications", Icon: IconFile },
  { href: "/profile", label: "Profile", Icon: IconUser },
] as const;

function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="flex flex-none border-t border-line bg-surface px-3 pt-2 pb-[max(env(safe-area-inset-bottom),16px)]"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => haptic.select()}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-xs leading-4 ${
              active ? "font-bold text-accent-text" : "font-semibold text-muted"
            }`}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Tab screen: large title, no back button, tab bar at the bottom      */
/* ------------------------------------------------------------------ */

export function TabScreen({
  title,
  subtitle,
  action,
  toolbar,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Right side of the header (e.g. avatar) */
  action?: React.ReactNode;
  /** Sticks under the header while the list scrolls beneath it (search + filter) */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-app text-ink">
      <header className="flex flex-none items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-[34px] font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm leading-5 text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain pb-4">
        {toolbar ? (
          // Transparent on purpose: the glass controls blur the cards passing underneath
          <div className="sticky top-0 z-10 px-5 pt-1 pb-3">{toolbar}</div>
        ) : null}
        <div className="px-5">{children}</div>
      </main>

      <TabBar />
    </div>
  );
}


export function PushScreen({
  title,
  fallbackHref = "/vacancies",
  action,
  footer,
  children,
}: {
  title: string;
  /** Where "back" goes if there is no history (screen opened directly) */
  fallbackHref?: string;
  /** Optional single action on the right of the header */
  action?: React.ReactNode;
  /** Pinned primary action (Apply, Save) */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const goBack = useCallback(() => {
    haptic.light();
    if (window.history.length > 1) router.back();
    else router.replace(fallbackHref);
  }, [router, fallbackHref]);

  useTelegramBackButton(goBack);

  return (
    <div className="flex h-dvh flex-col bg-app text-ink">
      <header className="relative flex h-14 flex-none items-center justify-center px-14">
        <h1 className="min-w-0 truncate text-[17px] leading-6 font-bold">{title}</h1>
        {action ? (
          <div className="absolute right-3 flex h-11 w-11 items-center justify-center">{action}</div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6">{children}</main>

      {footer ? (
        <div className="flex-none border-t border-line bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
