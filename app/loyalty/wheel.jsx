import BackButton from "@/components/BackButton";
import GiftsBackdrop from "@/components/GiftsBackdrop";
import RarityCelebration from "@/components/RarityCelebration";
import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { LinearGradient as Gradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// The spin itself happens server-side (POST /api/loyalty/wheel/spin) — it
// picks the weighted segment and, if it's a prize, mints a real Voucher row
// so it actually shows up on My Rewards. This SEGMENTS array is the visual
// side only (colors, description, wheel text); keep key/weight/prize in sync
// with WHEEL_SEGMENTS in backend/src/routes/loyalty.ts.
// wheelLabel is the short text drawn on the wheel slice (no emoji); the emoji
// lives only in `label`, which is shown on the result card.
// celebration: the big prizes (15% off, free meal, grand) get the SUPER RARE
// party, the smaller ones (5%/10% off, drink, fries) the RARE party, and
// "try again" gets no party — just the plain result card.
const SEGMENTS = [
  {
    key: "again1",
    label: "TRY AGAIN",
    wheelLabel: "TRY AGAIN",
    desc: "No luck this time — come back and spin again on your next visit!",
    labelAr: "حاول مرة ثانية",
    wheelLabelAr: "حظ أوفر",
    descAr: "ما زبطت هالمرة — ارجع لف مرة ثانية بزيارتك الجاية!",
    weight: 3,
    color: "#B7BDC6",
    text: "#4A4F57",
    prize: false,
  },
  {
    key: "off5",
    label: "5% OFF 🏷️",
    wheelLabel: "5% OFF",
    desc: "5% off your next order",
    labelAr: "خصم 5% 🏷️",
    wheelLabelAr: "خصم 5%",
    descAr: "خصم 5% على طلبك الجاي",
    weight: 2,
    color: "#FFC9B0",
    text: "#8A3B1E",
    prize: true,
    celebration: "rare",
  },
  {
    key: "drink",
    label: "DRINK 🧋",
    wheelLabel: "DRINK",
    desc: "A free drink with your order",
    labelAr: "مشروب 🧋",
    wheelLabelAr: "مشروب",
    descAr: "مشروب مجاني مع طلبك",
    weight: 2,
    color: "#7FD1CC",
    text: "#0E4F4B",
    prize: true,
    celebration: "rare",
  },
  {
    key: "off10",
    label: "10% OFF 🏷️",
    wheelLabel: "10% OFF",
    desc: "10% off your next order",
    labelAr: "خصم 10% 🏷️",
    wheelLabelAr: "خصم 10%",
    descAr: "خصم 10% على طلبك الجاي",
    weight: 2,
    color: "#FF9F73",
    text: "#7A2E0B",
    prize: true,
    celebration: "rare",
  },
  {
    key: "again2",
    label: "TRY AGAIN",
    wheelLabel: "TRY AGAIN",
    desc: "So close! Better luck on your next visit.",
    labelAr: "حاول مرة ثانية",
    wheelLabelAr: "حظ أوفر",
    descAr: "قرّبت! حظ أوفر بزيارتك الجاية.",
    weight: 2,
    color: "#CBD0D6",
    text: "#4A4F57",
    prize: false,
  },
  {
    key: "side",
    label: "SIDE 🍟",
    wheelLabel: "FREE SIDE",
    desc: "Free fries with your order",
    labelAr: "طبق جانبي 🍟",
    wheelLabelAr: "جانبي مجاني",
    descAr: "بطاطا مجانية مع طلبك",
    weight: 1.4,
    color: "#4FBDB8",
    text: "#0B3A37",
    prize: true,
    celebration: "rare",
  },
  {
    key: "off15",
    label: "15% OFF 🏷️",
    wheelLabel: "15% OFF",
    desc: "15% off your next order",
    labelAr: "خصم 15% 🏷️",
    wheelLabelAr: "خصم 15%",
    descAr: "خصم 15% على طلبك الجاي",
    weight: 1,
    color: "#FC4A14",
    text: "#FFFFFF",
    prize: true,
    celebration: "super",
  },
  {
    key: "meal",
    label: "MEAL 🍽️",
    wheelLabel: "FREE MEAL",
    desc: "A completely free random meal, on us!",
    labelAr: "وجبة 🍽️",
    wheelLabelAr: "وجبة مجانية",
    descAr: "وجبة عشوائية مجانية بالكامل، علينا!",
    weight: 0.8,
    color: "#B084F5",
    text: "#2D1352",
    prize: true,
    celebration: "super",
  },
  {
    key: "grand",
    label: "GRAND 🏆",
    wheelLabel: "GRAND",
    desc: "Free meal + free drink — today's biggest win!",
    labelAr: "الجايزة الكبرى 🏆",
    wheelLabelAr: "الكبرى",
    descAr: "وجبة مجانية + مشروب مجاني — أكبر ربحة اليوم!",
    weight: 0.3,
    color: "#F7C948",
    text: "#5C3F00",
    prize: true,
    celebration: "super",
  },
];

// Brand palette (same as the Gifts / menu pages)
const ORANGE = "#FC4A14";
const TEAL = "#005751";
const CREAM = "#FFF9F4";

const SEGMENT_ANGLE = 360 / SEGMENTS.length;
const SCREEN_W = Dimensions.get("window").width;
const WHEEL_SIZE = Math.min(SCREEN_W - 60, 340);
const RADIUS = WHEEL_SIZE / 2;
const PEG_COUNT = SEGMENTS.length * 2;
// 5 full turns + up to one more to reach the slice: ~1980° on average, the
// angle the pre-rendered tick track (wheel-spin.m4a) was timed for.
const SPIN_LAPS = 5;

// The wheel is drawn with absolute x/y maths — keep it LTR so the Arabic layout
// doesn't mirror the label positions against the SVG slices. (Native only:
// react-native-web has no `direction` style and the web layout isn't flipped.)
const WHEEL_LTR = Platform.OS === "web" ? null : { direction: "ltr" };

const mod360 = (deg) => ((deg % 360) + 360) % 360;

// Label box runs radially from just outside the hub to just inside the pegs.
const HUB_CLEARANCE = 32;
const RIM_CLEARANCE = 18;
const LABEL_WIDTH = RADIUS - HUB_CLEARANCE - RIM_CLEARANCE;
const LABEL_RADIUS = HUB_CLEARANCE + LABEL_WIDTH / 2;
const LABEL_HEIGHT = 26;
const LABEL_FONT = WHEEL_SIZE < 300 ? 13 : 15;

function toXY(angleDeg, radius, cx = RADIUS, cy = RADIUS) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

function fireHaptics(kind) {
  if (Platform.OS === "web") return;
  try {
    if (kind === "spin") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === "grand") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
        200,
      );
    } else if (kind === "win")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // no haptics available — visuals still play
  }
}

