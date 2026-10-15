/**
 * Finds the menu category a customer menu page (app/menu-food/*) shows. Pages used to hard-code
 * a category id, and most of them were wrong (five pages all pointed at id 1 = Breakfast), so
 * items added from the admin panel never appeared on their real page. Matching by name keeps
 * working whatever ids the database assigns.
 *
 * English names are tried first: they're the stable ones (the Arabic names are what staff edit,
 * and have been overwritten by mistake before).
 */
export type MenuCategoryKey = "breakfast" | "snaks" | "burger" | "shawerma" | "fattah" | "salad" | "drinks" | "sandwiches" | "extras";

const KEYWORDS: Record<MenuCategoryKey, { en: string[]; ar: string[] }> = {
  breakfast: { en: ["breakfast"], ar: ["فطور", "ترويقة"] },
  snaks: { en: ["snak", "snack"], ar: ["سناك"] },
  burger: { en: ["burger"], ar: ["برغر", "برجر"] },
  shawerma: { en: ["shawerma", "shawarma"], ar: ["شاورما"] },
  fattah: { en: ["fatteh", "fattah", "fatta"], ar: ["فتة", "فتّات", "فتات"] },
  salad: { en: ["salad"], ar: ["سلط"] },
  drinks: { en: ["drink", "beverage"], ar: ["مشروب"] },
  sandwiches: { en: ["sandwich"], ar: ["سندويش", "ساندويش"] },
  extras: { en: ["extra", "add-on", "addon"], ar: ["إضاف", "اضاف"] },
};

type Category = { id: number; name?: string | null; nameEn?: string | null };

export function findMenuCategory<T extends Category>(categories: T[] | null | undefined, key: MenuCategoryKey): T | null {
  const list = categories ?? [];
  const { en, ar } = KEYWORDS[key];
  const has = (value: string | null | undefined, words: string[]) =>
    !!value && words.some((w) => value.toLowerCase().includes(w));
  return list.find((c) => has(c.nameEn, en)) ?? list.find((c) => !c.nameEn && has(c.name, ar)) ?? null;
}
