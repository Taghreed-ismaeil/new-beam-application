import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import BackButton from "@/components/BackButton";
import { useCart } from "@/context/CartContext";
import { apiRequest, imageUrl } from "@/lib/api-client";

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const DARK = "#17201F";
const MUTED = "#68706E";

const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const WHITE = "#FFFFFF";

const FALLBACK_IMAGE = require("../../assets/img/menu-1.jpg");

const CATEGORY_ID = 1;

/* =========================================================
   TYPES
========================================================= */

type MenuItem = {
  id: number;
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number | string;
  imageUrl?: string | null;
};

type MenuCategory = {
  id: number;
  name?: string;
  nameEn?: string;
  items?: MenuItem[];
};

type MenuResponse = {
  categories?: MenuCategory[];
};

/* =========================================================
   SCREEN
========================================================= */

export default function Shawerma() {
  const { width } = useWindowDimensions();

  const cart = useCart();

  const [category, setCategory] = useState<MenuCategory | null>(null);
  const [loading, setLoading] = useState(true);

  const isSmall = width < 360;

  /* ================= FETCH MENU ================= */

  useEffect(() => {
    apiRequest("/api/menu")
      .then((data: MenuResponse) => {
        const foundCategory =
          data.categories?.find(
            (categoryItem) => categoryItem.id === CATEGORY_ID,
          ) ?? null;

        setCategory(foundCategory);
      })
      .catch(() => {
        setCategory(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* ================= CART ================= */

  function handleAdd(item: MenuItem) {
    cart.add({
      id: item.id,
      name: item.nameEn || item.name || "Menu item",
      price: Number(item.price),
    });
  }

  function getQuantity(itemId: number) {
    const line = cart.lines.find((cartLine) => cartLine.menuItemId === itemId);

    return line?.quantity ?? 0;
  }

  function increaseQuantity(item: MenuItem) {
    cart.add({
      id: item.id,
      name: item.nameEn || item.name || "Menu item",
      price: Number(item.price),
    });
  }

  function decreaseQuantity(item: MenuItem) {
    const quantity = getQuantity(item.id);

    if (quantity > 0) {
      cart.setQuantity(item.id, quantity - 1);
    }
  }

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <BackButton />

        <View style={styles.loadingIcon}>
          <Text style={styles.loadingEmoji}>🌯</Text>
        </View>

        <ActivityIndicator size="small" color={TEAL} />

        <Text style={styles.loadingText}>Preparing your shawerma...</Text>
      </View>
    );
  }

  const items = category?.items ?? [];

  /* ================= SCREEN ================= */

  return (
    <View style={styles.screen}>
      <BackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ================= HERO ================= */}

        <View style={styles.heroContainer}>
          <Image
            source={require("../../assets/img/menu-1.jpg")}
            style={[
              styles.heroImage,
              {
                height: isSmall ? 270 : 315,
              },
            ]}
          />

          {/* soft overlay */}
          <View style={styles.heroOverlay} />

          {/* Shawerma title */}
          <Text
            style={[
              styles.heroTitle,
              {
                fontSize: isSmall ? 30 : 36,
              },
            ]}
          >
            Shawerma
          </Text>

          {/* wave */}
          <Svg
            width="100%"
            height={85}
            viewBox="0 20 1440 100"
            style={styles.wave}
            preserveAspectRatio="none"
          >
            <Path
              fill={WHITE}
              d="
                M0,55
                C180,110 320,20 520,55
                C760,100 980,15 1180,50
                C1310,72 1380,65 1440,45
                L1440,120
                L0,120
                Z
              "
            />
          </Svg>
        </View>

        {/* ================= MENU ================= */}

        <View style={styles.section}>
          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyEmoji}>🌯</Text>
              </View>

              <Text style={styles.emptyTitle}>No shawerma yet</Text>

              <Text style={styles.emptyText}>
                We’re preparing something delicious.
              </Text>
            </View>
          ) : (
            items.map((item, index) => (
              <FoodCard
                key={item.id}
                item={item}
                quantity={getQuantity(item.id)}
                onAdd={() => handleAdd(item)}
                onIncrease={() => increaseQuantity(item)}
                onDecrease={() => decreaseQuantity(item)}
                index={index}
                isSmall={isSmall}
              />
            ))
          )}
        </View>

        {/* ================= FOOTER ================= */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>MADE FRESH FOR YOU</Text>

          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   FOOD CARD
========================================================= */

type FoodCardProps = {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  index: number;
  isSmall: boolean;
};

function FoodCard({
  item,
  quantity,
  onAdd,
  onIncrease,
  onDecrease,
  index,
  isSmall,
}: FoodCardProps) {
  const itemName = item.nameEn || item.name || "Menu item";

  const itemDescription = item.descriptionEn || item.description;

  const price = Number(item.price).toFixed(2);

  const accent = index % 2 === 0 ? TEAL : ORANGE;

  const soft = index % 2 === 0 ? LIGHT_TEAL : LIGHT_ORANGE;

  return (
    <View style={styles.card}>
      {/* accent line */}

      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor: accent,
          },
        ]}
      />

      {/* image */}

      <Image
        source={
          item.imageUrl
            ? {
                uri: imageUrl(item.imageUrl),
              }
            : FALLBACK_IMAGE
        }
        style={[
          styles.foodImage,
          {
            width: isSmall ? 86 : 96,
            height: isSmall ? 86 : 96,
          },
        ]}
      />

      {/* content */}

      <View style={styles.foodContent}>
        <Text style={styles.foodName} numberOfLines={2}>
          {itemName}
        </Text>

        {!!itemDescription && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {itemDescription}
          </Text>
        )}

        <View style={styles.bottomRow}>
          {/* PRICE */}

          <View
            style={[
              styles.pricePill,
              {
                backgroundColor: soft,
              },
            ]}
          >
            <Text
              style={[
                styles.price,
                {
                  color: accent,
                },
              ]}
            >
              {price} JD
            </Text>
          </View>

          {/* ADD / QUANTITY */}

          {quantity === 0 ? (
            <Pressable
              onPress={onAdd}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: accent,
                },
                pressed && styles.addPressed,
              ]}
            >
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.quantityControl,
                {
                  backgroundColor: soft,
                  borderColor: accent,
                },
              ]}
            >
              {/* MINUS */}

              <Pressable
                onPress={onDecrease}
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.addPressed,
                ]}
              >
                <Text
                  style={[
                    styles.quantityButtonText,
                    {
                      color: accent,
                    },
                  ]}
                >
                  −
                </Text>
              </Pressable>

              {/* NUMBER */}

              <Text
                style={[
                  styles.quantityText,
                  {
                    color: accent,
                  },
                ]}
              >
                {quantity}
              </Text>

              {/* PLUS */}

              <Pressable
                onPress={onIncrease}
                style={({ pressed }) => [
                  styles.quantityButton,
                  {
                    backgroundColor: accent,
                  },
                  pressed && styles.addPressed,
                ]}
              >
                <Text style={styles.quantityPlusText}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* ================= SCREEN ================= */

  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  content: {
    paddingBottom: 105,
  },

  /* ================= LOADING ================= */

  loadingScreen: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 25,
    backgroundColor: LIGHT_TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  loadingEmoji: {
    fontSize: 31,
  },

  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  /* ================= HERO ================= */

  heroTitle: {
    position: "absolute",
    bottom: 5,
    left: 140,
    color: TEAL,
    fontWeight: "900",
    letterSpacing: -1.2,
    zIndex: 2,

    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  heroContainer: {
    width: "100%",
    height: 315,
    position: "relative",
    overflow: "hidden",
  },

  heroImage: {
    width: "100%",
    resizeMode: "cover",
  },

  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "65%",
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  wave: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
  },

  /* ================= SECTION ================= */

  section: {
    marginTop: 23,
    marginHorizontal: 18,
  },

  /* ================= FOOD CARD ================= */

  card: {
    minHeight: 120,
    backgroundColor: WHITE,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#ECEDEB",
    marginBottom: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,
  },

  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  foodImage: {
    borderRadius: 17,
    resizeMode: "cover",
    marginLeft: 3,
    marginRight: 12,
  },

  foodContent: {
    flex: 1,
    minWidth: 0,
  },

  foodName: {
    color: DARK,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    marginBottom: 4,
  },

  itemDescription: {
    color: MUTED,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "500",
    marginBottom: 8,
    paddingRight: 3,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  /* ================= PRICE ================= */

  pricePill: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  price: {
    fontSize: 11,
    fontWeight: "900",
  },

  /* ================= ADD BUTTON ================= */

  addButton: {
    minWidth: 62,
    height: 34,
    borderRadius: 12,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  addText: {
    color: WHITE,
    fontSize: 10.5,
    fontWeight: "900",
  },

  /* ================= QUANTITY ================= */

  quantityControl: {
    height: 34,
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 3,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",
  },

  quantityButtonText: {
    fontSize: 18,
    fontWeight: "900",
  },

  quantityPlusText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "900",
  },

  quantityText: {
    minWidth: 25,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
  },

  addPressed: {
    opacity: 0.65,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  /* ================= EMPTY ================= */

  emptyCard: {
    backgroundColor: LIGHT_TEAL,
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D5EBE7",
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyEmoji: {
    fontSize: 28,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 5,
  },

  emptyText: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
  },

  /* ================= FOOTER ================= */

  footer: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DEDFDD",
  },

  footerText: {
    color: "#9A9F9D",
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