// The "clack-clack" of the pegs passing the pointer, slowing down with the wheel.
// It's one pre-rendered track (assets/sounds/wheel-spin.m4a, ticks timed to the
// same easing + duration as the spin) started once per spin — firing a separate
// seek/play at the audio player for every peg made the spin stutter.
const SPIN_SOUND = require("@/assets/sounds/wheel-spin.m4a");
const SPIN_DURATION = 4200;
const SPIN_EASING = Easing.bezier(0.15, 0.8, 0.15, 1);

// Sad "wah-wah-waaah" for landing on try again — the prizes have their own
// celebration sounds (RarityCelebration).
const LOSE_SOUND = require("@/assets/sounds/wheel-lose.m4a");

function playFromStart(p) {
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // audio unavailable — the wheel still works silently
  }
}

function useSpinSound() {
  const spinPlayer = useRef(null);
  const losePlayer = useRef(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    try {
      spinPlayer.current = createAudioPlayer(SPIN_SOUND);
      losePlayer.current = createAudioPlayer(LOSE_SOUND);
    } catch {
      // audio unavailable
    }
    return () => {
      for (const p of [spinPlayer.current, losePlayer.current]) {
        try {
          p?.remove();
        } catch {
          // already released
        }
      }
    };
  }, []);

  return {
    start: () => playFromStart(spinPlayer.current),
    stop() {
      try {
        spinPlayer.current?.pause();
      } catch {
        // already released
      }
    },
    lose: () => playFromStart(losePlayer.current),
  };
}

