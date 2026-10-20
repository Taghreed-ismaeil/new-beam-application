import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const CREAM = "#FFF9F4";

/**
 * Shared background for the Gifts pages (collection, scan/reveal, My Rewards,
 * lucky wheel): the brand teal and orange blended into each other — soft teal
 * at the top easing through cream into light orange at the bottom, two big
 * soft glows (teal top-left, orange bottom-right) and two faint diagonal
 * ribbons. Render it as the first child of a full-screen container.
 *
 * `moving` makes the two ribbons drift slowly up and down the whole page
 * (teal down, orange up), back and forth forever — used on the login page.
 *
 * `spot` optionally adds a white spotlight behind a hero element:
 * { top, size } in px (the wheel uses it).
 */
export default function GiftsBackdrop({ spot, moving = false }) {
  const { width, height } = useWindowDimensions();

  // 0 → 1 → 0 … : how far down the page the teal ribbon is (the orange one mirrors it)
  const drift = useSharedValue(0);
  useEffect(() => {
    if (!moving) return;
    drift.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [moving, drift]);

  // both ribbons sit at the top; translateY carries them across the full height
  const travel = height + 120;
  const tealStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moving ? -60 + drift.get() * travel : 96 }, { rotate: "-24deg" }],
  }));
  const orangeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moving ? height + 60 - drift.get() * travel : height - 176 }, { rotate: "-24deg" }],
  }));

  return (
    // overflow hidden: the big glows and ribbons reach past the screen edges — clipped
    // here so they never stretch the page (on the web that left a blank strip under the tab bar)
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <LinearGradient
        colors={[LIGHT_TEAL, "#F3FAF7", CREAM, LIGHT_ORANGE]}
        locations={[0, 0.35, 0.62, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.glow,
          {
            width: width * 1.1,
            height: width * 1.1,
            top: -width * 0.55,
            left: -width * 0.45,
            backgroundColor: TEAL,
            opacity: 0.13,
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          {
            width: width * 1.15,
            height: width * 1.15,
            bottom: -width * 0.5,
            right: -width * 0.5,
            backgroundColor: ORANGE,
            opacity: 0.12,
          },
        ]}
      />

      {spot && (
        <View
          style={[
            styles.glow,
            styles.spot,
            { width: spot.size, height: spot.size, top: spot.top },
          ]}
        />
      )}

      {/* thin diagonal ribbons, one in each brand colour */}
      <Animated.View
        style={[
          styles.ribbon,
          { width: width * 1.6, left: -width * 0.5, backgroundColor: TEAL, opacity: 0.07 },
          tealStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.ribbon,
          { width: width * 1.6, left: -width * 0.3, backgroundColor: ORANGE, opacity: 0.08 },
          orangeStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    borderRadius: 9999,
  },
  spot: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    opacity: 0.75,
  },
  ribbon: {
    position: "absolute",
    height: 26,
    borderRadius: 13,
    top: 0,
  },
});
