import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { apiRequestCached } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { findMenuCategory } from "@/lib/menu-category";
import { enterFromRight } from "@/lib/motion";

/* =========================================================
   QUICK CATEGORY PILLS
   Horizontal row of small category cards (outline icon above
   the name). Used on the menu (scrolls to the category), in
   menu search, and on top of every category page (opens the
   other categories; `activeTarget` marks the one you're on).
   The pills follow the menu's own order (as set in the admin)
   and take turns orange / teal exactly like the menu cards, so
   each pill matches its card.
   `bubbles` (category pages): a small round icon with the name under
   it; the page you're on is filled in its colour with a white ring
   and a dot under its name, and the row scrolls to show it.
========================================================= */

// the menu cards' colours (app/menu.jsx): even = orange, odd = teal
const ORANGE = "#FC6E43";
const TEAL = "#337974";
const WHITE = "#FFFFFF";

// In today's menu order — used until the menu loads, then the menu's order wins.
export const QUICK_CATEGORIES = [
  {
    id: "breakfast",
    name: "catBreakfast",
    target: "breakfast",
    icon: "egg-fried",
  },
  {
    id: "shawerma",
    name: "catShawerma",
    target: "shawerma",
    icon: "food-drumstick-outline",
  },
  { id: "snaks", name: "catSnaks", target: "snaks", icon: "french-fries" },
  {
    id: "burger",
    name: "catBurger",
    target: "burger",
    icon: "fast-food-outline",
    ion: true,
  },
  {
    id: "fattah",
    name: "catFattah",
    target: "fattah",
    icon: "bowl-mix-outline",
  },
  {
    id: "salad",
    name: "catSalad",
    target: "salad",
    icon: "leaf-outline",
    ion: true,
  },
  {
    id: "extras",
    name: "catExtras",
    target: "extras",
    icon: "bottle-tonic-outline",
  },
  { id: "drinks", name: "catDrinks", target: "drinks", icon: "cup-outline" },
];

export default function QuickCategoryPills({
  onPress,
  gutter = 0,
  activeTarget = null,
  bubbles = false,
}) {
  const { t, dir } = useAppLang();
  const scrollRef = useRef(null);

  // re-sort by where each category sits on the menu; ones not on it go last
  const [pills, setPills] = useState(QUICK_CATEGORIES);
  useEffect(() => {
    apiRequestCached("/api/menu", (data) => {
      const categories = data.categories ?? [];
      const position = (pill) => {
        const at = categories.indexOf(findMenuCategory(categories, pill.target));
        return at < 0 ? 999 : at;
      };
      setPills([...QUICK_CATEGORIES].sort((a, b) => position(a) - position(b)));
    });
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.quickScroll}
      contentContainerStyle={[
        styles.quickCategories,
        bubbles && styles.bubbleRow,
        dir.row,
        { paddingHorizontal: gutter },
      ]}
    >
      {pills.map((item, index) => {
        const color = index % 2 === 0 ? ORANGE : TEAL;
        const active = activeTarget === item.target;
        // the pill you're on is filled in its colour, with white icon and name
        const ink = active ? WHITE : color;

        if (bubbles)
          return (
            <Animated.View
              key={item.id}
              entering={enterFromRight(index + 1)}
              onLayout={(e) => {
                // bring the page you're on into view
                if (active)
                  scrollRef.current?.scrollTo({
                    x: Math.max(e.nativeEvent.layout.x - gutter, 0),
                    animated: false,
                  });
              }}
            >
              <Pressable
                onPress={() => onPress(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.bubbleHit,
                  pressed && styles.quickPressed,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    { borderColor: color },
                    active && [styles.bubbleOn, { backgroundColor: color }],
                  ]}
                >
                  {item.ion ? (
                    <Ionicons name={item.icon} size={28} color={ink} />
                  ) : (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={28}
                      color={ink}
                    />
                  )}
                </View>
                <Text
                  style={[styles.bubbleText, active && styles.bubbleTextOn]}
                  numberOfLines={1}
                >
                  {t(item.name)}
                </Text>
                <View style={[styles.bubbleDot, active && styles.bubbleDotOn]} />
              </Pressable>
            </Animated.View>
          );

        return (
          <Animated.View key={item.id} entering={enterFromRight(index + 1)}>
            <Pressable
              onPress={() => onPress(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.quickPill,
                { borderColor: active ? WHITE : color },
                active && { backgroundColor: color },
                pressed && styles.quickPressed,
              ]}
            >
              {/* Outline icon, same color as the pill */}
              <View>
                {item.ion ? (
                  <Ionicons name={item.icon} size={36} color={ink} />
                ) : (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={36}
                    color={ink}
                  />
                )}
              </View>

              <Text style={[styles.quickText, { color: ink }]}>
                {t(item.name)}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  quickScroll: {
    flexGrow: 0,
  },

  quickCategories: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  quickPill: {
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  quickText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  bubbleRow: {
    alignItems: "flex-start",
    gap: 10,
  },

  // sized by its name, so the whole word always shows ("Breakfast", "Shawerma")
  bubbleHit: {
    minWidth: 68,
    paddingHorizontal: 2,
    alignItems: "center",
  },

  bubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  // the page you're on: filled in its colour, with a white ring
  bubbleOn: {
    borderWidth: 3,
    borderColor: WHITE,
  },

  bubbleText: {
    marginTop: 5,
    color: "rgba(255,255,255,0.82)",
    fontSize: 12.5,
    fontWeight: "700",
  },

  bubbleTextOn: {
    color: WHITE,
    fontWeight: "900",
  },

  bubbleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
  },

  bubbleDotOn: {
    backgroundColor: WHITE,
  },

  quickPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },
});
