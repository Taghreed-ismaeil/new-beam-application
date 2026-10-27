import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
} from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import { fs } from "@/lib/admin-font";
import { deleteMedia, fetchAdminMedia, reviewMedia, uploadRestaurantMedia } from "@/lib/admin-api";
import { imageUrl } from "@/lib/api-client";
import { useDirection, useI18n } from "@/lib/i18n";
import { Text } from "@/lib/arabic-font";

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

const BADGE_COLOR = { pending: C.orange, approved: C.teal, rejected: C.danger };

export default function AdminMedia() {
  const { can } = useStaff();
  const canEdit = can("media", "edit");
  const { t } = useI18n();
  const dir = useDirection();
  // width of the grid itself (the sidebar takes part of the window on desktop)
  const [gridWidth, setGridWidth] = useState(0);

  const [tab, setTab] = useState("pending");
  const [posts, setPosts] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [viewing, setViewing] = useState(null); // post shown big in the popup
  const { width: winW, height: winH } = useWindowDimensions();

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
      setViewing(null);
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
          setViewing(null);
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

  function renderWho(p, big) {
    const name = p.source === "customer" ? p.user?.name ?? "—" : p.staff?.name ?? "Beam";
    return (
      <View style={[styles.who, dir.row]}>
        <View style={[styles.avatar, big && styles.avatarBig, p.source !== "customer" && styles.avatarStaff]}>
          <Text style={[styles.avatarText, big && styles.avatarTextBig]}>
            {(name === "—" ? "?" : name).trim().slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.whoText}>
          <Text style={[styles.name, big && styles.nameBig, dir.text]} numberOfLines={2}>
            {name}
          </Text>
          {p.source === "customer" && !!p.user?.phone && (
            <Text style={[styles.phone, big && styles.phoneBig, dir.text]} numberOfLines={1}>
              {p.user.phone}
            </Text>
          )}
        </View>
      </View>
    );
  }

  function renderActions(p, big) {
    if (!canEdit) return null;
    return (
      <View style={styles.actions}>
        {p.source === "customer" && p.status !== "approved" && (
          <Pressable
            onPress={() => review(p, "approved")}
            disabled={busyId === p.id}
            style={({ pressed }) => [styles.approve, big && styles.btnBig, dir.row, pressed && styles.pressed]}
          >
            {busyId === p.id ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={big ? 20 : 17} color={C.white} />
                <Text style={[styles.approveText, big && styles.btnTextBig]}>{t("mediaApprove")}</Text>
              </>
            )}
          </Pressable>
        )}
        <View style={[styles.smallRow, dir.row]}>
          {p.source === "customer" && p.status !== "rejected" && (
            <Pressable
              onPress={() => review(p, "rejected")}
              disabled={busyId === p.id}
              style={({ pressed }) => [styles.reject, big && styles.btnBig, dir.row, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={big ? 19 : 16} color={C.dark} />
              <Text style={[styles.rejectText, big && styles.btnTextBig]}>{t("mediaReject")}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => askDelete(p)}
            disabled={busyId === p.id}
            accessibilityLabel={t("mediaDelete")}
            style={({ pressed }) => [styles.del, big && styles.delBig, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={big ? 20 : 17} color={C.danger} />
          </Pressable>
        </View>
      </View>
    );
  }

  const dateText = (iso) =>
    new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  // Cards at least ~210px wide: as many columns as fit at that size, at least 2
  const GAP = 12;
  const columns = Math.max(2, Math.floor((gridWidth + GAP) / (210 + GAP)));
  const cardWidth = gridWidth ? Math.floor((gridWidth - GAP * (columns - 1)) / columns) : 0;

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

          <View style={[styles.grid, dir.row]} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {(posts ?? []).map((p) => {
              const pill = STATUS_PILL[p.status];
              return (
                <View key={p.id} style={[styles.card, { width: cardWidth }]}>
                  <Pressable onPress={() => setViewing(p)} style={({ pressed }) => pressed && styles.pressed}>
                    <Image source={{ uri: imageUrl(p.imageUrl) }} contentFit="cover" style={styles.photo} />
                    {!!pill && (
                      <View style={[styles.badge, { backgroundColor: BADGE_COLOR[p.status] }]}>
                        <Text style={styles.badgeText}>{t(pill.label)}</Text>
                      </View>
                    )}
                    <View style={styles.zoom}>
                      <Ionicons name="expand" size={14} color={C.white} />
                    </View>
                  </Pressable>

                  <View style={styles.cardBody}>
                    {renderWho(p)}

                    {!!p.caption && (
                      <View style={styles.captionBox}>
                        <Text style={[styles.caption, dir.text]} numberOfLines={3}>
                          {p.caption}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.dateRow, dir.row]}>
                      <Ionicons name="time-outline" size={13} color={C.muted} />
                      <Text style={styles.date}>{dateText(p.createdAt)}</Text>
                    </View>

                    {renderActions(p)}
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

      {/* Photo popup: the picture big, with who posted it, the caption and the buttons */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.popBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} />
          {!!viewing && (
            <View style={[styles.pop, { maxHeight: winH * 0.92 }]}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.popPhotoWrap}>
                  <Image
                    source={{ uri: imageUrl(viewing.imageUrl) }}
                    contentFit="contain"
                    style={{ width: "100%", height: Math.min(winH * 0.55, Math.min(winW, 560) * 1.1) }}
                  />
                  {!!STATUS_PILL[viewing.status] && (
                    <View style={[styles.badge, styles.badgeBig, { backgroundColor: BADGE_COLOR[viewing.status] }]}>
                      <Text style={[styles.badgeText, styles.badgeTextBig]}>{t(STATUS_PILL[viewing.status].label)}</Text>
                    </View>
                  )}
                  <Pressable onPress={() => setViewing(null)} hitSlop={10} style={styles.popClose}>
                    <Ionicons name="close" size={22} color={C.white} />
                  </Pressable>
                </View>

                <View style={styles.popBody}>
                  {renderWho(viewing, true)}

                  {!!viewing.caption && (
                    <View style={[styles.captionBox, styles.captionBoxBig]}>
                      <Text style={[styles.caption, styles.captionBig, dir.text]}>{viewing.caption}</Text>
                    </View>
                  )}

                  <View style={[styles.dateRow, dir.row]}>
                    <Ionicons name="time-outline" size={15} color={C.muted} />
                    <Text style={[styles.date, styles.dateBig]}>{dateText(viewing.createdAt)}</Text>
                  </View>

                  {renderActions(viewing, true)}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
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

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    overflow: "hidden",
    shadowColor: "#17201F",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: C.surfaceAlt },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: { color: C.white, fontSize: fs(11.5), fontWeight: "900" },
  cardBody: { padding: 10, gap: 8 },
  who: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStaff: { backgroundColor: C.orange },
  avatarText: { color: C.white, fontSize: fs(13), fontWeight: "900" },
  whoText: { flex: 1, minWidth: 0 },
  name: { color: C.dark, fontSize: fs(13.5), fontWeight: "800" },
  phone: { color: C.muted, fontSize: fs(11.5), fontWeight: "700", writingDirection: "ltr" },
  captionBox: { backgroundColor: C.surfaceAlt, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  caption: { color: C.text, fontSize: fs(12.5), fontWeight: "600" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  date: { color: C.muted, fontSize: fs(11.5), fontWeight: "700" },
  actions: { gap: 6 },
  approve: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.teal,
  },
  approveText: { color: C.white, fontSize: fs(13.5), fontWeight: "800" },
  smallRow: { flexDirection: "row", gap: 6 },
  reject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
  },
  rejectText: { color: C.dark, fontSize: fs(13), fontWeight: "800" },
  del: {
    width: 40,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.lightDanger,
    alignItems: "center",
    justifyContent: "center",
  },

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

  zoom: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBig: { top: 14, left: 14, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTextBig: { fontSize: fs(13.5) },
  avatarBig: { width: 44, height: 44, borderRadius: 22 },
  avatarTextBig: { fontSize: fs(18) },
  nameBig: { fontSize: fs(17) },
  phoneBig: { fontSize: fs(14), marginTop: 1 },
  captionBoxBig: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  captionBig: { fontSize: fs(15), lineHeight: fs(22) },
  dateBig: { fontSize: fs(13) },
  btnBig: { height: 46, borderRadius: 14 },
  btnTextBig: { fontSize: fs(15.5) },
  delBig: { width: 54, height: 46, borderRadius: 14 },

  popBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,18,17,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  pop: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 26,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  popPhotoWrap: { backgroundColor: "#0F1716" },
  popClose: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  popBody: { padding: 16, gap: 12 },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
