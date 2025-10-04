import React from "react";
import { View, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
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
    <SafeAreaView style={styles.safe}>
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
                color={focused ? "#fff" : "rgba(255,255,255,0.7)"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#f77" },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#f77",
  },
  tab: { flex: 1, alignItems: "center" },
});
