import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import MadeBy from "@/components/MadeBy";
import MediaComments from "@/components/MediaComments";
import MediaPostCard from "@/components/MediaPostCard";
import MediaViewer from "@/components/MediaViewer";
import { useAppLang } from "@/lib/app-lang";
import { fetchMediaPage } from "@/lib/media-api";
import { enterDown, enterFromLeft, enterFromRight } from "@/lib/motion";
import { Text, AnimatedText } from "@/lib/arabic-font";

/* =========================================================
   MEDIA (tab)
   Top: two small boxes — "Share Your Photos" (left, customers
   post their own) and "Beam Gallery" (right, the restaurant's
   photos). Below: one Instagram-style feed mixing the
   restaurant's and customers' approved photos, newest first,
   with likes and comments.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const CREAM = "#FFF9F4";

const GALLERY_COVER = require("../../assets/img/about/beam-res-about.jpg");
const COMMUNITY_COVER = require("../../assets/img/hero-bg.jpg");
const LOGO = require("../../assets/img/remove_beam_logoo.jpg");

export default function MediaHub() {
  const { t, dir } = useAppLang();
  const { width } = useWindowDimensions();

  const [posts, setPosts] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);
  const loadingRef = useRef(false);

  const loadFirst = useCallback(() => {
    return fetchMediaPage("all")
      .then((d) => {
        setPosts(d.posts ?? []);
        setCursor(d.nextCursor ?? null);
      })
      .catch(() => setPosts((p) => p ?? []));
  }, []);

  // Re-read on focus so newly approved photos (and fresh like counts) show up
  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst]),
  );

  async function refresh() {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }

  async function loadMore() {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const d = await fetchMediaPage("all", cursor);
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

  const updatePost = useCallback((next) => {
    setPosts((list) => (list ?? []).map((p) => (p.id === next.id ? { ...p, ...next } : p)));
  }, []);

  const onCommentCount = useCallback((postId, commentCount) => {
    setPosts((list) => (list ?? []).map((p) => (p.id === postId ? { ...p, commentCount } : p)));
  }, []);

  const cardWidth = Math.min(width - 32, 560);

  const header = (
    <>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Animated.View entering={enterDown(0)} style={styles.logoWrap}>
          <Image source={LOGO} contentFit="contain" style={styles.logo} />
        </Animated.View>
        <AnimatedText entering={enterDown(1)} style={[styles.title, dir.noSpacing]}>
          {t("mediaTitle")}
        </AnimatedText>
        <AnimatedText entering={enterDown(2)} style={styles.subtitle}>
          {t("mediaSubtitle")}
        </AnimatedText>
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={[TEAL, "rgba(0,87,81,0.4)", "rgba(0,87,81,0)"]}
        style={styles.headerFade}
      />

      {/* ================= TWO BOXES: share (left) · gallery (right) ================= */}
      <View style={styles.boxes}>
        <Animated.View entering={enterFromLeft(2)} style={styles.boxWrap}>
          <SmallBox
            cover={COMMUNITY_COVER}
            color={TEAL}
            icon="camera"
            title={t("mediaShareShort")}
            sub={t("mediaShareShortSub")}
            onPress={() => router.push("/media/share")}
          />
        </Animated.View>
        <Animated.View entering={enterFromRight(3)} style={styles.boxWrap}>
          <SmallBox
            cover={GALLERY_COVER}
            color={ORANGE}
            icon="images"
            title={t("mediaGalleryShort")}
            sub={t("mediaGalleryShortSub")}
            onPress={() => router.push("/media/restaurant")}
          />
        </Animated.View>
      </View>

      {/* ================= FEED TITLE ================= */}
      <View style={[styles.feedHead, { width: cardWidth }]}>
        <Text style={[styles.feedTitle, dir.text]}>{t("mediaFeedTitle")}</Text>
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
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
            <ActivityIndicator color={TEAL} style={styles.loading} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={40} color={MUTED} />
              <Text style={styles.emptyText}>{t("mediaFeedEmpty")}</Text>
            </View>
          )
        }
        ListFooterComponentStyle={{ marginTop: "auto" }}
        ListFooterComponent={
          <>
            {loadingMore ? <ActivityIndicator color={TEAL} style={styles.more} /> : null}
            {posts !== null && <MadeBy />}
          </>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={TEAL} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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

function SmallBox({ cover, color, icon, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.box, pressed && styles.pressed]}>
      <Image source={cover} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(10,20,18,0.1)", "rgba(10,20,18,0.45)", "rgba(10,20,18,0.88)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.boxIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color={WHITE} />
      </View>
      <View>
        <Text style={styles.boxTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.boxSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
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

  /* ================= HEADER ================= */

  header: {
    backgroundColor: TEAL,
    paddingTop: 58,
    paddingBottom: 18,
    alignItems: "center",
  },

  logoWrap: {
    width: 150,
    height: 70,
    marginBottom: 6,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  title: {
    color: WHITE,
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },

  headerFade: {
    height: 60,
    marginTop: -1,
    // boxes start a little after the fade, so the teal visibly melts into the cream first
    marginBottom: -12,
  },

  /* ================= BOXES ================= */

  boxes: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },

  boxWrap: {
    flex: 1,
  },

  box: {
    height: 128,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: DARK,
    padding: 12,
    justifyContent: "space-between",
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },

  boxIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  boxTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  boxSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 1,
  },

  /* ================= FEED ================= */

  feedHead: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 26,
    marginBottom: 12,
  },

  feedTitle: {
    color: DARK,
    fontSize: 18,
    fontWeight: "900",
  },

  loading: {
    marginTop: 30,
  },

  more: {
    marginVertical: 16,
  },

  empty: {
    alignItems: "center",
    gap: 8,
    marginTop: 30,
  },

  emptyText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },
});
