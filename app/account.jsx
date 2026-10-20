import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import MadeBy from "@/components/MadeBy";
import FeedbackSheet from "@/components/FeedbackSheet";
import LeafletMap from "@/components/LeafletMap";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { enterUp } from "@/lib/motion";
import Animated from "react-native-reanimated";
import { Text } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const DARK = "#17201F";
const MUTED = "#68706E";
const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";
const WHITE = "#FFFFFF";

const BOTTOM_NAV_SPACE = 110;

// Approximate pin for Al Abdali (Abdali Boulevard) — replace with the
// restaurant's exact coordinates when available.
const RESTAURANT_COORDS = { lat: 31.9622, lng: 35.9106 };

// Opens the Maps app (or Google Maps in the browser) on the restaurant.
// Swap for the exact pin link once the restaurant's Google Maps listing is ready.
const RESTAURANT_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Beam Shawerma, Al Abdali, Amman, Jordan");

// Share text lives in lib/app-strings.ts (accountShareMessage) — add the
// App Store / Play Store link there once the app is published.

export default function AccountScreen() {
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { t, dir } = useAppLang();

  const [orders, setOrders] = useState([]);
  const [readyRewards, setReadyRewards] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // "rating" | "complaint" | null — which feedback popup is open
  const [feedbackMode, setFeedbackMode] = useState(null);
  const closeFeedback = useCallback(() => setFeedbackMode(null), []);

  const isSmall = width < 360;

  const loadStats = useCallback(() => {
    // Guests have no orders or rewards to fetch.
    if (!user) {
      setOrders([]);
      setReadyRewards(0);
      return Promise.resolve();
    }

    return Promise.all([
      apiRequest("/api/orders/mine")
        .then((d) => {
          setOrders(d.orders ?? []);
        })
        .catch(() => {
          setOrders([]);
        }),
      apiRequest("/api/loyalty/vouchers")
        .then((d) => {
          setReadyRewards((d.vouchers ?? []).filter((v) => !v.redeemedAt).length);
        })
        .catch(() => {}),
    ]);
  }, [user]);

  // Re-read on every visit, so a new order or reward shows up straight away
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  // Pull down to refresh
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }

  // Guests can browse freely now, so logging out just turns this screen back
  // into its guest view instead of forcing the login page.
  async function onLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await logout();
    } catch (error) {
      console.log("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  function openLocation() {
    Linking.openURL(RESTAURANT_MAPS_URL).catch(() => {
      Alert.alert(t("accountMapsError"), t("accountMapsErrorText"));
    });
  }

  async function shareApp() {
    try {
      await Share.share({ message: t("accountShareMessage") });
    } catch {
      // share sheet dismissed / unavailable — nothing to do
    }
  }

  function goToLogin() {
    router.push({ pathname: "/login", params: { returnTo: "back" } });
  }

  function onDeleteAccount() {
    Alert.alert(t("accountDeleteTitle"), t("accountDeleteText"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("accountDeleteConfirm"),
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await apiRequest("/api/auth/account", { method: "DELETE" });
            await logout();
            setDeleting(false);
          } catch {
            setDeleting(false);
            Alert.alert(t("somethingWrong"), t("accountDeleteError"));
          }
        },
      },
    ]);
  }

  const userName = user?.name || t("accountGuest");

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
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isSmall ? 18 : 22,
            paddingBottom: BOTTOM_NAV_SPACE,
          },
        ]}
      >
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
          {/*
          <MaterialCommunityIcons name="silverware" size={145} color={ORANGE} />
          */}
        </View>

        {/* ================= TOP LABEL ================= */}
        {/*
        <Animated.View entering={enterDown(0)} style={styles.topBar}>
          <View />
          
          <View style={styles.accountPill}>
            <Ionicons name="person-outline" size={13} color={ORANGE} />

            <Text style={[styles.accountPillText, dir.noSpacing]}>
              {t("accountPill")}
            </Text>
          </View>
         
        </Animated.View>
 */}
        {/* ================= PROFILE ================= */}

        <Animated.View entering={enterUp(1)} style={styles.profileHeader}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              {user ? (
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
              ) : (
                <Ionicons name="person" size={32} color={WHITE} />
              )}
            </View>
          </View>

          {user ? (
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
          ) : (
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="log-in-outline" size={18} color={WHITE} />
              <Text style={styles.loginBtnText}>{t("accountLogin")}</Text>
            </Pressable>
          )}

          <View style={styles.phoneRow} />
          {/*
          <Text style={styles.profileCaption}>
            Good food is always a good idea.
          </Text>
          */}
        </Animated.View>

        {/* ================= STATS ================= */}

        <Animated.View entering={enterUp(2)} style={styles.statsStrip}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{orders.length}</Text>

            <Text style={[styles.statLabel, dir.noSpacing]}>
              {t("accountTotalOrders")}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <Pressable
            onPress={() =>
              user ? router.push("/loyalty/vouchers") : goToLogin()
            }
            style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
          >
            <View style={styles.statNumberRow}>
              <Text style={styles.statNumber}>{readyRewards}</Text>
            </View>

            <Text style={[styles.statLabel, dir.noSpacing]}>
              {t("accountRewardsReady")}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ================= ACTIONS ================= */}

        <Animated.View entering={enterUp(3)} style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, dir.text]}>
            {t("accountWhatNeed")}
          </Text>
        </Animated.View>

        <Animated.View entering={enterUp(4)} style={styles.menuList}>
          {/* Reservations */}

          <Pressable
            onPress={() => (user ? router.push("/reservations") : goToLogin())}
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
              <Text style={[styles.menuTitle, dir.text]}>
                {t("accountReservations")}
              </Text>

              <Text style={[styles.menuSubtitle, dir.text]}>
                {t("accountReservationsSub")}
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
              <Text style={[styles.menuTitle, dir.text]}>
                {t("accountContact")}
              </Text>

              <Text style={[styles.menuSubtitle, dir.text]}>
                {t("accountContactSub")}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={TEAL} />
          </Pressable>

          {/* Location — map preview card */}

          <View style={styles.locationCard}>
            <View style={styles.mapBox}>
              <LeafletMap
                center={RESTAURANT_COORDS}
                zoom={16}
                markers={[
                  {
                    id: "beem",
                    ...RESTAURANT_COORDS,
                    color: ORANGE,
                    label: t("brandName"),
                  },
                ]}
                style={StyleSheet.absoluteFill}
              />
              {/* covers the map so a tap opens Maps and the page still scrolls
                  (the WebView would otherwise swallow the touches) */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={openLocation}
              />
            </View>

            <Pressable
              onPress={openLocation}
              style={({ pressed }) => [
                styles.locationRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.menuIcon, styles.orangeMenuIcon]}>
                <Ionicons
                  name="location-outline"
                  size={21}
                  color={LIGHT_ORANGE}
                />
              </View>

              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, dir.text]}>
                  {t("accountLocation")}
                </Text>

                <Text style={[styles.menuSubtitle, dir.text]}>
                  {t("accountLocationSub")}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={ORANGE} />
            </Pressable>
          </View>

          {/* Share */}

          <Pressable
            onPress={shareApp}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.menuIcon, styles.tealMenuIcon]}>
              <Ionicons
                name="share-social-outline"
                size={21}
                color={LIGHT_TEAL}
              />
            </View>

            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, dir.text]}>
                {t("accountShare")}
              </Text>

              <Text style={[styles.menuSubtitle, dir.text]}>
                {t("accountShareSub")}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={TEAL} />
          </Pressable>

          {/* My Orders → its own page */}

          <Pressable
            onPress={() => (user ? router.push("/orders") : goToLogin())}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.menuIcon, styles.orangeMenuIcon]}>
              <Ionicons name="receipt-outline" size={21} color={LIGHT_ORANGE} />
            </View>

            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, dir.text]}>
                {t("accountOrders")}
              </Text>

              <Text style={[styles.menuSubtitle, dir.text]}>
                {t("accountOrdersSub")}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={ORANGE} />
          </Pressable>

          {/* Rate us → star popup */}

          <Pressable
            onPress={() => (user ? setFeedbackMode("rating") : goToLogin())}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.menuIcon, styles.tealMenuIcon]}>
              <Ionicons name="star-outline" size={21} color={LIGHT_TEAL} />
            </View>

            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, dir.text]}>
                {t("accountRate")}
              </Text>

              <Text style={[styles.menuSubtitle, dir.text]}>
                {t("accountRateSub")}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={TEAL} />
          </Pressable>

          {/* Complaints → popup, lands in the admin panel */}

          <Pressable
            onPress={() => (user ? setFeedbackMode("complaint") : goToLogin())}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.menuIcon, styles.orangeMenuIcon]}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={21}
                color={LIGHT_ORANGE}
              />
            </View>

            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, dir.text]}>
                {t("accountComplaint")}
              </Text>

              <Text style={[styles.menuSubtitle, dir.text]}>
                {t("accountComplaintSub")}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={ORANGE} />
          </Pressable>
        </Animated.View>

        <FeedbackSheet
          mode={feedbackMode}
          visible={!!feedbackMode}
          onClose={closeFeedback}
        />

        {/* ================= LOGOUT / DELETE (signed-in only) ================= */}

        {user && (
          <>
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
                <ActivityIndicator size="small" color={ORANGE} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={18} color={ORANGE} />

                  <Text style={styles.logoutText}>{t("accountLogout")}</Text>
                </>
              )}
            </Pressable>
            {/* =========  DELETE =============== */}

            <Pressable
              onPress={onDeleteAccount}
              disabled={deleting}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.pressed,
                deleting && styles.logoutDisabled,
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={TEAL} />

              <Text style={styles.deleteBtnText}>
                {deleting ? t("accountDeleting") : t("accountDelete")}
              </Text>
            </Pressable>
          </>
        )}
        {/* language switch lives in the top corner of every screen (components/LangToggle) */}

        <MadeBy />
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

  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ORANGE,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 42,
    marginTop: 2,
    marginBottom: 6,
  },

  loginBtnText: {
    color: WHITE,
    fontSize: 17,
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

  statNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statNumber: {
    color: ORANGE,
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

  locationCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECEDEB",
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  mapBox: {
    height: 140,
    backgroundColor: "#EEF1F0",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
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

  /* ================= LOGOUT ================= */

  logoutButton: {
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: ORANGE,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 17,
    zIndex: 2,
  },

  logoutText: {
    color: ORANGE,
    fontSize: 18,
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
