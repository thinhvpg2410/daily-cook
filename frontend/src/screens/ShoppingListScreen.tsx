import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { getShoppingListApi } from "../api/mealplan";

// 💰 Giá thực tế (ước tính đồng Việt Nam 2025) - có thể mở rộng từ database
const INGREDIENT_PRICES: Record<string, number> = {
  "Gạo": 8000,
  "Thịt heo": 18000,
  "Thịt bò": 35000,
  "Thịt gà": 12000,
  "Cá basa": 8000,
  "Cá lóc": 10000,
  "Tôm": 25000,
  "Trứng gà": 4000,
  "Rau muống": 4000,
  "Cà chua": 5000,
  "Cà rốt": 6000,
  "Đường": 800,
  "Nước mắm": 1000,
  "Dầu ăn": 1500,
  "Hành tím": 15000,
  "Đậu phộng": 18000,
};

function estimatePrice(name: string, amount: number, unit?: string): number {
  const basePrice = INGREDIENT_PRICES[name] || 10000; // Default 10k/100g
  if (unit === "g" || unit === "kg") {
    const amountIn100g = unit === "kg" ? amount * 10 : amount / 100;
    return basePrice * amountIn100g;
  }
  // For other units (tbsp, piece, etc.), use base price
  return basePrice * amount;
}

export default function ShoppingListScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [servings, setServings] = useState<number>(2);
  const [mode, setMode] = useState<"normal" | "saving">("normal");
  const [shoppingItems, setShoppingItems] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const fetchShoppingList = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

      const res = await getShoppingListApi({
        start: startOfWeek.toISOString().split("T")[0],
        end: endOfWeek.toISOString().split("T")[0],
      });

      const items = res.data?.items || [];
      setShoppingItems(items);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchShoppingList();
    }
  }, [token]);

  const toggleItem = (ingredientId: string) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const savingFactor = mode === "saving" ? 0.85 : 1;
  const adjustedItems = shoppingItems.map((item) => ({
    ...item,
    qty: item.qty * servings * savingFactor,
  }));

  const totalCost = adjustedItems.reduce((sum, item) => {
    const price = estimatePrice(item.name, item.qty, item.unit);
    return sum + price;
  }, 0);

  const uncheckedItems = adjustedItems.filter((item) => !checkedItems.has(item.ingredientId));
  const remainingCost = uncheckedItems.reduce((sum, item) => {
    const price = estimatePrice(item.name, item.qty, item.unit);
    return sum + price;
  }, 0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Ionicons name="cart-outline" size={26} color="#f77" />
          <Text style={s.title}>Danh sách đi chợ</Text>
        </View>

        {!token ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: "#777" }}>Vui lòng đăng nhập để xem danh sách mua sắm</Text>
          </View>
        ) : loading ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#f77" />
          </View>
        ) : shoppingItems.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: "#777" }}>Chưa có món ăn nào trong tuần này</Text>
            <Text style={{ color: "#777", marginTop: 8, fontSize: 12 }}>
              Hãy lên kế hoạch thực đơn để tạo danh sách mua sắm
            </Text>
          </View>
        ) : (
          <>
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
              {adjustedItems.map((item) => {
                const isChecked = checkedItems.has(item.ingredientId);
                const price = estimatePrice(item.name, item.qty, item.unit);
                return (
                  <TouchableOpacity
                    key={item.ingredientId}
                    style={[s.ingredientRow, isChecked && s.ingredientRowChecked]}
                    onPress={() => toggleItem(item.ingredientId)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1.3 }}>
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={20}
                        color={isChecked ? "#f77" : "#ccc"}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[s.ingredientName, isChecked && s.ingredientNameChecked]}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={[s.ingredientAmount, isChecked && s.ingredientNameChecked]}>
                      {item.qty.toFixed(1)} {item.unit || "g"}
                    </Text>
                    <Text style={[s.ingredientCost, isChecked && s.ingredientNameChecked]}>
                      ~{Math.round(price).toLocaleString()}₫
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={s.divider} />

              <View style={s.summaryBox}>
                <Ionicons name="analytics-outline" size={18} color="#f77" />
                <View style={{ flex: 1 }}>
                  <Text style={s.nutrition}>
                    Tổng chi phí ước tính:{" "}
                    <Text style={s.highlight}>~{Math.round(totalCost).toLocaleString()}₫</Text>
                  </Text>
                  <Text style={s.nutrition}>
                    Còn lại cần mua:{" "}
                    <Text style={s.highlight}>~{Math.round(remainingCost).toLocaleString()}₫</Text>
                  </Text>
                  <Text style={s.nutrition}>
                    Đã mua:{" "}
                    <Text style={s.highlight}>
                      {checkedItems.size}/{shoppingItems.length} món
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </>
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
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  ingredientRowChecked: {
    opacity: 0.5,
  },
  ingredientName: { fontSize: 14, color: "#333", flex: 1 },
  ingredientNameChecked: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  ingredientAmount: { flex: 0.8, fontSize: 14, color: "#777", textAlign: "center" },
  ingredientCost: { flex: 1, fontSize: 14, color: "#f77", textAlign: "right", fontWeight: "600" },
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
