import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import SalesChart from "@/components/admin/SalesChart";
import { NAV_GROUPS, ROLE_LABEL, SECTIONS, SIDEBAR_BREAKPOINT } from "@/components/admin/nav";
import { BOTTOM_SPACE, Btn, C, RADIUS, SHADOW, T } from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import {
  fetchDashboardAlerts,
  fetchDashboardSummary,
  fetchOrders,
  fetchSalesSeries,
  fetchTopItems,
} from "@/lib/admin-api";
import { useDirection, useI18n } from "@/lib/i18n";
import { useLiveUpdates } from "@/lib/use-live-updates";

const KITCHEN_STATUSES = ["preparing", "ready", "completed"];
const RANGES = ["day", "week", "month"];
const BEAM_LOGO = require("../../assets/img/beam_logoo.jpg");

export default function AdminHome() {
  const { staff, can, signOut } = useStaff();
  const { t, tn, pick } = useI18n();
  const dir = useDirection();
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;

  const [range, setRange] = useState("week");
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [series, setSeries] = useState(null);
  const [topItems, setTopItems] = useState(null);
  const [openOrders, setOpenOrders] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrders, setNewOrders] = useState(0);

  const seesDashboard = can("dashboard");
  // Revenue and best-sellers are a step above the general dashboard — owner/manager only.
  const seesReports = can("reports");
  const seesOrders = can("orders");
  const canSell = can("orders", "edit");

  // The "waiting" badge on the orders shortcut — works off the orders list, so it shows even
  // where the dashboard analytics aren't available.
  const loadOpenOrders = useCallback(() => {
    if (!seesOrders) return Promise.resolve();
    return fetchOrders({ status: "open", limit: 1 })
      .then((d) => setOpenOrders(d.counts?.open ?? d.total ?? 0))
      .catch(() => setOpenOrders(null));
  }, [seesOrders]);

  const loadSummary = useCallback(() => {
    if (!seesDashboard) return Promise.resolve();
    return Promise.all([
      fetchDashboardSummary()
        .then(setSummary)
        .catch(() => setSummary(null)),
      fetchDashboardAlerts()
        .then((d) => setAlerts(d.alerts))
        .catch(() => setAlerts([])),
    ]);
  }, [seesDashboard]);

  const loadForRange = useCallback(
    (which) => {
      if (!seesDashboard) return Promise.resolve();
      const tasks = [
        fetchSalesSeries(which)
          .then(setSeries)
          .catch(() => setSeries({ total: 0, points: [] })),
      ];
      if (seesReports) {
        tasks.push(
          fetchTopItems(which)
            .then((d) => setTopItems(d.items))
            .catch(() => setTopItems([])),
        );
      }
      return Promise.all(tasks);
    },
    [seesDashboard, seesReports],
  );

  useEffect(() => {
    loadSummary();
    loadOpenOrders();
  }, [loadSummary, loadOpenOrders]);

  useEffect(() => {
    setSeries(null);
    loadForRange(range);
  }, [range, loadForRange]);

  // Debounced, because a dinner rush fires these faster than the numbers are worth redrawing.
  const timer = useRef(null);
  const live = useLiveUpdates({
    "order:new": () => {
      setNewOrders((n) => n + 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        loadSummary();
        loadOpenOrders();
        loadForRange(range);
      }, 1200);
    },
    "order:updated": () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(loadOpenOrders, 1200);
    },
    "dashboard:stale": () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(loadSummary, 1200);
    },
  });

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  async function refresh() {
    setRefreshing(true);
    setNewOrders(0);
    await Promise.all([loadSummary(), loadOpenOrders(), loadForRange(range)]);
    setRefreshing(false);
  }

  const visible = SECTIONS.filter((s) => can(s.resource));
  const money = (n) => `${Number(n ?? 0).toFixed(2)} ${t("currency")}`;
  const greeting = t(new Date().getHours() < 12 ? "greetMorning" : "greetEvening");
  const firstName = (staff?.name ?? "").trim().split(/\s+/)[0];

  const statusCells = [
    ...KITCHEN_STATUSES.map((key) => ({
      key,
      value: summary?.byStatus?.[key] ?? 0,
      label: t(`status_${key}`),
    })),
    { key: "reservations", value: summary?.reservations?.total ?? 0, label: t("statReservations") },
  ];

  // The few things staff open the panel to do, one tap from landing.
  const quick = [
    seesOrders && {
      key: "orders",
      icon: "receipt-outline",
      title: t("navOrdersTitle"),
      badge: openOrders,
      badgeLabel: t("quickOrdersWaiting"),
      href: "/admin/orders",
    },
    can("reservations") && {
      key: "reservations",
      icon: "calendar-outline",
      title: t("navReservationsTitle"),
      href: "/admin/reservations",
    },
    can("menu") && { key: "menu", icon: "restaurant-outline", title: t("navMenuTitle"), href: "/admin/menu" },
    can("rewards") && { key: "rewards", icon: "gift-outline", title: t("navRewardsTitle"), href: "/admin/rewards" },
  ].filter(Boolean);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.teal} />}
      >
        {/* ---------- brand band ---------- */}
        <LinearGradient colors={[C.teal, C.tealDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.band}>
          <View style={[styles.container, styles.bandInner]}>
            <View style={[styles.bandTop, dir.row]}>
              {!wide && <Image source={BEAM_LOGO} style={styles.logo} resizeMode="contain" />}
              <View style={{ flex: 1 }} />
              {seesDashboard && (
                <View style={[styles.liveChip, dir.row]}>
                  <View style={[styles.liveDot, live !== "live" && styles.liveDotOff]} />
                  <Text style={styles.liveText}>{t(live === "live" ? "liveOn" : "liveOff")}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.greeting, dir.text]}>
              {greeting}
              {firstName ? `${dir.isRTL ? "،" : ","} ${firstName}` : ""}
            </Text>
            <View style={[styles.titleRow, dir.row]}>
              <Text style={[styles.bandTitle, dir.text]}>{t("controlCentre")}</Text>
              {!!staff && (
                <View style={styles.roleChip}>
                  <Text style={styles.roleText}>{t(ROLE_LABEL[staff.role] ?? "admin")}</Text>
                </View>
              )}
            </View>

            {seesDashboard && (
              <View style={styles.todayPanel}>
                <View style={[styles.todayHead, dir.row]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.todayLabel, dir.text]}>{t("todayTitle")}</Text>
                    <Text style={[styles.todayNumber, dir.text]}>{money(summary?.sales)}</Text>
                    <Text style={[styles.todayCaption, dir.text]}>
                      {tn("ordersCount", summary?.ordersCount ?? 0)} ·{" "}
                      {t("avgOrder", { value: money(summary?.averageOrder) })}
                    </Text>
                  </View>
                  {summary?.salesChangePct != null && (
                    <View style={[styles.delta, dir.row, summary.salesChangePct < 0 && styles.deltaDown]}>
                      <Ionicons
                        name={summary.salesChangePct >= 0 ? "trending-up" : "trending-down"}
                        size={14}
                        color={C.white}
                      />
                      <Text style={styles.deltaText}>{Math.abs(summary.salesChangePct)}%</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusRow, dir.row]}>
                  {statusCells.map((cell) => (
                    <View key={cell.key} style={styles.statusCell}>
                      <Text style={styles.statusValue}>{cell.value}</Text>
                      <Text style={styles.statusLabel} numberOfLines={1}>
                        {cell.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={[styles.container, styles.body]}>
          {/* a nudge rather than a jump — the numbers refresh on their own a moment later */}
          {newOrders > 0 && (
            <Pressable
              onPress={() => {
                setNewOrders(0);
                router.push("/admin/orders");
              }}
              style={[styles.newOrders, dir.row]}
            >
              <View style={styles.newOrdersIcon}>
                <Ionicons name="notifications" size={17} color={C.white} />
              </View>
              <Text style={[styles.newOrdersText, dir.text]}>{tn("newOrdersBanner", newOrders)}</Text>
              <Ionicons name={dir.chevron} size={18} color={C.orange} />
            </Pressable>
          )}

          {/* ---------- quick actions ---------- */}
          {(canSell || quick.length > 0) && (
            <View style={styles.quickWrap}>
              {canSell && (
                <Pressable
                  onPress={() => router.push("/admin/orders?sale=1")}
                  style={({ pressed }) => [styles.saleCta, dir.row, pressed && styles.saleCtaPressed]}
                >
                  <View style={styles.saleIcon}>
                    <Ionicons name="add" size={26} color={C.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.saleTitle, dir.text]}>{t("quickNewSale")}</Text>
                    <Text style={[styles.saleHint, dir.text]}>{t("quickNewSaleHint")}</Text>
                  </View>
                  <Ionicons name={dir.chevron} size={20} color="rgba(255,255,255,0.85)" />
                </Pressable>
              )}

              <View style={[styles.quickGrid, dir.row]}>
                {quick.map((q) => (
                  <Pressable
                    key={q.key}
                    onPress={() => router.push(q.href)}
                    style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
                  >
                    <View style={[styles.quickHead, dir.row]}>
                      <View style={styles.quickIcon}>
                        <Ionicons name={q.icon} size={21} color={C.teal} />
                      </View>
                      {!!q.badge && (
                        <View style={styles.quickBadge}>
                          <Text style={styles.quickBadgeText}>{q.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[T.title, dir.text]} numberOfLines={1}>
                      {q.title}
                    </Text>
                    {!!q.badge && (
                      <Text style={[styles.quickSub, dir.text]} numberOfLines={1}>
                        {q.badge} {q.badgeLabel}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {seesDashboard && (
            <View style={wide && styles.twoCol}>
              <View style={wide && styles.colMain}>
                {/* ---------- alerts ---------- */}
                {!!alerts?.length && (
                  <View style={[styles.card, styles.alertCard]}>
                    <View style={[styles.cardHead, dir.row]}>
                      <Text style={[T.h2, dir.text]}>{t("alertsTitle")}</Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{alerts.length}</Text>
                      </View>
                    </View>
                    {alerts.map((a, i) => (
                      <View key={a.id} style={[styles.alert, dir.row, i > 0 && styles.alertDivider]}>
                        <View style={[styles.alertIcon, a.severity === "high" && styles.alertIconHigh]}>
                          <Ionicons
                            name={a.kind === "order_late" ? "time-outline" : "cube-outline"}
                            size={16}
                            color={a.severity === "high" ? C.danger : C.orange}
                          />
                        </View>
                        <Text style={[T.body, styles.alertText, dir.text]}>
                          {a.kind === "order_late"
                            ? t("alertLateOrder", { id: a.orderId, minutes: a.minutes })
                            : a.kind === "stock_out"
                              ? t("alertStockOut", { name: pick(a) })
                              : t("alertStockLow", { name: pick(a), quantity: a.quantity, unit: a.unit })}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* ---------- sales ---------- */}
                <View style={styles.card}>
                  <View style={[styles.cardHead, dir.row]}>
                    <View>
                      <Text style={[T.label, dir.text]}>{t("salesTitle")}</Text>
                      <Text style={[styles.rangeTotal, dir.text]}>{money(series?.total)}</Text>
                    </View>
                    <View style={[styles.segment, dir.row]}>
                      {RANGES.map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => setRange(r)}
                          style={[styles.segmentItem, range === r && styles.segmentItemOn]}
                        >
                          <Text style={[styles.segmentText, range === r && styles.segmentTextOn]}>
                            {t(`range_${r}`)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <SalesChart points={series?.points} range={range} loading={series === null} />
                </View>
              </View>

              {/* ---------- best sellers ---------- */}
              {seesReports && (
                <View style={[styles.card, wide && styles.colSide]}>
                  <Text style={[T.h2, dir.text, { marginBottom: 4 }]}>{t("topItemsTitle")}</Text>
                  {topItems?.length ? (
                    topItems.map((item, i) => {
                      const most = topItems[0].quantity || 1;
                      return (
                        <View key={`${item.menuItemId}-${i}`} style={styles.topRow}>
                          <View style={[styles.topHead, dir.row]}>
                            <View style={[styles.rankBadge, i === 0 && styles.rankFirst]}>
                              <Text style={[styles.rankText, i === 0 && styles.rankTextFirst]}>{i + 1}</Text>
                            </View>
                            <Text style={[T.title, styles.topName, dir.text]} numberOfLines={1}>
                              {pick(item)}
                            </Text>
                            <Text style={[T.caption, styles.topQty]}>{tn("soldCount", item.quantity)}</Text>
                          </View>
                          {/* the bar is the comparison; the number is the detail */}
                          <View style={[styles.topBarRow, dir.row]}>
                            <View style={styles.topTrack}>
                              <View
                                style={[
                                  styles.topFill,
                                  i === 0 && styles.topFillFirst,
                                  dir.isRTL && { alignSelf: "flex-end" },
                                  { width: `${(item.quantity / most) * 100}%` },
                                ]}
                              />
                            </View>
                            <Text style={[T.label, styles.topRevenue]}>{money(item.revenue)}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyTop}>
                      <Ionicons name="bar-chart-outline" size={22} color={C.placeholder} />
                      <Text style={[T.caption, { textAlign: "center" }]}>{t("chartEmpty")}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ---------- all sections (the sidebar covers this on wide screens) ---------- */}
          {!wide && (
            <>
              {visible.length > 0 && <Text style={[T.h2, styles.manageTitle, dir.text]}>{t("manageTitle")}</Text>}
              {NAV_GROUPS.map(({ key, label }) => {
                const items = visible.filter((s) => s.group === key);
                if (!items.length) return null;
                return (
                  <View key={key} style={styles.navGroup}>
                    <Text style={[T.label, styles.groupLabel, dir.text]}>{t(label)}</Text>
                    <View style={styles.navList}>
                      {items.map((section, i) => (
                        <Pressable
                          key={section.key}
                          onPress={() => router.push(section.href)}
                          style={({ pressed }) => [
                            styles.navRow,
                            dir.row,
                            i > 0 && styles.navDivider,
                            pressed && styles.navPressed,
                          ]}
                        >
                          <View style={[styles.navIcon, key === "operations" && styles.navIconHot]}>
                            <Ionicons
                              name={section.icon}
                              size={20}
                              color={key === "operations" ? C.orange : C.teal}
                            />
                          </View>
                          <View style={styles.navText}>
                            <Text style={[T.title, dir.text]} numberOfLines={1}>
                              {t(section.title)}
                            </Text>
                            <Text style={[T.caption, dir.text]} numberOfLines={1}>
                              {t(section.text)}
                            </Text>
                          </View>
                          <Ionicons name={dir.chevron} size={18} color={C.placeholder} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}

              <View style={{ marginTop: 18 }}>
                <Btn title={t("signOut")} variant="outline" icon="log-out-outline" onPress={signOut} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: BOTTOM_SPACE },
  // caps the width on tablets / desktop web so the dashboard reads as a composed page
  container: { width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: 20 },

  /* brand band */
  band: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  bandInner: { paddingTop: 18, paddingBottom: 22 },
  bandTop: { alignItems: "center", minHeight: 40 },
  logo: { width: 104, height: 44 },
  greeting: { color: "rgba(255,255,255,0.72)", fontSize: fs(16.5), fontWeight: "600", marginTop: 16 },
  titleRow: { alignItems: "center", gap: 10, marginTop: 2 },
  bandTitle: { color: C.white, fontSize: fs(29), fontWeight: "800", letterSpacing: -0.4 },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.orange,
  },
  roleText: { color: C.white, fontSize: fs(14), fontWeight: "700" },

  liveChip: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7FE0C8" },
  liveDotOff: { backgroundColor: "rgba(255,255,255,0.45)" },
  liveText: { color: C.white, fontSize: fs(14.5), fontWeight: "700" },

  todayPanel: {
    marginTop: 18,
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  todayHead: { alignItems: "flex-start", gap: 12 },
  todayLabel: { color: "rgba(255,255,255,0.7)", fontSize: fs(15.5), fontWeight: "600" },
  todayNumber: { color: C.white, fontSize: fs(36), fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  todayCaption: { color: "rgba(255,255,255,0.66)", fontSize: fs(15.5), fontWeight: "500", marginTop: 2 },
  delta: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(127,224,200,0.28)",
  },
  deltaDown: { backgroundColor: "rgba(242,84,27,0.55)" },
  deltaText: { color: C.white, fontSize: fs(14.5), fontWeight: "700" },
  statusRow: { gap: 8, marginTop: 16 },
  statusCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusValue: { color: C.white, fontSize: fs(21), fontWeight: "800" },
  statusLabel: { color: "rgba(255,255,255,0.66)", fontSize: fs(14), fontWeight: "600", marginTop: 2 },

  body: { paddingTop: 18 },

  newOrders: {
    alignItems: "center",
    gap: 12,
    backgroundColor: C.lightOrange,
    borderWidth: 1,
    borderColor: "#FBD3C2",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  newOrdersIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  newOrdersText: { flex: 1, color: "#B8400F", fontSize: fs(17), fontWeight: "700" },

  /* quick actions */
  quickWrap: { marginBottom: 6 },
  saleCta: {
    alignItems: "center",
    gap: 14,
    backgroundColor: C.orange,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    ...SHADOW,
  },
  saleCtaPressed: { backgroundColor: "#D9460F" },
  saleIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  saleTitle: { color: C.white, fontSize: fs(19), fontWeight: "800" },
  saleHint: { color: "rgba(255,255,255,0.85)", fontSize: fs(15.5), fontWeight: "500", marginTop: 2 },
  quickGrid: { flexWrap: "wrap", gap: 12 },
  quickTile: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 140,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
    ...SHADOW,
  },
  quickHead: { alignItems: "center", justifyContent: "space-between" },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBadgeText: { color: C.white, fontSize: fs(15.5), fontWeight: "800" },
  quickSub: { color: C.orange, fontSize: fs(15), fontWeight: "700", marginTop: -6 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },

  /* wide layout */
  twoCol: { flexDirection: "row", gap: 14, alignItems: "flex-start", marginTop: 8 },
  colMain: { flex: 1.6, minWidth: 0 },
  colSide: { flex: 1, minWidth: 0 },

  card: {
    borderRadius: RADIUS.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginTop: 8,
    marginBottom: 14,
    ...SHADOW,
  },
  alertCard: { borderColor: "#FBD3C2" },
  cardHead: { alignItems: "flex-start", justifyContent: "space-between", gap: 12 },

  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { color: C.white, fontSize: fs(14.5), fontWeight: "800" },
  alert: { alignItems: "center", gap: 12, paddingVertical: 12 },
  alertDivider: { borderTopWidth: 1, borderTopColor: C.border },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.lightOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  alertIconHigh: { backgroundColor: C.lightDanger },
  alertText: { flex: 1 },

  rangeTotal: { color: C.dark, fontSize: fs(27), fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  segment: { backgroundColor: C.surfaceAlt, borderRadius: RADIUS.sm + 2, padding: 3, gap: 2 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  segmentItemOn: { backgroundColor: C.teal },
  segmentText: { color: C.muted, fontSize: fs(15), fontWeight: "600" },
  segmentTextOn: { color: C.white, fontWeight: "700" },

  topRow: { marginTop: 16 },
  topHead: { alignItems: "center", gap: 10 },
  topName: { flex: 1, minWidth: 0 },
  topQty: { fontWeight: "600" },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rankFirst: { backgroundColor: C.orange },
  rankText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  rankTextFirst: { color: C.white },
  topBarRow: { alignItems: "center", gap: 10, marginTop: 8 },
  topTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt, overflow: "hidden" },
  topFill: { height: 6, borderRadius: 3, backgroundColor: C.teal },
  topFillFirst: { backgroundColor: C.orange },
  topRevenue: { color: C.text },
  emptyTop: { alignItems: "center", gap: 8, paddingVertical: 22 },

  manageTitle: { marginTop: 14, marginBottom: 6 },
  navGroup: { marginTop: 10 },
  groupLabel: { marginBottom: 8, paddingHorizontal: 4 },
  navList: {
    borderRadius: RADIUS.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    ...SHADOW,
  },
  navRow: { alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  navDivider: { borderTopWidth: 1, borderTopColor: C.border },
  navPressed: { backgroundColor: C.surfaceAlt },
  navIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconHot: { backgroundColor: C.lightOrange },
  navText: { flex: 1, minWidth: 0, gap: 2 },
});
