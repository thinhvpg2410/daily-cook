import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import TabBar from "./TabBar";
import { http } from "../api/http";
import { checkFavoriteApi, addFavoriteApi, removeFavoriteApi } from "../api/recipes";
import { upsertMealPlanApi, getMealPlansApi, patchMealPlanSlotApi } from "../api/mealplan";
import { createFoodLogApi, getFoodLogsApi } from "../api/food-log";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/env";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
  return src;
}

const { width } = Dimensions.get("window");

type RecipeDetail = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  cookTime?: number | null;
  likes?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  totalKcal?: number | null;
  region?: string | null;
  tags?: string[];
  steps?: string[] | any; // Can be JSON array or string array
  items?: {
    amount: number;
    unitOverride?: string | null;
    ingredient: { name: string; unit?: string | null };
  }[];
};

export default function DetailsScreen({ route, navigation }: any) {
  const { item, mealType: initialMealType, selectedDate: initialSelectedDate } = route.params;
  const { user } = useAuth();
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showAddToMealPlan, setShowAddToMealPlan] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    initialSelectedDate ? new Date(initialSelectedDate) : new Date()
  );
  const [selectedSlot, setSelectedSlot] = useState<"breakfast" | "lunch" | "dinner">(
    initialMealType || "lunch"
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addingToMealPlan, setAddingToMealPlan] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [cookedToday, setCookedToday] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [200, 250],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    loadRecipeDetail();
    checkFavorite();
    checkCooked();
  }, [item?.id]);

  const loadRecipeDetail = async () => {
    setLoading(true);
    try {
      const res = await http.get(`/recipes/${item.id}`);
      const r = res.data as RecipeDetail;
      // Parse steps if it's a JSON string
      if (r.steps && typeof r.steps === 'string') {
        try {
          r.steps = JSON.parse(r.steps);
        } catch (e) {
          // If parsing fails, treat as single step
          r.steps = [r.steps];
        }
      }
      setDetail(r);
    } catch (e: any) {
      console.warn("Fetch recipe detail failed:", e);
      Alert.alert("Lỗi", "Không thể tải chi tiết công thức. Vui lòng thử lại.");
      setDetail({
        id: item.id,
        title: item.title,
        description: item.desc,
        image: item.image,
        cookTime: parseInt(item.time) || 30,
        likes: item.likes,
        calories: item.totalKcal || 320,
        protein: 25,
        carbs: 15,
        fat: 10,
        totalKcal: item.totalKcal || 320,
        steps: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;
    try {
      const res = await checkFavoriteApi(item.id);
      setIsFavorite(res.data.isFavorite);
    } catch (e) {
      // Silent fail - user might not be logged in
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để sử dụng tính năng này.");
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await removeFavoriteApi(item.id);
        setIsFavorite(false);
      } else {
        await addFavoriteApi(item.id);
        setIsFavorite(true);
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể cập nhật yêu thích.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const checkCooked = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await getFoodLogsApi({ start: dateStr, end: dateStr });
      const cooked = (res.data || []).some((l) => l.recipeId === item.id);
      setCookedToday(cooked);
    } catch (error) {
      setCookedToday(false);
    }
  };

  const markCookedToday = async () => {
    if (cookedToday) return;
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await getFoodLogsApi({ start: dateStr, end: dateStr });
      const cooked = (res.data || []).some((l) => l.recipeId === item.id);
      if (!cooked) {
        await createFoodLogApi({
          date: dateStr,
          mealType: selectedSlot,
          recipeId: item.id,
          note: "Đánh dấu đã nấu từ chi tiết món",
        });
      }
      setCookedToday(true);
      Alert.alert("Đã đánh dấu", "Món đã được ghi nhận là đã nấu hôm nay.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể đánh dấu đã nấu.");
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Hãy thử món ${detail?.title || item.title}! 🍳\n\n${detail?.description || ""}\n\nThời gian nấu: ${detail?.cookTime || 30} phút\nCalories: ${detail?.totalKcal || detail?.calories || 320} kcal`,
        title: detail?.title || item.title,
      });
    } catch (error: any) {
      console.error("Share error:", error);
    }
  };

  const handleAddToMealPlan = async () => {
    if (!user) {
      Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để thêm vào thực đơn.");
      return;
    }

    setAddingToMealPlan(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      
      // First, try to get existing meal plan for this date
      try {
        const existingPlans = await getMealPlansApi({ start: dateStr, end: dateStr });
        if (existingPlans.data && existingPlans.data.length > 0) {
          const mealPlan = existingPlans.data[0];
          // Add to existing meal plan
          await patchMealPlanSlotApi(mealPlan.id, {
            slot: selectedSlot,
            add: detail?.id || item.id,
          });
        } else {
          // Create new meal plan
          await upsertMealPlanApi({
            date: dateStr,
            slots: {
              [selectedSlot]: [detail?.id || item.id],
            },
          });
        }
      } catch (e: any) {
        // If get fails, try to create
        await upsertMealPlanApi({
          date: dateStr,
          slots: {
            [selectedSlot]: [detail?.id || item.id],
          },
        });
      }

      Alert.alert("Thành công", `Đã thêm "${detail?.title || item.title}" vào thực đơn ${selectedSlot === "breakfast" ? "sáng" : selectedSlot === "lunch" ? "trưa" : "tối"}!`);
      setShowAddToMealPlan(false);
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể thêm vào thực đơn.");
    } finally {
      setAddingToMealPlan(false);
    }
  };

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const img = normalizeImage(detail?.image ?? item?.image);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Sticky Header */}
      <Animated.View
        style={[
          s.stickyHeader,
          {
            opacity: headerOpacity,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          },
        ]}
        pointerEvents="box-none"
      >
        <SafeAreaView>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#f77" />
            </TouchableOpacity>
            <Text style={s.headerTitle} numberOfLines={1}>
              {detail?.title || item.title}
            </Text>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color="#f77" />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={handleFavorite}
                disabled={favoriteLoading}
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color="#f77" />
                ) : (
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorite ? "#e53935" : "#f77"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Top Header (visible when scrolled to top) */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#f77" />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>
            {detail?.title || item.title}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#f77" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={handleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#f77" />
              ) : (
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color={isFavorite ? "#e53935" : "#f77"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Image + overlay */}
        <View style={s.imageWrap}>
          {loading ? (
            <View
              style={{ height: 280, alignItems: "center", justifyContent: "center" }}
            >
              <ActivityIndicator size="large" color="#f77" />
            </View>
          ) : (
            <Image source={{ uri: img }} style={s.image} resizeMode="cover" />
          )}
          <View style={s.imageOverlay}>
            <View style={s.quickInfoRow}>
              <View style={s.quickInfoItem}>
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={s.quickInfoText}>{detail?.cookTime || 30} phút</Text>
              </View>
              {detail?.region && (
                <View style={s.quickInfoItem}>
                  <Ionicons name="location-outline" size={16} color="#fff" />
                  <Text style={s.quickInfoText}>
                    {detail.region === "Northern" ? "Miền Bắc" : detail.region === "Central" ? "Miền Trung" : "Miền Nam"}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={s.imageFooter}>
            <Text style={s.dishTitle}>{detail?.title || item.title}</Text>
            <View style={s.row}>
              <Ionicons name="heart" size={14} color="#fff" />
              <Text style={s.infoText}>{detail?.likes || item.likes || 0}</Text>
              {detail?.totalKcal && (
                <Text style={[s.infoText, { marginLeft: 8 }]}>
                  {Math.round(detail.totalKcal)} kcal
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        {detail && !loading && (
          <View style={s.quickActions}>
            <TouchableOpacity
              style={[s.quickActionBtn, s.primaryActionBtn]}
              onPress={() =>
                navigation.navigate("Cooking", {
                  recipe: detail,
                  mealType: selectedSlot,
                  selectedDate: selectedDate.toISOString().split("T")[0],
                })
              }
            >
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={[s.quickActionText, { color: "#fff" }]}>Bắt đầu nấu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={() => setShowAddToMealPlan(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#f77" />
              <Text style={s.quickActionText}>Thêm vào thực đơn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.quickActionBtn, cookedToday && s.disabledBtn]}
              disabled={cookedToday}
              onPress={markCookedToday}
            >
              <Ionicons name="checkmark-done" size={20} color={cookedToday ? "#ccc" : "#4caf50"} />
              <Text style={[s.quickActionText, cookedToday ? { color: "#999" } : { color: "#4caf50" }]}>
                {cookedToday ? "Đã nấu hôm nay" : "Đánh dấu đã nấu"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tags */}
        {detail?.tags && detail.tags.length > 0 && (
          <View style={s.tagsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tagsScroll}>
              {detail.tags.map((tag, idx) => (
                <View key={idx} style={s.tag}>
                  <Text style={s.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Details</Text>
          <View style={s.row}>
            <Ionicons name="time-outline" size={16} color="#f77" />
            <Text style={{ marginLeft: 6, color: "#555" }}>
              {(detail?.cookTime ?? 30)} min
            </Text>
          </View>
          <Text style={s.desc}>{detail?.description || item?.desc || ""}</Text>
        </View>

        {/* Calories section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Thông tin dinh dưỡng</Text>
          <View style={s.calorieBox}>
            <Text style={s.calorieValue}>
              {Math.round(detail?.totalKcal || detail?.calories || 320)} kcal
            </Text>
          </View>

          <View style={s.macroRow}>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Protein</Text>
              <Text style={s.macroValue}>{Math.round(detail?.protein || 25)} g</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Carbs</Text>
              <Text style={s.macroValue}>{Math.round(detail?.carbs || 15)} g</Text>
            </View>
            <View style={s.macroItem}>
              <Text style={s.macroLabel}>Fat</Text>
              <Text style={s.macroValue}>{Math.round(detail?.fat || 10)} g</Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Nguyên liệu</Text>
            {checkedIngredients.size > 0 && (
              <TouchableOpacity
                onPress={() => setCheckedIngredients(new Set())}
                style={s.clearCheckedBtn}
              >
                <Text style={s.clearCheckedText}>Bỏ chọn tất cả</Text>
              </TouchableOpacity>
            )}
          </View>
          {detail?.items?.length ? (
            detail.items.map((it, idx) => {
              const isChecked = checkedIngredients.has(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[s.ingredientItem, isChecked && s.ingredientItemChecked]}
                  onPress={() => toggleIngredient(idx)}
                >
                  <View
                    style={[
                      s.ingredientCheckbox,
                      isChecked && { backgroundColor: "#f77", borderColor: "#f77" },
                    ]}
                  >
                    {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={[s.ingredientText, isChecked && s.ingredientTextChecked]}>
                    {it.amount}
                    {it.unitOverride || it.ingredient.unit
                      ? ` ${it.unitOverride || it.ingredient.unit}`
                      : ""}{" "}
                    {it.ingredient.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={s.noDataText}>Chưa có thông tin nguyên liệu</Text>
          )}
        </View>

        {/* Cooking Steps */}
        {detail?.steps && Array.isArray(detail.steps) && detail.steps.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cách làm</Text>
            {detail.steps.map((step: string, idx: number) => (
              <View key={idx} style={s.stepItem}>
                <View style={s.stepNumber}>
                  <Text style={s.stepNumberText}>{idx + 1}</Text>
                </View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom padding for TabBar */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Add to Meal Plan Modal */}
      <Modal
        visible={showAddToMealPlan}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddToMealPlan(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Thêm vào thực đơn</Text>
              <TouchableOpacity onPress={() => setShowAddToMealPlan(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              {/* Date Selection */}
              <View style={s.modalSection}>
                <Text style={s.modalLabel}>Chọn ngày</Text>
                <TouchableOpacity
                  style={s.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#f77" />
                  <Text style={s.datePickerText}>{formatDate(selectedDate)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (date) setSelectedDate(date);
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* Slot Selection */}
              <View style={s.modalSection}>
                <Text style={s.modalLabel}>Bữa ăn</Text>
                <View style={s.slotButtons}>
                  {(["breakfast", "lunch", "dinner"] as const).map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        s.slotButton,
                        selectedSlot === slot && s.slotButtonActive,
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Ionicons
                        name={
                          slot === "breakfast"
                            ? "sunny-outline"
                            : slot === "lunch"
                            ? "partly-sunny-outline"
                            : "moon-outline"
                        }
                        size={20}
                        color={selectedSlot === slot ? "#fff" : "#f77"}
                      />
                      <Text
                        style={[
                          s.slotButtonText,
                          selectedSlot === slot && s.slotButtonTextActive,
                        ]}
                      >
                        {slot === "breakfast" ? "Sáng" : slot === "lunch" ? "Trưa" : "Tối"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.modalButton, s.modalButtonSecondary]}
                onPress={() => setShowAddToMealPlan(false)}
              >
                <Text style={s.modalButtonTextSecondary}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, s.modalButtonPrimary, addingToMealPlan && s.modalButtonDisabled]}
                onPress={handleAddToMealPlan}
                disabled={addingToMealPlan}
              >
                {addingToMealPlan ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.modalButtonTextPrimary}>Xác nhận</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  stickyHeader: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
    flex: 1,
    marginHorizontal: 12,
  },
  iconBtn: {
    backgroundColor: "#ffeef0",
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },

  imageWrap: {
    position: "relative",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: 280,
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  quickInfoRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  quickInfoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  imageFooter: {
    backgroundColor: "rgba(245, 119, 119, 0.95)",
    padding: 14,
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dishTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 4,
    fontWeight: "500",
  },

  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f77",
    backgroundColor: "#fff",
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  quickActionText: {
    color: "#f77",
    fontSize: 14,
    fontWeight: "600",
  },
  quickActionTextSecondary: {
    color: "#f77",
    fontSize: 13,
    fontWeight: "500",
  },

  tagsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tagsScroll: {
    flexDirection: "row",
  },
  tag: {
    backgroundColor: "#ffeef0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  tagText: {
    color: "#f77",
    fontSize: 12,
    fontWeight: "500",
  },

  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f77",
  },
  desc: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
    lineHeight: 22,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  ingredientItemChecked: {
    backgroundColor: "#f5f5f5",
  },
  ingredientCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f77",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  ingredientText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  ingredientTextChecked: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  clearCheckedBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearCheckedText: {
    color: "#f77",
    fontSize: 12,
    fontWeight: "500",
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },

  calorieBox: {
    backgroundColor: "#ffebee",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  calorieValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e53935",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    marginTop: 8,
  },
  macroItem: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },

  stepItem: {
    flexDirection: "row",
    marginVertical: 12,
    alignItems: "flex-start",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f77",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  slotButtons: {
    flexDirection: "row",
    gap: 12,
  },
  slotButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f77",
    backgroundColor: "#fff",
    gap: 8,
  },
  slotButtonActive: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  slotButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f77",
  },
  slotButtonTextActive: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonSecondary: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalButtonPrimary: {
    backgroundColor: "#f77",
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
