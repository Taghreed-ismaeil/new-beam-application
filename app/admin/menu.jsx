import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ConfirmDialog,
  ErrorState,
  Field,
  ImageField,
  Loading,
  Pill,
  ToggleRow,
} from "@/components/admin/ui";
import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  fetchAdminMenu,
  fetchIngredients,
  reorderCategories,
  reorderItems,
  updateCategory,
  updateMenuItem,
} from "@/lib/admin-api";
import { imageUrl } from "@/lib/api-client";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";
import { Text, TextInput } from "@/lib/arabic-font";

// Alternates orange/teal per category so a long menu reads as a sequence of
// distinct sections while scrolling, not one continuous list.
const CAT_TONE = [
  { bg: C.lightOrange, fg: C.orange },
  { bg: C.lightTeal, fg: C.teal },
];

const EMPTY_ITEM = {
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  price: "",
  imageUrl: null,
  isAvailable: true,
};

/**
 * Recipes are entered in the small unit staff actually weigh with (g / ml) but stored in the
 * ingredient's stock unit (kg / L), so orders deduct straight from what's on the shelf.
 * Anything else (pcs, g already, …) is entered as-is.
 */
const RECIPE_UNITS = [
  { stock: ["kg", "كغ", "كجم", "كيلو", "كيلوغرام"], entry: "g", factor: 1000 },
  { stock: ["l", "lt", "liter", "litre", "لتر"], entry: "ml", factor: 1000 },
];
function recipeUnit(stockUnit) {
  const u = String(stockUnit ?? "").trim().toLowerCase();
  const match = RECIPE_UNITS.find((r) => r.stock.includes(u));
  return match ? { entry: match.entry, factor: match.factor } : { entry: stockUnit ?? "", factor: 1 };
}
const trimNum = (n) => String(Math.round(n * 1000) / 1000);

