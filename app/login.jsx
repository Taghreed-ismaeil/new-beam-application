import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
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
        // New accounts still verify the phone once via OTP before the password takes effect.
        await apiRequest("/api/auth/otp/request", { method: "POST", body: { phone: phone.trim() } });
        setStep("otp");
      } else {
        const res = await apiRequest("/api/auth/login", {
          method: "POST",
          body: { phone: phone.trim(), password },
        });
        await login(res.token, res.user);
      }
    } catch (e) {
      if (!isRegister && e?.status === 401) {
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
        body: { phone: phone.trim(), code, name: name.trim() || undefined, password },
      });
      await login(res.token, res.user);
    } catch (e) {
      if (e?.data?.error === "name_required_for_new_user") {
        setError("No account with this number yet — switch to Register");
      } else {
        setError("Wrong or expired code, try again");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Background Shape */}
      <View style={styles.shape} />

      <View style={styles.card}>
        <Text style={styles.title}>{step === "otp" ? "Verify" : isRegister ? "Register" : "Login"}</Text>

        {step === "form" && (
          <>
            {isRegister && (
              <View style={styles.inputBox}>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#aaa"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
                <Ionicons name="person-outline" size={22} color="#ff8c00" />
              </View>
            )}

            <View style={styles.inputBox}>
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#aaa"
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <Ionicons name="call-outline" size={22} color="#ff8c00" />
            </View>

            <View style={styles.inputBox}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#aaa"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Ionicons name="lock-closed-outline" size={22} color="#ff8c00" />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={submitForm} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#ff8c00" />
              ) : (
                <Text style={styles.buttonText}>{isRegister ? "Register" : "Login"}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setError(""); }}>
              <Text style={styles.switchText}>
                {isRegister ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </>
        )}

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
              <Ionicons name="key-outline" size={22} color="#ff8c00" />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={verify} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#ff8c00" />
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

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shape: {
    position: "absolute",
    width: 650,
    height: 650,
    borderRadius: 325,
    backgroundColor: "#ff8c00",
    opacity: 0.08,
    top: -250,
    right: -220,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 35,
    borderWidth: 2,
    borderColor: "#ff8c00",
    backgroundColor: "#fff",
    shadowColor: "#ff8c00",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: "#ff8c00",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 40,
  },
  inputBox: {
    height: 55,
    borderBottomWidth: 2,
    borderBottomColor: "#ff8c00",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  input: {
    flex: 1,
    color: "#111",
    fontSize: 16,
  },
  button: {
    height: 45,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#ff8c00",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#ff8c00",
    fontSize: 16,
    fontWeight: "800",
  },
  switchText: {
    color: "#ff8c00",
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
    color: "#ff8c00",
    marginTop: 30,
    fontSize: 16,
  },
});
