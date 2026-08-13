import { useState } from "react";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiRequest } from "@/lib/api-client";
import BackButton from "@/components/BackButton";

export default function NewReservationScreen() {
  const [partySize, setPartySize] = useState("2");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!date || !time) {
      Alert.alert("Please pick a date and time");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/api/reservations", {
        method: "POST",
        body: {
          partySize: Number(partySize),
          reservationTime: `${date}T${time}:00`,
          notes: notes || undefined,
        },
      });
      Alert.alert("Reservation sent ✅", "We'll confirm it shortly", [
        { text: "OK", onPress: () => router.replace("/reservations") },
      ]);
    } catch (e) {
      Alert.alert("Something went wrong", e?.message ?? "Please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Book a table</Text>

      <Text style={styles.label}>Party size</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={partySize} onChangeText={setPartySize} />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder="2026-08-01" value={date} onChangeText={setDate} />

      <Text style={styles.label}>Time (HH:MM)</Text>
      <TextInput style={styles.input} placeholder="19:30" value={time} onChangeText={setTime} />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={[styles.input, { height: 80 }]} multiline value={notes} onChangeText={setNotes} />

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
        <Text style={styles.submitBtnText}>{submitting ? "Booking..." : "Confirm reservation"}</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "900", color: "#111", marginTop: 10, marginBottom: 16 },
  label: { color: "#999", marginBottom: 6, marginTop: 14, fontWeight: "700" },
  input: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    color: "#111",
  },
  submitBtn: { backgroundColor: "#ff8c00", borderRadius: 40, padding: 16, alignItems: "center", marginTop: 28 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
