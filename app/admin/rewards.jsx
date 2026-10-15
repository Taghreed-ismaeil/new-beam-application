import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ConfirmDialog,
  ErrorState,
  Field,
  ImageField,
  Loading,
  Pill,
  ToggleRow,
} from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import {
  createLoyaltyItem,
  deleteLoyaltyItem,
  fetchAdminMenu,
  fetchLoyaltyItems,
  fetchLoyaltyStats,
  fetchScans,
  fetchSettings,
  fetchVouchers,
  redeemVoucher,
  regenerateQrToken,
  updateLoyaltyItem,
  updateSettings,
  uploadImage,
} from "@/lib/admin-api";
import { imageUrl } from "@/lib/api-client";
import { useDirection, useI18n } from "@/lib/i18n";

const EMPTY = {
  menuItemId: null,
  name: "",
  nameEn: "",
  rewardValue: "",
  grayImage: null,
  layers: [],
  requiredPieces: 0,
  isActive: true,
  voucherValidDays: "",
};

const TIERS = ["normal", "rare", "super"];
const TIER_REVEALS = { normal: 1, rare: 2, super: 3 };
const TIER_TONE = { normal: "gray", rare: "orange", super: "teal" };
const TIER_COLOR = { normal: C.muted, rare: C.orange, super: C.teal };
/** The highest tier a collectible has a QR set up for — used to give each
 * card a rarity-appropriate accent, gacha-style (a plain card for a normal-
 * only collectible, a warmer glow once it has a rare or super tier too). */
const topTierOf = (item) =>
  item?.qrTokens?.super ? "super" : item?.qrTokens?.rare ? "rare" : "normal";

const TABS = ["collectibles", "scans", "vouchers", "stats"];

