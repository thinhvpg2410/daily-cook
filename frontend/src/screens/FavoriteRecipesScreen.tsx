import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import { getFavoritesApi, removeFavoriteApi, FavoriteRecipe } from "../api/recipes";
import { API_BASE_URL } from "../config/env";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
  return src;
}

export default function FavoriteRecipesScreen({ navigation }: any) {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    try {
      const res = await getFavoritesApi();
      setFavorites(res.data || []);
    } catch (error: any) {
      console.error("Error loading favorites:", error);
      if (error?.response?.status !== 401) {
        Alert.alert("Lỗi", "Không thể tải danh sách yêu thích. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handleRemoveFavorite = async (recipeId: string) => {
    try {
      await removeFavoriteApi(recipeId);
      setFavorites(favorites.filter((f) => f.recipe.id !== recipeId));
    } catch (error: any) {
      console.error("Error removing favorite:", error);
      Alert.alert("Lỗi", "Không thể xóa khỏi yêu thích. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#f77" />
          <Text style={{ marginTop: 12, color: "#666" }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f77" />}
      >
        <Text style={s.title}>Món ăn yêu thích</Text>

        {favorites.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="heart-outline" size={60} color="#fbb" style={{ marginBottom: 10 }} />
            <Text style={s.empty}>Bạn chưa thêm món ăn nào vào yêu thích!</Text>

            <TouchableOpacity
              style={s.exploreBtn}
              onPress={() => navigation.navigate("Home")}
            >
              <Ionicons name="home-outline" size={18} color="#fff" />
              <Text style={s.exploreText}>Khám phá công thức</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favorites.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Details", { item: item.recipe })}
            >
              <Image source={{ uri: normalizeImage(item.recipe.image) }} style={s.image} />
              <View style={s.info}>
                <Text style={s.name}>{item.recipe.title}</Text>
                <View style={s.meta}>
                  {item.recipe.totalKcal && (
                    <Text style={s.sub}>~ {Math.round(item.recipe.totalKcal)} kcal</Text>
                  )}
                  {item.recipe.cookTime && (
                    <Text style={s.sub}> • {item.recipe.cookTime} phút</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveFavorite(item.recipe.id)}
                style={s.heartButton}
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: 70, height: 70, borderRadius: 10, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center" },
  sub: { fontSize: 13, color: "#777" },
  heartButton: {
    padding: 4,
  },
});
