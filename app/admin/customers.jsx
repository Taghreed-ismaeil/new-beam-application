import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ConfirmDialog,
  ErrorState,
  Field,
  Loading,
  Pill,
} from "@/components/admin/ui";
import { fetchCustomerDetail, fetchCustomers, setCustomerBlocked } from "@/lib/admin-api";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";

const PAGE_SIZE = 30;
const STATUS_TONE = {
  pending: "orange", accepted: "orange", preparing: "orange", ready: "teal",
  out_for_delivery: "teal", completed: "teal", cancelled: "gray",
};

function initials(name) {
  const parts = (name ?? "").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AdminCustomers() {
  const { can } = useStaff();
  const canEdit = can("customers", "edit");
  const { t, tn, pick, lang } = useI18n();
  const dir = useDirection();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [detailFor, setDetailFor] = useState(null); // the customer row that was tapped
  const [detail, setDetail] = useState(null); // full detail once loaded, or an error
  const [blocking, setBlocking] = useState(null); // { reason } while the block-reason dialog is open
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const joinedOn = useCallback(
    (iso) => {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      // Arabic uses the Gregorian calendar with Arabic month names here, not Hijri.
      return d.toLocaleDateString(lang === "ar" ? "ar-JO-u-ca-gregory" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },
    [lang],
  );

  // Debounce so typing a phone number doesn't fire a request per keystroke.
  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(search.trim()), 350);
    return () => timer.current && clearTimeout(timer.current);
  }, [search]);

  const load = useCallback(
    (nextPage = 1) => {
      if (nextPage === 1) {
        setCustomers(null);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      fetchCustomers({ search: query || undefined, page: nextPage, limit: PAGE_SIZE })
        .then((d) => {
          const batch = d.customers ?? [];
          setCustomers((prev) => (nextPage === 1 ? batch : [...(prev ?? []), ...batch]));
          setTotal(d.total ?? batch.length);
          setPage(d.page ?? nextPage);
        })
        .catch((e) => {
          if (nextPage === 1) {
            setError(e);
            setCustomers([]);
          }
        })
        .finally(() => setLoadingMore(false));
    },
    [query],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  function patchCustomerInList(id, patch) {
    setCustomers((list) => (list ? list.map((c) => (c.id === id ? { ...c, ...patch } : c)) : list));
  }

  function openDetail(customer) {
    setBanner(null);
    setDetailFor(customer.id);
    setDetail(null);
    fetchCustomerDetail(customer.id)
      .then(setDetail)
      .catch((e) => setDetail({ error: e }));
  }

  function closeDetail() {
    setDetailFor(null);
    setDetail(null);
    setBlocking(null);
  }

  async function confirmBlock() {
    if (!blocking?.reason?.trim()) {
      setBanner({ text: t("errBlockReasonRequired") });
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await setCustomerBlocked(detailFor, true, blocking.reason.trim());
      setDetail((d) => (d && !d.error ? { ...d, customer: res.customer } : d));
      patchCustomerInList(detailFor, { isBlocked: true });
      setBlocking(null);
    } catch (e) {
      setBanner({ text: e?.message ?? t("errSaveFailed") });
    } finally {
      setBusy(false);
    }
  }

  function confirmUnblock() {
    setConfirm({
      title: t("confirmUnblockTitle"),
      text: t("confirmUnblockText"),
      confirmLabel: t("unblockCustomer"),
      onConfirm: async () => {
        setBusy(true);
        setBanner(null);
        try {
          const res = await setCustomerBlocked(detailFor, false);
          setDetail((d) => (d && !d.error ? { ...d, customer: res.customer } : d));
          patchCustomerInList(detailFor, { isBlocked: false });
        } catch (e) {
          setBanner({ text: e?.message ?? t("errSaveFailed") });
        } finally {
          setBusy(false);
        }
      },
    });
  }

  const hasMore = useMemo(() => (customers?.length ?? 0) < total, [customers, total]);

  const subtitle =
    customers === null
      ? t("customersLoading")
      : query
        ? tn("customersMatches", total, { query })
        : tn("customersCount", total);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AdminHeader eyebrow={t("admin")} title={t("customersTitle")} subtitle={subtitle} />

        <View style={styles.body}>
          <View style={[styles.searchBox, dir.row]}>
            <Ionicons name="search" size={17} color={C.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchPlaceholder")}
              placeholderTextColor={C.placeholder}
              style={[styles.searchInput, dir.text]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!search && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={C.borderStrong} />
              </Pressable>
            )}
          </View>

          {error && <ErrorState error={error} onRetry={() => load(1)} />}
          {!error && customers === null && <Loading text={t("customersLoading")} />}

          {!error &&
            customers?.map((customer) => (
              <Pressable
                key={customer.id}
                onPress={() => openDetail(customer)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={[styles.cardTop, dir.row]}>
                  <View style={[styles.avatar, customer.isBlocked && styles.avatarBlocked]}>
                    <Text style={styles.avatarText}>{initials(customer.name)}</Text>
                  </View>

                  <View style={styles.identity}>
                    <View style={[dir.row, { alignItems: "center", gap: 6 }]}>
                      <Text style={[styles.name, dir.text]} numberOfLines={1}>
                        {customer.name || t("unnamed")}
                      </Text>
                      {customer.isBlocked && <Pill text={t("blockedBadge")} tone="danger" />}
                    </View>
                    <View style={[styles.phoneRow, dir.row]}>
                      <Ionicons name="call-outline" size={12} color={C.muted} />
                      {/* Phone numbers read left-to-right in both languages. */}
                      <Text style={styles.phone}>{customer.phone}</Text>
                    </View>
                  </View>

                  <View style={dir.isRTL ? styles.joinedStart : styles.joinedEnd}>
                    <Text style={styles.joinedLabel}>{t("colJoined")}</Text>
                    <Text style={styles.joinedValue}>{joinedOn(customer.createdAt)}</Text>
                  </View>
                </View>

                <View style={[styles.metrics, dir.row]}>
                  <Metric label={t("colOrders")} value={customer.ordersCount} />
                  <View style={styles.metricDivider} />
                  <Metric
                    label={t("colSpent")}
                    value={
                      customer.totalSpent == null
                        ? null
                        : Number(customer.totalSpent).toFixed(2)
                    }
                  />
                  <View style={styles.metricDivider} />
                  <Metric label={t("colCollected")} value={customer.collectionsCompleted} />
                </View>

                {(customer.vouchersEarned ?? 0) > 0 && (
                  <View style={[styles.badges, dir.row]}>
                    <Pill text={t("rewardsWon", { count: customer.vouchersEarned })} tone="teal" />
                    {(customer.vouchersRedeemed ?? 0) > 0 && (
                      <Pill
                        text={t("rewardsRedeemed", { count: customer.vouchersRedeemed })}
                        tone="gray"
                      />
                    )}
                    {(customer.vouchersEarned ?? 0) - (customer.vouchersRedeemed ?? 0) > 0 && (
                      <Pill
                        text={t("rewardsUnused", {
                          count: (customer.vouchersEarned ?? 0) - (customer.vouchersRedeemed ?? 0),
                        })}
                        tone="orange"
                      />
                    )}
                  </View>
                )}
              </Pressable>
            ))}

          {!error && customers?.length === 0 && (
            <Text style={[styles.empty, dir.text]}>
              {query ? t("noCustomerMatch") : t("noCustomers")}
            </Text>
          )}

          {!error && hasMore && (
            <View style={{ marginTop: 8 }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={C.teal} />
              ) : (
                <Btn
                  title={t("loadMore", {
                    count: Math.min(PAGE_SIZE, total - customers.length),
                  })}
                  variant="ghost"
                  icon="chevron-down"
                  onPress={() => load(page + 1)}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ---------- customer detail: orders, loyalty progress, vouchers ---------- */}
      <Modal visible={detailFor !== null} transparent animationType="slide" onRequestClose={closeDetail}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {detail === null && <Loading text={t("loading")} />}
              {detail?.error && <ErrorState error={detail.error} onRetry={() => openDetail({ id: detailFor })} />}

              {detail && !detail.error && (
                <>
                  <View style={[dir.row, { alignItems: "center", gap: 8 }]}>
                    <Text style={[styles.sheetTitle, dir.text, { marginBottom: 0, flex: 1 }]} numberOfLines={1}>
                      {detail.customer.name || t("unnamed")}
                    </Text>
                    {detail.customer.isBlocked && <Pill text={t("blockedBadge")} tone="danger" />}
                  </View>
                  <Text style={[styles.rowMeta, dir.text, { marginTop: 4 }]}>{detail.customer.phone}</Text>
                  <Text style={[styles.rowMeta, dir.text, { marginBottom: 14 }]}>
                    {t("colJoined")} {joinedOn(detail.customer.createdAt)}
                  </Text>

                  {detail.customer.isBlocked && (
                    <Banner
                      value={{
                        tone: "danger",
                        text: t("blockedSince", {
                          when: joinedOn(detail.customer.blockedAt),
                          reason: detail.customer.blockedReason ?? "",
                        }),
                      }}
                    />
                  )}
                  <Banner value={banner} />

                  <Text style={[styles.sectionTitle, dir.text]}>{t("loyaltyProgressTitle")}</Text>
                  {detail.loyalty.length === 0 && (
                    <Text style={[styles.rowMeta, dir.text, { marginBottom: 12 }]}>{t("noLoyaltyItems")}</Text>
                  )}
                  {detail.loyalty.map((l) => (
                    <View key={l.id} style={{ marginBottom: 10 }}>
                      <View style={[dir.row, { justifyContent: "space-between" }]}>
                        <Text style={[styles.itemName, dir.text]} numberOfLines={1}>
                          {pick(l)}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {l.revealedCount}/{l.requiredPieces}
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${Math.min(100, (l.revealedCount / l.requiredPieces) * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ))}

                  <Text style={[styles.sectionTitle, dir.text, { marginTop: 14 }]}>{t("vouchersTitle")}</Text>
                  {detail.vouchers.length === 0 && (
                    <Text style={[styles.rowMeta, dir.text, { marginBottom: 12 }]}>{t("noVouchersYet")}</Text>
                  )}
                  {detail.vouchers.map((v) => (
                    <View key={v.id} style={[styles.detailRow, dir.row]}>
                      <Text style={[styles.itemName, dir.text, { flex: 1 }]} numberOfLines={1}>
                        {v.code} — {v.reward}
                      </Text>
                      <Pill
                        text={t(`voucherState_${v.state}`)}
                        tone={v.state === "valid" ? "teal" : v.state === "redeemed" ? "gray" : "danger"}
                      />
                    </View>
                  ))}

                  <Text style={[styles.sectionTitle, dir.text, { marginTop: 14 }]}>{t("ordersHistoryTitle")}</Text>
                  {detail.orders.length === 0 && (
                    <Text style={[styles.rowMeta, dir.text, { marginBottom: 12 }]}>{t("noOrdersYet")}</Text>
                  )}
                  {detail.orders.map((o) => (
                    <View key={o.id} style={[styles.detailRow, dir.row]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.itemName, dir.text]} numberOfLines={1}>
                          #{o.id} · {t(o.source === "counter" ? "sourceCounter" : "sourceApp")}
                        </Text>
                        <Text style={styles.rowMeta}>{joinedOn(o.createdAt)}</Text>
                      </View>
                      <Pill text={t(`status_${o.status}`)} tone={STATUS_TONE[o.status]} />
                      <Text style={styles.rowAmount}>
                        {Number(o.total).toFixed(2)} {t("currency")}
                      </Text>
                    </View>
                  ))}

                  {canEdit && (
                    <View style={{ marginTop: 18 }}>
                      {detail.customer.isBlocked ? (
                        <Btn
                          title={t("unblockCustomer")}
                          variant="ghost"
                          icon="lock-open-outline"
                          onPress={confirmUnblock}
                          loading={busy}
                        />
                      ) : (
                        <Btn
                          title={t("blockCustomer")}
                          variant="danger"
                          icon="ban-outline"
                          onPress={() => setBlocking({ reason: "" })}
                          disabled={busy}
                        />
                      )}
                    </View>
                  )}
                </>
              )}

              <View style={{ marginTop: 12 }}>
                <Btn title={t("close")} variant="ghost" onPress={closeDetail} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------- block, with a reason ---------- */}
      <Modal visible={blocking !== null} transparent animationType="fade" onRequestClose={() => setBlocking(null)}>
        <KeyboardAvoidingView style={styles.centeredBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.dialog}>
            <Text style={[styles.dialogTitle, dir.text]}>{t("blockDialogTitle")}</Text>
            <Text style={[styles.dialogText, dir.text]}>{t("blockDialogText")}</Text>
            <Banner value={banner} />
            <Field
              label={t("blockReasonLabel")}
              value={blocking?.reason ?? ""}
              onChangeText={(v) => setBlocking((b) => (b ? { ...b, reason: v } : b))}
              placeholder={t("blockReasonPlaceholder")}
              multiline
            />
            <View style={{ gap: 9 }}>
              <Btn title={t("blockCustomer")} variant="danger" loading={busy} onPress={confirmBlock} />
              <Btn title={t("cancel")} variant="ghost" onPress={() => setBlocking(null)} disabled={busy} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value ?? "—"}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: 20, paddingTop: 4 },

  searchBox: {
    alignItems: "center",
    gap: 9,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: C.dark, fontSize: fs(16), fontWeight: "600" },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 13,
    marginBottom: 10,
  },
  cardTop: { alignItems: "center", gap: 11 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.white, fontSize: fs(17.5), fontWeight: "800" },
  identity: { flex: 1, minWidth: 0 },
  name: { color: C.dark, fontSize: fs(16.5), fontWeight: "800", marginBottom: 3 },
  phoneRow: { alignItems: "center", gap: 4 },
  phone: { color: C.muted, fontSize: fs(15), fontWeight: "700", writingDirection: "ltr" },
  joinedEnd: { alignItems: "flex-end" },
  joinedStart: { alignItems: "flex-start" },
  joinedLabel: { color: C.placeholder, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 0.8 },
  joinedValue: { color: C.muted, fontSize: fs(14), fontWeight: "800", marginTop: 2 },

  metrics: {
    alignItems: "center",
    backgroundColor: C.lightTeal,
    borderRadius: 15,
    paddingVertical: 11,
    marginTop: 12,
  },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { color: C.dark, fontSize: fs(17.5), fontWeight: "800", marginBottom: 2 },
  metricLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 0.6 },
  metricDivider: { width: 1, height: 24, backgroundColor: "#CDE0DC" },

  badges: { flexWrap: "wrap", gap: 5, marginTop: 10 },

  empty: { color: C.subtle, fontSize: fs(15), lineHeight: fs(21), marginTop: 6 },

  avatarBlocked: { backgroundColor: C.danger },
  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },

  backdrop: { flex: 1, backgroundColor: "rgba(23,32,31,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  sheetGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: C.dark, fontSize: fs(22), fontWeight: "800", marginBottom: 18 },

  sectionTitle: { color: C.dark, fontSize: fs(15), fontWeight: "800", marginBottom: 8 },
  itemName: { color: C.dark, fontSize: fs(15), fontWeight: "800" },
  rowMeta: { color: C.muted, fontSize: fs(14), fontWeight: "700", marginTop: 2 },
  rowAmount: { color: C.teal, fontSize: fs(14.5), fontWeight: "800" },

  track: { height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt, marginTop: 5, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.teal },

  detailRow: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceAlt,
  },

  centeredBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,32,31,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 22,
    alignSelf: "stretch",
    maxWidth: 400,
  },
  dialogTitle: { color: C.dark, fontSize: fs(19), fontWeight: "800", marginBottom: 4 },
  dialogText: { color: C.muted, fontSize: fs(15), lineHeight: fs(20), marginBottom: 12 },
});
