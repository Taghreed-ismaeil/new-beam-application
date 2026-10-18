import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ErrorState,
  Field,
  Loading,
  Pill,
} from "@/components/admin/ui";
import {
  createReservation,
  fetchReservations,
  fetchTables,
  setTableStatus,
  updateReservation,
} from "@/lib/admin-api";
import { useDirection, useI18n } from "@/lib/i18n";
import { useLiveUpdates } from "@/lib/use-live-updates";
import { Text } from "@/lib/arabic-font";

const FILTERS = ["open", "pending", "confirmed", "seated", "completed", "all"];

const STATUS_TONE = {
  pending: "orange",
  confirmed: "teal",
  seated: "teal",
  completed: "gray",
  rejected: "danger",
  cancelled: "danger",
  no_show: "danger",
};

const STATUS_COLOR = {
  pending: C.orange,
  confirmed: C.teal,
  seated: C.teal,
  completed: C.muted,
  rejected: C.danger,
  cancelled: C.danger,
  no_show: C.danger,
};

const TABLE_TONE = {
  free: { box: "tableFree", text: "tableTextFree" },
  reserved: { box: "tableReserved", text: "tableTextOn" },
  occupied: { box: "tableOccupied", text: "tableTextOn" },
};

export default function AdminReservations() {
  const { t, tn } = useI18n();
  const dir = useDirection();

  const [tab, setTab] = useState("book");
  const [filter, setFilter] = useState("open");
  const [data, setData] = useState(null);
  const [tables, setTables] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    ({ quiet } = {}) => {
      if (!quiet) {
        setData(null);
        setTables(null);
      }
      setError(null);
      return Promise.all([
        fetchReservations({ status: filter })
          .then(setData)
          .catch((e) => {
            setError(e);
            setData({ reservations: [], total: 0, counts: {}, today: {} });
          }),
        fetchTables()
          .then(setTables)
          .catch(() => setTables({ tables: [], summary: {} })),
      ]);
    },
    [filter],
  );

  useEffect(() => {
    load();
  }, [load]);

  const live = useLiveUpdates({
    "reservation:new": () => load({ quiet: true }),
    "reservation:updated": () => load({ quiet: true }),
    "table:updated": () => load({ quiet: true }),
  });

  const failure = (e) => {
    const map = {
      table_taken: t("tableTakenBy", { name: e?.data?.by ?? "" }),
      table_too_small: t("tableTooSmall", { seats: e?.data?.seats ?? "" }),
      table_required: t("seatNeedsTable"),
      table_held_by_reservation: t("tableHeldBy", { name: e?.data?.by ?? "" }),
      illegal_transition: t("bookingIllegalMove"),
      reason_required: t("rejectNeedsReason"),
      name_required: t("bookingNameRequired"),
      people_required: t("bookingPeopleRequired"),
      time_required: t("bookingTimeRequired"),
    };
    return map[e?.data?.error] ?? t("errSaveFailed");
  };

  async function act(fn) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fn();
      if (res?.reservation) setOpen(res.reservation);
      await load({ quiet: true });
      return true;
    } catch (e) {
      setBanner({ text: failure(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitDraft() {
    const when = new Date();
    const [hh, mm] = String(draft.time ?? "").split(":");
    if (!hh || Number.isNaN(Number(hh))) return setBanner({ text: t("bookingTimeRequired") });
    when.setHours(Number(hh), Number(mm) || 0, 0, 0);

    setBusy(true);
    setBanner(null);
    try {
      await createReservation({
        name: draft.name?.trim(),
        phone: draft.phone?.trim() || undefined,
        people: Number(draft.people) || 0,
        at: when.toISOString(),
        note: draft.note?.trim() || undefined,
      });
      setDraft(null);
      await load({ quiet: true });
    } catch (e) {
      setBanner({ text: failure(e) });
    } finally {
      setBusy(false);
    }
  }

  const clock = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /** Tables big enough for this party and not already spoken for. */
  const freeFor = (people) =>
    (tables?.tables ?? []).filter((tb) => tb.status === "free" && tb.seats >= people);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.teal}
            onRefresh={async () => {
              setRefreshing(true);
              await load({ quiet: true });
              setRefreshing(false);
            }}
          />
        }
      >
        <AdminHeader
          eyebrow={t("admin")}
          title={t("reservationsTitle")}
          subtitle={
            data === null
              ? t("loading")
              : t("bookingsToday", {
                  total: data.today?.total ?? 0,
                  people: data.today?.people ?? 0,
                })
          }
          right={
            <View style={[styles.liveChip, dir.row, live === "live" ? styles.liveOn : styles.liveOff]}>
              <View style={[styles.liveDot, live === "live" ? styles.dotOn : styles.dotOff]} />
              <Text style={[styles.liveText, live === "live" ? styles.liveTextOn : styles.liveTextOff]}>
                {t(live === "live" ? "liveOn" : "liveOff")}
              </Text>
            </View>
          }
        />

        <View style={styles.body}>
          <Banner value={banner} />

          <View style={[styles.tabs, dir.row]}>
            {["book", "floor"].map((key) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabOn]}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
                  {t(key === "book" ? "tabBook" : "tabFloor")}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <ErrorState error={error} onRetry={load} />}

          {/* ---------- the book ---------- */}
          {!error && tab === "book" && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.filters, dir.row]}
              >
                {FILTERS.map((key) => {
                  const dotColor = STATUS_COLOR[key];
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setFilter(key)}
                      style={[styles.filter, dir.row, filter === key && styles.filterOn]}
                    >
                      {!!dotColor && (
                        <View style={[styles.filterDot, { backgroundColor: dotColor }]} />
                      )}
                      <Text style={[styles.filterText, filter === key && styles.filterTextOn]}>
                        {t(key === "open" ? "filterOpen" : key === "all" ? "filterAll" : `booking_${key}`)}
                        {data?.counts?.[key] != null ? ` ${data.counts[key]}` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {data === null && <Loading />}

              {data?.reservations?.map((r) => {
                const statusColor = STATUS_COLOR[r.status] ?? C.orange;
                return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    setBanner(null);
                    setOpen(r);
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    { shadowColor: statusColor },
                    pressed && styles.pressed,
                  ]}
                >
                  {/* status accent — reading-start edge (left in LTR, right
                      in this app's hand-rolled RTL) */}
                  <View
                    style={[
                      styles.cardAccent,
                      dir.isRTL ? { right: 0 } : { left: 0 },
                      { backgroundColor: statusColor },
                    ]}
                  />
                  <View style={[styles.cardTop, dir.row]}>
                    <Text style={styles.time}>{clock(r.at)}</Text>
                    <Text style={[styles.name, dir.text]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Pill text={t(`booking_${r.status}`)} tone={STATUS_TONE[r.status]} />
                  </View>
                  <View style={[styles.cardBottom, dir.row]}>
                    <Text style={styles.meta}>{tn("peopleCount", r.people)}</Text>
                    {r.tableNumber != null && (
                      <Pill text={t("tableNumber", { number: r.tableNumber })} tone="gray" />
                    )}
                    {!!r.note && (
                      <Text style={[styles.note, dir.text]} numberOfLines={1}>
                        {r.note}
                      </Text>
                    )}
                  </View>
                </Pressable>
                );
              })}

              {data?.reservations?.length === 0 && (
                <Text style={[styles.empty, dir.text]}>{t("bookingsEmpty")}</Text>
              )}
            </>
          )}

          {/* ---------- the floor ---------- */}
          {!error && tab === "floor" && (
            <>
              {tables === null && <Loading />}

              {tables && (
                <View style={[styles.legend, dir.row]}>
                  {["free", "reserved", "occupied"].map((state) => (
                    <View key={state} style={[styles.legendItem, dir.row]}>
                      <View style={[styles.legendDot, styles[`dot_${state}`]]} />
                      <Text style={styles.legendText}>
                        {t(`table_${state}`)} {tables.summary?.[state] ?? 0}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.grid, dir.row]}>
                {tables?.tables?.map((tb) => {
                  const tone = TABLE_TONE[tb.status] ?? TABLE_TONE.free;
                  return (
                    <Pressable
                      key={tb.id}
                      onPress={async () => {
                        setBanner(null);
                        // Only walk-ins are toggled here; a booked table refuses and says why.
                        if (tb.status === "reserved") {
                          setBanner({ text: t("tableHeldBy", { name: tb.holder?.name ?? "" }) });
                          return;
                        }
                        await act(() =>
                          setTableStatus(tb.id, tb.status === "occupied" ? "free" : "occupied"),
                        );
                      }}
                      style={({ pressed }) => [styles.table, styles[tone.box], pressed && styles.pressed]}
                    >
                      <Text style={[styles.tableNo, styles[tone.text]]}>{tb.number}</Text>
                      <Text style={[styles.tableSeats, styles[tone.text]]}>
                        {tn("seatsCount", tb.seats)}
                      </Text>
                      {!!tb.holder && (
                        <Text style={[styles.tableHolder, styles[tone.text]]} numberOfLines={1}>
                          {tb.holder.name}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.floorHint, dir.text]}>{t("floorHint")}</Text>
            </>
          )}
        </View>
      </ScrollView>

      {tab === "book" && open === null && draft === null && (
        <Pressable
          onPress={() => {
            setBanner(null);
            setDraft({ name: "", phone: "", people: "2", time: "20:00", note: "" });
          }}
          style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={C.white} />
          <Text style={styles.fabText}>{t("newBooking")}</Text>
        </Pressable>
      )}

      {/* ---------- one booking ---------- */}
      <Modal visible={open !== null} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.sheetHead, dir.row]}>
                <Text style={[styles.sheetTitle, dir.text]}>{open?.name}</Text>
                <Pill text={t(`booking_${open?.status ?? "pending"}`)} tone={STATUS_TONE[open?.status]} />
              </View>

              <Banner value={banner} />

              <View style={styles.block}>
                <Row label={t("bookingTime")} value={open ? new Date(open.at).toLocaleString() : ""} dir={dir} />
                <Row label={t("bookingPeople")} value={tn("peopleCount", open?.people ?? 0)} dir={dir} />
                {!!open?.phone && <Row label={t("staffPhone")} value={open.phone} dir={dir} />}
                {!!open?.note && <Row label={t("bookingNote")} value={open.note} dir={dir} />}
                {!!open?.reason && <Row label={t("bookingReason")} value={open.reason} dir={dir} />}
              </View>

              {/* ----- table ----- */}
              <Text style={[styles.blockLabel, dir.text]}>{t("bookingTable")}</Text>
              <View style={[styles.chips, dir.row]}>
                <Pressable
                  onPress={() => act(() => updateReservation(open.id, { tableNumber: null }))}
                  style={[styles.chip, open?.tableNumber == null && styles.chipOn]}
                >
                  <Text style={[styles.chipText, open?.tableNumber == null && styles.chipTextOn]}>
                    {t("none")}
                  </Text>
                </Pressable>
                {/* the current table stays offered even though it isn't "free" */}
                {[
                  ...(open?.table ? [open.table] : []),
                  ...freeFor(open?.people ?? 0).filter((tb) => tb.number !== open?.tableNumber),
                ].map((tb) => {
                  const on = open?.tableNumber === tb.number;
                  return (
                    <Pressable
                      key={tb.number}
                      onPress={() => act(() => updateReservation(open.id, { tableNumber: tb.number }))}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {t("tableNumber", { number: tb.number })} · {tn("seatsCount", tb.seats)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ gap: 9, marginTop: 10 }}>
                {open?.nextStatuses?.map((next) =>
                  next === "rejected" ? (
                    <Btn
                      key={next}
                      title={t("booking_action_rejected")}
                      variant="danger"
                      icon="close-circle-outline"
                      disabled={busy}
                      onPress={() => setRejecting({ id: open.id, reason: "" })}
                    />
                  ) : (
                    <Btn
                      key={next}
                      title={t(`booking_action_${next}`)}
                      variant={["cancelled", "no_show"].includes(next) ? "danger" : "primary"}
                      icon="arrow-forward"
                      loading={busy}
                      onPress={() => act(() => updateReservation(open.id, { status: next }))}
                    />
                  ),
                )}
                <Btn title={t("close")} variant="ghost" onPress={() => setOpen(null)} disabled={busy} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------- rejecting ---------- */}
      <Modal
        visible={rejecting !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <KeyboardAvoidingView
          style={styles.centeredBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.dialog}>
            <Text style={[styles.dialogTitle, dir.text]}>{t("rejectTitle")}</Text>
            <Text style={[styles.dialogText, dir.text]}>{t("rejectText")}</Text>
            <Banner value={banner} />
            <Field
              label={t("cancelReasonLabel")}
              value={rejecting?.reason ?? ""}
              onChangeText={(v) => setRejecting((r) => (r ? { ...r, reason: v } : r))}
              placeholder={t("rejectPlaceholder")}
              multiline
            />
            <View style={{ gap: 9 }}>
              <Btn
                title={t("booking_action_rejected")}
                variant="danger"
                loading={busy}
                onPress={async () => {
                  const ok = await act(() =>
                    updateReservation(rejecting.id, { status: "rejected", reason: rejecting.reason }),
                  );
                  if (ok) setRejecting(null);
                }}
              />
              <Btn title={t("close")} variant="ghost" onPress={() => setRejecting(null)} disabled={busy} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------- new booking ---------- */}
      <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>{t("newBooking")}</Text>
              <Text style={[styles.dialogText, dir.text]}>{t("newBookingHint")}</Text>
              <Banner value={banner} />

              <Field
                label={t("bookingName")}
                value={draft?.name ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
              />
              <Field
                label={t("staffPhone")}
                value={draft?.phone ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, phone: v }))}
                keyboardType="phone-pad"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field
                label={t("bookingPeople")}
                value={draft?.people ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, people: v.replace(/\D/g, "") }))}
                keyboardType="number-pad"
              />
              <Field
                label={t("bookingTime")}
                value={draft?.time ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, time: v }))}
                placeholder="20:00"
                hint={t("bookingTimeHint")}
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field
                label={t("bookingNote")}
                value={draft?.note ?? ""}
                onChangeText={(v) => setDraft((d) => ({ ...d, note: v }))}
                placeholder={t("bookingNotePlaceholder")}
                multiline
              />

              <View style={{ gap: 9, marginTop: 6 }}>
                <Btn title={t("saveBooking")} icon="checkmark" onPress={submitDraft} loading={busy} />
                <Btn title={t("cancel")} variant="ghost" onPress={() => setDraft(null)} disabled={busy} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Row({ label, value, dir }) {
  return (
    <View style={[styles.row, dir.row]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, dir.text]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 110 },
  body: { paddingHorizontal: 20 },

  liveChip: { alignItems: "center", gap: 5, paddingHorizontal: 10, height: 38, borderRadius: 13 },
  liveOn: { backgroundColor: C.lightTeal },
  liveOff: { backgroundColor: C.surfaceAlt },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  dotOn: { backgroundColor: C.teal },
  dotOff: { backgroundColor: C.placeholder },
  liveText: { fontSize: fs(14), fontWeight: "800" },
  liveTextOn: { color: C.teal },
  liveTextOff: { color: C.muted },

  tabs: { gap: 8, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 13, backgroundColor: C.surfaceAlt, alignItems: "center" },
  tabOn: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: fs(15), fontWeight: "800" },
  tabTextOn: { color: C.white },

  filters: { gap: 7, paddingBottom: 14 },
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    gap: 6,
  },
  filterOn: { backgroundColor: C.teal },
  filterText: { color: C.muted, fontSize: fs(15), fontWeight: "800" },
  filterTextOn: { color: C.white },
  filterDot: { width: 6, height: 6, borderRadius: 3 },

  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 13,
    marginBottom: 9,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  cardTop: { alignItems: "center", gap: 9 },
  time: { color: C.teal, fontSize: fs(15.5), fontWeight: "800", minWidth: 44 },
  name: { flex: 1, color: C.dark, fontSize: fs(16), fontWeight: "800" },
  cardBottom: { alignItems: "center", gap: 8, marginTop: 8 },
  meta: { color: C.muted, fontSize: fs(15), fontWeight: "700" },
  note: { flex: 1, color: C.subtle, fontSize: fs(14), fontWeight: "600" },

  empty: { color: C.subtle, fontSize: fs(15), lineHeight: fs(21), marginTop: 8 },

  legend: { gap: 14, marginBottom: 14, flexWrap: "wrap" },
  legendItem: { alignItems: "center", gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  dot_free: { backgroundColor: C.borderStrong },
  dot_reserved: { backgroundColor: C.orange },
  dot_occupied: { backgroundColor: C.teal },
  legendText: { color: C.muted, fontSize: fs(15), fontWeight: "800" },

  grid: { flexWrap: "wrap", gap: 10 },
  table: {
    width: 96,
    height: 96,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  tableFree: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  tableReserved: { backgroundColor: C.orange, shadowColor: C.orange },
  tableOccupied: { backgroundColor: C.teal, shadowColor: C.teal },
  tableNo: { fontSize: fs(25), fontWeight: "800" },
  tableSeats: { fontSize: fs(13.5), fontWeight: "800", marginTop: 1 },
  tableHolder: { fontSize: fs(13.5), fontWeight: "700", marginTop: 4, opacity: 0.9 },
  tableTextFree: { color: C.muted },
  tableTextOn: { color: C.white },
  floorHint: { color: C.subtle, fontSize: fs(14), lineHeight: fs(19), marginTop: 14 },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    alignItems: "center",
    gap: 7,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: C.orange,
    elevation: 8,
    shadowColor: C.orange,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: C.white, fontSize: fs(15), fontWeight: "800" },

  backdrop: { flex: 1, backgroundColor: "rgba(23,32,31,0.45)", justifyContent: "flex-end" },
  centeredBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,32,31,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  sheetGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHead: { alignItems: "center", gap: 9, marginBottom: 12 },
  sheetTitle: { color: C.dark, fontSize: fs(22), fontWeight: "800" },

  dialog: { backgroundColor: C.white, borderRadius: 26, padding: 22, alignSelf: "stretch", maxWidth: 400 },
  dialogTitle: { color: C.dark, fontSize: fs(19), fontWeight: "800", marginBottom: 4 },
  dialogText: { color: C.muted, fontSize: fs(15), lineHeight: fs(20), marginBottom: 12 },

  block: { backgroundColor: C.surface, borderRadius: 15, padding: 12, marginBottom: 14, gap: 7 },
  blockLabel: {
    color: C.muted,
    fontSize: fs(13.5),
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowLabel: { color: C.muted, fontSize: fs(15), fontWeight: "700" },
  rowValue: { color: C.dark, fontSize: fs(15), fontWeight: "800", flexShrink: 1 },

  chips: { flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: C.surfaceAlt, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(15), fontWeight: "800" },
  chipTextOn: { color: C.white },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
