import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { apiRequest, imageUrl } from "@/lib/api-client";
import { useCart } from "@/context/CartContext";
import BackButton from "@/components/BackButton";

const screenWidth = Dimensions.get("window").width;
const FALLBACK_IMAGE = require("../../assets/img/menu-5.jpg");

export default function CategoryScreen() {
  const { categoryId } = useLocalSearchParams();
  const cart = useCart();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    apiRequest("/api/menu")
      .then((data) => {
        const found = data.categories.find((c) => String(c.id) === String(categoryId));
        setCategory(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  function handleAdd(item) {
    cart.add({ id: item.id, name: item.nameEn || item.name, price: Number(item.price) });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 900);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <BackButton />
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  if (!category) {
    return (
      <View style={styles.centered}>
        <BackButton />
        <Text style={styles.title}>Not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BackButton />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroContainer}>
        <Image
          source={category.imageUrl ? { uri: imageUrl(category.imageUrl) } : FALLBACK_IMAGE}
          style={styles.heroImage}
        />
        <Svg width="100%" height={80} viewBox="0 20 1440 10" style={styles.wave}>
          <Path
            fill="#ffffff"
            d="M0,35 C180,95 320,10 520,45 C760,90 980,0 1180,40 C1310,65 1380,55 1440,35 L1440,120 L0,120 Z"
          />
        </Svg>
      </View>

      <Text style={styles.title}>{category.nameEn || category.name}</Text>

      <View style={styles.section}>
        {category.items.length === 0 && (
          <Text style={styles.description}>No items in this category yet.</Text>
        )}
        {category.items.map((item) => (
          <FoodCard key={item.id} item={item} added={addedId === item.id} onAdd={() => handleAdd(item)} />
        ))}
      </View>
      </ScrollView>
    </View>
  );
}

function FoodCard({ item, added, onAdd }) {
  return (
    <View style={styles.card}>
      <Image
        source={item.imageUrl ? { uri: imageUrl(item.imageUrl) } : FALLBACK_IMAGE}
        style={styles.image}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nameEn || item.name}</Text>
        {!!(item.descriptionEn || item.description) && (
          <Text style={styles.itemDescription} numberOfLines={2}>{item.descriptionEn || item.description}</Text>
        )}
        <Text style={styles.price}>{Number(item.price).toFixed(2)} JD</Text>
      </View>
      <Pressable style={styles.add} onPress={onAdd}>
        <Text style={styles.addText}>{added ? "Added ✓" : "Add"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  heroContainer: { width: "100%", position: "relative" },
  heroImage: { width: screenWidth, height: 220, resizeMode: "cover" },
  wave: { position: "absolute", bottom: -1 },
  title: { fontSize: 30, fontWeight: "900", textAlign: "center", color: "#111", marginTop: 20 },
  description: { textAlign: "center", color: "#777", marginVertical: 20 },
  section: { marginHorizontal: 20, marginTop: 20, marginBottom: 40 },
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
  image: { width: 90, height: 90, borderRadius: 15 },
  name: { fontSize: 17, fontWeight: "800", marginLeft: 15, color: "#111" },
  itemDescription: { marginLeft: 15, marginTop: 2, color: "#999", fontSize: 12 },
  price: { marginLeft: 15, marginTop: 8, color: "#ff8c00", fontWeight: "700" },
  add: { backgroundColor: "#ff8c00", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  addText: { color: "#fff", fontWeight: "900" },
});
