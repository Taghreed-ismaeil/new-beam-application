import MadeBy from "@/components/MadeBy";
import GiftsBackdrop from "@/components/GiftsBackdrop";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Text, TextInput } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const WHITE = "#fff";

const BEAM_LOGO = require("../assets/img/beam_logoo.jpg");
// Logo file is 311x145 (it's actually a PNG despite the .jpg name). The image
// box is sized off this exact ratio and the border wraps that box, so the
// border always lands flush on the logo's edges on every screen size.
const LOGO_ASPECT_RATIO = 311 / 145;
const LOGO_BORDER = 3;

// Android (edge-to-edge) doesn't resize the window for the keyboard, so the
// scroll content gets the keyboard's height as extra bottom padding — that
// keeps every field and button reachable by scrolling while it's open.
// iOS handles this itself via automaticallyAdjustKeyboardInsets.
function useAndroidKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

// Eye button at the end of a password field — shows/hides what was typed.
function PasswordToggle({ visible, onToggle }) {
  const { t } = useAppLang();

  return (
    <TouchableOpacity
      onPress={onToggle}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={visible ? t("loginHidePassword") : t("loginShowPassword")}
    >
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={ORANGE} />
    </TouchableOpacity>
  );
}

export default function Login() {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  const { t, dir } = useAppLang();

  const isSmall = width < 380;
  const isShort = height < 700;
  const keyboardHeight = useAndroidKeyboardHeight();

  const logoWidth = Math.min(width * (isShort ? 0.42 : 0.55), 240);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;

  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState("form"); // "form" | "otp" | "forgot-phone" | "forgot-reset"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitForm() {
    if (!phone.trim() || !password) {
      setError(t("loginErrPhonePassword"));
      return;
    }

    if (isRegister && !name.trim()) {
      setError(t("loginErrName"));
      return;
    }

    // the server needs 6+ characters — say so now, not after the code screen
    if (isRegister && password.length < 6) {
      setError(t("loginErrPasswordShort"));
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (isRegister) {
        // purpose: "register" makes this fail immediately with "already registered" if the
        // number has an account — before the customer ever sees the code screen.
        await apiRequest("/api/auth/otp/request", {
          method: "POST",
          body: {
            phone: phone.trim(),
            purpose: "register",
          },
        });

        setStep("otp");
      } else {
        const res = await apiRequest("/api/auth/login", {
          method: "POST",
          body: {
            phone: phone.trim(),
            password,
          },
        });

        await login(res.token, res.user);
      }
    } catch (e) {
      const err = e?.data?.error;
      if (err === "invalid_phone") {
        setError(t("loginErrInvalidPhone"));
      } else if (isRegister && err === "phone_already_registered") {
        setIsRegister(false);
        setError(t("loginErrAlreadyRegistered"));
      } else if (!isRegister && err === "no_account_for_phone") {
        // no account yet → straight to Register, the number stays filled in
        setIsRegister(true);
        setError(t("loginErrNoAccount"));
      } else if (!isRegister && err === "account_deleted") {
        setIsRegister(true);
        setError(t("loginErrDeleted"));
      } else if (!isRegister && err === "password_not_set") {
        // old account from before passwords: registering finishes it (points and orders stay)
        setIsRegister(true);
        setError(t("loginErrSetPassword"));
      } else if (!isRegister && e?.status === 401) {
        setError(t("loginErrWrong"));
      } else {
        setError(t("loginErrGeneric"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (code.length !== 6) return;

    setBusy(true);
    setError("");

    try {
      const res = await apiRequest("/api/auth/otp/verify", {
        method: "POST",
        body: {
          phone: phone.trim(),
          code,
          name: name.trim() || undefined,
          password,
        },
      });

      await login(res.token, res.user);
    } catch (e) {
      if (e?.data?.error === "phone_already_registered") {
        // Don't let a second account form on the same number — send them to
        // Login instead of silently signing them into the existing one.
        setIsRegister(false);
        setStep("form");
        setError(t("loginErrAlreadyRegistered"));
      } else if (e?.data?.error === "name_required_for_new_user") {
        setError(t("loginErrNoAccountYet"));
      } else {
        setError(t("loginErrCode"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    if (!phone.trim()) {
      setError(t("loginErrPhone"));
      return;
    }

    setBusy(true);
    setError("");

    try {
      await apiRequest("/api/auth/otp/request", {
        method: "POST",
        body: { phone: phone.trim(), purpose: "reset" },
      });

      setStep("forgot-reset");
    } catch (e) {
      const err = e?.data?.error;
      setError(
        err === "no_account_for_phone"
          ? t("loginErrNoAccount")
          : err === "invalid_phone"
            ? t("loginErrInvalidPhone")
            : t("loginErrGeneric"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmPasswordReset() {
    if (code.length !== 6 || newPassword.length < 6) {
      setError(t("loginErrReset"));
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await apiRequest("/api/auth/password-reset/confirm", {
        method: "POST",
        body: { phone: phone.trim(), code, newPassword },
      });

      await login(res.token, res.user);
    } catch (e) {
      if (e?.data?.error === "no_account_for_phone") {
        setError(t("loginErrNoAccount"));
      } else {
        setError(t("loginErrCode"));
      }
    } finally {
      setBusy(false);
    }
  }

  function backToForm() {
    setStep("form");
    setError("");
    setCode("");
    setNewPassword("");
  }

  return (
    <View style={styles.container}>
      {/* same soft teal → cream → orange background as the Gifts pages */}
      <GiftsBackdrop moving />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 30 + keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
      {/* keyboardShouldPersistTaps="handled" already closes the keyboard when
          tapping empty space — no wrapper Pressable, it swallowed taps on native */}
      <View style={styles.inner}>
      {/* =====================================================
          LOGO
      ====================================================== */}
      <View
        pointerEvents="none"
        style={[
          styles.logoWrapper,
          {
            width: logoWidth + LOGO_BORDER * 2,
            height: logoHeight + LOGO_BORDER * 2,
            marginBottom: isShort ? 16 : 24,
          },
        ]}
      >
        <Image
          source={BEAM_LOGO}
          contentFit="cover"
          style={{ width: logoWidth, height: logoHeight }}
        />
      </View>

      {/* =====================================================
          LOGIN CARD
      ====================================================== */}

      <View style={[styles.card, { padding: isSmall ? 22 : 32 }]}>
        <Text style={[styles.title, { marginBottom: isShort ? 22 : 36 }]}>
          {step === "otp"
            ? t("loginVerify")
            : step === "forgot-phone" || step === "forgot-reset"
              ? t("loginResetPassword")
              : isRegister
                ? t("loginRegister")
                : t("accountLogin")}
        </Text>

        {step === "form" && (
          <>
            {/* Name */}
            {isRegister && (
              <View style={[styles.inputBox, dir.row]}>
                <TextInput
                  placeholder={t("loginUsername")}
                  placeholderTextColor="#aaa"
                  style={[styles.input, dir.text]}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />

                <Ionicons name="person-outline" size={22} color={ORANGE} />
              </View>
            )}

            {/* Phone */}
            <View style={[styles.inputBox, dir.row]}>
              <TextInput
                ref={phoneRef}
                placeholder={t("loginPhone")}
                placeholderTextColor="#aaa"
                style={[styles.input, dir.text]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <Ionicons name="call-outline" size={22} color={ORANGE} />
            </View>

            {/* Password */}
            <View style={[styles.inputBox, dir.row]}>
              <TextInput
                ref={passwordRef}
                placeholder={t("loginPassword")}
                placeholderTextColor="#aaa"
                style={[styles.input, dir.text]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={submitForm}
              />

              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            {/* Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={submitForm}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegister ? t("loginRegister") : t("accountLogin")}
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot password */}
            {!isRegister && (
              <TouchableOpacity
                onPress={() => {
                  setStep("forgot-phone");
                  setError("");
                }}
              >
                <Text style={styles.switchText}>{t("loginForgot")}</Text>
              </TouchableOpacity>
            )}

            {/* Switch */}
            <TouchableOpacity
              onPress={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              <Text style={styles.switchText}>
                {isRegister ? t("loginHaveAccount") : t("loginNoAccount")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* =====================================================
            FORGOT PASSWORD — PHONE
        ====================================================== */}

        {step === "forgot-phone" && (
          <>
            <View style={[styles.inputBox, dir.row]}>
              <TextInput
                placeholder={t("loginPhone")}
                placeholderTextColor="#aaa"
                style={[styles.input, dir.text]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Ionicons name="call-outline" size={22} color={ORANGE} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={requestPasswordReset}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <Text style={styles.buttonText}>{t("loginSendCode")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToForm}>
              <Text style={styles.switchText}>{t("loginBackToLogin")}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* =====================================================
            FORGOT PASSWORD — CODE + NEW PASSWORD
        ====================================================== */}

        {step === "forgot-reset" && (
          <>
            <View style={[styles.inputBox, dir.row]}>
              <TextInput
                placeholder={t("loginCode")}
                placeholderTextColor="#aaa"
                style={[styles.input, dir.text]}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />

              <Ionicons name="key-outline" size={22} color={ORANGE} />
            </View>

            <View style={[styles.inputBox, dir.row]}>
              <TextInput
                placeholder={t("loginNewPassword")}
                placeholderTextColor="#aaa"
                style={[styles.input, dir.text]}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={confirmPasswordReset}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <Text style={styles.buttonText}>{t("loginResetPassword")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToForm}>
              <Text style={styles.switchText}>{t("loginBackToLogin")}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* =====================================================
            OTP
        ====================================================== */}

        {step === "otp" && (
          <>
            <View style={[styles.inputBox, dir.row]}>
              <TextInput
                placeholder={t("loginCode")}
                placeholderTextColor="#aaa"
                style={[styles.input, dir.text]}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />

              <Ionicons name="key-outline" size={22} color={ORANGE} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={verify}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <Text style={styles.buttonText}>{t("loginVerify")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep("form")}>
              <Text style={styles.switchText}>{t("loginChangePhone")}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* =====================================================
          BOTTOM DECORATIONS
      ====================================================== */}

      {router.canGoBack() && (
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{t("loginBack")}</Text>
        </TouchableOpacity>
      )}
      </View>
        <MadeBy />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F4",
  },

  scroll: {
    flex: 1,
  },

  // flexGrow keeps everything centered when it fits, and lets it scroll when it
  // doesn't (small phones, or with the keyboard open)
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },

  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* =====================================================
     TOP DECOR
  ====================================================== */

  decorLarge: {
    position: "absolute",
    opacity: 0.22,
    zIndex: 0,
  },

  /* =====================================================
     LOGO
  ====================================================== */
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",

    borderWidth: LOGO_BORDER,
    borderColor: ORANGE,
    backgroundColor: WHITE,
    overflow: "hidden",

    padding: 0,

    shadowColor: ORANGE,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,

    zIndex: 2,
  },

  logo: {
    alignSelf: "center",
  },

  /* =====================================================
     CARD
  ====================================================== */

  card: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 2,
    borderColor: ORANGE,
    backgroundColor: WHITE,
    shadowColor: ORANGE,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },

  title: {
    color: ORANGE,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },

  /* =====================================================
     INPUTS
  ====================================================== */

  inputBox: {
    height: 55,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  input: {
    flex: 1,
    color: "#111",
    fontSize: 16,
  },

  /* =====================================================
     BUTTON
  ====================================================== */

  button: {
    height: 45,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: ORANGE,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  buttonText: {
    color: ORANGE,
    fontSize: 16,
    fontWeight: "800",
  },

  /* =====================================================
     BOTTOM DECOR
  ====================================================== */

  bottomDecor: {
    position: "absolute",
    opacity: 0.7,
    zIndex: 0,
  },

  /* =====================================================
     TEXT
  ====================================================== */

  switchText: {
    color: ORANGE,
    textAlign: "center",
    marginTop: 25,
    fontWeight: "700",
  },

  error: {
    color: "#c0392b",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },

  back: {
    color: ORANGE,
    marginTop: 30,
    fontSize: 16,
  },
});
