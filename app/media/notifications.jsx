import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import Animated, { ZoomIn, useReducedMotion } from "react-native-reanimated";

import BackButton from "@/components/BackButton";
import MediaComments from "@/components/MediaComments";
import MediaViewer from "@/components/MediaViewer";
import { useAuth } from "@/context/AuthContext";
import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { fetchMediaNotifications, fetchMediaPost, markNotificationsSeen } from "@/lib/media-api";

/* =========================================================
   MEDIA NOTIFICATIONS
   What the bell on the Media tab opens. The teal header says
   how many are new; the list sits on one white sheet that rides
   up over it, grouped into Today / This week / Earlier. Each row
   leads with the photo it is about, with what happened stuck on
   its corner. Opening the list marks everything read; tapping a
   row opens the photo, or its comments.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const TEAL_DEEP = "#00433E";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#6B7472";
const CREAM = "#FFF9F4";
const HAIRLINE = "#EFEAE4";

const LOGO = require("../../assets/img/beam_logoo.jpg");

// the sticker on each photo: what happened
const KIND = {
  new_post: { icon: "sparkles", color: TEAL },
  post_approved: { icon: "checkmark", color: TEAL },
  post_like: { icon: "heart", color: ORANGE },
  comment_like: { icon: "heart", color: ORANGE },
  post_comment: { icon: "chatbubble", color: TEAL },
  comment_reply: { icon: "arrow-undo", color: TEAL },
};

const OPENS_COMMENTS = new Set(["post_comment", "comment_reply", "comment_like"]);

const MESSAGE_KEY = {
  post_approved: "notifApproved",
  post_like: "notifPostLike",
  post_comment: "notifPostComment",
  comment_reply: "notifReply",
  comment_like: "notifCommentLike",
};

// "{name} liked your photo" → the name in bold, the text around it regular
function parts(n, t) {
  const key = n.type === "new_post" ? (n.fromRestaurant ? "notifNewPostBeam" : "notifNewPost") : MESSAGE_KEY[n.type];
  if (!key) return { before: "", name: null, rest: "" };
  const name = n.actor || t("notifSomeone");
  const full = t(key, { name });
  const at = key === "notifNewPostBeam" || key === "notifApproved" ? -1 : full.indexOf(name);
  if (at === -1) return { before: "", name: null, rest: full };
  return { before: full.slice(0, at), name, rest: full.slice(at + name.length) };
}

function timeAgo(iso, t) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return t("notifNow");
  if (mins < 60) return t("notifMinutes", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("notifHours", { n: hours });
  return t("notifDays", { n: Math.floor(hours / 24) });
}

// Today / This week / Earlier, keeping the newest-first order inside each
function groupByAge(items, t) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = startOfToday.getTime() - 6 * 86400000;
  const groups = [
    { key: "today", title: t("notifToday"), data: [] },
    { key: "week", title: t("notifThisWeek"), data: [] },
    { key: "earlier", title: t("notifEarlier"), data: [] },
  ];
  for (const n of items) {
    const at = new Date(n.createdAt).getTime();
    groups[at >= startOfToday.getTime() ? 0 : at >= weekAgo ? 1 : 2].data.push(n);
  }
  return groups.filter((g) => g.data.length);
}

export default function MediaNotifications() {
  const { t, dir, lang } = useAppLang();
  const rtl = lang === "ar";
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState(null);
  // how many were new when the list opened (the header keeps saying so after they're marked read)
  const [fresh, setFresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);

  const load = useCallback(() => {
    if (!user) return Promise.resolve(setItems([]));
    return fetchMediaNotifications()
      .then((d) => {
        setItems(d.notifications ?? []);
        setFresh(d.unread ?? 0);
        // the list is open: everything in it counts as read from now on
        if (d.unread) markNotificationsSeen().catch(() => {});
      })
      .catch(() => setItems((list) => list ?? []));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function open(n) {
    if (opening) return;
    setOpening(n.id);
    try {
      const { post } = await fetchMediaPost(n.postId);
      if (OPENS_COMMENTS.has(n.type)) setCommentsFor(post);
      else setViewing(post);
    } catch {
      Alert.alert(t("notifGone"));
    } finally {
      setOpening(null);
    }
  }

  const sections = useMemo(() => groupByAge(items ?? [], t), [items, t]);

  const header = (
    <View style={styles.header}>
      <Animated.View
        entering={reduceMotion ? undefined : ZoomIn.springify().damping(13)}
        style={styles.headerBell}
      >
        <Ionicons name="notifications" size={22} color={WHITE} />
      </Animated.View>
      <Text style={[styles.headerTitle, dir.noSpacing]}>{t("notifTitle")}</Text>
      {items !== null && (
        <View style={[styles.statusPill, fresh ? styles.statusPillNew : null]}>
          {fresh ? <View style={styles.statusDot} /> : <Ionicons name="checkmark-done" size={14} color={WHITE} />}
          <Text style={styles.statusText}>{fresh ? t("notifNewCount", { n: fresh }) : t("notifCaughtUp")}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <BackButton />

      <SectionList
        sections={sections}
        keyExtractor={(n) => String(n.id)}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            {header}
            {/* the white sheet's rounded top, riding up over the teal */}
            <View style={styles.sheetTop} />
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, dir.text]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Row
            n={item}
            t={t}
            dir={dir}
            rtl={rtl}
            last={index === section.data.length - 1}
            busy={opening === item.id}
            onPress={() => open(item)}
          />
        )}
        ListEmptyComponent={
          items === null ? (
            <ActivityIndicator color={TEAL} style={styles.loading} />
          ) : (
            <Empty t={t} signedIn={!!user} />
          )
        }
        ListFooterComponent={<View style={styles.sheetFill} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={WHITE} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={styles.list}
      />

      <MediaViewer post={viewing} onClose={() => setViewing(null)} />
      <MediaComments post={commentsFor} onClose={() => setCommentsFor(null)} />
    </View>
  );
}

