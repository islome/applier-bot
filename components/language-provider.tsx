"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Language = "uz" | "ru";

const messages = {
  uz: {
    "tab.vacancies": "Vakansiyalar",
    "tab.applications": "Arizalar",
    "tab.profile": "Profil",
    "tab.main": "Asosiy menyu",
    "language.label": "Til",
    "language.uz": "O‘zbekcha",
    "language.ru": "Русский",
    "common.tryAgain": "Qayta urinish",
    "common.loading": "Yuklanmoqda...",
    "common.somethingWrong": "Nimadir xato ketdi",
    "common.close": "Yopish",
    "common.profileLoadError": "Profilni yuklab bo‘lmadi. Internet aloqasini tekshiring.",
    "common.vacanciesLoadError": "Vakansiyalarni yuklab bo‘lmadi. Internet aloqasini tekshiring.",
    "common.applicationsLoadError": "Arizalarni yuklab bo‘lmadi. Internet aloqasini tekshiring.",
    "common.profileSaveError": "Profilni saqlab bo‘lmadi.",
    "home.loadError": "Ma’lumotni yuklab bo‘lmadi. Internet aloqasini tekshiring.",
    "notFound.title": "Sahifa topilmadi",
    "notFound.description": "Bu sahifa mavjud emas yoki o‘chirilgan.",
    "notFound.home": "Vakansiyalarga qaytish",
    "vacancies.title": "Vakansiyalar",
    "vacancies.loading": "Vakansiyalar yuklanmoqda...",
    "vacancies.count": "{count} ta ochiq vakansiya",
    "vacancies.filteredCount": "{total} tadan {shown} tasi",
    "vacancies.search": "Vakansiyalarni qidirish",
    "vacancies.finishSearch": "Qidiruvni yakunlash",
    "vacancies.openProfile": "Profilni ochish",
    "vacancies.field": "Yo‘nalish",
    "vacancies.changeField": "Yo‘nalishni o‘zgartirish",
    "vacancies.allFields": "Barcha yo‘nalishlar",
    "vacancies.noVacancies": "Hozircha vakansiyalar yo‘q",
    "vacancies.checkBack": "Yangi ish o‘rinlari keyinroq paydo bo‘ladi. Yana tekshirib ko‘ring.",
    "vacancies.nothingFound": "Hech narsa topilmadi",
    "vacancies.changeSearch": "Boshqa so‘zni kiriting yoki filtrni olib tashlang.",
    "vacancies.clearFilters": "Filtrlarni tozalash",
    "vacancies.retry": "Qayta urinish",
    "vacancy.title": "Vakansiya",
    "vacancy.notFound": "Vakansiya topilmadi",
    "vacancy.unavailable": "Vakansiya yopilgan yoki o‘chirilgan bo‘lishi mumkin.",
    "vacancy.loadError": "Vakansiyani yuklab bo‘lmadi",
    "vacancy.salary": "Maosh",
    "vacancy.type": "Ish turi",
    "vacancy.city": "Shahar",
    "vacancy.field": "Yo‘nalish",
    "vacancy.about": "Ish haqida",
    "vacancy.requirements": "Talablar",
    "vacancy.posted": "E’lon qilingan",
    "vacancy.applied": "Ariza yuborilgan",
    "vacancy.apply": "Ariza yuborish",
    "vacancy.sending": "Yuborilmoqda...",
    "vacancy.completeProfile": "Ariza yuborish uchun profilingizni to‘ldiring",
    "vacancy.completeProfileError": "Avval profilingizni to‘ldiring",
    "vacancy.cancel": "Bekor qilish",
    "vacancy.cancelConfirm": "Arizani butunlay bekor qilmoqchimisiz?",
    "vacancy.keepApplication": "Arizani qoldirish",
    "vacancy.confirmCancel": "Bekor qilishni tasdiqlash",
    "vacancy.cancelling": "Bekor qilinmoqda...",
    "vacancy.cancelError": "Arizani bekor qilib bo‘lmadi",
    "vacancy.applyError": "Arizani yuborib bo‘lmadi",
    "applications.title": "Arizalar",
    "applications.loading": "Arizalar yuklanmoqda...",
    "applications.noneSent": "Hozircha ariza yuborilmagan",
    "applications.count": "{count} ta yuborilgan",
    "applications.emptyTitle": "Hozircha arizalar yo‘q",
    "applications.emptyText": "Vakansiyaga ariza yuborganingizda, u bu yerda holati bilan ko‘rinadi.",
    "applications.browse": "Vakansiyalarni ko‘rish",
    "applications.cancel": "Arizani bekor qilish",
    "applications.removeConfirm": "Bu arizani butunlay o‘chirmoqchimisiz?",
    "applications.keep": "Qoldirish",
    "applications.remove": "O‘chirish",
    "applications.removing": "O‘chirilmoqda...",
    "applications.cancelError": "Arizani bekor qilib bo‘lmadi",
    "status.new": "Yuborildi",
    "status.reviewed": "Ko‘rib chiqilmoqda",
    "status.shortlisted": "Saralab olindi",
    "status.rejected": "Tanlanmadi",
    "status.confirmed": "Tasdiqlandi",
    "status.interview": "Suhbatga taklif",
    "status.hired": "Qabul qilindi",
    "status.cancel": "Tanlanmadi",
    "profile.title": "Profil",
    "profile.fromTelegram": "Telegram orqali",
    "profile.phone": "Telefon",
    "profile.age": "Yosh",
    "profile.field": "Yo‘nalish",
    "profile.experience": "Tajriba",
    "profile.resume": "Rezyume",
    "profile.noResume": "Yuklanmagan",
    "profile.uploaded": "Yuklangan",
    "profile.experienceAbout": "Tajribangiz haqida",
    "profile.edit": "Profilni tahrirlash",
    "profile.editTitle": "Profilni tahrirlash",
    "profile.yourProfile": "Profilingiz",
    "profile.welcome": "Salom, {name}. Sizga mos vakansiyalarni topishimiz uchun o‘zingiz haqingizda qisqacha yozing.",
    "profile.fullName": "Ism-familiya",
    "profile.phoneField": "Telefon raqami",
    "profile.ageField": "Yosh",
    "profile.experienceYears": "Tajriba (yil)",
    "profile.chooseField": "Tanlang...",
    "profile.aboutExperience": "Tajribangiz haqida",
    "profile.optional": "ixtiyoriy",
    "profile.experiencePlaceholder": "Qayerda ishlagansiz, nimalar qilgansiz, asosiy ko‘nikmalar...",
    "profile.resumeOptional": "Rezyume (ixtiyoriy)",
    "profile.resumeSaved": "Rezyume saqlandi",
    "profile.uploadResume": "Rezyume yuklash",
    "profile.tapToChange": "O‘zgartirish uchun bosing",
    "profile.tapToReplace": "Almashtirish uchun bosing",
    "profile.removeFile": "Tanlangan faylni olib tashlash",
    "profile.save": "Profilni saqlash",
    "profile.saving": "Saqlanmoqda...",
    "profile.continue": "Davom etish",
    "profile.resumeHint": "PDF, DOC, DOCX, ZIP, RTF, TXT yoki ODT · 2 MB gacha",
    "profile.resumeTooLarge": "Rezyume hajmi 2 MB yoki undan kichik bo‘lishi kerak",
    "profile.resumeEmpty": "Rezyume fayli bo‘sh bo‘lmasligi kerak",
    "profile.resumeFormat": "PDF, DOC, DOCX, ZIP, RTF, TXT yoki ODT formatidagi faylni tanlang",
    "profile.fullNameError": "Ism-familiyangizni kiriting",
    "profile.phoneError": "Format: +998901234567",
    "profile.ageMin": "Eng kichik yosh 16",
    "profile.ageMax": "Eng katta yosh 70",
    "profile.majorError": "Yo‘nalishni tanlang",
    "profile.experienceTooLong": "Tajriba tavsifi 1000 belgidan oshmasligi kerak",
    "profile.telegramOnly": "Telegram orqali oching",
    "profile.telegramHint": "Botni oching va davom etish uchun App tugmasini bosing.",
    "employment.full_time": "To‘liq stavka",
    "employment.part_time": "Yarim stavka",
    "employment.remote": "Masofaviy",
    "employment.internship": "Amaliyot",
    "salary.from": "{amount} dan",
    "salary.upTo": "{amount} gacha",
    "salary.none": "Maosh ko‘rsatilmagan",
    "salary.million": "mln",
    "time.justNow": "Hozirgina",
    "time.minutes": "{count} daqiqa oldin",
    "time.hours": "{count} soat oldin",
    "time.yesterday": "Kecha",
    "time.days": "{count} kun oldin",
    "experience.none": "Tajriba yo‘q",
    "experience.one": "1 yil",
    "experience.many": "{count} yil",
    "major.it": "IT / Dasturlash",
    "major.design": "Dizayn",
    "major.marketing": "Marketing / SMM",
    "major.sales": "Savdo",
    "major.finance": "Moliya / Buxgalteriya",
    "major.management": "Iqtisod / Boshqaruv",
    "major.education": "Ta’lim / O‘qituvchilik",
    "major.engineering": "Muhandislik",
    "major.medicine": "Tibbiyot / Farmatsiya",
    "major.logistics": "Logistika / Transport",
    "major.law": "Huquq",
    "major.support": "Mijozlarni qo‘llab-quvvatlash",
    "major.other": "Boshqa",
  },
  ru: {
    "tab.vacancies": "Вакансии",
    "tab.applications": "Заявки",
    "tab.profile": "Профиль",
    "tab.main": "Главное меню",
    "language.label": "Язык",
    "language.uz": "O‘zbekcha",
    "language.ru": "Русский",
    "common.tryAgain": "Попробовать снова",
    "common.loading": "Загрузка...",
    "common.somethingWrong": "Что-то пошло не так",
    "common.close": "Закрыть",
    "common.profileLoadError": "Не удалось загрузить профиль. Проверьте подключение.",
    "common.vacanciesLoadError": "Не удалось загрузить вакансии. Проверьте подключение.",
    "common.applicationsLoadError": "Не удалось загрузить заявки. Проверьте подключение.",
    "common.profileSaveError": "Не удалось сохранить профиль.",
    "home.loadError": "Не удалось загрузить данные. Проверьте подключение.",
    "notFound.title": "Страница не найдена",
    "notFound.description": "Такой страницы не существует или она была удалена.",
    "notFound.home": "Вернуться к вакансиям",
    "vacancies.title": "Вакансии",
    "vacancies.loading": "Загрузка вакансий...",
    "vacancies.count": "Открытых вакансий: {count}",
    "vacancies.filteredCount": "{shown} из {total}",
    "vacancies.search": "Поиск вакансий",
    "vacancies.finishSearch": "Завершить поиск",
    "vacancies.openProfile": "Открыть профиль",
    "vacancies.field": "Направление",
    "vacancies.changeField": "Изменить направление",
    "vacancies.allFields": "Все направления",
    "vacancies.noVacancies": "Пока нет вакансий",
    "vacancies.checkBack": "Новые вакансии появятся позже. Загляните сюда ещё раз.",
    "vacancies.nothingFound": "Ничего не найдено",
    "vacancies.changeSearch": "Попробуйте другое слово или снимите фильтр.",
    "vacancies.clearFilters": "Сбросить фильтры",
    "vacancies.retry": "Попробовать снова",
    "vacancy.title": "Вакансия",
    "vacancy.notFound": "Вакансия не найдена",
    "vacancy.unavailable": "Возможно, вакансия закрыта или удалена.",
    "vacancy.loadError": "Не удалось загрузить вакансию",
    "vacancy.salary": "Зарплата",
    "vacancy.type": "Тип занятости",
    "vacancy.city": "Город",
    "vacancy.field": "Направление",
    "vacancy.about": "О вакансии",
    "vacancy.requirements": "Требования",
    "vacancy.posted": "Опубликовано",
    "vacancy.applied": "Заявка отправлена",
    "vacancy.apply": "Откликнуться",
    "vacancy.sending": "Отправка...",
    "vacancy.completeProfile": "Заполните профиль, чтобы откликнуться",
    "vacancy.completeProfileError": "Сначала заполните профиль",
    "vacancy.cancel": "Отменить",
    "vacancy.cancelConfirm": "Отменить эту заявку без возможности восстановления?",
    "vacancy.keepApplication": "Оставить заявку",
    "vacancy.confirmCancel": "Подтвердить отмену",
    "vacancy.cancelling": "Отмена...",
    "vacancy.cancelError": "Не удалось отменить заявку",
    "vacancy.applyError": "Не удалось отправить заявку",
    "applications.title": "Заявки",
    "applications.loading": "Загрузка заявок...",
    "applications.noneSent": "Пока нет отправленных заявок",
    "applications.count": "Отправлено: {count}",
    "applications.emptyTitle": "Пока нет заявок",
    "applications.emptyText": "Ваши отклики на вакансии и их статусы будут отображаться здесь.",
    "applications.browse": "Смотреть вакансии",
    "applications.cancel": "Отменить заявку",
    "applications.removeConfirm": "Удалить эту заявку без возможности восстановления?",
    "applications.keep": "Оставить",
    "applications.remove": "Удалить",
    "applications.removing": "Удаление...",
    "applications.cancelError": "Не удалось отменить заявку",
    "status.new": "Отправлена",
    "status.reviewed": "На рассмотрении",
    "status.shortlisted": "Отобрана",
    "status.rejected": "Не выбрана",
    "status.confirmed": "Подтверждена",
    "status.interview": "Приглашение на собеседование",
    "status.hired": "Принят",
    "status.cancel": "Не выбрана",
    "profile.title": "Профиль",
    "profile.fromTelegram": "из Telegram",
    "profile.phone": "Телефон",
    "profile.age": "Возраст",
    "profile.field": "Направление",
    "profile.experience": "Опыт",
    "profile.resume": "Резюме",
    "profile.noResume": "Не загружено",
    "profile.uploaded": "Загружено",
    "profile.experienceAbout": "О вашем опыте",
    "profile.edit": "Редактировать профиль",
    "profile.editTitle": "Редактирование профиля",
    "profile.yourProfile": "Ваш профиль",
    "profile.welcome": "Здравствуйте, {name}. Расскажите немного о себе, чтобы HR мог подобрать подходящие вакансии.",
    "profile.fullName": "Имя и фамилия",
    "profile.phoneField": "Номер телефона",
    "profile.ageField": "Возраст",
    "profile.experienceYears": "Опыт (лет)",
    "profile.chooseField": "Выберите...",
    "profile.aboutExperience": "О вашем опыте",
    "profile.optional": "необязательно",
    "profile.experiencePlaceholder": "Где работали, чем занимались, основные навыки...",
    "profile.resumeOptional": "Резюме (необязательно)",
    "profile.resumeSaved": "Резюме сохранено",
    "profile.uploadResume": "Загрузить резюме",
    "profile.tapToChange": "Нажмите, чтобы заменить",
    "profile.tapToReplace": "Нажмите, чтобы заменить",
    "profile.removeFile": "Убрать выбранный файл",
    "profile.save": "Сохранить профиль",
    "profile.saving": "Сохранение...",
    "profile.continue": "Продолжить",
    "profile.resumeHint": "PDF, DOC, DOCX, ZIP, RTF, TXT или ODT · до 2 МБ",
    "profile.resumeTooLarge": "Размер резюме не должен превышать 2 МБ",
    "profile.resumeEmpty": "Файл резюме пуст",
    "profile.resumeFormat": "Выберите файл в формате PDF, DOC, DOCX, ZIP, RTF, TXT или ODT",
    "profile.fullNameError": "Введите имя и фамилию",
    "profile.phoneError": "Формат: +998901234567",
    "profile.ageMin": "Минимальный возраст — 16 лет",
    "profile.ageMax": "Максимальный возраст — 70 лет",
    "profile.majorError": "Выберите направление",
    "profile.experienceTooLong": "Описание опыта не должно превышать 1000 символов",
    "profile.telegramOnly": "Откройте в Telegram",
    "profile.telegramHint": "Откройте бота и нажмите кнопку App, чтобы продолжить.",
    "employment.full_time": "Полная занятость",
    "employment.part_time": "Частичная занятость",
    "employment.remote": "Удалённо",
    "employment.internship": "Стажировка",
    "salary.from": "от {amount}",
    "salary.upTo": "до {amount}",
    "salary.none": "Зарплата не указана",
    "salary.million": "млн",
    "time.justNow": "Только что",
    "time.minutes": "{count} мин. назад",
    "time.hours": "{count} ч. назад",
    "time.yesterday": "Вчера",
    "time.days": "{count} дн. назад",
    "experience.none": "Без опыта",
    "experience.one": "1 год",
    "experience.many": "{count} лет",
    "major.it": "IT / Разработка",
    "major.design": "Дизайн",
    "major.marketing": "Маркетинг / SMM",
    "major.sales": "Продажи",
    "major.finance": "Финансы / Бухгалтерия",
    "major.management": "Экономика / Менеджмент",
    "major.education": "Образование / Преподавание",
    "major.engineering": "Инженерия",
    "major.medicine": "Медицина / Фармацевтика",
    "major.logistics": "Логистика / Транспорт",
    "major.law": "Юриспруденция",
    "major.support": "Поддержка клиентов",
    "major.other": "Другое",
  },
} as const;

