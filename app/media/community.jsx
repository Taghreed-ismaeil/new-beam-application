import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/BackButton";
import MediaViewer from "@/components/MediaViewer";
import { useAuth } from "@/context/AuthContext";
import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { fetchMediaPage, fetchMyMedia } from "@/lib/media-api";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   COMMUNITY FEED ("شاركنا صورك")
   Instagram-style feed of photos customers shared (approved by
   staff). A floating button opens the share screen; "My photos"
   along the top shows the user's own shares with their status.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const SOFT_TEAL = "#337974";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const CREAM = "#FFF9F4";
const BORDER = "#EEEAE5";

/** "5m", "3h", "2d" — or a date for anything older than a week. */
function timeAgo(iso, lang) {
  const s = Math.max((Date.now() - new Date(iso).getTime()) / 1000, 0);
  const ar = lang === "ar";
  if (s < 60) return ar ? "هلأ" : "now";
  if (s < 3600) return `${Math.floor(s / 60)}${ar ? " د" : "m"}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${ar ? " س" : "h"}`;
  if (s < 604800) return `${Math.floor(s / 86400)}${ar ? " ي" : "d"}`;
  return new Date(iso).toLocaleDateString();
}

export default function CommunityFeed() {
  const { t, dir, lang } = useAppLang();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [mine, setMine] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null);

  const loadFirst = useCallback(async () => {
    const [feed, my] = await Promise.all([
      fetchMediaPage("customer").catch(() => null),
      user ? fetchMyMedia().catch(() => null) : null,
    ]);
    if (feed) {
      setPosts(feed.posts);
      setCursor(feed.nextCursor);
    } else setPosts((p) => p ?? []);
    // Only the ones still waiting / turned down — approved ones are in the feed already
    setMine((my?.posts ?? []).filter((p) => p.status !== "approved"));
  }, [user]);

  // Reload on focus, so a photo just shared appears in "My photos"
  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const d = await fetchMediaPage("customer", cursor).catch(() => null);
    if (d) {
      setPosts((prev) => [...(prev ?? []), ...d.posts]);
      setCursor(d.nextCursor);
    }
    setLoadingMore(false);
  }

  async function refresh() {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }

  const photoWidth = width - 32;

  const header = (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, dir.noSpacing]}>{t("mediaCommunityTitle")}</Text>
        <Text style={styles.subtitle}>{t("mediaCommunitySub")}</Text>
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={[SOFT_TEAL, "rgba(51,121,116,0.4)", "rgba(51,121,116,0)"]}
        style={styles.headerFade}
      />

      {mine.length > 0 && (
        <View style={styles.mine}>
          <Text style={[styles.mineTitle, dir.text]}>{t("mediaMine")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.mineRow, dir.row]}>
            {mine.map((p) => (
              <View key={p.id} style={styles.mineItem}>
                <Image source={{ uri: imageUrl(p.imageUrl) }} contentFit="cover" style={styles.mineThumb} />
                <View style={[styles.badge, p.status === "rejected" ? styles.badgeRejected : styles.badgePending]}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {p.status === "rejected" ? t("mediaRejected") : t("mediaPending")}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.screen}>
      <BackButton />

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => String(p.id)}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={TEAL} />}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          posts === null ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={SOFT_TEAL} />
              <Text style={styles.emptyText}>{t("mediaEmptyCommunity")}</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={TEAL} style={{ margin: 20 }} /> : null}
        renderItem={({ item: p, index }) => {
          const accent = index % 2 === 0 ? ORANGE : TEAL;
          return (
            <View style={styles.post}>
              <View style={[styles.postHead, dir.row]}>
                <View style={[styles.avatar, { backgroundColor: accent }]}>
                  <Text style={styles.avatarText}>{(p.author || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <Text style={[styles.author, dir.text]} numberOfLines={1}>
                  {p.author || "Beam"}
                </Text>
                <Text style={styles.time}>{timeAgo(p.createdAt, lang)}</Text>
              </View>

              <Pressable onPress={() => setOpen(p)}>
                <Image
                  source={{ uri: imageUrl(p.imageUrl) }}
                  cachePolicy="memory-disk"
                  transition={150}
                  contentFit="cover"
                  style={[styles.photo, { width: photoWidth, height: photoWidth * 1.25 }]}
                />
              </Pressable>

              {!!p.caption && <Text style={[styles.caption, dir.text]}>{p.caption}</Text>}
            </View>
          );
        }}
      />

      {/* Share button */}
      <Pressable
        onPress={() => router.push("/media/share")}
        style={({ pressed }) => [styles.fab, dir.row, { bottom: 96 + insets.bottom }, pressed && styles.pressed]}
      >
        <Ionicons name="camera" size={20} color={WHITE} />
        <Text style={[styles.fabText, dir.noSpacing]}>{t("mediaShare")}</Text>
      </Pressable>

      <MediaViewer post={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  header: {
    backgroundColor: SOFT_TEAL,
    paddingTop: 100,
    paddingBottom: 14,
    alignItems: "center",
  },

  title: {
    color: WHITE,
    fontSize: 32,
    fontWeight: "900",
  },

  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  headerFade: {
    height: 56,
    marginTop: -1,
    marginBottom: -30,
  },

  /* ================= MY PHOTOS ================= */

  mine: {
    marginBottom: 14,
  },

  mineTitle: {
    color: DARK,
    fontSize: 16,
    fontWeight: "900",
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  mineRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },

  mineItem: {
    width: 92,
  },

  mineThumb: {
    width: 92,
    height: 115,
    borderRadius: 16,
    backgroundColor: "#E9E4DF",
  },

  badge: {
    marginTop: -14,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 92,
  },

  badgePending: {
    backgroundColor: "#F2A93B",
  },

  badgeRejected: {
    backgroundColor: "#B4423A",
  },

  badgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "900",
  },

  /* ================= POST ================= */

  post: {
    marginHorizontal: 16,
    marginBottom: 22,
    backgroundColor: WHITE,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  postHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  author: {
    flex: 1,
    color: DARK,
    fontSize: 15,
    fontWeight: "900",
  },

  time: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },

  photo: {
    backgroundColor: "#E9E4DF",
  },

  caption: {
    color: DARK,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  empty: {
    alignItems: "center",
    marginTop: 50,
    gap: 10,
  },

  emptyText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ================= SHARE BUTTON ================= */

  fab: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: "#7A2A10",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },

  fabText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
