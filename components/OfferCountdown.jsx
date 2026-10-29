import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { countdownParts, formatCountdown, useNow } from "@/lib/offers";

/* =========================================================
   OFFER COUNTDOWN
   OfferCountdownChip — a small "⏱ 29:41" pill (cart lines, item
   page, the home deal box). Past a day it reads "3d 04:12".
   OfferBanner — the ticket on the home page for an offer that
   ends (a per-customer timed offer, or one with an end date/time
   set in the admin panel): an orange stub whose round photo
   cycles through every item picked for the offer, a dashed tear
   line, then what the offer is and a compact countdown. It
   disappears by itself when time is up.
========================================================= */

const ORANGE = "#FC4A14";
const DEEP_ORANGE = "#D93A0C";
const PALE_ORANGE = "#FFF0EA";
const WHITE = "#FFFFFF";
const HURRY = "#8E1F00";
// the teal right behind the ticket (top of MenuCard's gradient) — the tear-line notches
const BEHIND = "#03857D";

const PHOTO_EVERY_MS = 2600;
const TEAR_DASHES = 9;

const pad = (n) => String(n).padStart(2, "0");

const discountLabel = (offer, t) =>
  offer.discountType === "percentage"
    ? `-${Number(offer.discountValue)}%`
    : `-${Number(offer.discountValue).toFixed(2)} ${t("jd")}`;

export function OfferCountdownChip({ endsAt, light = false }) {
  const { t } = useAppLang();
  const now = useNow(1000);
  if (!endsAt) return null;
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return null;
  const { days, hours, minutes } = countdownParts(left);
  const label = days
    ? `${days}${t("cdDayShort")} ${pad(hours)}:${pad(minutes)}`
    : formatCountdown(left);
  return (
    <View style={[styles.chip, light && styles.chipLight]}>
      <Ionicons name="timer-outline" size={12} color={light ? ORANGE : WHITE} />
      <Text style={[styles.chipText, light && { color: ORANGE }]}>{label}</Text>
    </View>
  );
}

/** The boxes of the countdown: days+h+m past a day, h:m:s past an hour, else m:s. */
function countdownBoxes(left, t) {
  const { days, hours, minutes, seconds } = countdownParts(left);
  if (days) return [`${days}${t("cdDayShort")}`, pad(hours), pad(minutes)];
  if (hours) return [String(hours), pad(minutes), pad(seconds)];
  return [pad(minutes), pad(seconds)];
}

/**
 * items: [{ id, name, photo, price, offerPrice }] — every menu item picked for this offer in
 * the admin; offerPrice is the price after the discount (null when checkout won't apply it).
 * onPress(item) gets the item showing at the moment of the tap.
 */
