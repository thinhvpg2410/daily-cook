import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";

// 💰 Giá thực tế (ước tính đồng Việt Nam 2025)
const ingredients = [
  { name: "Gạo", unit: "100g", kcal: 130, price: 8000 },
  { name: "Thịt heo", unit: "100g", kcal: 242, price: 18000 },
  { name: "Thịt bò", unit: "100g", kcal: 250, price: 35000 },
  { name: "Thịt gà", unit: "100g", kcal: 239, price: 12000 },
  { name: "Cá basa", unit: "100g", kcal: 120, price: 8000 },
  { name: "Cá lóc", unit: "100g", kcal: 105, price: 10000 },
  { name: "Tôm", unit: "100g", kcal: 99, price: 25000 },
  { name: "Trứng gà", unit: "quả", kcal: 68, price: 4000 },
  { name: "Rau muống", unit: "100g", kcal: 20, price: 4000 },
  { name: "Cà chua", unit: "100g", kcal: 18, price: 5000 },
  { name: "Cà rốt", unit: "100g", kcal: 41, price: 6000 },
  { name: "Đường", unit: "tbsp", kcal: 48, price: 800 },
  { name: "Nước mắm", unit: "tbsp", kcal: 10, price: 1000 },
  { name: "Dầu ăn", unit: "tbsp", kcal: 120, price: 1500 },
  { name: "Hành tím", unit: "100g", kcal: 40, price: 15000 },
  { name: "Đậu phộng", unit: "100g", kcal: 567, price: 18000 },
];

const recipes = [
  {
    title: "Phở bò Hà Nội",
    description: "Nước dùng trong, ngọt xương, hương quế hồi đặc trưng.",
    image:
      "https://cdn.tgdd.vn/Files/2022/01/25/1412805/cach-nau-pho-bo-nam-dinh-chuan-vi-thom-ngon-nhu-hang-quan-202201250313281452.jpg",
    ingredients: [
      { name: "Thịt bò", amount: 200, unit: "g" },
      { name: "Gạo", amount: 100, unit: "g" },
      { name: "Hành tím", amount: 20, unit: "g" },
    ],
  },
  {
    title: "Cá kho tộ",
    description: "Món truyền thống miền Nam, vị đậm đà ăn cùng cơm trắng.",
    image:
      "https://cdn.tgdd.vn/Files/2021/02/23/1329799/bi-quyet-nau-ca-kho-to-ngon-chuan-vi-ca-dai-mau-sac-chuan-dep-202208271627215315.jpg",
    ingredients: [
      { name: "Cá basa", amount: 200, unit: "g" },
      { name: "Nước mắm", amount: 2, unit: "tbsp" },
      { name: "Đường", amount: 1, unit: "tbsp" },
    ],
  },
  {
    title: "Gỏi ngó sen tôm thịt",
    description: "Khai vị thanh mát, chua ngọt, ăn kèm bánh phồng tôm.",
    image:
      "https://cdn.tgdd.vn/Files/2020/06/13/1262734/cach-lam-goi-tai-heo-ngo-sen-chua-ngot-nham-nhi-cuoi-tuan-202006131454382396.jpg",
    ingredients: [
      { name: "Tôm", amount: 100, unit: "g" },
      { name: "Thịt heo", amount: 100, unit: "g" },
      { name: "Đậu phộng", amount: 20, unit: "g" },
    ],
  },
];

