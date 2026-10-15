import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import AboutUs from "@/components/AboutUs/AboutUs";
import Footer from "@/components/Footer/Footer";
import Hero from "@/components/Hero/Hero";
import MenuCard from "@/components/MenuCard/MenuCard";
import { enterFade, enterUp } from "@/lib/motion";

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70 }}
      >
        <Animated.View entering={enterFade(0)}>
          <Hero />
        </Animated.View>

        <Animated.View entering={enterUp(3)}>
          <MenuCard />
        </Animated.View>

        <Animated.View entering={enterUp(5)}>
          <AboutUs />
        </Animated.View>

        <Footer />
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
