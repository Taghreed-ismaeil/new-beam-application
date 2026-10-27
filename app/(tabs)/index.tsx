import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import AboutUs from "@/components/AboutUs/AboutUs";
import Footer from "@/components/Footer/Footer";
import Hero from "@/components/Hero/Hero";
import MenuCard from "@/components/MenuCard/MenuCard";
import { refreshCached } from "@/lib/api-client";
import { enterFade, enterUp } from "@/lib/motion";

export default function HomeScreen() {
  // Pull down to refresh: re-fetch the menu (into the shared cache) and bump the
  // key the sections watch, so they re-read the menu, offers and restaurant info.
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function onRefresh() {
    setRefreshing(true);
    await refreshCached("/api/menu").catch(() => {});
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#005751" colors={["#005751"]} />
        }
        contentContainerStyle={{ paddingBottom: 70 }}
      >
        <Animated.View entering={enterFade(0)}>
          <Hero />
        </Animated.View>

        <Animated.View entering={enterUp(3)}>
          <MenuCard refreshKey={refreshKey} />
        </Animated.View>

        <Animated.View entering={enterUp(5)}>
          <AboutUs />
        </Animated.View>

        <Footer refreshKey={refreshKey} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
