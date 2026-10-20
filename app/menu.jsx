import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import MadeBy from "@/components/MadeBy";
import FoodCard from "@/components/FoodCard";
import QuickCategoryPills from "@/components/QuickCategoryPills";
import { useCart } from "@/context/CartContext";
import { apiRequestCached, imageUrl, isUsableImagePath, refreshCached } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { findMenuCategory } from "@/lib/menu-category";
import { categoryItems } from "@/lib/menu-sections";
import { enterDown, enterFromLeft, enterFromRight } from "@/lib/motion";
import { Text, TextInput } from "@/lib/arabic-font";

// White logo made for the teal background (same one as the home hero)
const LOGO = require("../assets/img/remove_beam_logoo.jpg");

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const MUTED = "#68706E";

// Card panels: brand colors lightened ~20% toward white
const SOFT_ORANGE = "#FC6E43";
const SOFT_TEAL = "#337974";

const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";

const WHITE = "#FFFFFF";

// Same teal as the gifts (loyalty) header
const HERO_TEAL = TEAL;

const BOTTOM_NAV_SPACE = 110;

const CATEGORY_META = {
  breakfast: {
    image: require("../assets/img/about/menu-img/جبنة بالعسل.jpg"),
    route: "/menu-food/breakfast",
    color: TEAL,
    light: LIGHT_TEAL,
  },
  snaks: {
    image: require("../assets/img/about/menu-img/الشريمب.jpg"),
    route: "/menu-food/snaks",
    color: ORANGE,
    light: LIGHT_ORANGE,
  },
  burger: {
    image: require("../assets/img/about/menu-img/بيم برغر.jpg"),
    route: "/menu-food/burger",
    color: TEAL,
    light: LIGHT_TEAL,
  },
  shawerma: {
    image: require("../assets/img/about/menu-img/شاورما البيم سأ و لدع.jpg"),
    route: "/menu-food/shawerma",
    color: ORANGE,
    light: LIGHT_ORANGE,
  },
  fattah: {
    image: require("../assets/img/about/menu-img/فتة شاورما مع رز.jpg"),
    route: "/menu-food/fattah",
    color: TEAL,
    light: LIGHT_TEAL,
  },
  salad: {
    image: require("../assets/img/about/menu-img/كينوا.jpg"),
    route: "/menu-food/salad",
    color: ORANGE,
    light: LIGHT_ORANGE,
  },
  // No page of its own — opens the generic /menu-food/[categoryId] page.
  extras: {
    image: require("../assets/img/about/menu-img/extras.jpg"),
  },
  drinks: {
    image: require("../assets/img/drinks_kinza.jpg"),
    route: "/menu-food/drinks",
    color: TEAL,
    light: LIGHT_TEAL,
  },
};

// Same name matching as the category pages (lib/menu-category), so a tap on a pill, a card and
// the page it opens always agree on which category is which — whatever spelling the admin used.
const CATEGORY_KEYS = ["breakfast", "snaks", "burger", "shawerma", "sandwiches", "drinks", "salad", "fattah", "extras"];

const getCategoryKey = (item) =>
  CATEGORY_KEYS.find((key) => findMenuCategory([item], key)) ?? null;

// Lets "برجر" find "برغر", "شاورمة" find "شاورما", "اكل" find "أكل" etc.
// Folds letters people spell interchangeably and drops diacritics/tatweel.
function normalizeSearch(text) {
  return String(text)
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[جغ]/g, "ج") // برجر / برغر
    .replace(/(ما|مه)(?=\s|$)/g, "مه") // شاورما / شاورمة
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   FLASH CARD
   "Here it is!" — after a quick pill scrolls the menu to a
   category, its card gives a quick bounce and a glow in its own colour
   that blinks twice, then goes back to normal.
========================================================= */

const SCROLL_SETTLE = 380;