export default function ShoppingListScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [servings, setServings] = useState<number>(2);
  const [mode, setMode] = useState<"normal" | "saving">("normal");

  const toggleRecipe = (title: string) => {
    setSelected((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const selectedRecipes = recipes.filter((r) => selected.includes(r.title));

  const mergedIngredients: Record<string, { amount: number; unit: string }> = {};
  selectedRecipes.forEach((r) => {
    r.ingredients.forEach((ing) => {
      if (!mergedIngredients[ing.name])
        mergedIngredients[ing.name] = { amount: 0, unit: ing.unit };
      mergedIngredients[ing.name].amount += ing.amount * servings;
    });
  });

  const savingFactor = mode === "saving" ? 0.85 : 1;

  const totalDetails: { name: string; cost: number }[] = [];

  const totalCost = Object.entries(mergedIngredients).reduce((sum, [name, ing]) => {
    const ref = ingredients.find((i) => i.name === name);
    if (ref) {
      let cost = 0;
      if (ref.unit === "100g")
        cost = (ref.price * (ing.amount / 100)) * savingFactor;
      else cost = ref.price * ing.amount * savingFactor;
      totalDetails.push({ name, cost });
      return sum + cost;
    }
    return sum;
  }, 0);

  const totalKcal = Object.entries(mergedIngredients).reduce((sum, [name, ing]) => {
    const ref = ingredients.find((i) => i.name === name);
    if (ref) return sum + (ref.kcal * ing.amount * savingFactor) / 100;
    return sum;
  }, 0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Ionicons name="cart-outline" size={26} color="#f77" />
          <Text style={s.title}>Danh sách đi chợ</Text>
        </View>

        <Text style={s.subtitle}>
          <Ionicons name="restaurant-outline" size={16} color="#f77" /> Chọn món bạn muốn nấu:
        </Text>

        {recipes.map((r) => (
          <TouchableOpacity
            key={r.title}
            style={[s.recipeCard, selected.includes(r.title) && s.selectedCard]}
            onPress={() => toggleRecipe(r.title)}
          >
            <Image source={{ uri: r.image }} style={s.image} />
            <View style={{ flex: 1 }}>
              <Text style={s.recipeTitle}>{r.title}</Text>
              <Text style={s.recipeDesc}>{r.description}</Text>
            </View>
            {selected.includes(r.title) && (
              <Ionicons name="checkmark-circle" size={24} color="#f77" />
            )}
          </TouchableOpacity>
        ))}

        {selected.length > 0 && (
          <View style={s.resultBox}>
            <Text style={s.subtitle}>
              <Ionicons name="people-outline" size={16} color="#f77" /> Khẩu phần ăn:
            </Text>
            <TextInput
              keyboardType="numeric"
              value={String(servings)}
              onChangeText={(t) => setServings(Number(t) || 1)}
              style={s.input}
            />

            <Text style={s.subtitle}>
              <Ionicons name="flame-outline" size={16} color="#f77" /> Chế độ nấu ăn:
            </Text>
            <View style={s.modeRow}>
              <TouchableOpacity
                style={[s.modeBtn, mode === "normal" && s.modeActive]}
                onPress={() => setMode("normal")}
              >
                <Ionicons name="fast-food-outline" size={18} color={mode === "normal" ? "#fff" : "#777"} />
                <Text style={[s.modeText, mode === "normal" && s.modeTextActive]}>Thường</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeBtn, mode === "saving" && s.modeActive]}
                onPress={() => setMode("saving")}
              >
                <Ionicons name="cash-outline" size={18} color={mode === "saving" ? "#fff" : "#777"} />
                <Text style={[s.modeText, mode === "saving" && s.modeTextActive]}>Tiết kiệm</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.subtitle}>
              <Ionicons name="basket-outline" size={16} color="#f77" /> Nguyên liệu cần mua:
            </Text>
            {Object.entries(mergedIngredients).map(([name, ing]) => {
              const detail = totalDetails.find((d) => d.name === name);
              return (
                <View key={name} style={s.ingredientRow}>
                  <Text style={s.ingredientName}>{name}</Text>
                  <Text style={s.ingredientAmount}>
                    {(ing.amount * savingFactor).toFixed(0)} {ing.unit}
                  </Text>
                  <Text style={s.ingredientCost}>
                    ~{Math.round(detail?.cost || 0).toLocaleString()}₫
                  </Text>
                </View>
              );
            })}

            <View style={s.divider} />

            <View style={s.summaryBox}>
              <Ionicons name="analytics-outline" size={18} color="#f77" />
              <View>
                <Text style={s.nutrition}>
                  Tổng năng lượng:{" "}
                  <Text style={s.highlight}>{Math.round(totalKcal)} kcal</Text>
                </Text>
                <Text style={s.nutrition}>
                  Ước tính chi phí:{" "}
                  <Text style={s.highlight}>
                    ~{Math.round(totalCost).toLocaleString()}₫
                  </Text>
                </Text>
                <Text style={s.nutrition}>
                  Trung bình:{" "}
                  <Text style={s.highlight}>
                    ~{Math.round(totalCost / servings).toLocaleString()}₫ / người
                  </Text>
                </Text>
              </View>
            </View>
          </View>
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: "#f77", marginLeft: 8 },
  subtitle: { fontSize: 16, fontWeight: "600", color: "#333", marginVertical: 8 },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0f3",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  selectedCard: { borderWidth: 2, borderColor: "#f77" },
  image: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  recipeTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  recipeDesc: { fontSize: 13, color: "#777", marginTop: 2 },
  resultBox: {
    backgroundColor: "#fffafc",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modeActive: { backgroundColor: "#f77", borderColor: "#f77" },
  modeText: { color: "#555", fontWeight: "600" },
  modeTextActive: { color: "#fff" },

  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  ingredientName: { flex: 1.3, fontSize: 14, color: "#333" },
  ingredientAmount: { flex: 0.8, fontSize: 14, color: "#777", textAlign: "center" },
  ingredientCost: { flex: 1, fontSize: 14, color: "#f77", textAlign: "right" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },

  summaryBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fff0f3",
    borderRadius: 10,
    padding: 10,
  },
  nutrition: { fontSize: 14, color: "#444" },
  highlight: { color: "#f77", fontWeight: "700" },
});
