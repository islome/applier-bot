import "server-only";

export type BotApiResult = {
  ok: boolean;
  /** HTTP status from Telegram, 0 when the request itself failed (network, timeout, no token) */
  status: number;
  /** Seconds to wait, set on 429 Too Many Requests */
  retryAfter?: number;
  description?: string;
};

/** Calls the Telegram Bot API and reports why it failed, so callers can react to 403 / 429. */
export async function callBotApi(method: string, body: Record<string, unknown>): Promise<BotApiResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, status: 0, description: "TELEGRAM_BOT_TOKEN is not set" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const data = (await res.json().catch(() => ({}))) as {
      description?: string;
      parameters?: { retry_after?: number };
    };
    return {
      ok: false,
      status: res.status,
      retryAfter: data.parameters?.retry_after,
      description: data.description,
    };
  } catch (e) {
    return { ok: false, status: 0, description: e instanceof Error ? e.message : String(e) };
  }
}
