import { ScrollView, StyleSheet, View } from "react-native";

import AboutUs from "@/components/AboutUs/AboutUs";
import Footer from "@/components/Footer/Footer";
import Hero from "@/components/Hero/Hero";
import MenuCard from "@/components/MenuCard/MenuCard";

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 70 }}
      >
        <Hero />

        <MenuCard />

        <AboutUs />

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
