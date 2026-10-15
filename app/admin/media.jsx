import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
import { useStaff } from "@/context/StaffContext";
import { fs } from "@/lib/admin-font";
import { deleteMedia, fetchAdminMedia, reviewMedia, uploadRestaurantMedia } from "@/lib/admin-api";
import { imageUrl } from "@/lib/api-client";
import { useDirection, useI18n } from "@/lib/i18n";

// Media tab moderation: customers' shared photos wait here until approved; staff
// can also post the restaurant's own photos (live at once). Backend: /api/admin/media.

const TABS = [
  { key: "pending", label: "mediaTabPending", query: { source: "customer", status: "pending" } },
  { key: "customer", label: "mediaTabCustomer", query: { source: "customer" } },
  { key: "restaurant", label: "mediaTabRestaurant", query: { source: "restaurant" } },
];

const STATUS_PILL = {
  pending: { tone: "orange", label: "mediaStatusPending" },
  approved: { tone: "teal", label: "mediaStatusApproved" },
  rejected: { tone: "danger", label: "mediaStatusRejected" },
};

export default function AdminMedia() {
  const { can } = useStaff();
  const canEdit = can("media", "edit");
  const { t } = useI18n();
  const dir = useDirection();
  const { width } = useWindowDimensions();

  const [tab, setTab] = useState("pending");
  const [posts, setPosts] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [uploading, setUploading] = useState(null); // { asset, caption } while the sheet is open
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setPosts(null);
    fetchAdminMedia(TABS.find((x) => x.key === tab).query)
      .then((d) => {
        setPosts(d.posts ?? []);
        setPendingCount(d.pendingCount ?? 0);
      })
      .catch((e) => {
        setError(e);
        setPosts([]);
      });
  }, [tab]);

  useEffect(load, [load]);

  async function review(post, status) {
    setBusyId(post.id);
    setBanner(null);
    try {
      await reviewMedia(post.id, status);
      // In the review queue the photo leaves the list; elsewhere it just changes status
      setPosts((list) =>
        tab === "pending" ? list.filter((p) => p.id !== post.id) : list.map((p) => (p.id === post.id ? { ...p, status } : p)),
      );
      if (post.status === "pending") setPendingCount((n) => Math.max(n - 1, 0));
    } catch {
      setBanner({ text: t("errSaveFailed") });
    } finally {
      setBusyId(null);
    }
  }

  function askDelete(post) {
    setConfirm({
      title: t("confirmDeleteMedia"),
      text: t("confirmDeleteMediaText"),
      confirmLabel: t("mediaDelete"),
      onConfirm: async () => {
        setBusyId(post.id);
        try {
          await deleteMedia(post.id);
          setPosts((list) => list.filter((p) => p.id !== post.id));
          if (post.status === "pending") setPendingCount((n) => Math.max(n - 1, 0));
        } catch {
          setBanner({ text: t("errSaveFailed") });
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled && result.assets?.[0]) {
      setUploading((u) => ({ caption: u?.caption ?? "", asset: result.assets[0] }));
    }
  }

  async function publish() {
    if (!uploading?.asset) return;
    setSaving(true);
    try {
      await uploadRestaurantMedia(uploading.asset, uploading.caption);
      setUploading(null);
      if (tab === "restaurant") load();
      else setTab("restaurant");
    } catch {
      setBanner({ text: t("errSaveFailed") });
    } finally {
      setSaving(false);
    }
  }

  // Small cards: 2 per row on phones, more on wider admin screens
  const columns = width >= 1100 ? 5 : width >= 700 ? 3 : 2;

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AdminHeader eyebrow={t("admin")} title={t("mediaAdminTitle")} subtitle={t("mediaAdminSubtitle")} />

        <View style={styles.body}>
          {/* Tabs */}
          <View style={[styles.tabs, dir.row]}>
            {TABS.map((x) => {
              const on = tab === x.key;
              return (
                <Pressable key={x.key} onPress={() => setTab(x.key)} style={[styles.tab, on && styles.tabOn]}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(x.label)}</Text>
                  {x.key === "pending" && pendingCount > 0 && (
                    <View style={styles.count}>
                      <Text style={styles.countText}>{pendingCount}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && posts === null && <Loading text={t("loading")} />}
          {!error && posts?.length === 0 && (
            <Empty
              icon="images-outline"
              title={tab === "pending" ? t("mediaEmptyPending") : t("mediaEmptyList")}
              text=""
            />
          )}

          <View style={[styles.grid, dir.row]}>
            {(posts ?? []).map((p) => {
              const pill = STATUS_PILL[p.status];
              return (
                <View key={p.id} style={[styles.card, { width: `${100 / columns - 2}%` }]}>
                  <Image source={{ uri: imageUrl(p.imageUrl) }} contentFit="cover" style={styles.photo} />
                  <View style={styles.cardBody}>
                    <View style={[styles.cardTop, dir.row]}>
                      <Text style={[styles.who, dir.text]} numberOfLines={1}>
                        {p.source === "customer" ? `${p.user?.name ?? "—"} · ${p.user?.phone ?? ""}` : p.staff?.name ?? "Beam"}
                      </Text>
                      {!!pill && <Pill text={t(pill.label)} tone={pill.tone} />}
                    </View>
                    {!!p.caption && <Text style={[styles.caption, dir.text]}>{p.caption}</Text>}
                    <Text style={[styles.date, dir.text]}>{new Date(p.createdAt).toLocaleString()}</Text>

                    {canEdit && (
                      <View style={[styles.actions, dir.row]}>
                        {p.source === "customer" && p.status !== "approved" && (
                          <Btn
                            title={t("mediaApprove")}
                            icon="checkmark"
                            size="sm"
                            loading={busyId === p.id}
                            onPress={() => review(p, "approved")}
                          />
                        )}
                        {p.source === "customer" && p.status !== "rejected" && (
                          <Btn
                            title={t("mediaReject")}
                            icon="close"
                            size="sm"
                            variant="ghost"
                            disabled={busyId === p.id}
                            onPress={() => review(p, "rejected")}
                          />
                        )}
                        <Btn
                          title={t("mediaDelete")}
                          icon="trash-outline"
                          size="sm"
                          variant="danger"
                          disabled={busyId === p.id}
                          onPress={() => askDelete(p)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <Banner value={banner} />
        </View>
      </ScrollView>

      {canEdit && (
        <Pressable
          onPress={() => setUploading({ asset: null, caption: "" })}
          style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("mediaAddPhoto")}</Text>
        </Pressable>
      )}

      {/* New restaurant photo */}
      <Modal visible={uploading !== null} transparent animationType="slide" onRequestClose={() => setUploading(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>{t("mediaUploadTitle")}</Text>
              <Text style={[styles.sheetHint, dir.text]}>{t("mediaUploadHint")}</Text>

              <Pressable onPress={pickImage} style={styles.pickBox}>
                {uploading?.asset ? (
                  <Image source={{ uri: uploading.asset.uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={styles.pickEmpty}>
                    <Ionicons name="image-outline" size={40} color={C.teal} />
                    <Text style={styles.pickText}>{t("mediaPickImage")}</Text>
                  </View>
                )}
              </Pressable>

              <Field
                label={t("mediaCaptionLabel")}
                value={uploading?.caption ?? ""}
                onChangeText={(v) => setUploading((u) => ({ ...u, caption: v }))}
                multiline
              />

              <View style={{ gap: 9, marginTop: 6 }}>
                <Btn
                  title={t("mediaPublish")}
                  icon="cloud-upload-outline"
                  onPress={publish}
                  loading={saving}
                  disabled={!uploading?.asset}
                />
                <Btn title={t("cancel")} variant="ghost" onPress={() => setUploading(null)} disabled={saving} />
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

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    minWidth: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: C.surfaceAlt },
  cardBody: { padding: 10 },
  cardTop: { flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 },
  who: { flexShrink: 1, color: C.dark, fontSize: fs(13.5), fontWeight: "800" },
  caption: { color: C.text, fontSize: fs(13), fontWeight: "600", marginBottom: 3 },
  date: { color: C.muted, fontSize: fs(11.5), fontWeight: "700" },
  actions: { flexWrap: "wrap", gap: 6, marginTop: 10 },

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
  sheetTitle: { color: C.dark, fontSize: fs(22), fontWeight: "800" },
  sheetHint: { color: C.muted, fontSize: fs(13.5), fontWeight: "700", marginTop: 2, marginBottom: 16 },
  pickBox: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.lightTeal,
    marginBottom: 16,
  },
  pickEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  pickText: { color: C.teal, fontSize: fs(14.5), fontWeight: "800" },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
