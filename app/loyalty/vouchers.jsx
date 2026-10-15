import BackButton from "@/components/BackButton";
import GiftsBackdrop from "@/components/GiftsBackdrop";
import { apiRequestCached } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { loyaltyVouchersKey } from "@/lib/preload";
import { useAppLang } from "@/lib/app-lang";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const TEAL_DARK = "#04211E";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const BG = "#FAF7F4";
const DARK = "#17201F";
const MUTED = "#7C8582";
const WHITE = "#FFFFFF";

// Wheel prizes carry their text in `label`; collect & win vouchers point at the
// menu item and its rewardValue.
function voucherTitle(v, t, pick) {
  if (v.menuItem) return v.menuItem.rewardValue || pick(v.menuItem);
  return v.label || t("loyReward");
}

function voucherSource(v, t, pick) {
  return v.source === "wheel"
    ? { icon: "🎡", text: t("loyLuckyWheel") }
    : { icon: "🍽️", text: pick(v.menuItem) || t("loyTitle") };
}

function formatDate(iso, lang) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VoucherTicket({ voucher, onPress }) {
  const { t, lang, pick } = useAppLang();
  const used = !!voucher.redeemedAt;
  const source = voucherSource(voucher, t, pick);

  return (
    <TouchableOpacity
      activeOpacity={used ? 1 : 0.85}
      disabled={used}
      onPress={onPress}
      style={[styles.ticket, used && styles.ticketUsed]}
    >
      {/* stub */}
      <View style={[styles.stub, { backgroundColor: used ? "#E4E6E5" : TEAL }]}>
        <Text style={styles.stubIcon}>{source.icon}</Text>
        <Text style={[styles.stubText, used && { color: MUTED }]}>
          {used ? t("loyUsedUpper") : t("loyReadyUpper")}
        </Text>
      </View>

      {/* perforation */}
      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchTop]} />
        <View style={styles.dashes} />
        <View style={[styles.notch, styles.notchBottom]} />
      </View>

      {/* body */}
      <View style={styles.ticketBody}>
        <Text style={styles.sourceText} numberOfLines={1}>
          {source.text}
        </Text>

        <Text style={[styles.ticketTitle, used && { color: MUTED }]} numberOfLines={2}>
          {voucherTitle(voucher, t, pick)}
        </Text>

        <View style={styles.ticketFooter}>
          <View style={[styles.codePill, used && styles.codePillUsed]}>
            <Text style={[styles.codeText, used && { color: MUTED }]}>{voucher.code}</Text>
          </View>

          <Text style={styles.dateText}>
            {used
              ? t("loyUsedOn", { date: formatDate(voucher.redeemedAt, lang) })
              : formatDate(voucher.createdAt, lang)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LoyaltyVouchersScreen() {
  const { t, pick } = useAppLang();
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState(null);
  const [selected, setSelected] = useState(null);

  useFocusEffect(
    useCallback(() => {
      apiRequestCached(
        "/api/loyalty/vouchers",
        (d) => setVouchers(d.vouchers),
        () => setVouchers((prev) => prev ?? []),
        { cacheKey: user ? loyaltyVouchersKey(user.id) : undefined, revalidate: true },
      );
    }, [user]),
  );

  const ready = (vouchers ?? []).filter((v) => !v.redeemedAt);
  const used = (vouchers ?? []).filter((v) => v.redeemedAt);

  return (
    <View style={styles.screen}>
      <GiftsBackdrop />
      <StatusBar style="light" />
      <BackButton />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* =====================================================
            HEADER
        ====================================================== */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("loyMyRewards")}</Text>
          <Text style={styles.headerSubtitle}>{t("loyRewardsSub")}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{ready.length}</Text>
              <Text style={styles.statLabel}>{t("loyReady")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{used.length}</Text>
              <Text style={styles.statLabel}>{t("loyUsed")}</Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            CONTENT
        ====================================================== */}
        {vouchers === null ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 50 }} />
        ) : vouchers.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyCircle}>
              <Text style={styles.emptyIcon}>🎁</Text>
            </View>
            <Text style={styles.emptyTitle}>{t("loyNoRewards")}</Text>
            <Text style={styles.emptyText}>{t("loyNoRewardsText")}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/loyalty/scan")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>{t("loyScanQr")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {ready.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t("loyReadyToUse")}</Text>
                {ready.map((v) => (
                  <VoucherTicket key={v.id} voucher={v} onPress={() => setSelected(v)} />
                ))}
              </>
            )}

            {used.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: MUTED }]}>{t("loyUsed")}</Text>
                {used.map((v) => (
                  <VoucherTicket key={v.id} voucher={v} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* =====================================================
          REDEEM SHEET — big code + QR for the cashier
      ====================================================== */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet}>
            {selected && (
              <>
                <Text style={styles.sheetLabel}>{t("loyRewardLabel")}</Text>
                <Text style={styles.sheetTitle}>{voucherTitle(selected, t, pick)}</Text>

                <View style={styles.qrFrame}>
                  <QRCode value={selected.code} size={170} color={TEAL_DARK} backgroundColor={WHITE} />
                </View>

                <Text style={styles.sheetCodeLabel}>{t("loyRedeemCode")}</Text>
                <Text style={styles.sheetCode}>{selected.code}</Text>

                <Text style={styles.sheetHint}>{t("loyShowCashier")}</Text>

                <TouchableOpacity style={styles.sheetBtn} onPress={() => setSelected(null)} activeOpacity={0.85}>
                  <Text style={styles.sheetBtnText}>{t("loyDone")}</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  scroll: {
    paddingBottom: 110,
  },

  /* ---------------- HEADER ---------------- */

  header: {
    backgroundColor: TEAL,
    // title sits on the BackButton's row (top:50, 38 tall), centered and clear of it
    paddingTop: 50,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    marginBottom: 8,
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
    marginTop: 8,
    color: LIGHT_TEAL,
    fontSize: 13,
    textAlign: "center",
  },

  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 12,
    width: "100%",
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "900",
  },

  statLabel: {
    color: LIGHT_TEAL,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    marginHorizontal: 20,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    color: TEAL,
    textTransform: "uppercase",
  },

  /* ---------------- TICKET ---------------- */

  ticket: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    minHeight: 112,
    backgroundColor: WHITE,
    borderRadius: 18,

    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  ticketUsed: {
    opacity: 0.6,
  },

  stub: {
    width: 84,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  stubIcon: {
    fontSize: 28,
  },

  stubText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  perforation: {
    width: 14,
    alignItems: "center",
    backgroundColor: WHITE,
  },

  // half-circles cut out of the ticket edge, painted in the page background
  notch: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BG,
    left: -2,
  },

  notchTop: {
    top: -9,
  },

  notchBottom: {
    bottom: -9,
  },

  dashes: {
    flex: 1,
    marginVertical: 14,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderColor: "#E3DCD6",
  },

  ticketBody: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 4,
    justifyContent: "space-between",
  },

  sourceText: {
    color: ORANGE,
    fontSize: 11,
    fontWeight: "800",
  },

  ticketTitle: {
    color: DARK,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },

  ticketFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },

  codePill: {
    backgroundColor: LIGHT_ORANGE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD9C7",
    borderStyle: "dashed",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  codePillUsed: {
    backgroundColor: "#F1F1F1",
    borderColor: "#E0E0E0",
  },

  codeText: {
    color: ORANGE,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },

  dateText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },

  /* ---------------- EMPTY ---------------- */

  empty: {
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: 50,
  },

  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 44,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DARK,
  },

  emptyText: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  emptyBtn: {
    marginTop: 20,
    height: 45,
    paddingHorizontal: 34,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ORANGE,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyBtnText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: "900",
  },

  /* ---------------- REDEEM SHEET ---------------- */

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(4,33,30,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  sheet: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: WHITE,
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
  },

  sheetLabel: {
    color: TEAL,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  sheetTitle: {
    color: DARK,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 6,
  },

  qrFrame: {
    marginTop: 18,
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: LIGHT_TEAL,
  },

  sheetCodeLabel: {
    marginTop: 16,
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  sheetCode: {
    color: TEAL,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 5,
    marginTop: 2,
  },

  sheetHint: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
  },

  sheetBtn: {
    marginTop: 18,
    width: "100%",
    height: 46,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
  },
});
