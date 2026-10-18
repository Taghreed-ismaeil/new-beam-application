import BackButton from "@/components/BackButton";
import { router, useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback } from "react";
import { useAppLang } from "@/lib/app-lang";
import { enterPop, enterUp } from "@/lib/motion";
import Animated from "react-native-reanimated";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const CREAM = "#FFF9F4";
const DARK = "#17201F";
const MUTED = "#68706E";
const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";

const storyVideo = require("../assets/video/hero-video.mp4");

const coverPhoto = require("../assets/img/about/beam-res-about.jpg");

const galleryPhotos = [
  require("../assets/img/about/chef-1.jpg"),
  require("../assets/img/about/chef-2.jpg"),
  require("../assets/img/about/chef-3.jpg"),
  require("../assets/img/about/chef-4.jpg"),
  // require("../assets/img/about/beam-logo.jpg"),
];

export default function AboutScreen() {
  const { width } = useWindowDimensions();
  const { t, dir } = useAppLang();

  // Arabic uses the same layout, just with bigger text (see AR_TEXT below).
  const styles = dir.isRTL ? arStyles : enStyles;

  /*
   * The page is designed around a maximum mobile width.
   * On smaller phones it uses the real screen width.
   * On larger screens it stops growing at 480px.
   */
  const screenWidth = Math.min(width, 480);

  const horizontalPadding = 20;
  const contentWidth = screenWidth - horizontalPadding * 2;

  const galleryGap = 12;
  const galleryImgWidth = (contentWidth - galleryGap) / 2;

  const galleryImgHeight = galleryImgWidth * (1280 / 720);

  /*
   * Space reserved for the fixed bottom navigation.
   * This makes sure the CTA never gets hidden behind it.
   */
  const BOTTOM_NAV_SPACE = 110;

  const player = useVideoPlayer(storyVideo, (p) => {
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
      <BackButton />

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: BOTTOM_NAV_SPACE,
          },
        ]}
      >
        {/* ================= HERO ================= */}

        <View
          style={[
            styles.cover,
            {
              height: Math.min(Math.max(screenWidth * 0.95, 360), 430),
            },
          ]}
        >
          <Image
            source={coverPhoto}
            style={styles.coverImage}
            contentFit="cover"
          />

          <View style={styles.coverOverlay} />

          <Animated.View entering={enterUp(1)} style={styles.coverContent}>
            <Text style={[styles.coverTitle, dir.noSpacing]}>
              {t("aboutCoverTitle")}{"\n"}
              <Text style={styles.coverTitleAccent}>{t("aboutCoverAccent")}</Text>
            </Text>

            <Text style={styles.coverSubtitle}>{t("aboutCoverSub")}</Text>

            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, dir.noSpacing]}>{t("aboutSinceDayOne")}</Text>
            </View>
          </Animated.View>
        </View>

        {/* ================= INTRO ================= */}

        <Animated.View entering={enterUp(2)} style={styles.introSection}>
          <Text style={[styles.smallLabel, dir.noSpacing]}>{t("aboutWelcome")}</Text>

          <Text style={[styles.mainHeading, dir.noSpacing]}>
            {t("aboutMainHeading")}{"\n"}
            <Text style={styles.orangeText}>{t("aboutMainAccent")}</Text>
          </Text>

          <Text style={styles.introText}>{t("aboutIntro")}</Text>
        </Animated.View>

        {/* ================= STORY CARD ================= */}

        <Animated.View entering={enterUp(3)} style={styles.storyCard}>
          <View style={styles.storyTop}>
            <View style={styles.storyIcon}>
              <Text style={styles.storyIconText}>B</Text>
            </View>

            <View style={styles.storyTitleWrap}>
              <Text style={[styles.cardLabel, dir.noSpacing]}>{t("aboutStoryLabel")}</Text>

              <Text style={styles.cardTitle}>{t("aboutStoryTitle")}</Text>
            </View>
          </View>

          <Text style={styles.paragraph}>{t("aboutStory1")}</Text>

          <Text style={styles.paragraph}>{t("aboutStory2")}</Text>

          <Text style={styles.paragraphLast}>{t("aboutStory3")}</Text>

          <View style={styles.storyLine} />
        </Animated.View>

        {/* ================= VALUES ================= */}

        <View style={styles.section}>
          <Text style={[styles.smallLabel, dir.noSpacing]}>{t("aboutBelieveLabel")}</Text>

          <Text style={styles.sectionHeading}>
            {t("aboutBelieveHeading")}
            {"\n"}
            <Text style={styles.tealText}>{t("aboutBelieveAccent")}</Text>
          </Text>

          <View style={styles.valuesContainer}>
            {/* FAST DELIVERY */}
            <Animated.View entering={enterUp(4)} style={styles.valueCard}>
              <View
                style={[
                  styles.valueIcon,
                  {
                    backgroundColor: LIGHT_ORANGE,
                  },
                ]}
              >
                <Text style={styles.valueEmoji}>⏱️</Text>
              </View>

              <View style={styles.valueContent}>
                <Text style={styles.valueTitle}>{t("aboutFastTitle")}</Text>

                <Text style={styles.valueText}>{t("aboutFastText")}</Text>
              </View>
            </Animated.View>

            {/* FRESH ALWAYS */}
            <Animated.View entering={enterUp(5)} style={styles.valueCard}>
              <View
                style={[
                  styles.valueIcon,
                  {
                    backgroundColor: LIGHT_TEAL,
                  },
                ]}
              >
                <Text style={styles.valueEmoji}>🥬</Text>
              </View>

              <View style={styles.valueContent}>
                <Text style={styles.valueTitle}>{t("aboutFreshTitle")}</Text>

                <Text style={styles.valueText}>{t("aboutFreshText")}</Text>
              </View>
            </Animated.View>

            {/* TOP QUALITY */}
            <Animated.View entering={enterUp(6)} style={styles.valueCard}>
              <View
                style={[
                  styles.valueIcon,
                  {
                    backgroundColor: LIGHT_ORANGE,
                  },
                ]}
              >
                <Text style={styles.valueEmoji}>⭐</Text>
              </View>

              <View style={styles.valueContent}>
                <Text style={styles.valueTitle}>{t("aboutQualityTitle")}</Text>

                <Text style={styles.valueText}>{t("aboutQualityText")}</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* ================= GALLERY ================= */}

        <View style={styles.section}>
          <Text style={[styles.smallLabel, dir.noSpacing]}>{t("aboutTeamLabel")}</Text>

          <Text style={styles.sectionHeading}>
            {t("aboutTeamHeading")}
            {"\n"}
            <Text style={styles.orangeText}>{t("aboutTeamAccent")}</Text>
          </Text>

          <Text style={styles.sectionDescription}>{t("aboutTeamText")}</Text>

          <View style={styles.gallery}>
            {galleryPhotos.map((photo, index) => (
              <Animated.View
                key={index}
                entering={enterPop(index + 2)}
                style={[
                  styles.galleryItem,
                  {
                    width: galleryImgWidth,
                    height: galleryImgHeight,
                  },
                ]}
              >
                <Image
                  source={photo}
                  style={styles.galleryImage}
                  contentFit="cover"
                />

                <View style={styles.galleryNumber}>
                  <Text style={styles.galleryNumberText}>0{index + 1}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ================= VIDEO ================= */}

        <Animated.View entering={enterUp(5)} style={styles.videoSection}>
          <View style={styles.videoHeader}>
            <View style={styles.videoHeaderText}>
              <Text style={[styles.smallLabel, dir.noSpacing]}>{t("aboutLookLabel")}</Text>

              <Text style={styles.videoTitle}>
                {t("aboutLookHeading")}{"\n"}
                <Text style={styles.orangeText}>{t("aboutLookAccent")}</Text>
              </Text>
            </View>
            {/*
            <View style={styles.playBadge}>
              <Text style={styles.playText}>▶</Text>
            </View>

            */}
          </View>

          <View
            style={[
              styles.videoWrap,
              {
                height: contentWidth * 0.72,
              },
            ]}
          >
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
              pointerEvents="none"
            />

            <View style={styles.videoOverlay}>
              {/*
              <View style={styles.videoPlayCircle}>
                <Text style={styles.videoPlayIcon}>▶</Text>
              </View>
*/}
            </View>
          </View>
        </Animated.View>

        {/* ================= CTA ================= */}

        <Animated.View entering={enterUp(6)} style={styles.ctaSection}>
          <View style={styles.ctaDecorOne} />
          <View style={styles.ctaDecorTwo} />

          <Text style={[styles.ctaSmall, dir.noSpacing]}>{t("aboutCtaSmall")}</Text>

          <Text style={styles.ctaTitle}>{t("aboutCtaTitle")}</Text>

          <Text style={styles.ctaDescription}>{t("aboutCtaText")}</Text>

          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() => router.push("/menu")}
          >
            <Text style={styles.ctaText}>{t("aboutCtaButton")}</Text>

            <Text style={styles.ctaArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ================= FOOTER ================= */}

        {/*
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            BEAM
          </Text>

          <Text style={styles.footerText}>
            Crafted by hand. Served with pride.
          </Text>

          <View style={styles.footerDot}>
            <View style={styles.dot} />
          </View>
        </View>
        */}
      </ScrollView>
    </View>
  );
}

