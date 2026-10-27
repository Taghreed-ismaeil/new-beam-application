import { findMenuCategory } from "@/lib/menu-category";

// Bundled photo for each menu category. Items have no photos of their own in
// the database yet, so screens show their category's photo instead (the menu
// cards, and the deals carousel on Home).
export const CATEGORY_IMAGES = {
  breakfast: require("@/assets/img/about/menu-img/جبنة بالعسل.jpg"),
  snaks: require("@/assets/img/about/menu-img/الشريمب.jpg"),
  burger: require("@/assets/img/about/menu-img/بيم برغر.jpg"),
  shawerma: require("@/assets/img/about/menu-img/شاورما البيم سأ و لدع.jpg"),
  fattah: require("@/assets/img/about/menu-img/فتة شاورما مع رز.jpg"),
  salad: require("@/assets/img/about/menu-img/كينوا.jpg"),
  extras: require("@/assets/img/about/menu-img/extras.jpg"),
  drinks: require("@/assets/img/drinks_kinza.jpg"),
};

/** The bundled photo for a top-level category, matched by name like the category pages — or null. */
export function categoryImage(category) {
  const key = Object.keys(CATEGORY_IMAGES).find((k) => findMenuCategory([category], k));
  return key ? CATEGORY_IMAGES[key] : null;
}
