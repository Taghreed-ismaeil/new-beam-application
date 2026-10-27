import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/BackButton";
import MadeBy from "@/components/MadeBy";
import MyMediaPosts from "@/components/MyMediaPosts";
import { useAppLang } from "@/lib/app-lang";
import { AnimatedText, Text, TextInput } from "@/lib/arabic-font";
import { shareMedia } from "@/lib/media-api";
import { enterPop, enterUp } from "@/lib/motion";

/* =========================================================
   SHARE A PHOTO
   Take a photo or pick one, add an optional caption, share. It
   goes to staff for approval and then appears in the community
   feed — the screen says so, both before and after sending.
========================================================= */

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const SOFT_TEAL = "#337974";
const WHITE = "#FFFFFF";
const DARK = "#17201F";
const MUTED = "#68706E";
const CREAM = "#FFF9F4";
const BORDER = "#EEEAE5";

const PICKER_OPTIONS = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 5],
  quality: 0.8,
};

export default function SharePhoto() {
  const { t, dir } = useAppLang();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [asset, setAsset] = useState(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // the small "under review" window that pops up right after posting
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState("");

  async function pick(fromCamera) {
    setError("");
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError(t("mediaPermissionDenied"));
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets?.[0]) setAsset(result.assets[0]);
  }

  async function send() {
    if (!asset || sending) return;
    setSending(true);
    setError("");
    try {
      await shareMedia(asset, caption);
      setSent(true);
      setReviewOpen(true);
    } catch (e) {
      setError(e?.status === 429 ? t("mediaErrTooMany") : t("mediaErrUpload"));
    } finally {
      setSending(false);
    }
  }

  const previewWidth = Math.min(width - 48, 360);

  /* ================= SENT ================= */

  if (sent) {
    return (
      <View style={[styles.screen, styles.center]}>
        {/* Posts go live only after staff approve them — say so, with how long it takes */}
        <Modal
          visible={reviewOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setReviewOpen(false)}
        >
          <View style={styles.reviewBackdrop}>
            <Animated.View entering={enterPop(0)} style={styles.reviewCard}>
              <View style={styles.reviewIcon}>
                <Ionicons name="time-outline" size={34} color={ORANGE} />
              </View>
              <Text style={[styles.reviewTitle, dir.noSpacing]}>
                {t("mediaReviewTitle")}
              </Text>
              <Text style={styles.reviewText}>{t("mediaReviewText")}</Text>
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>24 - 48h</Text>
              </View>
              <Pressable
                onPress={() => setReviewOpen(false)}
                style={({ pressed }) => [
                  styles.primary,
                  { marginTop: 18 },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryText}>{t("mediaReviewOk")}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>

        <Animated.View entering={enterPop(0)} style={styles.sentIcon}>
          <Ionicons name="checkmark" size={46} color={WHITE} />
        </Animated.View>
        <AnimatedText entering={enterUp(1)} style={styles.sentTitle}>
          {t("mediaSentTitle")}
        </AnimatedText>
        <AnimatedText entering={enterUp(2)} style={styles.sentText}>
          {t("mediaSentText")}
        </AnimatedText>
        <Animated.View entering={enterUp(3)}>
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/media/community")
            }
            style={({ pressed }) => [
              styles.primary,
              { marginTop: 26 },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>{t("mediaCommunityTitle")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  /* ================= PICK + CAPTION ================= */

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackButton />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        <Text style={[styles.title, dir.noSpacing]}>
          {t("mediaShareTitle")}
        </Text>
        <Text style={styles.hint}>{t("mediaShareHint")}</Text>

        {/* Preview, or an empty frame inviting a photo */}
        <Pressable
          onPress={() => pick(false)}
          style={[
            styles.preview,
            { width: previewWidth, height: previewWidth * 1.25 },
          ]}
        >
          {asset ? (
            <Image
              source={{ uri: asset.uri }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="image-outline" size={54} color={SOFT_TEAL} />
            </View>
          )}
        </Pressable>

        <View style={[styles.pickRow, dir.row]}>
          <Pressable
            onPress={() => pick(true)}
            style={({ pressed }) => [
              styles.pickBtn,
              { backgroundColor: ORANGE },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="camera" size={20} color={WHITE} />
            <Text style={styles.pickText}>{t("mediaTakePhoto")}</Text>
          </Pressable>
          <Pressable
            onPress={() => pick(false)}
            style={({ pressed }) => [
              styles.pickBtn,
              { backgroundColor: TEAL },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="images" size={20} color={WHITE} />
            <Text style={styles.pickText}>{t("mediaPickPhoto")}</Text>
          </Pressable>
        </View>

        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder={t("mediaCaption")}
          placeholderTextColor="#A4A4A4"
          multiline
          maxLength={300}
          style={[styles.caption, dir.text]}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={send}
          disabled={!asset || sending}
          style={({ pressed }) => [
            styles.primary,
            (!asset || sending) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.primaryText}>{t("mediaPost")}</Text>
          )}
        </Pressable>

        {/* everything this customer shared — archive or delete from here */}
        <MyMediaPosts />
        <MadeBy />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 24,
  },

  title: {
    color: DARK,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  hint: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },

  preview: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: "#17201F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  previewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF5F4",
  },

  pickRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    alignSelf: "stretch",
  },

  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
  },

  pickText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
  },

  caption: {
    alignSelf: "stretch",
    marginTop: 16,
    minHeight: 80,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: DARK,
    textAlignVertical: "top",
  },

  error: {
    color: "#B4423A",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },

  primary: {
    alignSelf: "stretch",
    marginTop: 18,
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: "center",
  },

  primaryText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
  },

  disabled: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  /* ================= SENT ================= */

  reviewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,16,15,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  reviewCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: WHITE,
    borderRadius: 28,
    paddingTop: 26,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: "center",
  },

  reviewIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF0EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  reviewTitle: {
    color: DARK,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  reviewText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },

  reviewBadge: {
    marginTop: 14,
    backgroundColor: "#E8F5F2",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  reviewBadgeText: {
    color: TEAL,
    fontSize: 14,
    fontWeight: "900",
    writingDirection: "ltr",
  },

  sentIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  sentTitle: {
    color: DARK,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },

  sentText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
});
