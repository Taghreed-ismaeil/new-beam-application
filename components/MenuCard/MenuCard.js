import {
  OfferCountdownChip,
  TimedOfferBanner,
} from "@/components/OfferCountdown";
import {
  apiRequestCached,
  imageUrl,
  isUsableImagePath,
} from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { RNAnimatedText, Text } from "@/lib/arabic-font";
import { allMenuItems } from "@/lib/menu-sections";
import { discountedPrice, refreshOffers, useOffers } from "@/lib/offers";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const FALLBACK_IMAGE = require("../../assets/img/menu-1.jpg");

const CIRCLE_SIZE = 96;

const OFFERS_POLL_MS = 15000;

const RADIUS_X = Math.min(Dimensions.get("window").width, 480) * 0.4;

/* =====================================================
   FOOD CAROUSEL
===================================================== */

const AUTO_SPIN_SPEED = 0.225;
const DRAG_SENSITIVITY = 90;
const MOMENTUM_DECAY = 0.94;

const GRADIENT_COLORS = ["#00827A", "#0A8A82", "#1E968E", "#35A29B"];
const GRADIENT_LOCATIONS = [0, 0.35, 0.7, 1];

/* =====================================================
   MENU
===================================================== */

export default function Menu({ refreshKey = 0 }) {
  const { t, pick, dir } = useAppLang();
  const [deals, setDeals] = useState([]);
  // The ring turns on the animation thread: the per-frame angle lives in a shared
  // value, and React only re-renders when a different item reaches the front.
  // (Setting React state every frame re-rendered all of Home 60 times a second,
  // which made the whole app feel stuck on phones.)
  const rotation = useSharedValue(0);
  const [frontStep, setFrontStep] = useState(0);
  useAnimatedReaction(
    () => Math.round(rotation.get()),
    (step, prev) => {
      if (step !== prev) runOnJS(setFrontStep)(step);
    },
  );

  /* =====================================================
     FOOD ROTATION REFS
  ====================================================== */

  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRotation = useRef(0);
  const lastTimeRef = useRef(null);
  const rafRef = useRef(null);

  /* =====================================================
     FETCH DEALS
  ====================================================== */

  // Live offers from the admin Offers page drive the ring: every item an offer
  // covers gets a slot, newest offer first. With no live offers it falls back
  // to the loyalty items so the section is never empty.
  const [menuItems, setMenuItems] = useState(null);
  // shared live offers (lib/offers) — a timed offer's countdown starts the first
  // time they are read for this customer, i.e. when they open the app
  const offers = useOffers();

  // refreshKey bumps on Home's pull-to-refresh
  useEffect(() => {
    apiRequestCached("/api/menu", (data) => {
      setMenuItems(allMenuItems(data.categories));
    });
  }, [refreshKey]);

  // Re-read offers whenever Home comes into focus and every OFFERS_POLL_MS while
  // it stays open, so adding, editing, switching off or deleting an offer in the
  // admin panel shows up on its own — even on another phone.
  useFocusEffect(
    useCallback(() => {
      const refresh = () => refreshOffers();
      refresh();
      const timer = setInterval(refresh, OFFERS_POLL_MS);
      return () => clearInterval(timer);
    }, [refreshKey]),
  );

  useEffect(() => {
    if (!menuItems) return;
    const byId = new Map(menuItems.map((item) => [item.id, item]));
    const seen = new Set();
    const fromOffers = [];
    // timed offers first (soonest to end first), then the newest normal offers
    const ordered = [...offers].sort(
      (a, b) =>
        Number(!!b.expiresAt) - Number(!!a.expiresAt) ||
        (a.expiresAt && b.expiresAt
          ? new Date(a.expiresAt) - new Date(b.expiresAt)
          : b.id - a.id),
    );
    for (const offer of ordered) {
      for (const id of offer.menuItemIds ?? []) {
        const item = byId.get(id);
        if (!item || seen.has(id) || item.isAvailable === false) continue;
        seen.add(id);
        fromOffers.push({ ...item, offer });
      }
    }
    // No live offers → loyalty items → otherwise a spread of the menu (one per
    // section, photos first) so the ring is never empty.
    const loyalty = menuItems.filter((item) => item.hasLoyalty);
    const sectionSeen = new Set();
    const spread = [...menuItems]
      .sort((a, b) => Number(!!b.imageUrl) - Number(!!a.imageUrl))
      .filter((item) => {
        const key = item.sectionName ?? item.categoryId;
        if (sectionSeen.has(key)) return false;
        sectionSeen.add(key);
        return true;
      });
    setDeals(
      fromOffers.length
        ? fromOffers.slice(0, 10)
        : (loyalty.length ? loyalty : spread).slice(0, 8),
    );
  }, [menuItems, offers]);

  const n = deals.length || 1;

  /* =====================================================
     FOOD AUTO ROTATION
  ====================================================== */

  // Runs only while Home is the focused screen: this loop re-renders the
  // carousel every frame, and left running under other screens it starved the
  // UI thread and made other animations (e.g. the lucky wheel) stutter.
  useFocusEffect(
    useCallback(() => {
      lastTimeRef.current = null;

      function tick(time) {
        if (lastTimeRef.current == null) {
          lastTimeRef.current = time;
        }

        const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);

        lastTimeRef.current = time;

        if (!draggingRef.current) {
          if (Math.abs(velocityRef.current) > 0.002) {
            rotationRef.current += velocityRef.current * dt;

            velocityRef.current *= Math.pow(MOMENTUM_DECAY, dt * 60);
          } else {
            velocityRef.current = 0;

            rotationRef.current += AUTO_SPIN_SPEED * dt;
          }

          rotation.set(rotationRef.current);
        }

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, [rotation]),
  );

  /* =====================================================
     FOOD DRAG
  ====================================================== */

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 6,

      onPanResponderGrant: () => {
        draggingRef.current = true;

        velocityRef.current = 0;

        dragStartRotation.current = rotationRef.current;
      },

      onPanResponderMove: (_, gesture) => {
        rotationRef.current =
          dragStartRotation.current - gesture.dx / DRAG_SENSITIVITY;

        rotation.set(rotationRef.current);
      },

      onPanResponderRelease: (_, gesture) => {
        draggingRef.current = false;

        velocityRef.current = -(gesture.vx * 1000) / DRAG_SENSITIVITY / 60;
      },

      onPanResponderTerminate: () => {
        draggingRef.current = false;

        velocityRef.current = 0;
      },
    }),
  ).current;

  /* =====================================================
     ACTIVE FOOD
  ====================================================== */

  // round, not trunc: an item sits dead-center when rotation equals its index,
  // so trunc picked the circle half a step to the left of center.
  const frontIndex = deals.length ? ((frontStep % n) + n) % n : 0;
  const activeItem = deals[frontIndex];

  /* =====================================================
     DEAL BOX — crossfades to whichever item is centered
  ====================================================== */

  const dealOpacity = useRef(new Animated.Value(1)).current;
  const lastShownId = useRef(null);

  useEffect(() => {
    if (!activeItem || activeItem.id === lastShownId.current) return;
    lastShownId.current = activeItem.id;

    dealOpacity.setValue(0);
    Animated.timing(dealOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeItem?.id]);

  /* =====================================================
     GO TO ACTIVE
  ====================================================== */

  function goToActive() {
    const target = deals[frontIndex] ?? deals[0];

    if (target) {
      router.push(`/menu-food/${target.categoryId}`);
    }
  }

  /* =====================================================
     RENDER
  ====================================================== */

  // Offers that are this customer's for a limited time get a big countdown card.
  const byId = new Map((menuItems ?? []).map((item) => [item.id, item]));
  const timedOffers = offers
    .filter((o) => o.expiresAt)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    .slice(0, 2);

  const activePrice = Number(activeItem?.price ?? 0);
  const activeOfferPrice = activeItem?.offer?.appliesAtCheckout
    ? discountedPrice(activePrice, activeItem.offer)
    : null;

  return (
    <View style={styles.container}>
      {/* Background gradient as its own layer — the native gradient view clips
          its children on iOS, which was hiding the lifted heading. */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* SEE TODAY'S BEST DEAL lives in the Hero now (bottom of the video),
          so it's never hidden behind the video on iOS. */}

      {timedOffers.map((offer) => {
        const firstItem = (offer.menuItemIds ?? [])
          .map((id) => byId.get(id))
          .find(Boolean);
        return (
          <TimedOfferBanner
            key={offer.id}
            offer={offer}
            itemName={firstItem ? pick(firstItem) : null}
            onPress={() =>
              firstItem
                ? router.push({
                    pathname: "/item/[id]",
                    params: { id: String(firstItem.id) },
                  })
                : router.push("/menu")
            }
          />
        );
      })}

      {/* =================================================
          FOOD CAROUSEL
      ================================================= */}

      <View style={styles.ring} {...panResponder.panHandlers}>
        {deals.map((item, index) => (
          <RingItem
            key={item.id}
            item={item}
            index={index}
            n={n}
            rotation={rotation}
            activeIndex={frontIndex}
          />
        ))}

        <Pressable style={styles.tapCatcher} onPress={goToActive} />
      </View>

      {!!activeItem && (
        <Pressable onPress={goToActive} style={styles.dealPressable}>
          <View style={[styles.dealBox, dir.row]}>
            <Animated.View style={[styles.dealInfo, { opacity: dealOpacity }]}>
              <Text style={[styles.dealName, dir.text]} numberOfLines={1}>
                {pick(activeItem)}
              </Text>
              {activeItem.offer ? (
                <View style={[styles.offerRow, dir.row]}>
                  {/* Badge is its own Text so the LTR "-15%" never gets
                      reordered by an Arabic offer title next to it. */}
                  <Text style={styles.offerBadge}>
                    {activeItem.offer.discountType === "percentage"
                      ? `-${Number(activeItem.offer.discountValue)}%`
                      : `-${Number(activeItem.offer.discountValue).toFixed(2)} ${t("jd")}`}
                  </Text>
                  <Text style={[styles.offerTitle, dir.text]} numberOfLines={1}>
                    {activeItem.offer.title}
                  </Text>
                  {!!activeItem.offer.expiresAt && (
                    <OfferCountdownChip endsAt={activeItem.offer.expiresAt} />
                  )}
                </View>
              ) : activeItem.rewardValue ? (
                <Text style={[styles.dealReward, dir.text]} numberOfLines={1}>
                  {activeItem.rewardValue}
                </Text>
              ) : (
                <Text style={[styles.dealHint, dir.text]} numberOfLines={2}>
                  {t("homeDealHint")}
                </Text>
              )}
            </Animated.View>
            <View style={styles.dealPricePill}>
              <RNAnimatedText
                style={[styles.dealPriceText, { opacity: dealOpacity }]}
              >
                {(activeOfferPrice ?? activePrice).toFixed(2)} {t("jd")}
              </RNAnimatedText>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* =========================================================
   FOOD RING ITEM
========================================================= */

// memo: an item only re-renders when it becomes / stops being the front one —
// its position on the ring is computed on the animation thread.
const RingItem = memo(function RingItem({
  item,
  index,
  n,
  rotation,
  activeIndex,
}) {
  const isActive = index === activeIndex;

  const slotStyle = useAnimatedStyle(() => {
    const angle = ((index - rotation.get()) / n) * Math.PI * 2;
    const cos = Math.cos(angle);
    const depth = (cos + 1) / 2;
    return {
      transform: [
        { translateX: Math.sin(angle) * RADIUS_X },
        { scale: 0.56 + depth * (1.15 - 0.56) },
      ],
      zIndex: Math.round(cos * 100),
    };
  });

  return (
    <Reanimated.View style={[styles.slot, slotStyle]} pointerEvents="none">
      <View style={[styles.card, isActive && styles.cardActive]}>
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
          style={styles.image}
        />
      </View>
    </Reanimated.View>
  );
});

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* ================= CONTAINER ================= */

  container: {
    width: "100%",

    paddingTop: 4,

    paddingBottom: 0,

    alignItems: "center",

    overflow: "visible",

    // Tucks 1px under the Hero so a sub-pixel gap can never show as a line.
    marginTop: -1,

    // Draw above the Hero so the lifted heading isn't hidden behind the video.
    zIndex: 10,

    elevation: 10,
  },

  /* ================= FOOD RING ================= */

  ring: {
    width: "100%",

    height: CIRCLE_SIZE + 20,

    alignItems: "center",

    justifyContent: "center",

    // Heading moved into the Hero — 14 keeps the ring exactly where -30 put
    // it before (4 padding + 44 old heading box − 30 = 18 from the top).
    marginTop: 14,

    marginBottom: 40,
  },

  slot: {
    position: "absolute",

    width: CIRCLE_SIZE,

    height: CIRCLE_SIZE,
  },

  /* ================= FOOD CARD ================= */

  card: {
    width: "100%",

    height: "100%",

    borderRadius: CIRCLE_SIZE / 2,

    overflow: "hidden",

    borderWidth: 4,

    borderColor: "#fff",

    backgroundColor: "#eee",

    elevation: 6,

    shadowColor: "#0B1A18",

    shadowOpacity: 0.22,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,

      height: 4,
    },
  },

  cardActive: {
    // Light teal (tried: dark orange #FC4A14, light orange #FF9A6C)
    borderColor: "#7FDBD3",

    borderWidth: 5,

    elevation: 14,

    shadowColor: "#7FDBD3",

    shadowOpacity: 0.4,

    shadowRadius: 14,

    shadowOffset: {
      width: 0,

      height: 6,
    },
  },

  tapCatcher: {
    position: "absolute",

    width: CIRCLE_SIZE,

    height: CIRCLE_SIZE,

    borderRadius: CIRCLE_SIZE / 2,

    zIndex: 1000,
  },

  image: {
    width: "100%",

    height: "100%",
  },

  /* ================= DEAL BOX ================= */

  // The Pressable is what the parent lays out — it has to stretch too,
  // otherwise it shrinks to its content and the box can't reach the edges.
  dealPressable: {
    alignSelf: "stretch",
    width: "100%",
  },

  dealBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    // Pure white with no border — same white as AboutUs right below it, so
    // the box flows straight into the next section with no dividing line.
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
  },

  dealInfo: {
    flex: 1,
    minWidth: 0,
  },

  dealName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#17201F",
  },

  dealReward: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#005751",
  },

  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  offerBadge: {
    backgroundColor: "#FC4A14",
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
    writingDirection: "ltr",
  },

  offerTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#005751",
  },

  dealHint: {
    marginTop: 3,
    fontSize: 12,
    color: "#999",
  },

  dealPricePill: {
    backgroundColor: "#FC4A14",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  dealPriceText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
