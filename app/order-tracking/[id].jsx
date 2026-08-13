import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import { API_BASE, apiRequest } from "@/lib/api-client";
import BackButton from "@/components/BackButton";

const STEPS = [
  { key: "pending", label: "Order received" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const orderId = Number(id);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    apiRequest(`/api/orders/${orderId}`).then((d) => setOrder(d.order));

    const socket = io(API_BASE);
    socket.on("order:updated", (updated) => {
      if (updated.id === orderId) setOrder(updated);
    });
    return () => socket.disconnect();
  }, [orderId]);

  if (!order) return <View style={styles.screen}><BackButton /></View>;

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);

  return (
    <View style={styles.screen}>
      <BackButton />
      <Text style={styles.title}>Order #{order.id}</Text>
      {order.status === "cancelled" ? (
        <Text style={styles.cancelled}>This order was cancelled</Text>
      ) : (
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s.key} style={styles.stepRow}>
              <View style={[styles.dot, i <= stepIndex && styles.dotActive]} />
              <Text style={[styles.stepLabel, i <= stepIndex && styles.stepLabelActive]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {order.paymentMethod === "cliq" && order.paymentStatus !== "paid" && (
        <Text style={styles.paymentNote}>Waiting for the cashier to confirm your payment</Text>
      )}

      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.homeBtnText}>Back to menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 22, fontWeight: "900", color: "#111", textAlign: "center", marginTop: 30, marginBottom: 30 },
  cancelled: { color: "#c0392b", textAlign: "center", fontWeight: "700" },
  steps: { gap: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#eee" },
  dotActive: { backgroundColor: "#ff8c00" },
  stepLabel: { color: "#999", fontSize: 15 },
  stepLabelActive: { color: "#111", fontWeight: "800" },
  paymentNote: { color: "#c0392b", textAlign: "center", marginTop: 20 },
  homeBtn: { marginTop: 40, alignItems: "center" },
  homeBtnText: { color: "#ff8c00", fontWeight: "800" },
});
