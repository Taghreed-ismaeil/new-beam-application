import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/* =========================================================
   FOOD PHOTO HERO
   The item photo edge to edge across the top of the page:
   - fills the full width, the way premium food apps show a dish
   - drifts in a slow, endless zoom so the photo feels alive
   - a dark fade at the top keeps the back button readable, and a
     soft fade at the bottom where the info sheet slides over it
   The page lays its content sheet (rounded top corners) over the
   bottom of this hero.
========================================================= */

export default function FoodPhotoHero({ source, width, height }) {
  const zoom = useSharedValue(0); // 0 → 1 = one slow zoom in

  useEffect(() => {
    zoom.set(
      withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [zoom]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(zoom.get(), [0, 1], [1.02, 1.1]) }],
  }));

  return (
    <View style={[styles.hero, { width, height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image
          source={source}
          cachePolicy="memory-disk"
          transition={200}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* top: keeps the back button readable on bright photos */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,16,15,0.45)", "rgba(10,16,15,0)"]}
        style={styles.topShade}
      />

      {/* bottom: soft shade under the sheet's rounded corners */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,16,15,0)", "rgba(10,16,15,0.3)"]}
        style={styles.bottomShade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: "hidden",
    backgroundColor: "#2A2A2A",
  },

  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },

  bottomShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
});