export default function AdminRewards() {
  const { can } = useStaff();
  const canEdit = can("rewards", "edit");
  const { t } = useI18n();
  const dir = useDirection();

  // Someone who can't edit collectibles (a cashier, say) isn't here to build QR templates —
  // they're here to hand over a prize. Land them straight on the tab that does that.
  const [tab, setTab] = useState(canEdit ? "collectibles" : "vouchers");
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AdminHeader eyebrow={t("admin")} title={t("rewardsTitle")} subtitle={t("rewardsSubtitle")} />

        <View style={styles.body}>
          <Banner value={banner} />
          {!canEdit && tab === "collectibles" && (
            <Banner value={{ tone: "info", text: t("readOnlyNotice") }} />
          )}

          <View style={[styles.tabs, dir.row]}>
            {TABS.map((key) => (
              <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabOn]}>
                <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
                  {t(`rewardsTab_${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === "collectibles" && (
            <CollectiblesTab canEdit={canEdit} setBanner={setBanner} setConfirm={setConfirm} saving={saving} setSaving={setSaving} />
          )}
          {tab === "scans" && <ScansTab />}
          {tab === "vouchers" && <VouchersTab setBanner={setBanner} />}
          {tab === "stats" && <StatsTab />}
        </View>
      </ScrollView>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

// ============================================================
//  Collectibles — the QR-per-tier editor
// ============================================================

function CollectiblesTab({ canEdit, setBanner, setConfirm, saving, setSaving }) {
  const { t, tn, pick } = useI18n();
  const dir = useDirection();

  const [items, setItems] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [addingLayer, setAddingLayer] = useState(false);

  // How many pieces each QR tier reveals — owner-configurable, read once here so both the
  // settings card below and the QR viewer's "reveals per scan" label agree with each other.
  const [tierReveals, setTierReveals] = useState(null);
  const [tierDraft, setTierDraft] = useState(null);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierBanner, setTierBanner] = useState(null);

  useEffect(() => {
    fetchSettings()
      .then((d) => {
        const tiers = d.settings.loyaltyTiers ?? TIER_REVEALS;
        setTierReveals(tiers);
        setTierDraft({ normal: String(tiers.normal), rare: String(tiers.rare), super: String(tiers.super) });
      })
      .catch(() => {
        setTierReveals(TIER_REVEALS);
        setTierDraft({ normal: "1", rare: "2", super: "3" });
      });
  }, []);

  async function saveTiers() {
    const parsed = {};
    for (const tier of TIERS) {
      const n = Number(tierDraft[tier]);
      if (!Number.isInteger(n) || n < 1) {
        setTierBanner({ text: t("errTierRevealsInvalid") });
        return;
      }
      parsed[tier] = n;
    }
    setTierSaving(true);
    setTierBanner(null);
    try {
      const res = await updateSettings({ loyaltyTiers: parsed });
      setTierReveals(res.settings.loyaltyTiers ?? parsed);
      setTierBanner({ tone: "success", text: t("settingsSaved") });
    } catch (e) {
      setTierBanner({ text: failure(e, t("errSaveFailed")) });
    } finally {
      setTierSaving(false);
    }
  }

  const patchDraft = (patch) => setEditing((e) => (e ? { ...e, ...patch } : e));

  const failure = (e, fallback) => (e?.status === 404 ? t("errRouteMissing") : (e?.message ?? fallback));

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    fetchLoyaltyItems()
      .then((d) =>
        setItems(
          (d.items ?? []).map((i) => ({
            ...i,
            layers: i.layers ?? [],
            requiredPieces: i.requiredPieces ?? (i.layers?.length ?? 0),
          })),
        ),
      )
      .catch((e) => {
        setError(e);
        setItems([]);
      });
    fetchAdminMenu()
      .then((d) => setMenuItems((d.categories ?? []).flatMap((c) => c.items ?? [])))
      .catch(() => setMenuItems([]));
  }, []);

  useEffect(load, [load]);

  async function addLayer() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setBanner({ text: t("errPhotoDenied") });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsMultipleSelection: true,
    });
    if (res.canceled) return;

    setAddingLayer(true);
    try {
      const paths = [];
      for (const asset of res.assets) paths.push(await uploadImage(asset, "rewards"));
      setEditing((e) => {
        if (!e) return e;
        const layers = [...e.layers, ...paths];
        const pieces = e.requiredPieces === e.layers.length ? layers.length : e.requiredPieces;
        return { ...e, layers, requiredPieces: pieces };
      });
    } catch (err) {
      setBanner({ text: failure(err, t("errUploadFailed")) });
    } finally {
      setAddingLayer(false);
    }
  }

  function removeLayer(index) {
    setEditing((e) => {
      if (!e) return e;
      const layers = e.layers.filter((_, i) => i !== index);
      const pieces = e.requiredPieces === e.layers.length ? layers.length : e.requiredPieces;
      return { ...e, layers, requiredPieces: pieces };
    });
  }

  async function save() {
    if (!editing.nameEn?.trim() && !editing.name?.trim()) return setBanner({ text: t("errRewardName") });
    if (!editing.rewardValue?.trim()) return setBanner({ text: t("errRewardValue") });
    const pieces = Number(editing.requiredPieces);
    if (!Number.isInteger(pieces) || pieces < 1) return setBanner({ text: t("errPiecesMin") });
    if (editing.layers.length < pieces) {
      return setBanner({ text: t("errNotEnoughLayers", { pieces, layers: editing.layers.length }) });
    }
    const validDays = editing.voucherValidDays === "" ? null : Number(editing.voucherValidDays);
    if (validDays !== null && (!Number.isInteger(validDays) || validDays < 1)) {
      return setBanner({ text: t("errVoucherDays") });
    }

    const body = {
      menuItemId: editing.menuItemId ?? null,
      name: editing.name?.trim() ?? "",
      nameEn: editing.nameEn?.trim() ?? "",
      rewardValue: editing.rewardValue.trim(),
      grayImage: editing.grayImage ?? null,
      layers: editing.layers,
      requiredPieces: pieces,
      isActive: editing.isActive !== false,
      voucherValidDays: validDays,
    };

    setSaving(true);
    setBanner(null);
    try {
      if (editing.id) await updateLoyaltyItem(editing.id, body);
      else await createLoyaltyItem(body);
      setEditing(null);
      load();
    } catch (e) {
      setBanner({ text: failure(e, t("errSaveFailed")) });
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    setConfirm({
      title: t("confirmDeleteReward"),
      text: t("confirmDeleteRewardText"),
      confirmLabel: t("deleteReward"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteLoyaltyItem(editing.id);
          setEditing(null);
          load();
        } catch (e) {
          setBanner({ text: failure(e, t("errDeleteFailed")) });
        } finally {
          setSaving(false);
        }
      },
    });
  }

  function confirmRegenerate(item, tier) {
    setConfirm({
      title: t("confirmRegenerate"),
      text: t("confirmRegenerateText"),
      confirmLabel: t("regenerateToken"),
      onConfirm: async () => {
        try {
          const res = await regenerateQrToken(item.id, tier);
          setQrFor((q) => (q ? { ...q, qrTokens: res.qrTokens, qrToken: res.qrToken } : q));
          load();
        } catch (e) {
          setBanner({ text: failure(e, t("errRegenerateFailed")) });
        }
      },
    });
  }

  async function toggleActive(item, next) {
    setItems((arr) => arr.map((i) => (i.id === item.id ? { ...i, isActive: next } : i)));
    try {
      await updateLoyaltyItem(item.id, { isActive: next });
    } catch {
      setItems((arr) => arr.map((i) => (i.id === item.id ? { ...i, isActive: !next } : i)));
      setBanner({ text: t("errRewardUnchanged") });
    }
  }

  const linkedName = (id) => {
    const m = menuItems.find((i) => i.id === id);
    return m ? pick(m) : null;
  };

  return (
    <>
      {canEdit && (
        <View style={styles.tierCard}>
          <Text style={[styles.fieldLabel, dir.text]}>{t("tierRevealsTitle")}</Text>
          <Text style={[styles.layerHint, dir.text]}>{t("tierRevealsHint")}</Text>

          <Banner value={tierBanner} />

          <View style={[styles.tierInputRow, dir.row]}>
            {TIERS.map((tier) => (
              <View key={tier} style={styles.tierInputCell}>
                <Pill text={t(`tier_${tier}`)} tone={TIER_TONE[tier]} />
                <TextInput
                  value={tierDraft?.[tier] ?? ""}
                  onChangeText={(v) =>
                    setTierDraft((d) => ({ ...d, [tier]: v.replace(/\D/g, "") }))
                  }
                  keyboardType="number-pad"
                  style={styles.tierInput}
                />
              </View>
            ))}
          </View>

          <Btn title={t("save")} icon="checkmark" onPress={saveTiers} loading={tierSaving} />
        </View>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {!error && items === null && <Loading text={t("loading")} />}

      {!error &&
        items?.map((item) => {
          const tierColor = TIER_COLOR[topTierOf(item)];
          return (
          <View key={item.id} style={[styles.card, { shadowColor: tierColor }]}>
            <View
              style={[
                styles.cardAccent,
                dir.isRTL ? { right: 0 } : { left: 0 },
                { backgroundColor: tierColor },
              ]}
            />
            <Pressable
              onPress={() =>
                setEditing({
                  ...item,
                  layers: item.layers ?? [],
                  requiredPieces: item.requiredPieces ?? (item.layers?.length ?? 0),
                  voucherValidDays: item.voucherValidDays ? String(item.voucherValidDays) : "",
                })
              }
              style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
            >
              <View style={[styles.thumb, { shadowColor: tierColor }]}>
                {item.grayImage ? (
                  <Image source={{ uri: imageUrl(item.grayImage) }} style={styles.thumbImg} />
                ) : (
                  <Ionicons name="color-palette-outline" size={20} color={C.placeholder} />
                )}
              </View>

              <View style={styles.cardText}>
                <Text style={[styles.cardName, dir.text]} numberOfLines={1}>
                  {pick(item)}
                </Text>
                <Text style={[styles.cardReward, dir.text]} numberOfLines={1}>
                  🎁 {item.rewardValue}
                </Text>
                <View style={[styles.badges, dir.row]}>
                  <Pill text={t(`tier_${topTierOf(item)}`)} tone={TIER_TONE[topTierOf(item)]} />
                  <Pill text={t("scansPill", { count: item.requiredPieces ?? 0 })} tone="orange" />
                  {!!item.menuItemId && linkedName(item.menuItemId) && (
                    <Pill text={linkedName(item.menuItemId)} tone="gray" />
                  )}
                  {item.stats?.completions != null && (
                    <Pill text={t("wonPill", { count: item.stats.completions })} tone="teal" />
                  )}
                </View>
              </View>

              <Switch
                value={item.isActive !== false}
                disabled={!canEdit}
                onValueChange={(v) => toggleActive(item, v)}
                trackColor={{ true: C.teal, false: C.borderStrong }}
                thumbColor={C.white}
              />
            </Pressable>

            <Pressable onPress={() => setQrFor(item)} style={({ pressed }) => [styles.qrStrip, dir.row, pressed && styles.pressed]}>
              <Ionicons name="qr-code-outline" size={15} color={C.teal} />
              <Text style={styles.qrToken} numberOfLines={1}>
                {item.qrTokens?.normal ?? item.qrToken ?? t("noToken")}
              </Text>
              <Text style={styles.qrCta}>{t("showQr")}</Text>
            </Pressable>
          </View>
          );
        })}

      {!error && items?.length === 0 && <Text style={[styles.empty, dir.text]}>{t("noRewards")}</Text>}

      {canEdit && editing === null && qrFor === null && (
        <Pressable
          onPress={() => setEditing({ ...EMPTY, layers: [] })}
          style={({ pressed }) => [styles.fab, dir.row, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={22} color={C.white} />
          <Text style={styles.fabText}>{t("newReward")}</Text>
        </Pressable>
      )}

      {/* ---------- editor ---------- */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, dir.text]}>{editing?.id ? t("editReward") : t("newRewardTitle")}</Text>

              <Field
                label={t("fieldRewardValue")}
                value={editing?.rewardValue ?? ""}
                onChangeText={(v) => patchDraft({ rewardValue: v })}
                placeholder={t("fieldRewardValue")}
                hint={t("rewardValueHint")}
              />
              <Field label={t("fieldCollectibleNameEn")} value={editing?.nameEn ?? ""} onChangeText={(v) => patchDraft({ nameEn: v })} />
              <Field label={t("fieldCollectibleNameAr")} value={editing?.name ?? ""} onChangeText={(v) => patchDraft({ name: v })} />

              <ImageField
                label={t("fieldLockedArt")}
                value={editing?.grayImage}
                folder="rewards"
                onChange={(path) => patchDraft({ grayImage: path })}
                hint={t("lockedArtHint")}
              />

              <Text style={[styles.fieldLabel, dir.text]}>{t("revealLayers")}</Text>
              <Text style={[styles.layerHint, dir.text]}>{t("revealLayersHint")}</Text>
              <View style={[styles.layerRow, dir.row]}>
                {(editing?.layers ?? []).map((path, i) => (
                  <View key={`${path}-${i}`} style={styles.layer}>
                    <Image source={{ uri: imageUrl(path) }} style={styles.layerImg} />
                    <Text style={styles.layerIndex}>{i + 1}</Text>
                    <Pressable onPress={() => removeLayer(i)} style={styles.layerRemove} hitSlop={6}>
                      <Ionicons name="close" size={12} color={C.white} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={addLayer}
                  disabled={addingLayer}
                  style={({ pressed }) => [styles.layerAdd, pressed && styles.pressed, addingLayer && { opacity: 0.5 }]}
                >
                  <Ionicons name={addingLayer ? "cloud-upload-outline" : "add"} size={20} color={C.teal} />
                </Pressable>
              </View>

              <Field
                label={t("fieldScansNeeded")}
                value={String(editing?.requiredPieces ?? 0)}
                onChangeText={(v) => patchDraft({ requiredPieces: Number(v.replace(/\D/g, "")) || 0 })}
                keyboardType="number-pad"
                hint={tn("layersUploaded", editing?.layers?.length ?? 0)}
              />

              <Field
                label={t("fieldVoucherDays")}
                value={editing?.voucherValidDays ?? ""}
                onChangeText={(v) => patchDraft({ voucherValidDays: v.replace(/\D/g, "") })}
                keyboardType="number-pad"
                placeholder="30"
                hint={t("voucherDaysHint")}
              />

              <Text style={[styles.fieldLabel, dir.text]}>{t("linkedItem")}</Text>
              <Text style={[styles.layerHint, dir.text]}>{t("linkedItemHint")}</Text>
              <View style={[styles.chips, dir.row]}>
                <Pressable
                  onPress={() => patchDraft({ menuItemId: null })}
                  style={[styles.chip, !editing?.menuItemId && styles.chipOn]}
                >
                  <Text style={[styles.chipText, !editing?.menuItemId && styles.chipTextOn]}>{t("none")}</Text>
                </Pressable>
                {menuItems.map((m) => {
                  const on = editing?.menuItemId === m.id;
                  return (
                    <Pressable key={m.id} onPress={() => patchDraft({ menuItemId: m.id })} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{pick(m)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <ToggleRow label={t("active")} value={editing?.isActive !== false} onValueChange={(v) => patchDraft({ isActive: v })} />

              {!editing?.id && <Text style={[styles.tokenNote, dir.text]}>{t("tokenNote")}</Text>}

              <View style={{ gap: 9, marginTop: 6 }}>
                {canEdit && <Btn title={t("save")} icon="checkmark" onPress={save} loading={saving} />}
                {canEdit && !!editing?.id && (
                  <Btn title={t("deleteReward")} variant="danger" icon="trash-outline" onPress={confirmDelete} disabled={saving} />
                )}
                <Btn title={t("cancel")} variant="ghost" onPress={() => setEditing(null)} disabled={saving} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------- QR viewer: all three tiers ---------- */}
      <Modal visible={qrFor !== null} transparent animationType="fade" onRequestClose={() => setQrFor(null)}>
        <View style={styles.qrBackdrop}>
          <View style={styles.qrSheet}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "100%" }}>
              <Text style={styles.qrTitle}>{pick(qrFor)}</Text>
              <Text style={styles.qrSub}>{qrFor?.rewardValue}</Text>

              {TIERS.map((tier) => {
                const token = qrFor?.qrTokens?.[tier] ?? (tier === "normal" ? qrFor?.qrToken : null);
                return (
                  <View key={tier} style={styles.tierBlock}>
                    <View style={[styles.tierHead, dir.row]}>
                      <Pill text={t(`tier_${tier}`)} tone={TIER_TONE[tier]} />
                      <Text style={styles.tierReveals}>{tn("revealsPerScan", (tierReveals ?? TIER_REVEALS)[tier])}</Text>
                    </View>

                    <View style={styles.qrBox}>
                      {token ? (
                        <QRCode value={token} size={140} backgroundColor="#fff" color={C.dark} />
                      ) : (
                        <Text style={styles.qrMissing}>{t("qrMissing")}</Text>
                      )}
                    </View>
                    <Text style={styles.qrCode}>{token}</Text>

                    {canEdit && !!token && (
                      <View style={{ alignSelf: "stretch", marginTop: 10 }}>
                        <Btn
                          title={t("regenerateToken")}
                          variant="danger"
                          icon="refresh"
                          onPress={() => confirmRegenerate(qrFor, tier)}
                        />
                      </View>
                    )}
                  </View>
                );
              })}

              <Text style={styles.qrHelp}>{t("qrPrintHint")}</Text>

              <View style={{ marginTop: 16, marginBottom: 4 }}>
                <Btn title={t("close")} variant="ghost" onPress={() => setQrFor(null)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============================================================
//  Scan log
// ============================================================

const SCAN_FILTERS = ["all", "revealed", "completed", "rejected"];

function ScansTab() {
  const { t, dir, pick } = useI18nAndDir();
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    fetchScans({ result: filter === "all" ? undefined : filter, limit: 60 })
      .then(setData)
      .catch((e) => {
        setError(e);
        setData({ scans: [], total: 0, counts: {} });
      });
  }, [filter]);

  useEffect(load, [load]);

  const when = (iso) => new Date(iso).toLocaleString();

  const RESULT_TONE = { revealed: "orange", completed: "teal", unknown_code: "danger", inactive: "gray" };
  const RESULT_COLOR = { revealed: C.orange, completed: C.teal, unknown_code: C.danger, inactive: C.muted };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, dir.row]}>
        {SCAN_FILTERS.map((key) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.filterOn]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextOn]}>
              {t(`scanFilter_${key}`)} {data?.counts?.[key] != null ? data.counts[key] : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error && <ErrorState error={error} onRetry={load} />}
      {!error && data === null && <Loading />}

      {!error &&
        data?.scans?.map((s) => {
          const resultColor = RESULT_COLOR[s.result] ?? C.muted;
          return (
          <View key={s.id} style={[styles.logRow, { shadowColor: resultColor }]}>
            <View
              style={[
                styles.logAccent,
                dir.isRTL ? { right: 0 } : { left: 0 },
                { backgroundColor: resultColor },
              ]}
            />
            <View style={[styles.logTop, dir.row]}>
              <Text style={[styles.logMain, dir.text]} numberOfLines={1}>
                {s.customer?.name ?? t("unknownScanner")}
              </Text>
              <Pill text={t(`scanResult_${s.result}`)} tone={RESULT_TONE[s.result] ?? "gray"} />
              {!!s.tier && <Pill text={t(`tier_${s.tier}`)} tone={TIER_TONE[s.tier]} />}
            </View>
            <Text style={[styles.logDetail, dir.text]}>
              {s.item ? pick(s.item) : s.token}
              {(s.result === "revealed" || s.result === "completed") && ` · ${s.from}→${s.to}`}
              {!!s.voucherCode && ` · ${t("voucherWon")} ${s.voucherCode}`}
            </Text>
            <Text style={[styles.logWhen, dir.text]}>{when(s.at)}</Text>
          </View>
          );
        })}

      {!error && data?.scans?.length === 0 && <Text style={[styles.empty, dir.text]}>{t("scansEmpty")}</Text>}
    </>
  );
}

// ============================================================
//  Vouchers
// ============================================================

const VOUCHER_FILTERS = ["all", "valid", "redeemed", "expired"];

const VOUCHERS_PAGE_SIZE = 100;

function VouchersTab({ setBanner }) {
  const { t, tn, dir } = useI18nAndDir();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [redeeming, setRedeeming] = useState(null);
  const [lookup, setLookup] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);

  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(search.trim()), 350);
    return () => timer.current && clearTimeout(timer.current);
  }, [search]);

  // This list is the inventory record for every prize ever won, so it can't quietly stop at
  // page one once a restaurant has handed out more than a screenful — it has to actually be
  // able to reach all of them, the same "load more" pattern as the customers screen.
  const load = useCallback(
    (page = 1) => {
      setError(null);
      if (page === 1) setData(null);
      else setLoadingMore(true);

      return fetchVouchers({
        state: filter === "all" ? undefined : filter,
        search: query || undefined,
        limit: VOUCHERS_PAGE_SIZE,
        page,
      })
        .then((res) => {
          setData((prev) =>
            page === 1 || !prev ? res : { ...res, vouchers: [...prev.vouchers, ...res.vouchers] },
          );
        })
        .catch((e) => {
          if (page === 1) {
            setError(e);
            setData({ vouchers: [], total: 0, page: 1, counts: {} });
          }
        })
        .finally(() => setLoadingMore(false));
    },
    [filter, query],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const hasMore = (data?.vouchers?.length ?? 0) < (data?.total ?? 0);

  async function doRedeem(code) {
    setRedeeming(code);
    setBanner(null);
    try {
      await redeemVoucher(code);
      load(1);
    } catch (e) {
      const map = {
        voucher_not_found: t("voucherNotFound"),
        already_redeemed: t("voucherAlreadyRedeemed"),
        voucher_expired: t("voucherExpiredErr"),
        role_cannot_redeem: t("roleCannotRedeem"),
      };
      setBanner({ text: map[e?.data?.error] ?? t("errSaveFailed") });
    } finally {
      setRedeeming(null);
    }
  }

  async function submitLookup() {
    if (!lookup.trim()) return;
    setLookupBusy(true);
    await doRedeem(lookup.trim());
    setLookupBusy(false);
    setLookup("");
  }

  const when = (iso) => new Date(iso).toLocaleDateString();
  const timeOnly = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dayHeader = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const STATE_TONE = { valid: "teal", redeemed: "gray", expired: "danger" };
  const STATE_COLOR = { valid: C.teal, redeemed: C.muted, expired: C.danger };

  // For record-keeping: every prize a customer has ever won, split by the day it was won —
  // a "won today" screen a manager can hand to whoever does the inventory count. Newest day
  // first, newest voucher first within a day.
  const byDay = useMemo(() => {
    const groups = new Map();
    for (const v of data?.vouchers ?? []) {
      const key = new Date(v.createdAt).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(v);
    }
    return [...groups.values()]
      .map((items) => items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      .sort((a, b) => new Date(b[0].createdAt) - new Date(a[0].createdAt));
  }, [data]);

  return (
    <>
      <View style={styles.redeemBox}>
        <Text style={[styles.blockLabel, dir.text]}>{t("redeemBoxTitle")}</Text>
        <View style={[styles.redeemRow, dir.row]}>
          <TextInput
            value={lookup}
            onChangeText={(v) => setLookup(v.toUpperCase())}
            placeholder={t("redeemPlaceholder")}
            placeholderTextColor={C.placeholder}
            autoCapitalize="characters"
            style={styles.redeemInput}
          />
          <Btn title={t("redeem")} icon="checkmark" onPress={submitLookup} loading={lookupBusy} />
        </View>
      </View>

      <View style={[styles.searchBox, dir.row]}>
        <Ionicons name="search" size={16} color={C.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("voucherSearchPlaceholder")}
          placeholderTextColor={C.placeholder}
          style={[styles.searchInput, dir.text]}
          autoCapitalize="none"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, dir.row]}>
        {VOUCHER_FILTERS.map((key) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.filterOn]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextOn]}>
              {t(`voucherFilter_${key}`)} {data?.counts?.[key] != null ? data.counts[key] : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error && <ErrorState error={error} onRetry={() => load(1)} />}
      {!error && data === null && <Loading />}

      {!error &&
        byDay.map((items) => (
          <View key={items[0].createdAt}>
            <View style={[styles.dateHeaderRow, dir.row]}>
              <Text style={[styles.dateHeader, dir.text]}>{dayHeader(items[0].createdAt)}</Text>
              <Pill text={tn("wonCount", items.length)} tone="gray" />
            </View>

            {items.map((v) => {
              const stateColor = STATE_COLOR[v.state] ?? C.muted;
              return (
              <View key={v.id} style={[styles.card, { shadowColor: stateColor }]}>
                <View
                  style={[
                    styles.cardAccent,
                    dir.isRTL ? { right: 0 } : { left: 0 },
                    { backgroundColor: stateColor },
                  ]}
                />
                <View style={[styles.cardMain, dir.row]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={[styles.voucherTop, dir.row]}>
                      <Text style={styles.voucherCode}>{v.code}</Text>
                      <Pill text={t(`voucherState_${v.state}`)} tone={STATE_TONE[v.state]} />
                    </View>
                    <Text style={[styles.cardReward, dir.text]} numberOfLines={1}>
                      🎁 {v.reward}
                    </Text>
                    <Text style={[styles.logDetail, dir.text]}>
                      {v.customer?.name ?? t("unnamed")} · {v.customer?.phone ?? ""}
                    </Text>
                    <Text style={[styles.logWhen, dir.text]}>
                      {t("wonAt", { when: timeOnly(v.createdAt) })}
                      {v.state === "redeemed"
                        ? ` · ${
                            v.redeemedBy?.name
                              ? t("redeemedOn", { when: when(v.redeemedAt), by: v.redeemedBy.name })
                              : t("redeemedOnUnknown", { when: when(v.redeemedAt) })
                          }`
                        : ` · ${t("expiresOn", { when: when(v.expiresAt) })}`}
                    </Text>
                  </View>
                  {v.can?.redeem && (
                    <Btn title={t("redeem")} onPress={() => doRedeem(v.code)} loading={redeeming === v.code} />
                  )}
                </View>
              </View>
              );
            })}
          </View>
        ))}

      {!error && data?.vouchers?.length === 0 && <Text style={[styles.empty, dir.text]}>{t("vouchersEmpty")}</Text>}

      {!error && hasMore && (
        <View style={{ marginTop: 4 }}>
          {loadingMore ? (
            <ActivityIndicator size="small" color={C.teal} />
          ) : (
            <Btn
              title={t("loadMore", { count: Math.min(VOUCHERS_PAGE_SIZE, (data?.total ?? 0) - (data?.vouchers?.length ?? 0)) })}
              variant="ghost"
              icon="chevron-down"
              onPress={() => load((data?.page ?? 1) + 1)}
            />
          )}
        </View>
      )}
    </>
  );
}

// ============================================================
//  Stats
// ============================================================

function StatsTab() {
  const { t, dir, pick } = useI18nAndDir();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setStats(null);
    fetchLoyaltyStats()
      .then(setStats)
      .catch(setError);
  }, []);

  useEffect(load, [load]);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (stats === null) return <Loading />;

  const cells = [
    [t("statScans"), stats.totals.scans],
    [t("statCompletions"), stats.totals.completions],
    [t("statCollectors"), stats.totals.collectors],
    [t("statVouchersValid"), stats.totals.vouchersValid],
    [t("statVouchersRedeemed"), stats.totals.vouchersRedeemed],
    [t("statVouchersExpired"), stats.totals.vouchersExpired],
  ];

  return (
    <>
      <View style={[styles.statGrid, dir.row]}>
        {cells.map(([label, value]) => (
          <View key={label} style={styles.statCell}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.blockLabel, dir.text, { marginTop: 16 }]}>{t("statByTier")}</Text>
      <View style={[styles.tierStats, dir.row]}>
        {TIERS.map((tier) => (
          <View key={tier} style={styles.tierStatCell}>
            <Pill text={t(`tier_${tier}`)} tone={TIER_TONE[tier]} />
            <Text style={styles.statValue}>{stats.byTier?.[tier] ?? 0}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.blockLabel, dir.text, { marginTop: 16 }]}>{t("statByItem")}</Text>
      {stats.items.length === 0 && <Text style={[styles.empty, dir.text]}>{t("noRewards")}</Text>}
      {stats.items.map((item) => (
        <View key={item.id} style={styles.itemStatRow}>
          <View style={[styles.itemStatHead, dir.row]}>
            <Text style={[styles.itemStatName, dir.text]} numberOfLines={1}>
              {pick(item)}
            </Text>
            <Text style={styles.itemStatMeta}>{t("statCompletionsShort", { count: item.completions })}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(item.averageProgress * 100)}%` }]} />
          </View>
          <Text style={[styles.itemStatMeta, dir.text]}>
            {t("statItemDetail", { collectors: item.collectors, scans: item.scans, redeemed: item.redeemed })}
          </Text>
        </View>
      ))}
    </>
  );
}

