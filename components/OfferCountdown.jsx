import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { formatCountdown, useNow } from "@/lib/offers";

/* =========================================================
   TIMED OFFER COUNTDOWN
   OfferCountdownChip — a small "⏱ 29:41" pill (cart lines, item
   page, the home deal box).
   TimedOfferBanner — the big card on the home page for an offer
   that is only the customer's for a limited time: what it is and
   a clear countdown. It disappears by itself when time is up.
========================================================= */

const ORANGE = "#FC4A14";
const DEEP_ORANGE = "#D93A0C";
const WHITE = "#FFFFFF";

const discountLabel = (offer, t) =>
  offer.discountType === "percentage"
    ? `-${Number(offer.discountValue)}%`
    : `-${Number(offer.discountValue).toFixed(2)} ${t("jd")}`;

export function OfferCountdownChip({ endsAt, light = false }) {
  const now = useNow(1000);
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return null;
  return (
    <View style={[styles.chip, light && styles.chipLight]}>
      <Ionicons name="timer-outline" size={12} color={light ? ORANGE : WHITE} />
      <Text style={[styles.chipText, light && { color: ORANGE }]}>
        {formatCountdown(left)}
      </Text>
    </View>
  );
}

export function TimedOfferBanner({ offer, itemName, onPress }) {
  const { t, dir } = useAppLang();
  const now = useNow(1000);
  const left = new Date(offer.expiresAt).getTime() - now;
  if (left <= 0) return null;
  // the last five minutes pulse a little louder
  const hurry = left < 5 * 60 * 1000;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t("offerTimedTitle")} ${offer.title} ${formatCountdown(left)}`}
      style={({ pressed }) => [styles.bannerWrap, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[ORANGE, DEEP_ORANGE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.banner, dir.row]}
      >
        <View style={styles.bannerInfo}>
          {/* sits on the same side as the text below it */}
          <View
            style={[
              styles.bannerTop,
              dir.row,
              dir.isRTL && styles.bannerTopRtl,
            ]}
          >
            <Text style={styles.badge} numberOfLines={1}>
              {discountLabel(offer, t)}
            </Text>
            <Text style={[styles.kicker, dir.text]} numberOfLines={1}>
              {t("offerTimedTitle")}
            </Text>
          </View>
          <Text style={[styles.bannerTitle, dir.text]} numberOfLines={1}>
            {offer.title}
          </Text>
          {!!itemName && (
            <Text style={[styles.bannerItem, dir.text]} numberOfLines={1}>
              {itemName}
            </Text>
          )}
          <Text style={[styles.bannerHint, dir.text]} numberOfLines={2}>
            {t("offerTimedHint")}
          </Text>
        </View>

        <View style={[styles.clock, hurry && styles.clockHurry]}>
          <Ionicons
            name="timer-outline"
            size={18}
            color={hurry ? WHITE : ORANGE}
          />
          <Text style={[styles.clockText, hurry && { color: WHITE }]}>
            {formatCountdown(left)}
          </Text>
          <Text style={[styles.clockLabel, hurry && { color: WHITE }]}>
            {t("offerTimeLeft")}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },

  chipLight: {
    backgroundColor: "#FFF0EA",
  },

  chipText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },

  bannerWrap: {
    alignSelf: "stretch",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 22,
    shadowColor: "#7A1E04",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  bannerInfo: {
    flex: 1,
    minWidth: 0,
  },

  bannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  badge: {
    flexShrink: 0,
    backgroundColor: WHITE,
    color: ORANGE,
    fontSize: 12,
    fontWeight: "900",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
    writingDirection: "ltr",
  },

  bannerTopRtl: {
    justifyContent: "flex-end",
  },

  kicker: {
    flexShrink: 1,
    color: "#FFE3D8",
    fontSize: 12,
    fontWeight: "900",
  },

  bannerTitle: {
    marginTop: 6,
    color: WHITE,
    fontSize: 17,
    fontWeight: "900",
  },

  bannerItem: {
    marginTop: 1,
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
  },

  bannerHint: {
    marginTop: 4,
    color: "#FFE3D8",
    fontSize: 11.5,
    fontWeight: "600",
  },

  clock: {
    minWidth: 84,
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },

  clockHurry: {
    backgroundColor: "#8E1F00",
  },

  clockText: {
    marginTop: 2,
    color: ORANGE,
    fontSize: 22,
    fontWeight: "900",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },

  clockLabel: {
    color: "#B7613F",
    fontSize: 10.5,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
