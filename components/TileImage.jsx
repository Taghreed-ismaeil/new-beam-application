import { Image, StyleSheet, View } from "react-native";
import { imageUrl } from "@/lib/api-client";

export default function TileImage({ itemId, grayImage, layers, revealedCount, updatedAt, size = 220 }) {
  const version = updatedAt ? `?v=${updatedAt}` : "";
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Image source={{ uri: imageUrl(grayImage) }} style={styles.base} />
      {layers.slice(0, revealedCount).map((layer, idx) => {
        const x0 = layer.x0 ?? 0;
        const x1 = layer.x1 ?? 1;
        return (
          <Image
            key={idx}
            source={{ uri: imageUrl(`/images/${itemId}/layer_${idx}.png${version}`) }}
            style={{
              position: "absolute",
              left: `${x0 * 100}%`,
              top: `${layer.y0 * 100}%`,
              width: `${(x1 - x0) * 100}%`,
              height: `${(layer.y1 - layer.y0) * 100}%`,
            }}
            resizeMode="cover"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, overflow: "hidden", backgroundColor: "#eee" },
  base: { width: "100%", height: "100%" },
});
