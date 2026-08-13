import BackButton from "@/components/BackButton";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
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

  useEffect(() => {
    player.play();
  }, [player]);

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
            resizeMode="cover"
          />

          <View style={styles.coverOverlay} />

          <View style={styles.coverContent}>
            <Text style={styles.coverTitle}>
              More Than Just{"\n"}
              <Text style={styles.coverTitleAccent}>FOOD.</Text>
            </Text>

            <Text style={styles.coverSubtitle}>
              Fresh ingredients. Real fire.{"\n"}
              Made with a whole lot of love.
            </Text>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>SINCE DAY ONE</Text>
            </View>
          </View>
        </View>

        {/* ================= INTRO ================= */}

        <View style={styles.introSection}>
          <Text style={styles.smallLabel}>WELCOME TO BEAM</Text>

          <Text style={styles.mainHeading}>
            Good food should{"\n"}
            <Text style={styles.orangeText}>feel this good.</Text>
          </Text>

          <Text style={styles.introText}>
            At Beam, we believe great food doesn't need to be complicated. It
            just needs to be fresh, honest, and made with care.
          </Text>
        </View>

        {/* ================= STORY CARD ================= */}

        <View style={styles.storyCard}>
          <View style={styles.storyTop}>
            <View style={styles.storyIcon}>
              <Text style={styles.storyIconText}>B</Text>
            </View>

            <View style={styles.storyTitleWrap}>
              <Text style={styles.cardLabel}>OUR STORY</Text>

              <Text style={styles.cardTitle}>
                Made the way{"\n"}
                it should be.
              </Text>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Beam started with one simple idea: shawarma the way it's meant to be
            — hand-carved to order, wrapped fresh, and never rushed.
          </Text>

          <Text style={styles.paragraph}>
            Every skewer is stacked and slow-roasted in house. Every wrap is
            built the moment you order it. No shortcuts, no sitting under heat
            lamps.
          </Text>

          <Text style={styles.paragraphLast}>
            Just fresh ingredients, real fire, and a whole lot of care.
          </Text>

          <View style={styles.storyLine} />
        </View>

        {/* ================= VALUES ================= */}

        <View style={styles.section}>
          <Text style={styles.smallLabel}>WHAT WE BELIEVE</Text>

          <Text style={styles.sectionHeading}>
            Simple things.
            {"\n"}
            <Text style={styles.tealText}>Done right.</Text>
          </Text>

          <View style={styles.valuesContainer}>
            {/* FAST DELIVERY */}
            <View style={styles.valueCard}>
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
                <Text style={styles.valueTitle}>Fast Delivery</Text>

                <Text style={styles.valueText}>
                  Freshly prepared and delivered to you in no time.
                </Text>
              </View>
            </View>

            {/* FRESH ALWAYS */}
            <View style={styles.valueCard}>
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
                <Text style={styles.valueTitle}>Fresh Always</Text>

                <Text style={styles.valueText}>
                  Fresh ingredients in every single bite.
                </Text>
              </View>
            </View>

            {/* TOP QUALITY */}
            <View style={styles.valueCard}>
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
                <Text style={styles.valueTitle}>Top Quality</Text>

                <Text style={styles.valueText}>
                  Quality food made with care in every detail.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= GALLERY ================= */}

        <View style={styles.section}>
          <Text style={styles.smallLabel}>BEHIND THE COUNTER</Text>

          <Text style={styles.sectionHeading}>
            Meet the people
            {"\n"}
            <Text style={styles.orangeText}>behind Beam.</Text>
          </Text>

          <Text style={styles.sectionDescription}>
            From the first cut to the final wrap, our kitchen team puts care
            into every order.
          </Text>

          <View style={styles.gallery}>
            {galleryPhotos.map((photo, index) => (
              <View
                key={index}
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
                  resizeMode="cover"
                />

                <View style={styles.galleryNumber}>
                  <Text style={styles.galleryNumberText}>0{index + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ================= VIDEO ================= */}

        <View style={styles.videoSection}>
          <View style={styles.videoHeader}>
            <View style={styles.videoHeaderText}>
              <Text style={styles.smallLabel}>TAKE A LOOK</Text>

              <Text style={styles.videoTitle}>
                Behind every{"\n"}
                <Text style={styles.orangeText}>delicious bite.</Text>
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
        </View>

        {/* ================= CTA ================= */}

        <View style={styles.ctaSection}>
          <View style={styles.ctaDecorOne} />
          <View style={styles.ctaDecorTwo} />

          <Text style={styles.ctaSmall}>HUNGRY YET?</Text>

          <Text style={styles.ctaTitle}>
            Your next favorite{"\n"}
            meal is waiting.
          </Text>

          <Text style={styles.ctaDescription}>
            Freshly made, packed with flavor, and ready whenever you are.
          </Text>

          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() => router.push("/menu")}
          >
            <Text style={styles.ctaText}>Explore Our Menu</Text>

            <Text style={styles.ctaArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ================= FOOTER ================= */}

        {/*
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            BEEM
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

const styles = StyleSheet.create({
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
});
