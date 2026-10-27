import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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

import { timeAgo } from "@/components/MediaPostCard";
import { useAuth } from "@/context/AuthContext";
import { useAppLang } from "@/lib/app-lang";
import { Text, TextInput } from "@/lib/arabic-font";
import {
  deleteMediaComment,
  fetchMediaComments,
  postMediaComment,
  toggleCommentLike,
} from "@/lib/media-api";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const BORDER = "#EEEAE5";

// A comment reads in its own language's direction, whatever language the app is in,
// so an Arabic comment (and its @mention) never comes out scrambled in English.
const ARABIC = /[\u0600-\u06FF]/;
// Unicode isolate marks around the @mention
const FSI = "\u2068";
const PDI = "\u2069";
// The server sends a reply's @mention as `replyTo`. Older replies carried it inside the
// text instead — "@Name" + MENTION_END + body — so those still show their mention.
// The zero-width space marks where the name ends (names can have spaces in them).
const MENTION_END = "​";
function splitMention(c) {
  const body = c.body ?? "";
  if (body.startsWith("@")) {
    const end = body.indexOf(MENTION_END);
    if (end > 1) {
      return {
        mention: c.replyTo || body.slice(1, end),
        text: body.slice(end + 1).trimStart(),
      };
    }
  }
  return { mention: c.replyTo || null, text: body };
}
const textDir = (body) =>
  ARABIC.test(body ?? "")
    ? { textAlign: "right", writingDirection: "rtl" }
    : { textAlign: "left", writingDirection: "ltr" };

// Applies `fn` to the comment with this id, wherever it sits (top level or a reply).
function mapComment(list, id, fn) {
  return list.map((c) =>
    c.id === id
      ? fn(c)
      : {
          ...c,
          replies: (c.replies ?? []).map((r) => (r.id === id ? fn(r) : r)),
        },
  );
}

