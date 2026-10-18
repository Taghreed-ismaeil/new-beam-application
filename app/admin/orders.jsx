import { Ionicons } from "@expo/vector-icons";
import { fs } from "@/lib/admin-font";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  AdminHeader,
  Banner,
  Btn,
  C,
  ConfirmDialog,
  ErrorState,
  Field,
  Loading,
  Pill,
} from "@/components/admin/ui";

import {
  cancelOrder,
  createCounterSale,
  fetchAdminMenu,
  fetchOrders,
  setOrderStatus,
  takeOrderPayment,
} from "@/lib/admin-api";

import { useDirection, useI18n } from "@/lib/i18n";
import { useLiveUpdates } from "@/lib/use-live-updates";
import { Text, TextInput } from "@/lib/arabic-font";

const FILTERS = [
  "open",
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "all",
];

const STATUS_TONE = {
  pending: "orange",
  accepted: "orange",
  preparing: "orange",
  ready: "teal",
  out_for_delivery: "teal",
  completed: "gray",
  cancelled: "danger",
};

const STATUS_COLOR = {
  pending: C.orange,
  accepted: C.orange,
  preparing: C.orange,
  ready: C.teal,
  out_for_delivery: C.teal,
  completed: C.muted,
  cancelled: C.danger,
};

export default function AdminOrders() {
  const { t, tn, pick } = useI18n();
  const dir = useDirection();

  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const [sale, setSale] = useState(null);
  const [menu, setMenu] = useState([]);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      setQuery(search.trim());
    }, 350);

    return () => timer.current && clearTimeout(timer.current);
  }, [search]);

  const load = useCallback(
    ({ quiet } = {}) => {
      if (!quiet) setData(null);

      setError(null);

      return fetchOrders({
        status: filter,
        search: query || undefined,
        limit: 40,
      })
        .then(setData)
        .catch((e) => {
          setError(e);
          setData({
            orders: [],
            total: 0,
            counts: {},
          });
        });
    },
    [filter, query],
  );

  useEffect(() => {
    load();
  }, [load]);

  const live = useLiveUpdates({
    "order:new": () => load({ quiet: true }),
    "order:updated": () => load({ quiet: true }),
  });

  const failure = (e) => {
    const map = {
      role_cannot_set_status: t("orderRoleCannot"),
      role_cannot_take_payment: t("orderRoleCannotPay"),
      role_cannot_sell: t("orderRoleCannotSell"),
      illegal_transition: t("orderIllegalMove"),
      already_paid: t("orderAlreadyPaid"),
      reason_required: t("orderReasonRequired"),
      item_unavailable: t("orderItemUnavailable", {
        item: e?.data?.item ?? "",
      }),
      empty_order: t("orderEmpty"),
    };

    return map[e?.data?.error] ?? t("errSaveFailed");
  };

  async function act(fn) {
    setBusy(true);
    setBanner(null);

    try {
      const res = await fn();

      setOpen(res.order);

      await load({ quiet: true });

      return true;
    } catch (e) {
      setBanner({
        text: failure(e),
      });

      return false;
    } finally {
      setBusy(false);
    }
  }

  // the dashboard's "new sale" shortcut lands here with ?sale=1 — open the sheet straight away
  const params = useLocalSearchParams();
  const openedFromShortcut = useRef(false);
  useEffect(() => {
    if (params.sale === "1" && !openedFromShortcut.current) {
      openedFromShortcut.current = true;
      openCounterSale();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sale]);

  function openCounterSale() {
    setBanner(null);

    fetchAdminMenu()
      .then((d) => setMenu((d.categories ?? []).flatMap((c) => c.items ?? [])))
      .catch(() => setMenu([]));

    setSale({
      lines: {},
      customerName: "",
      paymentMethod: "cash",
      paid: true,
    });
  }

  const bumpLine = (menuItemId, delta) =>
    setSale((s) => {
      if (!s) return s;

      const current = s.lines[menuItemId] ?? 0;

      return {
        ...s,
        lines: {
          ...s.lines,
          [menuItemId]: Math.max(0, current + delta),
        },
      };
    });

  const saleTotal = () =>
    Object.entries(sale?.lines ?? {}).reduce((sum, [id, qty]) => {
      const item = menu.find((m) => m.id === Number(id));

      return sum + (item ? item.price * qty : 0);
    }, 0);

  async function submitSale() {
    const items = Object.entries(sale.lines)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({
        menuItemId: Number(id),
        quantity: q,
      }));

    if (!items.length) {
      return setBanner({
        text: t("orderEmpty"),
      });
    }

    setBusy(true);
    setBanner(null);

    try {
      await createCounterSale({
        items,
        customerName: sale.customerName?.trim() || undefined,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paid ? "paid" : "unpaid",
      });

      setSale(null);

      await load({
        quiet: true,
      });
    } catch (e) {
      setBanner({
        text: failure(e),
      });
    } finally {
      setBusy(false);
    }
  }

  const money = (n) => `${Number(n ?? 0).toFixed(2)} ${t("currency")}`;

  const clock = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.teal}
            onRefresh={async () => {
              setRefreshing(true);

              await load({
                quiet: true,
              });

              setRefreshing(false);
            }}
          />
        }
      >
        <AdminHeader
          eyebrow={t("admin")}
          title={t("ordersTitle")}
          subtitle={
            data === null ? t("loading") : tn("ordersFound", data.total)
          }
          right={
            <View
              style={[
                styles.liveChip,
                dir.row,
                live === "live" ? styles.liveOn : styles.liveOff,
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  live === "live" ? styles.dotOn : styles.dotOff,
                ]}
              />

              <Text
                style={[
                  styles.liveText,
                  live === "live" ? styles.liveTextOn : styles.liveTextOff,
                ]}
              >
                {t(live === "live" ? "liveOn" : "liveOff")}
              </Text>
            </View>
          }
        />

        <View style={styles.body}>
          <Banner value={banner} />

          {/* SEARCH */}
          <View style={styles.searchCard}>
            <View style={[styles.searchBox, dir.row]}>
              <View style={styles.searchIcon}>
                <Ionicons name="search" size={19} color={C.teal} />
              </View>

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("ordersSearchPlaceholder")}
                placeholderTextColor={C.placeholder}
                style={[styles.searchInput, dir.text]}
                autoCapitalize="none"
              />

              {!!search && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={C.placeholder} />
                </Pressable>
              )}
            </View>
          </View>

          {/* FILTERS */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionCaption, dir.text]}>
              {t("ordersTitle")}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filters, dir.row]}
            >
              {FILTERS.map((key) => {
                const active = filter === key;
                const count = data?.counts?.[key];
                const dotColor = STATUS_COLOR[key];

                return (
                  <Pressable
                    key={key}
                    onPress={() => setFilter(key)}
                    style={[styles.filter, dir.row, active && styles.filterOn]}
                  >
                    {!!dotColor && (
                      <View
                        style={[styles.filterDot, { backgroundColor: dotColor }]}
                      />
                    )}

                    <Text
                      style={[styles.filterText, active && styles.filterTextOn]}
                    >
                      {t(
                        key === "open"
                          ? "filterOpen"
                          : key === "all"
                            ? "filterAll"
                            : `status_${key}`,
                      )}
                    </Text>

                    {count != null && (
                      <View
                        style={[
                          styles.filterCount,
                          active && styles.filterCountOn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterCountText,
                            active && styles.filterCountTextOn,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {error && <ErrorState error={error} onRetry={load} />}

          {!error && data === null && <Loading />}

          {!error &&
            data?.orders?.map((order) => {
              const statusColor = STATUS_COLOR[order.status] ?? C.orange;

              return (
                <Pressable
                  key={order.id}
                  onPress={() => {
                    setBanner(null);
                    setOpen(order);
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    // tints each card's own shadow with its status color, so an
                    // urgent (orange) or cancelled (red) order reads as such
                    // before you even look at the pill
                    { shadowColor: statusColor },
                    pressed && styles.cardPressed,
                  ]}
                >
                  {/* STATUS LINE — sits on the reading-start edge (left in
                      LTR, right in this app's hand-rolled RTL) */}
                  <View
                    style={[
                      styles.statusLine,
                      dir.isRTL ? { right: 0 } : { left: 0 },
                      {
                        backgroundColor: statusColor,
                      },
                    ]}
                  />

                  {/* HEADER */}
                  <View style={[styles.cardHeader, dir.row]}>
                    <View style={[styles.orderNumberBox, dir.row]}>
                      <View
                        style={[
                          styles.orderIcon,
                          {
                            backgroundColor: `${statusColor}18`,
                            shadowColor: statusColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name="receipt-outline"
                          size={19}
                          color={statusColor}
                        />
                      </View>

                      <View>
                        <Text style={[styles.orderNumber, dir.text]}>
                          #{order.id}
                        </Text>

                        <Text style={[styles.orderTime, dir.text]}>
                          {clock(order.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Pill
                      text={t(`status_${order.status}`)}
                      tone={STATUS_TONE[order.status]}
                    />
                  </View>

                  {/* TAGS */}
                  {(order.source === "counter" ||
                    order.orderType === "delivery") && (
                    <View style={[styles.tags, dir.row]}>
                      {order.source === "counter" && (
                        <View style={[styles.smallTag, dir.row]}>
                          <Ionicons
                            name="storefront-outline"
                            size={13}
                            color={C.teal}
                          />

                          <Text style={styles.smallTagText}>
                            {t("sourceCounter")}
                          </Text>
                        </View>
                      )}

                      {order.orderType === "delivery" && (
                        <View
                          style={[styles.smallTag, styles.deliveryTag, dir.row]}
                        >
                          <Ionicons
                            name="bicycle-outline"
                            size={13}
                            color={C.teal}
                          />

                          <Text
                            style={[
                              styles.smallTagText,
                              {
                                color: C.teal,
                              },
                            ]}
                          >
                            {t("orderType_delivery")}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* ITEMS */}
                  <View style={styles.itemsBox}>
                    <View style={[styles.itemsHeader, dir.row]}>
                      <View style={[styles.itemsLabel, dir.row]}>
                        <Ionicons
                          name="fast-food-outline"
                          size={16}
                          color={C.teal}
                        />

                        <Text style={styles.itemsTitle}>{t("orderItems")}</Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={C.placeholder}
                      />
                    </View>

                    <Text style={[styles.lines, dir.text]} numberOfLines={2}>
                      {order.items
                        .map((l) => `${l.quantity}× ${pick(l)}`)
                        .join("  ·  ")}
                    </Text>
                  </View>

                  {/* FOOTER */}
                  <View style={[styles.cardFooter, dir.row]}>
                    <View>
                      <Text style={[styles.totalCaption, dir.text]}>
                        {t("orderTotal")}
                      </Text>

                      <Text style={styles.total}>{money(order.total)}</Text>
                    </View>

                    <View
                      style={[
                        styles.paymentBadge,
                        order.paymentStatus === "paid" && styles.paymentPaid,
                        order.paymentStatus === "refund_due" &&
                          styles.paymentRefund,
                      ]}
                    >
                      <Ionicons
                        name={
                          order.paymentStatus === "paid"
                            ? "checkmark-circle"
                            : "time-outline"
                        }
                        size={15}
                        color={
                          order.paymentStatus === "paid"
                            ? C.teal
                            : order.paymentStatus === "refund_due"
                              ? C.danger
                              : C.orange
                        }
                      />

                      <Text
                        style={[
                          styles.paymentText,
                          order.paymentStatus === "paid" &&
                            styles.paymentTextPaid,
                          order.paymentStatus === "refund_due" &&
                            styles.paymentTextRefund,
                        ]}
                      >
                        {t(`pay_${order.paymentStatus}`)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}

          {!error && data?.orders?.length === 0 && (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={28} color={C.teal} />
              </View>

              <Text style={[styles.emptyTitle, dir.text]}>
                {t("ordersEmpty")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* COUNTER SALE FAB */}
      {open === null && sale === null && (
        <Pressable
          onPress={openCounterSale}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <View style={styles.fabIcon}>
            <Ionicons name="add" size={21} color={C.white} />
          </View>

          <Text style={styles.fabText}>{t("counterSale")}</Text>
        </Pressable>
      )}

      {/* ORDER DETAIL */}
      <Modal
        visible={open !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              {/* DETAIL HEADER */}
              <View style={styles.detailHero}>
                <View style={[styles.detailHeroTop, dir.row]}>
                  <View>
                    <Text style={[styles.detailEyebrow, dir.text]}>
                      {t("orderItems")}
                    </Text>

                    <Text style={[styles.sheetTitle, dir.text]}>
                      #{open?.id}
                    </Text>
                  </View>

                  <Pill
                    text={t(`status_${open?.status ?? "pending"}`)}
                    tone={STATUS_TONE[open?.status]}
                  />
                </View>

                <View style={[styles.detailTotalBox, dir.row]}>
                  <View style={styles.detailTotalIcon}>
                    <Ionicons name="receipt" size={20} color={C.teal} />
                  </View>

                  <View>
                    <Text style={styles.detailTotalLabel}>
                      {t("orderTotal")}
                    </Text>

                    <Text style={styles.detailTotalValue}>
                      {money(open?.total)}
                    </Text>
                  </View>
                </View>
              </View>

              <Banner value={banner} />

              {/* ORDER INFO */}
              <Text style={[styles.detailSectionTitle, dir.text]}>
                {t("orderSource")}
              </Text>

              <View style={styles.infoCard}>
                <Row
                  label={t("orderPlaced")}
                  value={open ? new Date(open.createdAt).toLocaleString() : ""}
                  dir={dir}
                />

                <Row
                  label={t("orderSource")}
                  value={t(
                    open?.source === "counter" ? "sourceCounter" : "sourceApp",
                  )}
                  dir={dir}
                />

                {!!open?.customerName && (
                  <Row
                    label={t("orderCustomer")}
                    value={open.customerName}
                    dir={dir}
                  />
                )}

                {!!open?.customerPhone && (
                  <Row
                    label={t("staffPhone")}
                    value={open.customerPhone}
                    dir={dir}
                  />
                )}

                {open?.tableNumber != null && (
                  <Row
                    label={t("orderTable")}
                    value={`#${open.tableNumber}`}
                    dir={dir}
                  />
                )}

                {open?.orderType === "delivery" && (
                  <>
                    <Row
                      label={t("orderDeliveryZone")}
                      value={pick({
                        name: open?.deliveryZoneName,
                        nameEn: open?.deliveryZoneNameEn,
                      })}
                      dir={dir}
                    />

                    {!!open?.deliveryAddress && (
                      <Row
                        label={t("orderDeliveryAddress")}
                        value={open.deliveryAddress}
                        dir={dir}
                      />
                    )}
                  </>
                )}
              </View>

              {/* ITEMS */}
              <Text style={[styles.detailSectionTitle, dir.text]}>
                {t("orderItems")}
              </Text>

              <View style={styles.itemsDetailCard}>
                {open?.items?.map((line, i) => (
                  <View
                    key={i}
                    style={[
                      styles.line,
                      dir.row,
                      i < open.items.length - 1 && styles.lineBorder,
                    ]}
                  >
                    <View style={[styles.lineQtyBox, dir.row]}>
                      <Text style={styles.lineQty}>{line.quantity}×</Text>
                    </View>

                    <Text style={[styles.lineName, dir.text]} numberOfLines={2}>
                      {pick(line)}
                    </Text>

                    <Text style={styles.linePrice}>
                      {money(line.unitPrice * line.quantity)}
                    </Text>
                  </View>
                ))}

                <View style={[styles.totalRow, dir.row]}>
                  <Text style={styles.totalLabel}>{t("orderTotal")}</Text>

                  <Text style={styles.totalValue}>{money(open?.total)}</Text>
                </View>
              </View>

              {/* PAYMENT */}
              <Text style={[styles.detailSectionTitle, dir.text]}>
                {t("orderPaymentMethod")}
              </Text>

              <View style={styles.infoCard}>
                <Row
                  label={t("orderPaymentMethod")}
                  value={t(`method_${open?.paymentMethod ?? "cash"}`)}
                  dir={dir}
                />

                <Row
                  label={t("orderPaymentStatus")}
                  value={t(`pay_${open?.paymentStatus ?? "unpaid"}`)}
                  dir={dir}
                />

                {!!open?.deliveryFee && (
                  <Row
                    label={t("orderDeliveryFee")}
                    value={money(open.deliveryFee)}
                    dir={dir}
                  />
                )}
              </View>

              {!!open?.cancelReason && (
                <View style={styles.cancelBox}>
                  <View style={[styles.cancelHeader, dir.row]}>
                    <Ionicons name="alert-circle" size={18} color={C.danger} />

                    <Text style={[styles.cancelLabel, dir.text]}>
                      {t("orderCancelReason")}
                    </Text>
                  </View>

                  <Text style={[styles.cancelText, dir.text]}>
                    {open.cancelReason}
                  </Text>
                </View>
              )}

              {/* ACTIONS */}
              <Text style={[styles.detailSectionTitle, dir.text]}>
                {t("ordersTitle")}
              </Text>

              <View style={styles.actions}>
                {open?.can?.setStatus
                  ?.filter((s) => s !== "cancelled")
                  .map((next) => (
                    <Btn
                      key={next}
                      title={t(`action_${next}`)}
                      icon="arrow-forward"
                      loading={busy}
                      onPress={() => act(() => setOrderStatus(open.id, next))}
                    />
                  ))}

                {open?.can?.takePayment && (
                  <>
                    <Btn
                      title={t("actionPayCash")}
                      variant="ghost"
                      icon="cash-outline"
                      disabled={busy}
                      onPress={() =>
                        act(() => takeOrderPayment(open.id, "cash"))
                      }
                    />

                    <Btn
                      title={t("actionPayCard")}
                      variant="ghost"
                      icon="card-outline"
                      disabled={busy}
                      onPress={() =>
                        act(() => takeOrderPayment(open.id, "card"))
                      }
                    />
                  </>
                )}

                {open?.can?.cancel && (
                  <Btn
                    title={t("actionCancelOrder")}
                    variant="danger"
                    icon="close-circle-outline"
                    disabled={busy}
                    onPress={() =>
                      setCancelling({
                        id: open.id,
                        reason: "",
                      })
                    }
                  />
                )}

                <Btn
                  title={t("close")}
                  variant="ghost"
                  onPress={() => setOpen(null)}
                  disabled={busy}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CANCEL */}
      <Modal
        visible={cancelling !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelling(null)}
      >
        <KeyboardAvoidingView
          style={styles.centeredBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={27}
                color={C.danger}
              />
            </View>

            <Text style={[styles.dialogTitle, dir.text]}>
              {t("cancelDialogTitle")}
            </Text>

            <Text style={[styles.dialogText, dir.text]}>
              {t("cancelDialogText")}
            </Text>

            <Banner value={banner} />

            <Field
              label={t("cancelReasonLabel")}
              value={cancelling?.reason ?? ""}
              onChangeText={(v) =>
                setCancelling((c) =>
                  c
                    ? {
                        ...c,
                        reason: v,
                      }
                    : c,
                )
              }
              placeholder={t("cancelReasonPlaceholder")}
              multiline
            />

            <View style={styles.actions}>
              <Btn
                title={t("actionCancelOrder")}
                variant="danger"
                loading={busy}
                onPress={async () => {
                  const ok = await act(() =>
                    cancelOrder(cancelling.id, cancelling.reason ?? ""),
                  );

                  if (ok) {
                    setCancelling(null);
                  }
                }}
              />

              <Btn
                title={t("close")}
                variant="ghost"
                onPress={() => setCancelling(null)}
                disabled={busy}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COUNTER SALE */}
      <Modal
        visible={sale !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSale(null)}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <View style={styles.saleHero}>
                <View style={styles.saleIcon}>
                  <Ionicons name="storefront" size={25} color={C.teal} />
                </View>

                <Text style={[styles.sheetTitle, dir.text]}>
                  {t("counterSale")}
                </Text>

                <Text style={[styles.dialogText, dir.text]}>
                  {t("counterSaleHint")}
                </Text>
              </View>

              <Banner value={banner} />

              <Text style={[styles.detailSectionTitle, dir.text]}>
                {t("orderItems")}
              </Text>

              <View style={styles.menuCard}>
                {menu.map((item, index) => {
                  const qty = sale?.lines?.[item.id] ?? 0;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.pickRow,
                        dir.row,
                        index < menu.length - 1 && styles.pickBorder,
                      ]}
                    >
                      <View style={styles.pickInfo}>
                        <Text
                          style={[styles.pickName, dir.text]}
                          numberOfLines={1}
                        >
                          {pick(item)}
                        </Text>

                        <Text style={[styles.pickPrice, dir.text]}>
                          {money(item.price)}
                        </Text>
                      </View>

                      <View style={[styles.stepper, dir.row]}>
                        <Pressable
                          onPress={() => bumpLine(item.id, -1)}
                          style={styles.stepBtn}
                          hitSlop={6}
                        >
                          <Ionicons
                            name="remove"
                            size={17}
                            color={qty ? C.dark : C.borderStrong}
                          />
                        </Pressable>

                        <Text style={styles.stepValue}>{qty}</Text>

                        <Pressable
                          onPress={() => bumpLine(item.id, 1)}
                          style={styles.stepBtn}
                          hitSlop={6}
                        >
                          <Ionicons name="add" size={17} color={C.teal} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Field
                label={t("orderCustomer")}
                value={sale?.customerName ?? ""}
                onChangeText={(v) =>
                  setSale((s) => ({
                    ...s,
                    customerName: v,
                  }))
                }
                placeholder={t("counterSaleNamePlaceholder")}
              />

              <Text style={[styles.detailSectionTitle, dir.text]}>
                {t("orderPaymentMethod")}
              </Text>

              <View style={styles.paymentOptions}>
                {["cash", "card"].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() =>
                      setSale((s) => ({
                        ...s,
                        paymentMethod: m,
                      }))
                    }
                    style={[
                      styles.paymentOption,
                      sale?.paymentMethod === m && styles.paymentOptionOn,
                    ]}
                  >
                    <Ionicons
                      name={m === "cash" ? "cash-outline" : "card-outline"}
                      size={19}
                      color={sale?.paymentMethod === m ? C.white : C.dark}
                    />

                    <Text
                      style={[
                        styles.paymentOptionText,
                        sale?.paymentMethod === m && styles.paymentOptionTextOn,
                      ]}
                    >
                      {t(`method_${m}`)}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  onPress={() =>
                    setSale((s) => ({
                      ...s,
                      paid: !s.paid,
                    }))
                  }
                  style={[
                    styles.paymentOption,
                    sale?.paid && styles.paymentOptionPaid,
                  ]}
                >
                  <Ionicons
                    name={sale?.paid ? "checkmark-circle" : "time-outline"}
                    size={19}
                    color={sale?.paid ? C.white : C.dark}
                  />

                  <Text
                    style={[
                      styles.paymentOptionText,
                      sale?.paid && styles.paymentOptionTextOn,
                    ]}
                  >
                    {t(sale?.paid ? "pay_paid" : "pay_unpaid")}
                  </Text>
                </Pressable>
              </View>

              {/* SALE TOTAL */}
              <View style={[styles.saleTotal, dir.row]}>
                <View>
                  <Text style={[styles.totalCaption, dir.text]}>
                    {t("orderTotal")}
                  </Text>

                  <Text style={styles.saleTotalValue}>
                    {money(saleTotal())}
                  </Text>
                </View>

                <View style={styles.saleTotalIcon}>
                  <Ionicons name="receipt-outline" size={22} color={C.teal} />
                </View>
              </View>

              <View style={styles.actions}>
                <Btn
                  title={t("counterSaleSubmit")}
                  icon="checkmark"
                  onPress={submitSale}
                  loading={busy}
                />

                <Btn
                  title={t("cancel")}
                  variant="ghost"
                  onPress={() => setSale(null)}
                  disabled={busy}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog value={confirm} onCancel={() => setConfirm(null)} />
    </View>
  );
}

function Row({ label, value, dir }) {
  return (
    <View style={[styles.row, dir.row]}>
      <Text style={styles.rowLabel}>{label}</Text>

      <Text style={[styles.rowValue, dir.text]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  content: {
    paddingBottom: 125,
  },

  body: {
    paddingHorizontal: 18,
  },

  /* HEADER */

  liveChip: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 14,
  },

  liveOn: {
    backgroundColor: C.lightTeal,
  },

  liveOff: {
    backgroundColor: C.surfaceAlt,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  dotOn: {
    backgroundColor: C.teal,
  },

  dotOff: {
    backgroundColor: C.placeholder,
  },

  liveText: {
    fontSize: fs(14.5),
    fontWeight: "800",
  },

  liveTextOn: {
    color: C.teal,
  },

  liveTextOff: {
    color: C.muted,
  },

  /* SEARCH */

  searchCard: {
    backgroundColor: C.white,
    borderRadius: 19,
    padding: 6,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 17,
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  searchBox: {
    alignItems: "center",
    gap: 10,
    height: 51,
    paddingHorizontal: 9,
  },

  searchIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    color: C.dark,
    fontSize: fs(17.5),
    fontWeight: "700",
  },

  /* FILTERS */

  filterSection: {
    marginBottom: 13,
  },

  sectionCaption: {
    color: C.dark,
    fontSize: fs(15.5),
    fontWeight: "800",
    marginBottom: 9,
  },

  filters: {
    gap: 8,
    paddingBottom: 4,
  },

  filter: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  filterOn: {
    backgroundColor: C.teal,
    borderColor: C.dark,
  },

  filterText: {
    color: C.muted,
    fontSize: fs(15.5),
    fontWeight: "800",
  },

  filterTextOn: {
    color: C.white,
  },

  filterCount: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  filterCountOn: {
    backgroundColor: C.teal,
  },

  filterCountText: {
    color: C.muted,
    fontSize: fs(14),
    fontWeight: "800",
  },

  filterCountTextOn: {
    color: C.white,
  },

  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  /* ORDER CARD */

  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 15,
    marginBottom: 12,

    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 2,
  },

  cardPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  statusLine: {
    position: "absolute",
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 3,
  },

  cardHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },

  orderNumberBox: {
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  orderIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  orderNumber: {
    color: C.dark,
    fontSize: fs(19),
    fontWeight: "800",
  },

  orderTime: {
    color: C.muted,
    fontSize: fs(14.5),
    fontWeight: "700",
    marginTop: 2,
  },

  tags: {
    gap: 7,
    marginBottom: 11,
  },

  smallTag: {
    alignItems: "center",
    gap: 5,
    backgroundColor: C.lightTeal,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  deliveryTag: {
    backgroundColor: C.lightTeal,
  },

  smallTagText: {
    color: C.teal,
    fontSize: fs(15),
    fontWeight: "800",
  },

  itemsBox: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 15,
    padding: 12,
    marginBottom: 13,
  },

  itemsHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  itemsLabel: {
    alignItems: "center",
    gap: 6,
  },

  itemsTitle: {
    color: C.dark,
    fontSize: fs(14.5),
    fontWeight: "800",
  },

  lines: {
    color: C.muted,
    fontSize: fs(15.5),
    lineHeight: fs(23),
    fontWeight: "700",
  },

  cardFooter: {
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalCaption: {
    color: C.muted,
    fontSize: fs(14),
    fontWeight: "800",
    marginBottom: 2,
  },

  total: {
    color: C.dark,
    fontSize: fs(20),
    fontWeight: "800",
  },

  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.lightOrange,
  },

  paymentPaid: {
    backgroundColor: C.lightTeal,
  },

  paymentRefund: {
    backgroundColor: C.lightDanger,
  },

  paymentText: {
    color: C.orange,
    fontSize: fs(15),
    fontWeight: "800",
  },

  paymentTextPaid: {
    color: C.teal,
  },

  paymentTextRefund: {
    color: C.danger,
  },

  /* EMPTY */

  emptyBox: {
    backgroundColor: C.white,
    borderRadius: 22,
    paddingVertical: 38,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    color: C.muted,
    fontSize: fs(16.5),
    fontWeight: "800",
    textAlign: "center",
  },

  /* FAB */

  fab: {
    position: "absolute",
    right: 18,
    bottom: 25,
    height: 57,
    paddingHorizontal: 8,
    paddingRight: 18,
    borderRadius: 19,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,

    shadowColor: C.orange,
    shadowOpacity: 0.2,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 8,
  },

  fabIcon: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  fabText: {
    color: C.white,
    fontSize: fs(15.5),
    fontWeight: "800",
  },

  fabPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  /* MODALS */

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(23,32,31,0.52)",
    justifyContent: "flex-end",
  },

  centeredBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,32,31,0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    maxHeight: "93%",
  },

  sheetContent: {
    paddingBottom: 15,
  },

  sheetGrip: {
    width: 43,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.borderStrong,
    alignSelf: "center",
    marginBottom: 17,
  },

  /* DETAIL HERO */

  detailHero: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 21,
    padding: 16,
    marginBottom: 16,
  },

  detailHeroTop: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  detailEyebrow: {
    color: C.teal,
    fontSize: fs(14),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },

  sheetTitle: {
    color: C.dark,
    fontSize: fs(27),
    fontWeight: "800",
  },

  detailTotalBox: {
    alignItems: "center",
    gap: 11,
    backgroundColor: C.white,
    borderRadius: 15,
    padding: 11,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  detailTotalIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  detailTotalLabel: {
    color: C.muted,
    fontSize: fs(15),
    fontWeight: "700",
  },

  detailTotalValue: {
    color: C.dark,
    fontSize: fs(22),
    fontWeight: "800",
    marginTop: 1,
  },

  detailSectionTitle: {
    color: C.dark,
    fontSize: fs(16.5),
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 9,
  },

  /* INFO */

  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 17,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },

  row: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  rowLabel: {
    color: C.muted,
    fontSize: fs(14.5),
    fontWeight: "700",
    flexShrink: 0,
  },

  rowValue: {
    color: C.dark,
    fontSize: fs(15.5),
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },

  /* ITEMS DETAIL */

  itemsDetailCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 5,
    marginBottom: 14,
  },

  line: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },

  lineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  lineQtyBox: {
    minWidth: 39,
    height: 31,
    borderRadius: 10,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  lineQty: {
    color: C.teal,
    fontSize: fs(14.5),
    fontWeight: "800",
  },

  lineName: {
    flex: 1,
    color: C.dark,
    fontSize: fs(16.5),
    fontWeight: "800",
  },

  linePrice: {
    color: C.dark,
    fontSize: fs(15.5),
    fontWeight: "800",
  },

  totalRow: {
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 5,
    paddingTop: 14,
    paddingBottom: 9,
  },

  totalLabel: {
    color: C.muted,
    fontSize: fs(14.5),
    fontWeight: "800",
  },

  totalValue: {
    color: C.dark,
    fontSize: fs(20),
    fontWeight: "800",
  },

  /* CANCEL */

  cancelBox: {
    backgroundColor: C.lightDanger,
    borderRadius: 17,
    padding: 14,
    marginBottom: 13,
  },

  cancelHeader: {
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },

  cancelLabel: {
    color: C.danger,
    fontSize: fs(14.5),
    fontWeight: "800",
  },

  cancelText: {
    color: C.danger,
    fontSize: fs(15.5),
    lineHeight: fs(22),
    fontWeight: "700",
  },

  /* ACTIONS */

  actions: {
    width: "100%",
    gap: 11,
    marginTop: 8,
  },

  /* DIALOG */

  dialog: {
    width: "100%",
    maxWidth: 410,
    backgroundColor: C.white,
    borderRadius: 27,
    padding: 22,
  },

  dialogIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: C.lightDanger,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  dialogTitle: {
    color: C.dark,
    fontSize: fs(22),
    fontWeight: "800",
    marginBottom: 6,
  },

  dialogText: {
    color: C.muted,
    fontSize: fs(15.5),
    lineHeight: fs(22),
    marginBottom: 14,
  },

  /* COUNTER SALE */

  saleHero: {
    alignItems: "flex-start",
    marginBottom: 7,
  },

  saleIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  menuCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingHorizontal: 13,
    backgroundColor: C.white,
    marginBottom: 15,
  },

  pickRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },

  pickBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  pickInfo: {
    flex: 1,
    minWidth: 0,
  },

  pickName: {
    color: C.dark,
    fontSize: fs(16.5),
    fontWeight: "800",
  },

  pickPrice: {
    color: C.muted,
    fontSize: fs(14.5),
    fontWeight: "700",
    marginTop: 3,
  },

  stepper: {
    alignItems: "center",
    gap: 3,
    backgroundColor: C.surfaceAlt,
    borderRadius: 13,
    padding: 3,
    borderWidth: 1,
    borderColor: C.border,
  },

  stepBtn: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: C.white,
  },

  stepValue: {
    minWidth: 22,
    textAlign: "center",
    color: C.dark,
    fontSize: fs(16.5),
    fontWeight: "800",
  },

  paymentOptions: {
    width: "100%",
    gap: 9,
    marginBottom: 14,
  },

  paymentOption: {
    width: "100%",
    minHeight: 49,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  paymentOptionOn: {
    backgroundColor: C.teal,
    borderColor: C.dark,
  },

  paymentOptionPaid: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },

  paymentOptionText: {
    color: C.dark,
    fontSize: fs(15.5),
    fontWeight: "800",
  },

  paymentOptionTextOn: {
    color: C.white,
  },

  saleTotal: {
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 15,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: C.border,
  },

  saleTotalValue: {
    color: C.dark,
    fontSize: fs(26),
    fontWeight: "800",
    marginTop: 2,
  },

  saleTotalIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: C.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
});
