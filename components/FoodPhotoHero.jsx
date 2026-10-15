import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/* =========================================================
   FOOD PHOTO HERO
   The item photo as a floating 3D glass card:
   - photo (with its own background) in a rounded square, set in
     a thin frosted-glass bezel
   - it floats up and down and sways gently on its own, with a
     soft shadow on the "floor" that shrinks as it rises
   - a light sheen sweeps across it every few seconds
   - thin rings fan out behind it
   - drag it sideways / up-down and it tilts with your finger in
     real 3D perspective, springing back when you let go
========================================================= */

const MAX_TILT = 16; // degrees
const FLOAT = 9; // px the card rises at the top of its float
const SWAY = 4; // degrees of idle sideways tilt
const BEZEL = 7; // glass frame thickness

const clamp = (v, min, max) => {
  "worklet";
  return Math.min(Math.max(v, min), max);
};

export default function FoodPhotoHero({ source, size }) {
  const lift = useSharedValue(0); // 0 → resting, 1 → top of the float
  const sway = useSharedValue(0); // -1 … 1 idle sideways tilt
  const dragX = useSharedValue(0); // finger tilt, degrees
  const dragY = useSharedValue(0);
  const shine = useSharedValue(0); // 0 → off the left edge, 1 → off the right

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    lift.value = withRepeat(withTiming(1, { duration: 2400, easing: ease }), -1, true);
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: ease }),
        withTiming(-1, { duration: 3200, easing: ease }),
      ),
      -1,
      true,
    );
    shine.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  // Sideways drags tilt it; vertical drags are left to the page scroll.
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      dragY.value = clamp(e.translationX / 6, -MAX_TILT, MAX_TILT);
      dragX.value = clamp(-e.translationY / 8, -MAX_TILT / 2, MAX_TILT / 2);
    })
    .onFinalize(() => {
      dragX.value = withSpring(0, { damping: 9, stiffness: 120 });
      dragY.value = withSpring(0, { damping: 9, stiffness: 120 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: -FLOAT * lift.value },
      { rotateX: `${4 + dragX.value}deg` },
      { rotateY: `${SWAY * sway.value + dragY.value}deg` },
    ],
  }));

  const floorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lift.value, [0, 1], [0.9, 0.55]),
    transform: [{ scaleX: interpolate(lift.value, [0, 1], [1, 0.82]) }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-size * 1.2, size * 1.2]) },
      { rotate: "20deg" },
    ],
  }));

  const ringBox = size * 1.9;
  const inner = size - BEZEL * 2;

  return (
    <View style={{ width: size, height: size + 34, alignItems: "center" }}>
      {/* Rings fanning out behind the card */}
      <Svg
        pointerEvents="none"
        width={ringBox}
        height={ringBox}
        style={[styles.rings, { left: (size - ringBox) / 2, top: (size - ringBox) / 2 }]}
      >
        <Circle cx="50%" cy="50%" r={size * 0.62} stroke="white" strokeOpacity={0.22} strokeWidth={1} fill="none" />
        <Circle cx="50%" cy="50%" r={size * 0.76} stroke="white" strokeOpacity={0.13} strokeWidth={1} fill="none" />
        <Circle cx="50%" cy="50%" r={size * 0.92} stroke="white" strokeOpacity={0.07} strokeWidth={1} fill="none" />
      </Svg>

      {/* Soft shadow on the floor under the card */}
      <Animated.View pointerEvents="none" style={[styles.floor, { top: size + 4 }, floorStyle]}>
        <Svg width={size * 0.86} height={30}>
          <Defs>
            <RadialGradient id="floorShadow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#06120F" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#06120F" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#floorShadow)" />
        </Svg>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.bezel, { width: size, height: size }, cardStyle]}>
          <View style={[styles.photoBox, { width: inner, height: inner }]}>
            <Image
              source={source}
              cachePolicy="memory-disk"
              transition={150}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />

            {/* Glass sheen from the top-left corner */}
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]}
              locations={[0, 0.3, 0.55]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Light band sweeping across every few seconds */}
            <Animated.View pointerEvents="none" style={[styles.sweep, { height: size * 1.6, top: -size * 0.3 }, shineStyle]}>
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.38)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  rings: {
    position: "absolute",
  },

  floor: {
    position: "absolute",
  },

  // Frosted-glass frame around the photo
  bezel: {
    padding: BEZEL,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    shadowColor: "#06120F",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 14,
  },

  photoBox: {
    borderRadius: 29,
    overflow: "hidden",
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  sweep: {
    position: "absolute",
    left: "35%",
    width: 70,
  },
});