const baseStyles = {
  /* ================= BASE ================= */

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  scrollContent: {
    paddingBottom: 110,
  },

  /* ================= HERO ================= */

  cover: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },

  coverImage: {
    width: "100%",
    height: "100%",
  },

  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 25, 23, 0.48)",
  },

  coverContent: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 5,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 16,
    marginTop: 12,
  },

  heroBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  coverTitle: {
    color: "#fff",
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: -1,
  },

  coverTitleAccent: {
    color: ORANGE,
  },

  coverSubtitle: {
    color: "#F7F7F7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    fontWeight: "500",
  },

  /* ================= INTRO ================= */

  introSection: {
    paddingHorizontal: 24,
    paddingTop: 38,
    paddingBottom: 30,
  },

  smallLabel: {
    color: TEAL,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 9,
  },

  mainHeading: {
    color: DARK,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  orangeText: {
    color: ORANGE,
  },

  tealText: {
    color: TEAL,
  },

  introText: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
  },

  /* ================= STORY ================= */

  storyCard: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 26,
    backgroundColor: "#B3CDC9",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 15,

    elevation: 3,
  },

  storyTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  storyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: LIGHT_TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  storyIconText: {
    color: TEAL,
    fontSize: 25,
    fontWeight: "900",
  },

  storyTitleWrap: {
    flex: 1,
  },

  cardLabel: {
    color: ORANGE,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 3,
  },

  cardTitle: {
    color: DARK,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "900",
  },

  paragraph: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },

  paragraphLast: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
  },

  storyLine: {
    width: 42,
    height: 4,
    borderRadius: 5,
    backgroundColor: ORANGE,
    marginTop: 20,
  },

  /* ================= VALUES ================= */

  section: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  sectionHeading: {
    color: DARK,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    marginBottom: 12,
  },

  sectionDescription: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },

  valuesContainer: {
    gap: 11,
  },

  valueCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 90,
  },

  valueIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    flexShrink: 0,
  },

  valueContent: {
    flex: 1,
    minWidth: 0,
  },

  valueEmoji: {
    fontSize: 23,
  },

  valueTitle: {
    color: DARK,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },

  valueText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },

  /* ================= GALLERY ================= */

  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  galleryItem: {
    borderRadius: 19,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#eee",
  },

  galleryImage: {
    width: "100%",
    height: "100%",
  },

  galleryNumber: {
    position: "absolute",
    top: 9,
    left: 9,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },

  galleryNumberText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },

  /* ================= VIDEO ================= */

  videoSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },

  videoHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  videoHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  videoTitle: {
    color: DARK,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
  },

  playBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
    flexShrink: 0,
  },

  playText: {
    color: ORANGE,
    fontSize: 13,
    marginLeft: 2,
  },

  videoWrap: {
    width: "100%",
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: DARK,
    position: "relative",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  videoPlayCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,

    elevation: 5,
  },

  videoPlayIcon: {
    color: "#fff",
    fontSize: 20,
    marginLeft: 4,
  },

  /* ================= CTA ================= */

  ctaSection: {
    marginHorizontal: 20,

    /*
     * Slightly smaller margin than before so the card
     * sits naturally above the bottom navigation.
     */
    marginTop: 30,

    paddingHorizontal: 22,
    paddingVertical: 30,

    borderRadius: 28,
    backgroundColor: TEAL,

    overflow: "hidden",
    position: "relative",
  },

  ctaDecorOne: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.07)",
    right: -45,
    top: -45,
  },

  ctaDecorTwo: {
    position: "absolute",
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: "rgba(237,85,41,0.25)",
    left: -35,
    bottom: -35,
  },

  ctaSmall: {
    color: "#BDE8E2",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 9,
  },

  ctaTitle: {
    color: "#fff",
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
  },

  ctaDescription: {
    color: "#D9F1EE",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 20,
  },

  cta: {
    backgroundColor: ORANGE,
    minHeight: 54,
    borderRadius: 17,
    paddingHorizontal: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  ctaText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  ctaArrow: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
    marginLeft: 10,
    marginTop: -2,
  },

  /* ================= FOOTER ================= */

  footer: {
    alignItems: "center",
    paddingTop: 38,
    paddingBottom: 30,
  },

  footerLogo: {
    color: TEAL,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 3,
  },

  footerText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },

  footerDot: {
    marginTop: 13,
    alignItems: "center",
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ORANGE,
  },
};

