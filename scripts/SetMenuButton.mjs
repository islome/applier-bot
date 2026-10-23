const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.MINI_APP_URL;

if (!token || !url) {
  console.error("Set TELEGRAM_BOT_TOKEN and MINI_APP_URL in .env.local");
  process.exit(1);
}
if (!url.startsWith("https://")) {
  console.error("MINI_APP_URL must start with https://");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    menu_button: { type: "web_app", text: "Open", web_app: { url } },
  }),
});

const data = await res.json();
console.log(data);
if (!data.ok) process.exit(1);