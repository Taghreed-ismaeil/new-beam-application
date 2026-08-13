import TileImage from "@/components/TileImage";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef } from "react";
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const TIERS = {
  super: {
    title: "SUPER RARE",
    subtitle: "3 pieces revealed at once — this one's special.",
    accent: "#F7C948",
    accentDim: "#8A6A12",
    ringColor: "#FFE59A",
    confettiCount: 46,
    confettiColors: ["#F7C948", "#FFE59A", "#FFFFFF", "#ED5529", "#FFD36E"],
    sparkles: true,
    haptic: "super",
  },
  rare: {
    title: "RARE",
    subtitle: "2 pieces revealed at once — nice find.",
    accent: "#4FA3D1",
    accentDim: "#2E6E96",
    ringColor: "#BFE0F2",
    confettiCount: 20,
    confettiColors: ["#4FA3D1", "#BFE0F2", "#FFFFFF"],
    sparkles: false,
    haptic: "rare",
  },
};

function fireHaptics(level) {
  if (Platform.OS === "web") return;
  try {
    if (level === "super") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
        220,
      );
      setTimeout(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        420,
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // haptics unsupported on this device — celebration still plays visually
  }
}

function ConfettiPiece({ color, delay, startX, shape }) {
  const fall = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const fallDistance = useMemo(() => SCREEN_H * 0.62 + Math.random() * 140, []);
  const drift = useMemo(() => (Math.random() - 0.5) * 160, []);
  const duration = useMemo(() => 1700 + Math.random() * 1100, []);
  const spinDir = useMemo(() => (Math.random() > 0.5 ? 1 : -1), []);
  const spinTurns = useMemo(() => 2 + Math.random() * 3, []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fall, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(spin, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
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
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${360 * spinTurns * spinDir}deg`],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: startX,
        width: shape === "round" ? 7 : 8,
        height: shape === "round" ? 7 : 12,
        borderRadius: shape === "round" ? 4 : 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

function Sparkles({ color }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.05],
  });

  return (
    <Animated.View
      style={[styles.sparkleRing, { transform: [{ rotate }, { scale }] }]}
      pointerEvents="none"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <Text
          key={i}
          style={[
            styles.sparkleGlyph,
            {
              color,
              transform: [{ rotate: `${i * 45}deg` }, { translateY: -92 }],
            },
          ]}
        >
          ✦
        </Text>
      ))}
    </Animated.View>
  );
}

// tier is "rare" or "super" only — "normal" rarity scans never reach this
// component, they render as a plain single-piece reveal instead (see
// app/loyalty/scan.jsx). apiResult is the real /api/loyalty/scan response
// after 2 or 3 real reveals ran back to back, so the art shown here is the
// customer's actual, current collectible progress — not a mockup.
export default function RarityCelebration({
  tier,
  itemName,
  apiResult,
  onContinue,
}) {
  const cfg = TIERS[tier] || TIERS.rare;
  const item = apiResult?.item;

  const cardScale = useRef(new Animated.Value(0.55)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;

  const confetti = useMemo(
    () =>
      Array.from({ length: cfg.confettiCount }, (_, i) => ({
        key: i,
        color: cfg.confettiColors[i % cfg.confettiColors.length],
        delay: Math.random() * 550,
        startX: Math.random() * SCREEN_W,
        shape: i % 3 === 0 ? "round" : "rect",
      })),
    [tier],
  );

  useEffect(() => {
    fireHaptics(cfg.haptic);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6.5,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(badgeBounce, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });
  const badgeScale = badgeBounce.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.6, 1.15, 1],
  });

  return (
    <View style={styles.overlay}>
      {confetti.map((c) => (
        <ConfettiPiece
          key={c.key}
          color={c.color}
          delay={c.delay}
          startX={c.startX}
          shape={c.shape}
        />
      ))}

      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        <View style={styles.imageWrap}>
          <Animated.View
            style={[
              styles.glowRing,
              {
                backgroundColor: cfg.ringColor,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          {cfg.sparkles && <Sparkles color={cfg.accent} />}
          <View style={[styles.imageCircle, { borderColor: cfg.accent }]}>
            {item && (
              <TileImage
                itemId={item.id}
                grayImage={item.grayImage}
                layers={item.layers}
                revealedCount={apiResult.revealedCount ?? 0}
                updatedAt={item.updatedAt}
                size={140}
              />
            )}
          </View>
        </View>

        <Animated.View
          style={[
            styles.badge,
            { borderColor: cfg.accent, transform: [{ scale: badgeScale }] },
          ]}
        >
          <Text style={[styles.badgeText, { color: cfg.accentDim }]}>
            {cfg.title}
          </Text>
        </Animated.View>

        <Text style={styles.itemName}>{itemName}</Text>
        <Text style={styles.subtitle}>{cfg.subtitle}</Text>

        {apiResult?.completed && (
          <View style={styles.voucherBox}>
            <Text style={styles.voucherTitle}>🎉 Collection complete!</Text>
            <Text style={styles.voucherReward}>{item?.rewardValue}</Text>
            <Text style={styles.voucherCode}>
              Code: {apiResult.voucher?.code}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: cfg.accent }]}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d0d0dee",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  card: {
    width: "86%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    gap: 4,
  },
  imageWrap: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  glowRing: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  sparkleRing: {
    position: "absolute",
    width: 1,
    height: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleGlyph: {
    position: "absolute",
    fontSize: 16,
  },
  imageCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  badge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 6,
  },
  badgeText: { fontWeight: "900", fontSize: 14, letterSpacing: 1.5 },
  itemName: { fontSize: 20, fontWeight: "900", color: "#111", marginTop: 4 },
  subtitle: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  voucherBox: {
    backgroundColor: "#e5f5ec",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  voucherTitle: { fontWeight: "800", color: "#2f9e5b" },
  voucherReward: {
    fontWeight: "800",
    fontSize: 15,
    color: "#2f9e5b",
    textAlign: "center",
  },
  voucherCode: {
    fontSize: 16,
    letterSpacing: 1.5,
    color: "#2f9e5b",
    fontWeight: "800",
  },
  continueBtn: {
    borderRadius: 40,
    paddingVertical: 13,
    paddingHorizontal: 30,
    width: "100%",
    alignItems: "center",
  },
  continueBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
