import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCart } from "@/context/CartContext";
import BackButton from "@/components/BackButton";

export default function CartScreen() {
  const { lines, setQuantity, total } = useCart();

  return (
    <View style={styles.screen}>
      <BackButton />
      <Text style={styles.title}>Your Cart 🛒</Text>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {lines.length === 0 && <Text style={styles.muted}>Your cart is empty</Text>}
        {lines.map((l) => (
          <View key={l.menuItemId} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{l.name}</Text>
              <Text style={styles.price}>{l.price.toFixed(2)} JD</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setQuantity(l.menuItemId, l.quantity - 1)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{l.quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(l.menuItemId, l.quantity + 1)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.total}>Total: {total.toFixed(2)} JD</Text>
        <TouchableOpacity
          style={[styles.checkoutBtn, lines.length === 0 && { opacity: 0.5 }]}
          disabled={lines.length === 0}
          onPress={() => router.push("/checkout")}
        >
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "900", color: "#111", textAlign: "center", marginTop: 20 },
  muted: { color: "#999", textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  name: { fontWeight: "800", fontSize: 15, color: "#111" },
  price: { color: "#ff8c00", marginTop: 2, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#fff5e8", borderWidth: 1, borderColor: "#ff8c00", justifyContent: "center", alignItems: "center" },
  stepBtnText: { fontSize: 16, fontWeight: "700", color: "#ff8c00" },
  qty: { minWidth: 20, textAlign: "center", fontWeight: "700" },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: "#eee", backgroundColor: "#fff" },
  total: { fontWeight: "800", fontSize: 17, marginBottom: 12 },
  checkoutBtn: { backgroundColor: "#ff8c00", borderRadius: 40, padding: 15, alignItems: "center" },
  checkoutBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
