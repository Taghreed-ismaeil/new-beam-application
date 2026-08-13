import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { apiRequest, imageUrl } from "@/lib/api-client";
import { useCart } from "@/context/CartContext";
import BackButton from "@/components/BackButton";

const FALLBACK_IMAGE = require("../assets/img/menu-5.jpg");

export default function SearchScreen() {
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    apiRequest("/api/menu")
      .then((data) => {
        const items = data.categories.flatMap((c) =>
          c.items.map((i) => ({ ...i, categoryId: c.id, categoryName: c.nameEn || c.name }))
        );
        setAllItems(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allItems.filter((item) => {
      const haystack = [item.name, item.nameEn, item.description, item.descriptionEn, item.categoryName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, allItems]);

  function handleAdd(item) {
    cart.add({ id: item.id, name: item.nameEn || item.name, price: Number(item.price) });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 900);
  }

  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Search the menu..."
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color="#ccc" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ff8c00" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.section}>
          {!query && <Text style={styles.muted}>Start typing to search the menu</Text>}
          {!!query && results.length === 0 && <Text style={styles.muted}>No items match "{query}"</Text>}

          {results.map((item) => (
            <View key={item.id} style={styles.card}>
              <Image
                source={item.imageUrl ? { uri: imageUrl(item.imageUrl) } : FALLBACK_IMAGE}
                style={styles.image}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.nameEn || item.name}</Text>
                <Text style={styles.category}>{item.categoryName}</Text>
                {!!(item.descriptionEn || item.description) && (
                  <Text style={styles.itemDescription} numberOfLines={1}>
                    {item.descriptionEn || item.description}
                  </Text>
                )}
                <Text style={styles.price}>{Number(item.price).toFixed(2)} JD</Text>
              </View>
              <Pressable style={styles.add} onPress={() => handleAdd(item)}>
                <Text style={styles.addText}>{addedId === item.id ? "Added ✓" : "Add"}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: "#fff" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  input: { flex: 1, fontSize: 15, color: "#111" },
  section: { padding: 20, paddingTop: 10 },
  muted: { color: "#999", textAlign: "center", marginTop: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  image: { width: 70, height: 70, borderRadius: 14 },
  name: { fontSize: 16, fontWeight: "800", marginLeft: 15, color: "#111" },
  category: { marginLeft: 15, marginTop: 2, color: "#ff8c00", fontSize: 11, fontWeight: "700" },
  itemDescription: { marginLeft: 15, marginTop: 2, color: "#999", fontSize: 12 },
  price: { marginLeft: 15, marginTop: 6, color: "#ff8c00", fontWeight: "700" },
  add: { backgroundColor: "#ff8c00", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 15 },
  addText: { color: "#fff", fontWeight: "900", fontSize: 12 },
});
