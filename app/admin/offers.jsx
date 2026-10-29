import { fs } from "@/lib/admin-font";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ConfirmDialog,
  Empty,
  ErrorState,
  Field,
  Loading,
  Pill,
  ToggleRow,
} from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import {
  createOffer,
  deleteOffer,
  fetchAdminMenu,
  fetchOffers,
  updateOffer,
} from "@/lib/admin-api";
import { Text } from "@/lib/arabic-font";
import { itemPhoto } from "@/lib/category-images";
import { useDirection, useI18n } from "@/lib/i18n";

// The real backend (backend/src/routes/offers.ts) stores a single `title`
// (no i18n split), `discountType`/`discountValue` instead of kind/value, and
// `menuItemIds` (an item-only array — no category-level targeting exists).
// `kind` here stays "percent"/"fixed" locally to match the offerKind_* i18n
// keys; it's translated to the backend's "percentage"/"fixed" only at the
// request boundary (see save()).
const EMPTY_OFFER = {
  title: "",
  description: "",
  kind: "percent",
  value: "",
  menuItemIds: [],
  startsAt: "",
  startTime: "",
  endsAt: "",
  endTime: "",
  // minutes each customer gets from when they first see it; "" = a normal offer
  durationMinutes: "",
  isActive: true,
};

const STATE_TONE = {
  live: "teal",
  scheduled: "orange",
  expired: "gray",
  off: "gray",
};
const STATE_COLOR = {
  live: C.teal,
  scheduled: C.orange,
  expired: C.muted,
  off: C.muted,
};
// Live offers are the ones a manager actually needs to see right now — everything
// else (upcoming, expired, switched off) matters progressively less at a glance.
const STATE_ORDER = { live: 0, scheduled: 1, off: 2, expired: 3 };
const LTR_INPUT = { textAlign: "left", writingDirection: "ltr" };
const KIND_ICON = { percentage: "pricetag-outline", fixed: "cash-outline" };

/** The backend only stores `active` + start/end dates — "live/scheduled/
 * expired/off" is purely a client-side read of those three fields. */
function offerState(offer, now = Date.now()) {
  if (offer.active === false) return "off";
  if (offer.startsAt && new Date(offer.startsAt).getTime() > now)
    return "scheduled";
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) return "expired";
  return "live";
}

// A plain "2026-08-20" is stored as that exact UTC day, start to end — never converted
// through the device's local timezone — so the field always shows back exactly what was
// typed, on any device, regardless of where the offer was created.
/** Whatever the user typed → "YYYY-MM-DD", or null if it isn't a real calendar date. Accepts
 * -, / or . separators, year-first (2026/9/29) or day-first (29/9/2026) order, and Arabic-Indic
 * digits — so the start/end check compares real dates, not text ("2026/9/29" > "2026/10/1"). */
