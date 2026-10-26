/** "+998901234567" -> "+998 90 123 45 67" (anything else is returned unchanged) */
export function formatPhone(phone: string) {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

export function experienceLabel(
  years: number,
  language: "uz" | "ru" = "uz",
  translate?: (key: "experience.none" | "experience.one" | "experience.many", params?: Record<string, string | number>) => string,
) {
  if (years <= 0) return translate?.("experience.none") ?? "No experience";
  if (years === 1) return translate?.("experience.one") ?? "1 year";
  if (language === "ru") {
    const lastTwo = years % 100;
    const last = years % 10;
    const unit =
      lastTwo >= 11 && lastTwo <= 14
        ? "лет"
        : last === 1
          ? "год"
          : last >= 2 && last <= 4
            ? "года"
            : "лет";
    return `${years} ${unit}`;
  }
  return translate?.("experience.many", { count: years }) ?? `${years} yil`;
}
