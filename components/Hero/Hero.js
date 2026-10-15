import WaveText from "@/components/WaveText/WaveText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";

import { useAppLang } from "@/lib/app-lang";

const heroVideo = require("../../assets/video/hero-video.mp4");

// Real PNG (the old "remove_beam_logoo.jpg" was a PNG with a .jpg name).
const LOGO = require("../../assets/img/remove_beam_logoo.jpg");

// The logo image is 311×145 px. "SHAWERMA & MORE" runs from the S at
// x = 23 px to the end of the E at x = 273 px. The Explore Menu + cart row
// spans exactly that stretch: button starts at the S, cart ends at the E.
const LOGO_IMG_W = 311;
const LOGO_IMG_H = 145;
const LOGO_S_X = 23;
const LOGO_E_X = 273;

export default function Hero() {
  const { width, height } = useWindowDimensions();
  const { t, dir } = useAppLang();

  const heroHeight = Math.max(350, Math.min(height * 0.55, 500));

  const buttonFont = Math.max(13, Math.min(width * 0.035, 16));

  const iconSize = Math.max(20, Math.min(width * 0.055, 28));

  // The logo box is centered; "contain" scales the image to fit the box and
  // centers it inside — from that we know where the S and the E land on screen.
  const logoBoxW = width * 0.5;
  const logoBoxH = 100;
  const logoScale = Math.min(logoBoxW / LOGO_IMG_W, logoBoxH / LOGO_IMG_H);
  const logoSLeft = (width - LOGO_IMG_W * logoScale) / 2 + LOGO_S_X * logoScale;
  const logoTextWidth = (LOGO_E_X - LOGO_S_X) * logoScale;

  const player = useVideoPlayer(heroVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Only decode the looping video while this screen is on top — left playing
  // underneath other screens it steals CPU/GPU and makes animations stutter.
  useFocusEffect(
    useCallback(() => {
      player.play();
      return () => player.pause();
    }, [player]),
  );

  return (
    <View style={styles.container}>
      <View style={[styles.bg, { height: heroHeight }]}>
        {/* VIDEO */}
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />

        <View style={styles.overlay} pointerEvents="none" />

        {/* FADE — الفيديو بيتلاشى من تحت ويندمج مع لون MenuCard */}
        <LinearGradient
          colors={[
            "rgba(0,130,122,0)",
            "rgba(0,130,122,0.08)",
            "rgba(0,130,122,0.25)",
            "rgba(0,130,122,0.5)",
            "rgba(0,130,122,0.78)",
            "#00827A",
          ]}
          locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          style={[styles.bottomFade, { height: heroHeight * 0.4 }]}
          pointerEvents="none"
        />

        {/* SEE TODAY'S BEST DEAL — ع آخر الفيديو، فوق التلاشي */}
        <View style={styles.dealHeading} pointerEvents="none">
          <WaveText text={t("homeBestDeal")} />
        </View>

        {/* LOGO + Explore Menu + Cart
            Same setup as the heading above (a small absolute block with a
            zIndex, anchored by `top`) — that's the one that shows on iOS. */}
        <View
          style={[styles.brandBlock, { top: heroHeight * 0.32 }]}
          pointerEvents="box-none"
        >
          <Image
            source={LOGO}
            style={{ width: logoBoxW, height: logoBoxH }}
            contentFit="contain"
          />

          {/* طرف الزر ببلش مع حرف S، وطرف السلة بيخلص مع حرف E */}
          <View
            style={[
              styles.actionsRow,
              { marginLeft: logoSLeft, width: logoTextWidth },
              dir.row,
              // "تصفّح المنيو" is shorter, so space-between left the cart
              // stranded at the far edge — keep it next to the button.
              dir.isRTL && styles.actionsRowAr,
            ]}
          >
            <Pressable
              style={styles.button}
              onPress={() => router.push("/menu")}
            >
              <Text style={[styles.buttonText, { fontSize: buttonFont }]}>
                {t("homeExploreMenu")}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push("/cart")} hitSlop={6}>
              {({ pressed }) => (
                <Ionicons
                  name="bag"
                  size={iconSize}
                  color={pressed ? "#C94320" : "#FC4A14"}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  bg: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
    // Same teal as MenuCard below — so if there's ever a sub-pixel gap at the
    // seam, it blends in instead of showing as a contrasting line.
    backgroundColor: "#00827A",
  },

  video: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  // Ends on #00827A (brand teal) — the exact color MenuCard's gradient starts
  // with, so there's no seam. Many eased stops keep it free of visible bands.
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Centered ~38pt above the bottom of the video, on top of the teal fade.
  dealHeading: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: "center",
    zIndex: 21,
    elevation: 21,
  },

  brandBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 22,
    elevation: 22,
  },

  actionsRow: {
    alignSelf: "flex-start", // so marginLeft (the S position) is measured from the screen edge
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // button at the S, cart at the E
    marginTop: 6,
  },

  actionsRowAr: {
    justifyContent: "center",
    gap: 16,
  },

  button: {
    backgroundColor: "transparent",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FC4A14",
    paddingVertical: 8,
    paddingHorizontal: 12, // button + cart must fit between S and E
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});
