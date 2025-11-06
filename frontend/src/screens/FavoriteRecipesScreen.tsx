import React, { useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";

export default function FavoriteRecipesScreen({ navigation }: any) {
  const [favorites, setFavorites] = useState<any[]>([]); // 👈 danh sách trống ban đầu

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
        <Text style={s.title}>Favorite Recipes</Text>

        {favorites.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="heart-outline" size={60} color="#fbb" style={{ marginBottom: 10 }} />
            <Text style={s.empty}>You haven't added any favorite recipes yet!</Text>

            <TouchableOpacity
              style={s.exploreBtn}
              onPress={() => navigation.navigate("Home")} // 👈 quay lại Home
            >
              <Ionicons name="home-outline" size={18} color="#fff" />
              <Text style={s.exploreText}>Go explore recipes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favorites.map((item) => (
            <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.9}>
              <Image source={{ uri: item.image }} style={s.image} />
              <View style={s.info}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.sub}>~ {item.kcal} kcal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setFavorites(favorites.filter((f) => f.id !== item.id))}
              >
                <Ionicons name="heart" size={24} color="#f77" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={{ marginBottom: 50 }}>
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#f77", marginBottom: 16 },

  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  empty: { textAlign: "center", color: "#777", fontSize: 15, marginBottom: 16 },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f77",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exploreText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 14,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff0f3",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  image: { width: 70, height: 70, borderRadius: 10, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#333" },
  sub: { fontSize: 13, color: "#777", marginTop: 2 },
});
