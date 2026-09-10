import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import BackButton from "@/components/BackButton";
import { apiRequestCached, imageUrl } from "@/lib/api-client";

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const DARK = "#17201F";
const MUTED = "#68706E";

const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";

const WHITE = "#FFFFFF";

const BOTTOM_NAV_SPACE = 110;

const FIXED_CATEGORIES = [
  {
    id: "Breakfast",
    name: "Breakfast",
    image: require("../assets/img/salat_menu.jpg"),
    route: "/menu-food/breakfast",
    color: TEAL,
    light: LIGHT_TEAL,
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    image: require("../assets/img/menu-4.jpg"),
    route: "/menu-food/sandwiches",
    color: ORANGE,
    light: LIGHT_ORANGE,
  },

  {
    id: "burger",
    name: "Burger",
    image: require("../assets/img/menu-5.jpg"),
    route: "/menu-food/burger",
    color: TEAL,
    light: LIGHT_TEAL,
  },
  {
    id: "shawerma",
    name: "Shawerma",
    image: require("../assets/img/menu-1.jpg"),
    route: "/menu-food/shawerma",
    color: ORANGE,
    light: LIGHT_ORANGE,
  },
  {
    id: "FATTEH",
    name: "FATTEH",
    image: require("../assets/img/menu-1.jpg"),
    route: "/menu-food/fattah",
    color: TEAL,
    light: LIGHT_TEAL,
  },

  {
    id: "salad",
    name: "Salad",
    image: require("../assets/img/salat_menu.jpg"),
    route: "/menu-food/salad",
    color: ORANGE,
    light: LIGHT_ORANGE,
  },
  {
    id: "drinks",
    name: "Drinks",
    image: require("../assets/img/drinks_kinza.jpg"),
    route: "/menu-food/drinks",
    color: TEAL,
    light: LIGHT_TEAL,
  },
];

const QUICK_CATEGORIES = [
  {
    id: "breakfast",
    name: "Breakfast",
    target: "breakfast",
  },

  {
    id: "burger",
    name: "Burger",
    target: "burger",
  },
  {
    id: "shawerma",
    name: "Shawerma",
    target: "shawerma",
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    target: "sandwiches",
  },
  {
    id: "drinks",
    name: "Drinks",
    target: "drinks",
  },
  {
    id: "salad",
    name: "Salad",
    target: "salad",
  },
  {
    id: "fattah",
    name: "Fatteh",
    target: "fattah",
  },
];

const COVERED_REAL_IDS = [1, 2];

const getCategoryKey = (item) => {
  const name = `${item?.nameEn || ""} ${item?.name || ""}`.trim().toLowerCase();
  if (name.includes("breakfast")) {
    return "breakfast";
  }

  if (name.includes("burger")) return "burger";

  if (name.includes("shawerma") || name.includes("shawarma")) {
    return "shawerma";
  }

  if (name.includes("sandwich")) {
    return "sandwiches";
  }

  if (
    name.includes("drink") ||
    name.includes("beverage") ||
    name.includes("juice") ||
    name.includes("drinks")
  ) {
    return "drinks";
  }

  if (name.includes("salad")) {
    return "salad";
  }

  if (name.includes("fatteh")) {
    return "fattah";
  }

  return null;
};

