import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiRequest } from "@/lib/api-client";
import { useCart } from "@/context/CartContext";
import QrScanner from "@/components/QrScanner";
import BackButton from "@/components/BackButton";

export default function CheckoutScreen() {
  const { lines, total, clear } = useCart();
  const [orderType, setOrderType] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [address, setAddress] = useState("");
  const [table, setTable] = useState(null);
  const [scanningTable, setScanningTable] = useState(false);
  const [cliqAlias, setCliqAlias] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/api/restaurant").then((d) => setCliqAlias(d.restaurant?.cliqAlias ?? null));
  }, []);

  async function onTableToken(token) {
    setScanningTable(false);
    try {
      const res = await apiRequest(`/api/tables/resolve/${token}`);
      setTable(res.table);
    } catch {
      setError("That table QR code isn't valid");
    }
  }

  async function submit() {
    setError("");
    if (orderType === "delivery" && !address.trim()) return setError("Please enter a delivery address");
    if (orderType === "dine_in" && !table) return setError("Scan the table's QR code first");

    setBusy(true);
    try {
      const res = await apiRequest("/api/orders", {
        method: "POST",
        body: {
          orderType,
          paymentMethod,
          tableId: table?.id,
          deliveryAddress: orderType === "delivery" ? address.trim() : undefined,
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        },
      });
      clear();
      router.replace(`/order-tracking/${res.order.id}`);
    } catch {
      setError("Something went wrong placing the order, try again");
    } finally {
      setBusy(false);
    }
  }

  if (scanningTable) {
    return (
      <View style={styles.screen}>
        <BackButton />
        <QrScanner onDecode={onTableToken} />
        <TouchableOpacity onPress={() => setScanningTable(false)} style={{ marginTop: 12 }}>
          <Text style={{ textAlign: "center", color: "#999" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Checkout</Text>

      <Text style={styles.sectionTitle}>Order type</Text>
      <View style={styles.optionsRow}>
        {[
          ["pickup", "Pickup"],
          ["delivery", "Delivery"],
          ["dine_in", "Table"],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.option, orderType === value && styles.optionActive]}
            onPress={() => setOrderType(value)}
          >
            <Text style={[styles.optionText, orderType === value && styles.optionTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {orderType === "delivery" && (
        <TextInput style={styles.input} placeholder="Delivery address" value={address} onChangeText={setAddress} />
      )}

      {orderType === "dine_in" && (
        <View style={{ marginTop: 10 }}>
          {table ? (
            <Text style={styles.tableConfirmed}>✅ Table {table.tableNumber}</Text>
          ) : (
            <TouchableOpacity style={styles.scanTableBtn} onPress={() => setScanningTable(true)}>
              <Text style={styles.scanTableBtnText}>📷 Scan table QR code</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Payment</Text>
      <View style={styles.optionsRow}>
        {[
          ["cash", "Cash at restaurant"],
          ["cliq", "CliQ"],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.option, paymentMethod === value && styles.optionActive]}
            onPress={() => setPaymentMethod(value)}
          >
            <Text style={[styles.optionText, paymentMethod === value && styles.optionTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {paymentMethod === "cliq" && (
        <Text style={styles.muted}>
          {cliqAlias ? `Transfer to: ${cliqAlias}` : "CliQ alias not set yet"} — your order will wait for cashier confirmation
        </Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.total}>Total: {total.toFixed(2)} JD</Text>
      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Confirm order</Text>}
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "900", color: "#111", marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontWeight: "800", fontSize: 14, color: "#999", marginTop: 20, marginBottom: 10 },
  optionsRow: { flexDirection: "row", gap: 8 },
  option: { flex: 1, borderWidth: 2, borderColor: "#ff8c00", borderRadius: 14, padding: 12, alignItems: "center", backgroundColor: "#fff" },
  optionActive: { backgroundColor: "#ff8c00" },
  optionText: { color: "#ff8c00", fontWeight: "700" },
  optionTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, backgroundColor: "#fafafa", marginTop: 10 },
  scanTableBtn: { backgroundColor: "#fff5e8", borderWidth: 2, borderColor: "#ff8c00", borderRadius: 12, padding: 12, alignItems: "center" },
  scanTableBtnText: { fontWeight: "700", color: "#ff8c00" },
  tableConfirmed: { color: "#2f9e5b", fontWeight: "700", textAlign: "center" },
  muted: { color: "#999", marginTop: 8, fontSize: 13 },
  error: { color: "#c0392b", marginTop: 12 },
  total: { fontWeight: "900", fontSize: 18, marginTop: 24 },
  submitBtn: { backgroundColor: "#ff8c00", borderRadius: 40, padding: 15, alignItems: "center", marginTop: 12 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
