import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { router, usePathname, type Href } from "expo-router";
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { NAV_GROUPS, ROLE_LABEL, SECTIONS } from "@/components/admin/nav";
import { C, RADIUS } from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";

const BEAM_LOGO = require("../../assets/img/beam_logoo.jpg");

/**
 * Persistent navigation for wide screens (desktop / tablet web). Styled after the logo:
 * brand-green panel with the logo's orange as the "you are here" marker.
 */
export default function Sidebar() {
  const { staff, can, signOut } = useStaff();
  const { t } = useI18n();
  const dir = useDirection();
  const pathname = usePathname();

  const isHome = pathname === "/admin" || pathname === "/admin/";
  const visible = SECTIONS.filter((s) => can(s.resource));

  function Item({ href, icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
    return (
      <Pressable
        onPress={() => router.navigate(href as Href)}
        style={({ hovered, pressed }: any) => [
          styles.item,
          dir.row,
          (hovered || pressed) && !active && styles.itemHover,
          active && styles.itemActive,
        ]}
      >
        <View style={[styles.marker, dir.isRTL ? styles.markerRTL : styles.markerLTR, active && styles.markerOn]} />
        <Ionicons name={icon} size={19} color={active ? C.orange : "rgba(255,255,255,0.72)"} />
        <Text style={[styles.itemText, dir.text, active && styles.itemTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.brand}>
        <Image source={BEAM_LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Item href="/admin" icon="grid-outline" label={t("navHome")} active={isHome} />

        {NAV_GROUPS.map(({ key, label }) => {
          const items = visible.filter((s) => s.group === key);
          if (!items.length) return null;
          return (
            <View key={key} style={styles.group}>
              <Text style={[styles.groupLabel, dir.text]}>{t(label)}</Text>
              {items.map((s) => (
                <Item
                  key={s.key}
                  href={s.href}
                  icon={s.icon}
                  label={t(s.title)}
                  active={pathname.startsWith(s.href)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      {!!staff && (
        <View style={[styles.footer, dir.row]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{staff.name?.trim()?.[0] ?? "?"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.userName, dir.text]} numberOfLines={1}>
              {staff.name}
            </Text>
            <Text style={[styles.userRole, dir.text]} numberOfLines={1}>
              {t(ROLE_LABEL[staff.role] ?? "admin")}
            </Text>
          </View>
          <Pressable onPress={signOut} hitSlop={8} style={styles.signOut} accessibilityLabel={t("signOut")}>
            <Ionicons name="log-out-outline" size={19} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 264, backgroundColor: C.teal, paddingTop: 22, paddingBottom: 16 },
  brand: { paddingHorizontal: 22, marginBottom: 18 },
  logo: { width: 150, height: 58 },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  group: { marginTop: 18 },
  groupLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: fs(14),
    fontWeight: "700",
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  item: {
    alignItems: "center",
    gap: 12,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md - 2,
    marginBottom: 2,
    position: "relative",
  },
  itemHover: { backgroundColor: "rgba(255,255,255,0.06)" },
  itemActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  itemText: { flex: 1, color: "rgba(255,255,255,0.82)", fontSize: fs(16.5), fontWeight: "600" },
  itemTextActive: { color: C.white, fontWeight: "700" },
  marker: { position: "absolute", top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: "transparent" },
  markerLTR: { left: 0 },
  markerRTL: { right: 0 },
  markerOn: { backgroundColor: C.orange },
  footer: {
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.white, fontSize: fs(17.5), fontWeight: "800" },
  userName: { color: C.white, fontSize: fs(16), fontWeight: "700" },
  userRole: { color: "rgba(255,255,255,0.6)", fontSize: fs(14.5), fontWeight: "500", marginTop: 1 },
  signOut: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
