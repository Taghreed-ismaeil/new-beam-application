import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiRequest } from "@/lib/api-client";
import BackButton from "@/components/BackButton";

const STATUS_LABEL = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};
const STATUS_COLOR = {
  pending: "#c9932e",
  confirmed: "#2f6fd6",
  seated: "#2f9e5b",
  completed: "#999",
  cancelled: "#c0392b",
  no_show: "#c0392b",
};

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    apiRequest("/api/reservations/mine").then((d) => setReservations(d.reservations));
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>My Reservations</Text>

      <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/reservations/new")}>
        <Text style={styles.newBtnText}>+ New reservation</Text>
      </TouchableOpacity>

      {reservations.length === 0 && <Text style={styles.muted}>No reservations yet</Text>}
      {reservations.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{new Date(r.reservationTime).toLocaleString()}</Text>
            <Text style={styles.rowSub}>
              {r.partySize} guests{r.table ? ` — Table ${r.table.tableNumber}` : ""}
            </Text>
          </View>
          <Text style={[styles.badge, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status] ?? r.status}</Text>
        </View>
      ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "900", color: "#111", marginTop: 20 },
  newBtn: { backgroundColor: "#ff8c00", borderRadius: 40, padding: 14, alignItems: "center", marginVertical: 16 },
  newBtnText: { color: "#fff", fontWeight: "800" },
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
  rowTitle: { fontWeight: "800", color: "#111" },
  rowSub: { color: "#999", fontSize: 12, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: "800", marginLeft: 8 },
});
