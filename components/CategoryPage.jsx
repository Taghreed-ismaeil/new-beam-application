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
import { Text } from "@/lib/arabic-font";
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
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// How far above a section to stop when a chip scrolls to it, so its band
// isn't hidden under the floating back button.
const SECTION_SCROLL_OFFSET = 160;

// The pinned section bar: the back / language buttons' row on top (they float
// over it), then a full-width row of section tabs.
const PINNED_BAR_HEIGHT = 150;
const PINNED_TABS_HEIGHT = 50;


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
  const { t, pick, dir } = useAppLang();

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
  // section tabs: which one is underlined, and where each tab sits in its row
  const [currentSection, setCurrentSection] = useState(null);
  const tabsRef = useRef(null);
  const pinnedTabsRef = useRef(null);
  const tabX = useRef({});
  // where the header's tab row ends, and whether it has scrolled under the pinned bar
  const tabsBottom = useRef(0);
  const [pinned, setPinned] = useState(false);

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

  const sections = offersOnly ? null : getMenuSections(category);
  const shownSection = currentSection ?? sections?.[0]?.key ?? null;
  const itemCount = sections
    ? sections.reduce((n, s) => n + s.items.length, 0)
    : items.length;
  // the section underline stands out from either header colour
  const lineColor = isOrange ? WHITE : ORANGE;

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

  // Underline the section you've scrolled to, and bring its tab into view.
  function onPageScroll(e) {
    if (!sections || sections.length < 2) return;
    const top = e.nativeEvent.contentOffset.y;
    const shouldPin = top > tabsBottom.current - PINNED_BAR_HEIGHT;
    if (shouldPin !== pinned) setPinned(shouldPin);
    const y = top + SECTION_SCROLL_OFFSET + 20;
    let key = sections[0].key;
    for (const s of sections) {
      if ((sectionY.current[s.key] ?? Infinity) <= y) key = s.key;
    }
    if (key === shownSection) return;
    setCurrentSection(key);
    const x = Math.max((tabX.current[key] ?? 0) - PAGE_GUTTER, 0);
    tabsRef.current?.scrollTo({ x, animated: true });
    pinnedTabsRef.current?.scrollTo({ x, animated: true });
  }

  function scrollToSection(key) {
    const y = sectionY.current[key];
    if (y == null) return;
    scrollRef.current?.scrollTo({
      y: Math.max(y - SECTION_SCROLL_OFFSET, 0),
      animated: true,
    });
  }

  // The section tabs, drawn in the header and again in the bar that stays
  // pinned at the top once the header has scrolled away.
  const renderTabs = (ref) => (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={[styles.tabs, dir.row]}
    >
      {sections.map((s) => {
        const on = s.key === shownSection;
        return (
          <Pressable
            key={s.key}
            onPress={() => {
              setCurrentSection(s.key);
              scrollToSection(s.key);
            }}
            onLayout={(e) => {
              tabX.current[s.key] = e.nativeEvent.layout.x;
            }}
            style={styles.tabHit}
          >
            <Text style={[styles.tabText, on && styles.tabTextOn]}>
              {pick(s)}
            </Text>
            <View
              style={[styles.tabLine, on && { backgroundColor: lineColor }]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );

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
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={onPageScroll}
        scrollEventThrottle={64}
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
              bubbles
              gutter={PAGE_GUTTER}
              activeTarget={activeTarget}
              onPress={openCategory}
            />
          </View>

          {/* the category's name, and how many dishes are in it */}
          <Animated.View entering={enterDown(0)} style={styles.titleBlock}>
            <Text
              style={[styles.topTitle, { fontSize: isSmall ? 30 : 34 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {pageTitle}
            </Text>
            {itemCount > 0 && (
              <Text style={styles.topCount}>
                {t("categoryItemsCount", { count: itemCount })}
              </Text>
            )}
          </Animated.View>

          {/* Section tabs — tap one to jump to its band; the orange line follows
              whichever section you've scrolled to */}
          {sections && sections.length > 1 && (
            <Animated.View
              entering={enterDown(1)}
              style={styles.tabsWrap}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                tabsBottom.current = y + height;
              }}
            >
              {renderTabs(tabsRef)}
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
                  numberOfLines={2}
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

      {/* Section tabs pinned at the top once the header scrolls away, so you
          can jump to another section without scrolling back up */}
      {pinned && sections && sections.length > 1 && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.pinnedBar, { backgroundColor: headerColor }]}
        >
          <View style={styles.pinnedTabs}>{renderTabs(pinnedTabsRef)}</View>
        </Animated.View>
      )}

      <BackButton />
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
    paddingBottom: 6,
    zIndex: 2,
  },

  pillsWrap: {
    marginBottom: 12,
  },

  titleBlock: {
    alignItems: "center",
    paddingHorizontal: PAGE_GUTTER + 4,
  },

  topTitle: {
    color: WHITE,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  topCount: {
    marginTop: 1,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "700",
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

  pinnedBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: PINNED_BAR_HEIGHT,
    justifyContent: "flex-end",
    zIndex: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  pinnedTabs: {
    height: PINNED_TABS_HEIGHT,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },

  tabsWrap: {
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.22)",
  },

  // keeps its own height instead of stretching to fill the pinned bar
  tabsScroll: {
    flexGrow: 0,
  },

  tabs: {
    flexDirection: "row",
    gap: 22,
    paddingHorizontal: PAGE_GUTTER + 4,
  },

  tabHit: {
    paddingTop: 4,
    // web: no black focus ring after a tap
    outlineStyle: "none",
  },

  tabText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 16.5,
    fontWeight: "700",
    paddingBottom: 9,
  },

  tabTextOn: {
    color: WHITE,
    fontWeight: "900",
  },

  // sits on the row's bottom border; coloured only under the current section
  tabLine: {
    height: 3.5,
    borderRadius: 2,
    marginBottom: -1,
    backgroundColor: "transparent",
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

  // long names ("Chicken Shawarma Sandwiches") wrap onto a second line instead of "…"
  sectionTitle: {
    color: DARK,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.2,
    textAlign: "center",
    paddingHorizontal: PAGE_GUTTER,
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