export function OfferBanner({ offer, endsAt, items = [], onPress }) {
  const { t, dir } = useAppLang();
  const now = useNow(1000);
  const [shown, setShown] = useState(0);

  // step to the next item's photo every few seconds (only when there's more than one)
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(
      () => setShown((i) => (i + 1) % items.length),
      PHOTO_EVERY_MS,
    );
    return () => clearInterval(id);
  }, [items.length]);

  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return null;
  // the last five minutes turn the boxes dark red
  const hurry = left < 5 * 60 * 1000;
  // a per-customer timer reads "just for you"; an end date reads "limited time"
  const timed = !!offer.expiresAt;
  const item = items.length ? items[shown % items.length] : null;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${offer.title} ${item?.name ?? ""} ${formatCountdown(left)}`}
      style={({ pressed }) => [styles.ticketWrap, pressed && styles.pressed]}
    >
      <View style={[styles.ticket, dir.row]}>
        {/* STUB — the photo cycles through the offer's items */}
        <View style={styles.stub}>
          <View style={styles.photoRing}>
            {item?.photo ? (
              <Image
                source={item.photo}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={{ duration: 450, effect: "cross-dissolve" }}
              />
            ) : (
              <Ionicons name="fast-food-outline" size={30} color={ORANGE} />
            )}
          </View>
          {/* the discount sits on the photo like a sticker */}
          <Text style={styles.sticker}>{discountLabel(offer, t)}</Text>
          {items.length > 1 && (
            <View style={styles.dots}>
              {items.slice(0, 6).map((it, i) => (
                <View
                  key={it.id}
                  style={[
                    styles.dot,
                    i === shown % Math.min(items.length, 6) && styles.dotOn,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* TEAR LINE — dashes with a notch bitten out at each end */}
        <View style={styles.tear}>
          <View style={[styles.notch, styles.notchTop]} />
          {Array.from({ length: TEAR_DASHES }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
          <View style={[styles.notch, styles.notchBottom]} />
        </View>

        {/* BODY */}
        <View style={styles.body}>
          <View style={[styles.kickerRow, dir.row, dir.isRTL && styles.rowEnd]}>
            <Ionicons name="flame" size={12} color={DEEP_ORANGE} />
            <Text style={[styles.kicker, dir.text]} numberOfLines={1}>
              {t(timed ? "offerTimedTitle" : "offerLimitedTitle")}
            </Text>
          </View>
          <Text style={[styles.title, dir.text]} numberOfLines={1}>
            {offer.title}
          </Text>
          {!!item && (
            <Text style={[styles.itemName, dir.text]} numberOfLines={1}>
              {item.name}
            </Text>
          )}

          <View style={[styles.bottomRow, dir.row]}>
            {!!item?.price && (
              <View style={styles.prices}>
                <Text style={styles.newPrice}>
                  {(item.offerPrice ?? item.price).toFixed(2)}
                  <Text style={styles.currency}> {t("jd")}</Text>
                </Text>
                {item.offerPrice != null && item.offerPrice < item.price && (
                  <Text style={styles.oldPrice}>
                    {item.price.toFixed(2)} {t("jd")}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.spacer} />
            {/* digits always read left-to-right, in Arabic too */}
            <View style={styles.clock}>
              <Ionicons
                name="timer-outline"
                size={15}
                color={hurry ? HURRY : ORANGE}
              />
              {countdownBoxes(left, t).map((box, i) => (
                <View key={i} style={styles.clockPart}>
                  {i > 0 && (
                    <Text style={[styles.colon, hurry && { color: HURRY }]}>
                      :
                    </Text>
                  )}
                  <Text style={[styles.box, hurry && styles.boxHurry]}>
                    {box}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
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
    backgroundColor: PALE_ORANGE,
  },

  chipText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },

  ticketWrap: {
    alignSelf: "stretch",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    shadowColor: "#04342C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },

  ticket: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 112,
  },

  stub: {
    width: 100,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },

  photoRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: PALE_ORANGE,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  sticker: {
    marginTop: -16,
    backgroundColor: WHITE,
    color: ORANGE,
    fontSize: 13,
    fontWeight: "900",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: "hidden",
    writingDirection: "ltr",
  },

  dots: {
    flexDirection: "row",
    gap: 4,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  dotOn: {
    width: 12,
    backgroundColor: WHITE,
  },

  tear: {
    width: 14,
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: WHITE,
  },

  dash: {
    width: 2,
    height: 6,
    borderRadius: 1,
    backgroundColor: "#FFC9B5",
  },

  notch: {
    position: "absolute",
    // centred on the 14-wide tear line
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BEHIND,
  },

  notchTop: {
    top: -9,
  },

  notchBottom: {
    bottom: -9,
  },

  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    paddingRight: 14,
    paddingLeft: 4,
    justifyContent: "center",
  },

  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  rowEnd: {
    justifyContent: "flex-end",
  },

  kicker: {
    flexShrink: 1,
    color: DEEP_ORANGE,
    fontSize: 11.5,
    fontWeight: "800",
  },

  title: {
    marginTop: 2,
    color: "#17201F",
    fontSize: 17,
    fontWeight: "900",
  },

  itemName: {
    marginTop: 1,
    color: "#005751",
    fontSize: 13,
    fontWeight: "700",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  prices: {
    alignItems: "flex-start",
  },

  newPrice: {
    color: ORANGE,
    fontSize: 19,
    fontWeight: "900",
    writingDirection: "ltr",
  },

  currency: {
    fontSize: 12,
    fontWeight: "800",
  },

  oldPrice: {
    marginTop: -2,
    color: "#9AA5A3",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
    writingDirection: "ltr",
  },

  spacer: {
    flex: 1,
  },

  clock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  clockPart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  colon: {
    color: ORANGE,
    fontSize: 15,
    fontWeight: "900",
  },

  box: {
    minWidth: 30,
    textAlign: "center",
    backgroundColor: PALE_ORANGE,
    color: ORANGE,
    fontSize: 15,
    fontWeight: "900",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    overflow: "hidden",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },

  boxHurry: {
    backgroundColor: HURRY,
    color: WHITE,
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
