import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
  const text = msg?.text ?? "";
  if (!chatId || msg?.chat?.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const appUrl = process.env.MINI_APP_URL || DEFAULT_APP_URL;

  if (/^\/start(@\w+)?(\s|$)/.test(text)) {
    await handleStart(chatId, appUrl);
  } else if (/^\/vacancies(@\w+)?(\s|$)/.test(text)) {
    await handleVacancies(chatId, appUrl);
  }

  return NextResponse.json({ ok: true });
}

function openButton(appUrl: string, label = "Ilovani ochish", path = "") {
  return { text: label, web_app: { url: new URL(path, appUrl).toString() } };
}

async function handleStart(chatId: number, appUrl: string) {
  const replyMarkup = { inline_keyboard: [[openButton(appUrl)]] };
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
}

const VACANCY_LIMIT = 8;

/** /vacancies -> nomzodning yo'nalishi (candidates.major) bo'yicha faol vakansiyalar */
async function handleVacancies(chatId: number, appUrl: string) {
  const openOnly = { inline_keyboard: [[openButton(appUrl)]] };

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    await tg("sendMessage", { chat_id: chatId, text: "Hozir vakansiyalarni ko'rsata olmayman. Keyinroq urinib ko'ring." });
    return;
  }

  const { data: candidate, error: cErr } = await db
    .from("candidates")
    .select("major")
    .eq("telegram_id", chatId)
    .maybeSingle();
  if (cErr) {
    console.error("candidate lookup failed:", cErr.message);
    await tg("sendMessage", { chat_id: chatId, text: "Xatolik yuz berdi. Keyinroq urinib ko'ring." });
    return;
  }
  if (!candidate?.major) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Yo'nalishingiz bo'yicha vakansiyalarni ko'rsatish uchun avval ilovada profilingizni to'ldiring.",
      reply_markup: openOnly,
    });
    return;
  }

  const { data: vacancies, error: vErr } = await db
    .from("vacancies")
    .select("id, title, company, city")
    .eq("is_active", true)
    .eq("major", candidate.major)
    .order("created_at", { ascending: false })
    .limit(VACANCY_LIMIT);
  if (vErr) {
    console.error("vacancies lookup failed:", vErr.message);
    await tg("sendMessage", { chat_id: chatId, text: "Xatolik yuz berdi. Keyinroq urinib ko'ring." });
    return;
  }
  if (!vacancies?.length) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: `Hozircha «${candidate.major}» yo'nalishi bo'yicha faol vakansiya yo'q. Yangilari chiqsa ilovada ko'rasiz.`,
      reply_markup: openOnly,
    });
    return;
  }

  const lines = vacancies.map((v) => `• ${v.title} — ${v.company}, ${v.city}`);
  const keyboard = vacancies.map((v) => [
    openButton(appUrl, v.title.slice(0, 40), `vacancies/${v.id}`),
  ]);
  keyboard.push([openButton(appUrl, "Barcha vakansiyalar", "vacancies")]);
  await tg("sendMessage", {
    chat_id: chatId,
    text: `Yo'nalishingiz («${candidate.major}») bo'yicha vakansiyalar:\n\n${lines.join("\n")}`,
    reply_markup: { inline_keyboard: keyboard },
  });
}
