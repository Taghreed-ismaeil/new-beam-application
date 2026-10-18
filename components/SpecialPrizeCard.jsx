import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   SPECIAL PRIZE OF THE MONTH
   Top of the Gifts page. Each month the admin picks one meal as
   the special prize: any QR scan can win it on the spot, without
   finishing a picture. Until a meal is picked (prize null) the
   dish stays under a silver cloche.

   A fine-dining reveal rather than a game: a covered plate on a
   dark stone counter under a warm spotlight, real-looking steam
   escaping from under the cloche (a pre-rendered loop, the same
   idea as the About section's flame frames), dust drifting in the
   light beam and a glint sliding over the polished metal. Every
   loop runs on the native driver, only while Gifts is focused.
========================================================= */

const STEAM_SHEET = require("@/assets/img/steam-sheet.png");
const STEAM_FRAMES = 24; // frames side by side in the sheet (128×192 each)
const STEAM_W = 96;
const STEAM_H = Math.round((STEAM_W * 192) / 128);

const GOLD = "#D9B26A";
const GOLD_SOFT = "#B8924A";
const CREAM = "#F5EBDD";

const SCENE_W = 300;
const SCENE_H = 196;
const PLATE = { cx: 150, cy: 168, rx: 104, ry: 22 };
const DOME = { cx: 150, base: 162, rx: 78, h: 92 };

// steam plumes: where they leave the dish, how fast they loop, mirrored or not
const PLUMES_COVERED = [
  { x: DOME.cx - DOME.rx + 6, y: DOME.base - 10, duration: 2600, flip: false, opacity: 0.95 },
  { x: DOME.cx + DOME.rx - 10, y: DOME.base - 14, duration: 3100, flip: true, opacity: 0.9 },
  { x: DOME.cx, y: DOME.base - DOME.h - 6, duration: 2900, flip: false, opacity: 0.7 },
];
const PLUMES_PRIZE = [
  { x: 118, y: 128, duration: 2600, flip: false, opacity: 0.8 },
  { x: 150, y: 120, duration: 3200, flip: true, opacity: 0.7 },
  { x: 182, y: 130, duration: 2850, flip: false, opacity: 0.75 },
];

// dust motes floating in the beam (scene coordinates)
const MOTES = Array.from({ length: 11 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    x: 92 + r(1) * 116,
    y: 18 + r(2) * 110,
    size: 1.6 + r(3) * 1.8,
    drift: 6 + r(4) * 10,
    duration: 5200 + r(5) * 4200,
    delay: r(6) * 3000,
  };
});

// stepped interpolation: the sheet jumps frame to frame (no sliding between them)
function frameSteps(width) {
  const input = [];
  const output = [];
  for (let k = 0; k < STEAM_FRAMES; k++) {
    input.push(k / STEAM_FRAMES, (k + 1) / STEAM_FRAMES - 0.0001);
    output.push(-k * width, -k * width);
  }
  return { inputRange: input, outputRange: output };
}
const STEPS = frameSteps(STEAM_W);

// Restarts every animation by hand when it finishes, the same way WaveText
// does — Animated.loop can stop after its first round (it does on web).
function useLoops(build) {
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const running = build().map(({ value, make }) => {
        const slot = { current: null };
        const run = () => {
          if (!alive) return;
          value.setValue(0);
          slot.current = make();
          slot.current.start(({ finished }) => finished && run());
        };
        run();
        return slot;
      });
      return () => {
        alive = false;
        running.forEach((slot) => slot.current?.stop());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
}

function Steam({ plume, value }) {
  const translateX = value.interpolate(STEPS);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.steamClip,
        {
          left: plume.x - STEAM_W / 2,
          top: plume.y - STEAM_H + 8,
          opacity: plume.opacity,
          transform: plume.flip ? [{ scaleX: -1 }] : undefined,
        },
      ]}
    >
      <Animated.Image
        source={STEAM_SHEET}
        style={{ width: STEAM_W * STEAM_FRAMES, height: STEAM_H, transform: [{ translateX }] }}
        resizeMode="stretch"
      />
    </View>
  );
}

