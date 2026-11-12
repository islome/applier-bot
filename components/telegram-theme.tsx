"use client";

import { useEffect } from "react";

/**
 * Makes the app follow Telegram's light/dark scheme (not the phone's) and paints
 * Telegram's own header and background to match the app background, so the
 * Mini App reads as one surface. Re-applies when the user switches Telegram theme.
 */
export function TelegramTheme() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) return; // outside Telegram: keep the system scheme

    const apply = () => {
      document.documentElement.dataset.theme = tg.colorScheme;
      if (!tg.isVersionAtLeast?.("6.1")) return;
      tg.setHeaderColor?.("secondary_bg_color");
      const bg = tg.themeParams.secondary_bg_color;
      if (bg) tg.setBackgroundColor?.(bg);
    };

    apply();
    tg.onEvent?.("themeChanged", apply);
    return () => tg.offEvent?.("themeChanged", apply);
  }, []);

  return null;
}
