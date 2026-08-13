import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const TABS = [
  { key: "home", label: "Home", icon: "home", path: "/" },
  { key: "menu", label: "Menu", icon: "restaurant", path: "/menu" },
  { key: "contact", label: "Contact", icon: "call", path: "/contact" },
  { key: "gifts", label: "Gifts", icon: "gift", path: "/loyalty" },
  { key: "profile", label: "Profile", icon: "person", path: "/account" },
];

const HIDDEN_ON = ["/login"];

export default function BottomTabBar() {
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const active =
          tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => router.push(tab.path)}
          >
            <Ionicons
              name={active ? tab.icon : `${tab.icon}-outline`}
              size={22}
              color={active ? "#ED5529" : "#008E82"}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
    paddingBottom: 22,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 50,
  },
  tab: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    color: "#999",
    marginTop: 3,
    fontWeight: "600",
  },
  labelActive: {
    color: "#ff8c00",
    fontWeight: "800",
  },
});
