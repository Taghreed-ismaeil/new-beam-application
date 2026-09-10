import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const WHITE = "#fff";

const BEAM_LOGO = require("../assets/img/beam-logo.jpg");
// Logo file is 262x160 — the wrapper is sized off this exact ratio so its
// border always lands flush on the logo's edges, no matter the screen size.
const LOGO_ASPECT_RATIO = 262 / 160;

export default function Login() {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();

  const isSmall = width < 500;
  const isShort = height < 700;

  // Scales smoothly with screen width (instead of a small/large cutoff) so it
  // looks right on any phone, clamped so it's never too tiny or too huge.
  //const logoWidth = Math.min(Math.max(width * 0.5, 130), 200);
  //const logoHeight = logoWidth / LOGO_ASPECT_RATIO;

  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState("form"); // "form" | "otp" | "forgot-phone" | "forgot-reset"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitForm() {
    if (!phone.trim() || !password) {
      setError("Please enter your phone number and password");
      return;
    }

    if (isRegister && !name.trim()) {
      setError("Please enter your name");
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
      if (isRegister && e?.data?.error === "phone_already_registered") {
        setIsRegister(false);
        setError("This number already has an account — please log in instead");
      } else if (!isRegister && e?.data?.error === "account_deleted") {
        setError("This account no longer exists");
      } else if (!isRegister && e?.data?.error === "no_account_for_phone") {
        setError("No account with this number — switch to Register");
      } else if (!isRegister && e?.status === 401) {
        setError("Wrong phone number or password");
      } else {
        setError("Something went wrong, try again");
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
        setError("This number already has an account — please log in instead");
      } else if (e?.data?.error === "name_required_for_new_user") {
        setError("No account with this number yet — switch to Register");
      } else {
        setError("Wrong or expired code, try again");
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    if (!phone.trim()) {
      setError("Please enter your phone number");
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
    } catch {
      setError("Something went wrong, try again");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPasswordReset() {
    if (code.length !== 6 || newPassword.length < 6) {
      setError(
        "Enter the 6-digit code and a password of at least 6 characters",
      );
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
        setError("No account with this number — switch to Register");
      } else {
        setError("Wrong or expired code, try again");
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
      {/* =====================================================
          LOGO
      ====================================================== */}
      <View
        pointerEvents="none"
        style={[
          styles.logoWrapper,
          {
            width: isSmall ? 110 : 200,
            height: isSmall ? 71 : 100,
            marginBottom: isSmall ? 18 : 15,
          },
        ]}
      >
        <Image
          source={BEAM_LOGO}
          resizeMode="contain"
          style={{
            width: isSmall ? 145 : 175,
            height: isSmall ? 65 : 90,
          }}
        />
      </View>

      {/* =====================================================
          LOGIN CARD
      ====================================================== */}

      <View style={styles.card}>
        <Text style={styles.title}>
          {step === "otp"
            ? "Verify"
            : step === "forgot-phone" || step === "forgot-reset"
              ? "Reset Password"
              : isRegister
                ? "Register"
                : "Login"}
        </Text>

        {step === "form" && (
          <>
            {/* Name */}
            {isRegister && (
              <View style={styles.inputBox}>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#aaa"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />

                <Ionicons name="person-outline" size={22} color={ORANGE} />
              </View>
            )}

            {/* Phone */}
            <View style={styles.inputBox}>
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#aaa"
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Ionicons name="call-outline" size={22} color={ORANGE} />
            </View>

            {/* Password */}
            <View style={styles.inputBox}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#aaa"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Ionicons name="lock-closed-outline" size={22} color={ORANGE} />
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
                  {isRegister ? "Register" : "Login"}
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
                <Text style={styles.switchText}>Forgot password?</Text>
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
                {isRegister
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* =====================================================
            FORGOT PASSWORD — PHONE
        ====================================================== */}

        {step === "forgot-phone" && (
          <>
            <View style={styles.inputBox}>
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#aaa"
                style={styles.input}
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
                <Text style={styles.buttonText}>Send Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToForm}>
              <Text style={styles.switchText}>Back to login</Text>
            </TouchableOpacity>
          </>
        )}

        {/* =====================================================
            FORGOT PASSWORD — CODE + NEW PASSWORD
        ====================================================== */}

        {step === "forgot-reset" && (
          <>
            <View style={styles.inputBox}>
              <TextInput
                placeholder="6-digit code"
                placeholderTextColor="#aaa"
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />

              <Ionicons name="key-outline" size={22} color={ORANGE} />
            </View>

            <View style={styles.inputBox}>
              <TextInput
                placeholder="New Password"
                placeholderTextColor="#aaa"
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Ionicons name="lock-closed-outline" size={22} color={ORANGE} />
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
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToForm}>
              <Text style={styles.switchText}>Back to login</Text>
            </TouchableOpacity>
          </>
        )}

        {/* =====================================================
            OTP
        ====================================================== */}

        {step === "otp" && (
          <>
            <View style={styles.inputBox}>
              <TextInput
                placeholder="6-digit code"
                placeholderTextColor="#aaa"
                style={styles.input}
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
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep("form")}>
              <Text style={styles.switchText}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* =====================================================
          BOTTOM DECORATIONS
      ====================================================== */}

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    overflow: "hidden",
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

    borderWidth: 3,
    borderColor: ORANGE,
    backgroundColor: WHITE,

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
    padding: 35,
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
    marginBottom: 40,
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
