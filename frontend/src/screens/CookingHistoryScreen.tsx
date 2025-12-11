import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar, { TabBarSpacer } from "./TabBar";
import { getCookingHistoryApi, CookingHistoryItem } from "../api/food-log";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function CookingHistoryScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [history, setHistory] = useState<CookingHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ totalItems: number; uniqueRecipes: number; frequentDuplicateRecipes: number } | null>(null);

  const fetchHistory = async () => {
    if (!token) {
      setError("Vui lòng đăng nhập");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // Lấy lịch sử 3 tháng gần nhất
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const res = await getCookingHistoryApi({
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      });
      
      setHistory(res.data.history);
      setSummary(res.data.summary);
    } catch (err: any) {
      console.error("Error fetching cooking history:", err);
      setError("Không thể tải lịch sử. Vui lòng thử lại.");
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filtered = history.filter((h) => {
    const name = h.recipe?.title || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getWarningMessage = (warnings: string[], daysSinceCooked?: number) => {
    if (warnings.includes("recentDuplicate")) {
      return `🔁 Bạn đã ăn món này ${daysSinceCooked} ngày trước — cân nhắc tránh trùng lặp`;
    }
    if (warnings.includes("moderateDuplicate")) {
      return `⚠️ Bạn đã ăn món này ${daysSinceCooked} ngày trước`;
    }
    if (warnings.includes("frequentDuplicate")) {
      return `🔁 Món này thường xuyên được nấu trong thời gian ngắn`;
    }
    if (warnings.includes("highCalorie")) {
      return `⚠️ Món nhiều calo / chất béo`;
    }
    return null;
  };

  const getWarningStyle = (warnings: string[]) => {
    if (warnings.includes("recentDuplicate") || warnings.includes("frequentDuplicate")) {
      return s.warnDuplicate;
    }
    if (warnings.includes("highCalorie")) {
      return s.warning;
    }
    return null;
  };

  if (loading && history.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={[s.container, s.centerContent]}>
          <ActivityIndicator size="large" color="#f77" />
          <Text style={s.loadingText}>Đang tải lịch sử...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView 
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#f77" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.header}>🍽️ Lịch sử món đã nấu</Text>
            <Text style={s.sub}>Nhắc nhở tránh trùng lặp & món nhiều calo</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Tooltip hướng dẫn */}
        <View style={s.tipBox}>
          <Text style={s.tipText}>
            🔎 Ứng dụng tự động cảnh báo các món ăn gần đây và món có lượng calo cao.
          </Text>
        </View>

        {/* Summary */}
        {summary && (
          <View style={s.summaryBox}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{summary.totalItems}</Text>
              <Text style={s.summaryLabel}>Tổng số lần nấu</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{summary.uniqueRecipes}</Text>
              <Text style={s.summaryLabel}>Món đã nấu</Text>
            </View>
            {summary.frequentDuplicateRecipes > 0 && (
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: "#ff9800" }]}>
                  {summary.frequentDuplicateRecipes}
                </Text>
                <Text style={s.summaryLabel}>Món trùng lặp</Text>
              </View>
            )}
          </View>
        )}

        <TextInput
          style={s.search}
          placeholder="Tìm món ăn..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />

        {error && !loading && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {filtered.length === 0 && !loading ? (
          <View style={s.emptyBox}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={s.emptyText}>
              {search ? "Không tìm thấy món ăn" : "Chưa có lịch sử nấu ăn"}
            </Text>
            <Text style={s.emptySubText}>
              {search ? "Thử tìm kiếm với từ khóa khác" : "Bắt đầu nấu ăn để xem lịch sử!"}
            </Text>
          </View>
        ) : (
          filtered.map((h) => {
            const warningMsg = getWarningMessage(h.warnings, h.daysSinceCooked);
            const warningStyle = getWarningStyle(h.warnings);
            const dishName = h.recipe?.title || "Món không xác định";
            const dishImage = h.recipe?.image;
            const kcal = h.kcal ?? h.recipe?.totalKcal;

            return (
              <View key={h.id} style={s.card}>
                {warningStyle && (
                  <View style={[s.warningIndicator, warningStyle === s.warnDuplicate ? s.warnIndicatorBg : s.warningIndicatorBg]} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={s.cardHeader}>
                    <Text style={s.name}>{dishName}</Text>
                    {kcal && (
                      <Text style={s.kcalBadge}>{Math.round(kcal)} kcal</Text>
                    )}
                  </View>
                  <Text style={s.meta}>
                    {new Date(h.date).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                  {h.mealType && (
                    <Text style={s.mealType}>
                      {h.mealType === "breakfast" && "🌅 Bữa sáng"}
                      {h.mealType === "lunch" && "☀️ Bữa trưa"}
                      {h.mealType === "dinner" && "🌙 Bữa tối"}
                      {h.mealType === "snack" && "🍪 Bữa phụ"}
                    </Text>
                  )}

                  {warningMsg && warningStyle && (
                    <Text style={warningStyle}>{warningMsg}</Text>
                  )}
                </View>

                <View style={s.badge}>
                  <Text style={s.badgeText}>{h.cookedTimes || 0}</Text>
                  <Text style={s.badgeSubText}>lần</Text>
                </View>
              </View>
            );
          })
        )}

        <TabBarSpacer />
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16 },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    color: "#777",
    fontSize: 14,
  },

  tipBox: {
    backgroundColor: "#fff0f1",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  tipText: { color: "#d55", fontWeight: "500" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: { flex: 1, marginLeft: 8 },

  header: { fontSize: 22, fontWeight: "700", color: "#f77" },
  sub: { color: "#777", marginBottom: 16 },

  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff5f6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f77",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
  },

  search: {
    backgroundColor: "#fff5f6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    color: "#333",
  },

  errorBox: {
    backgroundColor: "#fff0f1",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
  },

  emptyBox: {
    backgroundColor: "#fff5f6",
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
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
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff5f6",
    flexDirection: "row",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    position: "relative",
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
  },

  warningIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  warningIndicatorBg: {
    backgroundColor: "#d32f2f",
  },
  warnIndicatorBg: {
    backgroundColor: "#ff9800",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  name: { fontSize: 16, fontWeight: "700", color: "#333", flex: 1 },
  meta: { color: "#777", fontSize: 12, marginTop: 2 },
  mealType: { color: "#555", fontSize: 11, marginTop: 4, fontStyle: "italic" },
  kcalBadge: {
    backgroundColor: "#f77",
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  warning: { color: "#d32f2f", fontSize: 12, marginTop: 6, fontWeight: "500" },
  warnDuplicate: { color: "#ff9800", fontSize: 12, marginTop: 6, fontWeight: "500" },

  badge: {
    backgroundColor: "#f77",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    alignItems: "center",
    minWidth: 50,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  badgeSubText: { color: "#fff", fontSize: 10, marginTop: 2 },
});
