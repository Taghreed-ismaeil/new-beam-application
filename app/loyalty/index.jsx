import BackButton from "@/components/BackButton";
import TileImage from "@/components/TileImage";
import { apiRequest } from "@/lib/api-client";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoyaltyCollectionsScreen() {
  const [progress, setProgress] = useState([]);

  useFocusEffect(
    useCallback(() => {
      apiRequest("/api/loyalty/progress").then((d) => setProgress(d.progress));
    }, []),
  );

  return (
    <View style={styles.screen}>
      <BackButton />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collect & Win</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/loyalty/vouchers")}
          >
            <Text style={styles.headerBtnText}>🎁 My Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnPrimary]}
            onPress={() => router.push("/loyalty/scan")}
          >
            <Text style={[styles.headerBtnText, styles.headerBtnTextPrimary]}>
              📷 Scan QR
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {progress.map((item) => (
          <View key={item.id} style={styles.card}>
            <TileImage
              itemId={item.id}
              grayImage={item.grayImage}
              layers={item.layers}
              revealedCount={item.revealedCount}
              updatedAt={item.updatedAt}
              size={140}
            />
            <Text style={styles.cardName}>{item.nameEn || item.name}</Text>
            <Text style={styles.cardProgress}>
              {item.completed
                ? "Completed 🎉"
                : item.revealedCount > 0
                  ? "Collecting..."
                  : "Scan its QR to start"}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#111" },
  headerBtns: { flexDirection: "row", gap: 8, marginTop: 14 },
  headerBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ff8c00",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  headerBtnPrimary: { backgroundColor: "#ff8c00" },
  headerBtnText: { fontWeight: "800", color: "#ff8c00" },
  headerBtnTextPrimary: { color: "#fff" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    paddingBottom: 90,
    gap: 12,
    justifyContent: "center",
  },
  card: { width: 150, alignItems: "center" },
  cardName: { fontWeight: "800", marginTop: 6, color: "#111" },
  cardProgress: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
});
