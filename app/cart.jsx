import { Ionicons } from "@expo/vector-icons";

import BackButton from "@/components/BackButton";
import { useCart } from "@/context/CartContext";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";

import { apiRequestCached, imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";
import { allMenuItems } from "@/lib/menu-sections";

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

const ORANGE = "#FC4A14";
const TEAL = "#005751";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

export default function CartScreen() {
  const { lines, setQuantity, remove, total } = useCart();
  const { t, pick, dir } = useAppLang();

  // Items added before the cart stored images: look their image up in the menu
  const [menuImages, setMenuImages] = useState({});

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
          style={styles.confirmBtn}
          onPress={() =>
            router.push({
              pathname: "/confirm",
              params: { from: "cart" },
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.confirmBtnText}>{t("cartConfirm")}</Text>
        </TouchableOpacity>
      </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
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
