import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import TabBar, { TabBarSpacer } from "./TabBar";

const mockIngredients = [
  "Thịt gà",
  "Thịt bò",
  "Cá hồi",
  "Sữa tươi",
  "Phô mai",
  "Trứng gà",
  "Bơ",
  "Cà rốt",
  "Khoai tây",
  "Hành lá",
];

export default function FridgeScreen() {
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [fridgeList, setFridgeList] = useState<any[]>([]);

  const addIngredient = () => {
    if (!selectedIngredient || !expiryDate) return;

    // regex: dd/mm/yyyy
    const isValid = /^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate);
    if (!isValid) {
      alert("Ngày hết hạn không hợp lệ (đúng: dd/mm/yyyy)");
      return;
    }

    setFridgeList((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: selectedIngredient,
        expire: expiryDate,
      },
    ]);

    setSelectedIngredient(null);
    setExpiryDate("");
  };

  const daysLeft = (exp: string) => {
    const [d, m, y] = exp.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    const diff = (dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
  };

  const expColor = (d: number) =>
    d <= 0 ? "#d32f2f" : d <= 3 ? "#ff9800" : "#2e7d32";

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container}>

        {/* Tooltip */}
        <View style={s.tipBox}>
          <Text style={s.tipText}>
            🧊 Chọn nguyên liệu và nhập ngày hết hạn (định dạng: dd/mm/yyyy).
          </Text>
        </View>

        <Text style={s.header}>🧺 Tủ lạnh</Text>
        <Text style={s.sub}>Quản lý nguyên liệu & cảnh báo hết hạn</Text>

        <Text style={s.label}>Chọn nguyên liệu</Text>

        <FlatList
          data={mockIngredients}
          horizontal
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ marginTop: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedIngredient(item)}
              style={[
                s.ingredientOption,
                selectedIngredient === item && s.ingredientSelected,
              ]}
            >
              <Text
                style={[
                  s.ingredientText,
                  selectedIngredient === item && s.ingredientTextSel,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={[s.label, { marginTop: 20 }]}>Ngày hết hạn</Text>
        <TextInput
          placeholder="VD: 20/12/2025"
          value={expiryDate}
          onChangeText={setExpiryDate}
          style={s.input}
        />

        {/* Add button */}
        <TouchableOpacity style={s.btnAdd} onPress={addIngredient}>
          <Text style={s.btnText}>Thêm vào tủ lạnh</Text>
        </TouchableOpacity>

        <Text style={s.savedHeader}>Nguyên liệu đã lưu</Text>

        {fridgeList.map((item) => {
          const left = daysLeft(item.expire);
          return (
            <View key={item.id} style={s.itemCard}>
              <MaterialIcons name="kitchen" size={28} color="#ff7f50" />

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.meta}>HSD: {item.expire}</Text>

                <Text style={[s.itemWarning, { color: expColor(left) }]}>
                  {left <= 0 ? "⚠ ĐÃ HẾT HẠN" : `Còn ${left} ngày`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setFridgeList((prev) => prev.filter((x) => x.id !== item.id))
                }
              >
                <MaterialIcons name="delete-outline" size={26} color="#f55" />
              </TouchableOpacity>
            </View>
          );
        })}
        <TabBarSpacer />
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16 },

  tipBox: {
    backgroundColor: "#fff0f1",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  tipText: { color: "#d55", fontWeight: "500" },

  header: { fontSize: 22, fontWeight: "700", color: "#f77" },
  sub: { color: "#777", marginBottom: 16 },
  label: { fontWeight: "600", marginTop: 16 },

  ingredientOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  ingredientSelected: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  ingredientText: { color: "#333" },
  ingredientTextSel: { color: "#fff", fontWeight: "600" },

  input: {
    backgroundColor: "#fff5f6",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  btnAdd: {
    backgroundColor: "#f77",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  savedHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 10,
  },

  itemCard: {
    flexDirection: "row",
    backgroundColor: "#fff5f6",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  meta: { color: "#777", fontSize: 12 },
  itemWarning: { marginTop: 4, fontSize: 13, fontWeight: "600" },
});
