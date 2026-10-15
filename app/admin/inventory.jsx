import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { useCallback, useEffect, useState } from "react";
import {
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
  Empty,
  ErrorState,
  Field,
  Loading,
  Pill,
} from "@/components/admin/ui";
import {
  createIngredient,
  deleteIngredient,
  fetchIngredients,
  fetchStockLog,
  updateIngredient,
} from "@/lib/admin-api";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";

const TABS = ["stock", "log"];
const LOG_FILTERS = ["all", "in", "out"];
const EMPTY_INGREDIENT = { name: "", nameEn: "", unit: "", quantity: "", minQuantity: "" };

const fmtQty = (n) => {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

export default function AdminInventory() {
  const { t } = useI18n();
  const [tab, setTab] = useState("stock");

  return (
    <View style={styles.screen}>
      <AdminHeader eyebrow={t("admin")} title={t("inventoryTitle")} subtitle={t("inventorySubtitle")} />

      <View style={[styles.tabs, { paddingHorizontal: 20 }]}>
        {TABS.map((key) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{t(`inventoryTab_${key}`)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "stock" ? <StockTab /> : <LogTab />}
    </View>
  );
}

// ============================================================
//  Stock — the list of ingredients, and the editor sheet
// ============================================================

function StockTab() {
  const { can } = useStaff();
  const canEdit = can("inventory", "edit");
  const { t, pick, tn } = useI18n();
  const dir = useDirection();

  const [ingredients, setIngredients] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [sheetBanner, setSheetBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [deliverAmount, setDeliverAmount] = useState("");
  const [takeAmount, setTakeAmount] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setIngredients(null);
    fetchIngredients()
      .then((d) => setIngredients(d.ingredients ?? []))
      .catch((e) => {
        setError(e);
        setIngredients([]);
      });
  }, []);

  useEffect(load, [load]);

  const patch = (p) => setEditing((e) => (e ? { ...e, ...p } : e));

  function failure(e) {
    return e?.status === 404 ? t("errRouteMissing") : (e?.message ?? t("errSaveFailed"));
  }

  function openEdit(ing) {
    setBanner(null);
    setSheetBanner(null);
    setDeliverAmount("");
    setTakeAmount(String(ing.quantity ?? 0));
    setEditing({ ...ing, minQuantity: String(ing.minQuantity ?? "") });
  }

  function openNew() {
    setBanner(null);
    setSheetBanner(null);
    setEditing({ ...EMPTY_INGREDIENT });
  }

  async function save() {
    if (!editing.name?.trim() && !editing.nameEn?.trim()) {
      setSheetBanner({ text: t("errNameRequired") });
      return;
    }
    const minQuantity = Number(editing.minQuantity) || 0;

    setSaving(true);
    setSheetBanner(null);
    try {
      if (editing.id) {
        await updateIngredient(editing.id, {
          name: editing.name?.trim() ?? "",
          nameEn: editing.nameEn?.trim() ?? "",
          unit: editing.unit?.trim() ?? "",
          minQuantity,
        });
      } else {
        const quantity = Number(editing.quantity) || 0;
        await createIngredient({
          name: editing.name?.trim() ?? "",
          nameEn: editing.nameEn?.trim() ?? "",
          unit: editing.unit?.trim() ?? "",
          quantity,
          minQuantity,
        });
      }
      setEditing(null);
      load();
    } catch (e) {
      setSheetBanner({ text: failure(e) });
    } finally {
      setSaving(false);
    }
  }

  /** Receiving a delivery — always a positive amount added to what's on the shelf. */
  async function deliver() {
    const amount = Number(deliverAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSheetBanner({ text: t("errQuantityInvalid") });
      return;
    }
    setQuickBusy(true);
    setSheetBanner(null);
    try {
      const res = await updateIngredient(editing.id, { adjust: amount });
      setEditing((e) => (e ? { ...e, quantity: res.ingredient.quantity } : e));
      setTakeAmount(String(res.ingredient.quantity));
      setDeliverAmount("");
      load();
    } catch (e) {
      setSheetBanner({ text: failure(e) });
    } finally {
      setQuickBusy(false);
    }
  }

  /** A stock-take: what's actually on the shelf right now, replacing the number outright. */
  async function stockTake() {
    const amount = Number(takeAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setSheetBanner({ text: t("errQuantityInvalid") });
      return;
    }
    setQuickBusy(true);
    setSheetBanner(null);
    try {
      const res = await updateIngredient(editing.id, { quantity: amount });
      setEditing((e) => (e ? { ...e, quantity: res.ingredient.quantity } : e));
      load();
    } catch (e) {
      setSheetBanner({ text: failure(e) });
    } finally {
      setQuickBusy(false);
    }
  }

  function confirmDelete() {
    setConfirm({
      title: t("confirmDeleteIngredient"),
      text: t("confirmDeleteIngredientText"),
      confirmLabel: t("deleteIngredient"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteIngredient(editing.id);
          setEditing(null);
          load();
        } catch (e) {
          setSheetBanner({
            text: e?.status === 409 ? t("errIngredientInUse") : failure(e),
          });
        } finally {
          setSaving(false);
        }
      },
    });
  }

  const canAdd = canEdit && editing === null;

  return (
    <View style={styles.flexBody}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          <Banner value={banner} />
          {!canEdit && <Banner value={{ tone: "info", text: t("readOnlyNotice") }} />}

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && ingredients === null && <Loading text={t("loading")} />}
          {!error && ingredients?.length === 0 && (
            <Empty icon="cube-outline" title={t("noIngredients")} text={t("noIngredientsHint")} />
          )}

          {!error &&
            ingredients?.map((ing) => {
              const statusColor = ing.isOut ? C.danger : ing.isLow ? C.orange : C.teal;
              return (
              <Pressable
                key={ing.id}
                onPress={() => openEdit(ing)}
                style={({ pressed }) => [
                  styles.row,
                  dir.row,
                  { shadowColor: statusColor },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.rowAccent,
                    dir.isRTL ? { right: 0 } : { left: 0 },
                    { backgroundColor: statusColor },
                  ]}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[dir.row, { alignItems: "center", gap: 7 }]}>
                    <Text style={[styles.rowName, dir.text]} numberOfLines={1}>
                      {pick(ing)}
                    </Text>
                    {ing.isOut && <Pill text={t("stockOut")} tone="danger" />}
                    {!ing.isOut && ing.isLow && <Pill text={t("stockLow")} tone="orange" />}
                  </View>
                  {ing.usedBy?.length > 0 && (
                    <Text style={[styles.rowMeta, dir.text]} numberOfLines={1}>
                      {tn("usedByDishes", ing.usedBy.length)}
                    </Text>
                  )}
                </View>
                <Text style={styles.rowQty}>
                  {fmtQty(ing.quantity)} {ing.unit}
                </Text>
              </Pressable>
              );
            })}
        </View>
      </ScrollView>

      {canAdd && (
        <Pressable onPress={openNew} style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}>
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newIngredient")}</Text>
        </Pressable>
      )}

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>
                {editing?.id ? t("editIngredient") : t("newIngredientTitle")}
              </Text>

              <Banner value={sheetBanner} />

              <Field
                label={t("fieldNameEn")}
                value={editing?.nameEn ?? ""}
                onChangeText={(v) => patch({ nameEn: v })}
                placeholder="Chicken breast"
              />
              <Field
                label={t("fieldNameAr")}
                value={editing?.name ?? ""}
                onChangeText={(v) => patch({ name: v })}
                placeholder="صدر دجاج"
              />
              <Field
                label={t("fieldUnit")}
                value={editing?.unit ?? ""}
                onChangeText={(v) => patch({ unit: v })}
                placeholder="kg"
                autoCapitalize="none"
              />
              <Field
                label={t("fieldMinQuantity")}
                value={editing?.minQuantity ?? ""}
                onChangeText={(v) => patch({ minQuantity: v })}
                keyboardType="decimal-pad"
                placeholder="2"
                hint={t("minQuantityHint")}
              />

              {editing?.id ? (
                <View style={styles.stockCard}>
                  <Text style={[styles.stockLabel, dir.text]}>{t("currentStock")}</Text>
                  <Text style={styles.stockValue}>
                    {fmtQty(editing.quantity)} {editing.unit}
                  </Text>

                  {canEdit && (
                    <>
                      <View style={styles.quickRow}>
                        <Text style={[styles.quickLabel, dir.text]}>{t("receiveDelivery")}</Text>
                        <View style={[dir.row, { gap: 8 }]}>
                          <TextInput
                            value={deliverAmount}
                            onChangeText={setDeliverAmount}
                            keyboardType="decimal-pad"
                            placeholder="5"
                            placeholderTextColor={C.placeholder}
                            style={[styles.quickInput, dir.text]}
                          />
                          <View style={{ width: 96 }}>
                            <Btn title={t("add")} onPress={deliver} loading={quickBusy} />
                          </View>
                        </View>
                      </View>

                      <View style={styles.quickRow}>
                        <Text style={[styles.quickLabel, dir.text]}>{t("stockTakeLabel")}</Text>
                        <View style={[dir.row, { gap: 8 }]}>
                          <TextInput
                            value={takeAmount}
                            onChangeText={setTakeAmount}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={C.placeholder}
                            style={[styles.quickInput, dir.text]}
                          />
                          <View style={{ width: 96 }}>
                            <Btn title={t("update")} variant="ghost" onPress={stockTake} loading={quickBusy} />
                          </View>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              ) : (
                <Field
                  label={t("fieldInitialQuantity")}
                  value={editing?.quantity ?? ""}
                  onChangeText={(v) => patch({ quantity: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              )}

              <View style={{ gap: 9, marginTop: 16 }}>
                {canEdit && <Btn title={t("save")} icon="checkmark" onPress={save} loading={saving} />}
                {canEdit && !!editing?.id && (
                  <Btn title={t("deleteIngredient")} variant="danger" icon="trash-outline" onPress={confirmDelete} disabled={saving} />
                )}
                <Btn title={t("cancel")} variant="ghost" onPress={() => setEditing(null)} disabled={saving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

// ============================================================
//  Movement log — every "in" and "out", whoever or whatever caused it
// ============================================================

function LogTab() {
  const { t, pick } = useI18n();
  const dir = useDirection();

  const [filter, setFilter] = useState("all");
  const [log, setLog] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setLog(null);
    fetchStockLog({ direction: filter === "all" ? undefined : filter, limit: 60 })
      .then((d) => setLog(d))
      .catch((e) => {
        setError(e);
        setLog({ log: [], counts: {} });
      });
  }, [filter]);

  useEffect(load, [load]);

  const when = (iso) => new Date(iso).toLocaleString();

  const detail = (move) => {
    if (move.staff) return t("byStaff", { name: move.staff.name });
    if (move.orderId) return t("byOrder", { id: move.orderId });
    return t("automatic");
  };

  return (
    <View style={styles.flexBody}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          <View style={[styles.chips, dir.row]}>
            {LOG_FILTERS.map((key) => {
              const on = filter === key;
              const count = log?.counts?.[key];
              return (
                <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {t(`logFilter_${key}`)}
                    {count != null ? ` (${count})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && log === null && <Loading text={t("loading")} />}
          {!error && log?.log?.length === 0 && <Empty icon="swap-vertical-outline" title={t("noStockMoves")} />}

          {!error &&
            log?.log?.map((move) => {
              const moveColor = move.direction === "in" ? C.teal : C.danger;
              return (
              <View key={move.id} style={[styles.logRow, dir.row, { shadowColor: moveColor }]}>
                <View
                  style={[
                    styles.logIcon,
                    {
                      backgroundColor: move.direction === "in" ? C.lightTeal : C.lightDanger,
                      shadowColor: moveColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={move.direction === "in" ? "arrow-down" : "arrow-up"}
                    size={15}
                    color={move.direction === "in" ? C.teal : C.danger}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.logName, dir.text]} numberOfLines={1}>
                    {move.ingredient ? pick(move.ingredient) : "—"} · {t(`reason_${move.reason}`)}
                  </Text>
                  <Text style={[styles.logMeta, dir.text]} numberOfLines={1}>
                    {detail(move)} · {when(move.at)}
                  </Text>
                </View>
                <Text style={[styles.logQty, { color: move.direction === "in" ? C.teal : C.danger }]}>
                  {move.direction === "in" ? "+" : "−"}
                  {fmtQty(move.quantity)} {move.ingredient?.unit}
                </Text>
              </View>
              );
            })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flexBody: { flex: 1 },
  content: { paddingBottom: 110 },
  body: { paddingHorizontal: 20 },

  tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 13, backgroundColor: C.surfaceAlt },
  tabOn: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  tabTextOn: { color: C.white },

  row: {
    position: "relative",
    overflow: "hidden",
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 9,
    gap: 10,
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rowAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  rowName: { color: C.dark, fontSize: fs(16), fontWeight: "800" },
  rowMeta: { color: C.muted, fontSize: fs(14), fontWeight: "700", marginTop: 3 },
  rowQty: { color: C.teal, fontSize: fs(15.5), fontWeight: "800" },

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
  fabText: { color: C.white, fontSize: fs(15), fontWeight: "800", letterSpacing: 0.5 },

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

  stockCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  stockLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  stockValue: { color: C.dark, fontSize: fs(27), fontWeight: "800", marginBottom: 14 },
  quickRow: { marginTop: 10 },
  quickLabel: { color: C.dark, fontSize: fs(15), fontWeight: "800", marginBottom: 7 },
  quickInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    color: C.dark,
    fontSize: fs(15.5),
    fontWeight: "700",
  },

  chips: { flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { backgroundColor: C.surfaceAlt, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  logRow: {
    alignItems: "center",
    gap: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  logIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logName: { color: C.dark, fontSize: fs(15), fontWeight: "800" },
  logMeta: { color: C.muted, fontSize: fs(14), fontWeight: "600", marginTop: 2 },
  logQty: { fontSize: fs(15), fontWeight: "800" },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
