import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/BackButton";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { POLICIES, POLICY_IDS } from "@/lib/policies";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

// short names for the switcher at the top
const SHORT = {
  terms: ["Terms", "الشروط"],
  privacy: ["Privacy", "الخصوصية"],
  gifts: ["Gifts", "الهدايا"],
  content: ["Content", "المحتوى"],
  refunds: ["Refunds", "الاسترجاع"],
};

// "[[blank]]" in the texts = still to be filled in; shown in brackets
const clean = (s) => s.replace(/\[\[([^\]]+)\]\]/g, "[$1]");

// The app's legal documents, readable before signing in (linked from sign-up).
export default function PolicyScreen() {
  const { doc } = useLocalSearchParams();
  const { lang, dir } = useAppLang();
  const insets = useSafeAreaInsets();
  const id = POLICY_IDS.includes(doc) ? doc : "terms";
  const d = POLICIES[id][lang === "ar" ? "ar" : "en"];
  const ar = lang === "ar";

  return (
    <View style={styles.screen}>
      <BackButton style={{ top: insets.top + 10 }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* switch between the five documents */}
        <View style={[styles.chips, ar && styles.chipsAr]}>
          {POLICY_IDS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => router.setParams({ doc: p })}
              style={[styles.chip, p === id && styles.chipOn]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, p === id && styles.chipTextOn]}>
                {SHORT[p][ar ? 1 : 0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.title, dir.text]}>{d.title}</Text>
        <Text style={[styles.updated, dir.text]}>{d.updated}</Text>
        <View style={[styles.rule, ar && styles.ruleAr]} />

        {d.sections.map((s, i) => {
          if (s.table) {
            return (
              <View key={i} style={styles.table}>
                {[s.table.head, ...s.table.rows].map((row, r) => (
                  <View
                    key={r}
                    style={[
                      styles.tr,
                      dir.isRTL && styles.trAr,
                      r === 0 && styles.thRow,
                    ]}
                  >
                    {row.map((cell, c) => (
                      <Text
                        key={c}
                        style={[
                          styles.td,
                          c === 0 && styles.tdFirst,
                          r === 0 && styles.th,
                          dir.text,
                        ]}
                      >
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          }
          return (
            <View key={i}>
              {!!s.h && <Text style={[styles.h, dir.text]}>{s.h}</Text>}
              {s.body.map((line, j) => {
                const sub = line.startsWith("  ");
                const bullet = sub || line.startsWith("- ");
                const text = clean(
                  bullet ? line.replace(/^(- |\s+)/, "") : line,
                );
                if (!bullet)
                  return (
                    <Text key={j} style={[styles.p, dir.text]}>
                      {text}
                    </Text>
                  );
                return (
                  <View
                    key={j}
                    style={[
                      styles.li,
                      dir.isRTL && styles.liAr,
                      sub && (dir.isRTL ? styles.subAr : styles.sub),
                    ]}
                  >
                    <View style={[styles.dot, sub && styles.dotSub]} />
                    <Text style={[styles.liText, dir.text]}>{text}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WHITE },
  content: { paddingHorizontal: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chipsAr: { flexDirection: "row-reverse" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E3E9E7",
    backgroundColor: WHITE,
  },
  chipOn: { backgroundColor: TEAL, borderColor: TEAL },
  chipText: { color: TEAL, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: WHITE },
  title: { color: TEAL, fontSize: 24, fontWeight: "800" },
  updated: { color: MUTED, fontSize: 12.5, marginTop: 4 },
  ruleAr: { alignSelf: "flex-end" },
  rule: {
    height: 3,
    width: 56,
    backgroundColor: ORANGE,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 6,
  },
  h: {
    color: TEAL,
    fontSize: 16.5,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 8,
  },
  p: { color: DARK, fontSize: 14.5, lineHeight: 24, marginBottom: 8 },
  li: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 7,
  },
  liAr: { flexDirection: "row-reverse" },
  sub: { marginLeft: 18 },
  subAr: { marginRight: 18 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ORANGE,
    marginTop: 9,
  },
  dotSub: { backgroundColor: TEAL, width: 5, height: 5 },
  liText: { flex: 1, color: DARK, fontSize: 14.5, lineHeight: 23 },
  table: {
    borderWidth: 1,
    borderColor: "#DCE4E2",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 10,
  },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E8EEEC" },
  trAr: { flexDirection: "row-reverse" },
  thRow: { backgroundColor: TEAL, borderTopWidth: 0 },
  td: { flex: 1.6, padding: 10, color: DARK, fontSize: 13, lineHeight: 20 },
  tdFirst: { flex: 1, fontWeight: "700", color: TEAL },
  th: { color: WHITE, fontWeight: "800" },
});