/** Small helper so each tab reads `t`/`dir`/`pick` the same way as the parent. */
function useI18nAndDir() {
  const { t, tn, pick } = useI18n();
  const dir = useDirection();
  return { t, tn, dir, pick };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 110 },
  body: { paddingHorizontal: 20, paddingTop: 6 },

  tabs: { gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 13, backgroundColor: C.surfaceAlt, alignItems: "center" },
  tabOn: { backgroundColor: C.teal },
  tabText: { color: C.muted, fontSize: fs(14), fontWeight: "800" },
  tabTextOn: { color: C.white },

  filters: { gap: 7, paddingBottom: 14 },
  filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, backgroundColor: C.surfaceAlt },
  filterOn: { backgroundColor: C.teal },
  filterText: { color: C.muted, fontSize: fs(15), fontWeight: "800" },
  filterTextOn: { color: C.white },

  card: {
    position: "relative",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    marginBottom: 10,
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  cardMain: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, gap: 11 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbImg: { width: "100%", height: "100%" },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { color: C.dark, fontSize: fs(16), fontWeight: "800", marginBottom: 2 },
  cardReward: { color: C.muted, fontSize: fs(15), fontWeight: "700", marginBottom: 6 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 5 },

  qrStrip: { alignItems: "center", gap: 8, backgroundColor: C.lightTeal, paddingHorizontal: 13, paddingVertical: 10 },
  qrToken: { flex: 1, color: C.teal, fontSize: fs(15), fontWeight: "800", letterSpacing: 0.4 },
  qrCta: { color: C.teal, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1 },

  empty: { color: C.subtle, fontSize: fs(15), lineHeight: fs(21), marginTop: 6 },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: C.orange,
    elevation: 8,
    shadowColor: C.orange,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: C.white, fontSize: fs(15), fontWeight: "800", letterSpacing: 0.5 },

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

  fieldLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, marginBottom: 5 },
  layerHint: { color: C.subtle, fontSize: fs(14), lineHeight: fs(18), marginBottom: 10 },

  tierCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    padding: 16,
    marginBottom: 14,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  tierInputRow: { gap: 10, marginBottom: 14 },
  tierInputCell: { flex: 1, alignItems: "center", gap: 8 },
  tierInput: {
    width: "100%",
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    textAlign: "center",
    color: C.dark,
    fontSize: fs(18.5),
    fontWeight: "800",
  },

  layerRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 },
  layer: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  layerImg: { width: "100%", height: "100%" },
  layerIndex: {
    position: "absolute",
    left: 5,
    bottom: 4,
    color: C.white,
    fontSize: fs(13.5),
    fontWeight: "800",
    backgroundColor: "rgba(23,32,31,0.65)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  layerRemove: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  layerAdd: {
    width: 62,
    height: 62,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#F0D8D4",
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { backgroundColor: C.surfaceAlt, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.teal },
  chipText: { color: C.muted, fontSize: fs(14.5), fontWeight: "800" },
  chipTextOn: { color: C.white },

  tokenNote: { color: C.subtle, fontSize: fs(14), lineHeight: fs(19), marginBottom: 12 },

  qrBackdrop: { flex: 1, backgroundColor: "rgba(23,32,31,0.55)", alignItems: "center", justifyContent: "center", padding: 22 },
  qrSheet: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    alignSelf: "stretch",
    maxWidth: 380,
    maxHeight: "88%",
  },
  qrTitle: { color: C.dark, fontSize: fs(20), fontWeight: "800", textAlign: "center" },
  qrSub: { color: C.muted, fontSize: fs(14.5), fontWeight: "700", marginTop: 3, marginBottom: 14, textAlign: "center" },

  tierBlock: {
    alignItems: "center",
    alignSelf: "stretch",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
    marginTop: 16,
  },
  tierHead: { alignItems: "center", gap: 8, marginBottom: 10 },
  tierReveals: { color: C.muted, fontSize: fs(14), fontWeight: "700" },

  qrBox: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    minWidth: 170,
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  qrMissing: { color: C.muted, fontSize: fs(15), textAlign: "center", paddingHorizontal: 16 },
  qrCode: { color: C.dark, fontSize: fs(14.5), fontWeight: "800", letterSpacing: 1, marginTop: 10 },
  qrHelp: { color: C.subtle, fontSize: fs(14), lineHeight: fs(19), textAlign: "center", marginTop: 16 },

  logRow: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 12,
    marginBottom: 8,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  logAccent: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  logTop: { alignItems: "center", gap: 7, flexWrap: "wrap" },
  logMain: { flex: 1, color: C.dark, fontSize: fs(15), fontWeight: "800" },
  logDetail: { color: C.muted, fontSize: fs(14), marginTop: 5, lineHeight: fs(18) },
  logWhen: { color: C.placeholder, fontSize: fs(13.5), marginTop: 5, fontWeight: "700" },

  redeemBox: { backgroundColor: C.surface, borderRadius: 16, padding: 13, marginBottom: 14 },
  redeemRow: { gap: 9, marginTop: 8 },
  redeemInput: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    color: C.dark,
    fontSize: fs(17.5),
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },

  searchBox: {
    alignItems: "center",
    gap: 9,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: C.dark, fontSize: fs(15.5), fontWeight: "600" },

  voucherTop: { alignItems: "center", gap: 8, marginBottom: 2 },
  voucherCode: { color: C.dark, fontSize: fs(16.5), fontWeight: "800", letterSpacing: 1 },

  blockLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  dateHeaderRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 16, marginBottom: 8 },
  dateHeader: { color: C.dark, fontSize: fs(15), fontWeight: "800" },

  statGrid: { flexWrap: "wrap", gap: 10 },
  statCell: {
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: C.lightTeal,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  statValue: { color: C.dark, fontSize: fs(22), fontWeight: "800" },
  statLabel: { color: C.muted, fontSize: fs(13.5), fontWeight: "800", letterSpacing: 0.5, marginTop: 3, textAlign: "center" },

  tierStats: { gap: 10, marginTop: 8 },
  tierStatCell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  itemStatRow: { marginTop: 12 },
  itemStatHead: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 },
  itemStatName: { flex: 1, color: C.dark, fontSize: fs(15), fontWeight: "800" },
  itemStatMeta: { color: C.muted, fontSize: fs(14), fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.teal },

  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
});
