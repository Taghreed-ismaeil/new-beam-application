import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

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
  createExpense,
  deleteExpense,
  downloadCsv,
  fetchExpenses,
  fetchProfitLoss,
  updateExpense,
} from "@/lib/admin-api";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";
import { Text } from "@/lib/arabic-font";

const TABS = ["expenses", "report"];
const CATEGORIES = ["utilities", "salaries", "maintenance", "supplies", "rent", "other"];
const RANGES = ["day", "week", "month"];

const todayIso = () => new Date().toISOString().slice(0, 10);
const money = (n, t) => `${Number(n ?? 0).toFixed(2)} ${t("currency")}`;

export default function AdminExpenses() {
  const { t } = useI18n();
  const [tab, setTab] = useState("expenses");

  return (
    <View style={styles.screen}>
      <AdminHeader eyebrow={t("admin")} title={t("expensesTitle")} subtitle={t("expensesSubtitle")} />

      <View style={[styles.tabs, { paddingHorizontal: 20 }]}>
        {TABS.map((key) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{t(`expensesTab_${key}`)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "expenses" ? <ExpensesTab /> : <ReportTab />}
    </View>
  );
}

// ============================================================
//  Expenses — record and browse, by category
// ============================================================

const EMPTY_EXPENSE = { category: "other", amount: "", date: todayIso(), note: "" };

function ExpensesTab() {
  const { can } = useStaff();
  const canEdit = can("expenses", "edit");
  const { t } = useI18n();
  const dir = useDirection();

  const [category, setCategory] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    fetchExpenses({ category: category === "all" ? undefined : category })
      .then(setData)
      .catch((e) => {
        setError(e);
        setData({ expenses: [], total: 0, byCategory: {} });
      });
  }, [category]);

  useEffect(load, [load]);

  const patch = (p) => setEditing((e) => (e ? { ...e, ...p } : e));

  function failure(e) {
    return e?.status === 404 ? t("errRouteMissing") : (e?.message ?? t("errSaveFailed"));
  }

  function openEdit(exp) {
    setBanner(null);
    setEditing({ ...exp, amount: String(exp.amount ?? "") });
  }

  function openNew() {
    setBanner(null);
    setEditing({ ...EMPTY_EXPENSE });
  }

  async function save() {
    const amount = Number(editing.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBanner({ text: t("errAmountInvalid") });
      return;
    }
    if (!editing.date || Number.isNaN(new Date(editing.date).getTime())) {
      setBanner({ text: t("errDateInvalid") });
      return;
    }

    const body = { category: editing.category, amount, date: editing.date, note: editing.note?.trim() || undefined };

    setSaving(true);
    setBanner(null);
    try {
      if (editing.id) await updateExpense(editing.id, body);
      else await createExpense(body);
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
      title: t("confirmDeleteExpense"),
      text: t("confirmDeleteExpenseText"),
      confirmLabel: t("delete"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteExpense(editing.id);
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

  async function exportCsv() {
    setExporting(true);
    setBanner(null);
    try {
      await downloadCsv(
        `/api/admin/expenses/export.csv${category !== "all" ? `?category=${category}` : ""}`,
        "expenses.csv",
      );
    } catch (e) {
      setBanner({ text: e?.message === "export_web_only" ? t("errExportWebOnly") : t("errExportFailed") });
    } finally {
      setExporting(false);
    }
  }

  const when = (iso) => new Date(iso).toLocaleDateString();
  const canAdd = canEdit && editing === null;

  return (
    <View style={styles.flexBody}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          <Banner value={banner} />
          {!canEdit && <Banner value={{ tone: "info", text: t("readOnlyNotice") }} />}

          <View style={[dir.row, { alignItems: "center", marginBottom: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.totalLabel, dir.text]}>{t("totalLabel")}</Text>
              <Text style={styles.totalValue}>{data ? money(data.total, t) : "—"}</Text>
            </View>
            <Btn title={t("exportCsv")} variant="ghost" icon="download-outline" onPress={exportCsv} loading={exporting} />
          </View>

          <View style={[styles.chips, dir.row]}>
            <Pressable onPress={() => setCategory("all")} style={[styles.chip, category === "all" && styles.chipOn]}>
              <Text style={[styles.chipText, category === "all" && styles.chipTextOn]}>{t("categoryAll")}</Text>
            </Pressable>
            {CATEGORIES.map((c) => {
              const on = category === c;
              return (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(`expenseCategory_${c}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && data === null && <Loading text={t("loading")} />}
          {!error && data?.expenses?.length === 0 && (
            <Empty icon="receipt-outline" title={t("noExpenses")} text={t("noExpensesHint")} />
          )}

          {!error &&
            data?.expenses?.map((exp) => (
              <Pressable key={exp.id} onPress={() => openEdit(exp)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={[dir.row, { alignItems: "center", gap: 8 }]}>
                  <Pill text={t(`expenseCategory_${exp.category}`)} tone="gray" />
                  <View style={{ flex: 1 }} />
                  <Text style={styles.rowAmount}>{money(exp.amount, t)}</Text>
                </View>
                {!!exp.note && (
                  <Text style={[styles.rowMeta, dir.text]} numberOfLines={1}>
                    {exp.note}
                  </Text>
                )}
                <Text style={[styles.rowMeta, dir.text]}>
                  {when(exp.date)}
                  {exp.createdBy ? ` · ${t("byStaff", { name: exp.createdBy.name })}` : ""}
                </Text>
              </Pressable>
            ))}
        </View>
      </ScrollView>

      {canAdd && (
        <Pressable onPress={openNew} style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}>
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newExpense")}</Text>
        </Pressable>
      )}

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>{editing?.id ? t("editExpense") : t("newExpenseTitle")}</Text>
              <Banner value={banner} />

              <Text style={[styles.fieldLabel, dir.text]}>{t("fieldExpenseCategory")}</Text>
              <View style={[styles.chips, dir.row]}>
                {CATEGORIES.map((c) => {
                  const on = editing?.category === c;
                  return (
                    <Pressable key={c} onPress={() => patch({ category: c })} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(`expenseCategory_${c}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field
                label={t("fieldAmount")}
                value={editing?.amount ?? ""}
                onChangeText={(v) => patch({ amount: v })}
                keyboardType="decimal-pad"
                placeholder="45.50"
              />
              <Field
                label={t("fieldExpenseDate")}
                value={editing?.date ?? ""}
                onChangeText={(v) => patch({ date: v.trim() })}
                placeholder="2026-08-20"
                autoCapitalize="none"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field label={t("fieldNote")} value={editing?.note ?? ""} onChangeText={(v) => patch({ note: v })} multiline />

              <View style={{ gap: 9, marginTop: 6 }}>
                {canEdit && <Btn title={t("save")} icon="checkmark" onPress={save} loading={saving} />}
                {canEdit && !!editing?.id && (
                  <Btn title={t("deleteExpense")} variant="danger" icon="trash-outline" onPress={confirmDelete} disabled={saving} />
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
//  Report — sales minus expenses, for a period
// ============================================================

function ReportTab() {
  const { t, tn } = useI18n();
  const dir = useDirection();

  const [range, setRange] = useState("week");
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [banner, setBanner] = useState(null);

  const bounds = useCallback(() => {
    const iso = (d) => d.toISOString().slice(0, 10);
    const today = new Date();
    if (range === "day") return { from: iso(today), to: iso(today) };
    if (range === "week") return { from: iso(new Date(today.getTime() - 6 * 86_400_000)), to: iso(today) };
    return {}; // month: the server's own default is the current calendar month
  }, [range]);

  const load = useCallback(() => {
    setError(null);
    setReport(null);
    fetchProfitLoss(bounds())
      .then(setReport)
      .catch(setError);
  }, [bounds]);

  useEffect(load, [load]);

  async function exportCsv() {
    setExporting(true);
    setBanner(null);
    try {
      const b = bounds();
      const q = new URLSearchParams(b).toString();
      await downloadCsv(`/api/admin/reports/profit-loss/export.csv${q ? `?${q}` : ""}`, "profit-loss.csv");
    } catch (e) {
      setBanner({ text: e?.message === "export_web_only" ? t("errExportWebOnly") : t("errExportFailed") });
    } finally {
      setExporting(false);
    }
  }

  function exportPdf() {
    if (Platform.OS === "web" && typeof window !== "undefined") window.print();
    else setBanner({ text: t("errExportWebOnly") });
  }

  const fmtDate = (iso) => new Date(iso).toLocaleDateString();
  const profitTone = (report?.profit ?? 0) >= 0 ? C.teal : C.danger;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.body}>
        <Banner value={banner} />

        <View style={[styles.chips, dir.row]}>
          {RANGES.map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={[styles.chip, range === r && styles.chipOn]}>
              <Text style={[styles.chipText, range === r && styles.chipTextOn]}>{t(`range_${r}`)}</Text>
            </Pressable>
          ))}
        </View>

        {error && <ErrorState error={error} onRetry={load} />}
        {!error && report === null && <Loading text={t("loading")} />}

        {!error && report && (
          <>
            <View style={styles.plCard}>
              <View style={[dir.row, { justifyContent: "space-between" }]}>
                <View>
                  <Text style={[styles.plLabel, dir.text]}>{t("plSales")}</Text>
                  <Text style={styles.plValue}>{money(report.sales, t)}</Text>
                </View>
                <View>
                  <Text style={[styles.plLabel, dir.text]}>{t("plExpenses")}</Text>
                  <Text style={styles.plValue}>{money(report.expenses, t)}</Text>
                </View>
              </View>
              <View style={styles.plDivider} />
              <Text style={[styles.plLabel, dir.text]}>{t("plProfit")}</Text>
              <Text style={[styles.plProfit, { color: profitTone }]}>{money(report.profit, t)}</Text>
              <Text style={[styles.rowMeta, dir.text]}>{tn("ordersCount", report.ordersCount)}</Text>
            </View>

            <View style={[dir.row, { gap: 9, marginBottom: 16 }]}>
              <View style={{ flex: 1 }}>
                <Btn title={t("exportCsv")} variant="ghost" icon="download-outline" onPress={exportCsv} loading={exporting} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn title={t("exportPdf")} variant="ghost" icon="print-outline" onPress={exportPdf} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, dir.text]}>{t("plByCategory")}</Text>
            {CATEGORIES.filter((c) => report.byCategory[c] > 0).map((c) => (
              <View key={c} style={[styles.catRow, dir.row]}>
                <Text style={[styles.rowMeta, dir.text, { flex: 1 }]}>{t(`expenseCategory_${c}`)}</Text>
                <Text style={styles.rowAmount}>{money(report.byCategory[c], t)}</Text>
              </View>
            ))}
            {!Object.values(report.byCategory).some((v) => v > 0) && (
              <Text style={[styles.rowMeta, dir.text, { marginBottom: 12 }]}>{t("noExpenses")}</Text>
            )}

            <Text style={[styles.sectionTitle, dir.text, { marginTop: 16 }]}>{t("plDaily")}</Text>
            {report.series.map((p) => (
              <View key={p.date} style={[styles.dayRow, dir.row]}>
                <Text style={[styles.rowMeta, dir.text, { flex: 1 }]}>{fmtDate(p.date)}</Text>
                <Text style={[styles.dayCell, { color: C.teal }]}>{money(p.sales, t)}</Text>
                <Text style={[styles.dayCell, { color: C.danger }]}>{money(p.expenses, t)}</Text>
                <Text style={[styles.dayCell, { color: p.profit >= 0 ? C.dark : C.danger, fontWeight: "800" }]}>
                  {money(p.profit, t)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
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

  totalLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  totalValue: { color: C.dark, fontSize: fs(25), fontWeight: "800", marginTop: 3 },

  fieldLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  chips: { flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { backgroundColor: C.surfaceAlt, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  row: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 14,
    marginBottom: 10,
  },
  rowMeta: { color: C.muted, fontSize: fs(14), fontWeight: "700", marginTop: 3 },
  rowAmount: { color: C.teal, fontSize: fs(15.5), fontWeight: "800" },

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

  plCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 16,
  },
  plLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  plValue: { color: C.dark, fontSize: fs(19), fontWeight: "800", marginTop: 3 },
  plDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  plProfit: { fontSize: fs(31), fontWeight: "800", marginTop: 3, letterSpacing: -0.6 },

  sectionTitle: { color: C.dark, fontSize: fs(15.5), fontWeight: "800", marginBottom: 8 },
  catRow: { alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.surfaceAlt },
  dayRow: { alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.surfaceAlt },
  dayCell: { width: 72, textAlign: "right", fontSize: fs(15), fontWeight: "800" },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
