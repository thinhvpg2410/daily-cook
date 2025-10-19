import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import { http } from "../api/http";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `http://localhost:3000${src}`;
  return src;
}

type RecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  cookTime?: number | null;
  likes?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  steps?: string[];
  items?: {
    amount: number;
    unitOverride?: string | null;
    ingredient: { name: string; unit?: string | null };
  }[];
};

export default function DetailsScreen({ route, navigation }: any) {
  const { item } = route.params;
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await http.get(`/recipes/${item.id}`);
        const r = res.data as RecipeDetail;
        setDetail(r);
      } catch (e) {
        console.warn("Fetch recipe detail failed:", e);
        setDetail({
          id: item.id,
          title: item.title,
          description: item.desc,
          image: item.image,
          cookTime: parseInt(item.time) || 30,
          likes: item.likes,
          calories: 320,
          protein: 25,
          carbs: 15,
          fat: 10,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [item?.id]);

  const img = normalizeImage(detail?.image ?? item?.image);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#f77" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{detail?.title || item.title}</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="share-social-outline" size={20} color="#f77" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="heart-outline" size={20} color="#f77" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image + overlay */}
        <View style={s.imageWrap}>
          {loading ? (
            <View
              style={{ height: 220, alignItems: "center", justifyContent: "center" }}
            >
              <ActivityIndicator size="large" color="#f77" />
            </View>
          ) : (
            <Image source={{ uri: img }} style={s.image} />
          )}
          <TouchableOpacity style={s.playBtn}>
            <Ionicons name="play" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={s.imageFooter}>
            <Text style={s.dishTitle}>{item.title}</Text>
            <View style={s.row}>
              <Ionicons name="heart" size={14} color="#f77" />
              <Text style={s.infoText}>{item.likes}</Text>
              <Text style={[s.infoText, { marginLeft: 6 }]}>2,273</Text>
            </View>
          </View>
        </View>

        {/* Chef info */}
        <View style={s.chefBox}>
          <Image
            source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
            style={s.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.chefName}>@josh-ryan</Text>
            <Text style={s.chefDesc}>Josh Ryan - Chef</Text>
          </View>
          <TouchableOpacity style={s.followBtn}>
            <Text style={{ color: "#f77", fontWeight: "600" }}>Following</Text>
          </TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={18} color="#f77" style={{ marginLeft: 10 }} />
        </View>

        {/* Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Details</Text>
          <View style={s.row}>
            <Ionicons name="time-outline" size={16} color="#f77" />
            <Text style={{ marginLeft: 6, color: "#555" }}>
              {(detail?.cookTime ?? 30)} min
            </Text>
          </View>
          <Text style={s.desc}>{detail?.description || item?.desc || ""}</Text>
        </View>

        {/* Calories section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Calories</Text>
          <View style={s.calorieBox}>
            <Text style={s.calorieValue}>{detail?.calories ?? 320} kcal</Text>
          </View>

          <View style={s.macroRow}>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Protein</Text>
              <Text style={s.macroValue}>{detail?.protein ?? 25} g</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Carbs</Text>
              <Text style={s.macroValue}>{detail?.carbs ?? 15} g</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Fat</Text>
              <Text style={s.macroValue}>{detail?.fat ?? 10} g</Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ingredients</Text>
          {detail?.items?.length ? (
            detail.items.map((it, idx) => (
              <Text key={idx} style={s.ing}>
                • {it.amount}
                {it.unitOverride || it.ingredient.unit
                  ? ` ${it.unitOverride || it.ingredient.unit}`
                  : ""}{" "}
                {it.ingredient.name}
              </Text>
            ))
          ) : (
            [
              "1 cup all-purpose flour",
              "2 tablespoons granulated sugar",
              "1 teaspoon baking powder",
              "1/2 teaspoon baking soda",
              "1/4 teaspoon salt",
              "1 cup buttermilk",
              "1 large egg",
              "2 tablespoons unsalted butter",
            ].map((ing, idx) => (
              <Text key={idx} style={s.ing}>
                • {ing}
              </Text>
            ))
          )}
        </View>
      </ScrollView>

      <View style={{ marginBottom: 50 }}>
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#f77" },
  iconBtn: { backgroundColor: "#ffeef0", padding: 6, borderRadius: 20, marginLeft: 8 },

  imageWrap: { position: "relative", marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  image: { width: "100%", height: 220, borderRadius: 12 },
  playBtn: {
    position: "absolute",
    top: "40%",
    left: "45%",
    backgroundColor: "#f77",
    borderRadius: 30,
    padding: 14,
  },
  imageFooter: {
    backgroundColor: "#f77",
    padding: 12,
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dishTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center" },
  infoText: { color: "#fff", fontSize: 13, marginLeft: 4 },

  chefBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  chefName: { fontSize: 14, fontWeight: "600", color: "#333" },
  chefDesc: { fontSize: 12, color: "#777" },
  followBtn: {
    borderWidth: 1,
    borderColor: "#f77",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },

  section: { padding: 16, borderBottomWidth: 1, borderColor: "#eee" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#f77", marginBottom: 6 },
  desc: { fontSize: 13, color: "#555", marginTop: 6, lineHeight: 18 },
  ing: { fontSize: 13, color: "#555", marginVertical: 2 },

  calorieBox: {
    backgroundColor: "#ffebee",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  calorieValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#e53935",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  macroItem: { alignItems: "center" },
  macroLabel: { fontSize: 13, color: "#777" },
  macroValue: { fontSize: 15, fontWeight: "600", color: "#333" },
});