function FlashCard({ signal, color, children }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!signal) return;

    scale.value = withDelay(
      SCROLL_SETTLE,
      withSequence(
        withSpring(1.045, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      ),
    );

    glow.value = withDelay(
      SCROLL_SETTLE,
      withSequence(
        withTiming(1, { duration: 160 }),
        withTiming(0.15, { duration: 220 }),
        withTiming(1, { duration: 160 }),
        withTiming(0, { duration: 450 }),
      ),
    );
  }, [signal]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={cardStyle}>
      {children}

      <Animated.View
        pointerEvents="none"
        style={[styles.flashGlow, { borderColor: color }, glowStyle]}
      />
    </Animated.View>
  );
}

export default function Menu() {
  const { width } = useWindowDimensions();
  const { t, pick, dir } = useAppLang();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search runs right here on the menu (no separate page)
  const [query, setQuery] = useState("");

  const cart = useCart();
  const cartCount = cart.lines.reduce((n, l) => n + l.quantity, 0);

  const scrollRef = useRef(null);

  const categoryPositions = useRef({});

  // Which category card to flash after a quick-pill jump — the count re-triggers it on repeat taps.
  const [flash, setFlash] = useState({ id: null, count: 0 });

  const isSmall = width < 360;
  const gutter = isSmall ? 18 : 22;

  // Search results: two cards per row
  const cardWidth = (width - gutter * 2 - 12) / 2;

  // Re-read on every visit (the cache spares the network within 30s), so menu
  // changes made in the admin panel show up without restarting the app.
  useFocusEffect(
    useCallback(() => {
      apiRequestCached("/api/menu", (data) => {
        setCategories(data.categories ?? []);
        setLoading(false);
      });
    }, []),
  );

  // Pull down to refresh
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await refreshCached("/api/menu");
      setCategories(data.categories ?? []);
    } catch {
      // keep what's on screen
    } finally {
      setRefreshing(false);
    }
  }

  const allCategories = categories.map((item, index) => {
    const meta = CATEGORY_META[getCategoryKey(item)] || {};

    return {
      ...item,
      route: meta.route || `/menu-food/${item.id}`,
      color: meta.color || (index % 2 === 0 ? TEAL : ORANGE),
      light: meta.light || (index % 2 === 0 ? LIGHT_TEAL : LIGHT_ORANGE),
      image: meta.image,
    };
  });

  const hasQuery = !!query.trim();

  const results = useMemo(() => {
    // Every typed word must appear somewhere, in any order ("برغر بيم" finds "بيم برغر")
    const words = normalizeSearch(query).split(" ").filter(Boolean);

    if (!words.length) return [];

    // Sub-category items count too ("موهيتو" finds every mojito, "عصائر" every juice)
    return categories.flatMap((c) =>
      categoryItems(c).filter((item) => {
        const haystack = normalizeSearch(
          [
            item.name,
            item.nameEn,
            item.description,
            item.descriptionEn,
            item.sectionName,
            item.sectionNameEn,
            c.name,
            c.nameEn,
          ]
            .filter(Boolean)
            .join(" "),
        );

        return words.every((w) => haystack.includes(w));
      }),
    );
  }, [query, categories]);

  function handleAdd(item) {
    cart.add({
      id: item.id,
      name: item.nameEn || item.name,
      nameAr: item.name,
      nameEn: item.nameEn,
      price: Number(item.price),
      imageUrl: item.imageUrl,
    });
  }

  function getQuantity(itemId) {
    const line = cart.lines.find((l) => l.menuItemId === itemId);

    return line?.quantity ?? 0;
  }

  function decreaseQuantity(item) {
    const quantity = getQuantity(item.id);

    if (quantity > 0) {
      cart.setQuantity(item.id, quantity - 1);
    }
  }

  const findTargetCategory = (target) => {
    return allCategories.find((item) => {
      if (item.id === target) return true;

      return getCategoryKey(item) === target;
    });
  };

  const scrollToCategory = (target) => {
    const category = findTargetCategory(target);

    if (!category) return;

    const y = categoryPositions.current[category.id];

    if (typeof y !== "number") return;

    scrollRef.current?.scrollTo({
      y: Math.max(y - 10, 0),
      animated: true,
    });

    setFlash((f) => ({ id: category.id, count: f.count + 1 }));
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>

        <View style={styles.loadingIcon}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={34}
            color={ORANGE}
          />
        </View>

        <ActivityIndicator size="small" color={ORANGE} />

        <Text style={styles.loadingText}>{t("loadingMenu")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: gutter,
            paddingBottom: BOTTOM_NAV_SPACE,
          },
        ]}
      >
        {/* ================= TEAL TOP ================= */}

        <View style={[styles.topArea, { marginHorizontal: -gutter }]}>
          <Animated.Image
            entering={enterDown(0)}
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* ================= QUICK NAV ================= */}

          <QuickCategoryPills
            gutter={gutter}
            onPress={(item) => {
              if (!hasQuery) {
                scrollToCategory(item.target);
                return;
              }

              // Leave search first, then scroll once the cards are laid out again
              setQuery("");
              setTimeout(() => scrollToCategory(item.target), 120);
            }}
          />

          {/* ================= SEARCH ================= */}

          {/* search + the cart on its right, with how many items it holds */}
          <Animated.View
            entering={enterDown(3)}
            style={[styles.searchRow, { marginHorizontal: gutter }]}
          >
          <View style={[styles.searchBox, dir.row]}>
            <Ionicons name="search" size={20} color={ORANGE} />

            {/* The hint is drawn as plain text over the field: Android measures a
                placeholder in its own font and then cuts off the wider Arabic face */}
            <View style={styles.searchField}>
              {!query && (
                <Text
                  pointerEvents="none"
                  numberOfLines={1}
                  style={[styles.searchHint, dir.text]}
                >
                  {t("searchPlaceholder")}
                </Text>
              )}
              <TextInput
                style={[styles.searchInput, dir.text]}
                accessibilityLabel={t("searchPlaceholder")}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
            </View>

            {!!query && (
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <Ionicons name="close-circle" size={21} color="#C8C8C8" />
              </Pressable>
            )}
          </View>

            <Pressable
              onPress={() => router.push("/cart")}
              accessibilityRole="button"
              accessibilityLabel={t("cartTitle")}
              style={({ pressed }) => [styles.cartBox, pressed && styles.cartBoxPressed]}
            >
              {/* same bag as the cart on the home page */}
              <Ionicons name="bag" size={26} color={ORANGE} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* Teal melts into the white page */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            HERO_TEAL,
            "rgba(0,87,81,0.78)",
            "rgba(0,87,81,0.5)",
            "rgba(0,87,81,0.25)",
            "rgba(0,87,81,0.08)",
            "rgba(0,87,81,0)",
          ]}
          locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          style={[styles.topFade, { marginHorizontal: -gutter }]}
        />

        {/* ================= CATEGORIES ================= */}

        {/* Zig-zag: even rows = orange panel left + photo right,
            odd rows = photo left + teal panel right */}
        {hasQuery ? (
          /* ================= SEARCH RESULTS ================= */
          results.length === 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={30} color={TEAL} />

              <Text style={styles.noResultsTitle}>{t("searchNothing")}</Text>

              <Text style={styles.noResultsText}>
                {t("searchNoMatch", { query: query.trim() })}
              </Text>
            </View>
          ) : (
            <View style={[styles.resultsGrid, dir.row]}>
              {results.map((item, index) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  width={cardWidth}
                  quantity={getQuantity(item.id)}
                  onAdd={() => handleAdd(item)}
                  onDecrease={() => decreaseQuantity(item)}
                  index={index}
                />
              ))}
            </View>
          )
        ) : (
        <View style={styles.list}>
          {allCategories.map((item, index) => {
            const categoryName = pick(item) || t("menuCategory");

            const isEven = index % 2 === 0;
            const panelFirst = isEven;
            const cardColor = isEven ? SOFT_ORANGE : SOFT_TEAL;

            // Zig-zag entrance: each card slides in from the side its colour panel is on.
            return (
              <Animated.View
                key={item.id}
                entering={panelFirst ? enterFromLeft(index + 2) : enterFromRight(index + 2)}
                onLayout={(event) => {
                  categoryPositions.current[item.id] =
                    event.nativeEvent.layout.y;
                }}
              >
                <FlashCard
                  signal={flash.id === item.id ? flash.count : 0}
                  color={isEven ? ORANGE : TEAL}
                >
                <Pressable
                  onPress={() => router.push(item.route)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    { flexDirection: panelFirst ? "row" : "row-reverse" },
                    pressed && styles.pressed,
                  ]}
                >
                  {/* COLOR PANEL */}

                  <View
                    style={[
                      styles.categoryPanel,
                      { backgroundColor: cardColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryName,
                        dir.noSpacing,
                        { fontSize: isSmall ? 18 : 21 },
                      ]}
                      numberOfLines={2}
                    >
                      {categoryName}
                    </Text>
                  </View>

                  {/* IMAGE */}

                  <View style={styles.imageWrapper}>
                    <Image
                      source={
                        isUsableImagePath(item.imageUrl)
                          ? {
                              uri: imageUrl(item.imageUrl),
                            }
                          : item.image || FALLBACK_IMAGE
                      }
                      cachePolicy="memory-disk"
                      transition={120}
                      style={styles.image}
                    />
                  </View>
                </Pressable>
                </FlashCard>
              </Animated.View>
            );
          })}
        </View>
        )}

        <MadeBy />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  content: {
    position: "relative",
  },

  /* ================= LOADING ================= */

  loadingScreen: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  /* ================= TEAL TOP ================= */

  topArea: {
    backgroundColor: HERO_TEAL,
    paddingTop: 60,
    paddingBottom: 18,
    overflow: "hidden",
    zIndex: 2,
  },

  logo: {
    alignSelf: "center",
    width: 200,
    height: 94,
    marginBottom: 24,
  },

  // Overlap by 1px so no white hairline shows between teal and fade
  topFade: {
    height: 90,
    marginTop: -1,
    marginBottom: -30,
  },

  quickPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },

  /* ================= SEARCH ================= */

  searchRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchBox: {
    flex: 1,
    height: 52,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },

  cartBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  cartBoxPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },

  cartBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  cartBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },

  searchField: {
    flex: 1,
    // web inputs keep a default width; without this it overflows the shorter box
    minWidth: 0,
    height: "100%",
    justifyContent: "center",
  },

  searchHint: {
    position: "absolute",
    left: 0,
    right: 0,
    color: "#A4A4A4",
    fontSize: 14,
    fontWeight: "600",
  },

  searchInput: {
    width: "100%",
    height: "100%",
    paddingVertical: 0,
    color: "#17201F",
    fontSize: 14,
    fontWeight: "600",
  },

  resultsGrid: {
    zIndex: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  noResults: {
    zIndex: 2,
    alignItems: "center",
    paddingVertical: 30,
  },

  noResultsTitle: {
    color: "#17201F",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 4,
  },

  noResultsText: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: "500",
  },

  /* ================= LIST ================= */

  list: {
    zIndex: 2,
    gap: 15,
  },

  /* ================= CARD ================= */

  flashGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 27,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  categoryCard: {
    height: 130,
    borderRadius: 27,
    backgroundColor: WHITE,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },

  categoryPanel: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryName: {
    color: WHITE,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  imageWrapper: {
    flex: 1.15,
    height: "100%",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  /* ================= FOOTER ================= */

  footer: {
    zIndex: 2,
    marginTop: 24,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DEDFDD",
  },

  footerText: {
    color: "#9A9F9D",
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },
});
