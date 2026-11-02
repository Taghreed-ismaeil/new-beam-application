import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import MadeBy from "@/components/MadeBy";
import BackButton from "@/components/BackButton";
import MediaComments from "@/components/MediaComments";
import MediaPostCard from "@/components/MediaPostCard";
import MediaViewer from "@/components/MediaViewer";
import { useAppLang } from "@/lib/app-lang";
import { fetchMediaPage } from "@/lib/media-api";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   RESTAURANT GALLERY
   Photos the restaurant posts from the admin panel, one under
   another in the same cards as the Media tab's feed — likes and
   comments included. Tap a photo to see it full screen.
========================================================= */

const ORANGE = "#FC4A14";
const SOFT_ORANGE = "#FC6E43";
const WHITE = "#FFFFFF";
const MUTED = "#68706E";
const CREAM = "#FFF9F4";

export default function RestaurantGallery() {
  const { t, dir } = useAppLang();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);
  const loadingRef = useRef(false);

  const loadFirst = useCallback(async () => {
    const d = await fetchMediaPage("restaurant", null).catch(() => null);
    if (!d) return setPosts((p) => p ?? []);
    setPosts(d.posts ?? []);
    setCursor(d.nextCursor ?? null);
  }, []);

  // re-read on focus so new photos and fresh like counts show up
  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const d = await fetchMediaPage("restaurant", cursor);
      setPosts((list) => {
        const seen = new Set((list ?? []).map((p) => p.id));
        return [...(list ?? []), ...(d.posts ?? []).filter((p) => !seen.has(p.id))];
      });
      setCursor(d.nextCursor ?? null);
    } catch {
      // keep what we have; scrolling again retries
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }

  // a like or a new comment count from a card / the comments sheet
  const updatePost = useCallback((next) => {
    setPosts((list) => (list ?? []).map((p) => (p.id === next.id ? { ...p, ...next } : p)));
  }, []);

  const onCommentCount = useCallback((postId, commentCount) => {
    setPosts((list) => (list ?? []).map((p) => (p.id === postId ? { ...p, commentCount } : p)));
  }, []);

  // same width as the Media tab's feed
  const cardWidth = Math.min(width - 32, 560);

  return (
    <View style={styles.screen}>
      <BackButton />

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => String(p.id)}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ORANGE} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, dir.noSpacing]}>{t("mediaRestaurantTitle")}</Text>
              <Text style={styles.subtitle}>{t("mediaRestaurantSub")}</Text>
            </View>
            <LinearGradient
              pointerEvents="none"
              colors={[SOFT_ORANGE, "rgba(252,110,67,0.4)", "rgba(252,110,67,0)"]}
              style={styles.headerFade}
            />
          </>
        }
        renderItem={({ item }) => (
          <MediaPostCard
            post={item}
            width={cardWidth}
            onOpen={setViewing}
            onComments={setCommentsFor}
            onChange={updatePost}
          />
        )}
        ListEmptyComponent={
          posts === null ? (
            <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={42} color={SOFT_ORANGE} />
              <Text style={styles.emptyText}>{t("mediaEmptyRestaurant")}</Text>
            </View>
          )
        }
        ListFooterComponentStyle={{ marginTop: "auto" }}
        ListFooterComponent={
          <>
            {loadingMore ? <ActivityIndicator color={ORANGE} style={{ margin: 20 }} /> : null}
            {posts !== null && <MadeBy />}
          </>
        }
      />

      <MediaViewer post={viewing} onClose={() => setViewing(null)} />
      <MediaComments
        post={commentsFor}
        onClose={() => setCommentsFor(null)}
        onCountChange={onCommentCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  content: {
    flexGrow: 1,
    paddingBottom: 120,
  },

  header: {
    backgroundColor: SOFT_ORANGE,
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

  // the cards start a little after the fade, like the Media tab
  headerFade: {
    height: 56,
    marginTop: -1,
    marginBottom: 6,
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
});
