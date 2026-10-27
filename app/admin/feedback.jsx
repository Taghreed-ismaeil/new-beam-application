import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AdminHeader, Banner, Btn, C, Empty, ErrorState, Loading, Pill } from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import { fs } from "@/lib/admin-font";
import { fetchAdminFeedback, setFeedbackStatus } from "@/lib/admin-api";
import { useDirection, useI18n } from "@/lib/i18n";
import { Text } from "@/lib/arabic-font";

// Ratings & complaints sent from the app's Account page. Complaints come first;
// staff mark them seen / resolved. Backend: /api/admin/feedback.

const TABS = [
  { key: "complaint", label: "feedbackTabComplaints", query: { kind: "complaint" } },
  { key: "rating", label: "feedbackTabRatings", query: { kind: "rating" } },
  { key: "all", label: "feedbackTabAll", query: {} },
];

const STATUS_PILL = {
  new: { tone: "orange", label: "feedbackStatusNew" },
  seen: { tone: "gray", label: "feedbackStatusSeen" },
  resolved: { tone: "teal", label: "feedbackStatusResolved" },
};

function Stars({ value, size = 16 }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={size} color={C.teal} />
      ))}
    </View>
  );
}

export default function AdminFeedback() {
  const { can } = useStaff();
  const canEdit = can("feedback", "edit");
  const { t } = useI18n();
  const dir = useDirection();

  const [tab, setTab] = useState("complaint");
  const [items, setItems] = useState(null);
  const [stats, setStats] = useState({ newComplaints: 0, ratingAverage: null, ratingCount: 0 });
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    fetchAdminFeedback(TABS.find((x) => x.key === tab).query)
      .then((d) => {
        setItems(d.items ?? []);
        setStats({
          newComplaints: d.newComplaints ?? 0,
          ratingAverage: d.ratingAverage,
          ratingCount: d.ratingCount ?? 0,
        });
      })
      .catch((e) => {
        setError(e);
        setItems([]);
      });
  }, [tab]);

  useEffect(load, [load]);

  async function changeStatus(item, status) {
    setBusyId(item.id);
    setBanner(null);
    try {
      await setFeedbackStatus(item.id, status);
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, status } : x)));
      if (item.kind === "complaint" && item.status === "new" && status !== "new")
        setStats((s) => ({ ...s, newComplaints: Math.max(s.newComplaints - 1, 0) }));
      if (item.kind === "complaint" && item.status !== "new" && status === "new")
        setStats((s) => ({ ...s, newComplaints: s.newComplaints + 1 }));
    } catch {
      setBanner({ text: t("errSaveFailed") });
    } finally {
      setBusyId(null);
    }
  }

  const avg = stats.ratingAverage;

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AdminHeader eyebrow={t("admin")} title={t("feedbackAdminTitle")} subtitle={t("feedbackAdminSubtitle")} />

        <View style={styles.body}>
          {/* Summary */}
          <View style={[styles.summary, dir.row]}>
            <View style={[styles.statCard, { backgroundColor: C.lightTeal }]}>
              <Text style={[styles.statLabel, dir.text]}>{t("feedbackAverage")}</Text>
              <View style={[styles.statRow, dir.row]}>
                <Text style={[styles.statValue, { color: C.teal }]}>{avg ? avg.toFixed(1) : "—"}</Text>
                <Stars value={Math.round(avg ?? 0)} size={15} />
              </View>
              <Text style={[styles.statSub, dir.text]}>
                {stats.ratingCount} {t("feedbackRatingsCount")}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.lightOrange }]}>
              <Text style={[styles.statLabel, dir.text]}>{t("feedbackNewComplaints")}</Text>
              <Text style={[styles.statValue, { color: C.orange }, dir.text]}>{stats.newComplaints}</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={[styles.tabs, dir.row]}>
            {TABS.map((x) => {
              const on = tab === x.key;
              return (
                <Pressable key={x.key} onPress={() => setTab(x.key)} style={[styles.tab, on && styles.tabOn]}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(x.label)}</Text>
                  {x.key === "complaint" && stats.newComplaints > 0 && (
                    <View style={styles.count}>
                      <Text style={styles.countText}>{stats.newComplaints}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && items === null && <Loading text={t("loading")} />}
          {!error && items?.length === 0 && <Empty icon="chatbubbles-outline" title={t("feedbackEmpty")} text="" />}

          <View style={styles.list}>
            {(items ?? []).map((f) => {
              const pill = STATUS_PILL[f.status];
              const isComplaint = f.kind === "complaint";
              return (
                <View
                  key={f.id}
                  style={[styles.card, isComplaint && f.status === "new" && styles.cardNew]}
                >
                  <View style={[styles.cardTop, dir.row]}>
                    <View style={[styles.kindIcon, { backgroundColor: isComplaint ? C.lightOrange : C.lightTeal }]}>
                      <Ionicons
                        name={isComplaint ? "chatbox-ellipses-outline" : "star"}
                        size={18}
                        color={isComplaint ? C.orange : C.teal}
                      />
                    </View>
                    <View style={styles.who}>
                      <Text style={[styles.name, dir.text]} numberOfLines={1}>
                        {f.user?.name ?? "—"}
                      </Text>
                      <Text style={[styles.meta, dir.text]}>
                        {f.user?.phone ?? ""} · {new Date(f.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {!!pill && <Pill text={t(pill.label)} tone={pill.tone} />}
                  </View>

                  {!isComplaint && <Stars value={f.rating ?? 0} size={20} />}

                  <Text style={[styles.message, dir.text, !f.message && styles.noMessage]}>
                    {f.message || t("feedbackNoMessage")}
                  </Text>

                  <View style={[styles.actions, dir.row]}>
                    {!!f.user?.phone && (
                      <Btn
                        title={t("feedbackCall")}
                        icon="call-outline"
                        size="sm"
                        variant="ghost"
                        onPress={() => Linking.openURL(`tel:${f.user.phone}`).catch(() => {})}
                      />
                    )}
                    {canEdit && f.status === "new" && (
                      <Btn
                        title={t("feedbackMarkSeen")}
                        icon="eye-outline"
                        size="sm"
                        variant="ghost"
                        disabled={busyId === f.id}
                        onPress={() => changeStatus(f, "seen")}
                      />
                    )}
                    {canEdit && f.status !== "resolved" && (
                      <Btn
                        title={t("feedbackMarkResolved")}
                        icon="checkmark-done"
                        size="sm"
                        loading={busyId === f.id}
                        onPress={() => changeStatus(f, "resolved")}
                      />
                    )}
                    {canEdit && f.status === "resolved" && (
                      <Btn
                        title={t("feedbackReopen")}
                        icon="refresh"
                        size="sm"
                        variant="ghost"
                        disabled={busyId === f.id}
                        onPress={() => changeStatus(f, "new")}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <Banner value={banner} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 60 },
  body: { paddingHorizontal: 20 },

  summary: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 18, padding: 14 },
  statLabel: { color: C.muted, fontSize: fs(13), fontWeight: "800" },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  statValue: { fontSize: fs(28), fontWeight: "900", marginTop: 2 },
  statSub: { color: C.muted, fontSize: fs(12), fontWeight: "700", marginTop: 2 },

  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surfaceAlt,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabOn: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  tabTextOn: { color: C.white },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: C.white, fontSize: fs(11.5), fontWeight: "900" },

  list: { gap: 10 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 14,
    gap: 10,
  },
  cardNew: { borderColor: C.orange, borderWidth: 1.5 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  kindIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  who: { flex: 1 },
  name: { color: C.dark, fontSize: fs(14.5), fontWeight: "800" },
  meta: { color: C.muted, fontSize: fs(12), fontWeight: "700", marginTop: 1 },
  stars: { flexDirection: "row", gap: 3 },
  message: { color: C.text, fontSize: fs(14), fontWeight: "600", lineHeight: fs(21) },
  noMessage: { color: C.muted, fontStyle: "italic" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
