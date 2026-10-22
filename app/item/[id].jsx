import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MadeBy from "@/components/MadeBy";
import BackButton from "@/components/BackButton";
import FoodPhotoHero from "@/components/FoodPhotoHero";
import { useCart } from "@/context/CartContext";
import { apiRequestCached, imageUrl, isUsableImagePath } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { findMenuCategory } from "@/lib/menu-category";
import { allMenuItems, categoryItems, getMenuSections } from "@/lib/menu-sections";
import { enterDown, enterUp } from "@/lib/motion";
import { Text, TextInput } from "@/lib/arabic-font";

/* =========================================================
   ITEM DETAILS
   Opens from a food card inside the menu: the photo on a teal
   top, the name, a teal card with one tag per ingredient and the
   price, the restaurant's extras (the "إضافاتنا" category), a
   tap-to-open note for the kitchen, and more items of the same
   kind. The orange bar at the bottom adds it all to the cart.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";

// Same softened teal as the menu cards / category headers
const SOFT_TEAL = "#337974";
const FADE_TEAL = "51,121,116";

const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";

const CREAM = "#FFF9F4";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const BORDER = "#EEEAE5";

const FALLBACK_IMAGE = require("../../assets/img/menu-5.jpg");
const EXTRAS_IMAGE = require("../../assets/img/about/menu-img/extras.jpg");

const imageSource = (item, fallback) =>
  isUsableImagePath(item?.imageUrl) ? { uri: imageUrl(item.imageUrl) } : fallback;

const money = (n) => Number(n).toFixed(2);

const asCartItem = (i) => ({
  id: i.id,
  name: i.nameEn || i.name,
  nameAr: i.name,
  nameEn: i.nameEn,
  price: Number(i.price),
  imageUrl: i.imageUrl,
});

// "خبز، لحمة، جبنة" → ["خبز", "لحمة", "جبنة"] — one tag per ingredient
const splitIngredients = (text) =>
  (text ?? "")
    .split(/[,،\n•]|\s[-–]\s/)
    .map((s) => s.trim())
    .filter(Boolean);

// Each ingredient tag pops toward the viewer, overshoots, then settles —
// one after another. (A 3D perspective version got stuck mid-air on web.)
const popTag = (index) => ZoomIn.delay(250 + index * 80).springify().damping(9).stiffness(180);

export default function ItemDetails() {
  const { id, fromCart } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { t, pick, pickDesc, dir } = useAppLang();

  const [menu, setMenu] = useState(null);
  // Opened from a cart line: start from what is in the cart, and saving updates it
  const cartLine = fromCart ? cart.lines.find((l) => String(l.menuItemId) === String(id)) : null;
  const [quantity, setQuantity] = useState(() => cartLine?.quantity ?? 1);
  // extra item id → quantity; from the cart, start with the extras already in it
  const [extras, setExtras] = useState(() =>
    fromCart ? Object.fromEntries(cart.lines.map((l) => [l.menuItemId, l.quantity])) : {},
  );
  const [notes, setNotes] = useState(() => cartLine?.notes ?? "");

  useEffect(() => {
    apiRequestCached("/api/menu", (data) => setMenu(data.categories ?? []));
  }, []);

  const item = useMemo(
    () => allMenuItems(menu).find((i) => String(i.id) === String(id)) ?? null,
    [menu, id],
  );

  // The extras on offer are the ones the admin picked for this item (`extraIds`)
  // out of the "إضافاتنا" category. A server that doesn't send `extraIds` yet
  // still gets the whole category, minus the item itself.
  const extraItems = useMemo(() => {
    const category = findMenuCategory(menu, "extras");
    const allowed = item?.extraIds;
    return categoryItems(category).filter(
      (e) => String(e.id) !== String(id) && (!Array.isArray(allowed) || allowed.includes(e.id)),
    );
  }, [menu, id, item]);

  // "More from the same kind": the other items of the item's own sub-section
  // (burgers → the other burgers); an item alone in its sub-section falls back
  // to the rest of its whole category.
  const sameKind = useMemo(() => {
    for (const c of menu ?? []) {
      const lists = (getMenuSections(c) ?? [{ items: c.items ?? [] }]).map((s) => s.items);
      const list = lists.find((l) => l.some((i) => String(i.id) === String(id)));
      if (!list) continue;
      const pool = list.length > 1 ? list : categoryItems(c);
      return pool.filter((i) => String(i.id) !== String(id));
    }
    return [];
  }, [menu, id]);

  // Every item page looks the same: teal on top (photo backdrop + the
  // ingredients card), orange at the bottom (quantity + add to cart).
  const buttonColor = ORANGE;
  const headerColor = SOFT_TEAL;
  const fade = FADE_TEAL;

  // From the cart with a note already written: start with the note box open
  const [noteOpen, setNoteOpen] = useState(() => !!cartLine?.notes);
  // the "+" on a same-kind card flips to ✓ for a moment after adding
  const [justAdded, setJustAdded] = useState(null);

  function quickAdd(i) {
    cart.addMany(asCartItem(i), 1);
    setJustAdded(i.id);
    setTimeout(() => setJustAdded((cur) => (cur === i.id ? null : cur)), 1200);
  }

  const heroHeight = Math.min(Math.round(width * 0.95), 440);

  const extrasTotal = extraItems.reduce(
    (sum, e) => sum + Number(e.price) * (extras[e.id] ?? 0),
    0,
  );
  const total = item ? Number(item.price) * quantity + extrasTotal : 0;

  function changeExtra(extraId, delta) {
    setExtras((prev) => {
      const next = Math.max((prev[extraId] ?? 0) + delta, 0);
      return { ...prev, [extraId]: next };
    });
  }

  function addToCart() {
    if (!item) return;
    if (cartLine) cart.updateLine(item.id, quantity, notes);
    else cart.addMany(asCartItem(item), quantity, notes);
    for (const e of extraItems) {
      const inCart = cartLine && cart.lines.find((l) => l.menuItemId === e.id);
      // editing from the cart sets the extras to what is chosen here
      if (inCart) cart.updateLine(e.id, extras[e.id] ?? 0, inCart.notes ?? undefined);
      else if (extras[e.id]) cart.addMany(asCartItem(e), extras[e.id]);
    }
    if (router.canGoBack()) router.back();
    else router.replace(cartLine ? "/cart" : "/menu");
  }

  /* ================= LOADING / MISSING ================= */

  if (!menu || !item) {
    return (
      <View style={styles.centered}>
        <BackButton />
        {!menu ? (
          <ActivityIndicator color={ORANGE} />
        ) : (
          <Text style={styles.missing}>{t("itemNotFound")}</Text>
        )}
      </View>
    );
  }

  const ingredients = splitIngredients(pickDesc(item));

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 + insets.bottom }}
      >
        {/* ================= PHOTO ================= */}

        {/* Full-width photo with a slow zoom (see components/FoodPhotoHero) */}
        <FoodPhotoHero source={imageSource(item, FALLBACK_IMAGE)} width={width} height={heroHeight} />

        {/* ================= SHEET: NAME + INGREDIENTS + PRICE ================= */}

        {/* Cream sheet with rounded top corners rising over the photo */}
        <View style={styles.sheet}>
          <View style={[styles.handle, { backgroundColor: headerColor }]} />

          <Animated.View entering={enterUp(1)}>
            <Text style={styles.name}>{pick(item)}</Text>
          </Animated.View>

          {/* 3D teal card: one white-framed tag per ingredient, then the price */}
          <Animated.View entering={enterUp(2)} style={styles.ingCard}>
            <View pointerEvents="none" style={styles.cardBubbleBig} />
            <View pointerEvents="none" style={styles.cardBubbleSmall} />
            {ingredients.length > 0 && (
              <>
                <View style={styles.ingList}>
                  {ingredients.map((ing, i) => (
                    <Animated.View key={`${ing}-${i}`} entering={popTag(i)} style={styles.ingTag}>
                      <Text style={styles.ingText}>{ing}</Text>
                    </Animated.View>
                  ))}
                </View>
                <View style={styles.ingDivider} />
              </>
            )}
            <Text style={styles.ingPrice}>
              {money(item.price)} {t("jd")}
            </Text>
          </Animated.View>
        </View>

        {/* ================= EXTRAS ================= */}

        {extraItems.length > 0 && (
          <Animated.View entering={enterUp(3)} style={styles.block}>
            <Text style={[styles.blockTitle, dir.text]}>{t("itemExtras")}</Text>
            <Text style={[styles.blockHint, dir.text]}>{t("itemExtrasHint")}</Text>

            <View style={styles.extrasCard}>
              {extraItems.map((e, i) => {
                // Rows alternate orange / teal down the list
                const rowColor = i % 2 === 0 ? ORANGE : TEAL;
                const rowSoft = i % 2 === 0 ? LIGHT_ORANGE : LIGHT_TEAL;
                const count = extras[e.id] ?? 0;
                return (
                  <View
                    key={e.id}
                    style={[styles.extraRow, dir.row, i > 0 && styles.extraDivider]}
                  >
                    <Image
                      source={imageSource(e, EXTRAS_IMAGE)}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      style={[styles.extraThumb, { borderColor: rowSoft }]}
                    />

                    <View style={styles.extraInfo}>
                      <Text style={[styles.extraName, dir.text]} numberOfLines={2}>
                        {pick(e)}
                      </Text>
                      <Text style={[styles.extraPrice, dir.text, { color: rowColor }]}>
                        +{money(e.price)} {t("jd")}
                      </Text>
                    </View>

                    {count === 0 ? (
                      <Pressable
                        onPress={() => changeExtra(e.id, 1)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.plusButton,
                          { backgroundColor: rowColor },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.plusText}>+</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.stepper, dir.row, { backgroundColor: rowSoft, borderColor: rowColor }]}>
                        <Pressable onPress={() => changeExtra(e.id, -1)} hitSlop={6} style={styles.stepBtn}>
                          <Text style={[styles.stepMinus, { color: rowColor }]}>−</Text>
                        </Pressable>
                        <Text style={[styles.stepCount, { color: rowColor }]}>{count}</Text>
                        <Pressable
                          onPress={() => changeExtra(e.id, 1)}
                          hitSlop={6}
                          style={[styles.stepBtn, { backgroundColor: rowColor }]}
                        >
                          <Text style={styles.stepPlus}>+</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ================= NOTES ================= */}

        {/* collapsed to a dashed "add a note" button until tapped */}
        <Animated.View entering={enterUp(4)} style={styles.block}>
          {/* the button toggles the box; a written note is kept when it closes */}
          <Pressable
            onPress={() => setNoteOpen((open) => !open)}
            style={({ pressed }) => [styles.addNote, dir.row, pressed && styles.pressed]}
          >
            <View style={styles.addNoteIcon}>
              <Ionicons name="pencil" size={15} color={WHITE} />
            </View>
            <View style={styles.addNoteBody}>
              <Text style={[styles.addNoteText, dir.text]}>{t("itemAddNote")}</Text>
              {!noteOpen && !!notes.trim() && (
                <Text style={[styles.addNotePreview, dir.text]} numberOfLines={1}>
                  {notes.trim()}
                </Text>
              )}
            </View>
            <Ionicons name={noteOpen ? "chevron-up" : "add"} size={20} color={TEAL} />
          </Pressable>

          {noteOpen && (
            <Animated.View entering={FadeInDown.springify().damping(16)}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t("itemNotesPlaceholder")}
                placeholderTextColor="#A4A4A4"
                multiline
                autoFocus={!notes}
                maxLength={200}
                style={[styles.notes, dir.text, { borderColor: `rgba(${fade},0.35)` }]}
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* ================= MORE FROM THE SAME KIND ================= */}

        {sameKind.length > 0 && (
          <Animated.View entering={enterUp(5)} style={styles.moreBlock}>
            <Text style={[styles.blockTitle, styles.moreTitle, dir.text]}>{t("itemMoreLikeThis")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moreRow}
            >
              {sameKind.map((i) => (
                <Pressable
                  key={i.id}
                  onPress={() => router.push({ pathname: "/item/[id]", params: { id: String(i.id) } })}
                  style={({ pressed }) => [styles.moreCard, pressed && styles.pressed]}
                >
                  <Image
                    source={imageSource(i, FALLBACK_IMAGE)}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    style={styles.moreImage}
                  />
                  <Text style={[styles.moreName, dir.text]} numberOfLines={2}>
                    {pick(i)}
                  </Text>
                  <View style={[styles.moreBottom, dir.row]}>
                    <Text style={styles.morePrice}>
                      {money(i.price)} {t("jd")}
                    </Text>
                    <Pressable
                      onPress={() => quickAdd(i)}
                      hitSlop={8}
                      style={[styles.morePlus, justAdded === i.id && styles.morePlusDone]}
                    >
                      <Ionicons name={justAdded === i.id ? "checkmark" : "add"} size={16} color={WHITE} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}
        <MadeBy />
      </ScrollView>

      {/* ================= BOTTOM BAR ================= */}

      <Animated.View
        entering={enterDown(0)}
        style={[styles.bar, dir.row, { paddingBottom: 14 + insets.bottom }]}
      >
        <View style={[styles.qty, dir.row, { borderColor: buttonColor }]}>
          <Pressable
            onPress={() => setQuantity((q) => Math.max(q - 1, 1))}
            hitSlop={6}
            style={styles.qtyBtn}
          >
            <Text style={[styles.qtyMinus, { color: buttonColor }]}>−</Text>
          </Pressable>
          <Text style={[styles.qtyCount, { color: buttonColor }]}>{quantity}</Text>
          <Pressable
            onPress={() => setQuantity((q) => q + 1)}
            hitSlop={6}
            style={[styles.qtyBtn, { backgroundColor: buttonColor }]}
          >
            <Text style={styles.qtyPlus}>+</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={addToCart}
          style={({ pressed }) => [
            styles.addButton,
            dir.row,
            { backgroundColor: buttonColor },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.addText, dir.noSpacing]}>{t(cartLine ? "itemSaveChanges" : "itemAddToCart")}</Text>
          <Text style={styles.addTotal}>
            {money(total)} {t("jd")}
          </Text>
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  centered: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: "center",
    justifyContent: "center",
  },

  missing: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ================= SHEET ================= */

  // rises over the bottom of the photo
  sheet: {
    marginTop: -30,
    backgroundColor: CREAM,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    opacity: 0.7,
    marginBottom: 14,
  },

  name: {
    color: DARK,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  /* ================= INGREDIENTS CARD ================= */

  // solid teal, thick darker bottom edge = 3D
  ingCard: {
    alignSelf: "stretch",
    marginTop: 16,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 26,
    borderBottomWidth: 6,
    borderBottomColor: "#003B37",
    backgroundColor: TEAL,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },

  // soft see-through circles for depth in the corners
  cardBubbleBig: {
    position: "absolute",
    top: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  cardBubbleSmall: {
    position: "absolute",
    bottom: -40,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // Tags centered, wrapping onto new lines with room between rows
  ingList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 10,
    columnGap: 9,
  },

  // see-through tag with a white frame
  ingTag: {
    borderWidth: 1.5,
    borderColor: WHITE,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  ingText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },

  ingDivider: {
    alignSelf: "stretch",
    marginTop: 18,
    marginBottom: 14,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.45)",
  },

  ingPrice: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "900",
  },

  /* ================= BLOCKS ================= */

  block: {
    marginTop: 26,
    paddingHorizontal: 16,
  },

  blockTitle: {
    color: DARK,
    fontSize: 19,
    fontWeight: "900",
  },

  blockHint: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 10,
  },

  /* ================= EXTRAS ================= */

  extrasCard: {
    backgroundColor: WHITE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },

  extraDivider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  extraThumb: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
  },

  extraInfo: {
    flex: 1,
    minWidth: 0,
  },

  extraName: {
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },

  extraPrice: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },

  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  plusText: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 999,
    padding: 3,
    gap: 8,
  },

  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  stepMinus: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },

  stepCount: {
    fontSize: 14,
    fontWeight: "900",
    minWidth: 14,
    textAlign: "center",
  },

  stepPlus: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },

  /* ================= NOTES ================= */

  notes: {
    marginTop: 10,
    minHeight: 96,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: DARK,
    textAlignVertical: "top",
  },

  // dashed teal "add a note" button: pencil square · text · plus
  addNote: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: TEAL,
    backgroundColor: WHITE,
  },

  addNoteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  addNoteBody: {
    flex: 1,
    minWidth: 0,
  },

  addNoteText: {
    color: TEAL,
    fontSize: 15,
    fontWeight: "800",
  },

  // the closed box still shows what was written
  addNotePreview: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 2,
  },

  /* ================= MORE FROM THE SAME KIND ================= */

  moreBlock: {
    marginTop: 26,
  },

  moreTitle: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  moreRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },

  moreCard: {
    width: 140,
    padding: 8,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  moreImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#F4F1ED",
  },

  moreName: {
    color: DARK,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
    minHeight: 34,
  },

  moreBottom: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },

  morePrice: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: "900",
  },

  morePlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  morePlusDone: {
    backgroundColor: TEAL,
  },

  /* ================= BOTTOM BAR ================= */

  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: WHITE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },

  qty: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 999,
    padding: 4,
    gap: 10,
  },

  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyMinus: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },

  qtyCount: {
    fontSize: 16,
    fontWeight: "900",
    minWidth: 16,
    textAlign: "center",
  },

  qtyPlus: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },

  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },

  addText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  addTotal: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
