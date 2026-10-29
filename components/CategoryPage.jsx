import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import BackButton from "@/components/BackButton";
import FoodCard from "@/components/FoodCard";
import MadeBy from "@/components/MadeBy";
import QuickCategoryPills from "@/components/QuickCategoryPills";
import { useCart } from "@/context/CartContext";
import { apiRequestCached, refreshCached } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { AnimatedText, Text } from "@/lib/arabic-font";
import { itemPhoto } from "@/lib/category-images";
import { findMenuCategory } from "@/lib/menu-category";
import { allMenuItems, getMenuSections } from "@/lib/menu-sections";
import {
  discountLabel,
  discountedPrice,
  itemsOnOffer,
  refreshOffers,
  useOffers,
} from "@/lib/offers";
import { enterDown } from "@/lib/motion";
import Animated from "react-native-reanimated";

// How far above a section to stop when a chip scrolls to it, so its band
// isn't hidden under the floating back button.
const SECTION_SCROLL_OFFSET = 70;

// More section keys than this turn into a sideways-scrolling row.
const CHIPS_CENTERED_MAX = 3;

/* =========================================================
   BEAM COLORS
========================================================= */

const ORANGE = "#FC4A14";

// Same softened colors as the category cards on the menu page
const SOFT_ORANGE = "#FC6E43";
const SOFT_TEAL = "#337974";

const FADE_ORANGE = "252,110,67";
const FADE_TEAL = "51,121,116";

const CREAM = "#FFF9F4";
const WHITE = "#FFFFFF";

const DARK = "#17201F";
const MUTED = "#68706E";

const LIGHT_ORANGE = "#FFF0EA";

const BORDER = "#EEEAE5";

const PAGE_GUTTER = 16;
const GRID_GAP = 12;

/* =========================================================
   CATEGORY PAGE
   Shared by every app/menu-food/* page. Pass either a
   categoryKey (matched by name) or a categoryId — or
   offersOnly, for the Offers page: every item a live offer
   covers, with its category's photo and the discounted price.
   The header color follows the category's position in the
   menu, so it always matches the card the user tapped
   (menu: even = orange, odd = teal).
========================================================= */

/**
 * @param {{
 *   categoryKey?: import("@/lib/menu-category").MenuCategoryKey,
 *   categoryId?: string | string[],
 *   title?: string,
 *   emoji?: string,
 *   offersOnly?: boolean,
 * }} props
 */
