import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Banner, Btn, C, Field } from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";

export default function StaffLogin() {
  const { signIn, endedReason } = useStaff();
  const { t, toggle } = useI18n();
  const dir = useDirection();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  // Landing here because the shift session ran out is a different situation from opening the
  // panel cold, and saying so saves the "why am I signed out?" question.
  const notice =
    banner ??
    (endedReason === "staff_disabled"
      ? { text: t("staffDisabled") }
      : endedReason
        ? { text: t("staffSessionEnded") }
        : null);

  async function submit() {
    if (!phone.trim() || !password) {
      setBanner({ text: t("staffLoginMissing") });
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      await signIn(phone.trim(), password);
      router.replace("/admin");
    } catch (e) {
      // The server answers the same way for an unknown number and a wrong password, so this
      // message has to cover both without hinting which it was.
      setBanner({
        text:
          e?.status === 401
            ? t("staffLoginBad")
            : e?.data?.error === "staff_disabled"
              ? t("staffDisabled")
              : t("errOfflineText"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[C.teal, C.tealDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.topRow, dir.row]}>
            <Pressable onPress={() => router.replace("/")} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name={dir.back} size={20} color={C.white} />
            </Pressable>
            <Pressable onPress={toggle} style={[styles.langBtn, dir.row]} hitSlop={8}>
              <Ionicons name="language-outline" size={14} color={C.white} />
              <Text style={styles.langText}>{t("language")}</Text>
            </Pressable>
          </View>

          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={28} color={C.teal} />
          </View>

          <Text style={styles.title}>{t("staffLoginTitle")}</Text>
          <Text style={styles.subtitle}>{t("staffLoginSubtitle")}</Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.form}>
            <Banner value={notice} />

            <Field
              label={t("staffPhone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholder="07XXXXXXXX"
              style={{ textAlign: "left", writingDirection: "ltr" }}
            />
            <Field
              label={t("staffPassword")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              style={{ textAlign: "left", writingDirection: "ltr" }}
            />

            <Btn
              title={t("staffSignIn")}
              icon="log-in-outline"
              onPress={submit}
              loading={busy}
            />
          </View>

          <Text style={styles.note}>{t("staffLoginNote")}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1 },

  hero: {
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 44,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: C.teal,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  topRow: { alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  langBtn: {
    alignItems: "center",
    gap: 5,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  langText: { color: C.white, fontSize: fs(15), fontWeight: "800" },

  badge: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    color: C.white,
    fontSize: fs(27),
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: fs(15),
    lineHeight: fs(22),
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 10,
  },

  card: {
    marginTop: -26,
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 22,
    shadowColor: C.dark,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  form: { gap: 2 },

  note: {
    color: C.subtle,
    fontSize: fs(14),
    lineHeight: fs(19),
    textAlign: "center",
    marginTop: 22,
    paddingHorizontal: 12,
  },
});
