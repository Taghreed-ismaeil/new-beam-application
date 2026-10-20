import MadeBy from "@/components/MadeBy";
import GiftsBackdrop from "@/components/GiftsBackdrop";
import SpecialPrizeCard from "@/components/SpecialPrizeCard";
import TileImage from "@/components/TileImage";
import { useAuth } from "@/context/AuthContext";
import { apiRequestCached } from "@/lib/api-client";
import { loyaltyProgressKey } from "@/lib/preload";
import { useAppLang } from "@/lib/app-lang";
import { enterDown, enterPop, enterUp } from "@/lib/motion";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated from "react-native-reanimated";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, AnimatedText } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const CREAM = "#FFF9F4";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

export default function LoyaltyCollectionsScreen() {
  const { user } = useAuth();
  const { t, pick } = useAppLang();
  const [progress, setProgress] = useState([]);
  // The month's special prize, picked by the admin. Until one is set (or while
  // the endpoint isn't live) this stays null and the card shows a mystery gift.
  const [specialPrize, setSpecialPrize] = useState(null);

  useFocusEffect(
    useCallback(() => {
      apiRequestCached(
        "/api/loyalty/special-prize",
        (d) => setSpecialPrize(d?.prize ?? null),
        () => {},
      );
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setProgress([]);
        return;
      }
      // Cached progress paints instantly (warmed at launch); it is always
      // re-fetched on focus because a scan elsewhere may have revealed pieces.
      apiRequestCached(
        "/api/loyalty/progress",
        (d) => setProgress(d.progress ?? []),
        () => {},
        { cacheKey: loyaltyProgressKey(user.id), revalidate: true },
      );
    }, [user]),
  );

  // Scanning and rewards are tied to an account — guests sign in first and
  // come straight back here.
  function openWithAccount(path) {
    if (user) router.push(path);
    else router.push({ pathname: "/login", params: { returnTo: "back" } });
  }

  return (
    <View style={styles.screen}>
      <GiftsBackdrop />
      {/* light clock/battery icons over the teal header */}
      <StatusBar style="light" />

      {/* =====================================================
          BACKGROUND DECOR
      ====================================================== */}

      <View pointerEvents="none" style={styles.decorLeft}>
        <Text style={styles.decorEmoji}>✦</Text>
      </View>

      <View pointerEvents="none" style={styles.decorRight}>
        <Text style={styles.decorEmojiTeal}>✦</Text>
      </View>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <AnimatedText entering={enterDown(0)} style={styles.headerTitle}>
              {t("loyTitle")}
            </AnimatedText>

            <AnimatedText entering={enterDown(1)} style={styles.headerSubtitle}>
              {t("loySubtitle")}
            </AnimatedText>
          </View>
        </View>

        {/* =====================================================
            HEADER BUTTONS
        ====================================================== */}

        <Animated.View entering={enterUp(2)} style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => openWithAccount("/loyalty/vouchers")}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBtnText}>{t("loyMyRewards")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => openWithAccount("/loyalty/scan")}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBtnText}>{t("loyScanQr")}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* =====================================================
          COLLECTIONS
      ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        <Animated.View entering={enterPop(3)} style={styles.specialSlot}>
          <SpecialPrizeCard prize={specialPrize} />
        </Animated.View>

        {progress.map((item, index) => (
          <Animated.View key={item.id} entering={enterPop(index + 3)} style={styles.card}>
            {/* Tile */}
            <View style={styles.tileWrapper}>
              <TileImage
                itemId={item.id}
                grayImage={item.grayImage}
                layers={item.layers}
                revealedCount={item.revealedCount}
                updatedAt={item.updatedAt}
                size={140}
              />

              {/* Completed badge */}
              {item.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓</Text>
                </View>
              )}
            </View>

            {/* Name */}
            <Text style={styles.cardName} numberOfLines={1}>
              {pick(item)}
            </Text>
          </Animated.View>
        ))}
        <MadeBy />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =====================================================
     SCREEN
  ====================================================== */

  screen: {
    flex: 1,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  /* =====================================================
     DECOR
  ====================================================== */

  decorLeft: {
    position: "absolute",
    left: -18,
    top: 210,
    zIndex: 0,
    opacity: 0.2,
  },

  decorRight: {
    position: "absolute",
    right: -18,
    bottom: 160,
    zIndex: 0,
    opacity: 0.2,
  },

  decorEmoji: {
    fontSize: 90,
    color: ORANGE,
    transform: [{ rotate: "25deg" }],
  },

  decorEmojiTeal: {
    fontSize: 75,
    color: TEAL,
    transform: [{ rotate: "-20deg" }],
  },

  /* =====================================================
     HEADER
  ====================================================== */

  header: {
    paddingHorizontal: 20,
    // clears the status bar / notch
    paddingTop: 50,
    paddingBottom: 22,
    backgroundColor: TEAL,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    zIndex: 2,
  },
  headerContent: {
    alignItems: "center",
  },

  titleSection: {
    width: "100%",
    alignItems: "center",
  },

  headerTitle: {
    height: 38,
    lineHeight: 38,
    fontSize: 24,
    fontWeight: "900",
    color: WHITE,
    textAlign: "center",
  },

  headerSubtitle: {
    marginTop: 8,
    color: LIGHT_TEAL,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
    textAlign: "center",
  },

  /* =====================================================
     HEADER BUTTONS
  ====================================================== */

  headerBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  headerBtn: {
    flex: 1,
    height: 45,

    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 14,

    backgroundColor: WHITE,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,
  },

  headerBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: ORANGE,
  },

  /* =====================================================
     GRID
  ====================================================== */

  // full row above the collection cards
  specialSlot: {
    width: "100%",
    marginBottom: 4,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",

    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 100,

    gap: 14,

    justifyContent: "center",
  },

  /* =====================================================
     COLLECTION CARD
  ====================================================== */

  card: {
    width: 165,

    alignItems: "center",

    backgroundColor: WHITE,

    borderRadius: 22,

    paddingTop: 14,
    paddingBottom: 15,
    paddingHorizontal: 10,

    borderWidth: 1,
    borderColor: "#F0E6E1",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,

    zIndex: 1,
  },

  /* =====================================================
     TILE
  ====================================================== */

  tileWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",

    width: 145,
    height: 145,

    borderRadius: 20,
    backgroundColor: LIGHT_ORANGE,
  },

  completedBadge: {
    position: "absolute",

    right: 2,
    top: 2,

    width: 30,
    height: 30,

    borderRadius: 15,

    backgroundColor: TEAL,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 3,
    borderColor: WHITE,
  },

  completedBadgeText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  /* =====================================================
     CARD TEXT
  ====================================================== */

  cardName: {
    width: "100%",

    fontSize: 15,
    fontWeight: "900",
    color: DARK,

    textAlign: "center",

    marginTop: 12,
  },

  /* =====================================================
     STATUS
  ====================================================== */

});