function Row({ n, t, dir, rtl, last, busy, onPress }) {
  const kind = KIND[n.type] ?? KIND.new_post;
  const text = parts(n, t);
  const fromBeam = n.type === "new_post" && n.fromRestaurant;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {/* unread: an orange edge on the photo side */}
      {n.unread && <View style={styles.unreadEdge} />}

      <View style={[styles.rowInner, dir.row, !last && styles.rowDivider]}>
        <View style={styles.thumbWrap}>
          {busy ? (
            <View style={[styles.thumb, styles.thumbBusy]}>
              <ActivityIndicator color={TEAL} />
            </View>
          ) : (
            <Image
              source={fromBeam && !n.imageUrl ? LOGO : { uri: imageUrl(n.imageUrl) }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
              style={styles.thumb}
            />
          )}
          <View style={[styles.sticker, { backgroundColor: kind.color }]}>
            <Ionicons name={kind.icon} size={11} color={WHITE} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.message, dir.text, !n.unread && styles.messageRead]} numberOfLines={2}>
            {text.before}
            {!!text.name && <Text style={styles.actor}>{text.name}</Text>}
            {text.rest}
          </Text>

          {!!n.preview && OPENS_COMMENTS.has(n.type) && (
            <View style={[styles.bubble, rtl && styles.bubbleRtl]}>
              <Text style={[styles.bubbleText, dir.text]} numberOfLines={2}>
                {n.preview}
              </Text>
            </View>
          )}

          <Text style={[styles.time, dir.text, n.unread && styles.timeNew]}>{timeAgo(n.createdAt, t)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Empty({ t, signedIn }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyRing}>
        <View style={styles.emptyCore}>
          <Ionicons name="notifications-outline" size={30} color={TEAL} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{signedIn ? t("notifEmpty") : t("notifSignIn")}</Text>
      {signedIn && (
        <>
          <Text style={styles.emptySub}>{t("notifEmptySub")}</Text>
          <Pressable
            onPress={() => router.push("/media/share")}
            style={({ pressed }) => [styles.emptyCta, pressed && styles.rowPressed]}
          >
            <Ionicons name="camera" size={16} color={WHITE} />
            <Text style={styles.emptyCtaText}>{t("notifShareCta")}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const SHEET_RADIUS = 30;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: TEAL,
  },
  list: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: TEAL,
  },

  /* ---------- header ---------- */
  header: {
    paddingTop: 100,
    paddingBottom: 46,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: TEAL,
  },
  headerBell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: TEAL_DEEP,
  },
  statusPillNew: {
    backgroundColor: "rgba(252,74,20,0.95)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: WHITE,
  },
  statusText: {
    color: WHITE,
    fontSize: 12.5,
    fontWeight: "800",
  },

  /* ---------- the white sheet ---------- */
  sheetTop: {
    height: SHEET_RADIUS,
    marginTop: -SHEET_RADIUS,
    backgroundColor: CREAM,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
  },
  sheetFill: {
    flexGrow: 1,
    minHeight: 140,
    backgroundColor: CREAM,
  },
  sectionHead: {
    backgroundColor: CREAM,
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },

  /* ---------- a row ---------- */
  row: {
    backgroundColor: CREAM,
    // web: no focus ring after a tap
    outlineStyle: "none",
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowInner: {
    alignItems: "flex-start",
    gap: 14,
    marginHorizontal: 22,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  unreadEdge: {
    position: "absolute",
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: ORANGE,
  },
  thumbWrap: {
    width: 56,
    height: 56,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EDE6DE",
  },
  thumbBusy: {
    alignItems: "center",
    justifyContent: "center",
  },
  // what happened, stuck on the photo's corner
  sticker: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: CREAM,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingTop: 2,
  },
  message: {
    color: DARK,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  messageRead: {
    color: "#3D4644",
  },
  actor: {
    fontWeight: "900",
    color: DARK,
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginTop: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  bubbleRtl: {
    alignSelf: "flex-end",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    color: "#3D4644",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  time: {
    color: "#9AA3A1",
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 6,
  },
  timeNew: {
    color: ORANGE,
  },

  /* ---------- states ---------- */
  loading: {
    paddingVertical: 60,
    backgroundColor: CREAM,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: CREAM,
  },
  emptyRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(0,87,81,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  emptyTitle: {
    color: DARK,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySub: {
    color: MUTED,
    fontSize: 13.5,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 280,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 23,
    backgroundColor: TEAL,
  },
  emptyCtaText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "800",
  },
});