function normalizeDate(input) {
  if (!input) return null;
  const ascii = String(input)
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const parts = ascii.split(/[-/.]/);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  let [y, m, d] = parts;
  if (parts[2].length === 4) [d, m, y] = parts; // day-first
  if (y.length !== 4) return null;

  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "18:30", "6:30" or "٦:٣٠" → "18:30"; null if it isn't a real time. */
function normalizeTime(input) {
  const ascii = String(input ?? "")
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(ascii);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// Times are typed in restaurant time — Jordan, UTC+3 all year — whatever timezone
// the manager's phone is in. No time = the whole day (from 00:00 / until 23:59:59).
const JORDAN_OFFSET = "+03:00";
const JORDAN_OFFSET_MS = 3 * 60 * 60 * 1000;

function toIso(date, time, endOfDay) {
  const d = normalizeDate(date);
  if (!d) return null;
  const t = normalizeTime(time);
  const clock = t ? `${t}:00` : endOfDay ? "23:59:59.999" : "00:00:00";
  return new Date(`${d}T${clock}${JORDAN_OFFSET}`).toISOString();
}

/** Stored ISO → { date, time } as typed. Offers saved before times existed were whole UTC
 * days (T00:00:00.000Z / T23:59:59.999Z) — those still read back as just the date. */
function isoToParts(iso, endOfDay) {
  if (!iso) return { date: "", time: "" };
  const s = String(iso);
  if (/T00:00:00(\.000)?Z$|T23:59:59\.999Z$/.test(s))
    return { date: s.slice(0, 10), time: "" };
  const local = new Date(new Date(s).getTime() + JORDAN_OFFSET_MS).toISOString();
  const time = local.slice(11, 16);
  const wholeDay = endOfDay ? local.slice(11, 19) === "23:59:59" : time === "00:00";
  return { date: local.slice(0, 10), time: wholeDay ? "" : time };
}

export default function AdminOffers() {
  const { can } = useStaff();
  const canEdit = can("offers", "edit");
  const { t, pick } = useI18n();
  const dir = useDirection();

  const [offers, setOffers] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setOffers(null);
    fetchOffers()
      .then((d) => setOffers(d.offers ?? []))
      .catch((e) => {
        setError(e);
        setOffers([]);
      });
    // Only used to build the item/category pickers; every role that can reach this screen
    // can also see the menu, but a failure here shouldn't take the whole screen down with it.
    fetchAdminMenu()
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(load, [load]);

  const sortedOffers = useMemo(() => {
    if (!offers) return offers;
    const now = Date.now();
    return offers
      .map((o) => ({ ...o, state: offerState(o, now) }))
      .sort(
        (a, b) => (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9),
      );
  }, [offers]);

  const allItems = categories.flatMap((c) =>
    (c.items ?? []).map((i) => ({ ...i, categoryId: c.id })),
  );
  const patch = (p) => setEditing((e) => (e ? { ...e, ...p } : e));
  const [itemSearch, setItemSearch] = useState("");

  // Turns a failed request into a reason the manager can act on, instead of a
  // raw server code like "forbidden" or "request_failed_500".
  function failure(e) {
    if (e?.status === 404) return t("errRouteMissing");
    if (e?.status === 403) return t("errOfferForbidden");
    if (e?.status === 400) return t("errOfferInvalid");
    if (!e?.status) return t("errOfferNetwork");
    return t("errSaveFailed");
  }

  function openEdit(offer) {
    setBanner(null);
    setEditing({
      id: offer.id,
      title: offer.title ?? "",
      description: offer.description ?? "",
      kind: offer.discountType === "fixed" ? "fixed" : "percent",
      value: String(offer.discountValue ?? ""),
      menuItemIds: offer.menuItemIds ?? [],
      startsAt: isoToParts(offer.startsAt, false).date,
      startTime: isoToParts(offer.startsAt, false).time,
      endsAt: isoToParts(offer.endsAt, true).date,
      endTime: isoToParts(offer.endsAt, true).time,
      durationMinutes: offer.durationMinutes
        ? String(offer.durationMinutes)
        : "",
      isActive: offer.active !== false,
    });
  }

  function openNew() {
    setBanner(null);
    setEditing({ ...EMPTY_OFFER });
  }

  /** Flips the one-click switch straight away and rolls back if the server refuses.
   * The PUT route compares `body.active` to the *string* 'true' (a multipart-form
   * leftover), so a JS boolean would silently be read as false — send it as text. */
  async function toggleActive(offer, next) {
    setOffers((list) =>
      list.map((o) => (o.id === offer.id ? { ...o, active: next } : o)),
    );
    try {
      const res = await updateOffer(offer.id, {
        active: next ? "true" : "false",
      });
      setOffers((list) => list.map((o) => (o.id === offer.id ? res.offer : o)));
    } catch (e) {
      load();
      setBanner({ text: failure(e) });
    }
  }

  function validate() {
    if (!editing.title?.trim()) return t("errNameRequired");
    const value = Number(editing.value);
    if (!Number.isFinite(value) || value < 0) return t("errOfferValueInvalid");
    if (editing.kind === "percent" && (value <= 0 || value > 100))
      return t("errOfferPercentRange");
    const start = normalizeDate(editing.startsAt);
    const end = normalizeDate(editing.endsAt);
    if (editing.startsAt && !start) return t("errOfferDateInvalid");
    if (editing.endsAt && !end) return t("errOfferDateInvalid");
    if (editing.startTime && !normalizeTime(editing.startTime))
      return t("errOfferTimeInvalid");
    if (editing.endTime && !normalizeTime(editing.endTime))
      return t("errOfferTimeInvalid");
    // a time without its date means nothing
    if ((editing.startTime && !start) || (editing.endTime && !end))
      return t("errOfferTimeNeedsDate");
    // same-shape UTC ISO strings, so string order is time order
    const startIso = toIso(editing.startsAt, editing.startTime, false);
    const endIso = toIso(editing.endsAt, editing.endTime, true);
    if (startIso && endIso && startIso >= endIso) return t("errOfferDateRange");
    if (editing.durationMinutes) {
      const minutes = Number(editing.durationMinutes);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080)
        return t("errOfferDurationInvalid");
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setBanner({ text: problem });
      return;
    }

    const body = {
      title: editing.title?.trim() ?? "",
      description: editing.description?.trim() || undefined,
      discountType: editing.kind === "fixed" ? "fixed" : "percentage",
      discountValue: Number(editing.value),
      menuItemIds: JSON.stringify(editing.menuItemIds ?? []),
      // "" rather than null for an empty field: the schema is `.optional()` (null fails it), and
      // on update the PUT route treats "" as "clear this date" — so removing a date sticks.
      startsAt: toIso(editing.startsAt, editing.startTime, false) ?? "",
      endsAt: toIso(editing.endsAt, editing.endTime, true) ?? "",
      // empty = a normal offer: left out on create, "" clears it on update
      durationMinutes: editing.durationMinutes
        ? Number(editing.durationMinutes)
        : editing.id
          ? ""
          : undefined,
      // no-op on create (the route doesn't accept it there) but needed on
      // update, and as a string — see toggleActive's note on why.
      active: editing.isActive !== false ? "true" : "false",
    };

    setSaving(true);
    setBanner(null);
    try {
      if (editing.id) await updateOffer(editing.id, body);
      else await createOffer(body);
      setEditing(null);
      load();
    } catch (e) {
      setBanner({ text: failure(e) });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    setConfirm({
      title: t("confirmDeleteOffer"),
      text: t("confirmDeleteOfferText"),
      confirmLabel: t("deleteOffer"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteOffer(editing.id);
          setEditing(null);
          load();
        } catch (e) {
          setBanner({ text: failure(e) });
        } finally {
          setSaving(false);
        }
      },
    });
  }

  const describeValue = (o) =>
    o.discountType === "fixed"
      ? t("offerFixedPrice", {
          value: `${Number(o.discountValue).toFixed(2)} ${t("currency")}`,
        })
      : t("offerPercentOff", { value: o.discountValue });

  // menuItemIds only carries ids — the names have to be resolved against the
  // menu list fetched alongside the offers.
  const describeTarget = (o) => {
    const names = (o.menuItemIds ?? [])
      .map((id) => allItems.find((i) => i.id === id))
      .filter(Boolean)
      .map((i) => pick(i));
    return names.length
      ? t("offerAppliesToItem", { name: names.join("، ") })
      : "";
  };

  // Shown exactly as typed (Jordan time, see isoToParts) — with the time when there is one.
  const fmtDate = (iso, endOfDay) => {
    const { date, time } = isoToParts(iso, endOfDay);
    return time ? `${date} ${time}` : date;
  };

  const canAdd = canEdit && editing === null;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AdminHeader
          eyebrow={t("admin")}
          title={t("offersTitle")}
          subtitle={t("offersSubtitle")}
        />

        <View style={styles.body}>
          {!canEdit && (
            <Banner value={{ tone: "info", text: t("readOnlyNotice") }} />
          )}

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && offers === null && <Loading text={t("loading")} />}

          {!error && offers?.length === 0 && (
            <Empty
              icon="pricetag-outline"
              title={t("noOffers")}
              text={t("noOffersHint")}
            />
          )}

          {!error &&
            sortedOffers?.map((offer) => {
              const stateColor = STATE_COLOR[offer.state] ?? C.muted;
              return (
                <Pressable
                  key={offer.id}
                  onPress={() => openEdit(offer)}
                  style={({ pressed }) => [
                    styles.row,
                    { shadowColor: stateColor },
                    pressed && styles.pressed,
                  ]}
                >
                  {/* state accent — reading-start edge (left in LTR, right in
                    this app's hand-rolled RTL) */}
                  <View
                    style={[
                      styles.rowAccent,
                      dir.isRTL ? { right: 0 } : { left: 0 },
                      { backgroundColor: stateColor },
                    ]}
                  />
                  <View style={[styles.rowTop, dir.row]}>
                    <View
                      style={[
                        styles.kindIcon,
                        { backgroundColor: `${stateColor}18` },
                      ]}
                    >
                      <Ionicons
                        name={
                          KIND_ICON[offer.discountType] ?? "pricetag-outline"
                        }
                        size={16}
                        color={stateColor}
                      />
                    </View>
                    <Pill
                      text={t(`offerState_${offer.state}`)}
                      tone={STATE_TONE[offer.state]}
                    />
                    <View style={{ flex: 1 }} />
                    <Switch
                      value={offer.active !== false}
                      disabled={!canEdit}
                      onValueChange={(v) => toggleActive(offer, v)}
                      trackColor={{ true: C.teal, false: C.borderStrong }}
                      thumbColor={C.white}
                    />
                  </View>
                  <Text style={[styles.rowName, dir.text]} numberOfLines={1}>
                    {offer.title}
                  </Text>
                  <Text style={[styles.rowMeta, dir.text]} numberOfLines={1}>
                    {[
                      describeValue(offer),
                      describeTarget(offer),
                      offer.durationMinutes
                        ? t("offerTimedBadge", {
                            minutes: offer.durationMinutes,
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {(offer.startsAt || offer.endsAt) && (
                    <Text style={[styles.rowDates, dir.text]}>
                      {offer.startsAt && offer.endsAt
                        ? t("offerDateRange", {
                            start: fmtDate(offer.startsAt, false),
                            end: fmtDate(offer.endsAt, true),
                          })
                        : offer.startsAt
                          ? t("offerFromDate", {
                              start: fmtDate(offer.startsAt, false),
                            })
                          : t("offerUntilDate", { end: fmtDate(offer.endsAt, true) })}
                    </Text>
                  )}
                </Pressable>
              );
            })}

          {/* Errors sit at the end of the page, under the list — the last thing you see. */}
          {editing === null && <Banner value={banner} />}
        </View>
      </ScrollView>

      {canAdd && (
        <Pressable
          onPress={openNew}
          style={({ pressed }) => [
            styles.fab,
            dir.row,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newOffer")}</Text>
        </Pressable>
      )}

      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>
                {editing?.id ? t("editOffer") : t("newOfferTitle")}
              </Text>

              <Field
                label={t("fieldOfferTitle")}
                value={editing?.title ?? ""}
                onChangeText={(v) => patch({ title: v })}
                placeholder="عرض نهاية الأسبوع"
              />
              <Field
                label={t("fieldOfferDescription")}
                value={editing?.description ?? ""}
                onChangeText={(v) => patch({ description: v })}
                placeholder=""
                multiline
              />

              <Text style={[styles.fieldLabel, dir.text]}>
                {t("fieldOfferKind")}
              </Text>
              <View style={[styles.chips, dir.row]}>
                {["percent", "fixed"].map((kind) => {
                  const on = editing?.kind === kind;
                  return (
                    <Pressable
                      key={kind}
                      onPress={() => patch({ kind })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {t(`offerKind_${kind}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field
                label={
                  editing?.kind === "fixed"
                    ? t("fieldFixedValue")
                    : t("fieldPercentValue")
                }
                value={editing?.value ?? ""}
                onChangeText={(v) => patch({ value: v })}
                keyboardType="decimal-pad"
                placeholder={editing?.kind === "fixed" ? "1.00" : "20"}
              />

              {/* Offers discount specific menu items, so the picker is a multi-select — grouped by
                  category with photos, and "select all" to put a whole category on offer at once. */}
              <OfferItemPicker
                categories={categories}
                selected={editing?.menuItemIds ?? []}
                onChange={(menuItemIds) => patch({ menuItemIds })}
                search={itemSearch}
                onSearch={setItemSearch}
              />

              {/* date + time side by side; the time is optional (empty = whole day) */}
              <View style={[styles.whenRow, dir.row]}>
                <View style={styles.whenDate}>
                  <Field
                    label={t("fieldStartDate")}
                    value={editing?.startsAt ?? ""}
                    onChangeText={(v) => patch({ startsAt: v.trim() })}
                    placeholder="2026-08-20"
                    autoCapitalize="none"
                    style={LTR_INPUT}
                  />
                </View>
                <View style={styles.whenTime}>
                  <Field
                    label={t("fieldStartTime")}
                    value={editing?.startTime ?? ""}
                    onChangeText={(v) => patch({ startTime: v.trim() })}
                    placeholder="18:00"
                    keyboardType="numbers-and-punctuation"
                    style={LTR_INPUT}
                  />
                </View>
              </View>
              <View style={[styles.whenRow, dir.row]}>
                <View style={styles.whenDate}>
                  <Field
                    label={t("fieldEndDate")}
                    value={editing?.endsAt ?? ""}
                    onChangeText={(v) => patch({ endsAt: v.trim() })}
                    placeholder="2026-08-27"
                    autoCapitalize="none"
                    style={LTR_INPUT}
                  />
                </View>
                <View style={styles.whenTime}>
                  <Field
                    label={t("fieldEndTime")}
                    value={editing?.endTime ?? ""}
                    onChangeText={(v) => patch({ endTime: v.trim() })}
                    placeholder="23:00"
                    keyboardType="numbers-and-punctuation"
                    style={LTR_INPUT}
                  />
                </View>
              </View>
              <Text style={[styles.whenHint, dir.text]}>
                {t("dateTimeFieldHint")}
              </Text>
              <Field
                label={t("fieldOfferDuration")}
                value={editing?.durationMinutes ?? ""}
                onChangeText={(v) =>
                  patch({ durationMinutes: v.replace(/[^0-9]/g, "") })
                }
                placeholder="30"
                keyboardType="number-pad"
                hint={t("offerDurationHint")}
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />

              <ToggleRow
                label={t("offerActiveLabel")}
                value={editing?.isActive !== false}
                onValueChange={(v) => patch({ isActive: v })}
              />

              {/* Right above Save, so a failed save is visible where you tapped. */}
              <Banner value={banner} />

              <View style={{ gap: 9, marginTop: 6 }}>
                {canEdit && (
                  <Btn
                    title={t("save")}
                    icon="checkmark"
                    onPress={save}
                    loading={saving}
                  />
                )}
                {canEdit && !!editing?.id && (
                  <Btn
                    title={t("deleteOffer")}
                    variant="danger"
                    icon="trash-outline"
                    onPress={confirmDelete}
                    disabled={saving}
                  />
                )}
                <Btn
                  title={t("cancel")}
                  variant="ghost"
                  onPress={() => setEditing(null)}
                  disabled={saving}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

function OfferItemPicker({ categories, selected, onChange, search, onSearch }) {
  const { t, pick } = useI18n();
  const dir = useDirection();
  const q = search.trim().toLowerCase();
  // Only what customers can actually see: the admin list also has hidden categories
  // (and sub-categories of hidden ones) and switched-off items — an offer on those
  // never shows up in the app.
  const byId = new Map(categories.map((c) => [c.id, c]));
  const visible = (c) =>
    c.isActive !== false &&
    (!c.parentId || byId.get(c.parentId)?.isActive !== false);
  const matches = (i) =>
    !q ||
    [i.name, i.nameEn].some((n) => n && String(n).toLowerCase().includes(q));
  const toggle = (id) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );

  return (
    <View style={pickerStyles.wrap}>
      <View style={[pickerStyles.head, dir.row]}>
        <Text style={[pickerStyles.label, dir.text]}>
          {t("fieldOfferItems")}
        </Text>
        {selected.length > 0 && (
          <Pressable
            onPress={() => onChange([])}
            hitSlop={8}
            style={[pickerStyles.countChip, dir.row]}
          >
            <Text style={pickerStyles.countText}>
              {t("offerItemsSelected", { count: selected.length })}
            </Text>
            <Text style={pickerStyles.clearText}>{t("offerItemsClear")}</Text>
          </Pressable>
        )}
      </View>

      <Field
        value={search}
        onChangeText={onSearch}
        placeholder={t("offerItemsSearch")}
      />

      {categories.map((c) => {
        if (!visible(c)) return null;
        const items = (c.items ?? []).filter(
          (i) => i.isAvailable !== false && matches(i),
        );
        if (!items.length) return null;
        const ids = items.map((i) => i.id);
        const allOn = ids.every((id) => selected.includes(id));
        const onCount = ids.filter((id) => selected.includes(id)).length;
        // a sub-category takes its parent's photo (photos are per top-level category)
        const topCategory =
          (c.parentId && categories.find((p) => p.id === c.parentId)) || c;
        return (
          <View key={c.id} style={pickerStyles.group}>
            <View style={[pickerStyles.groupHead, dir.row]}>
              <Text
                style={[pickerStyles.groupName, dir.text]}
                numberOfLines={1}
              >
                {pick(c)}
                <Text style={pickerStyles.groupCount}>
                  {" "}
                  {onCount}/{items.length}
                </Text>
              </Text>
              <Pressable
                onPress={() =>
                  onChange(
                    allOn
                      ? selected.filter((id) => !ids.includes(id))
                      : [...new Set([...selected, ...ids])],
                  )
                }
                hitSlop={6}
                style={[pickerStyles.allBtn, allOn && pickerStyles.allBtnOn]}
              >
                <Text
                  style={[
                    pickerStyles.allText,
                    allOn && pickerStyles.allTextOn,
                  ]}
                >
                  {t(allOn ? "offerItemsNone" : "offerItemsAll")}
                </Text>
              </Pressable>
            </View>

            <View style={[pickerStyles.grid, dir.row]}>
              {items.map((i) => {
                const on = selected.includes(i.id);
                const photo = itemPhoto(i, topCategory);
                return (
                  <Pressable
                    key={i.id}
                    onPress={() => toggle(i.id)}
                    style={({ pressed }) => [
                      pickerStyles.tile,
                      on && pickerStyles.tileOn,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={pickerStyles.thumb}>
                      {photo ? (
                        <Image
                          source={photo}
                          style={pickerStyles.thumbImg}
                        />
                      ) : (
                        <Ionicons
                          name="fast-food-outline"
                          size={22}
                          color={C.placeholder}
                        />
                      )}
                      {on && (
                        <View style={pickerStyles.check}>
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={C.white}
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        pickerStyles.tileName,
                        on && pickerStyles.tileNameOn,
                      ]}
                      numberOfLines={2}
                    >
                      {pick(i)}
                    </Text>
                    <Text style={pickerStyles.tilePrice}>
                      {Number(i.price).toFixed(2)} {t("currency")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  head: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  label: { flex: 1, color: C.text, fontSize: fs(15.5), fontWeight: "600" },
  countChip: {
    alignItems: "center",
    gap: 8,
    backgroundColor: C.lightTeal,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { color: C.teal, fontSize: fs(14.5), fontWeight: "700" },
  clearText: { color: C.orange, fontSize: fs(14.5), fontWeight: "700" },
  group: { marginBottom: 14 },
  groupHead: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  groupName: { flex: 1, color: C.dark, fontSize: fs(17), fontWeight: "700" },
  groupCount: { color: C.subtle, fontSize: fs(14.5), fontWeight: "600" },
  allBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: C.surface,
  },
  allBtnOn: { backgroundColor: C.lightOrange, borderColor: C.lightOrange },
  allText: { color: C.text, fontSize: fs(14.5), fontWeight: "700" },
  allTextOn: { color: C.orange },
  grid: { flexWrap: "wrap", gap: 8 },
  tile: {
    width: 104,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
    gap: 6,
  },
  tileOn: { borderColor: C.teal, backgroundColor: C.lightTeal },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  check: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.white,
  },
  tileName: {
    color: C.text,
    fontSize: fs(14.5),
    fontWeight: "600",
    textAlign: "center",
    minHeight: 30,
  },
  tileNameOn: { color: C.teal, fontWeight: "700" },
  tilePrice: { color: C.muted, fontSize: fs(14), fontWeight: "600" },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 110 },
  body: { paddingHorizontal: 20 },

  row: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 14,
    marginBottom: 10,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  kindIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: { alignItems: "center", gap: 8, marginBottom: 8 },
  rowName: {
    color: C.dark,
    fontSize: fs(16.5),
    fontWeight: "800",
    marginBottom: 3,
  },
  rowMeta: { color: C.teal, fontSize: fs(15), fontWeight: "800" },
  rowDates: {
    color: C.muted,
    fontSize: fs(14),
    fontWeight: "700",
    marginTop: 4,
  },

  whenRow: { gap: 10 },
  whenDate: { flex: 1.4 },
  whenTime: { flex: 1 },
  whenHint: {
    color: C.muted,
    fontSize: fs(13.5),
    fontWeight: "600",
    marginTop: -6,
    marginBottom: 14,
  },

  fieldLabel: {
    color: C.muted,
    fontSize: fs(13.5),
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  fabText: {
    color: C.white,
    fontSize: fs(15),
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(23,32,31,0.45)",
    justifyContent: "flex-end",
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
  sheetTitle: {
    color: C.dark,
    fontSize: fs(22),
    fontWeight: "800",
    marginBottom: 18,
  },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
