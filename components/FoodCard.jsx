import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";

import { imageUrl, isUsableImagePath } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { enterUp } from "@/lib/motion";

/* =========================================================
   FOOD CARD
   Vertical card: image → name → description → price + add.
   Used two-per-row on the category pages and in search.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";

const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";

const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";

const BORDER = "#EEEAE5";

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

export default function FoodCard({
  item,
  width,
  quantity,
  onAdd,
  onDecrease,
  onOpen = undefined,
  index,
}) {
  const { t, pick, pickDesc, dir } = useAppLang();

  const itemName = pick(item) || t("menuItem");

  const itemDescription = pickDesc(item);

  const price = Number(item.price).toFixed(2);

  const accent = index % 2 === 0 ? ORANGE : TEAL;

  const soft = index % 2 === 0 ? LIGHT_ORANGE : LIGHT_TEAL;

  // Explicit pixel size (card width minus padding + border): with only width "100%" +
  // aspectRatio, the bundled fallback photo sized itself from its own 1536x1024 pixels and
  // blew the card up whenever an item had no image of its own.
  const imageSize = Math.max(width - 22, 0);

  return (
    <Animated.View entering={enterUp(index)} style={[styles.card, { width }]}>
      {/* Photo, name and description open the item's details (when onOpen is given) */}
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        style={({ pressed }) => [styles.openArea, pressed && styles.openPressed]}
      >
      {/* IMAGE */}

      <Image
        source={
          isUsableImagePath(item.imageUrl)
            ? {
                uri: imageUrl(item.imageUrl),
              }
            : FALLBACK_IMAGE
        }
        cachePolicy="memory-disk"
        transition={120}
        style={[styles.foodImage, { width: imageSize, height: imageSize }]}
      />

      {/* NAME */}

      <Text style={styles.foodName} numberOfLines={2}>
        {itemName}
      </Text>

      {/* DESCRIPTION */}

      <Text style={styles.itemDescription} numberOfLines={2}>
        {itemDescription || " "}
      </Text>
      </Pressable>

      {/* PRICE + ADD */}

      <View style={[styles.bottomRow, dir.row]}>
        <View style={[styles.priceRow, dir.row]}>
          <Text style={[styles.price, { color: accent }]}>{price}</Text>

          <Text style={[styles.currency, { color: accent }]}>{t("jd")}</Text>
        </View>

        {quantity === 0 ? (
          <Pressable
            onPress={onAdd}
            hitSlop={6}
            style={({ pressed }) => [
              styles.addButton,
              dir.row,
              { backgroundColor: accent },
              pressed && styles.addPressed,
            ]}
          >
            <Text style={[styles.addText, dir.noSpacing]}>{t("add")}</Text>

            <Text style={styles.addPlus}>+</Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.quantityControl,
              dir.row,
              {
                backgroundColor: soft,
                borderColor: accent,
              },
            ]}
          >
            <Pressable
              onPress={onDecrease}
              hitSlop={4}
              style={({ pressed }) => [
                styles.quantityButton,
                pressed && styles.addPressed,
              ]}
            >
              <Text style={[styles.quantityButtonText, { color: accent }]}>
                −
              </Text>
            </Pressable>

            <Text style={[styles.quantityText, { color: accent }]}>
              {quantity}
            </Text>

            <Pressable
              onPress={onAdd}
              hitSlop={4}
              style={({ pressed }) => [
                styles.quantityButton,
                { backgroundColor: accent },
                pressed && styles.addPressed,
              ]}
            >
              <Text style={styles.quantityPlusText}>+</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#17201F",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },

  // Keeps the card's centered layout inside the tappable area
  openArea: {
    alignSelf: "stretch",
    alignItems: "center",
    // web: no focus ring after a tap
    outlineStyle: "none",
  },

  openPressed: {
    opacity: 0.85,
  },

  foodImage: {
    borderRadius: 16,
    resizeMode: "cover",
    backgroundColor: "#F4F1ED",
    marginBottom: 9,
  },

  foodName: {
    color: DARK,
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 3,
  },

  itemDescription: {
    color: MUTED,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    textAlign: "center",
    // two lines always, so cards in a row stay the same height
    minHeight: 28,
    marginBottom: 9,
  },

  /* ================= PRICE + ADD ================= */

  bottomRow: {
    width: "100%",
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 1,
  },

  price: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  currency: {
    fontSize: 8.5,
    fontWeight: "900",
    marginHorizontal: 2,
  },

  addButton: {
    height: 32,
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: "#17201F",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  addText: {
    color: WHITE,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  addPlus: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },

  /* ================= QUANTITY ================= */

  quantityControl: {
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  quantityButton: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  quantityButtonText: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 20,
  },

  quantityText: {
    minWidth: 14,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
  },

  quantityPlusText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },

  addPressed: {
    opacity: 0.65,
    transform: [
      {
        scale: 0.96,
      },
    ],
  },
});
