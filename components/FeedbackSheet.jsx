import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Text, TextInput } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_TEAL = "#E8F5F2";
const LIGHT_ORANGE = "#FFF0EA";
const DARK = "#17201F";
const MUTED = "#68706E";

/**
 * Popup opened from the Account page.
 *   mode="rating"    — 5 teal stars + an optional note
 *   mode="complaint" — a written complaint that goes to the admin panel
 * Both POST to /api/feedback and show a short thank-you before closing.
 */
export default function FeedbackSheet({ mode, visible, onClose }) {
  const { t, dir } = useAppLang();
  const isRating = mode === "rating";

  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // fresh form every time it opens
  useEffect(() => {
    if (!visible) return;
    setStars(0);
    setMessage("");
    setSending(false);
    setSent(false);
    setError("");
  }, [visible]);

  // close by itself shortly after the thank-you shows
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [sent, onClose]);

  const canSend = isRating ? stars > 0 : message.trim().length >= 3;

  async function submit() {
    if (!canSend || sending) return;
    setSending(true);
    setError("");
    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        body: isRating
          ? { kind: "rating", rating: stars, message: message.trim() || undefined }
          : { kind: "complaint", message: message.trim() },
      });
      setSent(true);
    } catch (e) {
      setError(e?.status === 429 ? t("feedbackTooMany") : t("feedbackError"));
    } finally {
      setSending(false);
    }
  }

  const accent = isRating ? TEAL : ORANGE;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View entering={ZoomIn.duration(220)} style={styles.card}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={22} color={MUTED} />
          </Pressable>

          {sent ? (
            <View style={styles.thanks}>
              <View style={[styles.thanksIcon, { backgroundColor: isRating ? LIGHT_TEAL : LIGHT_ORANGE }]}>
                <Ionicons name={isRating ? "heart" : "checkmark-done"} size={34} color={accent} />
              </View>
              <Text style={styles.thanksTitle}>{t("feedbackThanks")}</Text>
              <Text style={styles.thanksText}>
                {isRating ? t("feedbackThanksRating") : t("feedbackThanksComplaint")}
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.headIcon, { backgroundColor: isRating ? LIGHT_TEAL : LIGHT_ORANGE }]}>
                <Ionicons
                  name={isRating ? "star" : "chatbox-ellipses-outline"}
                  size={26}
                  color={accent}
                />
              </View>

              <Text style={styles.title}>
                {isRating ? t("feedbackRateTitle") : t("feedbackComplaintTitle")}
              </Text>
              <Text style={styles.subtitle}>
                {isRating ? t("feedbackRateSub") : t("feedbackComplaintSub")}
              </Text>

              {isRating && (
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setStars(n)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${n}`}
                      style={({ pressed }) => pressed && styles.starPressed}
                    >
                      <Ionicons
                        name={n <= stars ? "star" : "star-outline"}
                        size={40}
                        color={TEAL}
                      />
                    </Pressable>
                  ))}
                </View>
              )}

              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={isRating ? t("feedbackRatePlaceholder") : t("feedbackComplaintPlaceholder")}
                placeholderTextColor="#9AA19F"
                multiline
                maxLength={isRating ? 1000 : 2000}
                textAlignVertical="top"
                style={[styles.input, dir.text, { borderColor: message ? accent : "#E3E7E6" }]}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                onPress={submit}
                disabled={!canSend || sending}
                style={({ pressed }) => [
                  styles.send,
                  { backgroundColor: accent },
                  (!canSend || sending) && styles.sendDisabled,
                  pressed && styles.starPressed,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendText}>{t("feedbackSend")}</Text>
                )}
              </Pressable>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,20,19,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
  },
  headIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13.5,
    color: MUTED,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
  },
  starPressed: {
    transform: [{ scale: 0.9 }],
  },
  input: {
    alignSelf: "stretch",
    minHeight: 110,
    maxHeight: 180,
    marginTop: 18,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: DARK,
    backgroundColor: "#FAFBFB",
  },
  error: {
    color: "#C62828",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  send: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  thanks: {
    alignItems: "center",
    paddingVertical: 18,
  },
  thanksIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  thanksTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: DARK,
  },
  thanksText: {
    fontSize: 14,
    color: MUTED,
    marginTop: 6,
    textAlign: "center",
  },
});
