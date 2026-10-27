import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { POLICIES, POLICY_IDS } from "@/lib/policies";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const INK = "#17201F";
const MUTED = "#7C8582";

// [[...]] in the policy text marks details still to be confirmed before launch.
// Dev builds highlight them yellow (as in the policies PDF) so they're easy to
// find; customers on a release build just see the plain text.
function Rich({ text, style }) {
  const parts = text.split(/\[\[(.+?)\]\]/);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        i % 2 && __DEV__ ? (
          <Text key={i} style={styles.pending}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

/**
 * Every policy in lib/policies.js as one document — laid out like the
 * policies PDF: a cover with the contents, then each policy in turn.
 * Opens scrolled to `policyId`, the link the customer tapped.
 */
export default function PolicySheet({ policyId, onClose }) {
  const { lang, t, dir } = useAppLang();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const offsets = useRef({});

  const docs = POLICY_IDS.map((id) => ({ id, ...POLICIES[id][lang] }));
  // The app never mirrors its layout in Arabic, but this page reproduces the
  // Arabic policies PDF — so inside the document, rows run right-to-left.
  const docRow = { flexDirection: lang === "ar" ? "row-reverse" : "row" };

  function jumpTo(id, animated = true) {
    const y = offsets.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated });
  }

  function onPolicyLayout(id, y) {
    offsets.current[id] = y;
    // first layout of the policy that was tapped — open right on it
    if (id === policyId) jumpTo(id, false);
  }

  return (
    <Modal visible={!!policyId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={[styles.topBar, dir.row]}>
          <Text style={[styles.topTitle, dir.text]}>{t("policyDocTitle")}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t("policyClose")}
          >
            <Ionicons name="close" size={28} color={ORANGE} />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
          {/* Cover */}
          <View style={styles.page}>
            <Text style={styles.restaurant}>{t("policyDocRestaurant")}</Text>
            <Text style={styles.brand}>Beam – Shawerma & More</Text>
            <Text style={styles.docTitle}>{t("policyDocTitle")}</Text>
            <View style={styles.tealRule} />

            <Text style={[styles.contains, dir.text]}>{t("policyDocContains")}</Text>
            {docs.map((d, i) => (
              <TouchableOpacity key={d.id} onPress={() => jumpTo(d.id)} style={[styles.tocRow, docRow]}>
                <Text style={styles.tocNum}>{i + 1}.</Text>
                <Text style={[styles.tocText, dir.text]}>{d.title}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.updated, styles.coverUpdated, dir.text]}>{docs[0].updated}</Text>
          </View>

          {/* One block per policy */}
          {docs.map((d) => (
            <View
              key={d.id}
              style={styles.page}
              onLayout={(e) => onPolicyLayout(d.id, e.nativeEvent.layout.y)}
            >
              <Text style={[styles.policyTitle, dir.text]}>{d.title}</Text>
              <View style={styles.orangeRule} />
              <Text style={[styles.updated, dir.text]}>{d.updated}</Text>

              {d.sections.map((s, si) =>
                s.table ? (
                  <View key={si} style={styles.table}>
                    {[s.table.head, ...s.table.rows].map((row, ri) => (
                      <View key={ri} style={[styles.tableRow, docRow, ri === 0 && styles.tableHead]}>
                        {row.map((cell, ci) => (
                          <Rich
                            key={ci}
                            text={cell}
                            style={[
                              styles.tableCell,
                              ci === 0 && styles.tableFirstCol,
                              ri === 0 && styles.tableHeadText,
                              dir.text,
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                <View key={si} style={styles.section}>
                  {!!s.h && <Text style={[styles.heading, dir.text]}>{s.h}</Text>}
                  {s.body.map((line, i) =>
                    line.startsWith("- ") ? (
                      <View key={i} style={[styles.bulletRow, docRow]}>
                        <View style={styles.bulletDot} />
                        <Rich text={line.slice(2)} style={[styles.para, styles.bulletText, dir.text]} />
                      </View>
                    ) : (
                      <Rich key={i} text={line} style={[styles.para, dir.text]} />
                    ),
                  )}
                </View>
                ),
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F1EE" },

  topBar: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E6DED8",
  },
  topTitle: { flex: 1, color: INK, fontSize: 17, fontWeight: "900" },

  body: { padding: 14, paddingBottom: 40, gap: 14 },

  // each policy sits on its own white "page", like the PDF
  page: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  /* cover */
  restaurant: { color: TEAL, fontSize: 28, fontWeight: "900", textAlign: "center", marginTop: 12 },
  brand: { color: ORANGE, fontSize: 13, textAlign: "center", marginTop: 4 },
  docTitle: { color: INK, fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 26 },
  tealRule: { height: 1.5, backgroundColor: TEAL, marginTop: 14, marginBottom: 22 },
  contains: { color: TEAL, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  tocRow: { gap: 8, paddingVertical: 6 },
  tocNum: { color: INK, fontSize: 14, fontWeight: "800" },
  tocText: { flex: 1, color: INK, fontSize: 14 },
  coverUpdated: { marginTop: 22, marginBottom: 6 },

  /* policy */
  policyTitle: { color: TEAL, fontSize: 21, fontWeight: "900" },
  orangeRule: { height: 1.5, backgroundColor: ORANGE, marginTop: 8, marginBottom: 8 },
  updated: { color: MUTED, fontSize: 12, marginBottom: 16 },
  section: { marginBottom: 16 },
  heading: { color: TEAL, fontSize: 16, fontWeight: "900", marginBottom: 8 },
  para: { color: INK, fontSize: 14, lineHeight: 23, marginBottom: 6 },
  bulletRow: { gap: 10, alignItems: "flex-start" },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 9 },
  bulletText: { flex: 1 },
  pending: { backgroundColor: "#FFF176" },

  table: { borderWidth: 1, borderColor: "#D9E3E1", borderRadius: 4, overflow: "hidden", marginBottom: 16 },
  tableRow: { borderTopWidth: 1, borderTopColor: "#D9E3E1" },
  tableHead: { backgroundColor: TEAL, borderTopWidth: 0 },
  tableCell: { flex: 2, color: INK, fontSize: 13, lineHeight: 20, padding: 8 },
  tableFirstCol: { flex: 1, fontWeight: "800" },
  tableHeadText: { color: "#fff", fontWeight: "900" },
});