/** Polished silver cloche + its plate, drawn with metal gradients. */
function CoveredDish() {
  const { cx, base, rx, h } = DOME;
  const dome = `M ${cx - rx} ${base} C ${cx - rx} ${base - h * 1.18}, ${cx + rx} ${base - h * 1.18}, ${cx + rx} ${base} Z`;
  return (
    <Svg width={SCENE_W} height={SCENE_H} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgGradient id="metal" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3b3f43" />
          <Stop offset="0.16" stopColor="#8d9399" />
          <Stop offset="0.3" stopColor="#f2f4f6" />
          <Stop offset="0.42" stopColor="#b9bec3" />
          <Stop offset="0.62" stopColor="#6c7176" />
          <Stop offset="0.82" stopColor="#d6dadd" />
          <Stop offset="1" stopColor="#3a3d41" />
        </SvgGradient>
        <SvgGradient id="metalShade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.75" stopColor="#000" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </SvgGradient>
        <RadialGradient id="warm" cx="0.42" cy="0.18" r="0.6">
          <Stop offset="0" stopColor="#FFD9A0" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#FFD9A0" stopOpacity="0" />
        </RadialGradient>
        <SvgGradient id="rim" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4a4e52" />
          <Stop offset="0.3" stopColor="#e7eaec" />
          <Stop offset="0.7" stopColor="#8b9095" />
          <Stop offset="1" stopColor="#45494d" />
        </SvgGradient>
        <SvgGradient id="knob" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#55595d" />
          <Stop offset="0.4" stopColor="#f5f6f7" />
          <Stop offset="1" stopColor="#5a5e62" />
        </SvgGradient>
      </Defs>
      <Plate />
      {/* contact shadow of the cloche on the plate */}
      <Ellipse cx={cx} cy={base + 2} rx={rx + 4} ry={9} fill="#000" opacity={0.35} />
      <Path d={dome} fill="url(#metal)" />
      <Path d={dome} fill="url(#metalShade)" />
      <Path d={dome} fill="url(#warm)" />
      {/* rim band */}
      <Ellipse cx={cx} cy={base} rx={rx} ry={6} fill="url(#rim)" />
      {/* knob */}
      <Rect x={cx - 3} y={base - h * 0.9 - 9} width={6} height={10} rx={2} fill="url(#knob)" />
      <Ellipse cx={cx} cy={base - h * 0.9 - 11} rx={11} ry={6} fill="url(#knob)" />
      <Ellipse cx={cx - 3} cy={base - h * 0.9 - 13} rx={4} ry={1.6} fill="#fff" opacity={0.8} />
    </Svg>
  );
}

function Plate() {
  const { cx, cy, rx, ry } = PLATE;
  return (
    <>
      <Defs>
        <RadialGradient id="porcelain" cx="0.45" cy="0.35" r="0.75">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.7" stopColor="#e7e2db" />
          <Stop offset="1" stopColor="#b7b0a6" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy + 6} rx={rx + 6} ry={ry + 4} fill="#000" opacity={0.45} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#porcelain)" />
      <Ellipse cx={cx} cy={cy - 1} rx={rx * 0.74} ry={ry * 0.66} fill="#d9d3ca" opacity={0.6} />
      <Ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.55} rx={rx * 0.3} ry={2} fill="#fff" opacity={0.7} />
    </>
  );
}

/**
 * @param {{ prize?: { name?: string, nameEn?: string, imageUrl?: string } | null }} props
 */
