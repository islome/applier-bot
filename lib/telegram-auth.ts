import { createHmac, timingSafeEqual } from "node:crypto";
import type { TelegramUser } from "@/types/telegram";

export type VerifiedInitData = {
  user: TelegramUser;
  authDate: number;
};

/**
 * Verifies Telegram Mini App initData on the server.
 * Algorithm (official): https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. Remove `hash`, sort the remaining key=value pairs alphabetically, join with "\n"
 * 2. secret = HMAC_SHA256(key = "WebAppData", data = botToken)
 * 3. expected = HMAC_SHA256(key = secret, data = dataCheckString)
 * 4. compare with `hash` (constant time) and reject stale auth_date
 *
 * Returns null if anything is wrong. Never throws on bad input.
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60 * 24, // 24h
): VerifiedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest();

  let received: Buffer;
  try {
    received = Buffer.from(hash, "hex");
  } catch {
    return null;
  }
  if (received.length !== expected.length) return null;
  if (!timingSafeEqual(received, expected)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return null;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAgeSeconds || age < -60) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as TelegramUser;
    if (typeof user.id !== "number" || typeof user.first_name !== "string") {
      return null;
    }
    return { user, authDate };
  } catch {
    return null;
  }
}

/** Reads `Authorization: tma <initData>` and verifies it. */
export function authFromRequest(req: Request): VerifiedInitData | null {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, ...rest] = header.split(" ");
  if (scheme !== "tma") return null;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return null;
  }
  return verifyInitData(rest.join(" "), botToken);
}
