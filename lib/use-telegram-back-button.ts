"use client";

import { useEffect } from "react";

/**
 * Shows Telegram's native BackButton while the component is mounted and wires it
 * to `onBack`. Hides it again on unmount, so tab screens never show it.
 * Pass `enabled = false` for screens that must not have "back" (first-time onboarding).
 */
export function useTelegramBackButton(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const button = window.Telegram?.WebApp?.BackButton;
    if (!button) return;

    button.onClick(onBack);
    button.show();

    return () => {
      button.offClick(onBack);
      button.hide();
    };
  }, [onBack, enabled]);
}
