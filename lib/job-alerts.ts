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

export type VacancyStatusChange = "activated" | "deactivated";

const STATUS_COPY = {
  uz: {
    deactivated: {
      title: "⏸ Vakansiya vaqtincha to‘xtatildi",
      body: "Siz ariza topshirgan {v} vakansiyasi vaqtincha faol emas.\nArizangiz saqlanib qoladi. Vakansiya qayta ochilsa, shu yerda xabar beramiz.",
    },
    activated: {
      title: "▶️ Vakansiya qayta ochildi",
      body: "Siz ariza topshirgan {v} vakansiyasi yana faol.\nArizangiz ko‘rib chiqilishda davom etadi.",
    },
    button: "Arizalarim",
  },
  ru: {
    deactivated: {
      title: "⏸ Вакансия временно приостановлена",
      body: "Вакансия {v}, на которую вы откликнулись, временно неактивна.\nВаша заявка сохранится. Когда вакансию снова откроют, сообщим здесь.",
    },
    activated: {
      title: "▶️ Вакансия снова открыта",
      body: "Вакансия {v}, на которую вы откликнулись, снова активна.\nВаша заявка продолжает рассматриваться.",
    },
    button: "Мои заявки",
  },
} as const;

/** sendMessage payload for applicants when HR pauses or reopens a vacancy they applied to. */
export function buildVacancyStatusNotice(
  vacancy: Pick<AlertVacancy, "title" | "company">,
  change: VacancyStatusChange,
  language: AlertLanguage,
  appUrl: string,
) {
  const copy = STATUS_COPY[language];
  const v = `«<b>${esc(vacancy.title)}</b>» (${esc(vacancy.company)})`;
  return {
    text: `<b>${copy[change].title}</b>\n\n${copy[change].body.replace("{v}", v)}`,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[{ text: copy.button, web_app: { url: new URL("applications", appUrl).toString() } }]],
    },
  };
}

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
