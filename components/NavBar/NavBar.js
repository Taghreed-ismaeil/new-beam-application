import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function NavBar() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const iconSize = Math.max(20, Math.min(width * 0.055, 28));
  const waveHeight = width * 0.08;

  return (
    <View>
      <ImageBackground
        source={require("@/assets/img/remove-beam.jpg")}
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            height: 60 + insets.top,
            paddingHorizontal: width * 0.04,
          },
        ]}
        imageStyle={[
          styles.image,
          {
            transform: [{ translateX: -width * 0.3 }, { scale: 1.3 }],
          },
        ]}
        resizeMode="contain"
      >
        <View style={styles.right}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push("/search")}
          >
            {({ pressed }) => (
              <Ionicons
                name="search-outline"
                size={iconSize}
                color={pressed ? "#ff8c00" : "#ED5529"}
              />
            )}
          </Pressable>

          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push("/cart")}
          >
            {({ pressed }) => (
              <Ionicons
                name="bag-outline"
                size={iconSize}
                color={pressed ? "#ff8c00" : "#ED5529"}
              />
            )}
          </Pressable>
        </View>
      </ImageBackground>

      {/* Wave */}
      <Svg
        width="100%"
        height={waveHeight}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={styles.waveTop}
      >
        <Path
          fill="#008E82"
          d="
            M0,80
            C180,20 320,110 520,70
            C760,20 980,120 1180,70
            C1310,45 1380,55 1440,80
            L1440,0
            L0,0
            Z
          "
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#008E82",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBtn: {
    padding: 8,
    marginLeft: 12,
  },

  waveTop: {
    marginTop: -1,
  },
});
