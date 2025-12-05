import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { http } from "../api/http";
import {
  getTodaySuggestApi,
  upsertMealPlanApi,
} from "../api/mealplan";
import { getFoodLogStatsApi } from "../api/food-log";
import { getPreferencesApi } from "../api/users";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 32; // 16 * 2
const CARD_WIDTH = (width - HORIZONTAL_PADDING - CARD_GAP) / 2;

const categories = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Vegan",
  "Dessert",
  "Drinks",
  "Sea Food",
];

type ApiRecipe = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  cookTime?: number | null;
  likes?: number | null;
  tags: string[];
  createdAt?: string;
  totalKcal?: number | null;
};

type UiCard = {
  id: string;
  title: string;
  desc: string;
  image: string;
  time: string;
  likes: number;
};

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `http://localhost:3000${src}`;
  return src;
}

function mapToUi(r: ApiRecipe): UiCard {
  return {
    id: r.id,
    title: r.title,
    desc: r.description || "Quick overview of the ingredients...",
    image: normalizeImage(r.image),
    time: `${r.cookTime ?? 30}min`,
    likes: r.likes ?? 0,
  };
}

// Get personalized greeting based on time
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  let greeting = "Xin chào";
  let emoji = "👋";

  if (hour < 6) {
    greeting = "Chào buổi sáng sớm";
    emoji = "🌙";
  } else if (hour < 12) {
    greeting = "Chào buổi sáng";
    emoji = "☀️";
  } else if (hour < 18) {
    greeting = "Chào buổi chiều";
    emoji = "🌤️";
  } else {
    greeting = "Chào buổi tối";
    emoji = "🌙";
  }

  return {
    text:  greeting,
    emoji,
  };
}

// Get motivational message based on time
function getMotivationalMessage(): string {
  const hour = new Date().getHours();
  const messages = [
    { time: [6, 12], msg: "Bắt đầu ngày mới với bữa sáng đầy năng lượng! 🍳" },
    { time: [12, 15], msg: "Đã đến giờ ăn trưa rồi! Bạn muốn ăn gì? 🍽️" },
    { time: [15, 18], msg: "Bữa tối sắp đến, hãy chuẩn bị món ngon nhé! 👨‍🍳" },
    { time: [18, 22], msg: "Thời gian thư giãn với bữa tối ấm cúng! 🕯️" },
    { time: [22, 6], msg: "Đã muộn rồi, nhớ ngủ đủ giấc nhé! 😴" },
  ];

  for (const m of messages) {
    if (m.time[0] <= hour && hour < m.time[1]) {
      return m.msg;
    }
  }
  return messages[0].msg;
}