export default function MediaComments({ post, onClose, onCountChange }) {
  const { t, dir, lang } = useAppLang();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);

  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // the comment being answered: { id, parentId, author }
  const [replyTo, setReplyTo] = useState(null);
  // top-level comments whose replies are unfolded
  const [open, setOpen] = useState({});
  const likeBusy = useRef(new Set());

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
    setReplyTo(null);
    setOpen({});
    onClose?.();
  }

  function startReply(c) {
    setReplyTo({
      id: c.id,
      parentId: c.parentId ?? c.id,
      author: c.author || "—",
    });
    inputRef.current?.focus();
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { comment, commentCount } = await postMediaComment(
        postId,
        body,
        replyTo?.id,
      );
      setComments((list) => {
        const current = list ?? [];
        if (!comment.parentId) return [...current, { ...comment, replies: [] }];
        return current.map((c) =>
          c.id === comment.parentId
            ? { ...c, replies: [...(c.replies ?? []), comment] }
            : c,
        );
      });
      // a new reply opens its thread so it can be seen
      if (comment.parentId)
        setOpen((o) => ({ ...o, [comment.parentId]: true }));
      setText("");
      setReplyTo(null);
      if (commentCount != null) onCountChange?.(postId, commentCount);
    } catch {
      // keep the text so nothing typed is lost
    } finally {
      setSending(false);
    }
  }

  async function like(c) {
    if (likeBusy.current.has(c.id)) return;
    likeBusy.current.add(c.id);
    // flip it now, settle on what the server says
    const flip = (x) => ({
      ...x,
      liked: !x.liked,
      likeCount: Math.max((x.likeCount ?? 0) + (x.liked ? -1 : 1), 0),
    });
    setComments((list) => mapComment(list ?? [], c.id, flip));
    try {
      const res = await toggleCommentLike(postId, c.id);
      setComments((list) =>
        mapComment(list ?? [], c.id, (x) => ({
          ...x,
          liked: res.liked,
          likeCount: res.likeCount,
        })),
      );
    } catch {
      setComments((list) => mapComment(list ?? [], c.id, flip));
    } finally {
      likeBusy.current.delete(c.id);
    }
  }

  async function remove(c) {
    if (c.userId !== user?.id) return;
    try {
      const { commentCount } = await deleteMediaComment(postId, c.id);
      setComments((list) =>
        (list ?? [])
          .filter((x) => x.id !== c.id)
          .map((x) => ({
            ...x,
            replies: (x.replies ?? []).filter((r) => r.id !== c.id),
          })),
      );
      if (replyTo && (replyTo.id === c.id || replyTo.parentId === c.id))
        setReplyTo(null);
      if (commentCount != null) onCountChange?.(postId, commentCount);
    } catch {
      // nothing to undo
    }
  }

  function renderComment(c, { reply = false, index = 0 } = {}) {
    const { mention, text: commentText } = splitMention(c);
    return (
      <Pressable
        key={c.id}
        onLongPress={() => remove(c)}
        style={[styles.comment, dir.row, reply && styles.reply]}
      >
        <View
          style={[
            styles.avatar,
            reply && styles.avatarSmall,
            { backgroundColor: index % 2 === 0 ? TEAL : ORANGE },
          ]}
        >
          <Text style={[styles.avatarText, reply && styles.avatarTextSmall]}>
            {(c.author || "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>

        <View style={styles.flex}>
          <View style={styles.commentBody}>
            <View style={[styles.commentHead, dir.row]}>
              <Text style={styles.commentAuthor}>{c.author || "—"}</Text>
              <Text style={styles.commentTime}>
                {timeAgo(c.createdAt, lang)}
              </Text>
            </View>
            <Text style={[styles.commentText, textDir(commentText)]}>
              {/* isolated, so the "@" always stays stuck to the name */}
              {!!mention && (
                <Text style={styles.mention}>{`${FSI}@${mention}${PDI} `}</Text>
              )}
              {commentText}
            </Text>
          </View>

          {/* reply + like, under the bubble */}
          <View style={[styles.actions, dir.row]}>
            <Pressable onPress={() => startReply(c)} hitSlop={8}>
              <Text style={styles.actionText}>{t("mediaReply")}</Text>
            </Pressable>
            <Pressable
              onPress={() => like(c)}
              hitSlop={8}
              style={[styles.likeBtn, dir.row]}
              accessibilityRole="button"
              accessibilityLabel={t("mediaLikeComment")}
              accessibilityState={{ selected: !!c.liked }}
            >
              <Ionicons
                name={c.liked ? "heart" : "heart-outline"}
                size={16}
                color={c.liked ? ORANGE : MUTED}
              />
              {(c.likeCount ?? 0) > 0 && (
                <Text style={[styles.likeCount, c.liked && { color: ORANGE }]}>
                  {c.likeCount}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Modal
      visible={!!post}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
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
                  <Ionicons
                    name="chatbubbles-outline"
                    size={38}
                    color="#B9C9C6"
                  />
                  <Text style={styles.emptyText}>{t("mediaNoComments")}</Text>
                </View>
              }
              renderItem={({ item: c, index }) => {
                const replies = c.replies ?? [];
                const unfolded = !!open[c.id];
                return (
                  <View>
                    {renderComment(c, { index })}

                    {replies.length > 0 && (
                      <Pressable
                        onPress={() =>
                          setOpen((o) => ({ ...o, [c.id]: !unfolded }))
                        }
                        hitSlop={6}
                        style={[styles.toggle, dir.row]}
                      >
                        <View style={styles.toggleLine} />
                        <Text style={styles.toggleText}>
                          {unfolded
                            ? t("mediaHideReplies")
                            : t("mediaViewReplies", { count: replies.length })}
                        </Text>
                      </Pressable>
                    )}

                    {unfolded &&
                      replies.map((r, i) =>
                        renderComment(r, { reply: true, index: index + i + 1 }),
                      )}
                  </View>
                );
              }}
            />
          )}

          {/* ---------- replying to … ---------- */}
          {!!replyTo && (
            <View style={[styles.replyBar, dir.row]}>
              <Text style={[styles.replyBarText, dir.text]} numberOfLines={1}>
                {t("mediaReplyingTo", { name: replyTo.author })}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={MUTED} />
              </Pressable>
            </View>
          )}

          {/* ---------- write a comment ---------- */}
          <View style={[styles.inputRow, dir.row]}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? t("mediaAddReply") : t("mediaAddComment")}
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

  // replies sit indented under their comment
  reply: {
    marginLeft: 42,
    marginTop: 10,
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },

  avatarText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },

  avatarTextSmall: {
    fontSize: 11,
  },

  commentBody: {
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

  mention: {
    color: TEAL,
    fontWeight: "900",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 12,
    paddingTop: 5,
  },

  actionText: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: "900",
  },

  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  likeCount: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 42,
    marginTop: 8,
  },

  toggleLine: {
    width: 22,
    height: 1.5,
    backgroundColor: "#C9C4BF",
  },

  toggleText: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: "800",
  },

  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E8F5F2",
  },

  replyBarText: {
    flex: 1,
    color: TEAL,
    fontSize: 13,
    fontWeight: "800",
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
