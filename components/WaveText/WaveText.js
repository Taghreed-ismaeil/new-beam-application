import { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

const WAVE_DURATION = 1800; // ms for one full wave cycle
const WAVE_AMPLITUDE = 6; // px each letter rises/falls
const WAVE_PHASE_STEP = 0.45; // radians between neighbouring letters
const WAVE_SAMPLES = 16; // interpolation points per cycle — more = smoother

// Pinned instead of left to the OS default — the default bold-900 glyph shape
// (and its width) differs a lot between iOS and Android.
const FONT_FAMILY = Platform.select({
  ios: "Avenir Next", // was "Arial Black" — too heavy; Avenir Next is lighter and still clean
  android: "sans-serif-medium", // was "sans-serif-black"
  default: undefined,
});

// memo: parents here re-render often (the ring spins every frame), and
// rebuilding the interpolation nodes each time crashed web with Out of Memory.
const WaveText = memo(function WaveText({ text, color = "#FC4A14" }) {
  const { width } = useWindowDimensions();

  // Arabic letters must stay joined, so Arabic waves word by word (right to left)
  const isArabic = /[؀-ۿ]/.test(text);

  const chars = useMemo(
    () => (isArabic ? text.split(" ") : text.split("")),
    [text, isArabic],
  );

  // Scales with the screen so the whole sentence fits on one line on small phones.
  const fontSize = Math.max(15, Math.min(width * 0.052, 24));

  const progress = useRef(new Animated.Value(0)).current;

  // Restarts itself after every cycle instead of relying on Animated.loop,
  // which can silently stop after a while. Runs as long as it's mounted.
  useEffect(() => {
    let alive = true;
    let current = null;

    function run() {
      if (!alive) return;

      progress.setValue(0);

      current = Animated.timing(progress, {
        toValue: 1,
        duration: WAVE_DURATION,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      });

      current.start(() => run());
    }

    run();

    return () => {
      alive = false;
      current?.stop();
    };
  }, [progress]);

  // Built once — sin sampled over one full cycle, value at 0 equals value
  // at 1, so the loop restarts without any jump.
  const offsets = useMemo(() => {
    const inputRange = Array.from(
      { length: WAVE_SAMPLES + 1 },
      (_, k) => k / WAVE_SAMPLES,
    );

    return chars.map((_, i) => {
      const phase = i * WAVE_PHASE_STEP;

      return progress.interpolate({
        inputRange,
        outputRange: inputRange.map(
          (x) => -WAVE_AMPLITUDE * Math.sin(x * Math.PI * 2 - phase),
        ),
      });
    });
  }, [chars, progress]);

  return (
    <View style={[styles.row, isArabic && styles.rowArabic]}>
      {chars.map((ch, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.char,
            isArabic && styles.word,
            {
              color,
              fontSize,
              transform: [{ translateY: offsets[i] }],
            },
          ]}
        >
          {ch === " " ? " " : ch}
        </Animated.Text>
      ))}
    </View>
  );
});

export default WaveText;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },

  rowArabic: {
    flexDirection: "row-reverse",
  },

  word: {
    marginHorizontal: 4,
  },

  char: {
    fontFamily: FONT_FAMILY,
    fontWeight: "700", // أرفع — كانت 800. RN only accepts 100–900 in steps of 100
    marginHorizontal: 1.5, // نتفة فراغ بين كل حرف وحرف
  },
});
