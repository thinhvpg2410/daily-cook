import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import {
  getFoodLogStatsApi,
  getFoodLogsApi,
  createFoodLogApi,
  updateFoodLogApi,
  deleteFoodLogApi,
  FoodLogStats,
  FoodLog,
  CreateFoodLogData,
} from "../api/food-log";
import { searchRecipesApi, Recipe } from "../api/recipes";
import { getPreferencesApi } from "../api/users";
import { getDailyNutritionApi, getMealPlansApi } from "../api/mealplan";
import { generateNutritionTips, GenerateNutritionTipsResponse } from "../api/ai";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `http://localhost:3000${src}`;
  return src;
}

export default function NutritionTracker({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FoodLogStats | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [calorieTarget, setCalorieTarget] = useState<number>(2000);
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [planNutrition, setPlanNutrition] = useState<{
    date: string;
    hasPlan: boolean;
    totals: { calories: number; protein: number; fat: number; carbs: number };
    meals: {
      breakfast: any[];
      lunch: any[];
      dinner: any[];
    };
  } | null>(null);
  const [aiTips, setAiTips] = useState<GenerateNutritionTipsResponse | null>(null);
  const [generatingTips, setGeneratingTips] = useState(false);
  const [tipsWeekKey, setTipsWeekKey] = useState<string>("");

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadUserPreferences = async () => {
    try {
      const res = await getPreferencesApi();
      if (res.data?.dailyKcalTarget) {
        setCalorieTarget(res.data.dailyKcalTarget);
      }
    } catch (error: any) {
      // 404 means no preferences yet, use default
      if (error.response?.status === 404) {
        console.log("No preferences found, using default calorie target");
      } else {
        console.error("Error loading user preferences:", error);
      }
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = formatDate(today);

      const startDateObj = new Date(today);
      startDateObj.setDate(startDateObj.getDate() - 6);
      const startDate = formatDate(startDateObj);

      // Lấy dữ liệu từ Food Log và Meal Plan
      const [foodLogStatsRes, mealPlansRes] = await Promise.all([
        getFoodLogStatsApi(startDate, endDate).catch(() => ({
          data: { daily: [], average: { calories: 0, protein: 0, fat: 0, carbs: 0 } },
        })),
        getMealPlansApi({ start: startDate, end: endDate }).catch(() => ({ data: [] })),
      ]);

      const foodLogStats = foodLogStatsRes.data;
      const mealPlans = mealPlansRes.data || [];

      // Tạo map cho food logs theo ngày
      const foodLogMap = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>();
      foodLogStats.daily.forEach((day: any) => {
        foodLogMap.set(day.date, {
          calories: day.calories,
          protein: day.protein,
          fat: day.fat,
          carbs: day.carbs,
        });
      });

      // Tính toán nutrition từ meal plans
      const mealPlanMap = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>();
      
      // Lấy tất cả recipe IDs từ meal plans
      const allRecipeIds = new Set<string>();
      mealPlans.forEach((plan: any) => {
        const slots = plan.slots || {};
        const breakfastIds = Array.isArray(slots.breakfast) ? slots.breakfast : [];
        const lunchIds = Array.isArray(slots.lunch) ? slots.lunch : [];
        const dinnerIds = Array.isArray(slots.dinner) ? slots.dinner : [];
        [...breakfastIds, ...lunchIds, ...dinnerIds].forEach((id: string) => allRecipeIds.add(id));
      });

      // Fetch recipes nếu có
      let recipesMap = new Map<string, any>();
      if (allRecipeIds.size > 0) {
        try {
          const { http } = await import("../api/http");
          const recipesRes = await Promise.all(
            Array.from(allRecipeIds).map((id) =>
              http.get(`/recipes/${id}`).catch(() => null)
            )
          );
          recipesRes.forEach((res) => {
            if (res?.data) {
              recipesMap.set(res.data.id, res.data);
            }
          });
        } catch (error) {
          console.error("Error fetching recipes for meal plans:", error);
        }
      }

      // Tính toán nutrition cho từng meal plan
      mealPlans.forEach((plan: any) => {
        const date = typeof plan.date === 'string' 
          ? plan.date.split('T')[0] 
          : new Date(plan.date).toISOString().split('T')[0];
        
        const slots = plan.slots || {};
        const breakfastIds = Array.isArray(slots.breakfast) ? slots.breakfast : [];
        const lunchIds = Array.isArray(slots.lunch) ? slots.lunch : [];
        const dinnerIds = Array.isArray(slots.dinner) ? slots.dinner : [];
        
        const allIds = [...breakfastIds, ...lunchIds, ...dinnerIds];
        
        const totals = allIds.reduce(
          (acc: any, recipeId: string) => {
            const recipe = recipesMap.get(recipeId);
            if (recipe) {
              acc.calories += recipe.totalKcal || 0;
              acc.protein += recipe.protein || 0;
              acc.fat += recipe.fat || 0;
              acc.carbs += recipe.carbs || 0;
            }
            return acc;
          },
          { calories: 0, protein: 0, fat: 0, carbs: 0 }
        );

        mealPlanMap.set(date, totals);
      });

      // Merge dữ liệu: ưu tiên Food Log nếu có, nếu không thì dùng Meal Plan
      const allDates = new Set<string>();
      foodLogStats.daily.forEach((day: any) => allDates.add(day.date));
      mealPlanMap.forEach((_, date) => allDates.add(date));

      // Đảm bảo có đủ 7 ngày
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        allDates.add(formatDate(date));
      }

      const mergedDaily = Array.from(allDates)
        .sort()
        .reverse()
        .slice(0, 7)
        .map((date) => {
          const foodLogData = foodLogMap.get(date);
          const mealPlanData = mealPlanMap.get(date);

          // Ưu tiên Food Log (đã ăn thực tế), nếu không có thì dùng Meal Plan (kế hoạch)
          if (foodLogData && foodLogData.calories > 0) {
            return {
              date,
              ...foodLogData,
              source: 'foodLog' as const,
            };
          } else if (mealPlanData && mealPlanData.calories > 0) {
            return {
              date,
              ...mealPlanData,
              source: 'mealPlan' as const,
            };
          } else {
            return {
              date,
              calories: 0,
              protein: 0,
              fat: 0,
              carbs: 0,
              source: 'none' as const,
            };
          }
        });

      // Tính toán trung bình
      const avg = mergedDaily.reduce(
        (acc, day) => ({
          calories: acc.calories + day.calories / mergedDaily.length,
          protein: acc.protein + day.protein / mergedDaily.length,
          fat: acc.fat + day.fat / mergedDaily.length,
          carbs: acc.carbs + day.carbs / mergedDaily.length,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );

      setStats({
        daily: mergedDaily,
        average: {
          calories: Math.round(avg.calories),
          protein: Math.round(avg.protein),
          fat: Math.round(avg.fat),
          carbs: Math.round(avg.carbs),
        },
      });
    } catch (error: any) {
      console.error("Error loading nutrition stats:", error);
      // Set default stats on error
      setStats({
        daily: [],
        average: { calories: 0, protein: 0, fat: 0, carbs: 0 },
      });
    }
  };

  const loadFoodLogs = async (date?: string) => {
    try {
      const targetDate = date || formatDate(new Date());
      const startDate = `${targetDate}T00:00:00.000Z`;
      const endDate = `${targetDate}T23:59:59.999Z`;

      const res = await getFoodLogsApi({ start: startDate, end: endDate });
      setFoodLogs(res.data || []);
    } catch (error: any) {
      console.error("Error loading food logs:", error);
      setFoodLogs([]);
    }
  };

  const loadRecipes = async (query: string = "") => {
    try {
      const res = await searchRecipesApi({ q: query, limit: 20 });
      setRecipes(res.data.data || []);
    } catch (error) {
      console.error("Error loading recipes:", error);
      setRecipes([]);
    }
  };

  const loadPlanNutrition = async (date?: string) => {
    try {
      const targetDate = date || formatDate(new Date());
      const res = await getDailyNutritionApi({ date: targetDate });
      setPlanNutrition(res.data);
    } catch (error) {
      console.error("Error loading plan nutrition:", error);
      setPlanNutrition(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          loadUserPreferences(),
          loadStats(),
          loadFoodLogs(),
          loadPlanNutrition(),
        ]);
        
        // Load tips từ storage
        await loadTipsFromStorage();
      } catch (error) {
        console.error("Error initializing nutrition tracker:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Tự động gen tips khi stats thay đổi và qua tuần mới
  useEffect(() => {
    if (!stats || history.length === 0) return;
    
    const currentWeekKey = getWeekKey();
    
    // Nếu qua tuần mới hoặc chưa có tips, tự động gen
    if (!tipsWeekKey || tipsWeekKey !== currentWeekKey) {
      generateAITips(false);
    }
  }, [stats]);

  // Reload preferences when screen is focused (e.g., after updating in NutritionGoalsScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserPreferences();
      loadStats(); // Also reload stats to update with new targets
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecipes(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    const date = selectedDate || undefined;
    try {
      await Promise.all([
        loadUserPreferences(),
        loadStats(),
        loadFoodLogs(date),
        loadPlanNutrition(date),
      ]);
      // Sau khi load stats xong, gen tips mới nếu cần
      if (stats && history.length > 0) {
        await generateAITips(true);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddFoodLog = async (recipeId?: string, manualData?: Partial<CreateFoodLogData>) => {
    try {
      const date = selectedDate || formatDate(new Date());
      const data: CreateFoodLogData = {
        date,
        mealType: selectedMealType,
        ...(recipeId ? { recipeId } : {}),
        ...(manualData || {}),
      };

      await createFoodLogApi(data);
      Alert.alert("Thành công", "Đã thêm món ăn vào nhật ký dinh dưỡng");
      setShowAddModal(false);
      setShowRecipeModal(false);
      setSearchQuery("");
      // Update lịch sử 7 ngày và chi tiết
      await Promise.all([
        loadStats(), // Refresh lịch sử 7 ngày
        loadFoodLogs(date),
        loadPlanNutrition(date),
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể thêm món ăn");
    }
  };

  const handleDeleteFoodLog = async (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa món ăn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFoodLogApi(id);
            Alert.alert("Thành công", "Đã xóa món ăn");
            // Update lịch sử 7 ngày và chi tiết
            await Promise.all([
              loadStats(), // Refresh lịch sử 7 ngày
              loadFoodLogs(selectedDate || undefined),
              loadPlanNutrition(selectedDate || undefined),
            ]);
            if (editingLog?.id === id) {
              setShowDetailModal(false);
              setEditingLog(null);
            }
          } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa món ăn");
          }
        },
      },
    ]);
  };

  const handleDatePress = (dateStr: string) => {
    // Chuyển sang màn hình Calendar với ngày được chọn
    navigation.navigate("Calendar", { selectedDate: dateStr });
  };

  const getTodayStats = () => {
    const today = formatDate(new Date());
    return stats?.daily.find((d) => d.date === today) || {
      date: today,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };
  };

  const todayStats = getTodayStats();
  const planTotals =
    planNutrition?.date === formatDate(new Date()) ? planNutrition?.totals : null;
  // Ưu tiên Food Log (đã ăn thực tế), nếu không có thì dùng Meal Plan (kế hoạch)
  const displayToday =
    todayStats.calories > 0
      ? todayStats
      : planTotals || { calories: 0, protein: 0, fat: 0, carbs: 0 };
  const history = stats?.daily || [];
  const avg = stats?.average || { calories: 0, protein: 0, fat: 0, carbs: 0 };

  const getLevel = (cal: number) => {
    if (cal >= calorieTarget * 1.1) return { label: "Cao", color: "#ff6b6b", icon: "trending-up-outline" };
    if (cal <= calorieTarget * 0.9) return { label: "Thấp", color: "#4dabf7", icon: "trending-down-outline" };
    return { label: "Vừa", color: "#51cf66", icon: "remove-outline" };
  };

  // Tính toán week key để check xem đã gen tips cho tuần này chưa
  const getWeekKey = (): string => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Thứ 2
    startOfWeek.setHours(0, 0, 0, 0);
    return formatDate(startOfWeek);
  };

  // Load tips từ storage
  const loadTipsFromStorage = async () => {
    try {
      const currentWeekKey = getWeekKey();
      const storedWeekKey = await AsyncStorage.getItem("nutritionTipsWeekKey");
      const storedTips = await AsyncStorage.getItem("nutritionTips");
      
      if (storedWeekKey === currentWeekKey && storedTips) {
        const parsed = JSON.parse(storedTips);
        setAiTips(parsed);
        setTipsWeekKey(currentWeekKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading tips from storage:", error);
      return false;
    }
  };

  // Gen tips từ AI
  const generateAITips = async (forceRefresh: boolean = false) => {
    if (!stats || history.length === 0) {
      console.log("No stats available for tips generation");
      return;
    }

    const currentWeekKey = getWeekKey();
    
    // Nếu không phải force refresh và đã có tips cho tuần này, không gen lại
    if (!forceRefresh && tipsWeekKey === currentWeekKey && aiTips) {
      return;
    }

    setGeneratingTips(true);
    try {
      // Tính toán week start và end
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Thứ 2
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekStart = formatDate(startOfWeek);
      const weekEnd = formatDate(endOfWeek);

      const tipsData = await generateNutritionTips({
        daily: history.map((d) => ({
          date: d.date,
          calories: d.calories,
          protein: d.protein,
          fat: d.fat,
          carbs: d.carbs,
          source: (d as any).source,
        })),
        average: avg,
        calorieTarget,
        weekStart,
        weekEnd,
      });

      setAiTips(tipsData);
      setTipsWeekKey(currentWeekKey);

      // Lưu vào storage
      await AsyncStorage.setItem("nutritionTipsWeekKey", currentWeekKey);
      await AsyncStorage.setItem("nutritionTips", JSON.stringify(tipsData));
    } catch (error: any) {
      console.error("Error generating AI tips:", error);
      // Fallback to empty tips
      setAiTips({
        tips: ["💡 Đang tải tips dinh dưỡng..."],
        summary: "Đang phân tích dữ liệu dinh dưỡng của bạn",
        week: "7 ngày qua",
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setGeneratingTips(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  const getMealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      breakfast: "Sáng",
      lunch: "Trưa",
      dinner: "Tối",
      snack: "Phụ",
    };
    return labels[type] || type;
  };

  const calorieProgress = Math.min(
    (displayToday.calories / calorieTarget) * 100,
    100,
  );

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
        <View style={s.header}>
          <Text style={s.title}>Theo dõi dinh dưỡng</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={[s.addButton, { backgroundColor: "#4dabf7" }]}
              onPress={() => navigation.navigate("NutritionGoals")}
            >
              <Ionicons name="flag-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.addButton}
              onPress={() => {
                setSelectedDate(formatDate(new Date()));
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hôm nay */}
        <View style={s.card}>
          <Text style={s.summaryText}>Hôm nay</Text>
          <View style={s.progressContainer}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${calorieProgress}%` }]} />
            </View>
            <Text style={s.progressText}>
              {Math.round(displayToday.calories)} / {calorieTarget} kcal
            </Text>
          </View>
          <View style={s.macroRow}>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Protein</Text>
              <Text style={s.macroValue}>{Math.round(displayToday.protein)}g</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Carbs</Text>
              <Text style={s.macroValue}>{Math.round(displayToday.carbs)}g</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Fat</Text>
              <Text style={s.macroValue}>{Math.round(displayToday.fat)}g</Text>
            </View>
          </View>

        {planNutrition?.hasPlan && (
          <View style={[s.card, { backgroundColor: "#f0f7ff" }]}>
            <Text style={s.summaryText}>
              Thực đơn ngày{" "}
              {planNutrition.date === formatDate(new Date())
                ? "hôm nay"
                : formatDateDisplay(planNutrition.date)}
            </Text>
            <Text style={s.planLabel}>
              Tổng: {Math.round(planNutrition.totals.calories)} kcal · P{" "}
              {Math.round(planNutrition.totals.protein)}g · C{" "}
              {Math.round(planNutrition.totals.carbs)}g · F{" "}
              {Math.round(planNutrition.totals.fat)}g
            </Text>
            <View style={s.planMealsRow}>
              {(["breakfast", "lunch", "dinner"] as const).map((slot) => (
                <View key={slot} style={s.planMeal}>
                  <Text style={s.planMealLabel}>
                    {slot === "breakfast" ? "Sáng" : slot === "lunch" ? "Trưa" : "Tối"}
                  </Text>
                  <Text style={s.planMealValue}>
                    {Math.round(
                      (planNutrition.meals[slot] || []).reduce(
                        (sum, meal) => sum + (meal.kcal || 0),
                        0,
                      ),
                    )}{" "}
                    kcal
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        </View>

        {/* Trung bình */}
        <View style={s.card}>
          <Text style={s.summaryText}>Trung bình 7 ngày</Text>
          <Text style={s.calorie}>{Math.round(avg.calories)} kcal</Text>
          <Text style={s.subText}>
            Protein: {Math.round(avg.protein)}g · Carbs: {Math.round(avg.carbs)}g · Fat: {Math.round(avg.fat)}g
          </Text>
        </View>

        {/* Biểu đồ đơn giản - Lịch sử 7 ngày */}
        <View style={s.sectionHeader}>
          <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>Lịch sử 7 ngày</Text>
            <View style={{ flexDirection: "row", marginTop: 4, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[s.legendDot, { backgroundColor: "#51cf66" }]} />
                <Text style={s.legendText}>Đã ăn</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[s.legendDot, { backgroundColor: "#4dabf7" }]} />
                <Text style={s.legendText}>Kế hoạch</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={async () => {
              setRefreshing(true);
              await loadStats();
              setRefreshing(false);
            }}
            style={s.refreshButton}
          >
            <Ionicons name="refresh" size={18} color="#f77" />
          </TouchableOpacity>
        </View>
        {history.length === 0 ? (
          <View style={[s.chartContainer, { justifyContent: "center", alignItems: "center", height: 100 }]}>
            <Text style={{ color: "#999", fontSize: 14 }}>Chưa có dữ liệu dinh dưỡng</Text>
            <Text style={{ color: "#999", fontSize: 12, marginTop: 4 }}>Thêm món ăn để xem lịch sử</Text>
          </View>
        ) : (
        <View style={s.chartContainer}>
          {/* Header space for labels */}
          <View style={s.chartHeader}>
            {history.map((d: any, i) => {
              const isToday = d.date === formatDate(new Date());
              return (
                <TouchableOpacity
                  key={`label-${i}`}
                  style={s.chartHeaderItem}
                  onPress={() => handleDatePress(d.date)}
                  activeOpacity={0.7}
                >
                  {isToday && (
                    <View style={[s.todayDot, { marginBottom: 2 }]} />
                  )}
                  <Text style={[s.chartLabel, isToday && { fontWeight: "700", color: "#f77" }]}>
                    {formatDateDisplay(d.date)}
                  </Text>
                  <Text style={[s.chartValue, isToday && { fontWeight: "700", color: "#f77" }]}>
                    {Math.round(d.calories)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Chart bars */}
          <View style={s.chartBarsContainer}>
            {history.map((d: any, i) => {
              // Giới hạn height tối đa 95% để không che mất labels
              const heightPercent = Math.min((d.calories / calorieTarget) * 100, 95);
              const height = Math.max(heightPercent, 5);
              const lvl = getLevel(d.calories);
              const isToday = d.date === formatDate(new Date());
              const source = d.source || 'none'; // 'foodLog', 'mealPlan', hoặc 'none'
              // Màu bar: xanh nếu từ meal plan, đỏ nếu từ food log
              const barColor = source === 'mealPlan' ? '#4dabf7' : lvl.color;
              return (
                <TouchableOpacity
                  key={i}
                  style={s.chartBar}
                  onPress={() => handleDatePress(d.date)}
                >
                  <View style={[s.chartBarFill, { height: `${height}%`, backgroundColor: barColor }]} />
                  {isToday && (
                    <View style={s.todayIndicator}>
                      <View style={s.todayDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        )}

        {/* Bảng thống kê - Chi tiết 7 ngày */}
        <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Chi tiết 7 ngày</Text>
          <TouchableOpacity
            onPress={async () => {
              setRefreshing(true);
              await loadStats();
              setRefreshing(false);
            }}
            style={s.refreshButton}
          >
            <Ionicons name="refresh" size={18} color="#f77" />
          </TouchableOpacity>
        </View>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableHeader]}>
            <Text style={[s.cell, s.cellDate]}>Ngày</Text>
            <Text style={s.cell}>Calo</Text>
            <Text style={s.cell}>Trạng thái</Text>
            <Text style={s.cell}>Protein</Text>
            <Text style={s.cell}>Carbs</Text>
            <Text style={s.cell}>Fat</Text>
          </View>
          {history.length === 0 ? (
            <View style={[s.tableRow, { paddingVertical: 20 }]}>
              <Text style={[s.cell, { textAlign: "center", color: "#999", flex: 1 }]}>
                Chưa có dữ liệu dinh dưỡng
              </Text>
            </View>
          ) : (
            history.map((d, i) => {
              const lvl = getLevel(d.calories);
              const isToday = d.date === formatDate(new Date());
              const progress = Math.min((d.calories / calorieTarget) * 100, 100);
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.tableRow, isToday && { backgroundColor: "#fff5f5" }]}
                  onPress={() => handleDatePress(d.date)}
                >
                  <View style={[s.cell, s.cellDate, { flexDirection: "row", alignItems: "center" }]}>
                    {isToday && <View style={[s.todayDot, { marginRight: 6 }]} />}
                    <Text style={[s.cell, s.cellDate, isToday && { fontWeight: "700", color: "#f77" }]}>
                      {formatDateDisplay(d.date)}
                    </Text>
                  </View>
                  <View style={s.cell}>
                  <Text style={[s.cell, { fontWeight: "600" }]}>{Math.round(d.calories)}</Text>
                    <View style={[s.miniProgressBar, { width: `${progress}%` }]} />
                  </View>
                  <View style={[s.cell, { flexDirection: "row", alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name={lvl.icon as any} color={lvl.color} size={16} style={{ marginRight: 4 }} />
                    <Text style={{ color: lvl.color, fontWeight: "600", fontSize: 13 }}>{lvl.label}</Text>
                  </View>
                  <Text style={s.cell}>{Math.round(d.protein)}g</Text>
                  <Text style={s.cell}>{Math.round(d.carbs)}g</Text>
                  <Text style={s.cell}>{Math.round(d.fat)}g</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* DailyCook Tips - AI Generated */}
        <View style={s.tipBox}>
          <View style={s.tipHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Ionicons name="sparkles-outline" size={24} color="#f77" style={{ marginRight: 8 }} />
              <View>
                <Text style={s.tipTitle}>DailyCook Tips</Text>
                {aiTips?.summary && (
                  <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    {aiTips.summary}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => generateAITips(true)}
              style={s.tipRefreshButton}
              disabled={generatingTips}
            >
              {generatingTips ? (
                <ActivityIndicator size="small" color="#f77" />
              ) : (
                <Ionicons name="refresh-outline" size={18} color="#f77" />
              )}
            </TouchableOpacity>
          </View>
          {generatingTips && !aiTips ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#f77" />
              <Text style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                Đang tạo tips dinh dưỡng...
              </Text>
            </View>
          ) : (
            <>
              <View style={s.tipsList}>
                {(aiTips?.tips || []).map((tip, i) => (
                  <View key={i} style={s.tipItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#51cf66" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
              {aiTips && (
                <Text style={s.tipFooter}>
                  💡 Tips được gen bằng AI dựa trên dữ liệu dinh dưỡng của bạn trong {aiTips.week}
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal thêm món ăn */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Thêm món ăn</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={s.mealTypeSelector}>
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[s.mealTypeButton, selectedMealType === type && s.mealTypeButtonActive]}
                  onPress={() => setSelectedMealType(type)}
                >
                  <Text style={[s.mealTypeText, selectedMealType === type && s.mealTypeTextActive]}>
                    {getMealTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={s.modalButton}
              onPress={() => {
                setShowAddModal(false);
                setShowRecipeModal(true);
              }}
            >
              <Ionicons name="restaurant" size={20} color="#fff" />
              <Text style={s.modalButtonText}>Chọn từ công thức</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modalButton, { backgroundColor: "#4dabf7", marginTop: 10 }]}
              onPress={() => {
                // Manual entry - simplified for now
                Alert.alert("Thông báo", "Tính năng nhập thủ công sẽ được cập nhật sớm");
              }}
            >
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={s.modalButtonText}>Nhập thủ công</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal chọn công thức */}
      <Modal visible={showRecipeModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chọn công thức</Text>
              <TouchableOpacity onPress={() => setShowRecipeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.searchInput}
              placeholder="Tìm kiếm công thức..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={recipes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.recipeItem}
                  onPress={() => handleAddFoodLog(item.id)}
                >
                  <Image source={{ uri: normalizeImage(item.image) }} style={s.recipeImage} />
                  <View style={s.recipeInfo}>
                    <Text style={s.recipeTitle}>{item.title}</Text>
                    <Text style={s.recipeKcal}>{item.totalKcal || 0} kcal</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>Không tìm thấy công thức</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal chi tiết ngày */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {selectedDate ? formatDateDisplay(selectedDate) : "Chi tiết"}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={foodLogs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={s.foodLogItem}>
                  <View style={s.foodLogHeader}>
                    <View style={s.foodLogInfo}>
                      {item.recipe?.image && (
                        <Image source={{ uri: normalizeImage(item.recipe.image) }} style={s.foodLogImage} />
                      )}
                      <View>
                        <Text style={s.foodLogTitle}>{item.recipe?.title || "Món ăn"}</Text>
                        <Text style={s.foodLogMealType}>{getMealTypeLabel(item.mealType)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteFoodLog(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                  <View style={s.foodLogMacros}>
                    <Text style={s.foodLogMacroText}>{item.kcal || 0} kcal</Text>
                    <Text style={s.foodLogMacroText}>P: {item.protein || 0}g</Text>
                    <Text style={s.foodLogMacroText}>C: {item.carbs || 0}g</Text>
                    <Text style={s.foodLogMacroText}>F: {item.fat || 0}g</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                planNutrition?.date === selectedDate && planNutrition?.hasPlan ? (
                  <View style={{ paddingVertical: 20 }}>
                    <Text style={{ textAlign: "center", color: "#666", marginBottom: 8 }}>
                      Chưa ghi nhận món ăn. Đây là thực đơn đã lên kế hoạch:
                    </Text>
                    {(["breakfast", "lunch", "dinner"] as const).map((slot) => (
                      <View key={slot} style={{ marginBottom: 6 }}>
                        <Text style={{ fontWeight: "600", color: "#f77" }}>
                          {getMealTypeLabel(slot)}
                        </Text>
                        {(planNutrition.meals[slot] || []).map((meal: any) => (
                          <Text key={meal.id} style={{ color: "#444", marginLeft: 8 }}>
                            • {meal.title} ({Math.round(meal.kcal)} kcal)
                          </Text>
                        ))}
                        {planNutrition.meals[slot]?.length === 0 && (
                          <Text style={{ color: "#999", marginLeft: 8 }}>Không có món</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>
                    Chưa có món ăn nào
                  </Text>
                )
              }
            />
          </View>
        </View>
      </Modal>

      <View style={{ marginBottom: 50 }}>
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#f77" },
  addButton: {
    backgroundColor: "#f77",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#ffeef0",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  summaryText: { fontSize: 15, color: "#555", marginBottom: 8 },
  calorie: { fontSize: 34, color: "#f77", fontWeight: "bold", marginVertical: 4 },
  subText: { fontSize: 13, color: "#777", textAlign: "center" },

  progressContainer: { width: "100%", marginVertical: 12 },
  progressBar: {
    height: 12,
    backgroundColor: "#f5dada",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f77",
    borderRadius: 6,
  },
  progressText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12,
  },
  macroItem: { alignItems: "center" },
  macroLabel: { fontSize: 12, color: "#777", marginBottom: 4 },
  macroValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  planLabel: { fontSize: 13, color: "#333", textAlign: "center" },
  planMealsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    gap: 8,
  },
  planMeal: { flex: 1, alignItems: "center" },
  planMealLabel: { fontSize: 13, color: "#666", marginBottom: 4 },
  planMealValue: { fontSize: 15, fontWeight: "600", color: "#1c5ed6" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#f77" },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fff5f5",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#666",
  },

  chartContainer: {
    backgroundColor: "#fff8f8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    minHeight: 40,
  },
  chartHeaderItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  chartBarsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    paddingBottom: 4,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    position: "relative",
  },
  chartBarFill: {
    width: "80%",
    borderRadius: 4,
    minHeight: 4,
  },
  todayIndicator: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    width: 8,
    height: 8,
    zIndex: 10,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f77",
  },
  miniProgressBar: {
    height: 2,
    backgroundColor: "#f77",
    borderRadius: 1,
    marginTop: 2,
  },
  chartLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  chartValue: {
    fontSize: 9,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
    textAlign: "center",
  },

  table: {
    backgroundColor: "#fff8f8",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fee",
    marginBottom: 16,
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
    backgroundColor: "#fff8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fde8e8",
  },
  tipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tipTitle: { fontWeight: "700", color: "#f77", fontSize: 16 },
  tipRefreshButton: {
    padding: 4,
    borderRadius: 6,
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipText: { 
    flex: 1,
    color: "#555", 
    fontSize: 13, 
    lineHeight: 20,
  },
  tipFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#fde8e8",
    color: "#888",
    fontSize: 11,
    fontStyle: "italic",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f77",
  },
  mealTypeSelector: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  mealTypeButtonActive: {
    backgroundColor: "#f77",
  },
  mealTypeText: {
    fontSize: 14,
    color: "#666",
  },
  mealTypeTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  modalButton: {
    backgroundColor: "#f77",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  recipeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  recipeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  recipeKcal: {
    fontSize: 13,
    color: "#666",
  },
  foodLogItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  foodLogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  foodLogInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  foodLogImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  foodLogTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  foodLogMealType: {
    fontSize: 12,
    color: "#666",
  },
  foodLogMacros: {
    flexDirection: "row",
    gap: 12,
  },
  foodLogMacroText: {
    fontSize: 13,
    color: "#666",
  },
});
