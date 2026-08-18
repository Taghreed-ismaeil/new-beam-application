import BackButton from "@/components/BackButton";
import { apiRequest } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const CREAM = "#FFF9F4";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

export default function LoyaltyVouchersScreen() {
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    apiRequest("/api/loyalty/vouchers").then((d) => setVouchers(d.vouchers));
  }, []);

  return (
    <View style={styles.screen}>
      {/* =====================================================
          BACKGROUND DECOR
      ====================================================== */}

      <View pointerEvents="none" style={styles.decorTopLeft}>
        <Text style={styles.decorOrange}>✦</Text>
      </View>

      <View pointerEvents="none" style={styles.decorBottomRight}>
        <Text style={styles.decorTeal}>✦</Text>
      </View>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <BackButton />

        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.eyebrow}>BEAM REWARDS</Text>

            <Text style={styles.headerTitle}>My Rewards</Text>

            <Text style={styles.headerSubtitle}>
              Your collected rewards are waiting for you.
            </Text>
          </View>

          <View style={styles.rewardCircle}>
            <Text style={styles.rewardIcon}>🎁</Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          VOUCHERS
      ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {vouchers.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>🎁</Text>
            </View>

            <Text style={styles.emptyTitle}>No rewards yet</Text>

            <Text style={styles.emptyText}>
              Keep collecting stamps and your rewards will appear here.
            </Text>
          </View>
        )}

        {vouchers.map((v) => {
          const isRedeemed = !!v.redeemedAt;

          return (
            <View
              key={v.id}
              style={[
                styles.rewardCard,
                isRedeemed && styles.rewardCardRedeemed,
              ]}
            >
              {/* LEFT */}
              <View style={styles.rewardLeft}>
                <View
                  style={[
                    styles.rewardIconBox,
                    isRedeemed
                      ? styles.rewardIconBoxUsed
                      : styles.rewardIconBoxReady,
                  ]}
                >
                  <Text style={styles.rewardSmallIcon}>
                    {isRedeemed ? "✓" : "🎁"}
                  </Text>
                </View>

                <View style={styles.rewardInfo}>
                  <Text
                    style={[styles.name, isRedeemed && styles.nameRedeemed]}
                    numberOfLines={1}
                  >
                    {v.menuItem?.nameEn || v.menuItem?.name}
                  </Text>

                  <Text style={styles.codeLabel}>REWARD CODE</Text>

                  <Text style={styles.code}>{v.code}</Text>
                </View>
              </View>

              {/* STATUS */}
              <View
                style={[
                  styles.badge,
                  isRedeemed ? styles.badgeGray : styles.badgeGreen,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isRedeemed ? styles.badgeTextGray : styles.badgeTextGreen,
                  ]}
                >
                  {isRedeemed ? "Used" : "Ready"}
                </Text>
              </View>
            </View>
          );
        })}
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

  decorTopLeft: {
    position: "absolute",
    left: -20,
    top: 185,
    opacity: 0.16,
    zIndex: 0,
  },

  decorBottomRight: {
    position: "absolute",
    right: -18,
    bottom: 100,
    opacity: 0.16,
    zIndex: 0,
  },

  decorOrange: {
    fontSize: 85,
    color: ORANGE,
    transform: [{ rotate: "25deg" }],
  },

  decorTeal: {
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
    paddingBottom: 20,
    backgroundColor: WHITE,
    zIndex: 2,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 30, // 👈 أهم واحدة
  },

  titleSection: {
    flex: 1,
    paddingRight: 50,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: TEAL,
    marginBottom: 4,
    marginTop: 0,
    marginLeft: 40,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: DARK,
    marginTop: 10,
  },

  headerSubtitle: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },

  rewardCircle: {
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
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  rewardIcon: {
    fontSize: 27,
  },

  /* =====================================================
     CONTENT
  ====================================================== */

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 100,
    zIndex: 1,
  },

  /* =====================================================
     EMPTY STATE
  ====================================================== */

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
    paddingTop: 70,
  },

  emptyIconCircle: {
    width: 85,
    height: 85,
    borderRadius: 43,

    backgroundColor: LIGHT_ORANGE,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DARK,
  },

  emptyText: {
    marginTop: 7,
    textAlign: "center",
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },

  /* =====================================================
     REWARD CARD
  ====================================================== */

  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: WHITE,

    borderRadius: 20,

    padding: 14,
    marginBottom: 13,

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
  },

  rewardCardRedeemed: {
    opacity: 0.55,
  },

  /* =====================================================
     REWARD LEFT
  ====================================================== */

  rewardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  rewardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  rewardIconBoxReady: {
    backgroundColor: LIGHT_ORANGE,
  },

  rewardIconBoxUsed: {
    backgroundColor: "#F0F0F0",
  },

  rewardSmallIcon: {
    fontSize: 22,
  },

  rewardInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 15,
    fontWeight: "900",
    color: DARK,
  },

  nameRedeemed: {
    color: MUTED,
  },

  codeLabel: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: MUTED,
  },

  code: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: ORANGE,
    letterSpacing: 0.5,
  },

  /* =====================================================
     BADGE
  ====================================================== */

  badge: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 7,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 8,
  },

  badgeGreen: {
    backgroundColor: LIGHT_TEAL,
  },

  badgeGray: {
    backgroundColor: "#EEEEEE",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  badgeTextGreen: {
    color: TEAL,
  },

  badgeTextGray: {
    color: MUTED,
  },
});
