import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { RNAnimatedText, Text } from "@/lib/arabic-font";

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

// ---------- Arabic ----------
// Arabic letters must stay joined, so the sentence is never split into
// letters. Instead it's drawn whole — correctly shaped and joined — and that
// drawing is cut into thin vertical strips, each riding the same sine wave a
// little later than its neighbour. On screen it waves letter by letter exactly
// like the English line, while the text itself stays one joined sentence.
const STRIP = 6; // px per strip — thinner = smoother wave
// ≈ the English line's phase per pixel (0.45 rad per ~16px letter)
const PHASE_PER_PX = 0.028;
// The strips are placed with absolute x maths; keep that box LTR so the app's
// Arabic (RTL) layout can't mirror it. Native only — web has no `direction`.
const LTR = Platform.OS === "web" ? null : { direction: "ltr" };

function sineOffsets(progress, phases) {
  const inputRange = Array.from({ length: WAVE_SAMPLES + 1 }, (_, k) => k / WAVE_SAMPLES);
  return phases.map((phase) =>
    progress.interpolate({
      inputRange,
      outputRange: inputRange.map((x) => -WAVE_AMPLITUDE * Math.sin(x * Math.PI * 2 - phase)),
    }),
  );
}

const ArabicWave = memo(function ArabicWave({ text, color, fontSize, progress }) {
  const [box, setBox] = useState(null);
  const textStyle = [styles.arabic, { color, fontSize, lineHeight: Math.round(fontSize * 1.6) }];

  // re-measure when the sentence or its size changes
  useEffect(() => setBox(null), [text, fontSize]);

  const strips = box ? Math.ceil(box.w / STRIP) : 0;
  const offsets = useMemo(
    // Arabic reads right to left, so the wave starts at the rightmost strip
    () => sineOffsets(progress, Array.from({ length: strips }, (_, i) => (strips - 1 - i) * STRIP * PHASE_PER_PX)),
    [progress, strips],
  );

  return (
    <View style={styles.arabicRow}>
      {/* invisible copy, only to measure the joined sentence */}
      {!box && (
        <Text
          numberOfLines={1}
          style={[textStyle, styles.measure]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0) setBox({ w: Math.ceil(width) + 1, h: Math.ceil(height) });
          }}
        >
          {text}
        </Text>
      )}

      {box && (
        <View style={[LTR, { width: box.w, height: box.h + WAVE_AMPLITUDE * 2 }]} accessible accessibilityLabel={text}>
          {offsets.map((translateY, i) => (
            <Animated.View
              key={i}
              style={[
                styles.strip,
                { left: i * STRIP, width: STRIP + 0.5, height: box.h + WAVE_AMPLITUDE * 2, transform: [{ translateY }] },
              ]}
            >
              <Text
                numberOfLines={1}
                // min/maxWidth too: web caps Text at its parent's width (the thin strip)
                style={[
                  textStyle,
                  { position: "absolute", top: WAVE_AMPLITUDE, left: -i * STRIP, width: box.w, minWidth: box.w, maxWidth: box.w },
                ]}
              >
                {text}
              </Text>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
});

// memo: parents here re-render often (the ring spins every frame), and
// rebuilding the interpolation nodes each time crashed web with Out of Memory.
const WaveText = memo(function WaveText({ text, color = "#FC4A14" }) {
  const { width } = useWindowDimensions();

  const isArabic = /[؀-ۿ]/.test(text);

  const chars = useMemo(() => (isArabic ? [] : text.split("")), [text, isArabic]);

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
  const offsets = useMemo(
    () => sineOffsets(progress, chars.map((_, i) => i * WAVE_PHASE_STEP)),
    [chars, progress],
  );

  if (isArabic) {
    return (
      <ArabicWave
        text={text.trim()}
        color={color}
        // a touch bigger than the Latin capitals so both lines carry the same weight
        fontSize={Math.round(fontSize * 1.05)}
        progress={progress}
      />
    );
  }

  return (
    <View style={styles.row}>
      {chars.map((ch, i) => (
        <RNAnimatedText
          key={i}
          style={[
            styles.char,
            {
              color,
              fontSize,
              transform: [{ translateY: offsets[i] }],
            },
          ]}
        >
          {ch === " " ? " " : ch}
        </RNAnimatedText>
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

  arabicRow: {
    alignItems: "center",
    justifyContent: "center",
  },

  arabic: {
    fontWeight: "700",
    textAlign: "left",
    includeFontPadding: false,
  },

  // in normal flow (not absolute) so it takes its natural one-line width —
  // the strips then replace it in exactly the same spot
  measure: {
    opacity: 0,
    marginVertical: WAVE_AMPLITUDE,
  },

  strip: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },

  char: {
    fontFamily: FONT_FAMILY,
    fontWeight: "700", // أرفع — كانت 800. RN only accepts 100–900 in steps of 100
    marginHorizontal: 1.5, // نتفة فراغ بين كل حرف وحرف
  },
});
