import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { OfferCountdownChip } from "@/components/OfferCountdown";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { offerEndsAt, spreadByCategory } from "@/lib/offers";

/* =========================================================
   MENU OFFERS CARD
   Sits on the menu page above the first category and opens
   the Offers page. A little stack of the items' photos, how
   many items are on offer, and a wobbling "up to -30%"
   sticker; the soonest-ending offer's countdown under it.
   Only shown while there's something on offer.
========================================================= */

const ORANGE = "#FC4A14";
const DEEP_ORANGE = "#D93A0C";
const CREAM = "#FFF0EA";
const WHITE = "#FFFFFF";
const DARK = "#17201F";

const STACK_SIZE = 3;

/** "-30%" for the biggest percentage off, else the biggest fixed amount. */
function bestDiscount(offers, jd) {
  const pct = offers.filter((o) => o.discountType === "percentage");
  if (pct.length)
    return `-${Math.max(...pct.map((o) => Number(o.discountValue)))}%`;
  const fixed = Math.max(...offers.map((o) => Number(o.discountValue)));
  return `-${fixed.toFixed(2)} ${jd}`;
}

/** onOffer: [{ item, offer, photo }] — the items on offer, soonest-ending first. */
export default function MenuOffersCard({ onOffer, onPress }) {
  const { t, dir } = useAppLang();

  // the sticker wobbles every couple of seconds, like it wants to be tapped
  const wobble = useSharedValue(0);
  useEffect(() => {
    wobble.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(9, { duration: 160 }),
        withTiming(-5, { duration: 140 }),
        withTiming(0, { duration: 140 }),
        withTiming(0, { duration: 1800 }),
      ),
      -1,
    );
  }, [wobble]);
  const stickerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-10 + wobble.value}deg` }],
  }));

  if (!onOffer.length) return null;

  const offers = [...new Map(onOffer.map((o) => [o.offer.id, o.offer])).values()];
  const soonest = onOffer.map((o) => offerEndsAt(o.offer)).find(Boolean);
  // one photo per category where possible, so the stack isn't three of the same picture
  const stack = spreadByCategory(onOffer, STACK_SIZE);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("offersPageTitle")}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={[styles.card, dir.row]}>
        {/* photo stack — each one tucked a little behind the next */}
        <View style={[styles.stack, { width: 58 + (stack.length - 1) * 26 }]}>
          {stack.map(({ item, photo }, i) => (
            <View
              key={item.id}
              style={[
                styles.stackPhoto,
                { left: i * 26, zIndex: STACK_SIZE - i },
              ]}
            >
              {photo ? (
                <Image source={photo} style={styles.photo} contentFit="cover" />
              ) : (
                <Ionicons name="fast-food-outline" size={24} color={ORANGE} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.info}>
          <View style={[styles.kickerRow, dir.row, dir.isRTL && styles.rowEnd]}>
            <Ionicons name="flame" size={13} color={DEEP_ORANGE} />
            <Text style={[styles.kicker, dir.text]} numberOfLines={1}>
              {t("menuOffersKicker")}
            </Text>
          </View>
          <Text style={[styles.title, dir.text, dir.noSpacing]} numberOfLines={1}>
            {t("offersPageTitle")}
          </Text>
          <Text style={[styles.count, dir.text]} numberOfLines={1}>
            {t("menuOffersCount", { count: onOffer.length })}
          </Text>
          {!!soonest && (
            <View style={[styles.chipRow, dir.isRTL && styles.rowEnd]}>
              <OfferCountdownChip endsAt={soonest} />
            </View>
          )}
        </View>

        <Animated.View style={[styles.sticker, stickerStyle]}>
          <Text style={styles.stickerSmall}>{t("menuOffersUpTo")}</Text>
          <Text style={styles.stickerBig} numberOfLines={1} adjustsFontSizeToFit>
            {bestDiscount(offers, t("jd"))}
          </Text>
        </Animated.View>
      </View>

      {/* little sparkles on the card's corners */}
      <Ionicons name="sparkles" size={16} color={ORANGE} style={styles.sparkleA} />
      <Ionicons name="sparkles" size={12} color="#FFB59A" style={styles.sparkleB} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 27,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 120,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 27,
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: ORANGE,
  },

  stack: {
    height: 58,
  },

  stackPhoto: {
    position: "absolute",
    top: 0,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: WHITE,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  rowEnd: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },

  kicker: {
    flexShrink: 1,
    color: DEEP_ORANGE,
    fontSize: 11.5,
    fontWeight: "800",
  },

  title: {
    color: ORANGE,
    fontSize: 24,
    fontWeight: "900",
  },

  count: {
    color: DARK,
    fontSize: 12.5,
    fontWeight: "700",
  },

  chipRow: {
    marginTop: 5,
  },

  sticker: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ORANGE,
    borderWidth: 3,
    borderColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  stickerSmall: {
    color: "#FFE3D8",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: -2,
  },

  stickerBig: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "900",
    writingDirection: "ltr",
  },

  sparkleA: {
    position: "absolute",
    top: -7,
    right: 22,
  },

  sparkleB: {
    position: "absolute",
    bottom: -5,
    left: 30,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
