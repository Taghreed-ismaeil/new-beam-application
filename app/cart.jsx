import BackButton from "@/components/BackButton";
import { useCart } from "@/context/CartContext";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

export default function CartScreen() {
  const { lines, setQuantity, total } = useCart();

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

            <Text style={styles.title}>Your Cart</Text>

            <Text style={styles.subtitle}>
              Review your delicious picks before checkout.
            </Text>
          </View>

          <View style={styles.cartCircle}>
            <Text style={styles.cartIcon}>🛒</Text>
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

            <Text style={styles.emptyTitle}>Your cart is empty</Text>

            <Text style={styles.emptyText}>
              Add something delicious from the menu and it will appear here.
            </Text>
          </View>
        ) : (
          lines.map((l) => (
            <View key={l.menuItemId} style={styles.row}>
              <View style={styles.itemInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {l.name}
                </Text>

                <Text style={styles.price}>{l.price.toFixed(2)} JD</Text>
              </View>

              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => setQuantity(l.menuItemId, l.quantity - 1)}
                  style={styles.stepBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.qty}>{l.quantity}</Text>

                <TouchableOpacity
                  onPress={() => setQuantity(l.menuItemId, l.quantity + 1)}
                  style={[styles.stepBtn, styles.plusBtn]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.plusText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* =====================================================
    FOOTER
====================================================== */}

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>

          <Text style={styles.total}>{total.toFixed(2)} JD</Text>
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
          <Text style={styles.confirmBtnText}>Confirm</Text>
        </TouchableOpacity>
      </View>
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

  subtitle: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
  },

  cartCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,

    backgroundColor: WHITE,

    borderWidth: 2,
    borderColor: ORANGE,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: ORANGE,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  cartIcon: {
    fontSize: 27,
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

  itemInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK,
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

  stepper: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: LIGHT_ORANGE,

    borderRadius: 20,

    paddingHorizontal: 4,
    paddingVertical: 4,

    borderWidth: 1,
    borderColor: "#F8D7CB",
  },

  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,

    backgroundColor: WHITE,

    borderWidth: 1,
    borderColor: ORANGE,

    justifyContent: "center",
    alignItems: "center",
  },

  plusBtn: {
    backgroundColor: ORANGE,
  },

  stepBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: ORANGE,
    lineHeight: 20,
  },

  plusText: {
    fontSize: 18,
    fontWeight: "900",
    color: WHITE,
    lineHeight: 20,
  },

  qty: {
    minWidth: 30,
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
