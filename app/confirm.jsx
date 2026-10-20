import MadeBy from "@/components/MadeBy";
import BackButton from "@/components/BackButton";
import Animated from "react-native-reanimated";
import { enterDown, enterPop, enterUp } from "@/lib/motion";
import QrScanner from "@/components/QrScanner";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { takePendingDeliveryLocation } from "@/lib/pendingLocation";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, AnimatedText } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const ORANGE_DARK = "#C94320";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const BG = "#FAF7F4";
const DARK = "#17201F";
const MUTED = "#7C8582";
const BORDER = "#EFE7E1";
const WHITE = "#FFFFFF";

const DRAFT_KEY = "beem_checkout_draft";

const ORDER_TYPES = [
  { value: "pickup", label: "confirmPickup", hint: "confirmPickupHint", icon: "bag-handle-outline" },
  { value: "delivery", label: "confirmDelivery", hint: "confirmDeliveryHint", icon: "bicycle-outline" },
  { value: "dine_in", label: "confirmTable", hint: "confirmTableHint", icon: "restaurant-outline" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "confirmCash", hint: "confirmCashHint", icon: "cash-outline" },
  { value: "cliq", label: "confirmCliq", hint: "confirmCliqHint", icon: "phone-portrait-outline" },
];

function SectionTitle({ children }) {
  const { dir } = useAppLang();

  return (
    <Text style={[styles.sectionTitle, dir.text, dir.noSpacing]}>{children}</Text>
  );
}

