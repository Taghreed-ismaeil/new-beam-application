import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { fetchUnreadNotifications } from "@/lib/media-api";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";

// how often the badge re-checks while the Media tab is open
const POLL_MS = 30000;

/**
 * The Media tab's bell, top-left (the language button owns the top-right).
 * Shows how many notifications are unread and rings now and then while
 * there are some. Tapping it opens the list.
 */
export default function NotificationBell() {
  const { t } = useAppLang();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [unread, setUnread] = useState(0);
  const swing = useSharedValue(0);

  const check = useCallback(() => {
    if (!user) return setUnread(0);
    fetchUnreadNotifications()
      .then((d) => setUnread(d.unread ?? 0))
      .catch(() => {});
  }, [user]);

  // fresh number every time the tab comes into view, then every 30s while it stays
  useFocusEffect(
    useCallback(() => {
      check();
      const timer = setInterval(check, POLL_MS);
      return () => clearInterval(timer);
    }, [check]),
  );

  useEffect(() => {
    if (reduceMotion || unread === 0) {
      swing.value = withTiming(0, { duration: 150 });
      return;
    }
    // a short ring, then a pause, over and over
    swing.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 90 }),
        withTiming(-12, { duration: 110 }),
        withTiming(8, { duration: 100 }),
        withTiming(-5, { duration: 90 }),
        withTiming(0, { duration: 80 }),
        withDelay(2600, withTiming(0, { duration: 0 })),
      ),
      -1,
    );
  }, [unread, reduceMotion]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value}deg` }],
  }));

  if (!user) return null;

  return (
    <Pressable
      onPress={() => router.push("/media/notifications")}
      accessibilityRole="button"
      accessibilityLabel={unread ? `${t("notifTitle")} (${unread})` : t("notifTitle")}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Animated.View style={bellStyle}>
        <Ionicons name={unread ? "notifications" : "notifications-outline"} size={20} color={WHITE} />
      </Animated.View>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // level with the language button (components/LangToggle: top 48, 42 round)
  button: {
    position: "absolute",
    top: 48,
    left: 16,
    zIndex: 50,
    elevation: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    // frosted glass on the teal header
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    // web: no focus ring after a tap
    outlineStyle: "none",
  },
  pressed: {
    backgroundColor: "rgba(255,255,255,0.26)",
    transform: [{ scale: 0.92 }],
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: WHITE,
    fontSize: 10.5,
    fontWeight: "900",
    lineHeight: 13,
  },
});