type TranslationKey = keyof typeof messages.uz;
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  majorLabel: (major: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "applier-language";

const majorKeys: Record<string, TranslationKey> = {
  "IT / Software": "major.it",
  Design: "major.design",
  "Marketing / SMM": "major.marketing",
  Sales: "major.sales",
  "Finance / Accounting": "major.finance",
  "Economics / Management": "major.management",
  "Education / Teaching": "major.education",
  Engineering: "major.engineering",
  "Medicine / Pharmacy": "major.medicine",
  "Logistics / Transport": "major.logistics",
  Law: "major.law",
  "Customer Support": "major.support",
  Other: "major.other",
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("uz");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const telegramLanguage = window.Telegram?.WebApp?.initDataUnsafe.user?.language_code;
    const initialLanguage: Language =
      saved === "ru" || saved === "uz"
        ? saved
        : telegramLanguage?.toLowerCase().startsWith("ru")
          ? "ru"
          : "uz";
    const timer = window.setTimeout(() => {
      setLanguage(initialLanguage);
      document.documentElement.lang = initialLanguage;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const chooseLanguage = useCallback((next: Language) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLanguage(next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: chooseLanguage,
      t: (key, params) =>
        Object.entries(params ?? {}).reduce(
          (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
          messages[language][key] as string,
        ),
      majorLabel: (major) => {
        const key = majorKeys[major];
        return key ? messages[language][key] : major;
      },
    }),
    [language, chooseLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export function translateFormError(
  message: string | undefined,
  t: LanguageContextValue["t"],
) {
  if (!message) return "";
  if (message === "Enter your full name") return t("profile.fullNameError");
  if (message.startsWith("Format:")) return t("profile.phoneError");
  if (message === "Min age is 16") return t("profile.ageMin");
  if (message === "Max age is 70") return t("profile.ageMax");
  if (message === "Choose a major") return t("profile.majorError");
  if (message.includes("experience_text") || message.includes("1000")) {
    return t("profile.experienceTooLong");
  }
  return message;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="flex rounded-full border border-line bg-surface p-1"
    >
      {(["uz", "ru"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          aria-label={t(option === "uz" ? "language.uz" : "language.ru")}
          onClick={() => setLanguage(option)}
          className={`min-h-9 rounded-full px-2.5 text-xs font-bold transition-colors ${
            language === option ? "bg-accent text-white" : "text-muted"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
