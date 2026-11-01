import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { imageUrl, isUsableImagePath } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { enterUp } from "@/lib/motion";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   FOOD CARD
   Vertical card: image → name → description → price + arrow.
   The arrow opens the item: dishes are added from their own
   page, where the customer picks size and extras.
   Used two-per-row on the category pages and in search.
   On the Offers page it also gets the photo to show and the
   deal: a discount sticker on the photo, and the price after
   the discount with the old one crossed out.
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
  // optional: image source to use instead of the item's own / the fallback
  photo = null,
  // optional: { label: "-30%", offerPrice: 1.92 | null }
  deal = null,
}) {
  const { t, pick, pickDesc, dir, lang } = useAppLang();

  const itemName = pick(item) || t("menuItem");

  const itemDescription = pickDesc(item);

  const price = Number(item.price).toFixed(2);
  const dealPrice =
    deal?.offerPrice != null && deal.offerPrice < Number(item.price)
      ? deal.offerPrice.toFixed(2)
      : null;

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
        style={({ pressed }) => [
          styles.openArea,
          pressed && styles.openPressed,
        ]}
      >
        {/* IMAGE */}

        <View>
          <Image
            source={
              photo ??
              (isUsableImagePath(item.imageUrl)
                ? {
                    uri: imageUrl(item.imageUrl),
                  }
                : FALLBACK_IMAGE)
            }
            cachePolicy="memory-disk"
            transition={120}
            style={[styles.foodImage, { width: imageSize, height: imageSize }]}
          />
          {!!deal && <Text style={styles.dealSticker}>{deal.label}</Text>}
        </View>

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
          <Text style={[styles.price, { color: dealPrice ? ORANGE : accent }]}>
            {dealPrice ?? price}
          </Text>

          <Text
            style={[styles.currency, { color: dealPrice ? ORANGE : accent }]}
          >
            {t("jd")}
          </Text>

          {!!dealPrice && <Text style={styles.oldPrice}>{price}</Text>}
        </View>

        <OpenArrow
          onPress={onOpen}
          color={accent}
          soft={soft}
          quantity={quantity}
          index={index}
          back={lang === "ar"}
        />
      </View>
    </Animated.View>
  );
}

/** Round arrow that invites a tap into the dish: it nudges forward every few
 *  seconds (cards out of step with each other), a soft ring breathes out
 *  behind it, and it springs down under the finger. */
function OpenArrow({ onPress, color, soft, quantity, index, back }) {
  const reduceMotion = useReducedMotion();
  const nudge = useSharedValue(0);
  const ring = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const wait = 1600 + (index % 4) * 350;
    nudge.value = withDelay(
      (index % 6) * 220,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 420, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0.55, { duration: 200, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 360, easing: Easing.inOut(Easing.cubic) }),
          withDelay(wait, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
    ring.value = withDelay(
      (index % 6) * 220,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1240, easing: Easing.out(Easing.quad) }),
          withDelay(wait, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [reduceMotion, index]);

  const shift = back ? -4 : 4;
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value * shift }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 0.45 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 0.45 }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      onPressIn={() => {
        press.value = withSpring(0.86, { damping: 14, stiffness: 420 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 9, stiffness: 260 });
      }}
      style={styles.arrowHit}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.arrowRing, { backgroundColor: color }, ringStyle]}
      />
      <Animated.View
        style={[styles.arrowButton, { backgroundColor: color }, pressStyle]}
      >
        <Animated.View style={arrowStyle}>
          <Ionicons
            name={back ? "chevron-back" : "chevron-forward"}
            size={22}
            color={WHITE}
          />
        </Animated.View>
      </Animated.View>
      {quantity > 0 && (
        <View
          style={[
            styles.arrowBadge,
            { backgroundColor: soft, borderColor: color },
          ]}
        >
          <Text style={[styles.arrowBadgeText, { color }]}>{quantity}</Text>
        </View>
      )}
    </Pressable>
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

  oldPrice: {
    color: "#9AA5A3",
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },

  dealSticker: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: ORANGE,
    color: WHITE,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: WHITE,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
    writingDirection: "ltr",
    transform: [{ rotate: "-8deg" }],
  },

  arrowHit: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    // web: no focus ring after a tap
    outlineStyle: "none",
  },

  arrowRing: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#17201F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },

  // how many of this dish are already in the cart
  arrowBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
});