/*
 * Arabic glyphs read much smaller than Latin at the same font size, and the
 * tiny labels ("ورا الكاونتر", "أهلاً فيك ببيم"…) were unreadable.
 * Only text sizes change here — the layout stays exactly like English.
 */
const AR_TEXT = {
  heroBadgeText: { fontSize: 13 },
  coverTitle: { fontSize: 40, lineHeight: 52 },
  coverSubtitle: { fontSize: 17, lineHeight: 27 },
  smallLabel: { fontSize: 14 },
  mainHeading: { fontSize: 31, lineHeight: 44 },
  introText: { fontSize: 17, lineHeight: 28 },
  cardLabel: { fontSize: 13 },
  cardTitle: { fontSize: 23, lineHeight: 34 },
  paragraph: { fontSize: 16, lineHeight: 27 },
  paragraphLast: { fontSize: 16, lineHeight: 27 },
  sectionHeading: { fontSize: 29, lineHeight: 42 },
  sectionDescription: { fontSize: 16, lineHeight: 26 },
  valueTitle: { fontSize: 17 },
  valueText: { fontSize: 14, lineHeight: 23 },
  galleryNumberText: { fontSize: 12 },
  videoTitle: { fontSize: 27, lineHeight: 38 },
  playText: { fontSize: 15 },
  ctaSmall: { fontSize: 13 },
  ctaTitle: { fontSize: 29, lineHeight: 42 },
  ctaDescription: { fontSize: 15, lineHeight: 25 },
  ctaText: { fontSize: 16 },
};

const enStyles = StyleSheet.create(baseStyles);

const arStyles = StyleSheet.create(
  Object.fromEntries(
    Object.entries(baseStyles).map(([key, style]) => [
      key,
      { ...style, ...AR_TEXT[key] },
    ])
  )
);
