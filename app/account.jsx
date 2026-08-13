import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import BackButton from "@/components/BackButton";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api-client";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const DARK = "#17201F";
const MUTED = "#68706E";
const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";
const WHITE = "#FFFFFF";

const BOTTOM_NAV_SPACE = 110;

const STATUS_LABEL = {
  pending: "Order received",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  pending: {
    bg: LIGHT_ORANGE,
    text: ORANGE,
  },
  accepted: {
    bg: LIGHT_TEAL,
    text: TEAL,
  },
  preparing: {
    bg: LIGHT_ORANGE,
    text: ORANGE,
  },
  ready: {
    bg: LIGHT_TEAL,
    text: TEAL,
  },
  out_for_delivery: {
    bg: "#F1EDFF",
    text: "#7057C9",
  },
  completed: {
    bg: LIGHT_TEAL,
    text: TEAL,
  },
  cancelled: {
    bg: "#FCECEC",
    text: "#C0392B",
  },
};

export default function AccountScreen() {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const isSmall = width < 360;

  useEffect(() => {
    apiRequest("/api/orders/mine")
      .then((d) => {
        setOrders(d.orders ?? []);
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function onLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await logout();
      router.replace("/login");
    } catch (error) {
      console.log("Logout error:", error);
      setLoggingOut(false);
    }
  }

  const userName = user?.name || "Guest";
  const userPhone = user?.phone || "No phone number";

  const completedOrders = orders.filter((o) => o.status === "completed").length;

  const activeOrders = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled",
  ).length;

  const initials = useMemo(() => {
    const parts = userName.trim().split(" ").filter(Boolean);

    if (parts.length === 0) return "U";

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [userName]);

  return (
    <View style={styles.container}>
      <BackButton />

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isSmall ? 18 : 22,
            paddingBottom: BOTTOM_NAV_SPACE,
          },
        ]}
      >
        {/* ================= DECORATIVE UTENSILS ================= */}

        {/* ================= DECORATIVE UTENSILS ================= */}

        {/* Right - BIG teal fork */}
        <View
          pointerEvents="none"
          style={[
            styles.decorRight,
            {
              right: -width * 0.07,
              top: 90,
              transform: [{ rotate: "+280deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="silverware-fork"
            size={175}
            color={TEAL}
          />
        </View>

        {/* Left - BIG orange utensil */}
        <View
          pointerEvents="none"
          style={[
            styles.decorLeft,
            {
              left: -28,
              top: 200,
              transform: [{ rotate: "18deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons name="silverware" size={145} color={ORANGE} />
        </View>

        {/* Bottom - BIG soft teal spoon */}
        <View
          pointerEvents="none"
          style={[
            styles.decorBottom,
            {
              right: width * 0.05,
              top: 650,
              transform: [{ rotate: "-10deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="silverware-spoon"
            size={120}
            color={ORANGE}
          />
        </View>

        {/* ================= TOP LABEL ================= */}

        <View style={styles.topBar}>
          <View />

          <View style={styles.accountPill}>
            <Ionicons name="person-outline" size={13} color={ORANGE} />

            <Text style={styles.accountPillText}>MY ACCOUNT</Text>
          </View>
        </View>

        {/* ================= PROFILE ================= */}

        <View style={styles.profileHeader}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text
                style={[
                  styles.avatarText,
                  {
                    fontSize: isSmall ? 25 : 29,
                  },
                ]}
              >
                {initials}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.name,
              {
                fontSize: isSmall ? 24 : 28,
              },
            ]}
            numberOfLines={1}
          >
            {userName}
          </Text>

          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={13} color={MUTED} />

            <Text style={styles.phone} numberOfLines={1}>
              {userPhone}
            </Text>
          </View>

          <Text style={styles.profileCaption}>
            Good food is always a good idea.
          </Text>
        </View>

        {/* ================= STATS ================= */}

        <View style={styles.statsStrip}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{orders.length}</Text>

            <Text style={styles.statLabel}>TOTAL ORDERS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statNumber}>{activeOrders}</Text>

            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statNumber}>{completedOrders}</Text>

            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
        </View>

        {/* ================= ACTIONS ================= */}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionEyebrow}>EXPLORE</Text>

          <Text style={styles.sectionTitle}>What do you need?</Text>
        </View>

        <View style={styles.menuList}>
          {/* Reservations */}

          <Pressable
            onPress={() => router.push("/reservations")}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.menuIcon, styles.orangeMenuIcon]}>
              <Ionicons
                name="restaurant-outline"
                size={21}
                color={LIGHT_ORANGE}
              />
            </View>

            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>My Reservations</Text>

              <Text style={styles.menuSubtitle}>
                Manage your tables and bookings
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={ORANGE} />
          </Pressable>

          {/* Contact */}

          <Pressable
            onPress={() => router.push("/contact")}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.menuIcon, styles.tealMenuIcon]}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={21}
                color={LIGHT_TEAL}
              />
            </View>

            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Contact Us</Text>

              <Text style={styles.menuSubtitle}>
                We’re always happy to hear from you
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={TEAL} />
          </Pressable>
        </View>

        {/* ================= ORDERS ================= */}

        <View style={styles.ordersHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>YOUR ACTIVITY</Text>

            <Text style={styles.ordersTitle}>My Orders</Text>
          </View>

          {orders.length > 0 && (
            <View style={styles.orderCountPill}>
              <Text style={styles.orderCountText}>{orders.length}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={ORANGE} />

            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={28} color={ORANGE} />
            </View>

            <Text style={styles.emptyTitle}>Nothing here yet</Text>

            <Text style={styles.emptyText}>
              Your orders will show up here after your first delicious visit.
            </Text>

            <Pressable
              onPress={() => router.push("/")}
              style={({ pressed }) => [
                styles.exploreButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.exploreButtonText}>Explore Menu</Text>

              <Ionicons name="arrow-forward" size={16} color={WHITE} />
            </Pressable>
          </View>
        ) : (
          <View>
            {orders.map((o, index) => {
              const statusStyle =
                STATUS_COLORS[o.status] ?? STATUS_COLORS.pending;

              const statusLabel = STATUS_LABEL[o.status] ?? o.status;

              const accent = index % 2 === 0 ? ORANGE : TEAL;

              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/order-tracking/${o.id}`)}
                  style={({ pressed }) => [
                    styles.orderItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.orderAccent,
                      {
                        backgroundColor: accent,
                      },
                    ]}
                  />

                  <View style={styles.orderIcon}>
                    <Ionicons name="receipt-outline" size={19} color={accent} />
                  </View>

                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>Order #{o.id}</Text>

                    <Text style={styles.orderPrice}>
                      {Number(o.total).toFixed(2)} JD
                    </Text>
                  </View>

                  <View style={styles.orderRight}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: statusStyle.bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: statusStyle.text,
                          },
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color="#A1A5A3"
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ================= LOGOUT ================= */}

        <Pressable
          onPress={onLogout}
          disabled={loggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
            loggingOut && styles.logoutDisabled,
          ]}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#C0392B" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#C0392B" />

              <Text style={styles.logoutText}>Log out</Text>
            </>
          )}
        </Pressable>

        {/* ================= FOOTER ================= */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>MADE WITH LOVE & GOOD FOOD</Text>

          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  content: {
    paddingTop: 68,
  },

  /* ================= DECORATIVE UTENSILS ================= */

  decorRight: {
    position: "absolute",
    opacity: 0.95,
    zIndex: 0,
  },

  decorLeft: {
    position: "absolute",
    opacity: 0.9,
    zIndex: 0,
  },

  decorBottom: {
    position: "absolute",
    opacity: 0.9,
    zIndex: 3,
  },

  /* ================= TOP ================= */

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    zIndex: 2,
  },

  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIGHT_ORANGE,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  accountPillText: {
    color: ORANGE,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* ================= PROFILE ================= */

  profileHeader: {
    alignItems: "center",
    marginBottom: 22,
    zIndex: 2,
  },

  avatarOuter: {
    width: 92,
    height: 92,
    borderRadius: 31,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#F5DCD5",
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: WHITE,
    fontWeight: "900",
  },

  name: {
    color: DARK,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginBottom: 6,
    maxWidth: "90%",
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },

  phone: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  profileCaption: {
    color: "#9A9F9D",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },

  /* ================= STATS ================= */

  statsStrip: {
    backgroundColor: LIGHT_TEAL,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 31,
    zIndex: 2,
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    color: DARK,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 3,
  },

  statLabel: {
    color: MUTED,
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  statDivider: {
    width: 1,
    height: 31,
    backgroundColor: "#CDE0DC",
  },

  /* ================= SECTIONS ================= */

  sectionBlock: {
    marginBottom: 13,
    zIndex: 2,
  },

  sectionEyebrow: {
    color: ORANGE,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  sectionTitle: {
    color: DARK,
    fontSize: 20,
    fontWeight: "900",
  },

  /* ================= MENU ================= */

  menuList: {
    gap: 10,
    marginBottom: 32,
    zIndex: 2,
  },

  menuItem: {
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECEDEB",
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  orangeMenuIcon: {
    backgroundColor: ORANGE,
  },

  tealMenuIcon: {
    backgroundColor: TEAL,
  },

  menuText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  menuTitle: {
    color: DARK,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3,
  },

  menuSubtitle: {
    color: MUTED,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "500",
  },

  /* ================= ORDERS HEADER ================= */

  ordersHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 13,
    zIndex: 2,
  },

  ordersTitle: {
    color: DARK,
    fontSize: 23,
    fontWeight: "900",
  },

  orderCountPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  orderCountText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "900",
  },

  /* ================= LOADING ================= */

  loadingState: {
    backgroundColor: LIGHT_TEAL,
    borderRadius: 21,
    paddingVertical: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  loadingText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
  },

  /* ================= EMPTY ================= */

  emptyState: {
    backgroundColor: LIGHT_ORANGE,
    borderRadius: 23,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F6DDD6",
    zIndex: 2,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },

  emptyText: {
    color: MUTED,
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 275,
    marginBottom: 16,
  },

  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },

  exploreButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },

  /* ================= ORDER ITEM ================= */

  orderItem: {
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#ECEDEB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    overflow: "hidden",
    zIndex: 2,
  },

  orderAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  orderIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#F7F7F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  orderInfo: {
    flex: 1,
    minWidth: 0,
  },

  orderNumber: {
    color: DARK,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3,
  },

  orderPrice: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  orderRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 7,
    marginLeft: 8,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    maxWidth: 105,
  },

  statusText: {
    fontSize: 8.5,
    fontWeight: "900",
    textAlign: "center",
  },

  /* ================= LOGOUT ================= */

  logoutButton: {
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#F0D8D4",
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 17,
    zIndex: 2,
  },

  logoutText: {
    color: "#C0392B",
    fontSize: 12,
    fontWeight: "900",
  },

  logoutDisabled: {
    opacity: 0.5,
  },

  /* ================= FOOTER ================= */

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 26,
    paddingBottom: 8,
    zIndex: 2,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DEDFDD",
  },

  footerText: {
    color: "#9A9F9D",
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    textAlign: "center",
  },

  /* ================= PRESS ================= */

  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },
});
