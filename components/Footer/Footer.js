import { apiRequest } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";

const FADE_STEPS = 24;

const FADE_LOCATIONS = Array.from(
  { length: FADE_STEPS + 1 },
  (_, i) => i / FADE_STEPS,
);

const FADE_COLORS = FADE_LOCATIONS.map((t) => {
  const eased = (1 - Math.cos(Math.PI * t)) / 2; // ease-in-out (sine)
  return `rgba(0,130,122,${eased.toFixed(3)})`;
});

export function getFooterFadeHeight(width) {
  return Math.max(80, Math.min(width * 0.24, 110));
}

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

const LOGO = require("@/assets/img/remove_beam_logoo.jpg");

export default function Footer() {
  const [restaurant, setRestaurant] = useState(null);

  const { width } = useWindowDimensions();
  const { t, dir } = useAppLang();

  const fadeHeight = getFooterFadeHeight(width);

  const iconSize = Math.max(18, Math.min(width * 0.05, 24));

  const textSize = Math.max(12, Math.min(width * 0.033, 15));

  // =====================================================
  // BEEM MARQUEE
  // =====================================================

  const translateX = useRef(new Animated.Value(0)).current;

  const logoWidth = Math.min(width * 0.65, 280);

  const logoGap = -100;

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

  useEffect(() => {
    apiRequest("/api/restaurant")
      .then((data) => {
        setRestaurant(data.restaurant);
      })
      .catch(() => {});
  }, []);

  const BeemLogo = () => {
    return (
      <Image
        source={LOGO}
        contentFit="contain"
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
      <LinearGradient
        colors={FADE_COLORS}
        locations={FADE_LOCATIONS}
        style={[styles.fadeUp, { height: fadeHeight, top: -fadeHeight + 1 }]}
        pointerEvents="none"
      />
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
            CONTACT
        ===================================================== */}

        <View style={[styles.contactRow, dir.row]}>
          <View style={[styles.contactItem, dir.row]}>
            <Ionicons name="call-outline" size={iconSize} color="#FC4A14" />

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

          <View style={[styles.contactItem, dir.row]}>
            <Ionicons name="location-outline" size={iconSize} color="#FC4A14" />

            <Text
              style={[
                styles.text,
                {
                  fontSize: textSize,
                },
              ]}
              numberOfLines={1}
            >
              {restaurant?.address ?? t("footerAddress")}
            </Text>
          </View>
        </View>

        {/* =====================================================
            INSTAGRAM
        ===================================================== */}

        <TouchableOpacity activeOpacity={0.7} style={[styles.social, dir.row]}>
          <Ionicons name="logo-instagram" size={iconSize} color="#FC4A14" />

          <Text
            style={[
              styles.text,
              {
                fontSize: textSize,
              },
            ]}
          >
            {t("footerInstagram")}
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
          {t("footerCreated")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fadeUp: {
    position: "absolute",
    left: 0,
    right: 0,
  },

  footerWrapper: {
    width: "100%",
    flex: 1,

    backgroundColor: "#00827A",
    margin: 0,
    padding: 0,

    // Lets the fade hang up over AboutUs and draw on top of it.
    overflow: "visible",
    zIndex: 5,
    elevation: 5,

    minHeight: 120,

    alignSelf: "stretch",
  },

  // =====================================================
  // FOOTER
  // =====================================================

  container: {
    width: "100%",
    backgroundColor: "#00827A",
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
