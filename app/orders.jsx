import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import MadeBy from "@/components/MadeBy";
import BackButton from "@/components/BackButton";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const DARK = "#17201F";
const MUTED = "#68706E";
const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";
const WHITE = "#FFFFFF";

const BOTTOM_NAV_SPACE = 110;

// Status label keys in lib/app-strings.ts
const STATUS_LABEL = {
  pending: "statusPending",
  accepted: "statusAccepted",
  preparing: "statusPreparing",
  ready: "statusReady",
  out_for_delivery: "statusOnTheWay",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
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

/* =========================================================
   MY ORDERS
   Opened from the "My Orders" row on the profile page.
========================================================= */

export default function OrdersScreen() {
  const { user } = useAuth();
  const { t, dir } = useAppLang();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(() => {
    if (!user) return Promise.resolve();

    return apiRequest("/api/orders/mine")
      .then((d) => {
        setOrders(d.orders ?? []);
      })
      .catch(() => {
        setOrders([]);
      });
  }, [user]);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  function onRefresh() {
    setRefreshing(true);
    loadOrders().finally(() => setRefreshing(false));
  }

  return (
    <View style={styles.screen}>
      <BackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ORANGE}
            colors={[ORANGE]}
          />
        }
      >
        {/* ================= ORDERS ================= */}

        <View style={[styles.ordersHeader, dir.row]}>
          <View>
            <Text style={[styles.sectionEyebrow, dir.text, dir.noSpacing]}>
              {t("ordersEyebrow")}
            </Text>

            <View style={[styles.ordersTitleRow, dir.row]}>
              <Text style={styles.ordersTitle}>{t("accountOrders")}</Text>

              {orders.length > 0 && (
                <View style={styles.orderCountPill}>
                  <Text style={styles.orderCountText}>{orders.length}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={ORANGE} />

            <Text style={styles.loadingText}>{t("ordersLoading")}</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={28} color={ORANGE} />
            </View>

            <Text style={styles.emptyTitle}>{t("ordersEmpty")}</Text>

            <Text style={styles.emptyText}>
              {t("ordersEmptyText")}
            </Text>

            <Pressable
              onPress={() => router.push("/menu")}
              style={({ pressed }) => [
                styles.exploreButton,
                dir.row,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.exploreButtonText}>{t("homeExploreMenu")}</Text>

              <Ionicons name={dir.arrow} size={16} color={WHITE} />
            </Pressable>
          </View>
        ) : (
          <View>
            {orders.map((o, index) => {
              const statusStyle =
                STATUS_COLORS[o.status] ?? STATUS_COLORS.pending;

              const statusLabel = STATUS_LABEL[o.status]
                ? t(STATUS_LABEL[o.status])
                : o.status;

              const accent = index % 2 === 0 ? ORANGE : TEAL;

              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/order-tracking/${o.id}`)}
                  style={({ pressed }) => [
                    styles.orderItem,
                    dir.row,
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

                  <View
                    style={[
                      styles.orderIcon,
                    ]}
                  >
                    <Ionicons name="receipt-outline" size={19} color={accent} />
                  </View>

                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderNumber, dir.text]}>
                      {t("ordersNumber", { id: o.id })}
                    </Text>

                    <Text style={[styles.orderPrice, dir.text]}>
                      {Number(o.total).toFixed(2)} {t("jd")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.orderRight,
                      dir.itemsEnd,
                    ]}
                  >
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
                      name={dir.chevron}
                      size={17}
                      color="#A1A5A3"
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        <MadeBy />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  content: {
    flexGrow: 1,
    // clears the status bar + back button
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: BOTTOM_NAV_SPACE,
  },

  sectionEyebrow: {
    color: ORANGE,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  /* ================= ORDERS HEADER ================= */

  ordersHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 13,
    zIndex: 2,
  },

  ordersTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  ordersTitle: {
    color: DARK,
    fontSize: 23,
    fontWeight: "900",
  },

  orderCountPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
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

  /* ================= PRESS ================= */

  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },

  deleteBtn: {
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: TEAL,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 17,
    zIndex: 2,
  },

  deleteBtnText: {
    color: TEAL,
    fontSize: 18,
    fontWeight: "900",
  },
});
