import TileImage from "@/components/TileImage";
import { useAppLang } from "@/lib/app-lang";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, RNAnimatedText } from "@/lib/arabic-font";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// One teal ramp, used everywhere on this screen instead of a flat single teal —
// depth (gradient background + glow blobs) at the dark end, badges/rings at the
// light end. Orange stays reserved for exactly one accent (the super-rare glint)
// instead of splitting the whole screen between two competing brand colors.
const TEAL_950 = "#04211E";
const TEAL_800 = "#0A4A44";
const TEAL_600 = "#0E6E64";
const TEAL_500 = "#005751";
const TEAL_300 = "#5FC9BC";
const TEAL_150 = "#BDE9E1";
const TEAL_050 = "#E8F5F2";
const CARD_BASE = "#FFFBF7";
const ORANGE_GLINT = "#FC4A14";
const ORANGE_DARK = "#C94320";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_ORANGE_DEEP = "#FFE1D3";

const TIERS = {
  super: {
    title: "SUPER RARE",
    subtitle: "5 pieces revealed at once — this one's special.",
    titleAr: "نادرة جداً",
    subtitleAr: "انكشفت 5 قطع مرة وحدة — هاي مميزة.",
    badgeGradient: [TEAL_600, TEAL_950],
    badgeTextColor: "#F2FBFA",
    badgeDot: TEAL_300,
    ring: TEAL_300,
    accent: TEAL_300,
    orbColors: [TEAL_300, TEAL_150],
    topGradient: [TEAL_300, TEAL_500, TEAL_800],
    ctaGradient: [TEAL_500, TEAL_950],
    confettiCount: 110,
    confettiWaves: 3,
    confettiColors: [TEAL_800, TEAL_600, TEAL_500, TEAL_300, TEAL_150, ORANGE_GLINT, "#FFD166", "#FFFFFF"],
    burstCount: 40,
    fireworks: 6,
    fireworkColors: [TEAL_300, ORANGE_GLINT, "#FFD166", TEAL_150],
    emojiRain: ["🏆", "🎉", "⭐", "✨", "🎊", "👏"],
    emojiCount: 20,
    flash: 0.85,
    cardPulses: 3,
    sparkles: true,
    haptic: "super",
    sound: require("@/assets/sounds/super-celebration.wav"),
  },
  rare: {
    title: "RARE",
    subtitle: "3 pieces revealed at once — nice find.",
    titleAr: "نادرة",
    subtitleAr: "انكشفت 3 قطع مرة وحدة — لقطة حلوة.",
    badgeGradient: [LIGHT_ORANGE, LIGHT_ORANGE_DEEP],
    badgeTextColor: ORANGE_DARK,
    badgeDot: ORANGE_GLINT,
    ring: LIGHT_ORANGE_DEEP,
    accent: ORANGE_GLINT,
    orbColors: [ORANGE_GLINT, LIGHT_ORANGE_DEEP],
    topGradient: [LIGHT_ORANGE_DEEP, ORANGE_GLINT, ORANGE_DARK],
    ctaGradient: [ORANGE_GLINT, ORANGE_DARK],
    confettiCount: 50,
    confettiWaves: 2,
    confettiColors: [ORANGE_GLINT, LIGHT_ORANGE_DEEP, ORANGE_DARK, "#FFD166", "#FFFFFF"],
    burstCount: 22,
    fireworks: 0,
    emojiRain: ["🎉", "✨"],
    emojiCount: 6,
    flash: 0.45,
    cardPulses: 1,
    sparkles: false,
    haptic: "rare",
    sound: require("@/assets/sounds/rare-celebration.wav"),
  },
  normal: {
    title: "PIECE FOUND",
    subtitle: "1 piece revealed — keep collecting.",
    titleAr: "لقيت قطعة",
    subtitleAr: "انكشفت قطعة وحدة — كمّل جمع.",
    badgeGradient: [TEAL_050, TEAL_150],
    badgeTextColor: TEAL_800,
    badgeDot: TEAL_500,
    ring: TEAL_050,
    accent: TEAL_500,
    orbColors: [TEAL_300, TEAL_150],
    topGradient: [TEAL_150, TEAL_500, TEAL_800],
    ctaGradient: [TEAL_500, TEAL_800],
    confettiCount: 10,
    confettiWaves: 1,
    confettiColors: [TEAL_500, TEAL_300, "#FFFFFF"],
    burstCount: 0,
    fireworks: 0,
    emojiRain: [],
    emojiCount: 0,
    flash: 0,
    cardPulses: 0,
    sparkles: false,
    haptic: "normal",
    sound: null,
  },
};

