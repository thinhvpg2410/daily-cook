import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";

export default function NutritionTracker() {
  // Dữ liệu mẫu 7 ngày qua (có ngày tháng cụ thể)
  const [history] = useState([
    { date: "17/10", calories: 1950, protein: 82, fat: 78, carbs: 240 },
    { date: "18/10", calories: 1800, protein: 75, fat: 66, carbs: 210 },
    { date: "19/10", calories: 2050, protein: 91, fat: 73, carbs: 250 },
    { date: "20/10", calories: 2200, protein: 95, fat: 80, carbs: 260 },
    { date: "21/10", calories: 1750, protein: 70, fat: 59, carbs: 200 },
    { date: "22/10", calories: 2300, protein: 100, fat: 85, carbs: 270 },
    { date: "23/10", calories: 2100, protein: 88, fat: 70, carbs: 250 },
  ]);

  // Trung bình
  const avg = history.reduce(
    (a, b) => ({
      calories: a.calories + b.calories / history.length,
      protein: a.protein + b.protein / history.length,
      fat: a.fat + b.fat / history.length,
      carbs: a.carbs + b.carbs / history.length,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  // Tính trạng thái
  const getLevel = (cal: number) => {
    if (cal >= 2200) return { label: "Cao", color: "#ff6b6b", icon: "trending-up-outline" };
    if (cal <= 1800) return { label: "Thấp", color: "#4dabf7", icon: "trending-down-outline" };
    return { label: "Vừa", color: "#51cf66", icon: "remove-outline" };
  };

  // Lời khuyên
  const tips: string[] = [];
  if (avg.calories > 2200)
    tips.push("Bạn đang hấp thụ nhiều calo, nên giảm khẩu phần hoặc tăng vận động.");
  else if (avg.calories < 1700)
    tips.push("Calo hơi thấp, nên thêm bữa phụ hoặc đồ ăn giàu năng lượng.");
  if (avg.protein < 80)
    tips.push("Thiếu protein — bổ sung thêm trứng, cá, đậu hũ, sữa.");
  if (tips.length === 0)
    tips.push("Chế độ ăn của bạn khá cân bằng trong tuần này! 🌿");

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
        <Text style={s.title}>Nutrition Tracker</Text>

        {/* Tổng quan */}
        <View style={s.card}>
          <Text style={s.summaryText}>Trung bình mỗi ngày</Text>
          <Text style={s.calorie}>{Math.round(avg.calories)} kcal</Text>
          <Text style={s.subText}>
            Protein: {Math.round(avg.protein)}g · Carbs: {Math.round(avg.carbs)}g · Fat:{" "}
            {Math.round(avg.fat)}g
          </Text>
        </View>

        {/* Bảng thống kê */}
        <Text style={s.sectionTitle}>Lịch sử 7 ngày gần đây</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableHeader]}>
            <Text style={[s.cell, s.cellDate]}>Ngày</Text>
            <Text style={s.cell}>Calo</Text>
            <Text style={s.cell}>Trạng thái</Text>
            <Text style={s.cell}>Protein</Text>
            <Text style={s.cell}>Carbs</Text>
            <Text style={s.cell}>Fat</Text>
          </View>
          {history.map((d, i) => {
            const lvl = getLevel(d.calories);
            return (
              <View key={i} style={s.tableRow}>
                <Text style={[s.cell, s.cellDate]}>{d.date}</Text>
                <Text style={[s.cell, { fontWeight: "600" }]}>{d.calories}</Text>
                <View style={[s.cell, { flexDirection: "row", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name={lvl.icon as any} color={lvl.color} size={16} style={{ marginRight: 4 }} />
                  <Text style={{ color: lvl.color, fontWeight: "600", fontSize: 13 }}>{lvl.label}</Text>
                </View>
                <Text style={s.cell}>{d.protein}</Text>
                <Text style={s.cell}>{d.carbs}</Text>
                <Text style={s.cell}>{d.fat}</Text>
              </View>
            );
          })}
        </View>

        {/* Gợi ý */}
        <View style={s.tipBox}>
          <Ionicons name="leaf-outline" size={22} color="#f77" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>DailyCook Tips</Text>
            {tips.map((tip, i) => (
              <Text key={i} style={s.tipText}>
                • {tip}
              </Text>
            ))}
          </View>
        </View>
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

  card: {
    backgroundColor: "#ffeef0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  summaryText: { fontSize: 15, color: "#555" },
  calorie: { fontSize: 34, color: "#f77", fontWeight: "bold", marginVertical: 4 },
  subText: { fontSize: 13, color: "#777", textAlign: "center" },

  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#f77", marginTop: 24, marginBottom: 10 },

  table: {
    backgroundColor: "#fff8f8",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fee",
  },
  tableHeader: { backgroundColor: "#fde8e8" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#f5dada",
    paddingVertical: 8,
  },
  cell: { flex: 1, textAlign: "center", fontSize: 13, color: "#333" },
  cellDate: { flex: 1.2, fontWeight: "600" },

  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff8f8",
    borderRadius: 12,
    padding: 14,
    marginTop: 30,
  },
  tipTitle: { fontWeight: "600", color: "#f77", marginBottom: 6, fontSize: 15 },
  tipText: { color: "#555", fontSize: 13, lineHeight: 18, marginBottom: 4 },
});
