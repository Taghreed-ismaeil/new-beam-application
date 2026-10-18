import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";

import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { fetchMediaPage } from "@/lib/media-api";
import { enterDown, enterFromLeft, enterFromRight, enterUp } from "@/lib/motion";
import { Text, AnimatedText } from "@/lib/arabic-font";

/* =========================================================
   MEDIA (tab)
   Two ways in: the restaurant's own gallery, and the community
   feed where customers share their photos. A strip of the latest
   shared photos sits underneath as a teaser.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const CREAM = "#FFF9F4";

const GALLERY_COVER = require("../../assets/img/about/beam-res-about.jpg");
const COMMUNITY_COVER = require("../../assets/img/hero-bg.jpg");
const LOGO = require("../../assets/img/remove_beam_logoo.jpg");

export default function MediaHub() {
  const { t, dir } = useAppLang();
  const { width } = useWindowDimensions();
  const [latest, setLatest] = useState([]);

  // Re-read on focus so a photo approved meanwhile shows up in the teaser
  useFocusEffect(
    useCallback(() => {
      fetchMediaPage("customer")
        .then((d) => setLatest((d.posts ?? []).slice(0, 6)))
        .catch(() => {});
    }, []),
  );

  const thumb = (width - 32 - 16) / 3;

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <Animated.View entering={enterDown(0)} style={styles.logoWrap}>
            <Image source={LOGO} contentFit="contain" style={styles.logo} />
          </Animated.View>
          <AnimatedText entering={enterDown(1)} style={[styles.title, dir.noSpacing]}>
            {t("mediaTitle")}
          </AnimatedText>
          <AnimatedText entering={enterDown(2)} style={styles.subtitle}>
            {t("mediaSubtitle")}
          </AnimatedText>
        </View>
        <LinearGradient
          pointerEvents="none"
          colors={[TEAL, "rgba(0,87,81,0.4)", "rgba(0,87,81,0)"]}
          style={styles.headerFade}
        />

        {/* ================= TWO OPTIONS ================= */}
        <View style={styles.cards}>
          <Animated.View entering={enterFromLeft(2)}>
            <OptionCard
              cover={GALLERY_COVER}
              color={ORANGE}
              icon="images"
              title={t("mediaRestaurantTitle")}
              sub={t("mediaRestaurantSub")}
              onPress={() => router.push("/media/restaurant")}
            />
          </Animated.View>

          <Animated.View entering={enterFromRight(3)}>
            <OptionCard
              cover={COMMUNITY_COVER}
              color={TEAL}
              icon="camera"
              title={t("mediaCommunityTitle")}
              sub={t("mediaCommunitySub")}
              onPress={() => router.push("/media/community")}
            />
          </Animated.View>
        </View>

        {/* ================= LATEST SHARED ================= */}
        {latest.length > 0 && (
          <Animated.View entering={enterUp(4)} style={styles.latest}>
            <View style={[styles.latestHead, dir.row]}>
              <Text style={[styles.latestTitle, dir.text]}>{t("mediaCommunityTitle")}</Text>
              <Pressable onPress={() => router.push("/media/community")} hitSlop={8}>
                <Ionicons name="arrow-forward-circle" size={26} color={TEAL} />
              </Pressable>
            </View>
            <View style={[styles.latestGrid, dir.row]}>
              {latest.map((p) => (
                <Pressable key={p.id} onPress={() => router.push("/media/community")}>
                  <Image
                    source={{ uri: imageUrl(p.imageUrl) }}
                    cachePolicy="memory-disk"
                    transition={150}
                    contentFit="cover"
                    style={[styles.latestThumb, { width: thumb, height: thumb }]}
                  />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function OptionCard({ cover, color, icon, title, sub, onPress }) {
  const { dir } = useAppLang();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={cover} contentFit="cover" style={StyleSheet.absoluteFill} />
      {/* Darken toward the bottom so the white text always reads */}
      <LinearGradient
        colors={["rgba(10,20,18,0.05)", "rgba(10,20,18,0.35)", "rgba(10,20,18,0.85)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.cardIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color={WHITE} />
      </View>
      <View style={[styles.cardBottom, dir.row]}>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, dir.text]}>{title}</Text>
          <Text style={[styles.cardSub, dir.text]}>{sub}</Text>
        </View>
        <View style={[styles.cardGo, { backgroundColor: color }]}>
          <Ionicons name="arrow-forward" size={20} color={WHITE} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  content: {
    paddingBottom: 120,
  },

  /* ================= HEADER ================= */

  header: {
    backgroundColor: TEAL,
    paddingTop: 58,
    paddingBottom: 18,
    alignItems: "center",
  },

  logoWrap: {
    width: 150,
    height: 70,
    marginBottom: 6,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  title: {
    color: WHITE,
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  headerFade: {
    height: 60,
    marginTop: -1,
    marginBottom: -40,
  },

  /* ================= CARDS ================= */

  cards: {
    paddingHorizontal: 16,
    gap: 16,
  },

  card: {
    height: 210,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: DARK,
    justifyContent: "space-between",
    padding: 16,
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },

  cardText: {
    flex: 1,
  },

  cardTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "900",
  },

  cardSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },

  cardGo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ================= LATEST ================= */

  latest: {
    marginTop: 26,
    paddingHorizontal: 16,
  },

  latestHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  latestTitle: {
    color: DARK,
    fontSize: 18,
    fontWeight: "900",
  },

  latestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  latestThumb: {
    borderRadius: 16,
    backgroundColor: "#E9E4DF",
  },
});