function fireHaptics(level) {
  if (Platform.OS === "web") return;

  try {
    if (level === "super") {
      // Timed to the fanfare hits (0.6s, 0.98s) and the final chord (1.6s).
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      [600, 980, 1600, 1750, 1900].forEach((ms) =>
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), ms),
      );
    } else if (level === "rare") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 420);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics unsupported — visual celebration still plays.
  }
}

// Fanfare + applause for the tier. Returns a cleanup that stops and releases the player.
function playCelebrationSound(source) {
  if (!source) return () => {};

  let player = null;
  try {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player = createAudioPlayer(source);
    player.play();
  } catch {
    // Audio unavailable — visual celebration still plays.
  }

  return () => {
    try {
      player?.pause();
      player?.remove();
    } catch {
      // already released
    }
  };
}

// Confetti cannon — pieces shoot up and out from behind the card, then fall.
function BurstPiece({ color, delay }) {
  const p = useRef(new Animated.Value(0)).current;

  const angle = useMemo(() => -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1, []);
  const power = useMemo(() => 150 + Math.random() * 190, []);
  const duration = useMemo(() => 1500 + Math.random() * 900, []);
  const turns = useMemo(() => (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3), []);
  const size = useMemo(() => 6 + Math.random() * 5, []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dx = Math.cos(angle) * power;
  const dy = Math.sin(angle) * power;

  // Rise along the launch angle, then gravity pulls it down past the start.
  const translateX = p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, dx * 0.85, dx * 1.25] });
  const translateY = p.interpolate({
    inputRange: [0, 0.35, 0.6, 1],
    outputRange: [0, dy, dy * 0.7, SCREEN_H * 0.45],
  });
  const opacity = p.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 * turns}deg`] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: SCREEN_H * 0.42,
        left: SCREEN_W / 2,
        width: size,
        height: size * 1.5,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    />
  );
}

// A single firework: a ring of sparks exploding outward from one point.
function Firework({ x, y, color, delay }) {
  const p = useRef(new Animated.Value(0)).current;
  const SPARKS = 14;
  const radius = useMemo(() => 60 + Math.random() * 45, []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(p, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = p.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 0.9, 0] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y }}>
      {Array.from({ length: SPARKS }, (_, i) => {
        const a = (i / SPARKS) * Math.PI * 2;
        const tx = p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * radius] });
        // slight droop so it reads as a real firework
        const ty = p.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(a) * radius + 22],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
              opacity,
              transform: [{ translateX: tx }, { translateY: ty }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
}

function EmojiDrop({ emoji, delay, startX }) {
  const fall = useRef(new Animated.Value(0)).current;
  const duration = useMemo(() => 2600 + Math.random() * 1600, []);
  const sway = useMemo(() => (Math.random() - 0.5) * 70, []);
  const size = useMemo(() => 22 + Math.random() * 14, []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(fall, { toValue: 1, duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-50, SCREEN_H + 40] });
  const translateX = fall.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, sway, -sway * 0.5] });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ["-15deg", "25deg"] });

  return (
    <RNAnimatedText
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: startX,
        fontSize: size,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      {emoji}
    </RNAnimatedText>
  );
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

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-20, fallDistance] });
  const translateX = fall.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const opacity = fall.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
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

// Ambient background depth — two soft blurred discs drifting slowly behind the
// card, the "teal in every shade" wash that makes the backdrop feel alive
// instead of a flat gradient.
function GlowOrbs({ colorA, colorB }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const shiftA = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const shiftB = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View
        style={[
          styles.orb,
          {
            width: SCREEN_W * 0.9,
            height: SCREEN_W * 0.9,
            top: -SCREEN_W * 0.35,
            left: -SCREEN_W * 0.3,
            backgroundColor: colorA,
            opacity: 0.3,
            transform: [{ translateY: shiftA }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: SCREEN_W * 0.75,
            height: SCREEN_W * 0.75,
            bottom: -SCREEN_W * 0.3,
            right: -SCREEN_W * 0.25,
            backgroundColor: colorB,
            opacity: 0.35,
            transform: [{ translateY: shiftB }],
          },
        ]}
      />
      <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFillObject} />
    </View>
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

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] });

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
            { color, transform: [{ rotate: `${i * 45}deg` }, { translateY: -94 }] },
          ]}
        >
          ✦
        </Text>
      ))}
    </Animated.View>
  );
}

/**
 * Full-screen celebration for a lucky result. Used by gift/item QR scans (shows
 * the collection tile) and by the lucky wheel (pass `prize` instead: an emoji,
 * a badge text, an optional voucher code and button label replace the tile).
 */
export default function RarityCelebration({ tier, itemName, apiResult, onContinue, prize }) {
  const cfg = TIERS[tier] || TIERS.normal;
  const { t, isRTL } = useAppLang();
  const item = apiResult?.item;

  // Navigating away while a native <Modal> is still visible can leave it orphaned on
  // screen on iOS (the modal is presented on the view controller that's being replaced,
  // so React unmounting this component doesn't reliably dismiss it). Closing the modal
  // first and only navigating once it's actually gone (via onDismiss, iOS-only) avoids
  // the stuck-card-over-Gifts bug; Android's Modal has no such issue, so it can navigate
  // as soon as visible flips to false.
  const [modalVisible, setModalVisible] = useState(true);

  function handleContinue() {
    setModalVisible(false);
    if (Platform.OS !== "ios") onContinue();
  }

  const cardScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(cfg.flash)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Waves ~0.9s apart so the confetti keeps coming instead of one single drop.
  const confetti = useMemo(
    () =>
      Array.from({ length: cfg.confettiCount }, (_, i) => ({
        key: i,
        color: cfg.confettiColors[i % cfg.confettiColors.length],
        delay: (i % cfg.confettiWaves) * 900 + Math.random() * 550,
        startX: Math.random() * SCREEN_W,
        shape: i % 3 === 0 ? "round" : "rect",
      })),
    [tier],
  );

  const bursts = useMemo(
    () =>
      Array.from({ length: cfg.burstCount }, (_, i) => ({
        key: i,
        color: cfg.confettiColors[i % cfg.confettiColors.length],
        // super gets a second cannon shot on the final chord
        delay: tier === "super" && i % 2 ? 1600 : 120 + Math.random() * 120,
      })),
    [tier],
  );

  const fireworks = useMemo(
    () =>
      Array.from({ length: cfg.fireworks }, (_, i) => ({
        key: i,
        x: SCREEN_W * (0.15 + Math.random() * 0.7),
        y: SCREEN_H * (0.08 + Math.random() * 0.28),
        color: cfg.fireworkColors[i % cfg.fireworkColors.length],
        delay: 500 + i * 420,
      })),
    [tier],
  );

  const emojis = useMemo(
    () =>
      Array.from({ length: cfg.emojiCount }, (_, i) => ({
        key: i,
        emoji: cfg.emojiRain[i % cfg.emojiRain.length],
        delay: 300 + Math.random() * 2600,
        startX: Math.random() * (SCREEN_W - 30),
      })),
    [tier],
  );

  useEffect(() => fireHaptics(cfg.haptic), [tier]);
  useEffect(() => playCelebrationSound(cfg.sound), [tier]);

  useEffect(() => {
    Animated.timing(flash, { toValue: 0, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]),
      Animated.spring(badgeBounce, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();

    if (cfg.cardPulses > 0) {
      Animated.sequence([
        Animated.delay(tier === "super" ? 1550 : 400),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ]),
          { iterations: cfg.cardPulses },
        ),
      ]).start();
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const badgeScale = badgeBounce.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 1.12, 1] });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, tier === "super" ? 1.07 : 1.04],
  });

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onDismiss={onContinue}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={[LIGHT_ORANGE, LIGHT_ORANGE_DEEP]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <GlowOrbs colorA={cfg.orbColors[0]} colorB={cfg.orbColors[1]} />

        {fireworks.map((f) => (
          <Firework key={f.key} x={f.x} y={f.y} color={f.color} delay={f.delay} />
        ))}

        {confetti.map((c) => (
          <ConfettiPiece key={c.key} color={c.color} delay={c.delay} startX={c.startX} shape={c.shape} />
        ))}

        {bursts.map((b) => (
          <BurstPiece key={b.key} color={b.color} delay={b.delay} />
        ))}

        {emojis.map((e) => (
          <EmojiDrop key={e.key} emoji={e.emoji} delay={e.delay} startX={e.startX} />
        ))}

        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ scale: cardScale }, { scale: pulseScale }] },
          ]}
        >
          <LinearGradient
            colors={cfg.topGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topAccent}
          />

          <Text style={styles.revealLabel}>{prize?.revealLabel ?? t("loyCollectionReveal")}</Text>

          <View style={styles.imageWrap}>
            <Animated.View
              style={[
                styles.glowRing,
                { backgroundColor: cfg.ring, opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />

            {cfg.sparkles && <Sparkles color={ORANGE_GLINT} />}

            <View style={[styles.imageFrame, { borderColor: cfg.accent }, prize && styles.prizeFrame]}>
              {prize ? (
                <Text style={styles.prizeEmoji}>{prize.emoji}</Text>
              ) : item && (
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

          <Animated.View style={[styles.badgeWrap, { transform: [{ scale: badgeScale }] }]}>
            <LinearGradient
              colors={cfg.badgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <View style={[styles.badgeDot, { backgroundColor: cfg.badgeDot }]} />
              <Text style={[styles.badgeText, { color: cfg.badgeTextColor }]}>{prize?.badge ?? (isRTL ? cfg.titleAr : cfg.title)}</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.itemName}>{itemName}</Text>
          {!prize && <Text style={styles.subtitle}>{isRTL ? cfg.subtitleAr : cfg.subtitle}</Text>}

          {prize?.code && (
            <View style={[styles.codePill, styles.prizeCodePill]}>
              <Text style={styles.codeLabel}>{prize.codeLabel}</Text>
              <Text style={styles.voucherCode}>{prize.code}</Text>
            </View>
          )}

          {apiResult?.completed && (
            <View style={styles.voucherBox}>
              <Text style={styles.voucherEmoji}>🎉</Text>
              <Text style={styles.voucherTitle}>{t("loyCollectionComplete")}</Text>
              <Text style={styles.voucherReward}>{item?.rewardValue}</Text>
              <View style={styles.codePill}>
                <Text style={styles.codeLabel}>{t("loyCode")}</Text>
                <Text style={styles.voucherCode}>{apiResult.voucher?.code}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85} style={styles.continueBtnOuter}>
            <LinearGradient
              colors={cfg.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Text style={styles.continueBtnText}>{prize?.continueLabel ?? t("loyContinue")}</Text>
              <Text style={styles.arrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {cfg.flash > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "#FFFFFF", opacity: flash }]}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // A native <Modal> is its own top-level presentation, so flex:1 here is
    // guaranteed the real full device screen regardless of where this
    // component sits in the app's own navigation tree.
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  orb: {
    position: "absolute",
    borderRadius: 9999,
  },

  card: {
    width: "88%",
    maxWidth: 350,
    backgroundColor: "#FFFBF7",
    borderRadius: 28,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 22,
    alignItems: "center",

    shadowColor: "#04211E",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 16,

    overflow: "hidden",
  },

  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },

  prizeFrame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  prizeEmoji: {
    fontSize: 72,
    textAlign: "center",
  },

  prizeCodePill: {
    marginTop: 14,
  },

  revealLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#8B918E",
    marginBottom: 18,
  },

  imageWrap: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  glowRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 24,
  },

  // Square frame — matches TileImage's own square size prop exactly (both 140),
  // so the image fills the frame edge-to-edge with no background peeking through.
  imageFrame: {
    width: 140,
    height: 140,
    borderRadius: 18,
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: "#F1ECE7",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
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

  badgeWrap: {
    marginBottom: 8,
    borderRadius: 999,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 7,
  },

  badgeText: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },

  itemName: {
    fontSize: 21,
    fontWeight: "900",
    color: "#17201F",
    marginTop: 3,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 12.5,
    color: "#7C8581",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 18,
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  voucherBox: {
    backgroundColor: "#E8F6F3",
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E9E4",
  },

  voucherEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },

  voucherTitle: {
    fontWeight: "900",
    color: "#005751",
    fontSize: 14,
  },

  voucherReward: {
    fontWeight: "800",
    fontSize: 14,
    color: "#17201F",
    textAlign: "center",
    marginTop: 3,
  },

  codePill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  codeLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#89918E",
    marginRight: 7,
  },

  voucherCode: {
    fontSize: 14,
    letterSpacing: 1.4,
    color: "#005751",
    fontWeight: "900",
  },

  continueBtnOuter: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },

  continueBtn: {
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 22,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  continueBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginLeft: 8,
    marginTop: -1,
  },
});
