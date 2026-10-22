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

import Animated from "react-native-reanimated";

import BackButton from "@/components/BackButton";
import MadeBy from "@/components/MadeBy";
import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { enterDown, enterUp } from "@/lib/motion";

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
    apiRequest("/api/restaurant")
      .then((d) => {
        setRestaurant(d.restaurant);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
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
    if (!address) return;

    const query = encodeURIComponent(address);

    try {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`,
      );
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

        <Animated.View entering={enterUp(2)} style={styles.hoursCard}>
          <View style={styles.hoursHeader}>
            <View style={styles.hoursIcon}>
              <Ionicons name="time-outline" size={22} color={ORANGE} />
            </View>

            <View style={styles.hoursTitleWrap}>
              <Text style={styles.hoursTitle}>{t("contactHours")}</Text>
              {/*
              <Text style={styles.hoursSubtitle}>
                Come hungry, leave happy.
              </Text>
              */}
            </View>

            <View style={styles.openBadge}>
              <View style={styles.openDot} />

              <Text style={[styles.openText, dir.noSpacing]}>
                {t("contactOpen")}
              </Text>
            </View>
          </View>

          <View style={styles.hoursDivider} />

          {/* day on one side, its hours in a pill on the other — kept as two
              separate texts so Arabic never runs them together */}
          {[
            ["contactMonThu", "contactTime1"],
            ["contactFriSat", "contactTime2"],
            ["contactSun", "contactTime3"],
          ].map(([day, time], i) => (
            <View key={day} style={[styles.dayRow, i > 0 && styles.dayRowDivider]}>
              <Text style={styles.day} numberOfLines={1}>
                {t(day)}
              </Text>
              <View style={styles.timePill}>
                <Text style={[styles.time, { writingDirection: dir.isRTL ? "rtl" : "ltr" }]} numberOfLines={1}>
                  {t(time)}
                </Text>
              </View>
            </View>
          ))}
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

  hoursCard: {
    backgroundColor: TEAL,
    borderRadius: 27,
    padding: 19,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#FDE0D7",
    zIndex: 2,
  },

  hoursHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  hoursIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  hoursTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  hoursTitle: {
    color: ORANGE,
    fontSize: 17,
    fontWeight: "900",
    // next to the clock like in English, not pushed against the badge in Arabic
    textAlign: "left",
  },

  hoursSubtitle: {
    color: DARK,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500",
  },

  openBadge: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEAL,
    marginRight: 5,
  },

  openText: {
    color: TEAL,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  hoursDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: 16,
    marginBottom: 6,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
  },

  dayRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },

  // always on the left like the English layout, whatever the language
  day: {
    flex: 1,
    minWidth: 0,
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "left",
  },

  timePill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },

  time: {
    color: WHITE,
    fontSize: 12.5,
    fontWeight: "800",
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
