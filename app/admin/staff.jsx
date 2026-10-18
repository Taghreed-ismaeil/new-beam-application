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
  Switch,
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
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";
import {
  createStaffMember,
  deleteStaffMember,
  fetchAuditLog,
  fetchLoginLog,
  fetchStaffList,
  updateStaffMember,
} from "@/lib/staff-api";
import { Text } from "@/lib/arabic-font";

const ROLES = ["owner", "admin", "manager", "chef", "cashier", "waiter"];

const ROLE_LABEL = {
  owner: "roleOwner",
  admin: "roleAdmin",
  manager: "roleManager",
  chef: "roleChef",
  cashier: "roleCashier",
  waiter: "roleWaiter",
};

const TABS = ["people", "activity", "logins"];

export default function AdminStaff() {
  const { staff: me } = useStaff();
  const { t } = useI18n();
  const dir = useDirection();

  const [tab, setTab] = useState("people");
  const [people, setPeople] = useState(null);
  const [audit, setAudit] = useState(null);
  const [logins, setLogins] = useState(null);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const patch = (p) => setDraft((d) => (d ? { ...d, ...p } : d));

  const load = useCallback(() => {
    setError(null);
    setPeople(null);
    fetchStaffList()
      .then((d) => setPeople(d.staff ?? []))
      .catch((e) => {
        setError(e);
        setPeople([]);
      });
    fetchAuditLog({ limit: 40 })
      .then((d) => setAudit(d.entries ?? []))
      .catch(() => setAudit([]));
    fetchLoginLog(40)
      .then((d) => setLogins(d.entries ?? []))
      .catch(() => setLogins([]));
  }, []);

  useEffect(load, [load]);

  const failure = (e) => {
    const map = {
      phone_taken: t("staffPhoneTaken"),
      password_too_short: t("staffPasswordShort"),
      invalid_phone: t("staffPhoneInvalid"),
      name_required: t("staffNameRequired"),
      last_owner: t("staffLastOwner"),
      owner_only: t("staffOwnerOnly"),
    };
    return map[e?.data?.error] ?? t("errSaveFailed");
  };

  async function save() {
    if (!draft.name?.trim()) return setBanner({ text: t("staffNameRequired") });
    if (!draft.phone?.trim()) return setBanner({ text: t("staffPhoneInvalid") });
    if (!draft.id && String(draft.password ?? "").length < 6) {
      return setBanner({ text: t("staffPasswordShort") });
    }

    setSaving(true);
    setBanner(null);
    try {
      if (draft.id) {
        const body = {
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          role: draft.role,
          isActive: draft.isActive !== false,
        };
        // Only send a password when one was actually typed, so saving a name change
        // doesn't silently reset someone's login.
        if (draft.password) body.password = draft.password;
        await updateStaffMember(draft.id, body);
      } else {
        await createStaffMember({
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          password: draft.password,
          role: draft.role,
        });
      }
      setDraft(null);
      load();
    } catch (e) {
      setBanner({ text: failure(e) });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(member) {
    setConfirm({
      title: t("staffDeleteTitle", { name: member.name }),
      text: t("staffDeleteText"),
      confirmLabel: t("delete"),
      onConfirm: async () => {
        try {
          await deleteStaffMember(member.id);
          setDraft(null);
          load();
        } catch (e) {
          setBanner({ text: failure(e) });
        }
      },
    });
  }

  async function toggleActive(member, next) {
    setPeople((arr) => arr.map((p) => (p.id === member.id ? { ...p, isActive: next } : p)));
    try {
      await updateStaffMember(member.id, { isActive: next });
    } catch (e) {
      setPeople((arr) => arr.map((p) => (p.id === member.id ? { ...p, isActive: !next } : p)));
      setBanner({ text: failure(e) });
    }
  }

  const when = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AdminHeader
          eyebrow={t("admin")}
          title={t("navStaffTitle")}
          subtitle={t("staffSubtitle")}
        />

        <View style={styles.body}>
          <Banner value={banner} />

          <View style={[styles.tabs, dir.row]}>
            {TABS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabOn]}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
                  {t(
                    key === "people"
                      ? "staffTabPeople"
                      : key === "activity"
                        ? "staffTabActivity"
                        : "staffTabLogins",
                  )}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <ErrorState error={error} onRetry={load} />}

          {/* ---------- people ---------- */}
          {!error && tab === "people" && (
            <>
              {people === null && <Loading />}
              {people?.map((member) => (
                <View key={member.id} style={styles.card}>
                  <Pressable
                    onPress={() => {
                      setBanner(null);
                      setDraft({ ...member, password: "" });
                    }}
                    style={({ pressed }) => [styles.cardMain, dir.row, pressed && styles.pressed]}
                  >
                    <View style={[styles.avatar, member.isActive === false && styles.avatarOff]}>
                      <Text style={styles.avatarText}>
                        {(member.name || "?").trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardText}>
                      <Text style={[styles.name, dir.text]} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={styles.phone}>{member.phone}</Text>
                      <View style={[styles.badges, dir.row]}>
                        <Pill
                          text={t(ROLE_LABEL[member.role] ?? "admin")}
                          tone={member.role === "owner" ? "orange" : "gray"}
                        />
                        {member.lastLoginAt && (
                          <Pill text={t("staffLastSeen", { when: when(member.lastLoginAt) })} tone="teal" />
                        )}
                      </View>
                    </View>
                    {/* The owner can't switch themselves off and lock everyone out. */}
                    <Switch
                      value={member.isActive !== false}
                      disabled={member.id === me?.id}
                      onValueChange={(v) => toggleActive(member, v)}
                      trackColor={{ true: C.teal, false: C.borderStrong }}
                      thumbColor={C.white}
                    />
                  </Pressable>
                </View>
              ))}
              {people?.length === 0 && <Text style={[styles.empty, dir.text]}>{t("staffEmpty")}</Text>}
            </>
          )}

          {/* ---------- audit ---------- */}
          {!error && tab === "activity" && (
            <>
              {audit === null && <Loading />}
              {audit?.map((e) => (
                <View key={e.id} style={styles.logRow}>
                  <Text style={[styles.logMain, dir.text]}>
                    {e.staffName} · {e.action} · {e.entity}
                    {e.entityId ? `#${e.entityId}` : ""}
                  </Text>
                  {!!e.changes && Object.keys(e.changes).length > 0 && (
                    <Text style={[styles.logDetail, dir.text]}>
                      {Object.entries(e.changes)
                        .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`)
                        .join("  ·  ")}
                    </Text>
                  )}
                  {!!e.note && <Text style={[styles.logDetail, dir.text]}>{e.note}</Text>}
                  <Text style={[styles.logWhen, dir.text]}>{when(e.at)}</Text>
                </View>
              ))}
              {audit?.length === 0 && <Text style={[styles.empty, dir.text]}>{t("staffNoActivity")}</Text>}
            </>
          )}

          {/* ---------- logins ---------- */}
          {!error && tab === "logins" && (
            <>
              {logins === null && <Loading />}
              {logins?.map((e) => (
                <View key={e.id} style={styles.logRow}>
                  <Text style={[styles.logMain, dir.text]}>
                    {e.ok ? "✓" : "✕"} {e.staffName ?? e.phone}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </Text>
                  <Text style={[styles.logDetail, dir.text]}>
                    {e.ip || "—"} · {String(e.userAgent ?? "").slice(0, 60)}
                  </Text>
                  <Text style={[styles.logWhen, dir.text]}>{when(e.at)}</Text>
                </View>
              ))}
              {logins?.length === 0 && <Text style={[styles.empty, dir.text]}>{t("staffNoLogins")}</Text>}
            </>
          )}
        </View>
      </ScrollView>

      {tab === "people" && draft === null && (
        <Pressable
          onPress={() => {
            setBanner(null);
            setDraft({ name: "", phone: "", password: "", role: "waiter", isActive: true });
          }}
          style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}
        >
          <Ionicons name="person-add-outline" size={19} color={C.white} />
          <Text style={styles.fabText}>{t("staffAdd")}</Text>
        </Pressable>
      )}

      <Modal
        visible={draft !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDraft(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>
                {draft?.id ? t("staffEdit") : t("staffAdd")}
              </Text>
              <Banner value={banner} />

              <Field
                label={t("staffName")}
                value={draft?.name ?? ""}
                onChangeText={(v) => patch({ name: v })}
              />
              <Field
                label={t("staffPhone")}
                value={draft?.phone ?? ""}
                onChangeText={(v) => patch({ phone: v })}
                keyboardType="phone-pad"
                placeholder="07XXXXXXXX"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field
                label={draft?.id ? t("staffNewPassword") : t("staffPassword")}
                value={draft?.password ?? ""}
                onChangeText={(v) => patch({ password: v })}
                secureTextEntry
                autoCapitalize="none"
                hint={draft?.id ? t("staffPasswordKeepHint") : t("staffPasswordHint")}
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />

              <Text style={[styles.fieldLabel, dir.text]}>{t("staffRole")}</Text>
              <View style={[styles.chips, dir.row]}>
                {ROLES.map((role) => {
                  const on = draft?.role === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => patch({ role })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {t(ROLE_LABEL[role])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ gap: 9, marginTop: 6 }}>
                <Btn title={t("save")} icon="checkmark" onPress={save} loading={saving} />
                {!!draft?.id && draft.id !== me?.id && (
                  <Btn
                    title={t("delete")}
                    variant="danger"
                    icon="trash-outline"
                    onPress={() => confirmDelete(draft)}
                    disabled={saving}
                  />
                )}
                <Btn title={t("cancel")} variant="ghost" onPress={() => setDraft(null)} disabled={saving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 110 },
  body: { paddingHorizontal: 20 },

  tabs: { gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
  },
  tabOn: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: fs(15), fontWeight: "800" },
  tabTextOn: { color: C.white },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardMain: { alignItems: "center", padding: 13, gap: 11 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOff: { backgroundColor: C.borderStrong },
  avatarText: { color: C.white, fontSize: fs(18.5), fontWeight: "800" },
  cardText: { flex: 1, minWidth: 0 },
  name: { color: C.dark, fontSize: fs(16.5), fontWeight: "800", marginBottom: 2 },
  phone: { color: C.muted, fontSize: fs(15), fontWeight: "700", writingDirection: "ltr" },
  badges: { flexWrap: "wrap", gap: 5, marginTop: 7 },

  logRow: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
  },
  logMain: { color: C.dark, fontSize: fs(15), fontWeight: "800" },
  logDetail: { color: C.muted, fontSize: fs(14), marginTop: 3, lineHeight: fs(18) },
  logWhen: { color: C.placeholder, fontSize: fs(13.5), marginTop: 5, fontWeight: "700" },

  empty: { color: C.subtle, fontSize: fs(15), lineHeight: fs(21), marginTop: 6 },

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
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: C.white, fontSize: fs(15), fontWeight: "800" },

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
  sheetGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: { color: C.dark, fontSize: fs(22), fontWeight: "800", marginBottom: 18 },

  fieldLabel: {
    color: C.muted,
    fontSize: fs(13.5),
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  chips: { flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
