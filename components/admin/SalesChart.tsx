import React from "react";
import { fs } from "@/lib/admin-font";
import { StyleSheet, Text, View } from "react-native";

import { C } from "@/components/admin/ui";
import { useI18n } from "@/lib/i18n";

type Point = { date: string; value: number };

type SalesChartProps = {
  points?: Point[] | null;
  range: "day" | "week" | "month" | string;
  loading?: boolean;
};

const CHART_HEIGHT = 132;

export default function SalesChart({ points, range, loading }: SalesChartProps) {
  const { t, lang } = useI18n();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.bars}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.barTrack, { height: CHART_HEIGHT }]}>
              <View style={[styles.bar, styles.barSkeleton, { height: 14 + ((i * 17) % 60) }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!points || points.length === 0) {
    return (
      <View style={[styles.wrap, styles.emptyWrap]}>
        <Text style={styles.emptyText}>{t("chartEmpty")}</Text>
      </View>
    );
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const locale = lang === "ar" ? "ar-JO-u-ca-gregory" : "en-GB";

  function label(dateStr: string) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    if (range === "day") return d.toLocaleTimeString(locale, { hour: "2-digit" });
    return d.toLocaleDateString(locale, { day: "numeric", month: range === "month" ? "short" : undefined });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {points.map((p, i) => {
          const height = Math.max(4, (p.value / max) * (CHART_HEIGHT - 22));
          // the best period gets the solid brand colour; the rest stay soft so it reads at a glance
          const isPeak = p.value > 0 && p.value === max;
          return (
            <View key={`${p.date}-${i}`} style={[styles.barTrack, { height: CHART_HEIGHT }]}>
              <View style={[styles.bar, isPeak && styles.barPeak, { height }]} />
              <Text style={styles.barLabel} numberOfLines={1}>
                {label(p.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barTrack: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "100%", maxWidth: 26, borderRadius: 7, backgroundColor: "#B9D6D2" },
  barPeak: { backgroundColor: C.teal },
  barSkeleton: { backgroundColor: C.surfaceAlt },
  barLabel: { color: C.subtle, fontSize: fs(13), fontWeight: "600", marginTop: 8 },
  emptyWrap: { height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" },
  emptyText: { color: C.subtle, fontSize: fs(15.5) },
});
