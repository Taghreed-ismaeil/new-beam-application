import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const heroVideo = require("../../assets/video/hero-video.mp4");

export default function Hero() {
  const { width, height } = useWindowDimensions();

  const heroHeight = Math.max(350, Math.min(height * 0.55, 500));

  const titleSize = Math.max(28, Math.min(width * 0.09, 40));
  const subtitleSize = Math.max(12, Math.min(width * 0.034, 15));
  const buttonFont = Math.max(13, Math.min(width * 0.035, 16));

  const waveHeight = Math.max(45, Math.min(width * 0.16, 70));

  const iconSize = Math.max(20, Math.min(width * 0.055, 28));

  const player = useVideoPlayer(heroVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    player.play();
  }, [player]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bg,
          {
            height: heroHeight,
          },
        ]}
      >
        {/* VIDEO */}
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />

        <View style={styles.overlay} />

        {/* NAVBAR فوق الفيديو */}
        <View
          style={[
            styles.navbar,
            {
              paddingHorizontal: width * 0.05,
            },
          ]}
        >
          {/* Logo */}
          <ImageBackground
            source={require("../../assets/img/remove-beam.jpg")}
            style={[
              styles.logo,
              {
                width: width * 0.48, // كبرناها
                height: 80,
                marginLeft: -width * 0.15, // سحبناها لليسار شوي
              },
            ]}
            imageStyle={styles.logoImage}
            resizeMode="contain"
          />

          {/* Icons */}
          <View style={styles.icons}>
            <Pressable
              onPress={() => router.push("/search")}
              style={styles.iconBtn}
            >
              {({ pressed }) => (
                <Ionicons
                  name="search-outline"
                  size={iconSize}
                  color={pressed ? "#ff8c00" : "#ED5529"}
                />
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/cart")}
              style={styles.iconBtn}
            >
              {({ pressed }) => (
                <Ionicons
                  name="bag-outline"
                  size={iconSize}
                  color={pressed ? "#ff8c00" : "#ED5529"}
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* TOP SVG */}

        <Svg
          width="100%"
          height={waveHeight}
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={styles.waveTop}
        >
          <Path
            fill="#40A49A"
            d="
      M0,80
      C180,20 320,110 520,70
      C760,20 980,120 1180,70
      C1310,45 1380,55 1440,80
      L1440,0
      L0,0
      Z
    "
          />
        </Svg>

        {/* CONTENT */}
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: width * 0.05,
              paddingVertical: heroHeight * 0.05,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                fontSize: titleSize,
                lineHeight: titleSize * 1.15,
                marginTop: heroHeight * 0.4,
              },
            ]}
          >
            Order Food{"\n"}
            From Beam
          </Text>

          <View
            style={[
              styles.bottomRow,
              {
                marginBottom: heroHeight * 0.14,
              },
            ]}
          >
            <View style={styles.leftText}>
              <Text
                style={[
                  styles.subtitle,
                  {
                    fontSize: subtitleSize,
                    marginBottom: heroHeight * 0.035,
                  },
                ]}
              >
                FIND YOUR FAVORITE DISH
              </Text>

              <Pressable
                style={[
                  styles.button,
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 18,
                  },
                ]}
                onPress={() => router.push("/menu")}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      fontSize: buttonFont,
                    },
                  ]}
                >
                  Explore Menu
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* BOTTOM SVG */}
        <Svg
          width="100%"
          height={waveHeight}
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          style={styles.waveBottom}
        >
          <Path
            fill="#40A49A"
            d="
      M0,35
      C180,95 320,10 520,45
      C760,90 980,0 1180,40
      C1310,65 1380,55 1440,35
      L1440,120
      L0,120
      Z
    "
          />
        </Svg>
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
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
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

  navbar: {
    position: "absolute",
    top: 25,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
  },

  logo: {
    height: 55,
  },

  logoImage: {
    width: "100%",
    height: "100%",
  },

  icons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  iconBtn: {
    padding: 6,
  },

  content: {
    flex: 1,
    justifyContent: "space-between",
  },

  title: {
    color: "#fff",
    fontWeight: "900",
  },

  bottomRow: {
    alignItems: "flex-start",
  },

  leftText: {
    alignItems: "flex-start",
  },

  subtitle: {
    color: "#fff",
    fontWeight: "800",
  },

  button: {
    backgroundColor: "transparent",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#ED5529",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },

  waveTop: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
  },

  waveBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
  },
});
