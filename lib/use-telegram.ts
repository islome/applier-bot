"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { TelegramUser } from "@/types/telegram";

export type TelegramState = {
  ready: boolean;
  isTelegram: boolean;
  user: TelegramUser | null;
  platform: string | null;
  colorScheme: "light" | "dark" | null;
  initData: string; // goes to the server for HMAC check in step 2
};

const serverSnapshot: TelegramState = {
  ready: false,
  isTelegram: false,
  user: null,
  platform: null,
  colorScheme: null,
  initData: "",
};

let clientSnapshot: TelegramState | null = null;

function getClientSnapshot(): TelegramState {
  if (clientSnapshot) return clientSnapshot;
  const tg = window.Telegram?.WebApp;

  clientSnapshot = tg
    ? {
        ready: true,
        isTelegram: tg.initData.length > 0,
        user: tg.initDataUnsafe.user ?? null,
        platform: tg.platform,
        colorScheme: tg.colorScheme,
        initData: tg.initData,
      }
    : { ...serverSnapshot, ready: true };

  return clientSnapshot;
}

const subscribe = () => () => {};

export function useTelegram(): TelegramState {
  const state = useSyncExternalStore(subscribe, getClientSnapshot, () => serverSnapshot);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []);

  return state;
}