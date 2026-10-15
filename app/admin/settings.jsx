import { useCallback, useEffect, useState } from "react";
import { fs } from "@/lib/admin-font";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ConfirmDialog,
  Empty,
  ErrorState,
  Field,
  ImageField,
  Loading,
  ToggleRow,
} from "@/components/admin/ui";
import {
  createDeliveryZone,
  deleteDeliveryZone,
  fetchSettings,
  updateDeliveryZone,
  updateSettings,
} from "@/lib/admin-api";
import { useStaff } from "@/context/StaffContext";
import { useDirection, useI18n } from "@/lib/i18n";

const EMPTY_ZONE = { name: "", nameEn: "", fee: "", isActive: true };

export default function AdminSettings() {
  const { can } = useStaff();
  const canEdit = can("settings", "edit");
  const { t, pick } = useI18n();
  const dir = useDirection();

  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [zoneEditing, setZoneEditing] = useState(null);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneBanner, setZoneBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setSettings(null);
    fetchSettings()
      .then((d) => setSettings(d.settings))
      .catch(setError);
  }, []);

  useEffect(load, [load]);

  const patch = (p) => setSettings((s) => (s ? { ...s, ...p } : s));
  const patchPayments = (p) => setSettings((s) => (s ? { ...s, payments: { ...s.payments, ...p } } : s));

  function failure(e) {
    return e?.status === 404 ? t("errRouteMissing") : (e?.message ?? t("errSaveFailed"));
  }

  async function save() {
    if (!settings.name?.trim() && !settings.nameEn?.trim()) {
      setBanner({ text: t("errNameRequired") });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const res = await updateSettings({
        name: settings.name?.trim() ?? "",
        nameEn: settings.nameEn?.trim() ?? "",
        logoUrl: settings.logoUrl ?? null,
        phone: settings.phone?.trim() || null,
        email: settings.email?.trim() || null,
        address: settings.address?.trim() || null,
        addressEn: settings.addressEn?.trim() || null,
        openingHours: settings.openingHours?.trim() || null,
        payments: settings.payments,
        delivery: { enabled: settings.delivery.enabled },
      });
      setSettings(res.settings);
      setBanner({ tone: "success", text: t("settingsSaved") });
    } catch (e) {
      setBanner({ text: failure(e) });
    } finally {
      setSaving(false);
    }
  }

  function openNewZone() {
    setZoneBanner(null);
    setZoneEditing({ ...EMPTY_ZONE });
  }

  function openEditZone(zone) {
    setZoneBanner(null);
    setZoneEditing({ ...zone, fee: String(zone.fee ?? "") });
  }

  async function saveZone() {
    if (!zoneEditing.name?.trim() && !zoneEditing.nameEn?.trim()) {
      setZoneBanner({ text: t("errNameRequired") });
      return;
    }
    const fee = Number(zoneEditing.fee);
    if (!Number.isFinite(fee) || fee < 0) {
      setZoneBanner({ text: t("errFeeInvalid") });
      return;
    }

    setZoneSaving(true);
    setZoneBanner(null);
    try {
      const body = { name: zoneEditing.name?.trim() ?? "", nameEn: zoneEditing.nameEn?.trim() ?? "", fee, isActive: zoneEditing.isActive !== false };
      if (zoneEditing.id) await updateDeliveryZone(zoneEditing.id, body);
      else await createDeliveryZone(body);
      setZoneEditing(null);
      load();
    } catch (e) {
      setZoneBanner({ text: failure(e) });
    } finally {
      setZoneSaving(false);
    }
  }

  function confirmDeleteZone() {
    setConfirm({
      title: t("confirmDeleteZone"),
      text: t("confirmDeleteZoneText"),
      confirmLabel: t("deleteZone"),
      onConfirm: async () => {
        setZoneSaving(true);
        try {
          await deleteDeliveryZone(zoneEditing.id);
          setZoneEditing(null);
          load();
        } catch (e) {
          setZoneBanner({ text: failure(e) });
        } finally {
          setZoneSaving(false);
        }
      },
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AdminHeader eyebrow={t("admin")} title={t("settingsTitle")} subtitle={t("settingsSubtitle")} />

        <View style={styles.body}>
          <Banner value={banner} />
          {!canEdit && <Banner value={{ tone: "info", text: t("readOnlyNotice") }} />}

          {error && <ErrorState error={error} onRetry={load} />}
          {!error && settings === null && <Loading text={t("loading")} />}

          {!error && settings && (
            <>
              <Text style={[styles.sectionTitle, dir.text]}>{t("settingsInfoSection")}</Text>
              <ImageField
                label={t("fieldLogo")}
                value={settings.logoUrl}
                folder="settings"
                onChange={(path) => patch({ logoUrl: path })}
                hint={t("logoHint")}
              />
              <Field label={t("fieldNameEn")} value={settings.nameEn ?? ""} onChangeText={(v) => patch({ nameEn: v })} placeholder="Beam" />
              <Field label={t("fieldNameAr")} value={settings.name ?? ""} onChangeText={(v) => patch({ name: v })} placeholder="بيم" />
              <Field
                label={t("fieldPhone")}
                value={settings.phone ?? ""}
                onChangeText={(v) => patch({ phone: v })}
                keyboardType="phone-pad"
                placeholder="+962 7 9000 0000"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field
                label={t("fieldEmail")}
                value={settings.email ?? ""}
                onChangeText={(v) => patch({ email: v })}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="hello@beem.jo"
                style={{ textAlign: "left", writingDirection: "ltr" }}
              />
              <Field label={t("fieldAddressEn")} value={settings.addressEn ?? ""} onChangeText={(v) => patch({ addressEn: v })} placeholder="Amman, Jordan" />
              <Field label={t("fieldAddressAr")} value={settings.address ?? ""} onChangeText={(v) => patch({ address: v })} placeholder="عمّان، الأردن" />
              <Field
                label={t("fieldOpeningHours")}
                value={settings.openingHours ?? ""}
                onChangeText={(v) => patch({ openingHours: v })}
                placeholder="10:00 - 01:00"
                hint={t("openingHoursHint")}
              />

              <Text style={[styles.sectionTitle, dir.text, { marginTop: 8 }]}>{t("settingsPaymentsSection")}</Text>
              <ToggleRow label={t("payment_cash")} value={settings.payments.cash} onValueChange={(v) => patchPayments({ cash: v })} disabled={!canEdit} />
              <ToggleRow label={t("payment_card")} value={settings.payments.card} onValueChange={(v) => patchPayments({ card: v })} disabled={!canEdit} />
              <ToggleRow label={t("payment_cliq")} value={settings.payments.cliq} onValueChange={(v) => patchPayments({ cliq: v })} disabled={!canEdit} />
              {settings.payments.cliq && (
                <Field
                  label={t("fieldCliqAlias")}
                  value={settings.payments.cliqAlias ?? ""}
                  onChangeText={(v) => patchPayments({ cliqAlias: v })}
                  autoCapitalize="none"
                  placeholder="BEAM-JO"
                  hint={t("cliqAliasHint")}
                  style={{ textAlign: "left", writingDirection: "ltr" }}
                />
              )}

              <Text style={[styles.sectionTitle, dir.text, { marginTop: 8 }]}>{t("settingsDeliverySection")}</Text>
              <ToggleRow
                label={t("deliveryEnabled")}
                value={settings.delivery.enabled}
                onValueChange={(v) => patch({ delivery: { ...settings.delivery, enabled: v } })}
                disabled={!canEdit}
              />

              {settings.delivery.zones.length === 0 && <Empty icon="map-outline" title={t("noZones")} text={t("noZonesHint")} />}

              {settings.delivery.zones.map((zone) => (
                <Pressable
                  key={zone.id}
                  onPress={() => openEditZone(zone)}
                  style={({ pressed }) => [styles.zoneRow, dir.row, pressed && styles.pressed]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.zoneName, dir.text]} numberOfLines={1}>
                      {pick(zone)}
                    </Text>
                    {zone.isActive === false && <Text style={[styles.zoneOff, dir.text]}>{t("inactive")}</Text>}
                  </View>
                  <Text style={styles.zoneFee}>
                    {Number(zone.fee).toFixed(2)} {t("currency")}
                  </Text>
                </Pressable>
              ))}

              {canEdit && (
                <View style={{ marginTop: 4, marginBottom: 20 }}>
                  <Btn title={t("addZone")} variant="ghost" icon="add" onPress={openNewZone} />
                </View>
              )}

              {canEdit && <Btn title={t("save")} icon="checkmark" onPress={save} loading={saving} />}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={zoneEditing !== null} transparent animationType="slide" onRequestClose={() => setZoneEditing(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>{zoneEditing?.id ? t("editZone") : t("newZone")}</Text>
              <Banner value={zoneBanner} />

              <Field label={t("fieldNameEn")} value={zoneEditing?.nameEn ?? ""} onChangeText={(v) => setZoneEditing((z) => ({ ...z, nameEn: v }))} placeholder="Downtown" />
              <Field label={t("fieldNameAr")} value={zoneEditing?.name ?? ""} onChangeText={(v) => setZoneEditing((z) => ({ ...z, name: v }))} placeholder="وسط البلد" />
              <Field
                label={t("fieldDeliveryFee")}
                value={zoneEditing?.fee ?? ""}
                onChangeText={(v) => setZoneEditing((z) => ({ ...z, fee: v }))}
                keyboardType="decimal-pad"
                placeholder="1.50"
              />
              <ToggleRow
                label={t("zoneActiveLabel")}
                value={zoneEditing?.isActive !== false}
                onValueChange={(v) => setZoneEditing((z) => ({ ...z, isActive: v }))}
              />

              <View style={{ gap: 9, marginTop: 6 }}>
                <Btn title={t("save")} icon="checkmark" onPress={saveZone} loading={zoneSaving} />
                {!!zoneEditing?.id && (
                  <Btn title={t("deleteZone")} variant="danger" icon="trash-outline" onPress={confirmDeleteZone} disabled={zoneSaving} />
                )}
                <Btn title={t("cancel")} variant="ghost" onPress={() => setZoneEditing(null)} disabled={zoneSaving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 60 },
  body: { paddingHorizontal: 20 },

  sectionTitle: { color: C.dark, fontSize: fs(15.5), fontWeight: "800", marginBottom: 12 },

  zoneRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 9,
    gap: 10,
  },
  zoneName: { color: C.dark, fontSize: fs(15.5), fontWeight: "800" },
  zoneOff: { color: C.muted, fontSize: fs(14), fontWeight: "700", marginTop: 2 },
  zoneFee: { color: C.teal, fontSize: fs(15), fontWeight: "800" },

  backdrop: { flex: 1, backgroundColor: "rgba(23,32,31,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  sheetGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: C.dark, fontSize: fs(22), fontWeight: "800", marginBottom: 18 },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
