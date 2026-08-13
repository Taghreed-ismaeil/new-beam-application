import BackButton from "@/components/BackButton";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
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
    Text as SvgText,
} from "react-native-svg";

// A client-side prize wheel — no backend involved. Landing on a real prize
// mints a short voucher code the customer shows the cashier; "Try Again"
// segments just wish them luck next visit.
const SEGMENTS = [
  {
    key: "again1",
    label: "TRY AGAIN",
    desc: "No luck this time — come back and spin again on your next visit!",
    weight: 3,
    color: "#B7BDC6",
    text: "#4A4F57",
    prize: false,
  },
  {
    key: "off5",
    label: "5% OFF 🏷️",
    desc: "5% off your next order",
    weight: 2,
    color: "#FFC9B0",
    text: "#8A3B1E",
    prize: true,
  },
  {
    key: "drink",
    label: "DRINK 🧋",
    desc: "A free drink with your order",
    weight: 2,
    color: "#7FD1CC",
    text: "#0E4F4B",
    prize: true,
  },
  {
    key: "off10",
    label: "10% OFF 🏷️",
    desc: "10% off your next order",
    weight: 2,
    color: "#FF9F73",
    text: "#7A2E0B",
    prize: true,
  },
  {
    key: "again2",
    label: "TRY AGAIN",
    desc: "So close! Better luck on your next visit.",
    weight: 2,
    color: "#CBD0D6",
    text: "#4A4F57",
    prize: false,
  },
  {
    key: "side",
    label: "SIDE 🍟",
    desc: "Free fries with your order",
    weight: 1.4,
    color: "#4FBDB8",
    text: "#0B3A37",
    prize: true,
  },
  {
    key: "off15",
    label: "15% OFF 🏷️",
    desc: "15% off your next order",
    weight: 1,
    color: "#ED5529",
    text: "#FFFFFF",
    prize: true,
  },
  {
    key: "meal",
    label: "MEAL 🍽️",
    desc: "A completely free random meal, on us!",
    weight: 0.8,
    color: "#B084F5",
    text: "#2D1352",
    prize: true,
  },
  {
    key: "grand",
    label: "GRAND 🏆",
    desc: "Free meal + free drink — today's biggest win!",
    weight: 0.3,
    color: "#F7C948",
    text: "#5C3F00",
    prize: true,
  },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;
const SCREEN_W = Dimensions.get("window").width;
const WHEEL_SIZE = Math.min(SCREEN_W - 60, 340);
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS_FRACTION = 0.72;
const PEG_COUNT = SEGMENTS.length * 2;
const SPIN_LAPS = 6;

function toXY(angleDeg, radius, cx = RADIUS, cy = RADIUS) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

function pickWeightedIndex() {
  const total = SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return SEGMENTS.length - 1;
}

function makeVoucherCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return `WHEEL-${code}`;
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

export default function WheelScreen() {
  const spinValue = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [voucherCode, setVoucherCode] = useState(null);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);
    fireHaptics("spin");

    const index = pickWeightedIndex();
    const segment = SEGMENTS[index];
    const centerAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6);
    const targetAngle = 360 * SPIN_LAPS - (centerAngle + jitter);

    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: targetAngle,
      duration: 4200,
      easing: Easing.bezier(0.15, 0.8, 0.15, 1),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setWinner(segment);
      setVoucherCode(segment.prize ? makeVoucherCode() : null);
      fireHaptics(
        segment.key === "grand" ? "grand" : segment.prize ? "win" : "lose",
      );
    });
  }

  const rotateInterpolate = spinValue.interpolate({
    inputRange: [0, 360 * SPIN_LAPS],
    outputRange: ["0deg", `${360 * SPIN_LAPS}deg`],
  });

  const pegPositions = useMemo(
    () => Array.from({ length: PEG_COUNT }, (_, i) => (i * 360) / PEG_COUNT),
    [],
  );

  return (
    <View style={styles.screen}>
      <BackButton />
      <Text style={styles.title}>Wheel of Fortune 🎡</Text>
      <Text style={styles.subtitle}>One free spin — good luck!</Text>

      <View style={styles.wheelArea}>
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

        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
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

              const mid = a1 + SEGMENT_ANGLE / 2;
              const labelPos = toXY(mid, RADIUS * LABEL_RADIUS_FRACTION);
              const upsideDown = mid > 90 && mid < 270;
              const textRotate = upsideDown ? mid + 180 : mid;

              return (
                <G key={seg.key + i}>
                  <Path d={d} fill={seg.color} stroke="#fff" strokeWidth={2} />
                  <G
                    transform={`rotate(${textRotate}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    <SvgText
                      x={labelPos.x}
                      y={labelPos.y}
                      fill={seg.text}
                      fontSize={WHEEL_SIZE < 300 ? 9 : 10}
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {seg.label}
                    </SvgText>
                  </G>
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
                <Stop offset="100%" stopColor="#ED5529" />
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
          {spinning ? "Spinning..." : "SPIN"}
        </Text>
      </TouchableOpacity>

      {winner && (
        <WheelResult
          segment={winner}
          code={voucherCode}
          onClose={() => setWinner(null)}
          onDone={() => router.push("/(tabs)")}
        />
      )}
    </View>
  );
}

function WheelResult({ segment, code, onClose, onDone }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const isGrand = segment.key === "grand";

  const confetti = useMemo(() => {
    if (!segment.prize) return [];
    const count = isGrand ? 40 : 18;
    const colors = isGrand
      ? ["#F7C948", "#FFE59A", "#FFFFFF", "#ED5529"]
      : ["#ED5529", "#4FBDB8", "#FFC9B0", "#FFFFFF"];
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

  return (
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
            {segment.label}
          </Text>
        </View>
        <Text style={styles.resultDesc}>{segment.desc}</Text>

        {code && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Show this to the cashier</Text>
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
              <Text style={styles.doneBtnText}>Great, thanks!</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Okay</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
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
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 60,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#111", marginTop: 6 },
  subtitle: { color: "#999", marginTop: 4, marginBottom: 20 },
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
    backgroundColor: "#ED5529",
    borderRadius: 40,
    paddingVertical: 16,
    paddingHorizontal: 60,
    elevation: 4,
    shadowColor: "#ED5529",
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d0d0dee",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  resultCard: {
    width: "86%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 6,
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
    borderColor: "#ED5529",
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
    color: "#ED5529",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
  },
  resultBtnRow: { width: "100%" },
  doneBtn: {
    backgroundColor: "#111",
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  doneBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
