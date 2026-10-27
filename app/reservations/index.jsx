import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import MadeBy from "@/components/MadeBy";
import { apiRequest } from "@/lib/api-client";
import BackButton from "@/components/BackButton";
import { useAppLang } from "@/lib/app-lang";
import { Text } from "@/lib/arabic-font";
import { dayName, formatTime, monthName } from "@/lib/booking-format";

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

// label key + pill colors per status
const STATUS = {
  pending: { key: "resPending", color: "#A8650A", bg: "#FDF3E1" },
  confirmed: { key: "resConfirmed", color: TEAL, bg: LIGHT_TEAL },
  seated: { key: "resSeated", color: TEAL, bg: LIGHT_TEAL },
  completed: { key: "resCompleted", color: MUTED, bg: "#F1F2F1" },
  cancelled: { key: "resCancelled", color: "#C0392B", bg: "#FDECEA" },
  no_show: { key: "resNoShow", color: "#C0392B", bg: "#FDECEA" },
};

export default function MyReservationsScreen() {
  const { t, lang, dir } = useAppLang();
  // ?sent=1 after booking: show a thank-you strip on top
  const { sent } = useLocalSearchParams();
  const [reservations, setReservations] = useState(null);

  useFocusEffect(
    useCallback(() => {
      apiRequest("/api/reservations/mine")
        .then((d) => setReservations(d.reservations ?? []))
        .catch(() => setReservations([]));
    }, [])
  );

  return (
    <View style={styles.screen}>
      <BackButton />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, dir.text, dir.noSpacing]}>{t("resEyebrow")}</Text>
        <Text style={[styles.title, dir.text]}>{t("resTitle")}</Text>

        {sent === "1" && (
          <View style={[styles.sentBanner, dir.row]}>
            <Ionicons name="checkmark-circle" size={18} color={TEAL} />
            <Text style={[styles.sentText, dir.text]}>{t("resSent")}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.newBtn, dir.row]}
          onPress={() => router.push("/reservations/new")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={WHITE} />
          <Text style={styles.newBtnText}>{t("resNew")}</Text>
        </TouchableOpacity>

        {reservations === null ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
        ) : reservations.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={34} color={ORANGE} />
            </View>
            <Text style={styles.emptyTitle}>{t("resEmptyTitle")}</Text>
            <Text style={styles.emptyText}>{t("resEmptyText")}</Text>
          </View>
        ) : (
          reservations.map((r) => {
            const when = new Date(r.reservationTime);
            const hhmm = `${when.getHours()}:${String(when.getMinutes()).padStart(2, "0")}`;
            const status = STATUS[r.status] ?? STATUS.pending;
            return (
              <View key={r.id} style={[styles.card, dir.row]}>
                {/* date block: month on top, big day number */}
                <View style={styles.dateBlock}>
                  <Text style={styles.dateMonth} numberOfLines={1}>
                    {monthName(when, lang)}
                  </Text>
                  <Text style={styles.dateDay}>{when.getDate()}</Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, dir.text]}>
                    {dayName(when, lang)} · {formatTime(hhmm, lang)}
                  </Text>
                  <View style={[styles.metaRow, dir.row]}>
                    <Ionicons name="people-outline" size={13} color={MUTED} />
                    <Text style={styles.meta}>{r.partySize}</Text>
                    {!!r.table && (
                      <>
                        <Text style={styles.meta}> · </Text>
                        <Text style={styles.meta}>{t("trackTableNo", { n: r.table.tableNumber })}</Text>
                      </>
                    )}
                  </View>
                  <View style={[styles.pill, { backgroundColor: status.bg }]}>
                    <Text style={[styles.pillText, { color: status.color }]}>{t(status.key)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

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

  sentBanner: {
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: LIGHT_TEAL,
  },
  sentText: { flex: 1, color: TEAL, fontSize: 13, fontWeight: "700" },

  newBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    marginBottom: 18,
    shadowColor: ORANGE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  newBtnText: { color: WHITE, fontSize: 15, fontWeight: "900" },

  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 30 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: DARK, fontSize: 18, fontWeight: "900" },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 },

  card: {
    alignItems: "center",
    gap: 14,
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0E6E1",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  dateBlock: {
    width: 62,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
  },
  dateMonth: { color: ORANGE, fontSize: 10.5, fontWeight: "800" },
  dateDay: { color: DARK, fontSize: 22, fontWeight: "900" },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { color: DARK, fontSize: 15, fontWeight: "900" },
  metaRow: { alignItems: "center", gap: 4, marginTop: 3 },
  meta: { color: MUTED, fontSize: 12.5, fontWeight: "600" },
  pill: {
    alignSelf: "flex-start",
    marginTop: 7,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pillText: { fontSize: 11.5, fontWeight: "800" },
});
