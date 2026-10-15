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
  ToggleRow,
} from "@/components/admin/ui";
import {
  createPurchaseOrder,
  createSupplier,
  deletePurchaseOrder,
  deleteSupplier,
  fetchIngredients,
  fetchPurchaseOrders,
  fetchSuppliers,
  setPurchaseOrderStatus,
  updateSupplier,
} from "@/lib/admin-api";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";

const TABS = ["suppliers", "orders"];
const ORDER_FILTERS = ["all", "pending", "received", "cancelled"];
const EMPTY_SUPPLIER = {
  name: "",
  nameEn: "",
  phone: "",
  email: "",
  address: "",
  note: "",
  ingredientIds: [],
  isActive: true,
};

const STATUS_TONE = { pending: "orange", received: "teal", cancelled: "gray" };
const STATUS_COLOR = { pending: C.orange, received: C.teal, cancelled: C.muted };

const fmtQty = (n) => {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};
const money = (n, t) => `${Number(n ?? 0).toFixed(2)} ${t("currency")}`;

export default function AdminSuppliers() {
  const { t } = useI18n();
  const [tab, setTab] = useState("suppliers");

  return (
    <View style={styles.screen}>
      <AdminHeader eyebrow={t("admin")} title={t("suppliersTitle")} subtitle={t("suppliersSubtitle")} />

      <View style={[styles.tabs, { paddingHorizontal: 20 }]}>
        {TABS.map((key) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{t(`suppliersTab_${key}`)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "suppliers" ? <SuppliersTab /> : <OrdersTab />}
    </View>
  );
}

// ============================================================
//  Suppliers — contact info and which materials each one carries
// ============================================================

function SuppliersTab() {
  const { can } = useStaff();
  const canEdit = can("suppliers", "edit");
  const { t, pick, tn } = useI18n();
  const dir = useDirection();

  const [suppliers, setSuppliers] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setSuppliers(null);
    fetchSuppliers()
      .then((d) => setSuppliers(d.suppliers ?? []))
      .catch((e) => {
        setError(e);
        setSuppliers([]);
      });
    fetchIngredients()
      .then((d) => setIngredients(d.ingredients ?? []))
      .catch(() => setIngredients([]));
  }, []);

  useEffect(load, [load]);

  const patch = (p) => setEditing((e) => (e ? { ...e, ...p } : e));

  function failure(e) {
    return e?.status === 404 ? t("errRouteMissing") : (e?.message ?? t("errSaveFailed"));
  }

  function openEdit(s) {
    setBanner(null);
    // older server responses had no ingredientIds — derive them so the toggles never crash
    setEditing({ ...s, ingredientIds: s.ingredientIds ?? (s.ingredients ?? []).map((i) => i.id) });
  }

  function openNew() {
    setBanner(null);
    setEditing({ ...EMPTY_SUPPLIER });
  }

  function toggleIngredient(id) {
    setEditing((e) => {
      if (!e) return e;
      const ids = e.ingredientIds ?? [];
      const on = ids.includes(id);
      return { ...e, ingredientIds: on ? ids.filter((x) => x !== id) : [...ids, id] };
    });
  }

  async function save() {
    if (!editing.name?.trim() && !editing.nameEn?.trim()) {
      setBanner({ text: t("errNameRequired") });
      return;
    }
    const body = {
      name: editing.name?.trim() ?? "",
      nameEn: editing.nameEn?.trim() ?? "",
      phone: editing.phone?.trim() || null,
      email: editing.email?.trim() || null,
      address: editing.address?.trim() || null,
      note: editing.note?.trim() || null,
      ingredientIds: editing.ingredientIds,
      isActive: editing.isActive !== false,
    };

    setSaving(true);
    setBanner(null);
    try {
      if (editing.id) await updateSupplier(editing.id, body);
      else await createSupplier(body);
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
      title: t("confirmDeleteSupplier"),
      text: t("confirmDeleteSupplierText"),
      confirmLabel: t("deleteSupplier"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteSupplier(editing.id);
          setEditing(null);
          load();
        } catch (e) {
          setBanner({ text: e?.status === 409 ? t("errSupplierInUse") : failure(e) });
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
          {!error && suppliers === null && <Loading text={t("loading")} />}
          {!error && suppliers?.length === 0 && (
            <Empty icon="briefcase-outline" title={t("noSuppliers")} text={t("noSuppliersHint")} />
          )}

          {!error &&
            suppliers?.map((s) => {
              // `ingredients`/`stats` aren't in every backend response shape
              // yet — falling back keeps this from hard-crashing the tab.
              const ings = s.ingredients ?? [];
              const orderCount = s.stats?.orders ?? 0;
              const activeColor = s.isActive === false ? C.muted : C.teal;
              return (
              <Pressable
                key={s.id}
                onPress={() => openEdit(s)}
                style={({ pressed }) => [
                  styles.supplierRow,
                  { shadowColor: activeColor },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.rowAccent,
                    dir.isRTL ? { right: 0 } : { left: 0 },
                    { backgroundColor: activeColor },
                  ]}
                />
                <View style={[dir.row, { alignItems: "center", gap: 8 }]}>
                  <Text style={[styles.rowName, dir.text]} numberOfLines={1}>
                    {pick(s)}
                  </Text>
                  {s.isActive === false && <Pill text={t("inactive")} tone="gray" />}
                </View>
                {!!s.phone && <Text style={[styles.rowMeta, dir.text]}>{s.phone}</Text>}
                <View style={[dir.row, { marginTop: 6, flexWrap: "wrap", gap: 6 }]}>
                  {ings.slice(0, 4).map((i) => (
                    <Pill key={i.id} text={pick(i)} tone="gray" />
                  ))}
                  {ings.length > 4 && <Pill text={`+${ings.length - 4}`} tone="gray" />}
                </View>
                <Text style={[styles.rowStats, dir.text]}>{tn("supplierOrdersCount", orderCount)}</Text>
              </Pressable>
              );
            })}
        </View>
      </ScrollView>

      {canAdd && (
        <Pressable onPress={openNew} style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}>
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newSupplier")}</Text>
        </Pressable>
      )}

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>
                {editing?.id ? t("editSupplier") : t("newSupplierTitle")}
              </Text>

              <Banner value={banner} />

              <Field label={t("fieldNameEn")} value={editing?.nameEn ?? ""} onChangeText={(v) => patch({ nameEn: v })} placeholder="Amana Farm" />
              <Field label={t("fieldNameAr")} value={editing?.name ?? ""} onChangeText={(v) => patch({ name: v })} placeholder="مزرعة الأمانة" />
              <Field
                label={t("fieldPhone")}
                value={editing?.phone ?? ""}
                onChangeText={(v) => patch({ phone: v })}
                placeholder="0791234567"
                keyboardType="phone-pad"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field
                label={t("fieldEmail")}
                value={editing?.email ?? ""}
                onChangeText={(v) => patch({ email: v })}
                placeholder="sales@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field label={t("fieldAddress")} value={editing?.address ?? ""} onChangeText={(v) => patch({ address: v })} placeholder="Amman, Jordan" />
              <Field label={t("fieldNote")} value={editing?.note ?? ""} onChangeText={(v) => patch({ note: v })} multiline />

              <Text style={[styles.fieldLabel, dir.text]}>{t("fieldSuppliedIngredients")}</Text>
              <View style={[styles.chips, dir.row]}>
                {ingredients.map((i) => {
                  const on = editing?.ingredientIds?.includes(i.id);
                  return (
                    <Pressable key={i.id} onPress={() => toggleIngredient(i.id)} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{pick(i)}</Text>
                    </Pressable>
                  );
                })}
                {ingredients.length === 0 && <Text style={[styles.rowMeta, dir.text]}>{t("noIngredients")}</Text>}
              </View>

              <ToggleRow label={t("active")} value={editing?.isActive !== false} onValueChange={(v) => patch({ isActive: v })} />

              <View style={{ gap: 9, marginTop: 10 }}>
                {canEdit && <Btn title={t("save")} icon="checkmark" onPress={save} loading={saving} />}
                {canEdit && !!editing?.id && (
                  <Btn title={t("deleteSupplier")} variant="danger" icon="trash-outline" onPress={confirmDelete} disabled={saving} />
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
//  Purchase orders — what was ordered from whom, and its stock effect
// ============================================================

function OrdersTab() {
  const { can } = useStaff();
  const canEdit = can("suppliers", "edit");
  const { t, pick, tn } = useI18n();
  const dir = useDirection();

  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [drafting, setDrafting] = useState(null); // new-order draft, or null
  const [viewing, setViewing] = useState(null); // an existing order being looked at
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [viewBanner, setViewBanner] = useState(null);

  const loadOrders = useCallback(() => {
    setError(null);
    setOrders(null);
    fetchPurchaseOrders({ status: filter === "all" ? undefined : filter })
      .then((d) => setOrders(d))
      .catch((e) => {
        setError(e);
        setOrders({ orders: [], counts: {} });
      });
  }, [filter]);

  useEffect(loadOrders, [loadOrders]);

  useEffect(() => {
    fetchSuppliers().then((d) => setSuppliers(d.suppliers ?? [])).catch(() => setSuppliers([]));
    fetchIngredients().then((d) => setIngredients(d.ingredients ?? [])).catch(() => setIngredients([]));
  }, []);

  function failure(e) {
    return e?.status === 404 ? t("errRouteMissing") : (e?.message ?? t("errSaveFailed"));
  }

  function openNew() {
    setBanner(null);
    setDrafting({ supplierId: suppliers[0]?.id ?? null, note: "", lines: {} });
  }

  const setLine = (ingredientId, field, value) =>
    setDrafting((d) => {
      if (!d) return d;
      const line = d.lines[ingredientId] ?? { quantity: "", unitCost: "" };
      return { ...d, lines: { ...d.lines, [ingredientId]: { ...line, [field]: value } } };
    });

  async function submitOrder() {
    if (!drafting.supplierId) {
      setBanner({ text: t("errSupplierRequired") });
      return;
    }
    const items = Object.entries(drafting.lines)
      .map(([id, l]) => ({ ingredientId: Number(id), quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }))
      .filter((l) => l.quantity > 0);
    if (items.length === 0) {
      setBanner({ text: t("errOrderItemsRequired") });
      return;
    }

    setSaving(true);
    setBanner(null);
    try {
      await createPurchaseOrder({ supplierId: drafting.supplierId, items, note: drafting.note?.trim() || undefined });
      setDrafting(null);
      loadOrders();
    } catch (e) {
      setBanner({ text: failure(e) });
    } finally {
      setSaving(false);
    }
  }

  async function act(status) {
    setSaving(true);
    setViewBanner(null);
    try {
      const res = await setPurchaseOrderStatus(viewing.id, status);
      setViewing(res.order);
      loadOrders();
    } catch (e) {
      setViewBanner({ text: failure(e) });
    } finally {
      setSaving(false);
    }
  }

  async function removeDraftOrder() {
    setSaving(true);
    try {
      await deletePurchaseOrder(viewing.id);
      setViewing(null);
      loadOrders();
    } catch (e) {
      setViewBanner({ text: e?.status === 409 ? t("errOrderReceived") : failure(e) });
    } finally {
      setSaving(false);
    }
  }

  const when = (iso) => new Date(iso).toLocaleDateString();
  const canAdd = canEdit && drafting === null && suppliers.length > 0;

  return (
    <View style={styles.flexBody}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          <View style={[styles.chips, dir.row]}>
            {ORDER_FILTERS.map((key) => {
              const on = filter === key;
              const count = orders?.counts?.[key];
              return (
                <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {t(`orderFilter_${key}`)}
                    {count != null ? ` (${count})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {suppliers.length === 0 && !error && (
            <Banner value={{ tone: "info", text: t("addSupplierFirst") }} />
          )}

          {error && <ErrorState error={error} onRetry={loadOrders} />}
          {!error && orders === null && <Loading text={t("loading")} />}
          {!error && orders?.orders?.length === 0 && <Empty icon="cart-outline" title={t("noOrders")} />}

          {!error &&
            orders?.orders?.map((o) => {
              const statusColor = STATUS_COLOR[o.status] ?? C.muted;
              return (
              <Pressable
                key={o.id}
                onPress={() => {
                  setViewBanner(null);
                  setViewing(o);
                }}
                style={({ pressed }) => [
                  styles.orderRow,
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
                  <View style={[dir.row, { alignItems: "center", gap: 8 }]}>
                    <Text style={[styles.rowName, dir.text]} numberOfLines={1}>
                      {o.supplier ? pick(o.supplier) : t("unknownSupplier")}
                    </Text>
                    <Pill text={t(`orderStatus_${o.status}`)} tone={STATUS_TONE[o.status]} />
                  </View>
                  <Text style={[styles.rowMeta, dir.text]}>
                    {tn("orderItemsCount", o.items.length)} · {when(o.orderedAt)}
                  </Text>
                </View>
                <Text style={styles.rowQty}>{money(o.totalCost, t)}</Text>
              </Pressable>
              );
            })}
        </View>
      </ScrollView>

      {canAdd && (
        <Pressable onPress={openNew} style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}>
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newOrder")}</Text>
        </Pressable>
      )}

      {/* ---------- new order ---------- */}
      <Modal visible={drafting !== null} transparent animationType="slide" onRequestClose={() => setDrafting(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>{t("newOrderTitle")}</Text>
              <Banner value={banner} />

              <Text style={[styles.fieldLabel, dir.text]}>{t("fieldSupplier")}</Text>
              <View style={[styles.chips, dir.row]}>
                {suppliers.map((s) => {
                  const on = drafting?.supplierId === s.id;
                  return (
                    <Pressable key={s.id} onPress={() => setDrafting((d) => ({ ...d, supplierId: s.id }))} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{pick(s)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, dir.text]}>{t("orderItemsTitle")}</Text>
              <Text style={[styles.rowMeta, dir.text, { marginBottom: 10 }]}>{t("orderItemsHint")}</Text>
              {ingredients.map((ing) => {
                const line = drafting?.lines?.[ing.id] ?? { quantity: "", unitCost: "" };
                return (
                  <View key={ing.id} style={[styles.itemRow, dir.row]}>
                    <Text style={[styles.itemName, dir.text]} numberOfLines={1}>
                      {pick(ing)}
                    </Text>
                    <TextInput
                      value={line.quantity}
                      onChangeText={(v) => setLine(ing.id, "quantity", v)}
                      placeholder="0"
                      placeholderTextColor={C.borderStrong}
                      keyboardType="decimal-pad"
                      style={styles.itemInput}
                    />
                    <Text style={styles.itemUnit}>{ing.unit}</Text>
                    <TextInput
                      value={line.unitCost}
                      onChangeText={(v) => setLine(ing.id, "unitCost", v)}
                      placeholder={t("unitCostShort")}
                      placeholderTextColor={C.borderStrong}
                      keyboardType="decimal-pad"
                      style={styles.itemInput}
                    />
                  </View>
                );
              })}

              <View style={{ marginTop: 12 }}>
                <Field label={t("fieldNote")} value={drafting?.note ?? ""} onChangeText={(v) => setDrafting((d) => ({ ...d, note: v }))} multiline />
              </View>

              <View style={{ gap: 9, marginTop: 6 }}>
                <Btn title={t("createOrder")} icon="checkmark" onPress={submitOrder} loading={saving} />
                <Btn title={t("cancel")} variant="ghost" onPress={() => setDrafting(null)} disabled={saving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------- order detail ---------- */}
      <Modal visible={viewing !== null} transparent animationType="slide" onRequestClose={() => setViewing(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[dir.row, { alignItems: "center", gap: 8, marginBottom: 4 }]}>
                <Text style={[styles.sheetTitle, dir.text, { marginBottom: 0, flex: 1 }]}>
                  {viewing?.supplier ? pick(viewing.supplier) : t("unknownSupplier")}
                </Text>
                {!!viewing && <Pill text={t(`orderStatus_${viewing.status}`)} tone={STATUS_TONE[viewing.status]} />}
              </View>
              <Text style={[styles.rowMeta, dir.text, { marginBottom: 16 }]}>
                {viewing && when(viewing.orderedAt)}
                {viewing?.createdBy ? ` · ${t("byStaff", { name: viewing.createdBy.name })}` : ""}
              </Text>

              <Banner value={viewBanner} />

              {viewing?.items?.map((line) => (
                <View key={line.ingredientId} style={[styles.detailLine, dir.row]}>
                  <Text style={[styles.itemName, dir.text]} numberOfLines={1}>
                    {line.ingredient ? pick(line.ingredient) : "—"}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {fmtQty(line.quantity)} {line.ingredient?.unit}
                  </Text>
                  <Text style={styles.itemName}>{money((Number(line.unitCost) || 0) * line.quantity, t)}</Text>
                </View>
              ))}

              <View style={[styles.detailLine, dir.row, { borderBottomWidth: 0, marginTop: 4 }]}>
                <Text style={[styles.rowName, dir.text]}>{t("orderTotalLabel")}</Text>
                <Text style={styles.rowQty}>{viewing && money(viewing.totalCost, t)}</Text>
              </View>

              {!!viewing?.note && <Text style={[styles.rowMeta, dir.text, { marginTop: 10 }]}>{viewing.note}</Text>}

              <View style={{ gap: 9, marginTop: 18 }}>
                {canEdit && viewing?.status === "pending" && (
                  <>
                    <Btn title={t("markReceived")} icon="checkmark-done" onPress={() => act("received")} loading={saving} />
                    <Btn title={t("cancelOrder")} variant="danger" icon="close-circle-outline" onPress={() => act("cancelled")} disabled={saving} />
                    <Btn title={t("deleteOrder")} variant="ghost" icon="trash-outline" onPress={removeDraftOrder} disabled={saving} />
                  </>
                )}
                <Btn title={t("close")} variant="ghost" onPress={() => setViewing(null)} disabled={saving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  supplierRow: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 14,
    marginBottom: 10,
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
  orderRow: {
    position: "relative",
    overflow: "hidden",
    minHeight: 64,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 9,
    gap: 10,
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rowName: { color: C.dark, fontSize: fs(16), fontWeight: "800" },
  rowMeta: { color: C.muted, fontSize: fs(14), fontWeight: "700", marginTop: 3 },
  rowStats: { color: C.teal, fontSize: fs(14), fontWeight: "800", marginTop: 8 },
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

  fieldLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  chips: { flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { backgroundColor: C.surfaceAlt, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  itemRow: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceAlt,
  },
  itemName: { flex: 1, minWidth: 0, color: C.dark, fontSize: fs(15), fontWeight: "700" },
  itemInput: {
    width: 66,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    color: C.dark,
    fontSize: fs(15),
    fontWeight: "700",
    textAlign: "center",
  },
  itemUnit: { color: C.muted, fontSize: fs(14), fontWeight: "800", minWidth: 26 },

  detailLine: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceAlt,
  },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
