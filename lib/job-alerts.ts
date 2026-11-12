import "server-only";
import { formatSalary, type Translate } from "@/lib/vacancy-format";
import type { VacancyRow } from "@/lib/vacancy-types";

export type AlertLanguage = "uz" | "ru";

export type AlertVacancy = Pick<
  VacancyRow,
  "id" | "title" | "company" | "city" | "salary_min" | "salary_max" | "salary_currency"
>;

/** candidates.language_code comes from Telegram ("ru", "ru-RU", "uz", "en"...). Default: Uzbek. */
export function alertLanguage(languageCode: string | null | undefined): AlertLanguage {
  return languageCode?.toLowerCase().startsWith("ru") ? "ru" : "uz";
}

const COPY = {
  uz: {
    title: "🔔 Sizga mos yangi vakansiya",
    cta: "Batafsil ko‘ring va bir bosishda ariza topshiring.",
    footer: "Bu xabarlarni Profil → Sozlamalar bo‘limida o‘chirib qo‘yish mumkin.",
    button: "Vakansiyani ochish",
    salary: { from: "{amount} dan", upTo: "{amount} gacha", none: "Maosh ko‘rsatilmagan" },
  },
  ru: {
    title: "🔔 Новая вакансия для вас",
    cta: "Посмотрите детали и откликнитесь в одно касание.",
    footer: "Отключить такие сообщения можно в Профиль → Настройки.",
    button: "Открыть вакансию",
    salary: { from: "от {amount}", upTo: "до {amount}", none: "Зарплата не указана" },
  },
} as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** sendMessage payload (without chat_id): HTML text plus a button that opens the vacancy in the Mini App. */
export function buildJobAlert(vacancy: AlertVacancy, language: AlertLanguage, appUrl: string) {
  const copy = COPY[language];
  const t: Translate = (key, params) => {
    const template =
      key === "salary.from" ? copy.salary.from : key === "salary.upTo" ? copy.salary.upTo : copy.salary.none;
    return template.replace("{amount}", String(params?.amount ?? ""));
  };

  const text = [
    `<b>${copy.title}</b>`,
    "",
    `<b>${esc(vacancy.title)}</b>`,
    `${esc(vacancy.company)} · ${esc(vacancy.city)}`,
    `💰 ${esc(formatSalary(vacancy, t))}`,
    "",
    copy.cta,
    `<i>${copy.footer}</i>`,
  ].join("\n");

  return {
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [
        [{ text: copy.button, web_app: { url: new URL(`vacancies/${vacancy.id}`, appUrl).toString() } }],
      ],
    },
  };
}
