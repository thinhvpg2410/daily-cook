import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";

export default function CookingHistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setHistory([
      { id: "1", name: "Gà kho gừng", date: "2025-10-21", kcal: 540, fat: 32, cookedTimes: 3 },
      { id: "2", name: "Canh chua cá lóc", date: "2025-10-20", kcal: 220, fat: 8, cookedTimes: 1 },
      { id: "3", name: "Thịt kho trứng", date: "2025-10-18", kcal: 800, fat: 55, cookedTimes: 5 },
    ]);
  }, []);

  const filtered = history.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const highFat = (h: any) => h.fat >= 25 || h.kcal >= 700;
  const cookedRecent = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.container}>
        
        {/* Tooltip hướng dẫn */}
        <View style={s.tipBox}>
          <Text style={s.tipText}>
            🔎 Ứng dụng tự động cảnh báo các món ăn gần đây và món có lượng calo cao.
          </Text>
        </View>

        <Text style={s.header}>🍽️ Lịch sử món đã nấu</Text>
        <Text style={s.sub}>Nhắc nhở tránh trùng lặp & món nhiều calo</Text>

        <TextInput
          style={s.search}
          placeholder="Tìm món ăn..."
          value={search}
          onChangeText={setSearch}
        />

        {filtered.map((h) => (
          <View key={h.id} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{h.name}</Text>
              <Text style={s.meta}>
                {new Date(h.date).toLocaleDateString("vi-VN")}
              </Text>

              {highFat(h) && <Text style={s.warning}>⚠ Món nhiều calo / chất béo</Text>}

              {cookedRecent(h.date) && (
                <Text style={s.warnDuplicate}>
                  🔁 Bạn đã ăn món này gần đây — cân nhắc tránh trùng lặp
                </Text>
              )}
            </View>

            <View style={s.badge}>
              <Text style={s.badgeText}>{h.cookedTimes} lần</Text>
            </View>
          </View>
        ))}

        <TabBar />
      </ScrollView>
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
  search: {
    backgroundColor: "#fff5f6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff5f6",
    flexDirection: "row",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
  },

  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  meta: { color: "#777", fontSize: 12, marginTop: 2 },
  warning: { color: "#d32f2f", fontSize: 12, marginTop: 4 },
  warnDuplicate: { color: "#ff9800", fontSize: 12, marginTop: 4 },

  badge: {
    backgroundColor: "#f77",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "center",
  },
  badgeText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
