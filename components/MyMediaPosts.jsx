import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { archiveMyMedia, deleteMyMedia, fetchMyMedia } from "@/lib/media-api";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   MY PHOTOS (under the Share form)
   Every photo the signed-in customer shared, newest first, with
   its state (waiting / live / not approved / archived) and like +
   comment counts. Tapping one opens it big with two actions:
   archive (hide it from everyone else, reversible) and delete.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const BORDER = "#EEEAE5";
const DANGER = "#D64545";
const GRAY = "#7B8584";

const GAP = 8;

function stateOf(p) {
  if (p.archived) return { key: "mediaArchived", color: GRAY, icon: "archive" };
  if (p.status === "pending") return { key: "mediaPending", color: ORANGE, icon: "time" };
  if (p.status === "rejected") return { key: "mediaRejected", color: DANGER, icon: "close-circle" };
  return { key: "mediaLive", color: TEAL, icon: "checkmark-circle" };
}

export default function MyMediaPosts() {
  const { user } = useAuth();
  const { t, dir } = useAppLang();
  const { height: winH } = useWindowDimensions();

  const [posts, setPosts] = useState(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchMyMedia()
        .then((d) => setPosts(d.posts ?? []))
        .catch(() => setPosts((p) => p ?? []));
    }, [user]),
  );

  if (!user) return null;

  function close() {
    setOpen(null);
    setConfirmDelete(false);
  }

  async function toggleArchive() {
    if (!open || busy) return;
    setBusy(true);
    try {
      const archived = !open.archived;
      await archiveMyMedia(open.id, archived);
      setPosts((list) => list.map((p) => (p.id === open.id ? { ...p, archived } : p)));
      setOpen((p) => ({ ...p, archived }));
    } catch {
      // nothing changed on the server — leave it as it was
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!open || busy) return;
    setBusy(true);
    try {
      await deleteMyMedia(open.id);
      setPosts((list) => list.filter((p) => p.id !== open.id));
      close();
    } catch {
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  const cols = 3;
  const thumb = rowWidth ? Math.floor((rowWidth - GAP * (cols - 1)) / cols) : 0;
  const openState = open ? stateOf(open) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.title, dir.text]}>{t("mediaMine")}</Text>
        {!!posts?.length && <Text style={[styles.sub, dir.text]}>{t("mediaMineSub")}</Text>}
      </View>

      {posts === null ? (
        <ActivityIndicator color={TEAL} style={{ marginVertical: 20 }} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={30} color={MUTED} />
          <Text style={styles.emptyText}>{t("mediaMineEmpty")}</Text>
        </View>
      ) : (
        <View style={styles.grid} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
          {posts.map((p) => {
            const st = stateOf(p);
            return (
              <Pressable
                key={p.id}
                onPress={() => setOpen(p)}
                style={({ pressed }) => [{ width: thumb, height: thumb }, styles.thumbWrap, pressed && styles.pressed]}
              >
                <Image
                  source={{ uri: imageUrl(p.imageUrl) }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  style={[StyleSheet.absoluteFill, p.archived && styles.faded]}
                />
                <View style={[styles.badge, { backgroundColor: st.color }]}>
                  <Ionicons name={st.icon} size={11} color={WHITE} />
                </View>
                {p.status === "approved" && !p.archived && (p.likeCount ?? 0) > 0 && (
                  <View style={styles.likes}>
                    <Ionicons name="heart" size={11} color={WHITE} />
                    <Text style={styles.likesText}>{p.likeCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ---------- one photo, big, with archive + delete ---------- */}
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          {!!open && (
            <View style={styles.sheet}>
              <View>
                <Image
                  source={{ uri: imageUrl(open.imageUrl) }}
                  contentFit="cover"
                  style={[styles.bigPhoto, { maxHeight: winH * 0.5 }]}
                />
                <View style={[styles.bigBadge, { backgroundColor: openState.color }]}>
                  <Ionicons name={openState.icon} size={13} color={WHITE} />
                  <Text style={styles.bigBadgeText}>{t(openState.key)}</Text>
                </View>
                <Pressable onPress={close} hitSlop={10} style={styles.close}>
                  <Ionicons name="close" size={20} color={WHITE} />
                </Pressable>
              </View>

              <View style={styles.sheetBody}>
                {!!open.caption && <Text style={[styles.caption, dir.text]}>{open.caption}</Text>}

                {open.status === "approved" && (
                  <View style={styles.counts}>
                    <View style={styles.count}>
                      <Ionicons name="heart" size={16} color="#E8384F" />
                      <Text style={styles.countText}>{open.likeCount ?? 0}</Text>
                    </View>
                    <View style={styles.count}>
                      <Ionicons name="chatbubble" size={15} color={TEAL} />
                      <Text style={styles.countText}>{open.commentCount ?? 0}</Text>
                    </View>
                  </View>
                )}

                {confirmDelete ? (
                  <>
                    <Text style={styles.confirm}>{t("mediaDeleteConfirm")}</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={() => setConfirmDelete(false)}
                        disabled={busy}
                        style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
                      >
                        <Text style={styles.btnGhostText}>{t("cancel")}</Text>
                      </Pressable>
                      <Pressable
                        onPress={remove}
                        disabled={busy}
                        style={({ pressed }) => [styles.btn, { backgroundColor: DANGER }, pressed && styles.pressed]}
                      >
                        {busy ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnText}>{t("mediaDeleteYes")}</Text>}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.hint}>{t("mediaArchiveHint")}</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={toggleArchive}
                        disabled={busy}
                        style={({ pressed }) => [styles.btn, { backgroundColor: TEAL }, pressed && styles.pressed]}
                      >
                        {busy ? (
                          <ActivityIndicator color={WHITE} />
                        ) : (
                          <>
                            <Ionicons name={open.archived ? "eye" : "archive"} size={17} color={WHITE} />
                            <Text style={styles.btnText}>{open.archived ? t("mediaUnarchive") : t("mediaArchive")}</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirmDelete(true)}
                        disabled={busy}
                        style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]}
                      >
                        <Ionicons name="trash-outline" size={17} color={DANGER} />
                        <Text style={styles.btnDangerText}>{t("mediaDelete")}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    marginTop: 30,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  head: { marginBottom: 12 },
  title: { color: DARK, fontSize: 19, fontWeight: "900" },
  sub: { color: MUTED, fontSize: 12.5, fontWeight: "600", marginTop: 2 },

  empty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BORDER,
  },
  emptyText: { color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  thumbWrap: { borderRadius: 14, overflow: "hidden", backgroundColor: "#E9E4DF" },
  faded: { opacity: 0.4 },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  likes: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  likesText: { color: WHITE, fontSize: 11, fontWeight: "800" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,18,17,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  sheet: { width: "100%", maxWidth: 420, borderRadius: 26, overflow: "hidden", backgroundColor: WHITE },
  bigPhoto: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#0F1716" },
  bigBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bigBadgeText: { color: WHITE, fontSize: 12.5, fontWeight: "900" },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { padding: 16, gap: 12 },
  caption: { color: DARK, fontSize: 14.5, fontWeight: "600", lineHeight: 21 },
  counts: { flexDirection: "row", gap: 16 },
  count: { flexDirection: "row", alignItems: "center", gap: 5 },
  countText: { color: DARK, fontSize: 14, fontWeight: "800" },
  hint: { color: MUTED, fontSize: 12.5, fontWeight: "600", lineHeight: 18 },
  confirm: { color: DARK, fontSize: 15, fontWeight: "800", textAlign: "center" },
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnText: { color: WHITE, fontSize: 15, fontWeight: "800" },
  btnGhost: { backgroundColor: "#F1EEEA" },
  btnGhostText: { color: DARK, fontSize: 15, fontWeight: "800" },
  btnDanger: { backgroundColor: "#FDECEC" },
  btnDangerText: { color: DANGER, fontSize: 15, fontWeight: "800" },

  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
