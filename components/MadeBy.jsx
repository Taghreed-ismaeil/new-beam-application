import { StyleSheet, View } from "react-native";

import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";

/**
 * Small "Created by Virelix Solution" credit at the very end of a page's
 * scroll content — the same line the home page's footer shows. Pass `light`
 * on dark backgrounds. Sits at the bottom of the screen even when the page is
 * short, as long as the scroll content has `flexGrow: 1`.
 */
export default function MadeBy({ light = false, style }) {
  const { t, dir } = useAppLang();

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.line, light && styles.lineLight]} />
      <Text style={[styles.text, light && styles.textLight, dir.noSpacing]}>{t("footerCreated")}</Text>
      <View style={[styles.line, light && styles.lineLight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: "auto",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  line: {
    width: 26,
    height: 1,
    backgroundColor: "rgba(23,32,31,0.18)",
  },
  lineLight: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  text: {
    color: "rgba(23,32,31,0.45)",
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  textLight: {
    color: "rgba(255,255,255,0.7)",
  },
});
