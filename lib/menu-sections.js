/* =========================================================
   MENU SUB-SECTIONS
   /api/menu returns top-level categories only; each carries its
   own `items` plus `subcategories` (MenuCategory.parentId), each
   with its own items. A category page shows one titled section
   per sub-category (e.g. Breakfast → الكبدة, سندويشات الفطور,
   صحون الفطور, المخبوزات); a category without any stays a single
   grid.
========================================================= */

/**
 * Every item of a top-level category — its own and its sub-categories' —
 * in menu order. Each carries the top-level `categoryId` (the page that
 * shows it) and its `sectionName`/`sectionNameEn` (for search).
 */
export function categoryItems(category) {
  if (!category) return [];
  const own = (category.items ?? []).map((item) => ({ ...item, categoryId: category.id }));
  const nested = (category.subcategories ?? []).flatMap((sub) =>
    (sub.items ?? []).map((item) => ({
      ...item,
      categoryId: category.id,
      sectionName: sub.name,
      sectionNameEn: sub.nameEn,
    })),
  );
  return [...own, ...nested];
}

/** Every item on the whole menu, across categories and their sub-categories. */
export function allMenuItems(categories) {
  return (categories ?? []).flatMap(categoryItems);
}

/**
 * @returns {{ key: string, name: string, nameEn?: string, items: any[] }[] | null}
 *   null when the category should render as one plain grid.
 */
export function getMenuSections(category) {
  if (!category) return null;

  const subs = (category.subcategories ?? []).filter((s) => s.items?.length);
  if (!subs.length) return null;

  const sections = subs.map((s) => ({
    key: String(s.id),
    name: s.name,
    nameEn: s.nameEn,
    items: s.items,
  }));

  // Items sitting directly on the parent (not in any sub-category) lead the
  // page under the category's own name, so nothing goes missing.
  if (category.items?.length) {
    sections.unshift({
      key: `own-${category.id}`,
      name: category.name,
      nameEn: category.nameEn,
      items: category.items,
    });
  }

  return sections;
}
