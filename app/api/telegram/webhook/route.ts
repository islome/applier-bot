import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const DEFAULT_APP_URL = "https://applier-bot.vercel.app/";
// Rasm public/start.jpg ga qo'yiladi. Topilmasa — oddiy matn yuboriladi.
const START_IMAGE_PATH = "start.jpg";

const WELCOME_TEXT = [
  "Job Applier ga xush kelibsiz!",
  "Bu yerda vakansiyalarni ko'rib, bir necha bosishda ariza topshirasiz.",
  "Ariza holati o'zgarsa, shu chatda xabar olasiz.",
].join("\n");

type Update = {
  message?: { chat?: { id: number; type?: string }; text?: string };
};

function secretOk(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function tg(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`telegram ${method} failed:`, res.status);
    return res.ok;
  } catch (e) {
    console.error(`telegram ${method} error:`, e instanceof Error ? e.message : e);
    return false;
  }
}

/** POST /api/telegram/webhook -> Telegram updates (/start) */
export async function POST(req: Request) {
  if (!secretOk(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  const isStart = /^\/start(@\w+)?(\s|$)/.test(msg?.text ?? "");
  if (!chatId || msg?.chat?.type !== "private" || !isStart) {
    return NextResponse.json({ ok: true });
  }

  const appUrl = process.env.MINI_APP_URL || DEFAULT_APP_URL;
  const replyMarkup = {
    inline_keyboard: [[{ text: "Ilovani ochish", web_app: { url: appUrl } }]],
  };

  const photoUrl = new URL(START_IMAGE_PATH, appUrl).toString();
  const sent = await tg("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption: WELCOME_TEXT,
    reply_markup: replyMarkup,
  });
  if (!sent) {
    await tg("sendMessage", { chat_id: chatId, text: WELCOME_TEXT, reply_markup: replyMarkup });
  }

  return NextResponse.json({ ok: true });
}
