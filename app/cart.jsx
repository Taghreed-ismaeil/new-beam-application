import { Ionicons } from "@expo/vector-icons";

import BackButton from "@/components/BackButton";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";

import { apiRequest, apiRequestCached, imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { allMenuItems } from "@/lib/menu-sections";
import { Text } from "@/lib/arabic-font";

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

// Status label keys in lib/app-strings.ts (same as the orders screen)
const STATUS_LABEL = {
  pending: "statusPending",
  accepted: "statusAccepted",
  preparing: "statusPreparing",
  ready: "statusReady",
  out_for_delivery: "statusOnTheWay",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

export default function CartScreen() {
  const { lines, setQuantity, remove, total, editing, startEditing, startAdding, clear } = useCart();
  const { t, pick, dir } = useAppLang();
  const { user, loading: authLoading } = useAuth();

  // Items added before the cart stored images: look their image up in the menu
  const [menuImages, setMenuImages] = useState({});

  // Opened from the WhatsApp receipt's "edit" link (beemres://cart?editOrder=12):
  // load that order into the cart. The server says what's still allowed (order.can):
  // full edit until the kitchen starts, then only adding items, then nothing.
  const { editOrder } = useLocalSearchParams();
  const [editNotice, setEditNotice] = useState("");
  const loadedEdit = useRef(null);

  useEffect(() => {
    const id = Number(editOrder);
    if (!id || authLoading || loadedEdit.current === id) return;
    if (!user) {
      router.push({ pathname: "/login", params: { returnTo: "back" } });
      return;
    }
    loadedEdit.current = id;
    apiRequest(`/api/orders/${id}`)
      .then(({ order }) => {
        if (order.can?.edit) startEditing(order, menuImages);
        else if (order.can?.add) startAdding(order);
        else {
          setEditNotice(t("cartEditLocked", { id }));
          return;
        }
        setEditNotice("");
      })
      .catch(() => setEditNotice(t("cartEditMissing")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrder, user, authLoading]);

  // The customer's latest order that isn't finished yet, refreshed whenever the
  // cart is opened, so the right button shows as the restaurant moves it along.
  const [activeOrder, setActiveOrder] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setActiveOrder(null);
        return;
      }
      let alive = true;
      apiRequest("/api/orders/mine")
        .then(({ orders }) => {
          if (!alive) return;
          const open = (orders ?? []).find((o) => o.status !== "completed" && o.status !== "cancelled");
          setActiveOrder(open ?? null);
          // The kitchen moved on while this order was open for editing: drop to
          // "add only" (or out entirely) so confirming can't be refused.
          const mine = editing && (orders ?? []).find((o) => o.id === editing.orderId);
          if (mine && editing.mode !== "add" && !mine.can?.edit) {
            if (mine.can?.add) {
              startAdding(mine);
              setEditNotice(t("cartNowAddOnly", { id: mine.id }));
            } else {
              clear();
              setEditNotice(t("cartEditLocked", { id: mine.id }));
            }
          }
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, editing?.orderId, editing?.mode])
  );

  // Asks before throwing away items already in the cart (web has no Alert buttons)
  function confirmReplace(run) {
    const unrelated = lines.length > 0 && editing?.orderId !== activeOrder?.id;
    if (!unrelated) return run();
    if (Platform.OS === "web") {
      if (window.confirm(t("cartReplaceConfirm"))) run();
      return;
    }
    Alert.alert(t("cartReplaceConfirm"), "", [
      { text: t("cancel"), style: "cancel" },
      { text: t("cartReplaceOk"), style: "destructive", onPress: run },
    ]);
  }

  function editActive() {
    confirmReplace(() =>
      apiRequest(`/api/orders/${activeOrder.id}`)
        .then(({ order }) => {
          setActiveOrder(order);
          if (order.can?.edit) startEditing(order, menuImages);
          else if (order.can?.add) startAdding(order);
        })
        .catch(() => setEditNotice(t("cartEditMissing")))
    );
  }

  function addToActive() {
    confirmReplace(() => startAdding(activeOrder));
  }

  // Add mode: append the cart's lines to the order instead of placing a new one
  const [adding, setAdding] = useState(false);

  async function submitAddition() {
    if (adding || !editing) return;
    setAdding(true);
    setEditNotice("");
    try {
      const id = editing.orderId;
      await apiRequest(`/api/orders/${id}/items`, {
        method: "POST",
        body: {
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            ...(l.notes ? { notes: l.notes } : {}),
          })),
        },
      });
      clear();
      router.replace(`/order-tracking/${id}`);
    } catch (e) {
      setEditNotice(e?.status === 409 ? t("cartAddClosed") : t("cartAddFailed"));
    } finally {
      setAdding(false);
    }
  }

  const addMode = editing?.mode === "add";
  // the order box hides while that same order is already open in the cart
  const showActive = activeOrder && editing?.orderId !== activeOrder.id;


  useEffect(() => {
    apiRequestCached("/api/menu", (data) => {
      const map = {};

      allMenuItems(data.categories).forEach((i) => {
        if (i.imageUrl) map[i.id] = i.imageUrl;
      });

      setMenuImages(map);
    });
  }, []);

  return (
    <View style={styles.screen}>
      {/* =====================================================
          BACKGROUND DECOR
      ====================================================== */}

      <View pointerEvents="none" style={styles.decorTopLeft}>
        <Text style={styles.decorOrange}>✦</Text>
      </View>

      <View pointerEvents="none" style={styles.decorBottomRight}>
        <Text style={styles.decorTeal}>✦</Text>
      </View>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <BackButton />

        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.eyebrow}></Text>

            <Text style={[styles.title, dir.text]}>{t("cartTitle")}</Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          CART ITEMS
      ====================================================== */}

      {(!!editing || !!editNotice) && (
        <View style={[styles.editBanner, !!editNotice && !editing && styles.editBannerLocked]}>
          <Text style={styles.editBannerText}>
            {editing
              ? t(addMode ? "cartAdding" : "cartEditing", { id: editing.orderId })
              : editNotice}
          </Text>
          {editing && (
            <TouchableOpacity onPress={clear} hitSlop={8}>
              <Text style={styles.editBannerCancel}>{t("cartEditCancel")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {editing && addMode && (
        <Text style={[styles.addHint, dir.text]}>
          {editNotice || t("cartAddOnlyHint")}
        </Text>
      )}

      {showActive && (
        <View style={[styles.activeBox, dir.row]}>
          <View style={styles.activeInfo}>
            <Text style={[styles.activeTitle, dir.text]}>
              {t("cartActiveOrder", { id: activeOrder.id })}
            </Text>
            <Text style={[styles.activeStatus, dir.text]}>
              {t(STATUS_LABEL[activeOrder.status] ?? "statusPending")}
            </Text>
          </View>

          {activeOrder.can?.edit ? (
            <TouchableOpacity style={styles.activeBtn} onPress={editActive} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={15} color={WHITE} />
              <Text style={styles.activeBtnText}>{t("cartEditOrder")}</Text>
            </TouchableOpacity>
          ) : activeOrder.can?.add ? (
            <TouchableOpacity style={styles.activeBtn} onPress={addToActive} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={15} color={WHITE} />
              <Text style={styles.activeBtnText}>{t("cartAddToOrder")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.activeBtn, styles.activeBtnGhost]}
              onPress={() => router.push(`/order-tracking/${activeOrder.id}`)}
              activeOpacity={0.8}
            >
              <Text style={[styles.activeBtnText, styles.activeBtnGhostText]}>{t("cartTrackOrder")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {lines.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>🛒</Text>
            </View>

            <Text style={styles.emptyTitle}>{t("cartEmpty")}</Text>

            <Text style={styles.emptyText}>
              {t("cartEmptyText")}
            </Text>
          </View>
        ) : (
          lines.map((l) => (
            <View key={l.menuItemId} style={[styles.row, dir.row]}>
              {/* photo + name open the item's full page to change it */}
              <TouchableOpacity
                style={[styles.lineOpen, dir.row]}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/item/[id]",
                    params: { id: String(l.menuItemId), fromCart: "1" },
                  })
                }
              >
              <Image
                source={(() => {
                  const path = l.imageUrl || menuImages[l.menuItemId];

                  return path ? { uri: imageUrl(path) } : FALLBACK_IMAGE;
                })()}
                cachePolicy="memory-disk"
                transition={120}
                style={styles.thumb}
              />

              <View style={styles.itemInfo}>
                <Text style={[styles.name, dir.text]} numberOfLines={1}>
                  {pick({ name: l.nameAr || l.name, nameEn: l.nameEn || l.name })}
                </Text>

                {!!l.notes && (
                  <Text style={[styles.lineNote, dir.text]} numberOfLines={2}>
                    {l.notes}
                  </Text>
                )}

                <Text style={[styles.price, dir.text]}>
                  {l.price.toFixed(2)} {t("jd")}
                </Text>
              </View>
              </TouchableOpacity>

              <View style={[styles.stepper, dir.row]}>
                <TouchableOpacity
                  onPress={() => setQuantity(l.menuItemId, l.quantity - 1)}
                  style={styles.stepBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 2 }}
                >
                  <Ionicons name="remove" size={16} color={ORANGE} />
                </TouchableOpacity>

                <Text style={styles.qty}>{l.quantity}</Text>

                <TouchableOpacity
                  onPress={() => setQuantity(l.menuItemId, l.quantity + 1)}
                  style={[styles.stepBtn, styles.plusBtn]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 4 }}
                >
                  <Ionicons name="add" size={16} color={WHITE} />
                </TouchableOpacity>
              </View>

              {/* Delete the whole line in one tap */}
              <TouchableOpacity
                onPress={() => remove(l.menuItemId)}
                style={styles.deleteBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={18} color={ORANGE} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* =====================================================
    FOOTER
====================================================== */}

      {lines.length > 0 && (
      <View style={styles.footer}>
        <View style={[styles.totalRow, dir.row]}>
          <Text style={styles.totalLabel}>{t("cartTotal")}</Text>

          <Text style={styles.total}>
            {total.toFixed(2)} {t("jd")}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, adding && { opacity: 0.7 }]}
          disabled={adding}
          onPress={() =>
            addMode
              ? submitAddition()
              : router.push({
                  pathname: "/confirm",
                  params: { from: "cart" },
                })
          }
          activeOpacity={0.8}
        >
          {adding ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.confirmBtnText}>
              {addMode ? t("cartAddConfirm") : t("cartConfirm")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  // "editing order #12" strip shown when the cart was opened from the receipt link
  editBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: LIGHT_ORANGE,
    borderWidth: 1,
    borderColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  editBannerLocked: {
    backgroundColor: LIGHT_TEAL,
    borderColor: TEAL,
  },
  editBannerText: {
    flex: 1,
    color: DARK,
    fontSize: 13.5,
    fontWeight: "700",
  },
  lineOpen: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  addHint: {
    marginHorizontal: 20,
    marginBottom: 4,
    color: MUTED,
    fontSize: 12.5,
  },
  // "your current order #12 • preparing  [add to order]"
  activeBox: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E6ECEA",
    alignItems: "center",
    gap: 10,
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },
  activeStatus: {
    color: TEAL,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 2,
  },
  activeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: ORANGE,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
  },
  activeBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },
  activeBtnGhost: {
    backgroundColor: LIGHT_TEAL,
  },
  activeBtnGhostText: {
    color: TEAL,
  },
  editBannerCancel: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: "800",
  },

  /* =====================================================
     SCREEN
  ====================================================== */

  screen: {
    flex: 1,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  /* =====================================================
     DECOR
  ====================================================== */

  decorTopLeft: {
    position: "absolute",
    left: -20,
    top: 200,
    opacity: 0.14,
    zIndex: 0,
  },

  decorBottomRight: {
    position: "absolute",
    right: -18,
    bottom: 150,
    opacity: 0.14,
    zIndex: 0,
  },

  decorOrange: {
    fontSize: 85,
    color: ORANGE,
    transform: [{ rotate: "25deg" }],
  },

  decorTeal: {
    fontSize: 75,
    color: TEAL,
    transform: [{ rotate: "-20deg" }],
  },

  /* =====================================================
     HEADER
  ====================================================== */

  header: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
    backgroundColor: WHITE,
    zIndex: 2,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
  },

  titleSection: {
    flex: 1,
    paddingRight: 15,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: TEAL,
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: DARK,
    marginTop: 25,
  },


  /* =====================================================
     CONTENT
  ====================================================== */

  content: {
    paddingHorizontal: 18,
    paddingTop: 5,
    paddingBottom: 120,
    zIndex: 1,
  },

  /* =====================================================
     EMPTY STATE
  ====================================================== */

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
    paddingTop: 65,
  },

  emptyIconCircle: {
    width: 85,
    height: 85,
    borderRadius: 43,

    backgroundColor: LIGHT_ORANGE,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: DARK,
  },

  emptyText: {
    marginTop: 7,
    textAlign: "center",
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },

  /* =====================================================
     ITEM CARD
  ====================================================== */

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: WHITE,

    borderRadius: 20,

    padding: 15,
    marginBottom: 13,
    gap: 10,

    borderWidth: 1,
    borderColor: "#F0E6E1",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,

    zIndex: 1,
  },

  thumb: {
    width: 62,
    height: 62,
    borderRadius: 14,
    resizeMode: "cover",
    backgroundColor: "#F4F1ED",
  },

  itemInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK,
  },

  // The customer's kitchen note from the item details screen
  lineNote: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
    color: "#68706E",
  },

  price: {
    marginTop: 5,
    color: ORANGE,
    fontSize: 13,
    fontWeight: "800",
  },

  /* =====================================================
     STEPPER
  ====================================================== */

  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  // Soft grey pill: white minus (orange icon), teal plus (white icon)
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F1ED",
    borderRadius: 12,
    padding: 3,
  },

  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: WHITE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 1,
  },

  plusBtn: {
    backgroundColor: TEAL,
  },

  qty: {
    minWidth: 26,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: DARK,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 80,

    borderTopWidth: 1,
    borderTopColor: "#F0E6E1",

    backgroundColor: WHITE,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: -3,
    },

    elevation: 8,
    zIndex: 5,
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 12,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: MUTED,
  },

  total: {
    fontSize: 20,
    fontWeight: "900",
    color: DARK,
  },

  confirmBtn: {
    height: 52,
    width: "100%",

    borderRadius: 26,

    backgroundColor: TEAL,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: TEAL,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  confirmBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  arrow: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 10,
  },
});
