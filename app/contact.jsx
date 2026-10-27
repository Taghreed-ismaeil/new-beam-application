import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";

import BackButton from "@/components/BackButton";
import MadeBy from "@/components/MadeBy";
import { apiRequestCached } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { enterDown, enterUp } from "@/lib/motion";
import { RESTAURANT_MAPS_URL } from "@/lib/restaurant-location";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const DARK = "#17201F";
const MUTED = "#68706E";

const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";

const WHITE = "#FFFFFF";

const BOTTOM_NAV_SPACE = 110;

export default function ContactScreen() {
  const { width } = useWindowDimensions();
  const { t, dir } = useAppLang();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSmall = width < 360;

  useEffect(() => {
    apiRequestCached(
      "/api/restaurant",
      (d) => {
        setRestaurant(d.restaurant);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  const phone = restaurant?.phone ?? "+962 7X XXX XXXX";
  const address = restaurant?.address ?? t("contactAddressDefault");
  const email = restaurant?.email;

  const handlePhone = async () => {
    if (!phone) return;

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch (error) {
      console.log("Could not open phone:", error);
    }
  };

  const handleEmail = async () => {
    if (!email) return;

    try {
      await Linking.openURL(`mailto:${email}`);
    } catch (error) {
      console.log("Could not open email:", error);
    }
  };

  const handleLocation = async () => {
    try {
      await Linking.openURL(RESTAURANT_MAPS_URL);
    } catch (error) {
      console.log("Could not open location:", error);
    }
  };

  const openInstagram = async () => {
    try {
      await Linking.openURL("https://instagram.com/");
    } catch (error) {
      console.log("Could not open Instagram:", error);
    }
  };

  const openFacebook = async () => {
    try {
      await Linking.openURL("https://facebook.com/");
    } catch (error) {
      console.log("Could not open Facebook:", error);
    }
  };

  const openTikTok = async () => {
    try {
      await Linking.openURL("https://tiktok.com/");
    } catch (error) {
      console.log("Could not open TikTok:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Opened from the Profile page now (no longer a tab), so it needs a way back */}
      <BackButton />
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isSmall ? 18 : 22,
            paddingBottom: BOTTOM_NAV_SPACE,
          },
        ]}
      >
        {/* ================================================= */}
        {/*                 DECORATIVE ELEMENTS               */}
        {/* ================================================= */}

        {/* Big phone on the LEFT */}
        <View
          pointerEvents="none"
          style={[
            styles.decorPhone,
            {
              left: 50,
              top: 20,
              transform: [{ rotate: "12deg" }],
            },
          ]}
        >
          <View style={styles.phoneOutline}>
            <View style={styles.phoneScreen}>
              <Text style={[styles.phoneText, dir.noSpacing]}>
                {t("contactPhoneText")}
              </Text>
            </View>

            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneHome} />
          </View>
        </View>

        {/* Fork - left lower side */}
        <View
          pointerEvents="none"
          style={[
            styles.decorFork,
            {
              left: -5,
              top: 810,
              transform: [{ rotate: "-18deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="silverware-fork"
            size={90}
            color={ORANGE}
          />
        </View>

        {/* Knife - right side */}
        <View
          pointerEvents="none"
          style={[
            styles.decorKnife,
            {
              right: 10,
              top: 750,
              transform: [{ rotate: "18deg" }],
            },
          ]}
        >
          <MaterialCommunityIcons name="silverware" size={80} color={TEAL} />
        </View>

        {/* ================================================= */}
        {/*                       HERO                        */}
        {/* ================================================= */}

        <Animated.View entering={enterDown(0)} style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="chatbubble-ellipses" size={15} color={ORANGE} />

            <Text style={[styles.heroBadgeText, dir.noSpacing]}>
              {t("contactBadge")}
            </Text>
          </View>
          {/*
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: isSmall ? 15 : 16,
              },
            ]}
          >
            Have a question, a craving, or just want to say hello? We’d love to
            hear from you.
          </Text>

          */}
        </Animated.View>

        {/* ================================================= */}
        {/*                 CONTACT CARD                      */}
        {/* ================================================= */}

        <Animated.View entering={enterUp(1)} style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons
                name="restaurant-outline"
                size={22}
                color={LIGHT_TEAL}
              />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{t("contactCardTitle")}</Text>

              <Text style={styles.cardSubtitle}>{t("contactCardSub")}</Text>
            </View>
          </View>

          {/* PHONE */}

          <Pressable
            onPress={handlePhone}
            style={({ pressed }) => [
              styles.contactRow,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconBox, styles.orangeSoft]}>
              <Ionicons name="call-outline" size={21} color={LIGHT_ORANGE} />
            </View>

            <View style={styles.info}>
              <Text style={[styles.label, dir.noSpacing]}>
                {t("contactPhone")}
              </Text>

              <Text
                style={[
                  styles.value,
                  {
                    fontSize: isSmall ? 14 : 15,
                  },
                ]}
                numberOfLines={2}
              >
                {phone}
              </Text>
            </View>

            <View style={[styles.arrow, styles.orangeSoft]}>
              <Ionicons name="arrow-forward" size={17} color={LIGHT_ORANGE} />
            </View>
          </Pressable>

          {/* LOCATION */}

          <Pressable
            onPress={handleLocation}
            style={({ pressed }) => [
              styles.contactRow,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconBox, styles.tealSoft]}>
              <Ionicons name="location-outline" size={21} color={LIGHT_TEAL} />
            </View>

            <View style={styles.info}>
              <Text style={[styles.label, dir.noSpacing]}>
                {t("contactLocation")}
              </Text>

              <Text
                style={[
                  styles.value,
                  {
                    fontSize: isSmall ? 14 : 15,
                  },
                ]}
                numberOfLines={3}
              >
                {address}
              </Text>
            </View>

            <View style={[styles.arrow, styles.tealSoft]}>
              <Ionicons name="arrow-forward" size={17} color={LIGHT_TEAL} />
            </View>
          </Pressable>
        </Animated.View>

        {/* ================================================= */}
        {/*                   OPENING HOURS                   */}
        {/* ================================================= */}

        <Animated.View entering={enterUp(2)} style={styles.hoursWrap}>
          {/* 3D slab: a darker base shows as a thick edge under the gradient face */}
          <View style={styles.hoursBase}>
            <LinearGradient
              colors={["#0B7A71", TEAL, "#003F3A"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hoursFace}
            >
              {/* soft light blobs for depth */}
              <View style={[styles.hoursGlow, styles.hoursGlowTop]} />
              <View style={[styles.hoursGlow, styles.hoursGlowBottom]} />

              <Text style={[styles.hoursTitle, dir.noSpacing]}>{t("contactHours")}</Text>
              <Text style={styles.hoursSubtitle}>{t("contactHoursSub")}</Text>

              {/* opening and closing time, centred; they follow the reading
                  direction so Arabic reads الافتتاح first */}
              <View style={[styles.hoursTimes, { flexDirection: dir.isRTL ? "row-reverse" : "row" }]}>
                <View style={styles.hoursSlot}>
                  <Text style={[styles.hoursLabel, dir.noSpacing]}>{t("contactOpensLabel")}</Text>
                  <Text style={styles.hoursClock}>8:00</Text>
                  <Text style={styles.hoursPeriod}>{t("contactOpenPeriod")}</Text>
                </View>

                <View style={styles.hoursSplit}>
                  <View style={styles.hoursSplitLine} />
                  <View style={styles.hoursSplitDot} />
                  <View style={styles.hoursSplitLine} />
                </View>

                <View style={styles.hoursSlot}>
                  <Text style={[styles.hoursLabel, dir.noSpacing]}>{t("contactClosesLabel")}</Text>
                  <Text style={styles.hoursClock}>2:00</Text>
                  <Text style={styles.hoursPeriod}>{t("contactClosePeriod")}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* clock badge floating on the top edge */}
          <View style={styles.hoursBadge}>
            <Ionicons name="time" size={26} color={ORANGE} />
          </View>
        </Animated.View>

        {/* ================================================= */}
        {/*                       SOCIAL                      */}
        {/* ================================================= */}

        <Animated.View entering={enterUp(3)} style={styles.socialSection}>
          <Text style={[styles.socialEyebrow, dir.noSpacing]}>
            {t("contactFollow")}
          </Text>

          <Text style={styles.socialTitle}>{t("contactSocialTitle")}</Text>

          <Text style={styles.socialSubtitle}>{t("contactSocialSub")}</Text>

          <View style={styles.socialRow}>
            <Pressable
              onPress={openFacebook}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="logo-facebook" size={23} color={TEAL} />
            </Pressable>

            <Pressable
              onPress={openInstagram}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="logo-instagram" size={23} color={ORANGE} />
            </Pressable>

            <Pressable
              onPress={openTikTok}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="logo-tiktok" size={23} color={TEAL} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ================================================= */}
        {/*                      BOTTOM                       */}
        {/* ================================================= */}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={ORANGE} />
          </View>
        )}
        <MadeBy />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  content: {
    flexGrow: 1,
    paddingTop: 70,
    position: "relative",
  },

  /* ================================================= */
  /*                 DECORATIVE PHONE                  */
  /* ================================================= */

  decorPhone: {
    position: "absolute",
    zIndex: 0,
    opacity: 0.9,
  },

  phoneOutline: {
    width: 125,
    height: 220,
    borderWidth: 7,
    borderColor: TEAL,
    borderRadius: 25,
    alignItems: "center",
    paddingTop: 14,
  },

  phoneScreen: {
    width: 101,
    height: 178,
    borderWidth: 3,
    borderColor: TEAL,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  phoneText: {
    color: ORANGE,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    transform: [{ rotate: "-12deg" }],
  },

  phoneSpeaker: {
    position: "absolute",
    top: 7,
    width: 30,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEAL,
  },

  phoneHome: {
    position: "absolute",
    bottom: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: TEAL,
  },

  /* ================================================= */
  /*                 DECORATIVE UTENSILS               */
  /* ================================================= */

  decorFork: {
    position: "absolute",
    opacity: 0.9,
    zIndex: 0,
  },

  decorKnife: {
    position: "absolute",
    opacity: 0.85,
    zIndex: 0,
  },

  /* ================================================= */
  /*                         HERO                      */
  /* ================================================= */

  hero: {
    marginBottom: 30,
    paddingHorizontal: 2,
    zIndex: 2,
  },

  heroBadge: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: LIGHT_ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 13,
  },

  heroBadgeText: {
    color: ORANGE,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1.1,
    // marginTop: 1,
  },

  subtitle: {
    color: TEAL,
    fontWeight: "500",
    lineHeight: 24,
    maxWidth: 520,
  },

  /* ================================================= */
  /*                 CONTACT CARD                      */
  /* ================================================= */

  contactCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECEDEB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 18,
    marginTop: 40,
    zIndex: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 19,
    paddingHorizontal: 2,
  },

  cardHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 3,
  },

  cardSubtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },

  contactRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },

  lastRow: {
    paddingBottom: 5,
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  orangeSoft: {
    backgroundColor: ORANGE,
  },

  tealSoft: {
    backgroundColor: TEAL,
  },

  purpleSoft: {
    backgroundColor: "#F1EDFF",
  },

  info: {
    flex: 1,
    minWidth: 0,
  },

  label: {
    color: "#9A9F9D",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  value: {
    color: DARK,
    fontWeight: "700",
    lineHeight: 21,
  },

  arrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* ================================================= */
  /*                 OPENING HOURS                    */
  /* ================================================= */

  hoursWrap: {
    marginTop: 26,
    marginBottom: 24,
    zIndex: 2,
  },

  // the darker slab peeking out below the face is what reads as "3D"
  hoursBase: {
    backgroundColor: "#00302C",
    borderRadius: 28,
    paddingBottom: 7,
    shadowColor: "#00302C",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },

  hoursFace: {
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.28)",
  },

  hoursGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  hoursGlowTop: { width: 190, height: 190, top: -95, right: -50 },

  hoursGlowBottom: { width: 150, height: 150, bottom: -80, left: -40 },

  hoursBadge: {
    position: "absolute",
    top: -26,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: LIGHT_ORANGE,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  hoursTitle: {
    color: WHITE,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
  },

  hoursSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  hoursTimes: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignSelf: "stretch",
  },

  hoursSlot: {
    flex: 1,
    alignItems: "center",
  },

  hoursLabel: {
    color: "#FFB59E",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  hoursClock: {
    color: WHITE,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },

  hoursPeriod: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
  },

  hoursSplit: {
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: 4,
  },

  hoursSplitLine: {
    flex: 1,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  hoursSplitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
    marginVertical: 6,
  },

  /* ================================================= */
  /*                     SOCIAL                       */
  /* ================================================= */

  socialSection: {
    alignItems: "center",
    marginBottom: 28,
    zIndex: 2,
  },

  socialEyebrow: {
    color: ORANGE,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 6,
  },

  socialTitle: {
    color: DARK,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  socialSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 15,
  },

  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECEDEB",
  },

  /* ================================================= */
  /*                      BOTTOM                       */
  /* ================================================= */

  bottomTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 10,
    zIndex: 2,
  },

  line: {
    height: 1,
    flex: 1,
    backgroundColor: "#DDDCD8",
  },

  bottomText: {
    color: "#9A9F9D",
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },

  loadingOverlay: {
    paddingVertical: 8,
    zIndex: 3,
  },

  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.99 }],
  },
});
