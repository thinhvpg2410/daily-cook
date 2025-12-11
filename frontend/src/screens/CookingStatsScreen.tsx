import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import TabBar, { TabBarSpacer } from "./TabBar";
import { getCookingStatsApi, CookingStats } from "../api/food-log";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function CookingStatsScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CookingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!token) {
      setError("Vui lòng đăng nhập");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await getCookingStatsApi(10);
      setStats(res.data);
    } catch (err: any) {
      console.error("Error fetching cooking stats:", err);
      setError("Không thể tải thống kê. Vui lòng thử lại.");
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const topDishes = stats?.topDishes || [];
  const chartData = topDishes.slice(0, 5).map((i) => ({
    value: i.count,
    label: i.name.split(" ")[0],
    frontColor: "#f77",
  }));

  if (loading && !stats) {
    return (
      <View style={[s.safe, s.centerContent]}>
        <ActivityIndicator size="large" color="#f77" />
        <Text style={s.loadingText}>Đang tải thống kê...</Text>
      </View>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView
          style={s.safe}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={s.container}>
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
            <TabBarSpacer />
          </View>
        </ScrollView>
        <TabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView 
        style={s.safe}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.container}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#f77" />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.header}>📈 Thống kê nấu ăn</Text>
              <Text style={s.sub}>Dữ liệu tổng hợp dựa trên lịch sử nấu ăn của bạn.</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          {/* Tip */}
          <View style={s.tipBox}>
            <Text style={s.tipText}>
              📊 Thống kê tần suất các món bạn đã nấu — giúp tránh trùng lặp.
            </Text>
          </View>

          {/* Summary Stats */}
          {stats && (
            <View style={s.summaryBox}>
              <View style={s.summaryItem}>
                <Text style={s.summaryValue}>{stats.totalCooked}</Text>
                <Text style={s.summaryLabel}>Tổng số lần nấu</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryValue}>{stats.totalUniqueRecipes}</Text>
                <Text style={s.summaryLabel}>Món đã nấu</Text>
              </View>
            </View>
          )}

          {/* Chart */}
          {chartData.length > 0 ? (
            <View style={s.chartCard}>
              <Text style={s.chartHeader}>Top 5 món nấu nhiều nhất</Text>
              <BarChart 
                barWidth={32} 
                noOfSections={Math.max(4, Math.max(...chartData.map(d => d.value)))} 
                barBorderRadius={6} 
                data={chartData} 
                yAxisThickness={0}
                spacing={20}
              />
              <Text style={s.chartNote}>* Biểu đồ được cập nhật theo lịch sử nấu.</Text>
            </View>
          ) : (
            <View style={s.emptyBox}>
              <MaterialIcons name="bar-chart" size={48} color="#ccc" />
              <Text style={s.emptyText}>Chưa có dữ liệu thống kê</Text>
              <Text style={s.emptySubText}>Bắt đầu nấu ăn để xem thống kê!</Text>
            </View>
          )}

          {/* List */}
          {topDishes.length > 0 ? (
            <>
              <Text style={s.listHeader}>Danh sách chi tiết</Text>

              {topDishes.map((item, index) => (
                <View key={item.recipeId} style={s.itemCard}>
                  <MaterialIcons name="restaurant-menu" size={26} color="#ff8855" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemMeta}>
                      Đã nấu {item.count} lần
                      {item.lastCooked && ` • Lần cuối: ${new Date(item.lastCooked).toLocaleDateString("vi-VN")}`}
                    </Text>
                    {item.kcal && (
                      <Text style={s.itemKcal}>{Math.round(item.kcal)} kcal</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          ) : null}
          <TabBarSpacer />
        </View>
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#777",
    fontSize: 14,
  },

  // Shared style
  tipBox: {
    backgroundColor: "#fff0f1",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  tipText: { color: "#d55", fontWeight: "500" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: { flex: 1, marginLeft: 8 },

  header: { fontSize: 26, fontWeight: "700", color: "#f77" },
  sub: { color: "#777", marginBottom: 16 },

  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff5f6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f77",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  chartCard: {
    backgroundColor: "#fff5f6",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  chartHeader: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  chartNote: { fontSize: 13, color: "#777", marginTop: 10 },

  emptyBox: {
    backgroundColor: "#fff5f6",
    padding: 40,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: "#bbb",
    marginTop: 4,
  },

  errorBox: {
    backgroundColor: "#fff0f1",
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
  },

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
  itemMeta: { color: "#777", fontSize: 13, marginTop: 2 },
  itemKcal: { color: "#f77", fontSize: 12, marginTop: 4, fontWeight: "500" },
});
