import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import BackButton from "@/components/BackButton";
import { apiRequest } from "@/lib/api-client";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const DARK = "#17201F";
const MUTED = "#68706E";

const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";

const WHITE = "#FFFFFF";

const BOTTOM_NAV_SPACE = 110;

export default function ContactScreen() {
  const { width } = useWindowDimensions();

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
  const address = restaurant?.address ?? "Amman, Jordan";
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
              <Text style={styles.phoneText}>Let's talk.</Text>
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

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="chatbubble-ellipses" size={15} color={ORANGE} />

            <Text style={styles.heroBadgeText}>GET IN TOUCH</Text>
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
        </View>

        {/* ================================================= */}
        {/*                 CONTACT CARD                      */}
        {/* ================================================= */}

        <View style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons
                name="restaurant-outline"
                size={22}
                color={LIGHT_TEAL}
              />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>We’re here for you</Text>

              <Text style={styles.cardSubtitle}>
                Reach us anytime through one of the options below.
              </Text>
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
              <Text style={styles.label}>PHONE</Text>

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
              <Text style={styles.label}>LOCATION</Text>

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

          {/* EMAIL */}

          {!!email && (
            <Pressable
              onPress={handleEmail}
              style={({ pressed }) => [
                styles.contactRow,
                styles.lastRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconBox, styles.purpleSoft]}>
                <Ionicons name="mail-outline" size={21} color="#7057C9" />
              </View>

              <View style={styles.info}>
                <Text style={styles.label}>EMAIL</Text>

                <Text
                  style={[
                    styles.value,
                    {
                      fontSize: isSmall ? 14 : 15,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {email}
                </Text>
              </View>

              <View style={[styles.arrow, styles.purpleSoft]}>
                <Ionicons name="arrow-forward" size={17} color="#7057C9" />
              </View>
            </Pressable>
          )}
        </View>

        {/* ================================================= */}
        {/*                   OPENING HOURS                   */}
        {/* ================================================= */}

        <View style={styles.hoursCard}>
          <View style={styles.hoursHeader}>
            <View style={styles.hoursIcon}>
              <Ionicons name="time-outline" size={22} color={ORANGE} />
            </View>

            <View style={styles.hoursTitleWrap}>
              <Text style={styles.hoursTitle}>Opening Hours</Text>
              {/*
              <Text style={styles.hoursSubtitle}>
                Come hungry, leave happy.
              </Text>
              */}
            </View>

            <View style={styles.openBadge}>
              <View style={styles.openDot} />

              <Text style={styles.openText}>OPEN</Text>
            </View>
          </View>

          <View style={styles.hoursDivider} />

          <View style={styles.dayRow}>
            <Text style={styles.day}>Monday – Thursday</Text>

            <Text style={styles.time}>11:00 AM – 11:00 PM</Text>
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.day}>Friday – Saturday</Text>

            <Text style={styles.time}>12:00 PM – 12:00 AM</Text>
          </View>

          <View style={[styles.dayRow, styles.lastDayRow]}>
            <Text style={styles.day}>Sunday</Text>

            <Text style={styles.time}>12:00 PM – 10:00 PM</Text>
          </View>
        </View>

        {/* ================================================= */}
        {/*                       SOCIAL                      */}
        {/* ================================================= */}

        <View style={styles.socialSection}>
          <Text style={styles.socialEyebrow}>FOLLOW ALONG</Text>

          <Text style={styles.socialTitle}>Find us on social</Text>

          <Text style={styles.socialSubtitle}>
            Stay hungry. Stay connected.
          </Text>

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
        </View>

        {/* ================================================= */}
        {/*                      BOTTOM                       */}
        {/* ================================================= */}

        <View style={styles.bottomTextContainer}>
          <View style={styles.line} />

          <Text style={styles.bottomText}>WE CAN’T WAIT TO HEAR FROM YOU</Text>

          <View style={styles.line} />
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={ORANGE} />
          </View>
        )}
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
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  hoursDivider: {
    height: 1,
    backgroundColor: WHITE,
    marginVertical: 16,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },

  lastDayRow: {
    paddingBottom: 0,
  },

  day: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  time: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
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