export default function WheelScreen() {
  const { t, isRTL } = useAppLang();
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinSound = useSpinSound();
  const [spinning, setSpinning] = useState(false);
  // Where the wheel came to rest (0–360°). Labels are oriented from this so
  // they read right-side up wherever they end up after a spin.
  const [restAngle, setRestAngle] = useState(0);
  const restRef = useRef(0);
  const [winner, setWinner] = useState(null);
  const [voucherCode, setVoucherCode] = useState(null);
  const [error, setError] = useState("");

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);
    setError("");
    fireHaptics("spin");

    // The wheel doesn't move until the server answers — it decides the prize
    // (and mints the real voucher), so the wheel can only ever land on
    // whatever it actually picked, not something the client made up.
    let index, voucher;
    try {
      const res = await apiRequest("/api/loyalty/wheel/spin", {
        method: "POST",
      });
      index = SEGMENTS.findIndex((s) => s.key === res.key);
      if (index < 0) index = res.index ?? 0;
      voucher = res.voucher;
    } catch {
      setSpinning(false);
      setError(t("loyErrGeneric"));
      return;
    }

    const segment = SEGMENTS[index];
    const centerAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6);
    // Spin onward from wherever the wheel last stopped (no snap back to 0):
    // SPIN_LAPS full turns plus whatever lands the winning slice under the pointer.
    const from = restRef.current;
    const landing = mod360(-(centerAngle + jitter));
    const targetAngle = from + 360 * SPIN_LAPS + mod360(landing - from);

    spinSound.start();
    Animated.timing(spinValue, {
      toValue: targetAngle,
      duration: SPIN_DURATION,
      easing: SPIN_EASING,
      useNativeDriver: true,
    }).start(() => {
      restRef.current = landing;
      spinValue.setValue(landing); // same position, just without the extra laps
      setRestAngle(landing);
      spinSound.stop();
      if (!segment.prize) spinSound.lose();
      setSpinning(false);
      setWinner(segment);
      setVoucherCode(voucher?.code ?? null);
      fireHaptics(
        segment.key === "grand" ? "grand" : segment.prize ? "win" : "lose",
      );
    });
  }

  // linear deg mapping, extended past the range for any number of laps
  const rotateInterpolate = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const pegPositions = useMemo(
    () => Array.from({ length: PEG_COUNT }, (_, i) => (i * 360) / PEG_COUNT),
    [],
  );

  return (
    <View style={styles.screen}>
      <GiftsBackdrop spot={{ top: 118 - WHEEL_SIZE * 0.12, size: WHEEL_SIZE * 1.25 }} />
      <BackButton />
      <Text style={styles.title}>{t("loyWheelTitle")}</Text>
      <Text style={styles.subtitle}>{t("loyWheelSub")}</Text>

      <View style={[styles.wheelArea, WHEEL_LTR]}>
        {/* fixed drop shadow disc, sits behind everything, gives the whole thing lift off the page */}
        <View style={styles.wheelShadow} />

        {/* fixed metal bezel housing — does not spin, like a real cabinet frame */}
        <Svg
          width={WHEEL_SIZE + 16}
          height={WHEEL_SIZE + 16}
          style={styles.bezelSvg}
        >
          <Defs>
            <LinearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF6D8" />
              <Stop offset="35%" stopColor="#E7B94A" />
              <Stop offset="65%" stopColor="#B9822A" />
              <Stop offset="100%" stopColor="#F4D888" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={(WHEEL_SIZE + 16) / 2}
            cy={(WHEEL_SIZE + 16) / 2}
            r={(WHEEL_SIZE + 16) / 2 - 3}
            fill="none"
            stroke="url(#bezelGrad)"
            strokeWidth={10}
          />
        </Svg>

        <View style={styles.pointerWrap}>
          <View style={styles.pointerShadow} />
          <View style={styles.pointerTriangle} />
          <View style={styles.pointerHighlight} />
        </View>

        {/* Hardware layer on Android: the GPU rotates one cached texture per frame
            instead of re-drawing 9 SVG slices + labels + pegs. (No shouldRasterizeIOS:
            in the Arabic/RTL layout it rendered the whole wheel mirrored.) */}
        <Animated.View
          style={{ transform: [{ rotate: rotateInterpolate }] }}
          renderToHardwareTextureAndroid
        >
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            <Defs>
              <RadialGradient id="pegShine" cx="35%" cy="30%" r="70%">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="100%" stopColor="#D8CFE0" />
              </RadialGradient>
            </Defs>

            {SEGMENTS.map((seg, i) => {
              const a1 = i * SEGMENT_ANGLE;
              const a2 = (i + 1) * SEGMENT_ANGLE;
              const p1 = toXY(a1, RADIUS - 2);
              const p2 = toXY(a2, RADIUS - 2);
              const large = a2 - a1 > 180 ? 1 : 0;
              const d = `M ${RADIUS} ${RADIUS} L ${p1.x} ${p1.y} A ${RADIUS - 2} ${RADIUS - 2} 0 ${large} 1 ${p2.x} ${p2.y} Z`;

              return (
                <G key={seg.key + i}>
                  <Path d={d} fill={seg.color} stroke="#fff" strokeWidth={2} />
                </G>
              );
            })}

            {/* little pegs mounted on the rim, like a real carnival wheel */}
            {pegPositions.map((angle, i) => {
              const p = toXY(angle, RADIUS - 9);
              return (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={3.4}
                  fill="url(#pegShine)"
                  stroke="#00000022"
                  strokeWidth={0.5}
                />
              );
            })}
          </Svg>

          {/* Labels are plain RN <Text>, not SvgText: react-native-svg draws Arabic
              with doubled/misplaced glyphs on iOS. Every label gets the same box
              and font size, centered between the hub and the rim, and rotates
              with the wheel since it lives inside the spinning view. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {SEGMENTS.map((seg, i) => {
              const mid = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
              // never upside down: the bottom half gets flipped 180°
              // flip on the half where it would read upside down — judged by where
              // the slice is on screen now (mid + restAngle), not on the wheel
              const textRotate = mod360(mid + restAngle) >= 180 ? mid + 90 : mid - 90;
              const pos = toXY(mid, LABEL_RADIUS);
              return (
                <View
                  key={seg.key + i}
                  style={[
                    styles.labelBox,
                    {
                      left: pos.x - LABEL_WIDTH / 2,
                      top: pos.y - LABEL_HEIGHT / 2,
                      transform: [{ rotate: `${textRotate}deg` }],
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[
                      styles.labelText,
                      // Arabic glyphs read smaller at the same size — give them 2pt more
                      { color: seg.text, fontSize: isRTL ? LABEL_FONT + 2 : LABEL_FONT },
                      !isRTL && styles.labelTextLatin,
                    ]}
                  >
                    {isRTL ? seg.wheelLabelAr : seg.wheelLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* fixed glossy dome highlight — sits on top, doesn't spin, like light bouncing off a glass cover */}
        <Svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          style={styles.glossSvg}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="gloss" cx="32%" cy="24%" r="65%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="45%" stopColor="#FFFFFF" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="vignette" cx="50%" cy="50%" r="52%">
              <Stop offset="78%" stopColor="#000000" stopOpacity={0} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.18} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={RADIUS}
            cy={RADIUS}
            r={RADIUS - 2}
            fill="url(#vignette)"
          />
          <Circle cx={RADIUS} cy={RADIUS} r={RADIUS - 2} fill="url(#gloss)" />
        </Svg>

        <View style={styles.hub}>
          <Svg width={48} height={48} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="hubGrad" cx="35%" cy="30%" r="75%">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="55%" stopColor="#FFE8D6" />
                <Stop offset="100%" stopColor="#FC4A14" />
              </RadialGradient>
            </Defs>
            <Circle
              cx={24}
              cy={24}
              r={22}
              fill="url(#hubGrad)"
              stroke="#C63E17"
              strokeWidth={1.5}
            />
          </Svg>
          <Text style={styles.hubText}>⭐</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.spinBtn, spinning && styles.spinBtnDisabled]}
        onPress={spin}
        disabled={spinning}
        activeOpacity={0.85}
      >
        <Text style={styles.spinBtnText}>
          {spinning ? t("loySpinning") : t("loySpin")}
        </Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {winner?.celebration && (
        <RarityCelebration
          tier={winner.celebration}
          itemName={isRTL ? winner.descAr : winner.desc}
          prize={{
            emoji: winner.label.split(" ").pop(),
            badge: isRTL ? winner.labelAr : winner.label,
            code: voucherCode,
            codeLabel: t("loyShowCashier"),
            revealLabel: t("loyWheelTitle"),
            continueLabel: t("loyGreatThanks"),
          }}
          // A real prize takes you straight to My Rewards to redeem the code.
          onContinue={() => router.replace("/loyalty/vouchers")}
        />
      )}

      {winner && !winner.celebration && (
        <WheelResult
          segment={winner}
          code={voucherCode}
          onClose={() => setWinner(null)}
          // A real prize takes you straight to My Rewards to redeem the code
          // at the restaurant; "Try again" just closes the card.
          onDone={() => router.replace("/loyalty/vouchers")}
        />
      )}
    </View>
  );
}

