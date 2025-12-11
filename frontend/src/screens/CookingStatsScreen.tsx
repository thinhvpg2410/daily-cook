import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { MaterialIcons } from "@expo/vector-icons";
import TabBar from "./TabBar";

export default function CookingStatsScreen() {
  const topDishes = [
    { name: "Gà sốt tiêu", count: 8 },
    { name: "Canh bí đỏ", count: 5 },
    { name: "Cơm gà", count: 4 },
  ];

  const chartData = topDishes.map((i) => ({
    value: i.count,
    label: i.name.split(" ")[0],
    frontColor: "#f77",
  }));

  return (
    <ScrollView style={s.safe}>
      <View style={s.container}>
        {/* Tip */}
        <View style={s.tipBox}>
          <Text style={s.tipText}>
            📊 Thống kê tần suất các món bạn đã nấu — giúp tránh trùng lặp.
          </Text>
        </View>

        <Text style={s.header}>📈 Thống kê nấu ăn</Text>
        <Text style={s.sub}>
          Dữ liệu tổng hợp dựa trên lịch sử nấu ăn của bạn.
        </Text>

        {/* Chart */}
        <View style={s.chartCard}>
          <Text style={s.chartHeader}>Món nấu nhiều nhất</Text>
          <BarChart barWidth={32} noOfSections={4} barBorderRadius={6} data={chartData} yAxisThickness={0} />

          <Text style={s.chartNote}>* Biểu đồ được cập nhật theo lịch sử nấu.</Text>
        </View>

        {/* List */}
        <Text style={s.listHeader}>Danh sách chi tiết</Text>

        {topDishes.map((item, index) => (
          <View key={index} style={s.itemCard}>
            <MaterialIcons name="restaurant-menu" size={26} color="#ff8855" />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemMeta}>Đã nấu {item.count} lần</Text>
            </View>
          </View>
        ))}
        <TabBar />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },

  // Shared style
  tipBox: {
    backgroundColor: "#fff0f1",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  tipText: { color: "#d55", fontWeight: "500" },

  header: { fontSize: 26, fontWeight: "700", color: "#f77" },
  sub: { color: "#777", marginBottom: 16 },

  chartCard: {
    backgroundColor: "#fff5f6",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  chartHeader: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  chartNote: { fontSize: 13, color: "#777", marginTop: 10 },

  listHeader: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f6",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  itemName: { fontSize: 16, fontWeight: "600", color: "#333" },
  itemMeta: { color: "#777", fontSize: 13 },
});
