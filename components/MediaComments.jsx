import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppLang } from "@/lib/app-lang";
import { deleteMediaComment, fetchMediaComments, postMediaComment } from "@/lib/media-api";
import { timeAgo } from "@/components/MediaPostCard";
import { Text, TextInput } from "@/lib/arabic-font";

/* =========================================================
   MEDIA COMMENTS (bottom sheet)
   Opens over the feed for one post: its comments oldest first,
   and a box at the bottom to write one. The signed-in customer
   can delete their own comments (long press). `onCountChange`
   tells the feed the new comment count.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const BORDER = "#EEEAE5";

export default function MediaComments({ post, onClose, onCountChange }) {
  const { t, dir, lang } = useAppLang();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const postId = post?.id;

  useEffect(() => {
    if (!postId) return;
    fetchMediaComments(postId)
      .then((d) => setComments(d.comments ?? []))
      .catch(() => setComments([]));
  }, [postId]);

  // reset on close, so the next post opens on a clean sheet
  function close() {
    setComments(null);
    setText("");
    onClose?.();
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { comment } = await postMediaComment(postId, body);
      const next = [...(comments ?? []), comment];
      setComments(next);
      setText("");
      onCountChange?.(postId, next.length);
    } catch {
      // keep the text so nothing typed is lost
    } finally {
      setSending(false);
    }
  }

  async function remove(c) {
    if (c.userId !== user?.id) return;
    try {
      await deleteMediaComment(postId, c.id);
      const next = (comments ?? []).filter((x) => x.id !== c.id);
      setComments(next);
      onCountChange?.(postId, next.length);
    } catch {
      // nothing to undo
    }
  }

  return (
    <Modal visible={!!post} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={close} />

        <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.handle} />

          <View style={[styles.titleRow, dir.row]}>
            <Text style={[styles.title, dir.text]}>{t("mediaComments")}</Text>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={24} color={DARK} />
            </Pressable>
          </View>

          {comments === null ? (
            <ActivityIndicator color={TEAL} style={styles.loading} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => String(c.id)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="chatbubbles-outline" size={38} color="#B9C9C6" />
                  <Text style={styles.emptyText}>{t("mediaNoComments")}</Text>
                </View>
              }
              renderItem={({ item: c, index }) => (
                <Pressable onLongPress={() => remove(c)} style={[styles.comment, dir.row]}>
                  <View style={[styles.avatar, { backgroundColor: index % 2 === 0 ? TEAL : ORANGE }]}>
                    <Text style={styles.avatarText}>{(c.author || "?").slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={[styles.commentHead, dir.row]}>
                      <Text style={styles.commentAuthor}>{c.author || "—"}</Text>
                      <Text style={styles.commentTime}>{timeAgo(c.createdAt, lang)}</Text>
                    </View>
                    <Text style={[styles.commentText, dir.text]}>{c.body}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}

          {/* ---------- write a comment ---------- */}
          <View style={[styles.inputRow, dir.row]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("mediaAddComment")}
              placeholderTextColor="#A4A4A4"
              maxLength={300}
              multiline
              style={[styles.input, dir.text]}
            />
            <Pressable
              onPress={send}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [
                styles.send,
                (!text.trim() || sending) && styles.sendOff,
                pressed && styles.pressed,
              ]}
            >
              {sending ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={WHITE} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,16,15,0.45)",
  },

  sheet: {
    maxHeight: "75%",
    minHeight: "45%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },

  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D9D4CF",
    marginBottom: 8,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  title: {
    color: DARK,
    fontSize: 18,
    fontWeight: "900",
  },

  loading: {
    marginVertical: 40,
  },

  list: {
    flexGrow: 0,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },

  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 34,
  },

  emptyText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },

  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },

  commentBody: {
    flex: 1,
    backgroundColor: "#F6F3EF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  commentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  commentAuthor: {
    color: DARK,
    fontSize: 13,
    fontWeight: "900",
  },

  commentTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  commentText: {
    color: DARK,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    backgroundColor: "#F6F3EF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: DARK,
  },

  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  sendOff: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
