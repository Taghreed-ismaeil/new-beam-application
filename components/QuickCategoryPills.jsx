import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { enterFromRight } from "@/lib/motion";

/* =========================================================
   QUICK CATEGORY PILLS
   Horizontal row of small category cards (outline icon above
   the name). Used on the menu (scrolls to the category), in
   menu search, and on top of every category page (opens the
   other categories; `activeTarget` marks the one you're on).
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";

export const QUICK_CATEGORIES = [
  {
    id: "breakfast",
    name: "catBreakfast",
    target: "breakfast",
    icon: "egg-fried",
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
    id: "shawerma",
    name: "catShawerma",
    target: "shawerma",
    icon: "food-drumstick-outline",
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
}) {
  const { t, dir } = useAppLang();
  const scrollRef = useRef(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.quickScroll}
      contentContainerStyle={[
        styles.quickCategories,
        dir.row,
        { paddingHorizontal: gutter },
      ]}
    >
      {QUICK_CATEGORIES.map((item, index) => {
        const color = index % 2 === 0 ? ORANGE : TEAL;
        const active = activeTarget === item.target;
        // the pill you're on is filled in its colour, with white icon and name
        const ink = active ? WHITE : color;

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

  quickPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.97 }],
  },
});