export default function CategoryPage({
  categoryKey,
  categoryId,
  title,
  emoji = "🍽️",
  offersOnly = false,
}) {
  const { width } = useWindowDimensions();

  const cart = useCart();
  const { t, pick, dir, lang } = useAppLang();

  const [category, setCategory] = useState(null);
  // the extras category has no page file of its own — its pill opens it by id
  const [extrasId, setExtrasId] = useState(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  // Offers page: the whole menu, to find the items the live offers cover
  const [allCategories, setAllCategories] = useState([]);
  const offers = useOffers();

  const scrollRef = useRef(null);
  const sectionY = useRef({});

  const isSmall = width < 360;

  // Two cards per row
  const cardWidth = (width - PAGE_GUTTER * 2 - GRID_GAP) / 2;

  /* =========================================================
     FETCH MENU
  ========================================================= */

  const applyMenu = useCallback(
    (data) => {
      const categories = data.categories ?? [];

      if (offersOnly) {
        setAllCategories(categories);
        setExtrasId(findMenuCategory(categories, "extras")?.id ?? null);
        setLoading(false);
        return;
      }

      const foundCategory = categoryKey
        ? findMenuCategory(categories, categoryKey)
        : categories.find((c) => String(c.id) === String(categoryId));

      setCategory(foundCategory ?? null);
      setExtrasId(findMenuCategory(categories, "extras")?.id ?? null);
      setMenuIndex(Math.max(categories.indexOf(foundCategory), 0));
      setLoading(false);
    },
    [categoryKey, categoryId, offersOnly],
  );

  // Cached first (warmed during the intro), so the page paints instantly; the
  // network refresh then updates it in place. Runs on every visit, so admin
  // menu changes show up without restarting the app.
  useFocusEffect(
    useCallback(() => {
      if (offersOnly) refreshOffers();
      let painted = false;
      apiRequestCached(
        "/api/menu",
        (data) => {
          painted = true;
          applyMenu(data);
        },
        () => {
          if (!painted) setCategory(null);
          setLoading(false);
        },
      );
    }, [applyMenu, offersOnly]),
  );

  // Pull down to refresh
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    try {
      if (offersOnly) refreshOffers();
      applyMenu(await refreshCached("/api/menu"));
    } catch {
      // keep what's on screen
    } finally {
      setRefreshing(false);
    }
  }

  /* =========================================================
     CART
  ========================================================= */

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

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <BackButton />

        <View style={styles.loadingCard}>
          <View style={styles.loadingIcon}>
            <Text style={styles.loadingEmoji}>{emoji}</Text>
          </View>

          <ActivityIndicator size="small" color={ORANGE} />

          <Text style={styles.loadingText}>{t("loadingMenu")}</Text>
        </View>
      </View>
    );
  }

  // Offers page: one flat grid of the items on offer, each knowing its deal
  const onOffer = offersOnly
    ? itemsOnOffer(offers, allMenuItems(allCategories))
    : [];
  const dealFor = new Map(onOffer.map(({ item, offer }) => [item.id, offer]));
  const categoriesById = new Map(allCategories.map((c) => [c.id, c]));

  const items = offersOnly
    ? onOffer.map(({ item }) => item)
    : (category?.items ?? []);

  const pageTitle = offersOnly
    ? t("offersPageTitle")
    : pick(category) || title || t("tabMenu");

  const isOrange = menuIndex % 2 === 0;
  const headerColor = isOrange ? SOFT_ORANGE : SOFT_TEAL;
  const fade = isOrange ? FADE_ORANGE : FADE_TEAL;
  // Side of the 3D section keys — a deeper shade of the header color.
  const chipDepth = isOrange ? "#C8481F" : "#1F5753";

  const sections = offersOnly ? null : getMenuSections(category);

  // The menu's category pills stay on top of every category page: the one
  // you're on is filled in, the others switch straight to their page.
  const activeTarget =
    categoryKey ??
    (category && extrasId != null && String(category.id) === String(extrasId)
      ? "extras"
      : null);

  function openCategory(pill) {
    if (pill.target === activeTarget) return;
    const route =
      pill.target === "extras"
        ? extrasId != null
          ? `/menu-food/${extrasId}`
          : null
        : `/menu-food/${pill.target}`;
    if (route) router.replace(route);
  }

  function scrollToSection(key) {
    const y = sectionY.current[key];
    if (y == null) return;
    scrollRef.current?.scrollTo({
      y: Math.max(y - SECTION_SCROLL_OFFSET, 0),
      animated: true,
    });
  }

  const renderGrid = (list) => (
    <View style={[styles.grid, dir.row]}>
      {list.map((item, index) => (
        <FoodCard
          key={item.id}
          item={item}
          width={cardWidth}
          quantity={getQuantity(item.id)}
          onAdd={() => handleAdd(item)}
          onDecrease={() => decreaseQuantity(item)}
          {...(offersOnly && {
            photo: itemPhoto(item, categoriesById.get(item.categoryId)),
            deal: dealFor.has(item.id)
              ? {
                  label: discountLabel(dealFor.get(item.id), t("jd")),
                  // same rule as everywhere: only a discount the checkout applies
                  offerPrice: dealFor.get(item.id).appliesAtCheckout
                    ? discountedPrice(Number(item.price), dealFor.get(item.id))
                    : null,
                }
              : null,
          })}
          onOpen={() =>
            router.push({
              pathname: "/item/[id]",
              params: {
                id: String(item.id),
                tone: isOrange ? "orange" : "teal",
                // Color of this card's own ADD button (FoodCard alternates by index)
                button: index % 2 === 0 ? "orange" : "teal",
              },
            })
          }
          index={index}
        />
      ))}
    </View>
  );

  /* =========================================================
     SCREEN
  ========================================================= */

  return (
    <View style={styles.screen}>
      <BackButton />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={headerColor}
            colors={[headerColor]}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* =====================================================
            COLORED TOP
        ===================================================== */}

        <View style={[styles.topArea, { backgroundColor: headerColor }]}>
          <View style={styles.pillsWrap}>
            <QuickCategoryPills
              gutter={PAGE_GUTTER}
              activeTarget={activeTarget}
              onPress={openCategory}
            />
          </View>

          <AnimatedText
            entering={enterDown(0)}
            style={[
              styles.topBrand,
              dir.noSpacing,
              lang === "ar" && styles.topBrandAr,
            ]}
          >
            {t("brandUpper")}
          </AnimatedText>

          <AnimatedText
            entering={enterDown(1)}
            style={[
              styles.topTitle,
              {
                fontSize: isSmall ? 34 : 40,
              },
            ]}
          >
            {pageTitle}
          </AnimatedText>

          {/* Section shortcuts — tap one to jump down to its band */}
          {sections && sections.length > 1 && (
            <Animated.View entering={enterDown(2)} style={styles.chipsWrap}>
              {/* Up to 3 keys sit centered; more than that become one row you
                swipe sideways, instead of piling up into several lines. */}
              <ScrollView
                horizontal
                scrollEnabled={sections.length > CHIPS_CENTERED_MAX}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.chips,
                  dir.row,
                  sections.length > CHIPS_CENTERED_MAX && styles.chipsScroll,
                ]}
              >
                {sections.map((s) => (
                  // 3D key: a darker base shows under the white face like the side
                  // of a button; pressing pushes the face down onto it.
                  <Pressable
                    key={s.key}
                    onPress={() => scrollToSection(s.key)}
                    style={styles.chipHit}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.chipBase,
                          { backgroundColor: chipDepth },
                        ]}
                      >
                        <LinearGradient
                          colors={[WHITE, "#FFF4EE"]}
                          style={[
                            styles.chipFace,
                            pressed && styles.chipFacePressed,
                          ]}
                        >
                          <View style={styles.chipShine} pointerEvents="none" />
                          <Text
                            style={[styles.chipText, { color: headerColor }]}
                            numberOfLines={1}
                          >
                            {pick(s)}
                          </Text>
                        </LinearGradient>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </View>

        {/* Header color melts into the cream page */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            headerColor,
            `rgba(${fade},0.78)`,
            `rgba(${fade},0.5)`,
            `rgba(${fade},0.25)`,
            `rgba(${fade},0.08)`,
            `rgba(${fade},0)`,
          ]}
          locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          style={styles.topFade}
        />

        {/* =====================================================
            MENU GRID
        ===================================================== */}

        {sections ? (
          sections.map((s, i) => (
            <View
              key={s.key}
              onLayout={(e) => {
                sectionY.current[s.key] = e.nativeEvent.layout.y;
              }}
              style={[styles.sectionBlock, i === 0 && styles.firstSectionBlock]}
            >
              {/* Each section is its own block: a tinted backdrop with rounded
                  top corners that fades out down the grid, and a title with
                  an accent line under it. */}
              <LinearGradient
                pointerEvents="none"
                colors={[
                  `rgba(${fade},0.17)`,
                  `rgba(${fade},0.06)`,
                  `rgba(${fade},0)`,
                ]}
                locations={[0, 0.35, 1]}
                style={styles.sectionBackdrop}
              />
              <View style={styles.sectionHead}>
                <Text
                  style={[styles.sectionTitle, dir.noSpacing]}
                  numberOfLines={1}
                >
                  {pick(s)}
                </Text>
                <View
                  style={[
                    styles.sectionAccent,
                    { backgroundColor: headerColor },
                  ]}
                />
              </View>

              <View style={styles.section}>
                {s.items.length ? (
                  renderGrid(s.items)
                ) : (
                  <View
                    style={[
                      styles.soonCard,
                      { borderColor: `rgba(${fade},0.45)` },
                    ]}
                  >
                    <Text style={[styles.soonText, { color: headerColor }]}>
                      {t("sectionComingSoon")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.section}>
            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyEmoji}>{emoji}</Text>
                </View>

                <Text style={styles.emptyTitle}>
                  {t(offersOnly ? "offersEmptyTitle" : "categoryEmpty")}
                </Text>

                <Text style={styles.emptyText}>
                  {t(offersOnly ? "offersEmptyText" : "categoryEmptyText")}
                </Text>
              </View>
            ) : (
              renderGrid(items)
            )}
          </View>
        )}

        <MadeBy />
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =========================================================
     SCREEN
  ========================================================= */

  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  content: {
    flexGrow: 1,
    paddingBottom: 110,
  },

  /* =========================================================
     LOADING
  ========================================================= */

  loadingScreen: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
  },

  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  loadingEmoji: {
    fontSize: 32,
  },

  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* =========================================================
     COLORED TOP
  ========================================================= */

  topArea: {
    // clears the status bar + back button
    paddingTop: 100,
    paddingBottom: 10,
    alignItems: "center",
    zIndex: 2,
  },

  pillsWrap: {
    alignSelf: "stretch",
    marginBottom: 16,
  },

  topBrand: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 5,
    marginBottom: 2,
  },

  // "بيم" has no letter-spacing to spread it out like BEAM, so at 13 it reads tiny
  topBrandAr: {
    fontSize: 22,
    lineHeight: 30,
  },

  topTitle: {
    color: WHITE,
    fontWeight: "900",
    letterSpacing: -1,
  },

  // Overlap by 1px so no hairline shows between header and fade
  topFade: {
    height: 80,
    marginTop: -1,
    marginBottom: -40,
  },

  /* =========================================================
     SECTION CHIPS + BANDS
  ========================================================= */

  chipsWrap: {
    alignSelf: "stretch",
    marginTop: 12,
  },

  // Room above/below so the ScrollView doesn't clip the keys' shadows.
  chips: {
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingTop: 6,
    paddingBottom: 16,
    paddingHorizontal: PAGE_GUTTER,
  },

  chipsScroll: {
    justifyContent: "flex-start",
  },

  chipHit: {
    // web: no black focus ring after a tap
    outlineStyle: "none",
  },

  chipBase: {
    borderRadius: 18,
    paddingBottom: 5,
    shadowColor: "#5A1E08",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },

  chipFace: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    overflow: "hidden",
  },

  chipFacePressed: {
    transform: [{ translateY: 4 }],
  },

  // Glossy light catching the top edge of the key.
  chipShine: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  chipText: {
    fontSize: 16,
    fontWeight: "900",
  },

  // The header fade overlaps the content by 40px; the first title sits just
  // below where it ends.
  firstSectionBlock: {
    marginTop: 8,
  },

  sectionBlock: {
    marginTop: 18,
    paddingBottom: 8,
  },

  sectionBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },

  sectionHead: {
    alignItems: "center",
    paddingTop: 26,
    paddingBottom: 22,
  },

  sectionTitle: {
    color: DARK,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.2,
    textAlign: "center",
  },

  sectionAccent: {
    width: 34,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },

  soonCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 22,
    paddingVertical: 26,
    alignItems: "center",
    backgroundColor: WHITE,
  },

  soonText: {
    fontSize: 17,
    fontWeight: "900",
  },

  /* =========================================================
     GRID
  ========================================================= */

  section: {
    marginHorizontal: PAGE_GUTTER,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: GRID_GAP,
  },

  /* =========================================================
     EMPTY
  ========================================================= */

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 25,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#17201F",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyEmoji: {
    fontSize: 29,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },

  emptyText: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
  },

  /* =========================================================
     FOOTER
  ========================================================= */

  footer: {
    marginTop: 22,
    paddingHorizontal: 21,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E3DED8",
  },

  footerCenter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  footerText: {
    color: "#9A9F9D",
    fontSize: 6.5,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  footerDot: {
    color: ORANGE,
    fontSize: 8,
    marginHorizontal: 5,
  },
});