export default function CheckoutScreen() {
  const { lines, total, clear } = useCart();
  const { user } = useAuth();
  const { t, lang, pick, dir } = useAppLang();
  const [orderType, setOrderType] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [address, setAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [table, setTable] = useState(null);
  const [scanningTable, setScanningTable] = useState(false);
  const [cliqAlias, setCliqAlias] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { editing } = useCart();

  useEffect(() => {
    apiRequest("/api/restaurant")
      .then((d) => setCliqAlias(d.restaurant?.cliqAlias ?? null))
      .catch(() => {});
  }, []);

  // Restore what was picked last time (survives closing the app). The table
  // isn't saved — a table QR only means something for the current visit.
  const draftLoaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        const d = raw ? JSON.parse(raw) : null;
        if (!d) return;
        if (d.orderType) setOrderType(d.orderType);
        if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
        // a location picked on the map just now beats the saved one
        setDeliveryLat((cur) => cur ?? d.deliveryLat ?? null);
        setDeliveryLng((cur) => cur ?? d.deliveryLng ?? null);
        setAddress((cur) => cur || d.address || "");
      })
      .catch(() => {})
      .finally(() => {
        if (editing) {
          setOrderType(editing.orderType);
          setPaymentMethod(editing.paymentMethod);
          if (editing.deliveryLat != null) setDeliveryLat(editing.deliveryLat);
          if (editing.deliveryLng != null) setDeliveryLng(editing.deliveryLng);
          if (editing.address) setAddress(editing.address);
          if (editing.tableId) setTable({ id: editing.tableId, tableNumber: editing.tableNumber });
        }
        draftLoaded.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ orderType, paymentMethod, address, deliveryLat, deliveryLng }),
    ).catch(() => {});
  }, [orderType, paymentMethod, address, deliveryLat, deliveryLng]);

  useFocusEffect(
    useCallback(() => {
      const picked = takePendingDeliveryLocation();
      if (picked) {
        setDeliveryLat(picked.lat);
        setDeliveryLng(picked.lng);
        setAddress(picked.address);
      }
    }, []),
  );

  function openLocationPicker() {
    router.push({
      pathname: "/delivery-location",
      params: {
        ...(deliveryLat && deliveryLng
          ? { lat: String(deliveryLat), lng: String(deliveryLng) }
          : {}),
        address,
      },
    });
  }

  async function onTableToken(token) {
    setScanningTable(false);
    try {
      const res = await apiRequest(`/api/tables/resolve/${token}`);
      setTable(res.table);
      setError("");
    } catch {
      setError(t("confirmErrTableQr"));
    }
  }

  async function submit() {
    setError("");
    if (orderType === "delivery" && (!deliveryLat || !deliveryLng)) {
      return setError(t("confirmErrLocation"));
    }
    if (orderType === "dine_in" && !table)
      return setError(t("confirmErrScanTable"));

    setBusy(true);
    try {
      // editing an order from the WhatsApp receipt → update it instead of a new one
      const res = await apiRequest(editing ? `/api/orders/${editing.orderId}` : "/api/orders", {
        method: editing ? "PUT" : "POST",
        body: {
          orderType,
          paymentMethod,
          tableId: table?.id,
          deliveryAddress:
            orderType === "delivery" ? address.trim() : undefined,
          deliveryLat: orderType === "delivery" ? deliveryLat : undefined,
          deliveryLng: orderType === "delivery" ? deliveryLng : undefined,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            ...(l.notes ? { notes: l.notes } : {}),
          })),
        },
      });
      clear();
      // keep order type / payment / address for next time — only the table resets
      router.replace(`/order-tracking/${res.order.id}`);
    } catch (e) {
      setError(e?.status === 409 ? t("confirmErrNotEditable") : t("confirmErrPlace"));
    } finally {
      setBusy(false);
    }
  }

  if (scanningTable) {
    return (
      <View style={styles.scannerScreen}>
        <BackButton />
        <Text style={styles.scannerTitle}>{t("confirmScanTitle")}</Text>
        <QrScanner onDecode={onTableToken} />
        <TouchableOpacity onPress={() => setScanningTable(false)} style={styles.scannerCancel}>
          <Text style={styles.scannerCancelText}>{t("cancel")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  // "3 items" — Arabic has its own forms for 1, 2, 3–10 and 11+
  const itemsLabel =
    lang === "ar"
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
            HEADER
        ====================================================== */}
        <View style={styles.header}>
          <AnimatedText entering={enterDown(0)} style={styles.headerTitle}>
            {t("confirmTitle")}
          </AnimatedText>
          <AnimatedText entering={enterDown(1)} style={styles.headerSubtitle}>
            {itemsLabel} · {t("confirmAlmost")}
          </AnimatedText>
        </View>

        {lines.length === 0 ? (
          <Animated.View entering={enterPop(1)} style={styles.empty}>
            <View style={styles.emptyCircle}>
              <Ionicons name="cart-outline" size={38} color={ORANGE} />
            </View>
            <Text style={styles.emptyTitle}>{t("cartEmpty")}</Text>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/menu")} activeOpacity={0.85}>
              <Text style={styles.outlineBtnText}>{t("confirmBrowse")}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.body}>
            {/* =====================================================
                ORDER SUMMARY
            ====================================================== */}
            <View style={[styles.sectionRow, dir.row]}>
              <SectionTitle>{t("confirmYourOrder")}</SectionTitle>
              <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                <Text style={styles.editLink}>{t("confirmEdit")}</Text>
              </TouchableOpacity>
            </View>

            <Animated.View entering={enterUp(2)} style={styles.card}>
              {lines.map((l, i) => (
                <View key={l.menuItemId} style={[styles.lineRow, dir.row, i > 0 && styles.lineDivider]}>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>{l.quantity}×</Text>
                  </View>
                  <Text style={[styles.lineName, dir.text]} numberOfLines={2}>
                    {pick({ name: l.nameAr || l.name, nameEn: l.nameEn || l.name })}
                  </Text>
                  <Text style={styles.linePrice}>
                    {(l.price * l.quantity).toFixed(2)} {t("jd")}
                  </Text>
                </View>
              ))}
            </Animated.View>

            {/* =====================================================
                ORDER TYPE
            ====================================================== */}
            <SectionTitle>{t("confirmHow")}</SectionTitle>

            <Animated.View entering={enterUp(4)} style={[styles.typeRow, dir.row]}>
              {ORDER_TYPES.map((type) => {
                const active = orderType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                    onPress={() => {
                      setOrderType(type.value);
                      setError("");
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                      <Ionicons name={type.icon} size={22} color={active ? WHITE : TEAL} />
                    </View>
                    <Text style={[styles.typeLabel, active && { color: TEAL }]}>
                      {t(type.label)}
                    </Text>
                    <Text style={styles.typeHint}>{t(type.hint)}</Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {orderType === "delivery" &&
              (deliveryLat && deliveryLng ? (
                <TouchableOpacity style={[styles.detailCard, dir.row]} onPress={openLocationPicker} activeOpacity={0.85}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="location" size={20} color={TEAL} />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={[styles.detailLabel, dir.text]}>{t("confirmDeliveringTo")}</Text>
                    <Text style={[styles.detailValue, dir.text]} numberOfLines={2}>
                      {address || t("confirmLocationSet")}
                    </Text>
                  </View>
                  <Text style={styles.changeLink}>{t("confirmChange")}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.dashedBtn, dir.row]} onPress={openLocationPicker} activeOpacity={0.85}>
                  <Ionicons name="map-outline" size={20} color={ORANGE} />
                  <Text style={styles.dashedBtnText}>{t("confirmSetLocation")}</Text>
                </TouchableOpacity>
              ))}

            {orderType === "dine_in" &&
              (table ? (
                <TouchableOpacity style={[styles.detailCard, dir.row]} onPress={() => setScanningTable(true)} activeOpacity={0.85}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={TEAL} />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={[styles.detailLabel, dir.text]}>{t("confirmYourTable")}</Text>
                    <Text style={[styles.detailValue, dir.text]}>
                      {t("confirmTableNumber", { number: table.tableNumber })}
                    </Text>
                  </View>
                  <Text style={styles.changeLink}>{t("confirmRescan")}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.dashedBtn, dir.row]} onPress={() => setScanningTable(true)} activeOpacity={0.85}>
                  <Ionicons name="qr-code-outline" size={20} color={ORANGE} />
                  <Text style={styles.dashedBtnText}>{t("confirmScanTable")}</Text>
                </TouchableOpacity>
              ))}

            {/* =====================================================
                PAYMENT
            ====================================================== */}
            <SectionTitle>{t("confirmPayment")}</SectionTitle>

            <Animated.View entering={enterUp(3)} style={styles.card}>
              {PAYMENT_METHODS.map((p, i) => {
                const active = paymentMethod === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.payRow, dir.row, i > 0 && styles.lineDivider]}
                    onPress={() => setPaymentMethod(p.value)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.payIcon, active && styles.payIconActive]}>
                      <Ionicons name={p.icon} size={20} color={active ? WHITE : TEAL} />
                    </View>
                    <View style={styles.detailText}>
                      <Text style={[styles.payLabel, dir.text]}>{t(p.label)}</Text>
                      <Text style={[styles.payHint, dir.text]}>{t(p.hint)}</Text>
                    </View>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {paymentMethod === "cliq" && (
              <View style={[styles.noteBox, dir.row]}>
                <Ionicons name="information-circle-outline" size={18} color={TEAL} />
                <Text style={[styles.noteText, dir.text]}>
                  {cliqAlias
                    ? t("confirmCliqTransfer", { alias: cliqAlias })
                    : t("confirmCliqNoAlias")}{" "}
                  — {t("confirmCliqWait")}
                </Text>
              </View>
            )}

            {!!error && (
              <View style={[styles.errorBox, dir.row]}>
                <Ionicons name="alert-circle-outline" size={18} color="#C0392B" />
                <Text style={[styles.errorText, dir.text]}>{error}</Text>
              </View>
            )}

            {/* =====================================================
                TOTAL + CONFIRM — last in the flow (not pinned), so it
                never covers the payment options on shorter phones
            ====================================================== */}
            <Animated.View entering={enterUp(5)} style={styles.footer}>
          <View style={[styles.totalRow, dir.row]}>
            <Text style={styles.totalLabel}>{t("cartTotal")}</Text>
            <Text style={styles.totalValue}>
              {total.toFixed(2)} {t("jd")}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, dir.row, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>{t("confirmOrder")}</Text>
                <Ionicons name={dir.arrow} size={18} color={WHITE} />
              </>
            )}
          </TouchableOpacity>

          {!user && <Text style={styles.guestHint}>{t("confirmGuestHint")}</Text>}
            </Animated.View>
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
    backgroundColor: BG,
  },

  scroll: {
    // clears the absolutely-positioned bottom tab bar
    paddingBottom: 100,
  },

  /* ---------------- HEADER ---------------- */

  header: {
    backgroundColor: TEAL,
    // title sits on the BackButton's row (top:50, 38 tall), centered and clear of it
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
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

  headerSubtitle: {
    marginTop: 6,
    color: LIGHT_TEAL,
    fontSize: 13,
    textAlign: "center",
  },

  body: {
    paddingHorizontal: 16,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  editLink: {
    marginTop: 12,
    color: ORANGE,
    fontSize: 13,
    fontWeight: "800",
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
  },

  /* ---------------- ORDER LINES ---------------- */

  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },

  lineDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F3EEEA",
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

  lineName: {
    flex: 1,
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },

  linePrice: {
    color: DARK,
    fontSize: 13,
    fontWeight: "800",
  },

  /* ---------------- ORDER TYPE ---------------- */

  typeRow: {
    flexDirection: "row",
    gap: 10,
  },

  typeCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },

  typeCardActive: {
    borderColor: TEAL,
    backgroundColor: LIGHT_TEAL,
  },

  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: LIGHT_TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  typeIconActive: {
    backgroundColor: TEAL,
  },

  typeLabel: {
    color: DARK,
    fontSize: 14,
    fontWeight: "900",
  },

  typeHint: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },

  /* ---------------- LOCATION / TABLE ---------------- */

  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CFE7E2",
    padding: 12,
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIGHT_TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  detailText: {
    flex: 1,
    minWidth: 0,
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

  changeLink: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "900",
  },

  dashedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#FFC4AE",
    backgroundColor: LIGHT_ORANGE,
  },

  dashedBtnText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: "900",
  },

  /* ---------------- PAYMENT ---------------- */

  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },

  payIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIGHT_TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  payIconActive: {
    backgroundColor: TEAL,
  },

  payLabel: {
    color: DARK,
    fontSize: 14,
    fontWeight: "900",
  },

  payHint: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D5D9D7",
    alignItems: "center",
    justifyContent: "center",
  },

  radioActive: {
    borderColor: TEAL,
  },

  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: TEAL,
  },

  noteBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    backgroundColor: LIGHT_TEAL,
    borderRadius: 14,
    padding: 12,
  },

  noteText: {
    flex: 1,
    color: TEAL,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#FDECEA",
    borderRadius: 14,
    padding: 12,
  },

  errorText: {
    flex: 1,
    color: "#C0392B",
    fontSize: 13,
    fontWeight: "700",
  },

  /* ---------------- EMPTY ---------------- */

  empty: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },

  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 19,
    fontWeight: "900",
  },

  outlineBtn: {
    marginTop: 18,
    height: 45,
    paddingHorizontal: 30,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ORANGE,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  outlineBtnText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: "900",
  },

  /* ---------------- FOOTER ---------------- */

  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  totalLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "800",
  },

  totalValue: {
    color: DARK,
    fontSize: 22,
    fontWeight: "900",
  },

  confirmBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,

    shadowColor: ORANGE_DARK,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  confirmBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  guestHint: {
    marginTop: 8,
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
  },

  /* ---------------- TABLE SCANNER ---------------- */

  scannerScreen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 100,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  scannerTitle: {
    color: DARK,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },

  scannerCancel: {
    marginTop: 16,
    padding: 10,
  },

  scannerCancelText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "800",
  },
});
