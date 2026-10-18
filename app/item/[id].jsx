import { LinearGradient } from "expo-linear-gradient";
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
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "@/components/BackButton";
import FoodPhotoHero from "@/components/FoodPhotoHero";
import { useCart } from "@/context/CartContext";
import { apiRequestCached, imageUrl, isUsableImagePath } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { findMenuCategory } from "@/lib/menu-category";
import { allMenuItems, categoryItems, getMenuSections } from "@/lib/menu-sections";
import { enterDown, enterPop, enterUp } from "@/lib/motion";
import { Text, TextInput } from "@/lib/arabic-font";

/* =========================================================
   ITEM DETAILS
   Opens from a food card inside the menu. The screen takes the
   color of that card's ADD button (orange / teal), with the
   photo centered on the colored top. Below:
   the full name and ingredients, the restaurant's extras
   (the "إضافاتنا" category) to add on the side, and a note for
   the kitchen. The bar at the bottom adds it all to the cart.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";

// Same softened colors as the menu cards / category headers
const SOFT_ORANGE = "#FC6E43";
const SOFT_TEAL = "#337974";
const FADE_ORANGE = "252,110,67";
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
export default function ItemDetails() {
  const { id, tone, button, fromCart } = useLocalSearchParams();
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

  // The extras on offer are the "إضافاتنا" category — minus the item itself
  // if it happens to be one of them.
  const extraItems = useMemo(() => {
    const category = findMenuCategory(menu, "extras");
    return categoryItems(category).filter((e) => String(e.id) !== String(id));
  }, [menu, id]);

  // Where the item sits on the menu decides its color, the same way its card
  // is colored: food cards alternate their ADD button orange / teal by the
  // item's position inside its section.
  const place = useMemo(() => {
    const categories = menu ?? [];
    for (const c of categories) {
      const lists = (getMenuSections(c) ?? [{ items: c.items ?? [] }]).map((s) => s.items);
      for (const list of lists) {
        const pos = list.findIndex((i) => String(i.id) === String(id));
        if (pos !== -1) return { itemIndex: pos };
      }
    }
    return null;
  }, [menu, id]);

  // The whole screen — top, photo backdrop, price and add-to-cart bar — takes
  // the color of the ADD button on the item's card.
  const buttonColor = place
    ? place.itemIndex % 2 === 0
      ? ORANGE
      : TEAL
    : (button ?? tone) === "teal"
      ? TEAL
      : ORANGE;
  const isOrange = buttonColor === ORANGE;
  const headerColor = isOrange ? SOFT_ORANGE : SOFT_TEAL;
  const fade = isOrange ? FADE_ORANGE : FADE_TEAL;

  const photoSize = Math.min(width * 0.66, 290);

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
    const asCartItem = (i) => ({
      id: i.id,
      name: i.nameEn || i.name,
      nameAr: i.name,
      nameEn: i.nameEn,
      price: Number(i.price),
      imageUrl: i.imageUrl,
    });
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

  const description = pickDesc(item);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
      >
        {/* ================= COLORED TOP + PHOTO ================= */}

        {/* Floating 3D glass card (see components/FoodPhotoHero) */}
        <View style={[styles.top, { backgroundColor: headerColor }]}>
          <Animated.View entering={enterPop(1)}>
            <FoodPhotoHero source={imageSource(item, FALLBACK_IMAGE)} size={photoSize} />
          </Animated.View>
        </View>
        <LinearGradient
          pointerEvents="none"
          colors={[headerColor, `rgba(${fade},0.45)`, `rgba(${fade},0)`]}
          style={styles.topFade}
        />

        {/* ================= NAME + INGREDIENTS ================= */}

        <Animated.View entering={enterUp(2)} style={styles.info}>
          <Text style={styles.name}>{pick(item)}</Text>

          {!!description && <Text style={styles.description}>{description}</Text>}

          <View
            style={[styles.pricePill, { backgroundColor: buttonColor === TEAL ? LIGHT_TEAL : LIGHT_ORANGE }]}
          >
            <Text style={[styles.priceText, { color: buttonColor }]}>
              {money(item.price)} {t("jd")}
            </Text>
          </View>
        </Animated.View>

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

        <Animated.View entering={enterUp(4)} style={styles.block}>
          <Text style={[styles.blockTitle, dir.text]}>{t("itemNotes")}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t("itemNotesPlaceholder")}
            placeholderTextColor="#A4A4A4"
            multiline
            maxLength={200}
            style={[styles.notes, dir.text, { borderColor: `rgba(${fade},0.35)` }]}
          />
        </Animated.View>
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

  /* ================= TOP ================= */

  // Clears the status bar + back button, then frames the photo
  top: {
    paddingTop: 100,
    paddingBottom: 30,
    alignItems: "center",
  },

  topFade: {
    height: 56,
    marginTop: -1,
  },

  /* ================= INFO ================= */

  info: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: -6,
  },

  name: {
    color: DARK,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  // Full ingredients — never cut off
  description: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },

  pricePill: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  priceText: {
    fontSize: 18,
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