export default function Menu() {
  const { width } = useWindowDimensions();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);

  const categoryPositions = useRef({});

  const isSmall = width < 360;

  useEffect(() => {
    apiRequestCached("/api/menu", (data) => {
      setCategories(
        (data.categories ?? []).filter((c) => !COVERED_REAL_IDS.includes(c.id)),
      );

      setLoading(false);
    });
  }, []);

  const realCategories = categories
    .filter((item) => getCategoryKey(item) !== "drinks")
    .map((item, index) => ({
      ...item,
      route: `/menu-food/${item.id}`,
      color: index % 2 === 0 ? TEAL : ORANGE,
      light: index % 2 === 0 ? LIGHT_TEAL : LIGHT_ORANGE,
    }));

  const allCategories = [...FIXED_CATEGORIES, ...realCategories];

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
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <BackButton />

        <View style={styles.loadingIcon}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={34}
            color={ORANGE}
          />
        </View>

        <ActivityIndicator size="small" color={ORANGE} />

        <Text style={styles.loadingText}>Preparing the menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BackButton />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isSmall ? 18 : 22,
            paddingBottom: BOTTOM_NAV_SPACE,
          },
        ]}
      >
        {/* ================= DECORATIONS ================= */}

        <View
          pointerEvents="none"
          style={[
            styles.decorFork,
            {
              right: 5,
              top: 100,
              transform: [{ rotate: "-18deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="silverware-fork"
            size={125}
            color={TEAL}
          />
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.decorSpoon,
            {
              left: -18,
              top: 300,
              transform: [{ rotate: "17deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="silverware-spoon"
            size={100}
            color={LIGHT_ORANGE}
          />
        </View>

        {/* ================= HEADER ================= */}

        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="restaurant-outline" size={14} color={ORANGE} />

            <Text style={styles.badgeText}>OUR MENU</Text>
          </View>

          <Text
            style={[
              styles.title,
              {
                fontSize: isSmall ? 34 : 41,
              },
            ]}
          >
            What are
            {"\n"}
            you craving?
          </Text>
        </View>
        {/* ================= QUICK NAV ================= */}

        <View style={styles.categoryMeta}>
          <Text style={styles.metaTitle}>Explore BEAM menu</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScroll}
          contentContainerStyle={styles.quickCategories}
        >
          {QUICK_CATEGORIES.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => scrollToCategory(item.target)}
              style={({ pressed }) => [
                styles.quickPill,
                {
                  borderColor: index % 2 === 0 ? ORANGE : TEAL,
                },
                pressed && styles.quickPressed,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: index % 2 === 0 ? ORANGE : TEAL,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radioInner,
                    {
                      backgroundColor: index % 2 === 0 ? ORANGE : TEAL,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.quickText,
                  {
                    color: index % 2 === 0 ? ORANGE : TEAL,
                  },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ================= CATEGORIES ================= */}

        <View style={styles.list}>
          {allCategories.map((item, index) => {
            const categoryName = item.nameEn || item.name || "Category";

            const cardColor = item.color || (index % 2 === 0 ? ORANGE : TEAL);

            const cardLight =
              item.light || (index % 2 === 0 ? LIGHT_ORANGE : LIGHT_TEAL);

            return (
              <View
                key={item.id}
                onLayout={(event) => {
                  categoryPositions.current[item.id] =
                    event.nativeEvent.layout.y;
                }}
              >
                <Pressable
                  onPress={() => router.push(item.route)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    pressed && styles.pressed,
                  ]}
                >
                  {/* IMAGE */}

                  <View style={styles.imageWrapper}>
                    <Image
                      source={
                        item.imageUrl
                          ? {
                              uri: imageUrl(item.imageUrl),
                            }
                          : item.image || FALLBACK_IMAGE
                      }
                      style={styles.image}
                    />

                    <View
                      style={[
                        styles.imageOverlay,
                        {
                          backgroundColor: `${cardColor}22`,
                        },
                      ]}
                    />
                  </View>

                  {/* CONTENT */}

                  <View
                    style={[
                      styles.categoryContent,
                      {
                        backgroundColor: cardLight,
                      },
                    ]}
                  >
                    <View style={styles.categoryText}>
                      <Text
                        style={[
                          styles.categoryNumber,
                          {
                            color: cardColor,
                          },
                        ]}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </Text>

                      <Text
                        style={[
                          styles.categoryName,
                          {
                            fontSize: isSmall ? 18 : 20,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {categoryName}
                      </Text>

                      <Text style={styles.categoryHint}>Tap to explore</Text>
                    </View>

                    <View style={styles.arrowButton}>
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color={cardColor}
                      />
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ================= FOOTER ================= */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>PICK YOUR FAVORITE</Text>

          <View style={styles.footerLine} />
        </View>
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
    paddingTop: 70,
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

  /* ================= DECOR ================= */

  decorFork: {
    position: "absolute",
    opacity: 0.9,
    zIndex: 0,
  },

  decorSpoon: {
    position: "absolute",
    opacity: 0.8,
    zIndex: 0,
  },

  /* ================= HEADER ================= */

  header: {
    zIndex: 2,
    marginBottom: 27,
  },

  badge: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIGHT_ORANGE,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 15,
  },

  badgeText: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  title: {
    color: ORANGE,
    fontWeight: "900",
    letterSpacing: -1.7,
    lineHeight: 43,
  },

  /* ================= META ================= */

  categoryMeta: {
    zIndex: 2,
    marginBottom: 8,
  },

  metaTitle: {
    color: TEAL,
    fontSize: 18,
    fontWeight: "900",
  },

  /* ================= QUICK NAV ================= */

  quickScroll: {
    marginTop: 10,
    marginBottom: 27,
    marginHorizontal: -2,
  },

  quickCategories: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },

  quickPill: {
    minHeight: 43,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  quickText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
  },

  quickPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },
  /* ================= LIST ================= */

  list: {
    zIndex: 2,
    gap: 15,
  },

  /* ================= CARD ================= */

  categoryCard: {
    borderRadius: 27,
    backgroundColor: WHITE,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  imageWrapper: {
    height: 100,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  /* ================= CARD CONTENT ================= */

  categoryContent: {
    minHeight: 95,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  categoryText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  categoryNumber: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  categoryName: {
    color: DARK,
    fontWeight: "900",
    marginBottom: 3,
  },

  categoryHint: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
