import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { toggleMediaLike } from "@/lib/media-api";
import { Text } from "@/lib/arabic-font";

/* =========================================================
   MEDIA POST CARD
   One photo in a media feed, Instagram style:
   - who posted it (the restaurant's logo + "Beam", or the
     customer's first name) and how long ago
   - the photo; tap opens it full screen, double tap likes it
     (with a heart bursting over the photo)
   - small like + comment buttons with their counts, then the
     caption
   Likes update on screen at once and roll back if the server
   says no. `onComments(post)` opens the comments sheet.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const BORDER = "#EEEAE5";
const LIKE_RED = "#E8384F";

const LOGO = require("../assets/img/remove_beam_logoo.jpg");

const DOUBLE_TAP_MS = 280;

/** "5m", "3h", "2d" — or a date for anything older than a week. */
export function timeAgo(iso, lang) {
  const s = Math.max((Date.now() - new Date(iso).getTime()) / 1000, 0);
  const ar = lang === "ar";
  if (s < 60) return ar ? "هلأ" : "now";
  if (s < 3600) return `${Math.floor(s / 60)}${ar ? " د" : "m"}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${ar ? " س" : "h"}`;
  if (s < 604800) return `${Math.floor(s / 86400)}${ar ? " ي" : "d"}`;
  return new Date(iso).toLocaleDateString();
}

export default function MediaPostCard({ post, width, onOpen, onComments, onChange }) {
  const { dir, lang } = useAppLang();
  const isRestaurant = post.source === "restaurant";
  const accent = isRestaurant ? ORANGE : TEAL;

  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const busy = useRef(false);
  const lastTap = useRef(0);
  const singleTap = useRef(null);

  // heart on the like button: quick pop
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  // big heart bursting over the photo on double tap
  const burst = useSharedValue(0);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.get() > 0 ? 1 : 0,
    transform: [{ scale: burst.get() }],
  }));

  async function toggleLike(forceLike = false) {
    if (busy.current) return;
    if (forceLike && liked) return; // double tap only ever likes
    busy.current = true;

    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(c + (next ? 1 : -1), 0));
    pop.set(withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, { damping: 7 })));

    try {
      const r = await toggleMediaLike(post.id);
      setLiked(r.liked);
      setLikeCount(r.likeCount);
      onChange?.({ ...post, liked: r.liked, likeCount: r.likeCount });
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(c + (next ? -1 : 1), 0));
    } finally {
      busy.current = false;
    }
  }

  // One tap opens the photo; two quick taps like it.
  function onPhotoPress() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(singleTap.current);
      lastTap.current = 0;
      burst.set(
        withSequence(
          withSpring(1, { damping: 8, stiffness: 220 }),
          withTiming(1, { duration: 350 }),
          withTiming(0, { duration: 180 }),
        ),
      );
      toggleLike(true);
      return;
    }
    lastTap.current = now;
    singleTap.current = setTimeout(() => onOpen?.(post), DOUBLE_TAP_MS);
  }

  const photoHeight = Math.round(width * 1.15);

  return (
    <View style={[styles.post, { width }]}>
      {/* ---------- who + when ---------- */}
      <View style={[styles.head, dir.row]}>
        {isRestaurant ? (
          <View style={[styles.avatar, styles.logoAvatar]}>
            <Image source={LOGO} contentFit="contain" style={styles.logo} />
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: accent }]}>
            <Text style={styles.avatarText}>{(post.author || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headText}>
          <Text style={[styles.author, dir.text]} numberOfLines={1}>
            {isRestaurant ? "Beam" : post.author || "Beam"}
          </Text>
        </View>
        {isRestaurant && (
          <View style={[styles.tag, { backgroundColor: "rgba(252,74,20,0.1)" }]}>
            <Ionicons name="checkmark-circle" size={13} color={ORANGE} />
          </View>
        )}
        <Text style={styles.time}>{timeAgo(post.createdAt, lang)}</Text>
      </View>

      {/* ---------- photo ---------- */}
      <Pressable onPress={onPhotoPress}>
        <Image
          source={{ uri: imageUrl(post.imageUrl) }}
          cachePolicy="memory-disk"
          transition={150}
          contentFit="cover"
          style={[styles.photo, { width, height: photoHeight }]}
        />
        <Animated.View pointerEvents="none" style={[styles.burst, burstStyle]}>
          <Ionicons name="heart" size={96} color={WHITE} style={styles.burstHeart} />
        </Animated.View>
      </Pressable>

      {/* ---------- like + comment ---------- */}
      <View style={[styles.actions, dir.row, !post.caption && styles.actionsLast]}>
        <Pressable onPress={() => toggleLike()} hitSlop={8} style={[styles.action, dir.row]}>
          <Animated.View style={popStyle}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? LIKE_RED : DARK}
            />
          </Animated.View>
          {likeCount > 0 && <Text style={styles.count}>{likeCount}</Text>}
        </Pressable>

        <Pressable onPress={() => onComments?.(post)} hitSlop={8} style={[styles.action, dir.row]}>
          <Ionicons name="chatbubble-outline" size={20} color={DARK} />
          {(post.commentCount ?? 0) > 0 && <Text style={styles.count}>{post.commentCount}</Text>}
        </Pressable>
      </View>

      {!!post.caption && (
        <Text style={[styles.caption, dir.text]}>
          <Text style={styles.captionAuthor}>{isRestaurant ? "Beam" : post.author || "Beam"} </Text>
          {post.caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    alignSelf: "center",
    marginBottom: 22,
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  logoAvatar: {
    backgroundColor: TEAL,
    overflow: "hidden",
  },

  logo: {
    width: 30,
    height: 30,
  },

  avatarText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  headText: {
    flex: 1,
  },

  author: {
    color: DARK,
    fontSize: 15,
    fontWeight: "900",
  },

  tag: {
    borderRadius: 999,
    padding: 3,
  },

  time: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },

  photo: {
    backgroundColor: "#E9E4DF",
  },

  burst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  burstHeart: {
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },

  actionsLast: {
    paddingBottom: 12,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  count: {
    color: DARK,
    fontSize: 13,
    fontWeight: "800",
  },

  caption: {
    color: DARK,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },

  captionAuthor: {
    fontWeight: "900",
  },
});
