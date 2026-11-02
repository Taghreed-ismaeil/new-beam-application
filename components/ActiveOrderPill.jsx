import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { io } from "socket.io-client";

import { STATUS_LABEL, trackStepIndex, trackSteps } from "@/components/OrderTrackerCard";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   ACTIVE ORDER PILL
   While the customer has an order that isn't finished, a teal
   bar sits just above the tab bar on the main screens — leave
   the app, come back, and the order's status is right there.
   Tapping it opens the order-tracking page.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const MINT = "#9FE1CB";

// the main screens only — not over the cart, checkout, an item page or the tracker itself
function showsOn(pathname) {
  return (
    pathname === "/" ||
    pathname === "/menu" ||
    pathname.startsWith("/menu-food") ||
    pathname === "/media" ||
    pathname === "/media/restaurant" ||
    pathname === "/media/community" ||
    pathname === "/loyalty" ||
    pathname === "/account" ||
    pathname === "/orders"
  );
}

const isOpen = (o) => o && o.status !== "completed" && o.status !== "cancelled";

// re-asking the server more often than this on screen changes is wasted work
const MIN_REFRESH_MS = 20000;

export default function ActiveOrderPill() {
  const { t, dir } = useAppLang();
  const { user } = useAuth();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [order, setOrder] = useState(null);
  const lastFetch = useRef(0);

  const refresh = useCallback(
    (force = false) => {
      if (!user) return;
      if (!force && Date.now() - lastFetch.current < MIN_REFRESH_MS) return;
      lastFetch.current = Date.now();
      apiRequest("/api/orders/mine")
        .then(({ orders }) => setOrder((orders ?? []).find(isOpen) ?? null))
        .catch(() => {});
    },
    [user],
  );

  // on sign-in / sign-out, and each time the app comes back to the foreground
  useEffect(() => {
    refresh(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh(true);
    });
    return () => sub.remove();
  }, [refresh]);

  // moving between screens (e.g. back from placing an order) checks again, gently
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // live status while the bar is up
  const orderId = order?.id;
  useEffect(() => {
    if (!orderId) return;
    const socket = io(API_BASE, { transports: ["websocket"] });
    socket.on("order:updated", (updated) => {
      if (updated.id !== orderId) return;
      setOrder((prev) => (isOpen({ ...prev, ...updated }) ? { ...prev, ...updated } : null));
    });
    return () => socket.disconnect();
  }, [orderId]);

  // the soft ring breathing around the current step
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    ring.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) }), -1);
  }, [reduceMotion, ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.32 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 0.45 }],
  }));

  // signed out: an order left over from the last account never shows
  if (!user || !order || !showsOn(pathname)) return null;

  const steps = trackSteps(order.orderType);
  const at = trackStepIndex(order);

  return (
    <Animated.View
      // a slow, quiet arrival: fades in while rising a little, no bounce
      entering={reduceMotion ? undefined : FadeInDown.duration(800).delay(250).easing(Easing.out(Easing.cubic))}
      exiting={reduceMotion ? undefined : FadeOut.duration(400)}
      style={styles.wrap}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => router.push(`/order-tracking/${order.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${t("cartOrderNumber", { id: order.id })} — ${t(STATUS_LABEL[order.status] ?? "statusPending")}`}
        style={({ pressed }) => [styles.pill, dir.row, pressed && styles.pressed]}
      >
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <View style={styles.icon}>
            <Ionicons name={steps[at].icon.replace("-outline", "")} size={18} color={WHITE} />
          </View>
        </View>

        <View style={styles.texts}>
          <Text style={[styles.small, dir.text]} numberOfLines={1}>
            {t("cartOrderNumber", { id: order.id })}
          </Text>
          <Text style={[styles.status, dir.text]} numberOfLines={1}>
            {t(STATUS_LABEL[order.status] ?? "statusPending")}
          </Text>
        </View>

        {/* how far along: one bar per step */}
        <View style={[styles.bars, dir.row]}>
          {steps.map((s, i) => (
            <View key={s.icon} style={[styles.bar, i < at && styles.barDone, i === at && styles.barNow]} />
          ))}
        </View>

        <Ionicons name={dir.chevron} size={18} color={MINT} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // just above the tab bar (components/BottomTabBar)
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 82,
    zIndex: 49,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: TEAL,
    shadowColor: "#00302C",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    // web: no focus ring after a tap
    outlineStyle: "none",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ORANGE,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  small: {
    color: MINT,
    fontSize: 11.5,
    fontWeight: "800",
  },
  status: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 1,
  },
  bars: {
    gap: 3,
    alignItems: "center",
  },
  bar: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  barDone: {
    backgroundColor: WHITE,
  },
  barNow: {
    width: 16,
    backgroundColor: ORANGE,
  },
});
