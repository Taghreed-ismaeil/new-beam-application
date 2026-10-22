import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import MadeBy from "@/components/MadeBy";
import { apiRequest } from "@/lib/api-client";
import BackButton from "@/components/BackButton";
import { useAppLang } from "@/lib/app-lang";
import { Text, TextInput } from "@/lib/arabic-font";
import { dayName, formatTime, isoDay } from "@/lib/booking-format";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";
const SOFT = "#F4F1ED";

const DAYS_AHEAD = 14;
const MAX_PARTY = 20;
// every half hour from noon to 11:30 pm
const SLOTS = Array.from({ length: 24 }, (_, i) => {
  const mins = 12 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

export default function NewReservationScreen() {
  const { t, lang, dir } = useAppLang();

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      return { iso: isoDay(d), date: d, offset: i };
    });
  }, []);

  const [partySize, setPartySize] = useState(2);
  const [day, setDay] = useState(days[0].iso);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // today: only times at least 30 minutes from now
  const slots = useMemo(() => {
    if (day !== days[0].iso) return SLOTS;
    const now = new Date();
    const earliest = now.getHours() * 60 + now.getMinutes() + 30;
    return SLOTS.filter((s) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= earliest;
    });
  }, [day, days]);

  function pickDay(iso) {
    setDay(iso);
    setError("");
    if (iso === days[0].iso) setTime("");
  }

  async function submit() {
    if (!time) {
      setError(t("resPickTime"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/api/reservations", {
        method: "POST",
        body: {
          partySize,
          reservationTime: `${day}T${time}:00`,
          notes: notes.trim() || undefined,
        },
      });
      router.replace({ pathname: "/reservations", params: { sent: "1" } });
    } catch {
      setError(t("resFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BackButton />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, dir.text, dir.noSpacing]}>{t("resEyebrow")}</Text>
        <Text style={[styles.title, dir.text]}>{t("resNew")}</Text>
        <Text style={[styles.subtitle, dir.text]}>{t("resNewSub")}</Text>

        {/* ================= PARTY SIZE ================= */}
        <View style={[styles.card, styles.partyRow, dir.row]}>
          <View style={[styles.partyLabel, dir.row]}>
            <View style={styles.iconBubble}>
              <Ionicons name="people-outline" size={18} color={ORANGE} />
            </View>
            <Text style={styles.cardTitle}>{t("resPartySize")}</Text>
          </View>
          <View style={[styles.stepper, dir.row]}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setPartySize((n) => Math.max(1, n - 1))}
              activeOpacity={0.7}
              hitSlop={6}
            >
              <Ionicons name="remove" size={16} color={ORANGE} />
            </TouchableOpacity>
            <Text style={styles.qty}>{partySize}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, styles.plusBtn]}
              onPress={() => setPartySize((n) => Math.min(MAX_PARTY, n + 1))}
              activeOpacity={0.7}
              hitSlop={6}
            >
              <Ionicons name="add" size={16} color={WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= DAY ================= */}
        <Text style={[styles.label, dir.text]}>{t("resDay")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayRow}
          style={styles.dayScroll}
        >
          {days.map((d) => {
            const on = d.iso === day;
            const top =
              d.offset === 0 ? t("resToday") : d.offset === 1 ? t("resTomorrow") : dayName(d.date, lang);
            return (
              <TouchableOpacity
                key={d.iso}
                style={[styles.dayChip, on && styles.dayChipOn]}
                onPress={() => pickDay(d.iso)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayTop, on && styles.chipTextOn]} numberOfLines={1}>
                  {top}
                </Text>
                <Text style={[styles.dayNum, on && styles.chipTextOn]}>{d.date.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= TIME ================= */}
        <Text style={[styles.label, dir.text]}>{t("resTime")}</Text>
        <View style={[styles.timeGrid, dir.row]}>
          {slots.map((s) => {
            const on = s === time;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.timeChip, on && styles.timeChipOn]}
                onPress={() => {
                  setTime(s);
                  setError("");
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeText, on && styles.chipTextOn]}>{formatTime(s, lang)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= NOTES ================= */}
        <Text style={[styles.label, dir.text]}>{t("resNotes")}</Text>
        <TextInput
          style={[styles.notes, dir.text]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder={t("resNotesPlaceholder")}
          placeholderTextColor="#A9B0AE"
        />

        {!!error && <Text style={[styles.error, dir.text]}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.submitBtnText}>{t("resConfirm")}</Text>
          )}
        </TouchableOpacity>

        <MadeBy />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WHITE },
  content: {
    flexGrow: 1,
    // clears the status bar + back button
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  eyebrow: { color: ORANGE, fontSize: 9, fontWeight: "900", letterSpacing: 1.5, marginBottom: 4 },
  title: { color: DARK, fontSize: 26, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4, marginBottom: 18 },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0E6E1",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTitle: { color: DARK, fontSize: 14.5, fontWeight: "800" },
  partyRow: { alignItems: "center", justifyContent: "space-between" },
  partyLabel: { alignItems: "center", gap: 10, flex: 1 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  // same pill stepper as the cart
  stepper: { alignItems: "center", backgroundColor: SOFT, borderRadius: 12, padding: 3 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBtn: { backgroundColor: TEAL },
  qty: { minWidth: 30, textAlign: "center", fontSize: 15, fontWeight: "900", color: DARK },

  label: { color: DARK, fontSize: 14, fontWeight: "800", marginTop: 22, marginBottom: 10 },

  dayScroll: { marginHorizontal: -20 },
  dayRow: { paddingHorizontal: 20, gap: 8 },
  dayChip: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: SOFT,
    alignItems: "center",
    gap: 2,
  },
  dayChipOn: { backgroundColor: ORANGE },
  dayTop: { color: MUTED, fontSize: 11, fontWeight: "700" },
  dayNum: { color: DARK, fontSize: 18, fontWeight: "900" },

  timeGrid: { flexWrap: "wrap", gap: 8 },
  timeChip: {
    width: "31%",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SOFT,
    alignItems: "center",
  },
  timeChipOn: { backgroundColor: TEAL },
  timeText: { color: DARK, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: WHITE },

  notes: {
    minHeight: 80,
    backgroundColor: "#FAFAF9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0EF",
    padding: 12,
    color: DARK,
    fontSize: 14,
    textAlignVertical: "top",
  },

  error: { color: ORANGE, fontSize: 13, fontWeight: "700", marginTop: 14 },

  submitBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: TEAL,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  submitBtnText: { color: WHITE, fontSize: 15, fontWeight: "900" },
});
