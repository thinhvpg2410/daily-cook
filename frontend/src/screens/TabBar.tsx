import React, { useRef, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function TabBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  // ref để giữ lại category/item cuối cùng
  const lastCategory = useRef<string>("Breakfast");
  const lastItem = useRef<any>({
    id: "1",
    title: "Pancake & Cream",
    desc: "Fluffy pancakes with cream",
    image:
      "https://heavenlyhomecooking.com/wp-content/uploads/2022/06/Sweet-Cream-Pancakes-Recipe-Featured-500x500.jpg",
    time: "20min",
    likes: 2273,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener("state", (e: any) => {
      const currentRoute = e.data.state.routes[e.data.state.index];

      if (currentRoute.name === "Category" && currentRoute.params?.category) {
        lastCategory.current = currentRoute.params.category;
      }

      if (currentRoute.name === "Details" && currentRoute.params?.item) {
        lastItem.current = currentRoute.params.item;
      }
    });

    return unsubscribe;
  }, [navigation]);

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
              onPress={() => {
                if (tab.name === "Category") {
                  navigation.navigate("Category", { category: lastCategory.current });
                } else if (tab.name === "Details") {
                  navigation.navigate("Details", { item: lastItem.current });
                } else {
                  navigation.navigate(tab.name);
                }
              }}
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
