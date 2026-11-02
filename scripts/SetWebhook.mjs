// Ishlatish: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET va MINI_APP_URL ni .env.local ga qo'yib:
//   node --env-file=.env.local scripts/SetWebhook.mjs
// Diqqat: bu botning oldingi webhook'ini almashtiradi.
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.env.MINI_APP_URL;

if (!token || !secret || !base) {
  console.error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and MINI_APP_URL in .env.local");
  process.exit(1);
}
if (!base.startsWith("https://")) {
  console.error("MINI_APP_URL must start with https://");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: new URL("/api/telegram/webhook", base).toString(),
    secret_token: secret,
    allowed_updates: ["message"],
  }),
});

const data = await res.json();
console.log(data);
if (!data.ok) process.exit(1);

// Buyruqlar menyusi (chatdagi "/" ro'yxati). /start va /vacancies webhook'da ishlanadi, bu faqat menyuda ko'rsatadi.
const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    commands: [
      { command: "start", description: "Boshlash" },
      { command: "vacancies", description: "Yo'nalishim bo'yicha vakansiyalar" },
    ],
  }),
});
const cmdData = await cmdRes.json();
console.log(cmdData);
if (!cmdData.ok) process.exit(1);
