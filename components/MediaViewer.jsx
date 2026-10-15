import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imageUrl } from "@/lib/api-client";
import { useAppLang } from "@/lib/app-lang";

/** Full-screen look at one media photo, with its caption. Tap anywhere to close. */
export default function MediaViewer({ post, onClose }) {
  const { t, dir } = useAppLang();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!post} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {!!post && (
          <>
            <Image
              source={{ uri: imageUrl(post.imageUrl) }}
              cachePolicy="memory-disk"
              contentFit="contain"
              transition={150}
              style={styles.image}
            />
            {(!!post.caption || !!post.author) && (
              <View style={[styles.caption, { paddingBottom: 24 + insets.bottom }]}>
                {!!post.author && (
                  <Text style={[styles.author, dir.text]}>{t("mediaBy", { name: post.author })}</Text>
                )}
                {!!post.caption && <Text style={[styles.captionText, dir.text]}>{post.caption}</Text>}
              </View>
            )}
          </>
        )}
        <View style={[styles.close, { top: 16 + insets.top }]}>
          <Ionicons name="close" size={24} color="#fff" />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,14,13,0.96)",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "75%",
  },

  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  author: {
    color: "#FFB59C",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },

  captionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },

  close: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
