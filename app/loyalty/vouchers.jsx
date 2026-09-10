import BackButton from "@/components/BackButton";
import { apiRequest } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function LoyaltyVouchersScreen() {
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    apiRequest("/api/loyalty/vouchers")
      .then((d) => setVouchers(d.vouchers))
      .catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      >
        {vouchers.length === 0 && (
          <Text style={styles.muted}>No rewards yet</Text>
        )}
        {vouchers.map((v) => (
          <View
            key={v.id}
            style={[styles.row, !!v.redeemedAt && styles.rowRedeemed]}
          >
            <View>
              <Text style={styles.name}>
                {v.menuItem?.nameEn || v.menuItem?.name || v.label}
              </Text>
              <Text style={styles.code}>Code: {v.code}</Text>
            </View>
            <Text
              style={[
                styles.badge,
                v.redeemedAt ? styles.badgeGray : styles.badgeGreen,
              ]}
            >
              {v.redeemedAt ? "Used" : "Ready to redeem"}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  muted: { color: "#999", textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  rowRedeemed: { opacity: 0.55 },
  name: { fontWeight: "800", color: "#111" },
  code: { color: "#999", fontSize: 12, marginTop: 2 },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  badgeGreen: { backgroundColor: "#e5f5ec", color: "#2f9e5b" },
  badgeGray: { backgroundColor: "#eee", color: "#999" },
});
