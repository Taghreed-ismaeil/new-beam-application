import BackButton from "@/components/BackButton";
import TileImage from "@/components/TileImage";
import { apiRequest } from "@/lib/api-client";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const CREAM = "#FFF9F4";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

export default function LoyaltyCollectionsScreen() {
  const [progress, setProgress] = useState([]);

  useFocusEffect(
    useCallback(() => {
      apiRequest("/api/loyalty/progress").then((d) => setProgress(d.progress));
    }, []),
  );

  return (
    <View style={styles.screen}>
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
        <BackButton />

        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.eyebrow}> </Text>

            <Text style={styles.headerTitle}>Collect & Win</Text>

            <Text style={styles.headerSubtitle}>
              Collect your stamps and unlock delicious rewards.
            </Text>
          </View>

          <View style={styles.trophyCircle}>
            <Text style={styles.trophy}>🏆</Text>
          </View>
        </View>

        {/* =====================================================
            HEADER BUTTONS
        ====================================================== */}

        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/loyalty/vouchers")}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBtnIcon}>🎁</Text>

            <Text style={styles.headerBtnText}>My Rewards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnPrimary]}
            onPress={() => router.push("/loyalty/scan")}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBtnIcon}>📷</Text>

            <Text style={[styles.headerBtnText, styles.headerBtnTextPrimary]}>
              Scan QR
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =====================================================
          COLLECTIONS
      ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {progress.map((item) => (
          <View key={item.id} style={styles.card}>
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
              {item.nameEn || item.name}
            </Text>

            {/* Progress */}
            <View
              style={[
                styles.statusBadge,
                item.completed
                  ? styles.statusCompleted
                  : item.revealedCount > 0
                    ? styles.statusCollecting
                    : styles.statusEmpty,
              ]}
            >
              <Text
                style={[
                  styles.cardProgress,
                  item.completed
                    ? styles.textCompleted
                    : item.revealedCount > 0
                      ? styles.textCollecting
                      : styles.textEmpty,
                ]}
              >
                {item.completed
                  ? "Completed 🎉"
                  : item.revealedCount > 0
                    ? "Collecting..."
                    : "Scan its QR to start"}
              </Text>
            </View>
          </View>
        ))}
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
    paddingTop: 25,
    paddingBottom: 18,
    backgroundColor: WHITE,
    zIndex: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  titleSection: {
    flex: 1,
    paddingRight: 15,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: TEAL,
    marginBottom: 4,
    marginTop: 8,
    //paddingBottom: 30,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: DARK,
  },

  headerSubtitle: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },

  trophyCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: ORANGE,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  trophy: {
    fontSize: 28,
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

  headerBtnPrimary: {
    backgroundColor: ORANGE,
  },

  headerBtnIcon: {
    fontSize: 15,
  },

  headerBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: ORANGE,
  },

  headerBtnTextPrimary: {
    color: WHITE,
  },

  /* =====================================================
     GRID
  ====================================================== */

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

  statusBadge: {
    marginTop: 7,

    minHeight: 25,

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",
  },

  statusCompleted: {
    backgroundColor: LIGHT_TEAL,
  },

  statusCollecting: {
    backgroundColor: LIGHT_ORANGE,
  },

  statusEmpty: {
    backgroundColor: "#F3F3F3",
  },

  cardProgress: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  textCompleted: {
    color: TEAL,
  },

  textCollecting: {
    color: ORANGE,
  },

  textEmpty: {
    color: MUTED,
  },
});
