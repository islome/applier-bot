/** "+998901234567" -> "+998 90 123 45 67" (anything else is returned unchanged) */
export function formatPhone(phone: string) {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

export function experienceLabel(years: number) {
  if (years <= 0) return "No experience";
  return years === 1 ? "1 year" : `${years} years`;
}
