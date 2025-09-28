import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function TabBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const tabs = [
    { name: "Home", icon: "home" },
    { name: "Category", icon: "layers" },
    { name: "Details", icon: "book" },
    { name: "Profile", icon: "person" },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const focused = route.name === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Ionicons
              name={focused ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f77",
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
  },
});
