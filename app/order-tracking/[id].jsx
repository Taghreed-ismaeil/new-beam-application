import BackButton from "@/components/BackButton";
import Reanimated from "react-native-reanimated";
import { enterDown, enterFromLeft, enterPop, enterUp } from "@/lib/motion";
import { API_BASE, apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { io } from "socket.io-client";
import { Text } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const BG = "#FAF7F4";
const DARK = "#17201F";
const MUTED = "#7C8582";
const BORDER = "#EFE7E1";
const RED = "#C0392B";
const WHITE = "#FFFFFF";

// Each order type goes through its own set of steps — only delivery has
// "On the way", and the wording of the last two steps depends on the type.
function stepsFor(orderType, t) {
  const common = [
    { key: "pending", label: t("trackStepReceived"), hint: t("trackStepReceivedHint"), icon: "receipt-outline" },
    { key: "accepted", label: t("trackStepAccepted"), hint: t("trackStepAcceptedHint"), icon: "checkmark-done-outline" },
    { key: "preparing", label: t("trackStepPreparing"), hint: t("trackStepPreparingHint"), icon: "flame-outline" },
  ];

  if (orderType === "delivery") {
    return [
      ...common,
      { key: "ready", label: t("trackStepReady"), hint: t("trackStepReadyDriverHint"), icon: "bag-check-outline" },
      { key: "out_for_delivery", label: t("trackStepOnTheWay"), hint: t("trackStepOnTheWayHint"), icon: "bicycle-outline" },
      { key: "completed", label: t("trackStepDelivered"), hint: t("trackEnjoy"), icon: "happy-outline" },
    ];
  }

  if (orderType === "dine_in") {
    return [
      ...common,
      { key: "ready", label: t("trackStepReady"), hint: t("trackStepReadyTableHint"), icon: "restaurant-outline" },
      { key: "completed", label: t("trackStepServed"), hint: t("trackEnjoy"), icon: "happy-outline" },
    ];
  }

  return [
    ...common,
    { key: "ready", label: t("trackStepReadyPickup"), hint: t("trackStepReadyPickupHint"), icon: "bag-check-outline" },
    { key: "completed", label: t("trackStepPickedUp"), hint: t("trackEnjoy"), icon: "happy-outline" },
  ];
}

const TYPE_LABEL_KEY = {
  pickup: "trackTypePickup",
  delivery: "trackTypeDelivery",
  dine_in: "trackTypeTable",
  counter: "trackTypeCounter",
};

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Soft pulsing ring behind the current step's icon.
function Pulse({ color }) {
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        enStyles.pulse,
        {
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
        },
      ]}
    />
  );
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const orderId = Number(id);
  const [order, setOrder] = useState(null);
  const [failed, setFailed] = useState(false);
  const { t, lang, dir } = useAppLang();
  const isAr = lang === "ar";
  // Arabic keeps the same layout, just with bigger text (see AR_TEXT below).
  const styles = isAr ? arStyles : enStyles;

  useEffect(() => {
    apiRequest(`/api/orders/${orderId}`)
      .then((d) => setOrder(d.order))
      .catch(() => setFailed(true));

    const socket = io(API_BASE);
    socket.on("order:updated", (updated) => {
      if (updated.id !== orderId) return;
      // Live updates don't carry the status history — keep ours and stamp the
      // new status with the time we heard about it.
      setOrder((prev) => {
        if (!prev) return updated;
        const logs = prev.statusLogs ?? [];
        const statusLogs =
          updated.status !== prev.status
            ? [...logs, { status: updated.status, changedAt: new Date().toISOString() }]
            : logs;
        return { ...prev, ...updated, statusLogs };
      });
    });
    return () => socket.disconnect();
  }, [orderId]);

  if (!order) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <BackButton />
        {failed ? (
          <>
            <Ionicons name="alert-circle-outline" size={40} color={MUTED} />
            <Text style={styles.failedText}>{t("trackLoadFailed")}</Text>
          </>
        ) : (
          <ActivityIndicator color={TEAL} />
        )}
      </View>
    );
  }

  const steps = stepsFor(order.orderType, t);
  const cancelled = order.status === "cancelled";
  const stepIndex = Math.max(0, steps.findIndex((s) => s.key === order.status));
  const current = steps[stepIndex];
  const done = order.status === "completed";

  const logTime = {};
  for (const l of order.statusLogs ?? []) logTime[l.status] = l.changedAt;
  logTime.pending = logTime.pending ?? order.createdAt;

  const itemCount = (order.items ?? []).reduce((s, it) => s + it.quantity, 0);

  // Same Arabic counting rules as the confirm screen.
  const itemCountLabel = isAr
    ? itemCount === 1
      ? t("confirmItemsOne")
      : itemCount === 2
        ? t("confirmItemsTwo")
        : itemCount <= 10
          ? t("confirmItemsFew", { count: itemCount })
          : t("confirmItemsMany", { count: itemCount })
    : itemCount === 1
      ? t("confirmItemsOne")
      : t("confirmItemsMany", { count: itemCount });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <BackButton />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* =====================================================
            HEADER + CURRENT STATUS
        ====================================================== */}
        <View style={styles.header}>
          <Reanimated.Text entering={enterDown(0)} style={styles.headerTitle}>
            {t("trackOrderNo", { id: order.id })}
          </Reanimated.Text>

          <Reanimated.View entering={enterPop(1)} style={styles.headerChips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{TYPE_LABEL_KEY[order.orderType] ? t(TYPE_LABEL_KEY[order.orderType]) : order.orderType}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{itemCountLabel}</Text>
            </View>
          </Reanimated.View>

          <Reanimated.View entering={enterUp(2)} style={styles.statusCard}>
            {cancelled ? (
              <>
                <View style={[styles.statusIcon, { backgroundColor: "#FDECEA" }]}>
                  <Ionicons name="close-circle-outline" size={34} color={RED} />
                </View>
                <Text style={[styles.statusTitle, { color: RED }]}>{t("trackCancelled")}</Text>
                <Text style={styles.statusHint}>
                  {order.cancelReason || t("trackCancelledHint")}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.statusIconWrap}>
                  {!done && <Pulse color={ORANGE} />}
                  <View style={[styles.statusIcon, done && { backgroundColor: LIGHT_TEAL }]}>
                    <Ionicons name={current.icon} size={32} color={done ? TEAL : ORANGE} />
                  </View>
                </View>
                <Text style={styles.statusTitle}>{current.label}</Text>
                <Text style={styles.statusHint}>{current.hint}</Text>

                {/* progress bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((stepIndex + 1) / steps.length) * 100}%` },
                      done && { backgroundColor: TEAL },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {t("trackStepOf", { step: stepIndex + 1, total: steps.length })}
                </Text>
              </>
            )}
          </Reanimated.View>
        </View>

        <View style={styles.body}>
          {/* =====================================================
              CLIQ PAYMENT PENDING
          ====================================================== */}
          {order.paymentMethod === "cliq" && order.paymentStatus !== "paid" && !cancelled && (
            <View style={styles.noteBox}>
              <Ionicons name="time-outline" size={18} color={ORANGE} />
              <Text style={[styles.noteText, dir.text]}>{t("trackCliqWaiting")}</Text>
            </View>
          )}

          {/* =====================================================
              DRIVER
          ====================================================== */}
          {order.orderType === "delivery" && order.driver && !cancelled && !done && (
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Ionicons name="bicycle" size={22} color={WHITE} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.detailLabel, dir.text]}>{t("trackYourDriver")}</Text>
                <Text style={[styles.detailValue, dir.text]}>{order.driver.name}</Text>
              </View>
              {!!order.driver.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${order.driver.phone}`)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={18} color={WHITE} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* =====================================================
              TIMELINE
          ====================================================== */}
          {!cancelled && (
            <>
              <Text style={[styles.sectionTitle, dir.text, dir.noSpacing]}>{t("trackProgress")}</Text>
              <Reanimated.View entering={enterUp(3)} style={styles.card}>
                {steps.map((s, i) => {
                  const isDone = i < stepIndex || done;
                  const isCurrent = i === stepIndex && !done;
                  const isLast = i === steps.length - 1;
                  return (
                    <Reanimated.View entering={enterFromLeft(i + 3)} key={s.key} style={styles.stepRow}>
                      <View style={styles.stepRail}>
                        <View
                          style={[
                            styles.stepDot,
                            isDone && styles.stepDotDone,
                            isCurrent && styles.stepDotCurrent,
                          ]}
                        >
                          {isDone ? (
                            <Ionicons name="checkmark" size={14} color={WHITE} />
                          ) : (
                            <Ionicons name={s.icon} size={13} color={isCurrent ? WHITE : "#B9BFBC"} />
                          )}
                        </View>
                        {!isLast && <View style={[styles.stepLine, i < stepIndex && styles.stepLineDone]} />}
                      </View>

                      <View style={[styles.stepTextWrap, !isLast && { paddingBottom: 18 }]}>
                        <View style={styles.stepTitleRow}>
                          <Text
                            style={[
                              styles.stepLabel,
                              (isDone || isCurrent) && styles.stepLabelActive,
                              isCurrent && { color: ORANGE },
                            ]}
                          >
                            {s.label}
                          </Text>
                          {(isDone || isCurrent) && !!logTime[s.key] && (
                            <Text style={styles.stepTime}>{formatTime(logTime[s.key])}</Text>
                          )}
                        </View>
                        {isCurrent && <Text style={[styles.stepHint, dir.text]}>{s.hint}</Text>}
                      </View>
                    </Reanimated.View>
                  );
                })}
              </Reanimated.View>
            </>
          )}

          {/* =====================================================
              DETAILS
          ====================================================== */}
          <Text style={[styles.sectionTitle, dir.text, dir.noSpacing]}>{t("trackDetails")}</Text>
          <Reanimated.View entering={enterUp(4)} style={styles.card}>
            {order.orderType === "delivery" && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color={TEAL} />
                <View style={styles.flex}>
                  <Text style={[styles.detailLabel, dir.text]}>{t("trackDeliveringTo")}</Text>
                  <Text style={[styles.detailValue, dir.text]}>{order.deliveryAddress || t("trackLocationOnMap")}</Text>
                </View>
              </View>
            )}

            {order.orderType === "dine_in" && order.table && (
              <View style={styles.detailRow}>
                <Ionicons name="restaurant-outline" size={18} color={TEAL} />
                <View style={styles.flex}>
                  <Text style={[styles.detailLabel, dir.text]}>{t("trackTable")}</Text>
                  <Text style={[styles.detailValue, dir.text]}>{t("trackTableNo", { n: order.table.tableNumber })}</Text>
                </View>
              </View>
            )}

            {order.orderType === "pickup" && (
              <View style={styles.detailRow}>
                <Ionicons name="storefront-outline" size={18} color={TEAL} />
                <View style={styles.flex}>
                  <Text style={[styles.detailLabel, dir.text]}>{t("trackPickup")}</Text>
                  <Text style={[styles.detailValue, dir.text]}>{t("trackFromCounter")}</Text>
                </View>
              </View>
            )}

            <View style={[styles.detailRow, styles.divider]}>
              <Ionicons
                name={order.paymentMethod === "cliq" ? "phone-portrait-outline" : "cash-outline"}
                size={18}
                color={TEAL}
              />
              <View style={styles.flex}>
                <Text style={[styles.detailLabel, dir.text]}>{t("trackPayment")}</Text>
                <Text style={[styles.detailValue, dir.text]}>
                  {order.paymentMethod === "cliq" ? "CliQ" : t("trackCash")}
                  {order.paymentStatus === "paid" ? t("trackPaid") : ""}
                </Text>
              </View>
            </View>
          </Reanimated.View>

          {/* =====================================================
              ITEMS
          ====================================================== */}
          <Text style={[styles.sectionTitle, dir.text, dir.noSpacing]}>{t("trackYourOrder")}</Text>
          <Reanimated.View entering={enterUp(5)} style={styles.card}>
            {(order.items ?? []).map((it, i) => (
              <View key={it.id} style={[styles.itemRow, i > 0 && styles.divider]}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{it.quantity}×</Text>
                </View>
                <Text style={[styles.itemName, dir.text]} numberOfLines={2}>
                  {isAr ? it.nameSnapshot || it.nameEnSnapshot : it.nameEnSnapshot || it.nameSnapshot}
                </Text>
                <Text style={styles.itemPrice}>
                  {(Number(it.unitPriceSnapshot) * it.quantity).toFixed(2)} {t("jd")}
                </Text>
              </View>
            ))}

            <View style={[styles.totalRow, styles.divider]}>
              <Text style={styles.totalLabel}>{t("trackTotal")}</Text>
              <Text style={styles.totalValue}>{Number(order.total).toFixed(2)} {t("jd")}</Text>
            </View>
          </Reanimated.View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => router.dismissTo("/")} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>{t("trackBackHome")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const baseStyles = {
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  failedText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },

  scroll: {
    // clears the absolutely-positioned bottom tab bar
    paddingBottom: 110,
  },

  flex: {
    flex: 1,
    minWidth: 0,
  },

  /* ---------------- HEADER ---------------- */

  header: {
    backgroundColor: TEAL,
    // title sits on the BackButton's row (top:50, 38 tall), centered and clear of it
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
  },

  headerTitle: {
    height: 38,
    lineHeight: 38,
    paddingHorizontal: 50,
    fontSize: 24,
    fontWeight: "900",
    color: WHITE,
    textAlign: "center",
  },

  headerChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  chip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  chipText: {
    color: LIGHT_TEAL,
    fontSize: 12,
    fontWeight: "800",
  },

  statusCard: {
    width: "100%",
    marginTop: 16,
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
  },

  statusIconWrap: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  pulse: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
  },

  statusIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  statusTitle: {
    color: DARK,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },

  statusHint: {
    color: MUTED,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },

  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1ECE8",
    marginTop: 16,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: ORANGE,
  },

  progressText: {
    marginTop: 6,
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },

  /* ---------------- BODY ---------------- */

  body: {
    paddingHorizontal: 16,
  },

  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    color: TEAL,
    textTransform: "uppercase",
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: "#F3EEEA",
  },

  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: LIGHT_ORANGE,
    borderRadius: 14,
    padding: 12,
  },

  noteText: {
    flex: 1,
    color: ORANGE,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* ---------------- DRIVER ---------------- */

  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CFE7E2",
    padding: 12,
  },

  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------------- TIMELINE ---------------- */

  stepRow: {
    flexDirection: "row",
    paddingTop: 12,
  },

  stepRail: {
    width: 28,
    alignItems: "center",
  },

  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1ECE8",
    alignItems: "center",
    justifyContent: "center",
  },

  stepDotDone: {
    backgroundColor: TEAL,
  },

  stepDotCurrent: {
    backgroundColor: ORANGE,
  },

  stepLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -8,
    backgroundColor: "#ECE6E1",
  },

  stepLineDone: {
    backgroundColor: TEAL,
  },

  stepTextWrap: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 3,
  },

  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  stepLabel: {
    color: "#A3A9A6",
    fontSize: 14,
    fontWeight: "700",
  },

  stepLabelActive: {
    color: DARK,
    fontWeight: "900",
  },

  stepTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  stepHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  /* ---------------- DETAILS ---------------- */

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },

  detailLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  detailValue: {
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },

  /* ---------------- ITEMS ---------------- */

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },

  qtyBadge: {
    minWidth: 34,
    height: 28,
    borderRadius: 9,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  qtyText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "900",
  },

  itemName: {
    flex: 1,
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },

  itemPrice: {
    color: DARK,
    fontSize: 13,
    fontWeight: "800",
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },

  totalLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "800",
  },

  totalValue: {
    color: DARK,
    fontSize: 20,
    fontWeight: "900",
  },

  homeBtn: {
    marginTop: 22,
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ORANGE,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  homeBtnText: {
    color: ORANGE,
    fontSize: 15,
    fontWeight: "900",
  },
};

/*
 * Arabic glyphs read smaller than Latin at the same size — bump the text
 * sizes only. The layout stays exactly like English.
 */
const AR_TEXT = {
  failedText: { fontSize: 16 },
  headerTitle: { fontSize: 25 },
  chipText: { fontSize: 14 },
  statusTitle: { fontSize: 23 },
  statusHint: { fontSize: 15 },
  progressText: { fontSize: 13 },
  sectionTitle: { fontSize: 15 },
  noteText: { fontSize: 14 },
  stepLabel: { fontSize: 16 },
  stepTime: { fontSize: 12 },
  stepHint: { fontSize: 14 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 16 },
  qtyText: { fontSize: 13 },
  itemName: { fontSize: 16 },
  itemPrice: { fontSize: 14 },
  totalLabel: { fontSize: 16 },
  homeBtnText: { fontSize: 17 },
};

const enStyles = StyleSheet.create(baseStyles);

const arStyles = StyleSheet.create(
  Object.fromEntries(
    Object.entries(baseStyles).map(([key, style]) => [
      key,
      { ...style, ...AR_TEXT[key] },
    ])
  )
);