function WheelResult({ segment, code, onClose, onDone }) {
  const { t, isRTL } = useAppLang();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const isGrand = segment.key === "grand";

  const confetti = useMemo(() => {
    if (!segment.prize) return [];
    const count = isGrand ? 40 : 18;
    const colors = isGrand
      ? ["#F7C948", "#FFE59A", "#FFFFFF", "#FC4A14"]
      : ["#FC4A14", "#4FBDB8", "#FFC9B0", "#FFFFFF"];
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      color: colors[i % colors.length],
      delay: Math.random() * 450,
      startX: Math.random() * SCREEN_W,
    }));
  }, [segment.key]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6.5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
    if (isGrand) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  // A native Modal, like the prize celebrations: it always covers the real full
  // screen and centres the card, instead of an absolute overlay that could end
  // up squeezed under the spin button.
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
      {confetti.map((c) => (
        <ConfettiBit
          key={c.key}
          color={c.color}
          delay={c.delay}
          startX={c.startX}
        />
      ))}

      <Animated.View
        style={[styles.resultCard, { opacity, transform: [{ scale }] }]}
      >
        <Gradient
          colors={segment.prize ? [ORANGE, TEAL] : ["#CBD0D6", "#8A929C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.resultAccent}
        />
        {isGrand && (
          <Animated.View
            style={[
              styles.grandGlow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
        )}
        <Text style={styles.resultEmoji}>
          {segment.prize ? (isGrand ? "🏆" : "🎉") : "🍀"}
        </Text>
        <View style={[styles.resultBadge, { backgroundColor: segment.color }]}>
          <Text style={[styles.resultBadgeText, { color: segment.text }]}>
            {isRTL ? segment.labelAr : segment.label}
          </Text>
        </View>
        <Text style={styles.resultDesc}>{isRTL ? segment.descAr : segment.desc}</Text>

        {code && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>{t("loyShowCashier")}</Text>
            <Text style={styles.codeText}>{code}</Text>
          </View>
        )}

        <View style={styles.resultBtnRow}>
          {segment.prize ? (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onDone}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>{t("loyGreatThanks")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>{t("loyOkay")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
    </Modal>
  );
}

function ConfettiBit({ color, delay, startX }) {
  const fall = useRef(new Animated.Value(0)).current;
  const fallDistance = useMemo(
    () => Dimensions.get("window").height * 0.6 + Math.random() * 120,
    [],
  );
  const drift = useMemo(() => (Math.random() - 0.5) * 150, []);
  const duration = useMemo(() => 1600 + Math.random() * 1000, []);
  const spinDeg = useMemo(() => Math.round((Math.random() - 0.5) * 900), []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(fall, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, fallDistance],
  });
  const translateX = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [0, drift],
  });
  const opacity = fall.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });
  const rotate = fall.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${spinDeg}deg`],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: startX,
        width: 7,
        height: 11,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  labelBox: {
    position: "absolute",
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: {
    width: "100%",
    textAlign: "center",
    fontWeight: "900",
    includeFontPadding: false,
  },
  labelTextLatin: {
    fontStyle: "italic",
    letterSpacing: 0.3,
  },

  screen: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: "center",
    paddingTop: 60,
    overflow: "hidden",
  },

  title: { fontSize: 24, fontWeight: "900", color: TEAL, marginTop: 6 },
  subtitle: { color: "#6E7C79", fontWeight: "600", marginTop: 4, marginBottom: 20 },
  wheelArea: {
    width: WHEEL_SIZE + 16,
    height: WHEEL_SIZE + 16,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelShadow: {
    position: "absolute",
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: "#000",
    top: 14,
    opacity: 0.22,
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  bezelSvg: { position: "absolute" },
  glossSvg: { position: "absolute" },
  pointerWrap: {
    position: "absolute",
    top: -10,
    zIndex: 10,
    alignItems: "center",
  },
  pointerShadow: {
    position: "absolute",
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderTopWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#00000030",
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderTopWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#E7B94A",
  },
  pointerHighlight: {
    position: "absolute",
    top: 3,
    left: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFF3C4",
  },
  hub: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  hubText: { fontSize: 18 },
  spinBtn: {
    marginTop: 30,
    backgroundColor: "#FC4A14",
    borderRadius: 40,
    paddingVertical: 16,
    paddingHorizontal: 60,
    elevation: 4,
    shadowColor: "#FC4A14",
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  spinBtnDisabled: { opacity: 0.6 },
  spinBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 1,
  },
  errorText: {
    color: "#c0392b",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4,33,30,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultCard: {
    width: "86%",
    maxWidth: 340,
    backgroundColor: "#FFFBF7",
    borderRadius: 28,
    paddingTop: 34,
    paddingBottom: 26,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    shadowColor: "#04211E",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 16,
  },
  resultAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  grandGlow: {
    position: "absolute",
    top: 10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFE59A",
  },
  resultEmoji: { fontSize: 46, marginBottom: 4 },
  resultBadge: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginBottom: 8,
  },
  resultBadgeText: { fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  resultDesc: {
    textAlign: "center",
    color: "#555",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  codeBox: {
    backgroundColor: "#fff5e8",
    borderWidth: 2,
    borderColor: "#FC4A14",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  codeLabel: { color: "#999", fontSize: 11, marginBottom: 4 },
  codeText: {
    color: "#FC4A14",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
  },
  resultBtnRow: { width: "100%" },
  doneBtn: {
    backgroundColor: TEAL,
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  doneBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
