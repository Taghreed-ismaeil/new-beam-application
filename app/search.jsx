import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import BackButton from "@/components/BackButton";
import { useCart } from "@/context/CartContext";
import { apiRequest, imageUrl } from "@/lib/api-client";

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

const ORANGE = "#ED5529";
const TEAL = "#008E82";
const LIGHT_ORANGE = "#FFF0EA";
const LIGHT_TEAL = "#E8F5F2";
const CREAM = "#FFF9F4";
const DARK = "#17201F";
const MUTED = "#68706E";
const WHITE = "#FFFFFF";

export default function SearchScreen() {
  const cart = useCart();

  const { width, height } = useWindowDimensions();

  const isSmall = width < 400;
  const isShort = height < 700;

  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    apiRequest("/api/menu")
      .then((data) => {
        const items = data.categories.flatMap((c) =>
          c.items.map((i) => ({
            ...i,
            categoryId: c.id,
            categoryName: c.nameEn || c.name,
          })),
        );

        setAllItems(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return [];

    return allItems.filter((item) => {
      const haystack = [
        item.name,
        item.nameEn,
        item.description,
        item.descriptionEn,
        item.categoryName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [query, allItems]);

  function handleAdd(item) {
    cart.add({
      id: item.id,
      name: item.nameEn || item.name,
      price: Number(item.price),
    });

    setAddedId(item.id);

    setTimeout(() => {
      setAddedId(null);
    }, 900);
  }

  return (
    <View style={styles.container}>
      {/* =====================================================
          BACKGROUND DECORATIONS
      ====================================================== */}

      {/* Top Left Fork */}
      <View
        pointerEvents="none"
        style={[
          styles.decor,
          {
            left: isSmall ? -30 : -10,
            top: isShort ? 55 : 75,
            transform: [{ rotate: "-25deg" }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="silverware-fork"
          size={isSmall ? 80 : 105}
          color={ORANGE}
        />
      </View>

      {/* Top Right Knife */}
      <View
        pointerEvents="none"
        style={[
          styles.decor,
          {
            right: isSmall ? -30 : -10,
            top: isShort ? 90 : 110,
            transform: [{ rotate: "25deg" }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="silverware"
          size={isSmall ? 75 : 100}
          color={TEAL}
        />
      </View>

      {/* Bottom Left Spoon */}
      <View
        pointerEvents="none"
        style={[
          styles.decorBottom,
          {
            left: isSmall ? -5 : 20,
            bottom: isShort ? 80 : 105,
            transform: [{ rotate: "55deg" }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="silverware-spoon"
          size={isSmall ? 50 : 65}
          color={LIGHT_ORANGE}
        />
      </View>

      {/* Bottom Right Silverware */}
      <View
        pointerEvents="none"
        style={[
          styles.decorBottom,
          {
            right: isSmall ? -5 : 20,
            bottom: isShort ? 110 : 140,
            transform: [{ rotate: "-35deg" }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="silverware-variant"
          size={isSmall ? 50 : 65}
          color={LIGHT_TEAL}
        />
      </View>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <View
        style={[
          styles.header,
          {
            paddingTop: isShort ? 50 : 65,
          },
        ]}
      >
        <BackButton />

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.smallTitle}>BEAM MENU</Text>
            <Text style={styles.title}>Search</Text>
          </View>

          <View style={styles.searchIconCircle}>
            <Ionicons name="search" size={22} color={ORANGE} />
          </View>
        </View>

        {/* =====================================================
            SEARCH BOX
        ====================================================== */}

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={21} color={ORANGE} />

          <TextInput
            style={styles.input}
            placeholder="What are you craving?"
            placeholderTextColor="#A4A4A4"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />

          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={21} color="#C8C8C8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      {loading ? (
        <View style={styles.centered}>
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color={ORANGE} />
          </View>

          <Text style={styles.loadingText}>Loading the menu...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.section,
            {
              paddingBottom: isShort ? 35 : 55,
            },
          ]}
        >
          {/* Empty Search */}
          {!query && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="restaurant-outline" size={34} color={ORANGE} />
              </View>

              <Text style={styles.emptyTitle}>Hungry yet?</Text>

              <Text style={styles.muted}>
                Search for your favorite meal, drink or dessert.
              </Text>
            </View>
          )}

          {/* No Results */}
          {!!query && results.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={34} color={TEAL} />
              </View>

              <Text style={styles.emptyTitle}>Nothing found</Text>

              <Text style={styles.muted}>No items match "{query}"</Text>

              <Text style={styles.tryText}>Try another search</Text>
            </View>
          )}

          {/* Results */}
          {!!query && results.length > 0 && (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Results</Text>

                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{results.length}</Text>
                </View>
              </View>

              {results.map((item) => {
                const isAdded = addedId === item.id;

                return (
                  <View
                    key={item.id}
                    style={[styles.card, isAdded && styles.cardAdded]}
                  >
                    {/* Image */}
                    <Image
                      source={
                        item.imageUrl
                          ? {
                              uri: imageUrl(item.imageUrl),
                            }
                          : FALLBACK_IMAGE
                      }
                      style={styles.image}
                    />

                    {/* Information */}
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.nameEn || item.name}
                      </Text>

                      <Text style={styles.category} numberOfLines={1}>
                        {item.categoryName}
                      </Text>

                      {!!(item.descriptionEn || item.description) && (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {item.descriptionEn || item.description}
                        </Text>
                      )}

                      <Text style={styles.price}>
                        {Number(item.price).toFixed(2)} JD
                      </Text>
                    </View>

                    {/* Add Button */}
                    <Pressable
                      style={[styles.add, isAdded && styles.added]}
                      onPress={() => handleAdd(item)}
                    >
                      <Ionicons
                        name={isAdded ? "checkmark" : "add"}
                        size={17}
                        color={WHITE}
                      />

                      <Text style={styles.addText}>
                        {isAdded ? "Added" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* =====================================================
     CONTAINER
  ====================================================== */

  container: {
    flex: 1,
    backgroundColor: CREAM,
    overflow: "hidden",
  },

  /* =====================================================
     DECOR
  ====================================================== */

  decor: {
    position: "absolute",
    opacity: 0.12,
    zIndex: 0,
  },

  decorBottom: {
    position: "absolute",
    opacity: 0.3,
    zIndex: 0,
  },

  /* =====================================================
     HEADER
  ====================================================== */

  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: CREAM,
    zIndex: 2,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 18,
  },

  smallTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: TEAL,
    //marginBottom: 0,
    marginTop: 20,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: DARK,
  },

  searchIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: ORANGE,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,

    marginTop: 20,
  },

  /* =====================================================
     SEARCH
  ====================================================== */

  searchBox: {
    height: 55,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 18,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 15,
    gap: 10,

    shadowColor: ORANGE,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: DARK,
    height: "100%",
  },

  /* =====================================================
     CONTENT
  ====================================================== */

  section: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: ORANGE,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  loadingText: {
    marginTop: 14,
    color: MUTED,
    fontSize: 14,
    fontWeight: "600",
  },

  /* =====================================================
     EMPTY STATE
  ====================================================== */

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 55,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: ORANGE,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  emptyTitle: {
    color: DARK,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 7,
  },

  muted: {
    color: MUTED,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },

  tryText: {
    marginTop: 12,
    color: TEAL,
    fontWeight: "800",
    fontSize: 13,
  },

  /* =====================================================
     RESULTS HEADER
  ====================================================== */

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  resultsTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: DARK,
  },

  countBadge: {
    marginLeft: 8,
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: LIGHT_ORANGE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  countText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "900",
  },

  /* =====================================================
     FOOD CARD
  ====================================================== */

  card: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: WHITE,

    padding: 10,
    paddingRight: 11,

    borderRadius: 20,

    marginBottom: 13,

    borderWidth: 1,
    borderColor: "#F1E8E3",

    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  cardAdded: {
    borderColor: LIGHT_TEAL,
  },

  image: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
  },

  info: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 11,
  },

  name: {
    fontSize: 15,
    fontWeight: "900",
    color: DARK,
  },

  category: {
    marginTop: 3,
    color: TEAL,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  itemDescription: {
    marginTop: 4,
    color: MUTED,
    fontSize: 11,
    lineHeight: 15,
  },

  price: {
    marginTop: 5,
    color: ORANGE,
    fontSize: 14,
    fontWeight: "900",
  },

  /* =====================================================
     ADD BUTTON
  ====================================================== */

  add: {
    minWidth: 62,
    height: 34,

    paddingHorizontal: 9,

    borderRadius: 12,

    backgroundColor: TEAL,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 2,
  },

  added: {
    backgroundColor: ORANGE,
  },

  addText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },
});
