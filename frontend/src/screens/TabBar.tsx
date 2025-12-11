import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_HEIGHT = 60;

export function TabBarSpacer() {
  const { bottom } = useSafeAreaInsets();
  return <View style={{ height: TAB_BAR_HEIGHT + (bottom || 0) }} />;
}

export default function TabBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { bottom } = useSafeAreaInsets();

  const activeTab = useMemo(() => {
    const map: Record<string, string> = {
      Category: "Home",
      Details: "Home",
      Cooking: "Home",
      MealSuggest: "MealPlan",
      Calendar: "MealPlan",
      NutritionGoals: "NutritionTracker",
      CookingHistory: "NutritionTracker",
      CookingStats: "NutritionTracker",
      FavoriteRecipes: "Profile",
      EditProfile: "Profile",
      ChangePassword: "Profile",
      ShoppingList: "Profile",
      Fridge: "Home",
    };
    return map[route.name] || route.name;
  }, [route.name]);

  const tabs = [
    { name: "Home", icon: "home" },
    { name: "MealPlan", icon: "layers" },
    { name: "NutritionTracker", icon: "nutrition" },
    { name: "Profile", icon: "person" },
  ];

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <SafeAreaView style={[styles.safe, { paddingBottom: bottom || 0 }]} edges={["bottom"]}>
        <View style={styles.container}>
          {tabs.map((tab) => {
            const focused = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => navigation.navigate(tab.name as never)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  safe: {
    backgroundColor: "#f77",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: TAB_BAR_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#f77",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  tab: { flex: 1, alignItems: "center" },
});
