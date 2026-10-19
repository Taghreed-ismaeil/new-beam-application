import { usePathname } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";
const TEAL = "#005751";

// Staff screens keep their own layout; the login page has room for it too.
const HIDDEN_ON = ["/admin"];

/**
 * One small button in the top-right corner of every screen that flips the app
 * language. It shows the language you'd switch TO ("ع" while in English,
 * "EN" while in Arabic). Sits a little below the very top so it clears the
 * status bar and the screens' own top edge.
 */
export default function LangToggle() {
  const { lang, setLang } = useAppLang();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const toArabic = lang === "en";

  return (
    <Pressable
      onPress={() => setLang(toArabic ? "ar" : "en")}
      accessibilityRole="button"
      accessibilityLabel={toArabic ? "التبديل إلى العربية" : "Switch to English"}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { top: insets.top + 18 },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, toArabic && styles.labelAr]}>{toArabic ? "ع" : "EN"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 16,
    zIndex: 50,
    elevation: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1.5,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  label: {
    color: TEAL,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  labelAr: {
    fontSize: 17,
    letterSpacing: 0,
    marginTop: -2,
  },
});
