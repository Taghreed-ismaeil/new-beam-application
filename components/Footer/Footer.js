import { apiRequest } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const LOGO = require("@/assets/img/remove-beam.jpg");

export default function Footer() {
  const [restaurant, setRestaurant] = useState(null);

  const { width } = useWindowDimensions();

  // =====================================================
  // RESPONSIVE
  // =====================================================

  const waveHeight = Math.max(25, Math.min(width * 0.08, 45));

  const iconSize = Math.max(18, Math.min(width * 0.05, 24));

  const textSize = Math.max(12, Math.min(width * 0.033, 15));

  // =====================================================
  // BEEM MARQUEE
  // =====================================================

  const translateX = useRef(new Animated.Value(0)).current;

  /*
   * حجم اللوجو
   * نخليه responsive
   */
  const logoWidth = Math.min(width * 0.65, 280);

  /*
   * المسافة بين اللوجوهات
   *
   * خففنا السالب حتى ما يصير overlap قوي
   */
  const logoGap = -100;

  /*
   * المسافة التي تتحركها المجموعة
   */
  const moveDistance = logoWidth + logoGap;

  useEffect(() => {
    let cancelled = false;

    const startAnimation = () => {
      if (cancelled) return;

      translateX.setValue(0);

      Animated.timing(translateX, {
        toValue: -moveDistance,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) {
          startAnimation();
        }
      });
    };

    startAnimation();

    return () => {
      cancelled = true;
      translateX.stopAnimation();
    };
  }, [moveDistance, translateX]);

  // =====================================================
  // RESTAURANT
  // =====================================================

  useEffect(() => {
    apiRequest("/api/restaurant")
      .then((data) => {
        setRestaurant(data.restaurant);
      })
      .catch(() => {});
  }, []);

  // =====================================================
  // LOGO COMPONENT
  // =====================================================

  const BeemLogo = () => {
    return (
      <Image
        source={LOGO}
        resizeMode="contain"
        style={[
          styles.logoImage,
          {
            width: logoWidth,
            marginRight: logoGap,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.footerWrapper}>
      {/* =====================================================
          WAVE
      ===================================================== */}

      <View
        style={[
          styles.waveArea,
          {
            height: waveHeight,
          },
        ]}
      >
        <Svg
          width="100%"
          height={waveHeight}
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={styles.wave}
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

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <View style={styles.container}>
        {/* =====================================================
            BEEM MARQUEE
        ===================================================== */}

        <View style={styles.logoMarquee}>
          <Animated.View
            style={[
              styles.logoTrack,
              {
                transform: [
                  {
                    translateX: translateX,
                  },
                ],
              },
            ]}
          >
            {/* مجموعة أولى */}
            <BeemLogo />
            <BeemLogo />
            <BeemLogo />
            <BeemLogo />

            {/* مجموعة ثانية */}
            <BeemLogo />
            <BeemLogo />
            <BeemLogo />
            <BeemLogo />

            {/* مجموعة ثالثة */}
            <BeemLogo />
            <BeemLogo />
            <BeemLogo />
            <BeemLogo />
          </Animated.View>
        </View>

        {/* =====================================================
            LINKS
        ===================================================== */}

        <View style={styles.linksRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/menu")}
          >
            <Text
              style={[
                styles.link,
                {
                  fontSize: textSize,
                },
              ]}
            >
              Menu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/cart")}
          >
            <Text
              style={[
                styles.link,
                {
                  fontSize: textSize,
                },
              ]}
            >
              Order
            </Text>
          </TouchableOpacity>
        </View>

        {/* =====================================================
            CONTACT
        ===================================================== */}

        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={iconSize} color="#ED5529" />

            <Text
              style={[
                styles.text,
                {
                  fontSize: textSize,
                },
              ]}
              numberOfLines={1}
            >
              {restaurant?.phone ?? "+962 7X XXX XXXX"}
            </Text>
          </View>

          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={iconSize} color="#ED5529" />

            <Text
              style={[
                styles.text,
                {
                  fontSize: textSize,
                },
              ]}
              numberOfLines={1}
            >
              {restaurant?.address ?? "Amman, Jordan"}
            </Text>
          </View>
        </View>

        {/* =====================================================
            INSTAGRAM
        ===================================================== */}

        <TouchableOpacity activeOpacity={0.7} style={styles.social}>
          <Ionicons name="logo-instagram" size={iconSize} color="#ED5529" />

          <Text
            style={[
              styles.text,
              {
                fontSize: textSize,
              },
            ]}
          >
            Instagram
          </Text>
        </TouchableOpacity>

        {/* =====================================================
            DIVIDER
        ===================================================== */}

        <View style={styles.divider} />

        {/* =====================================================
            CREATED
        ===================================================== */}

        <Text
          style={[
            styles.created,
            {
              fontSize: textSize * 0.9,
            },
          ]}
        >
          Created by Virelix Solution
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // =====================================================
  // FOOTER WRAPPER
  // =====================================================

  footerWrapper: {
    width: "100%",
    flex: 1,

    backgroundColor: "#40A49A",
    margin: 0,
    padding: 0,

    minHeight: 120,

    alignSelf: "stretch",
  },

  // =====================================================
  // WAVE
  // =====================================================

  waveArea: {
    width: "100%",
    backgroundColor: "#fff",

    justifyContent: "flex-end",

    margin: 0,
    padding: 0,

    overflow: "hidden",
  },

  wave: {
    width: "100%",
    margin: 0,
    padding: 0,

    /*
     * يخلي الـ SVG يلزق بالـ footer
     */
    marginBottom: -1,
  },

  // =====================================================
  // FOOTER
  // =====================================================

  container: {
    width: "100%",
    backgroundColor: "#40A49A",
    alignItems: "center",
    margin: 0,
    paddingTop: 0,
    paddingBottom: 5,
    // marginBottom: 0,
  },

  // =====================================================
  // BEEM MARQUEE
  // =====================================================

  logoMarquee: {
    width: "100%",

    height: 72,

    overflow: "hidden",

    justifyContent: "center",
    alignItems: "flex-start",

    marginTop: -3,
    marginBottom: 3,

    /*
     * مهم جداً للـ web
     */
    flexShrink: 0,
  },

  logoTrack: {
    height: 72,

    flexDirection: "row",

    alignItems: "center",

    flexShrink: 0,

    /*
     * نخلي الـ track أطول من الشاشة
     */
    width: "max-content",
  },

  logoImage: {
    height: 68,

    flexShrink: 0,
  },

  // =====================================================
  // LINKS
  // =====================================================

  linksRow: {
    flexDirection: "row",

    gap: 28,

    marginBottom: 12,
  },

  link: {
    color: "#ED5529",

    fontWeight: "800",
  },

  // =====================================================
  // CONTACT
  // =====================================================

  contactRow: {
    width: "94%",

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    gap: 18,

    marginBottom: 12,
  },

  contactItem: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    flexShrink: 1,
  },

  text: {
    color: "#fff",

    flexShrink: 1,
  },

  // =====================================================
  // INSTAGRAM
  // =====================================================

  social: {
    flexDirection: "row",

    alignItems: "center",

    gap: 2,

    marginBottom: 18,
  },

  // =====================================================
  // DIVIDER
  // =====================================================

  divider: {
    width: "80%",

    height: 1,

    backgroundColor: "rgba(255,255,255,0.3)",

    marginBottom: 8,
  },

  // =====================================================
  // CREATED
  // =====================================================

  created: {
    color: "rgba(255,255,255,0.7)",
  },
});
