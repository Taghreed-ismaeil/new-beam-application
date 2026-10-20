import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import MadeBy from "@/components/MadeBy";
import BackButton from "@/components/BackButton";
import MediaViewer from "@/components/MediaViewer";
import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { fetchMediaPage } from "@/lib/media-api";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   RESTAURANT GALLERY
   Photos the restaurant posts from the admin panel, two per row
   (every third one spans the full width for rhythm). Tap one to
   see it full screen.
========================================================= */

const ORANGE = "#FC4A14";
const SOFT_ORANGE = "#FC6E43";
const WHITE = "#FFFFFF";
const MUTED = "#68706E";
const CREAM = "#FFF9F4";
const GUTTER = 16;
const GAP = 10;

export default function RestaurantGallery() {
  const { t, dir } = useAppLang();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async (reset) => {
    const d = await fetchMediaPage("restaurant", reset ? null : cursor).catch(() => null);
    if (!d) {
      if (reset) setPosts((p) => p ?? []);
      return;
    }
    setPosts((prev) => (reset ? d.posts : [...(prev ?? []), ...d.posts]));
    setCursor(d.nextCursor);
  }, [cursor]);

  useEffect(() => {
    load(true);
  }, []);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await load(false);
    setLoadingMore(false);
  }

  async function refresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  // Rows: [wide], [half, half], [wide], [half, half], …
  const rows = [];
  (posts ?? []).forEach((p, i) => {
    const slot = i % 3;
    if (slot === 0) rows.push([p]);
    else if (slot === 1) rows.push([p]);
    else rows[rows.length - 1].push(p);
  });

  const half = (width - GUTTER * 2 - GAP) / 2;
  const wide = width - GUTTER * 2;

  return (
    <View style={styles.screen}>
      <BackButton />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.map((p) => p.id).join("-")}
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
        ListFooterComponent={
          <>
            {loadingMore ? <ActivityIndicator color={ORANGE} style={{ margin: 20 }} /> : null}
            {posts !== null && <MadeBy />}
          </>
        }
        renderItem={({ item: row }) => (
          <View style={[styles.row, dir.row]}>
            {row.map((p) => {
              const w = row.length === 1 && (posts.indexOf(p) % 3 === 0) ? wide : half;
              const h = w === wide ? wide * 0.62 : half * 1.2;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setOpen(p)}
                  style={({ pressed }) => [styles.tile, { width: w, height: h }, pressed && styles.pressed]}
                >
                  <Image
                    source={{ uri: imageUrl(p.imageUrl) }}
                    cachePolicy="memory-disk"
                    transition={150}
                    contentFit="cover"
                    style={StyleSheet.absoluteFill}
                  />
                  {!!p.caption && (
                    <LinearGradient
                      colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
                      style={styles.tileCaption}
                    >
                      <Text style={[styles.tileCaptionText, dir.text]} numberOfLines={1}>
                        {p.caption}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      />

      <MediaViewer post={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  content: {
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

  headerFade: {
    height: 56,
    marginTop: -1,
    marginBottom: -30,
  },

  row: {
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: GUTTER,
    marginBottom: GAP,
  },

  tile: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#E9E4DF",
  },

  pressed: {
    opacity: 0.9,
  },

  tileCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 10,
  },

  tileCaptionText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
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
