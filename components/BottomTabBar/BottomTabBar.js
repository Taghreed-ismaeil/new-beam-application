import { Ionicons } from "@expo/vector-icons";
import { router, usePathname, useSegments } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import CartIcon from "@/components/CartIcon";
import { useCart } from "@/context/CartContext";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { prepareTabTransition } from "@/lib/tab-transition";

// `route` is the root Stack route name each tab opens (used for its slide animation).
const TABS = [
  { key: "home", label: "tabHome", icon: "home", path: "/", route: "(tabs)" },
  {
    key: "menu",
    label: "tabMenu",
    icon: "restaurant",
    path: "/menu",
    route: "menu",
  },
  // Contact moved into the Profile page; its tab slot is the Media tab now.
  {
    key: "media",
    label: "tabMedia",
    icon: "images",
    path: "/media",
    route: "media/index",
  },
  {
    key: "gifts",
    label: "tabGifts",
    icon: "gift",
    path: "/loyalty",
    route: "loyalty/index",
  },
  {
    key: "profile",
    label: "tabProfile",
    icon: "person",
    path: "/account",
    route: "account",
  },
];

// Inside a menu category the Profile slot turns into the cart, so the order
// is one tap away while browsing.
const CART_TAB = {
  key: "cart",
  label: "tabCart",
  icon: "cart",
  path: "/cart",
  route: "cart",
};
const CART_TAB_ON = ["/menu-food", "/cart"];

function tabsFor(pathname) {
  return CART_TAB_ON.some((p) => pathname.startsWith(p))
    ? [...TABS.slice(0, -1), CART_TAB]
    : TABS;
}

// The item details screen has its own add-to-cart bar at the bottom.
const HIDDEN_ON = ["/login", "/item", "/media/share", "/policies"];

function isTabActive(tab, pathname) {
  return tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
}

function tabIndexFor(pathname) {
  return TABS.findIndex((tab) => isTabActive(tab, pathname));
}

// Root route names the screen on top might have — a page path maps to them in a few shapes
// ("/menu" is "menu", "/loyalty" is "loyalty/index", "/menu-food/12" is "menu-food/[categoryId]").
function currentRouteNames(pathname, segments) {
  if (pathname === "/") return ["(tabs)"];
  const fromSegments = segments.join("/");
  const fromPath = pathname.replace(/^\//, "");
  return [fromSegments, `${fromSegments}/index`, fromPath, `${fromPath}/index`];
}

// Tabs shouldn't pile up in the history (Menu → Contact → Gifts → back → back…).
// Home stays at the bottom of the stack and at most one tab sits on top of it:
// dismissTo pops back to the tab if it's already in the history, otherwise it
// replaces the current screen with it.
function goToTab(path, pathname, segments) {
  // Slide toward the tab being opened (see lib/tab-transition.js).
  const from = tabIndexFor(pathname);
  const to = TABS.findIndex((tab) => tab.path === path);
  if (from !== -1 && to !== -1) {
    prepareTabTransition(
      TABS[to].route,
      currentRouteNames(pathname, segments),
      Math.sign(to - from),
    );
  }

  if (path === "/") {
    router.dismissTo("/");
  } else if (pathname === "/") {
    router.push(path);
  } else {
    router.dismissTo(path);
  }
}

export default function BottomTabBar() {
  const pathname = usePathname();
  const segments = useSegments();
  // Tabs keep the same order in Arabic — only the labels change.
  const { t } = useAppLang();
  const cart = useCart();
  const cartCount = cart.lines.reduce((sum, l) => sum + l.quantity, 0);

  // The admin panel is its own full-screen experience with its own
  // navigation (see app/admin/_layout.tsx) — the customer tab bar has no
  // business floating on top of it.
  if (
    HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/admin")
  )
    return null;

  return (
    <View style={styles.bar}>
      {tabsFor(pathname).map((tab) => {
        const active = isTabActive(tab, pathname);
        const badge = tab.key === "cart" && cartCount > 0;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() =>
              tab.key === "cart"
                ? !active && router.push("/cart")
                : goToTab(tab.path, pathname, segments)
            }
          >
            <View>
              <TabIcon name={tab.icon} active={active} />
              {badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount > 99 ? "99+" : cartCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tab icon that gives a small springy bounce when its tab becomes active. */
function TabIcon({ name, active }) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withSpring(1.28, { damping: 9, stiffness: 320 }),
        withSpring(1.08, { damping: 12, stiffness: 220 }),
      );
      lift.value = withSpring(-3, { damping: 12, stiffness: 220 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      lift.value = withSpring(0, { damping: 14, stiffness: 220 });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      {name === "cart" ? (
        // the app's own trolley, drawn to match the Ionicons weight
        <CartIcon variant="line" size={24} color={active ? "#FC4A14" : "#005751"} filled={active} />
      ) : (
        <Ionicons
          name={active ? name : `${name}-outline`}
          size={22}
          color={active ? "#FC4A14" : "#005751"}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
    paddingBottom: 22,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 50,
  },
  tab: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    color: "#999",
    marginTop: 3,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#FC4A14",
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  labelActive: {
    color: "#FC4A14",
    fontWeight: "800",
  },
});