export default function AdminMenu() {
  const { can } = useStaff();
  const canEdit = can("menu", "edit");
  const { t, tn, pick } = useI18n();
  const dir = useDirection();

  const [categories, setCategories] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // item draft, or null
  const [catDraft, setCatDraft] = useState(null); // category draft — has an id when editing
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [arranging, setArranging] = useState(false);

  // Jumping straight to a category matters once the menu runs to several
  // sections — nobody should have to scroll past 40 items to reach the last one.
  const scrollRef = useRef(null);
  const catNodes = useRef({});

  function jumpToCategory(id) {
    const node = catNodes.current[id];
    if (!node || !scrollRef.current) return;
    node.measureLayout(
      scrollRef.current.getInnerViewNode?.() ?? scrollRef.current,
      (_x, y) => scrollRef.current.scrollTo({ y: y - 12, animated: true }),
      () => {},
    );
  }

  // `quiet` refreshes in place after a save/delete: dropping back to the spinner would unmount
  // the list and throw the scroll position back to the first category.
  const load = useCallback((quiet = false) => {
    setError(null);
    if (quiet !== true) setCategories(null); // back to the spinner, so "Try again" visibly does something
    fetchAdminMenu()
      .then((d) =>
        // A category without an items array would crash every map below.
        setCategories((d.categories ?? []).map((c) => ({ ...c, items: c.items ?? [] }))),
      )
      .catch((e) => {
        setError(e);
        setCategories([]);
      });
    // Only used to build the recipe picker; a role without stock access still gets the menu.
    fetchIngredients()
      .then((d) => setIngredients(d.ingredients ?? []))
      .catch(() => setIngredients([]));
  }, []);

  useEffect(load, [load]);

  const itemCount = useMemo(
    () => (categories ?? []).reduce((n, c) => n + (c.items?.length ?? 0), 0),
    [categories],
  );

  /** Flips availability straight away and rolls back if the server refuses. */
  async function toggleAvailability(item, next) {
    setCategories((cats) =>
      cats.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === item.id ? { ...i, isAvailable: next } : i)),
      })),
    );
    try {
      await updateMenuItem(item.id, { isAvailable: next });
    } catch {
      setCategories((cats) =>
        cats.map((c) => ({
          ...c,
          items: c.items.map((i) =>
            i.id === item.id ? { ...i, isAvailable: !next } : i,
          ),
        })),
      );
      setBanner({ text: t("errItemUnchanged") });
    }
  }

  /**
   * A controlled TextInput fires one last change as the sheet unmounts. Spreading a draft
   * that is already null there would build a fresh empty object and pop the sheet straight
   * back open, so every patch is a no-op once the draft is closed.
   */
  const patchItem = (patch) => setEditing((e) => (e ? { ...e, ...patch } : e));
  const patchCat = (patch) => setCatDraft((c) => (c ? { ...c, ...patch } : c));

  /** A blank or zero amount removes the ingredient from the recipe rather than storing 0. */
  // `input` keeps exactly what was typed (so "2." or "0.5" survive while typing); `quantity` is
  // the same amount in the ingredient's stock unit, which is what the server stores.
  const setRecipeLine = (ingredientId, raw, factor) =>
    setEditing((e) => {
      if (!e) return e;
      const input = String(raw).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(",", ".");
      const entered = Number(input);
      const rest = (e.recipe ?? []).filter((r) => r.ingredientId !== ingredientId);
      if (input.trim() === "") return { ...e, recipe: rest };
      const quantity = Number.isFinite(entered) && entered > 0 ? entered / factor : 0;
      return { ...e, recipe: [...rest, { ingredientId, quantity, input }] };
    });

  /**
   * Moves one entry and sends the whole resulting order, so the server stores a complete
   * arrangement rather than a nudge that could interleave with someone else's.
   */
  async function move(list, index, delta, send) {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const previous = categories;
    setCategories((cats) => applyMove(cats, list, next));
    try {
      await send(next.map((entry) => entry.id));
    } catch (e) {
      setCategories(previous); // put it back rather than leave the screen lying
      setBanner({ text: failure(e, t("errSaveFailed")) });
    }
  }

  /** Rebuilds local state to match a move, so the list redraws before the server answers. */
  function applyMove(cats, from, to) {
    if (from === cats) return to;
    return cats.map((c) =>
      c.items === from ? { ...c, items: to } : c,
    );
  }

  /** Turns a failed request into a message that says which of the two problems it is. */
  function failure(e, fallback) {
    return e?.status === 404
      ? t("errRouteMissing")
      : (e?.message ?? fallback);
  }

  async function saveItem() {
    const price = Number(editing.price);
    if (!editing.name?.trim() && !editing.nameEn?.trim()) {
      setBanner({ text: t("errNameRequired") });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setBanner({ text: t("errPriceInvalid") });
      return;
    }

    const body = {
      categoryId: editing.categoryId,
      name: editing.name?.trim() ?? "",
      nameEn: editing.nameEn?.trim() ?? "",
      description: editing.description?.trim() ?? "",
      descriptionEn: editing.descriptionEn?.trim() ?? "",
      price,
      imageUrl: editing.imageUrl ?? null,
      isAvailable: editing.isAvailable !== false,
      recipe: (editing.recipe ?? [])
        .filter((r) => r.quantity > 0)
        .map((r) => ({ ingredientId: r.ingredientId, quantity: Math.round(r.quantity * 1000) / 1000 })),
    };

    setSaving(true);
    setBanner(null);
    try {
      if (editing.id) await updateMenuItem(editing.id, body);
      else await createMenuItem(body);
      setEditing(null);
      load(true);
    } catch (e) {
      setBanner({ text: failure(e, t("errSaveFailed")) });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    setConfirm({
      title: t("confirmDeleteItem"),
      text: t("confirmDeleteItemText"),
      confirmLabel: t("deleteItem"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteMenuItem(editing.id);
          load(true);
        } catch (e) {
          setBanner({
            text:
              e?.status === 409
                ? t("errItemInUse")
                : failure(e, t("errDeleteFailed")),
          });
        } finally {
          // Close the sheet either way: on failure the banner then shows on the page, where it's
          // visible, instead of at the top of a sheet scrolled down to the delete button.
          setEditing(null);
          setSaving(false);
        }
      },
    });
  }

  async function saveCategory() {
    if (!catDraft.name?.trim() && !catDraft.nameEn?.trim()) {
      setBanner({ text: t("errCategoryName") });
      return;
    }
    const body = {
      name: catDraft.name?.trim() ?? "",
      nameEn: catDraft.nameEn?.trim() ?? "",
      imageUrl: catDraft.imageUrl ?? null,
      isActive: catDraft.isActive !== false,
    };

    setSaving(true);
    setBanner(null);
    try {
      if (catDraft.id) await updateCategory(catDraft.id, body);
      else await createCategory(body);
      setCatDraft(null);
      load(true);
    } catch (e) {
      setBanner({ text: failure(e, t("errSaveFailed")) });
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteCategory() {
    const count = categories?.find((c) => c.id === catDraft.id)?.items?.length ?? 0;
    setConfirm({
      title: t("confirmDeleteCategory"),
      text: count
        ? t("confirmDeleteCategoryFull", { count: tn("itemsCount", count) })
        : t("confirmDeleteCategoryEmpty"),
      confirmLabel: t("deleteCategory"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteCategory(catDraft.id);
          setCatDraft(null);
          load(true);
        } catch (e) {
          setBanner({
            text:
              e?.status === 409
                ? e?.data?.error === "category_in_use"
                  ? t("errCategoryInUse")
                  : t("errCategoryNotEmpty")
                : failure(e, t("errDeleteFailed")),
          });
        } finally {
          setSaving(false);
        }
      },
    });
  }

  // The floating button is hidden whenever a sheet is open: it has nothing to do while you're
  // editing, and leaving it mounted under the overlay lets a tap near the sheet's own buttons
  // reach it and reopen an empty draft.
  const canAddItem =
    canEdit && (categories?.length ?? 0) > 0 && editing === null && catDraft === null;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AdminHeader
          eyebrow={t("admin")}
          title={t("menuTitle")}
          subtitle={
            categories === null
              ? t("loading")
              : t("menuSubtitle", {
                  items: tn("itemsCount", itemCount),
                  categories: tn("categoriesCount", categories.length),
                })
          }
          right={
            canEdit ? (
            <Pressable
              onPress={() => {
                setBanner(null);
                setCatDraft({ name: "", nameEn: "", imageUrl: null });
              }}
              style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
            >
              <Ionicons name="albums-outline" size={15} color={C.teal} />
              <Text style={styles.headerActionText}>{t("categoryButton")}</Text>
            </Pressable>
            ) : null
          }
          extra={
            canEdit ? (
              <Pressable
                onPress={() => setArranging((v) => !v)}
                style={({ pressed }) => [
                  styles.headerAction,
                  dir.row,
                  arranging && styles.headerActionOn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="swap-vertical"
                  size={15}
                  color={arranging ? C.white : C.teal}
                />
                <Text style={[styles.headerActionText, arranging && styles.headerActionTextOn]}>
                  {t(arranging ? "arrangeDone" : "arrange")}
                </Text>
              </Pressable>
            ) : null
          }
        />

        <View style={styles.body}>
          <Banner value={banner} />
          {!canEdit && <Banner value={{ tone: "info", text: t("readOnlyNotice") }} />}

          {error && <ErrorState error={error} onRetry={load} />}

          {!error && categories === null && <Loading text={t("loading")} />}

          {/* quick jump — skip the scroll once there's more than a couple of sections */}
          {!error && (categories?.length ?? 0) > 2 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.jumpBar, dir.row]}
            >
              {categories.map((cat, catIndex) => {
                const tone = CAT_TONE[catIndex % CAT_TONE.length];
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => jumpToCategory(cat.id)}
                    style={[styles.jumpChip, dir.row]}
                  >
                    <View style={[styles.jumpDot, { backgroundColor: tone.fg }]} />
                    <Text style={styles.jumpChipText} numberOfLines={1}>
                      {pick(cat)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {!error &&
            categories?.map((cat, catIndex) => {
              const tone = CAT_TONE[catIndex % CAT_TONE.length];
              return (
              <View
                key={cat.id}
                ref={(el) => {
                  if (el) catNodes.current[cat.id] = el;
                }}
                style={[styles.catBlock, catIndex > 0 && styles.catBlockDivider]}
              >
                <View style={[styles.catHeader, dir.row]}>
                  {arranging && (
                    <Arrows
                      dir={dir}
                      canUp={catIndex > 0}
                      canDown={catIndex < categories.length - 1}
                      onUp={() => move(categories, catIndex, -1, reorderCategories)}
                      onDown={() => move(categories, catIndex, 1, reorderCategories)}
                    />
                  )}
                  <View style={[styles.catIndex, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.catIndexText, { color: tone.fg }]}>
                      {catIndex + 1}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setBanner(null);
                      setCatDraft({ ...cat });
                    }}
                    style={({ pressed }) => [styles.catTitleRow, dir.row, pressed && styles.pressed]}
                  >
                    <Text style={styles.catTitle}>{pick(cat)}</Text>
                    {canEdit && <Ionicons name="pencil" size={13} color={C.muted} />}
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pill text={tn("itemsPill", cat.items.length)} tone="gray" />
                </View>

                {(cat.items ?? []).map((item, itemIndex) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setBanner(null);
                      setEditing({
                        ...item,
                        price: String(item.price ?? ""),
                        categoryId: cat.id,
                      });
                    }}
                    style={({ pressed }) => [styles.row, dir.row, pressed && styles.pressed]}
                  >
                    {item.outOfStock && (
                      <View
                        style={[
                          styles.rowAccent,
                          dir.isRTL ? { right: 0 } : { left: 0 },
                        ]}
                      />
                    )}

                    {arranging && (
                      <Arrows
                        dir={dir}
                        canUp={itemIndex > 0}
                        canDown={itemIndex < cat.items.length - 1}
                        onUp={() => move(cat.items, itemIndex, -1, (ids) => reorderItems(cat.id, ids))}
                        onDown={() => move(cat.items, itemIndex, 1, (ids) => reorderItems(cat.id, ids))}
                      />
                    )}

                    <View style={styles.thumb}>
                      {item.imageUrl ? (
                        <Image source={{ uri: imageUrl(item.imageUrl) }} style={styles.thumbImg} />
                      ) : (
                        <Ionicons name="image-outline" size={18} color={C.placeholder} />
                      )}
                    </View>

                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, dir.text]} numberOfLines={1}>
                        {pick(item)}
                      </Text>
                      <View style={[styles.rowMeta, dir.row]}>
                        <Text style={styles.rowPrice}>
                          {Number(item.price).toFixed(2)} {t("currency")}
                        </Text>
                        {/* Out of stock is the kitchen's doing, not the manager's — it gets
                            its own badge so nobody goes looking for a switch to flip. */}
                        {item.outOfStock && <Pill text={t("outOfStock")} tone="danger" />}
                      </View>
                      {item.outOfStock && (
                        <Text style={[styles.missing, dir.text]} numberOfLines={1}>
                          {t("missingIngredient", {
                            name: item.missingIngredients?.map((m) => pick(m)).join("، ") ?? "",
                          })}
                        </Text>
                      )}
                    </View>

                    <Switch
                      value={item.isAvailable !== false}
                      disabled={!canEdit}
                      onValueChange={(v) => toggleAvailability(item, v)}
                      trackColor={{ true: C.teal, false: C.borderStrong }}
                      thumbColor={C.white}
                    />
                  </Pressable>
                ))}

                {(cat.items?.length ?? 0) === 0 && (
                  <Text style={[styles.catEmpty, dir.text]}>{t("noItemsInCategory")}</Text>
                )}
              </View>
              );
            })}

          {!error && categories?.length === 0 && (
            <Text style={[styles.catEmpty, dir.text]}>{t("noCategories")}</Text>
          )}
        </View>
      </ScrollView>

      {canAddItem && (
        <Pressable
          onPress={() => {
            setBanner(null);
            setEditing({ ...EMPTY_ITEM, categoryId: categories[0].id });
          }}
          style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newItem")}</Text>
        </Pressable>
      )}

      {/* ---------- item editor ---------- */}
      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>
                {editing?.id ? t("editItem") : t("newItemTitle")}
              </Text>

              <Banner value={banner} />

              <Field
                label={t("fieldPrice")}
                value={editing?.price ?? ""}
                onChangeText={(v) => patchItem({ price: v })}
                keyboardType="decimal-pad"
                placeholder="4.50"
              />

              <ImageField
                label={t("fieldPhoto")}
                value={editing?.imageUrl}
                folder="menu"
                onChange={(path) => patchItem({ imageUrl: path })}
                hint={t("photoHint")}
              />

              <Field
                label={t("fieldNameEn")}
                value={editing?.nameEn ?? ""}
                onChangeText={(v) => patchItem({ nameEn: v })}
                placeholder="Smash Burger"
              />
              <Field
                label={t("fieldNameAr")}
                value={editing?.name ?? ""}
                onChangeText={(v) => patchItem({ name: v })}
                placeholder="سماش برجر"
              />
              <Field
                label={t("fieldDescEn")}
                value={editing?.descriptionEn ?? ""}
                onChangeText={(v) => patchItem({ descriptionEn: v })}
                placeholder="Double patty with melted cheese"
                multiline
              />
              <Field
                label={t("fieldDescAr")}
                value={editing?.description ?? ""}
                onChangeText={(v) => patchItem({ description: v })}
                placeholder="قطعتين لحم مع جبنة ذائبة"
                multiline
              />

              <Text style={[styles.fieldLabel, dir.text]}>{t("fieldCategory")}</Text>
              <View style={[styles.chips, dir.row]}>
                {(categories ?? []).map((c) => {
                  const on = editing?.categoryId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => patchItem({ categoryId: c.id })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {pick(c)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <ToggleRow
                label={t("visibleToCustomers")}
                value={editing?.isAvailable !== false}
                onValueChange={(v) => patchItem({ isAvailable: v })}
              />

              {/* ----- what it consumes ----- */}
              {ingredients.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, dir.text]}>{t("recipeTitle")}</Text>
                  <Text style={[styles.recipeStock, dir.text, { marginBottom: 8 }]}>
                    {t("recipeHint")}
                  </Text>

                  {ingredients.map((ing) => {
                    const line = (editing?.recipe ?? []).find((r) => r.ingredientId === ing.id);
                    const { entry, factor } = recipeUnit(ing.unit);
                    const value = line ? (line.input ?? trimNum(Number(line.quantity) * factor)) : "";
                    return (
                      <View key={ing.id} style={[styles.recipeRow, dir.row]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.recipeName, dir.text]} numberOfLines={1}>
                            {pick(ing)}
                          </Text>
                          <Text style={[styles.recipeStock, dir.text]}>
                            {t("recipeInStock", { quantity: trimNum(Number(ing.quantity)), unit: ing.unit })}
                            {line?.quantity > 0 && factor !== 1
                              ? `  ·  = ${trimNum(line.quantity)} ${ing.unit} ${t("recipePerItem")}`
                              : ""}
                          </Text>
                        </View>
                        <TextInput
                          value={value}
                          onChangeText={(v) => setRecipeLine(ing.id, v, factor)}
                          placeholder="0"
                          placeholderTextColor={C.borderStrong}
                          keyboardType="decimal-pad"
                          style={styles.recipeInput}
                        />
                        <Text style={styles.recipeUnit}>{entry}</Text>
                      </View>
                    );
                  })}
                </>
              )}

              <View style={{ gap: 9, marginTop: 16 }}>
                {canEdit && (
                <Btn title={t("save")} icon="checkmark" onPress={saveItem} loading={saving} />
                )}
                {canEdit && !!editing?.id && (
                  <Btn
                    title={t("deleteItem")}
                    variant="danger"
                    icon="trash-outline"
                    onPress={confirmDelete}
                    disabled={saving}
                  />
                )}
                <Btn
                  title={t("cancel")}
                  variant="ghost"
                  onPress={() => setEditing(null)}
                  disabled={saving}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------- new category ---------- */}
      <Modal
        visible={catDraft !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCatDraft(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>
                {catDraft?.id ? t("editCategory") : t("newCategory")}
              </Text>
              <Banner value={banner} />
              <Field
                label={t("fieldNameEn")}
                value={catDraft?.nameEn ?? ""}
                onChangeText={(v) => patchCat({ nameEn: v })}
                placeholder="Drinks"
              />
              <Field
                label={t("fieldNameAr")}
                value={catDraft?.name ?? ""}
                onChangeText={(v) => patchCat({ name: v })}
                placeholder="مشروبات"
              />
              <ImageField
                label={t("fieldCoverPhoto")}
                value={catDraft?.imageUrl}
                folder="menu"
                onChange={(path) => patchCat({ imageUrl: path })}
                hint={t("coverHint")}
              />
              <ToggleRow
                label={t("visibleToCustomers")}
                value={catDraft?.isActive !== false}
                onValueChange={(v) => patchCat({ isActive: v })}
              />
              <View style={{ gap: 9, marginTop: 6 }}>
                {canEdit && (
                <Btn
                  title={catDraft?.id ? t("save") : t("createCategory")}
                  icon="checkmark"
                  onPress={saveCategory}
                  loading={saving}
                />
                )}
                {canEdit && !!catDraft?.id && (
                  <Btn
                    title={t("deleteCategory")}
                    variant="danger"
                    icon="trash-outline"
                    onPress={confirmDeleteCategory}
                    disabled={saving}
                  />
                )}
                <Btn
                  title={t("cancel")}
                  variant="ghost"
                  onPress={() => setCatDraft(null)}
                  disabled={saving}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

/**
 * Up/down buttons rather than drag-and-drop: a menu is reordered rarely, usually on a phone,
 * often by someone with one hand full. Two taps beat a long-press-and-drag that fights the
 * scroll view.
 */
function Arrows({ dir, canUp, canDown, onUp, onDown }) {
  return (
    <View style={styles.arrows}>
      <Pressable onPress={onUp} disabled={!canUp} hitSlop={4} style={styles.arrowBtn}>
        <Ionicons name="chevron-up" size={16} color={canUp ? C.dark : C.borderStrong} />
      </Pressable>
      <Pressable onPress={onDown} disabled={!canDown} hitSlop={4} style={styles.arrowBtn}>
        <Ionicons name="chevron-down" size={16} color={canDown ? C.dark : C.borderStrong} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  arrows: { justifyContent: "center" },
  arrowBtn: { width: 28, height: 22, alignItems: "center", justifyContent: "center" },
  rowMeta: { alignItems: "center", gap: 7, marginTop: 3 },
  missing: { color: C.danger, fontSize: fs(14), fontWeight: "700", marginTop: 3 },
  headerActionOn: { backgroundColor: C.teal },
  headerActionTextOn: { color: C.white },

  jumpBar: { gap: 8, paddingBottom: 6, marginBottom: 4 },
  jumpChip: {
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  jumpDot: { width: 6, height: 6, borderRadius: 3 },
  jumpChipText: { color: C.dark, fontSize: fs(15), fontWeight: "800" },
  recipeRow: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceAlt,
  },
  recipeName: { flex: 1, color: C.dark, fontSize: fs(15), fontWeight: "700" },
  recipeStock: { color: C.muted, fontSize: fs(14), fontWeight: "700", marginTop: 2 },
  recipeInput: {
    width: 70,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 10,
    color: C.dark,
    fontSize: fs(15.5),
    fontWeight: "700",
    textAlign: "center",
  },
  recipeUnit: { color: C.muted, fontSize: fs(14), fontWeight: "800", minWidth: 30 },
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 110 },
  body: { paddingHorizontal: 20 },

  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.lightTeal,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 13,
  },
  headerActionText: { color: C.teal, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1 },

  catBlock: { marginTop: 26 },
  catBlockDivider: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 24,
  },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  catIndex: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catIndexText: { fontSize: fs(15.5), fontWeight: "800" },
  catTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  catTitle: { color: C.dark, fontSize: fs(24), fontWeight: "800", letterSpacing: -0.4 },
  catEmpty: { color: C.subtle, fontSize: fs(15), marginTop: 4, marginBottom: 6 },

  row: {
    position: "relative",
    overflow: "hidden",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 9,
    gap: 11,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rowAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: C.danger,
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { color: C.dark, fontSize: fs(15.5), fontWeight: "800", marginBottom: 3 },
  rowPrice: { color: C.teal, fontSize: fs(14.5), fontWeight: "800" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: C.orange,
    elevation: 8,
    shadowColor: C.orange,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: C.white, fontSize: fs(15), fontWeight: "800", letterSpacing: 0.5 },

  backdrop: { flex: 1, backgroundColor: "rgba(23,32,31,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  sheetGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: { color: C.dark, fontSize: fs(22), fontWeight: "800", marginBottom: 18 },

  fieldLabel: {
    color: C.muted,
    fontSize: fs(13.5),
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
