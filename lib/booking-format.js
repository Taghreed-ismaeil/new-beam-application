// Day / month / time labels for table bookings, without relying on Intl
// (not every Android JS engine ships Arabic locale data).

const DAYS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ar: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"],
};

export const dayName = (date, lang) => DAYS[lang === "ar" ? "ar" : "en"][date.getDay()];

export const monthName = (date, lang) => MONTHS[lang === "ar" ? "ar" : "en"][date.getMonth()];

// "19:30" -> "7:30 PM" / "7:30 م"
export function formatTime(hhmm, lang) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = lang === "ar" ? (h < 12 ? "ص" : "م") : h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// local "YYYY-MM-DD" (toISOString would shift the day by the timezone)
export function isoDay(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