export default function SpecialPrizeCard({ prize }) {
  const { t, pick } = useAppLang();
  const hasPrize = !!prize?.imageUrl;
  const plumes = hasPrize ? PLUMES_PRIZE : PLUMES_COVERED;

  const steam = useMemo(() => [0, 1, 2].map(() => new Animated.Value(0)), []);
  const glint = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const motes = useMemo(() => MOTES.map(() => new Animated.Value(0)), []);

  const native = { useNativeDriver: true };
  useLoops(() => [
    ...steam.map((v, i) => ({
      value: v,
      make: () => Animated.timing(v, { toValue: 1, duration: PLUMES_COVERED[i].duration, easing: Easing.linear, ...native }),
    })),
    {
      value: glint,
      make: () =>
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(glint, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), ...native }),
          Animated.delay(2600),
        ]),
    },
    {
      value: breathe,
      make: () =>
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), ...native }),
          Animated.timing(breathe, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), ...native }),
        ]),
    },
    ...motes.map((v, i) => ({
      value: v,
      make: () =>
        Animated.sequence([
          Animated.delay(MOTES[i].delay),
          Animated.timing(v, { toValue: 1, duration: MOTES[i].duration, easing: Easing.inOut(Easing.sin), ...native }),
          Animated.timing(v, { toValue: 0, duration: MOTES[i].duration, easing: Easing.inOut(Easing.sin), ...native }),
        ]),
    })),
  ]);

  const beamOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const glintX = glint.interpolate({ inputRange: [0, 1], outputRange: [-70, DOME.rx * 2 + 40] });

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#E3C27E", "#8A6A2E", "#C9A55A", "#6E5222"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frame}
      >
        <LinearGradient colors={["#2C2723", "#1B1815", "#0F0D0B"]} style={styles.card}>
          {/* label */}
          <View style={styles.labelRow}>
            <View style={styles.labelLine} />
            <Text style={styles.label}>{t("loySpecialBadge")}</Text>
            <View style={styles.labelLine} />
          </View>

          {/* the stage */}
          <View style={styles.scene}>
            {/* spotlight from above */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: beamOpacity }]}>
              <Svg width={SCENE_W} height={SCENE_H}>
                <Defs>
                  <SvgGradient id="cone" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFE6B5" stopOpacity="0.32" />
                    <Stop offset="1" stopColor="#FFE6B5" stopOpacity="0" />
                  </SvgGradient>
                  <RadialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
                    <Stop offset="0" stopColor="#FFDCA3" stopOpacity="0.32" />
                    <Stop offset="1" stopColor="#FFDCA3" stopOpacity="0" />
                  </RadialGradient>
                  <RadialGradient id="source" cx="0.5" cy="0.5" r="0.5">
                    <Stop offset="0" stopColor="#FFF1D6" stopOpacity="0.5" />
                    <Stop offset="1" stopColor="#FFF1D6" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Ellipse cx={150} cy={0} rx={110} ry={70} fill="url(#source)" />
                <Path d={`M 128 0 L 172 0 L ${SCENE_W - 26} ${SCENE_H} L 26 ${SCENE_H} Z`} fill="url(#cone)" />
                <Ellipse cx={PLATE.cx} cy={PLATE.cy + 4} rx={150} ry={34} fill="url(#pool)" />
              </Svg>
            </Animated.View>

            {/* dust in the beam */}
            {MOTES.map((m, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.mote,
                  {
                    left: m.x,
                    top: m.y,
                    width: m.size,
                    height: m.size,
                    borderRadius: m.size,
                    opacity: motes[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.65, 0.1] }),
                    transform: [
                      { translateX: motes[i].interpolate({ inputRange: [0, 1], outputRange: [0, m.drift] }) },
                      { translateY: motes[i].interpolate({ inputRange: [0, 1], outputRange: [0, -m.drift * 0.8] }) },
                    ],
                  },
                ]}
              />
            ))}

            {hasPrize ? (
              <>
                <Svg width={SCENE_W} height={SCENE_H} style={StyleSheet.absoluteFill}>
                  <Plate />
                </Svg>
                <View style={styles.prizeOnPlate}>
                  <Image source={{ uri: imageUrl(prize.imageUrl) }} style={styles.prizeImage} contentFit="cover" transition={250} />
                </View>
              </>
            ) : (
              <>
                <CoveredDish />
                {/* light gliding over the polished dome */}
                <View pointerEvents="none" style={styles.domeClip}>
                  <Animated.View style={[styles.glint, { transform: [{ translateX: glintX }, { rotate: "20deg" }] }]}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0)", "rgba(255,250,240,0.55)", "rgba(255,255,255,0)"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>
              </>
            )}

            {plumes.map((p, i) => (
              <Steam key={i} plume={p} value={steam[i]} />
            ))}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {hasPrize ? pick(prize) : t("loySpecialSoonTitle")}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {hasPrize ? t("loySpecialWinText") : t("loySpecialSoonText")}
          </Text>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },

  frame: {
    borderRadius: 26,
    padding: 1.5,
  },

  card: {
    borderRadius: 25,
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    overflow: "hidden",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  labelLine: {
    width: 26,
    height: 1,
    backgroundColor: GOLD_SOFT,
    opacity: 0.7,
  },

  label: {
    color: GOLD,
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 1.2,
  },

  scene: {
    width: SCENE_W,
    height: SCENE_H,
    marginTop: 4,
  },

  mote: {
    position: "absolute",
    backgroundColor: "#FFF3DC",
  },

  steamClip: {
    position: "absolute",
    width: STEAM_W,
    height: STEAM_H,
    overflow: "hidden",
  },

  // matches the cloche's silhouette closely enough to keep the glint on the metal
  domeClip: {
    position: "absolute",
    left: DOME.cx - DOME.rx,
    top: DOME.base - DOME.h * 0.9,
    width: DOME.rx * 2,
    height: DOME.h * 0.9,
    borderTopLeftRadius: DOME.rx,
    borderTopRightRadius: DOME.rx,
    overflow: "hidden",
  },

  glint: {
    position: "absolute",
    top: -40,
    width: 34,
    height: DOME.h * 2,
  },

  prizeOnPlate: {
    position: "absolute",
    left: PLATE.cx - 70,
    top: PLATE.cy - 118,
    width: 140,
    height: 118,
    borderRadius: 16,
    overflow: "hidden",
  },

  prizeImage: {
    width: "100%",
    height: "100%",
  },

  title: {
    color: CREAM,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },

  subtitle: {
    color: "rgba(245,235,221,0.68)",
    fontSize: 12.5,
    fontWeight: "400",
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