export default function HomeScreen({ navigation }: any) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySuggestLoading, setTodaySuggestLoading] = useState(false);
  const [todaySuggest, setTodaySuggest] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  const [trending, setTrending] = useState<UiCard[]>([]);
  const [yourRecipes, setYourRecipes] = useState<UiCard[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<UiCard[]>([]);

  const greeting = getGreeting(user?.name);
  const motivationalMsg = getMotivationalMessage();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await http.get("/recipes", {
        params: { page: 1, limit: 100 },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const rows: ApiRecipe[] = (res.data?.data ?? []).map((x: any) => ({
        id: x.id,
        title: x.title,
        description: x.description,
        image: x.image,
        cookTime: x.cookTime,
        likes: x.likes,
        tags: x.tags || [],
        createdAt: x.createdAt,
        totalKcal: x.totalKcal,
      }));

      // Trending: top likes
      const trendingSorted = [...rows]
        .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
        .slice(0, 10)
        .map(mapToUi);
      setTrending(trendingSorted);

      // Recently Added: latest createdAt
      const recentSorted = [...rows]
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        })
        .slice(0, 12)
        .map(mapToUi);
      setRecentlyAdded(recentSorted);

      try {
        if (token) {
          const mine = await http.get("/recipes/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const myRows: ApiRecipe[] = (mine.data ?? []).map((x: any) => ({
            id: x.id,
            title: x.title,
            description: x.description,
            image: x.image,
            cookTime: x.cookTime,
            likes: x.likes,
            tags: x.tags || [],
            createdAt: x.createdAt,
            totalKcal: x.totalKcal,
          }));
          setYourRecipes(myRows.slice(0, 10).map(mapToUi));
        } else {
          const dinnerLike = rows
            .filter((r) => r.tags?.includes("Dinner"))
            .slice(0, 10)
            .map(mapToUi);
          setYourRecipes(
            dinnerLike.length ? dinnerLike : recentSorted.slice(0, 10)
          );
        }
      } catch {
        const dinnerLike = rows
          .filter((r) => r.tags?.includes("Dinner"))
          .slice(0, 10)
          .map(mapToUi);
        setYourRecipes(
          dinnerLike.length ? dinnerLike : recentSorted.slice(0, 10)
        );
      }
    } catch (e) {
      console.warn("Fetch /recipes error:", e);
      setTrending([]);
      setRecentlyAdded([]);
      setYourRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySuggest = async () => {
    if (!token) return;
    setTodaySuggestLoading(true);
    try {
      const res = await getTodaySuggestApi();
      setTodaySuggest(res.data);
    } catch (error) {
      console.error("Error fetching today's suggestion:", error);
    } finally {
      setTodaySuggestLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    if (!token) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await getFoodLogStatsApi(today, today);
      if (res.data?.daily && res.data.daily.length > 0) {
        setTodayStats(res.data.daily[0]);
      } else {
        setTodayStats({ calories: 0, protein: 0, fat: 0, carbs: 0 });
      }
    } catch (error) {
      console.error("Error fetching today stats:", error);
      setTodayStats({ calories: 0, protein: 0, fat: 0, carbs: 0 });
    }
  };

  const fetchUserPreferences = async () => {
    if (!token) return;
    try {
      const res = await getPreferencesApi();
      setUserPreferences(res.data);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  const fallbackToday = new Date().toISOString().split("T")[0];

  const extractRecipeIds = (items?: any[]) => {
    if (!Array.isArray(items)) return [];
    const ids = items
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item.id === "string") return item.id;
        if (typeof item.recipeId === "string") return item.recipeId;
        if (typeof item.recipe?.id === "string") return item.recipe.id;
        return null;
      })
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
    return ids;
  };

  const buildDedupedSlots = () => {
    const seen = new Set<string>();
    const unique = (ids: string[]) =>
      ids.filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    return {
      breakfast: unique(extractRecipeIds(todaySuggest?.breakfast)),
      lunch: unique(extractRecipeIds(todaySuggest?.lunch)),
      dinner: unique(extractRecipeIds(todaySuggest?.dinner)),
    };
  };

  const acceptTodaySuggest = async () => {
    if (!todaySuggest || !token) return;

    // Đảm bảo sử dụng ngày hôm nay
    const today = new Date().toISOString().split("T")[0];
    const apiDate =
      typeof todaySuggest.date === "string" && todaySuggest.date.trim()
        ? todaySuggest.date.split("T")[0]
        : today;

    // Đảm bảo date là hôm nay
    const targetDate = apiDate === today ? apiDate : today;

    const slots = buildDedupedSlots();
    
    // Kiểm tra có món nào không
    const totalRecipes = slots.breakfast.length + slots.lunch.length + slots.dinner.length;
    if (totalRecipes === 0) {
      Alert.alert("Thông báo", "Không có món nào để thêm vào lịch!");
      return;
    }

    setTodaySuggestLoading(true);
    try {
      await upsertMealPlanApi({
        date: targetDate,
        slots,
      });
      
      // Refresh data
      await Promise.all([
        fetchTodaySuggest(),
        fetchTodayStats(),
      ]);
      
      Alert.alert(
        "Thành công! ✅",
        `Đã thêm ${totalRecipes} món vào lịch ngày hôm nay!\n\n- Bữa sáng: ${slots.breakfast.length} món\n- Bữa trưa: ${slots.lunch.length} món\n- Bữa tối: ${slots.dinner.length} món`,
        [
          {
            text: "Xem lịch",
            onPress: () => {
              navigation.navigate("Calendar", { 
                selectedDate: targetDate 
              });
            },
          },
          { text: "OK" },
        ]
      );
    } catch (error: any) {
      console.error("Error accepting suggestion:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Không thể chấp nhận gợi ý. Vui lòng thử lại.";
      Alert.alert("Chấp nhận gợi ý thất bại", message);
    } finally {
      setTodaySuggestLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    if (token) {
      fetchTodaySuggest();
      fetchTodayStats();
      fetchUserPreferences();
    }
  }, [token]);

  // Reload preferences when screen is focused (e.g., after updating in NutritionGoalsScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (token) {
        fetchUserPreferences();
        fetchTodayStats(); // Also refresh stats to update progress bars
      }
    });

    return unsubscribe;
  }, [navigation, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    if (token) {
      await Promise.all([
        fetchTodaySuggest(),
        fetchTodayStats(),
        fetchUserPreferences(),
      ]);
    }
    setRefreshing(false);
  };

  const getCalorieProgress = () => {
    if (!userPreferences || !todayStats) return 0;
    const target = userPreferences.dailyKcalTarget || 2000;
    return Math.min((todayStats.calories / target) * 100, 100);
  };

  const TrendingCard = ({ item }: { item: UiCard }) => (
    <TouchableOpacity
      style={s.trendingCard}
      onPress={() => navigation.navigate("Details", { item })}
    >
      <Image source={{ uri: item.image }} style={s.trendingImage} />
      <TouchableOpacity style={s.heartButton}>
        <Ionicons name="heart-outline" size={18} color="#f77" />
      </TouchableOpacity>
      <View style={s.trendingInfo}>
        <Text style={s.trendingTitle}>{item.title}</Text>
        <Text style={s.trendingDesc} numberOfLines={2}>
          {item.desc}
        </Text>
        <View style={s.row}>
          <Ionicons name="time-outline" size={14} color="#f77" />
          <Text style={s.infoText}>{item.time}</Text>
          <Ionicons
            name="heart"
            size={14}
            color="#f77"
            style={{ marginLeft: 12 }}
          />
          <Text style={s.infoText}>{item.likes}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const SmallCard = ({ item, horizontal }: { item: UiCard; horizontal?: boolean }) => (
    <TouchableOpacity
      style={[s.smallCard, horizontal && s.smallCardHorizontal]}
      onPress={() => navigation.navigate("Details", { item })}
    >
      <Image source={{ uri: item.image }} style={s.smallImage} />
      <TouchableOpacity style={s.heartSmall}>
        <Ionicons name="heart-outline" size={16} color="#f77" />
      </TouchableOpacity>
      <View style={{ padding: 6 }}>
        <Text style={s.smallTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={s.smallDesc} numberOfLines={1}>
          {item.desc}
        </Text>
        <View style={s.row}>
          <Ionicons name="time-outline" size={12} color="#f77" />
          <Text style={s.infoText}>{item.time}</Text>
          <Ionicons
            name="heart"
            size={12}
            color="#f77"
            style={{ marginLeft: 8 }}
          />
          <Text style={s.infoText}>{item.likes}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[s.safe, { alignItems: "center", justifyContent: "center" }]}
      >
        <ActivityIndicator size="large" color="#f77" />
      </SafeAreaView>
    );
  }

  const calorieProgress = getCalorieProgress();
  const targetCalories = userPreferences?.dailyKcalTarget || 2000;
  const currentCalories = todayStats?.calories || 0;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Personalized Greeting */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>
              {greeting.emoji} {greeting.text}!
            </Text>
            <Text style={s.subtitle}>{motivationalMsg}</Text>
          </View>
          <View style={s.iconRow}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => navigation.navigate("ShoppingList")}
            >
              <Ionicons name="cart-outline" size={22} color="#f77" />
              <View style={s.badge}>
                <Text style={s.badgeText}>!</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => navigation.navigate("Profile")}
            >
              <Ionicons name="person-circle-outline" size={22} color="#f77" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        {token && (
          <View style={s.quickActions}>
            <TouchableOpacity
              style={s.quickActionCard}
              onPress={() => navigation.navigate("MealSuggest")}
            >
              <View style={[s.quickActionIcon, { backgroundColor: "#fff5f7" }]}>
                <Ionicons name="sparkles" size={24} color="#f77" />
              </View>
              <Text style={s.quickActionText}>AI Gợi ý</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickActionCard}
              onPress={() => navigation.navigate("Calendar")}
            >
              <View style={[s.quickActionIcon, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="calendar" size={24} color="#4caf50" />
              </View>
              <Text style={s.quickActionText}>Lịch ăn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickActionCard}
              onPress={() => navigation.navigate("NutritionTracker")}
            >
              <View style={[s.quickActionIcon, { backgroundColor: "#e3f2fd" }]}>
                <Ionicons name="analytics" size={24} color="#2196f3" />
              </View>
              <Text style={s.quickActionText}>Dinh dưỡng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickActionCard}
              onPress={() => navigation.navigate("ShoppingList")}
            >
              <View style={[s.quickActionIcon, { backgroundColor: "#fff3e0" }]}>
                <Ionicons name="cart" size={24} color="#ff9800" />
              </View>
              <Text style={s.quickActionText}>Mua sắm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Nutrition Summary */}
        {token && todayStats && userPreferences && (
          <View style={s.nutritionCard}>
            <View style={s.nutritionHeader}>
              <Text style={s.nutritionTitle}>📊 Dinh dưỡng hôm nay</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("NutritionTracker")}
              >
                <Text style={s.viewAllText}>Xem chi tiết →</Text>
              </TouchableOpacity>
            </View>
            <View style={s.calorieProgressContainer}>
              <View style={s.calorieInfo}>
                <Text style={s.calorieValue}>
                  {Math.round(currentCalories)}
                </Text>
                <Text style={s.calorieLabel}>/ {targetCalories} kcal</Text>
              </View>
              <View style={s.progressBarContainer}>
                <View
                  style={[
                    s.progressBar,
                    { width: `${calorieProgress}%` },
                    calorieProgress > 100 && s.progressBarOver,
                  ]}
                />
              </View>
              <Text style={s.progressText}>
                {calorieProgress >= 100
                  ? "✅ Đã đạt mục tiêu!"
                  : `Còn ${Math.round(targetCalories - currentCalories)} kcal`}
              </Text>
            </View>
            <View style={s.macrosContainer}>
              <View style={s.macroItem}>
                <Text style={s.macroValue}>
                  {Math.round(todayStats.protein || 0)}g
                </Text>
                <Text style={s.macroLabel}>Protein</Text>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <Text style={s.macroValue}>
                  {Math.round(todayStats.carbs || 0)}g
                </Text>
                <Text style={s.macroLabel}>Carbs</Text>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <Text style={s.macroValue}>
                  {Math.round(todayStats.fat || 0)}g
                </Text>
                <Text style={s.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Suggestion Card */}
        {token && (
          <View style={s.todayCard}>
            <View style={s.todayCardHeader}>
              <View>
                <Text style={s.todayCardTitle}>
                  ✨ {todaySuggest?.hasPlan ? "Kế hoạch hôm nay" : "Gợi ý hôm nay"}
                </Text>
                <Text style={s.todayCardSubtitle}>
                  {todaySuggest?.hasPlan
                    ? "Bạn đã có kế hoạch cho hôm nay"
                    : "Hệ thống gợi ý món ăn cho bạn"}
                </Text>
              </View>
              {todaySuggestLoading && (
                <ActivityIndicator size="small" color="#f77" />
              )}
            </View>

            {todaySuggest && !todaySuggestLoading && (
              <>
                {(todaySuggest.breakfast?.length > 0 ||
                  todaySuggest.lunch?.length > 0 ||
                  todaySuggest.dinner?.length > 0) && (
                  <View style={s.todayMeals}>
                    {todaySuggest.breakfast?.length > 0 && (
                      <View style={s.todayMealSlot}>
                        <View style={s.mealSlotHeader}>
                          <Text style={s.todayMealLabel}>🌅 Bữa sáng</Text>
                          <Text style={s.mealCount}>
                            {todaySuggest.breakfast.length} món
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={s.mealScrollContent}
                        >
                          {todaySuggest.breakfast.map((item: any) => (
                            <TouchableOpacity
                              key={item.id}
                              style={s.todayMealItem}
                              onPress={() =>
                                navigation.navigate("Details", { item })
                              }
                            >
                              <Image
                                source={{ uri: normalizeImage(item.image) }}
                                style={s.todayMealImage}
                              />
                              <Text style={s.todayMealTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              {item.totalKcal && (
                                <Text style={s.todayMealKcal}>
                                  {Math.round(item.totalKcal)} kcal
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    {todaySuggest.lunch?.length > 0 && (
                      <View style={s.todayMealSlot}>
                        <View style={s.mealSlotHeader}>
                          <Text style={s.todayMealLabel}>🌆 Bữa trưa</Text>
                          <Text style={s.mealCount}>
                            {todaySuggest.lunch.length} món
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={s.mealScrollContent}
                        >
                          {todaySuggest.lunch.map((item: any) => (
                            <TouchableOpacity
                              key={item.id}
                              style={s.todayMealItem}
                              onPress={() =>
                                navigation.navigate("Details", { item })
                              }
                            >
                              <Image
                                source={{ uri: normalizeImage(item.image) }}
                                style={s.todayMealImage}
                              />
                              <Text style={s.todayMealTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              {item.totalKcal && (
                                <Text style={s.todayMealKcal}>
                                  {Math.round(item.totalKcal)} kcal
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    {todaySuggest.dinner?.length > 0 && (
                      <View style={s.todayMealSlot}>
                        <View style={s.mealSlotHeader}>
                          <Text style={s.todayMealLabel}>🌙 Bữa tối</Text>
                          <Text style={s.mealCount}>
                            {todaySuggest.dinner.length} món
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={s.mealScrollContent}
                        >
                          {todaySuggest.dinner.map((item: any) => (
                            <TouchableOpacity
                              key={item.id}
                              style={s.todayMealItem}
                              onPress={() =>
                                navigation.navigate("Details", { item })
                              }
                            >
                              <Image
                                source={{ uri: normalizeImage(item.image) }}
                                style={s.todayMealImage}
                              />
                              <Text style={s.todayMealTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              {item.totalKcal && (
                                <Text style={s.todayMealKcal}>
                                  {Math.round(item.totalKcal)} kcal
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    {todaySuggest.totalKcal && userPreferences && (
                      <View style={s.totalKcalContainer}>
                        <Ionicons 
                          name={todaySuggest.totalKcal <= (userPreferences.dailyKcalTarget || 2000) ? "checkmark-circle" : "warning"} 
                          size={16} 
                          color={todaySuggest.totalKcal <= (userPreferences.dailyKcalTarget || 2000) ? "#4CAF50" : "#FF9800"} 
                        />
                        <Text style={[
                          s.totalKcalText,
                          todaySuggest.totalKcal > (userPreferences.dailyKcalTarget || 2000) && s.totalKcalTextWarning
                        ]}>
                          Tổng: ~{Math.round(todaySuggest.totalKcal)} / {userPreferences.dailyKcalTarget || 2000} kcal
                          {todaySuggest.totalKcal > (userPreferences.dailyKcalTarget || 2000) && " ⚠️"}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {!todaySuggest.hasPlan && (
                  <TouchableOpacity
                    style={s.acceptButton}
                    onPress={acceptTodaySuggest}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.acceptButtonText}>Chấp nhận gợi ý</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.suggestButton}
                  onPress={() => navigation.navigate("MealSuggest")}
                >
                  <Ionicons name="sparkles" size={18} color="#f77" />
                  <Text style={s.suggestButtonText}>Gợi ý khác</Text>
                </TouchableOpacity>
              </>
            )}

            {!todaySuggest && !todaySuggestLoading && token && (
              <View style={s.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color="#ccc" />
                <Text style={s.emptyStateText}>
                  Chưa có gợi ý cho hôm nay
                </Text>
                <TouchableOpacity
                  style={s.suggestButton}
                  onPress={() => navigation.navigate("MealSuggest")}
                >
                  <Ionicons name="sparkles" size={18} color="#f77" />
                  <Text style={s.suggestButtonText}>Tạo gợi ý ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Categories */}
        <View style={s.categoriesSection}>
          <Text style={s.sectionTitle}>🔍 Danh mục</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoriesContainer}
          >
            {categories.map((item) => (
              <TouchableOpacity
                key={item}
                style={s.catBtn}
                onPress={() => navigation.navigate("Category", { category: item })}
              >
                <Text style={s.catText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trending */}
        {trending.length > 0 && (
          <>
            <Text style={s.sectionTitle}>🔥 Món ăn phổ biến</Text>
            <FlatList
              horizontal
              data={trending}
              renderItem={({ item }) => <TrendingCard item={item} />}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </>
        )}

        {/* Your Recipes */}
        {yourRecipes.length > 0 && (
          <View style={s.sectionBox}>
            <Text style={s.sectionTitleWhite}>📚 Món ăn của bạn</Text>
            <FlatList
              horizontal
              data={yourRecipes}
              renderItem={({ item }) => <SmallCard item={item} horizontal />}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontalList}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </View>
        )}

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <>
            <Text style={s.sectionTitle}>🆕 Món mới thêm</Text>
            <View style={s.grid}>
              {recentlyAdded.map((i) => (
                <SmallCard key={i.id} item={i} />
              ))}
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f77",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  iconRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    backgroundColor: "#fff5f7",
    padding: 10,
    borderRadius: 20,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#f77",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  nutritionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  viewAllText: {
    fontSize: 12,
    color: "#f77",
    fontWeight: "500",
  },
  calorieProgressContainer: {
    marginBottom: 16,
  },
  calorieInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  calorieValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f77",
  },
  calorieLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#f77",
    borderRadius: 4,
  },
  progressBarOver: {
    backgroundColor: "#4caf50",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  macroItem: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: "#666",
  },
  macroDivider: {
    width: 1,
    backgroundColor: "#f0f0f0",
  },
  todayCard: {
    backgroundColor: "#fff5f7",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#f77",
  },
  todayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  todayCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f77",
    marginBottom: 4,
  },
  todayCardSubtitle: {
    fontSize: 12,
    color: "#777",
  },
  todayMeals: {
    marginBottom: 12,
  },
  todayMealSlot: {
    marginBottom: 16,
  },
  mealSlotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  todayMealLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  mealCount: {
    fontSize: 12,
    color: "#666",
  },
  mealScrollContent: {
    paddingRight: 16,
  },
  todayMealItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
    width: 130,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  todayMealImage: {
    width: 130,
    height: 90,
    resizeMode: "cover",
  },
  todayMealTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    padding: 8,
    textAlign: "center",
  },
  todayMealKcal: {
    fontSize: 10,
    color: "#f77",
    textAlign: "center",
    paddingBottom: 8,
    fontWeight: "500",
  },
  totalKcalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffe0e6",
  },
  totalKcalText: {
    fontSize: 14,
    color: "#f77",
    fontWeight: "600",
    marginLeft: 6,
  },
  totalKcalTextWarning: {
    color: "#FF9800",
  },
  acceptButton: {
    backgroundColor: "#f77",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  suggestButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f77",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  suggestButtonText: {
    color: "#f77",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    marginBottom: 16,
  },
  categoriesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 12,
    color: "#333",
    paddingHorizontal: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f77",
  },
  catText: {
    fontSize: 14,
    color: "#f77",
    fontWeight: "500",
  },
  trendingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 16,
    width: width * 0.7,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trendingImage: { width: "100%", height: 150, resizeMode: "cover" },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
  },
  trendingInfo: { padding: 10 },
  trendingTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  trendingDesc: { fontSize: 12, color: "#777", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 12, color: "#777", marginLeft: 4 },
  sectionBox: {
    backgroundColor: "#f77",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 12,
    marginHorizontal: 16,
  },
  sectionTitleWhite: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 8,
    color: "#fff",
    marginLeft: 8,
  },
  smallCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: CARD_WIDTH,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  smallCardHorizontal: {
    width: 160,
    marginRight: 0, // ItemSeparatorComponent sẽ xử lý spacing
  },
  smallImage: { width: "100%", height: 100, resizeMode: "cover" },
  heartSmall: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
  },
  smallTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  smallDesc: { fontSize: 11, color: "#777", marginBottom: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
});
