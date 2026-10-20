import { usePathname } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

const ORANGE = "#FC4A14";

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
    elevation: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ORANGE,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ORANGE,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.92 }],
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  labelAr: {
    fontSize: 21,
    letterSpacing: 0,
    marginTop: -3,
  },
});
