// src/screens/CalendarScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, FlatList } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import TabBar, { TabBarSpacer } from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { getMealPlansApi, getTodaySuggestApi, patchMealPlanSlotApi, upsertMealPlanApi, suggestMenuApi } from "../api/mealplan";
import { getFoodLogsApi } from "../api/food-log";
import { searchRecipesApi, Recipe } from "../api/recipes";
import { http } from "../api/http";
import { API_BASE_URL } from "../config/env";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
  return src;
}

export default function CalendarScreen({ navigation, route }: any) {
  const { token } = useAuth();
  const initialDate = route?.params?.selectedDate || new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [loading, setLoading] = useState(false);
  const [mealData, setMealData] = useState<Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }>>({});
  const [mealPlanIds, setMealPlanIds] = useState<Record<string, string>>({});
  const [cookedMap, setCookedMap] = useState<Record<string, boolean>>({});
  
  // Modal state
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<"breakfast" | "lunch" | "dinner" | null>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");
  const [recipeSearchResults, setRecipeSearchResults] = useState<Recipe[]>([]);
  const [recipeSearchLoading, setRecipeSearchLoading] = useState(false);
  const [recipeSearchPage, setRecipeSearchPage] = useState(1);
  const [recipeSearchHasMore, setRecipeSearchHasMore] = useState(true);
  const [recipeSearchTotal, setRecipeSearchTotal] = useState(0);
  const [replaceRecipeId, setReplaceRecipeId] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const fetchMealPlans = async (startDate: string, endDate: string) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await getMealPlansApi({
        start: startDate,
        end: endDate,
      });

      const plans = res.data || [];
      const data: Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }> = {};
      const newMealPlanIds: Record<string, string> = { ...mealPlanIds };

      for (const plan of plans) {
        // Ensure date is in YYYY-MM-DD format
        const date = typeof plan.date === 'string' 
          ? plan.date.split('T')[0] 
          : new Date(plan.date).toISOString().split('T')[0];
        const slots = plan.slots || {};
        
        // Store meal plan ID
        newMealPlanIds[date] = plan.id;
        
        const breakfastIds = Array.isArray(slots.breakfast) ? slots.breakfast : [];
        const lunchIds = Array.isArray(slots.lunch) ? slots.lunch : [];
        const dinnerIds = Array.isArray(slots.dinner) ? slots.dinner : [];

        // Fetch recipe details
        const allIds = [...breakfastIds, ...lunchIds, ...dinnerIds];
        if (allIds.length > 0) {
          const recipes = await Promise.all(
            allIds.map(async (id: string) => {
              try {
                const recipeRes = await http.get(`/recipes/${id}`);
                return recipeRes.data;
              } catch (error) {
                console.error(`Error fetching recipe ${id}:`, error);
                return null;
              }
            })
          );

          const validRecipes = recipes.filter(Boolean);
          
          const breakfastRecipes = validRecipes
            .filter((r: any) => breakfastIds.includes(r.id))
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              image: normalizeImage(r.image),
              time: `${r.cookTime ?? 30}min`,
              likes: r.likes ?? 0,
            }));
          
          const lunchRecipes = validRecipes
            .filter((r: any) => lunchIds.includes(r.id))
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              image: normalizeImage(r.image),
              time: `${r.cookTime ?? 30}min`,
              likes: r.likes ?? 0,
            }));
          
          const dinnerRecipes = validRecipes
            .filter((r: any) => dinnerIds.includes(r.id))
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              image: normalizeImage(r.image),
              time: `${r.cookTime ?? 30}min`,
              likes: r.likes ?? 0,
            }));
          
          data[date] = {
            breakfast: breakfastRecipes,
            lunch: lunchRecipes,
            dinner: dinnerRecipes,
          };
        } else {
          data[date] = { breakfast: [], lunch: [], dinner: [] };
        }
      }

      // Merge with existing data to preserve other dates
      const mergedData = { ...mealData, ...data };
      setMealData(mergedData);
      setMealPlanIds(newMealPlanIds);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get or create meal plan ID for selected date
  const getMealPlanId = async (): Promise<string> => {
    // First check if we have it in state
    if (mealPlanIds[selectedDate]) {
      return mealPlanIds[selectedDate];
    }
    
    // Try to fetch from API
    try {
      const plansRes = await getMealPlansApi({ 
        start: selectedDate, 
        end: selectedDate 
      });
      const plans = plansRes.data || [];
      const existingPlan = plans.find((p: any) => {
        const planDate = typeof p.date === 'string' 
          ? p.date.split('T')[0] 
          : new Date(p.date).toISOString().split('T')[0];
        return planDate === selectedDate;
      });
      
      if (existingPlan) {
        const newMealPlanIds = { ...mealPlanIds, [selectedDate]: existingPlan.id };
        setMealPlanIds(newMealPlanIds);
        return existingPlan.id;
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error);
      // Continue to create new plan
    }
    
    // Create new meal plan if doesn't exist
    try {
      const res = await upsertMealPlanApi({
        date: selectedDate,
        slots: { breakfast: [], lunch: [], dinner: [] },
      });
      const newId = res.data.id;
      const newMealPlanIds = { ...mealPlanIds, [selectedDate]: newId };
      setMealPlanIds(newMealPlanIds);
      return newId;
    } catch (error) {
      console.error("Error creating meal plan:", error);
      throw new Error("Không thể tạo meal plan. Vui lòng thử lại.");
    }
  };
  
  // Add recipe to slot
  const handleAddRecipe = async (recipeId: string) => {
    try {
      const mealPlanId = await getMealPlanId();
      await patchMealPlanSlotApi(mealPlanId, {
        slot: selectedSlot!,
        add: recipeId,
      });
      
      // Refresh meal data
      const date = new Date(selectedDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      await fetchMealPlans(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );
      
      setShowRecipeModal(false);
      setSelectedSlot(null);
      setRecipeSearchQuery("");
      setRecipeSearchResults([]);
    } catch (error: any) {
      console.error("Error adding recipe:", error);
    }
  };
  
  // Remove recipe from slot - xóa trực tiếp không cần xác nhận
  const handleRemoveRecipe = async (recipeId: string, slot: "breakfast" | "lunch" | "dinner") => {
    try {
      if (!recipeId) {
        console.error("Không tìm thấy ID món ăn");
        return;
      }

      // Get meal plan ID first
      const mealPlanId = mealPlanIds[selectedDate] || await getMealPlanId();
      
      if (!mealPlanId) {
        console.error("Không tìm thấy meal plan");
        return;
      }

      // Xóa trực tiếp không cần xác nhận
      await patchMealPlanSlotApi(mealPlanId, {
        slot,
        remove: String(recipeId).trim(),
      });
      
      // Refresh meal data
      const date = new Date(selectedDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      await fetchMealPlans(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );
    } catch (error: any) {
      console.error("Error removing recipe:", error);
      // Không hiển thị alert, chỉ log error
    }
  };
  
  // Replace recipe in slot
  const handleReplaceRecipe = async (oldRecipeId: string, newRecipeId: string, slot: "breakfast" | "lunch" | "dinner") => {
    try {
      // Get meal plan ID first
      const mealPlanId = mealPlanIds[selectedDate] || await getMealPlanId();
      
      if (!mealPlanId) {
        console.error("Không tìm thấy meal plan");
        return;
      }
      
      const currentMeals = meals[slot].map((m: any) => m.id);
      const newMeals = currentMeals.map((id: string) => id === oldRecipeId ? newRecipeId : id);
      
      await patchMealPlanSlotApi(mealPlanId, {
        slot,
        set: newMeals,
      });
      
      // Refresh meal data
      const date = new Date(selectedDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      await fetchMealPlans(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );
      
      setShowRecipeModal(false);
      setSelectedSlot(null);
      setRecipeSearchQuery("");
      setRecipeSearchResults([]);
      setReplaceRecipeId(null);
    } catch (error: any) {
      console.error("Error replacing recipe:", error);
    }
  };
  
  // Search recipes with debounce
  const searchRecipes = async (query: string, page: number = 1, append: boolean = false) => {
    if (!query.trim()) {
      setRecipeSearchResults([]);
      setRecipeSearchPage(1);
      setRecipeSearchHasMore(true);
      return;
    }
    
    setRecipeSearchLoading(true);
    try {
      const limit = 20;
      const res = await searchRecipesApi({ q: query, page, limit });
      const newRecipes = res.data.data || [];
      const total = res.data.total || 0;
      
      if (append) {
        setRecipeSearchResults((prev) => [...prev, ...newRecipes]);
      } else {
        setRecipeSearchResults(newRecipes);
      }
      
      setRecipeSearchTotal(total);
      const currentLength = append ? recipeSearchResults.length + newRecipes.length : newRecipes.length;
      setRecipeSearchHasMore(newRecipes.length === limit && currentLength < total);
    } catch (error) {
      console.error("Error searching recipes:", error);
    } finally {
      setRecipeSearchLoading(false);
    }
  };

  // Load more recipes
  const loadMoreRecipes = async () => {
    if (recipeSearchLoading || !recipeSearchHasMore || !recipeSearchQuery.trim()) return;
    
    const nextPage = recipeSearchPage + 1;
    setRecipeSearchPage(nextPage);
    await searchRecipes(recipeSearchQuery, nextPage, true);
  };
  
  // Debounce search - only search when user types
  useEffect(() => {
    if (!showRecipeModal) return;
    
    // If query is empty, load default recipes
    if (!recipeSearchQuery.trim()) {
      setRecipeSearchPage(1);
      setRecipeSearchHasMore(true);
      const timeoutId = setTimeout(() => {
        loadDefaultRecipes();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    
    // Debounce search when user types - reset to page 1
    setRecipeSearchPage(1);
    setRecipeSearchHasMore(true);
    const timeoutId = setTimeout(() => {
      searchRecipes(recipeSearchQuery, 1, false);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [recipeSearchQuery, showRecipeModal]);
  
  // Open recipe selection modal
  const openRecipeModal = (slot: "breakfast" | "lunch" | "dinner", replaceId?: string) => {
    setSelectedSlot(slot);
    setShowRecipeModal(true);
    setRecipeSearchQuery("");
    setRecipeSearchResults([]);
    setRecipeSearchPage(1);
    setRecipeSearchHasMore(true);
    setReplaceRecipeId(replaceId || null);
    
    // Load default recipes when modal opens
    loadDefaultRecipes(1, false);
  };
  
  // Load default recipes (without query)
  const loadDefaultRecipes = async (page: number = 1, append: boolean = false) => {
    setRecipeSearchLoading(true);
    try {
      const limit = 20;
      const res = await searchRecipesApi({ page, limit });
      const newRecipes = res.data.data || [];
      const total = res.data.total || 0;
      
      if (append) {
        setRecipeSearchResults((prev) => [...prev, ...newRecipes]);
      } else {
        setRecipeSearchResults(newRecipes);
        setRecipeSearchPage(1);
      }
      
      setRecipeSearchTotal(total);
      const currentLength = append ? recipeSearchResults.length + newRecipes.length : newRecipes.length;
      setRecipeSearchHasMore(newRecipes.length === limit && currentLength < total);
    } catch (error) {
      console.error("Error loading default recipes:", error);
    } finally {
      setRecipeSearchLoading(false);
    }
  };

  // Load more default recipes
  const loadMoreDefaultRecipes = async () => {
    if (recipeSearchLoading || !recipeSearchHasMore) return;
    
    const nextPage = recipeSearchPage + 1;
    setRecipeSearchPage(nextPage);
    await loadDefaultRecipes(nextPage, true);
  };
  
  // Suggest meals for selected date
  const handleSuggestMeals = async () => {
    setSuggesting(true);
    try {
      const res = await suggestMenuApi({
        date: selectedDate,
        slot: "all",
        persist: true, // Automatically add to calendar
      });
      
      // Refresh meal data
      const date = new Date(selectedDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      await fetchMealPlans(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );
    } catch (error: any) {
      console.error("Error suggesting meals:", error);
    } finally {
      setSuggesting(false);
    }
  };

  useEffect(() => {
    if (token) {
      // Fetch for the whole month to show all meal plans
      const date = new Date(selectedDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      fetchMealPlans(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );
    }
  }, [selectedDate, token]);
  
  // Refresh when screen comes into focus (e.g., returning from MealSuggestScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (token) {
        const date = new Date(selectedDate);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        fetchMealPlans(
          startOfMonth.toISOString().split("T")[0],
          endOfMonth.toISOString().split("T")[0]
        );
      }
    });
    
    return unsubscribe;
  }, [navigation, selectedDate, token]);

  // Handle route params for selectedDate
  useEffect(() => {
    if (route?.params?.selectedDate && route.params.selectedDate !== selectedDate) {
      setSelectedDate(route.params.selectedDate);
      // Refresh meal plans for the selected date
      if (token) {
        const date = new Date(route.params.selectedDate);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        fetchMealPlans(
          startOfMonth.toISOString().split("T")[0],
          endOfMonth.toISOString().split("T")[0]
        );
      }
    }
  }, [route?.params?.selectedDate, token]);

  // Handle route params for refresh
  useEffect(() => {
    if (route?.params?.refresh && route?.params?.refreshDate) {
      const refreshDate = route.params.refreshDate;
      if (refreshDate !== selectedDate) {
        setSelectedDate(refreshDate);
      }
      // Refresh meal plans
      if (token) {
        const date = new Date(refreshDate);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        fetchMealPlans(
          startOfMonth.toISOString().split("T")[0],
          endOfMonth.toISOString().split("T")[0]
        );
      }
      // Clear route params
      navigation.setParams({ refresh: undefined, refreshDate: undefined });
    }
  }, [route?.params, token]);

  // Fetch cooked recipes for selected date
  useEffect(() => {
    const fetchCooked = async (date: string) => {
      if (!token) {
        setCookedMap({});
        return;
      }
      try {
        const res = await getFoodLogsApi({ start: date, end: date });
        const cooked: Record<string, boolean> = {};
        (res.data || []).forEach((log) => {
          if (log.recipeId) cooked[log.recipeId] = true;
        });
        setCookedMap(cooked);
      } catch (error) {
        console.error("Error fetching cooked state:", error);
        setCookedMap({});
      }
    };

    fetchCooked(selectedDate);
  }, [selectedDate, token]);

  const meals = mealData[selectedDate] || { breakfast: [], lunch: [], dinner: [] };

  const handleDateChange = (day: any) => {
    setSelectedDate(day.dateString);
  };

  // Mark dates that have meal plans
  const markedDates: any = {
    [selectedDate]: { selected: true, selectedColor: "#f77" },
  };
  
  Object.keys(mealData).forEach((date) => {
    const meals = mealData[date];
    const hasMeals = meals.breakfast.length > 0 || meals.lunch.length > 0 || meals.dinner.length > 0;
    if (hasMeals && date !== selectedDate) {
      markedDates[date] = { marked: true, dotColor: "#f77" };
    }
  });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
        <View style={s.headerRow}>
          <Text style={s.title}>Lịch Thực Đơn</Text>
          <TouchableOpacity
            style={[s.suggestButton, suggesting && s.suggestButtonDisabled]}
            onPress={handleSuggestMeals}
            disabled={suggesting || !token}
          >
            {suggesting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={s.suggestButtonText}>Gợi ý</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <Calendar
          onDayPress={handleDateChange}
          markedDates={markedDates}
          style={{ borderRadius: 12, marginBottom: 16 }}
          theme={{
            selectedDayBackgroundColor: "#f77",
            selectedDayTextColor: "#fff",
            todayTextColor: "#f77",
            arrowColor: "#f77",
          }}
        />

        {loading ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#f77" />
          </View>
        ) : (
          <>
            {/* Meals */}
            {(["breakfast", "lunch", "dinner"] as const).map((mealType) => (
              <View key={mealType} style={{ marginBottom: 16 }}>
                <View style={s.mealHeader}>
                  <Text style={s.mealTitle}>
                    {mealType === "breakfast" ? "Bữa Sáng" : mealType === "lunch" ? "Bữa Trưa" : "Bữa Tối"}
                  </Text>
                  <TouchableOpacity
                    style={s.addButton}
                    onPress={() => openRecipeModal(mealType)}
                  >
                    <Ionicons name="add-circle" size={24} color="#f77" />
                  </TouchableOpacity>
                </View>
                {meals[mealType].length === 0 ? (
                  <TouchableOpacity
                    style={s.emptyMealCard}
                    onPress={() => openRecipeModal(mealType)}
                  >
                    <Ionicons name="add-circle-outline" size={32} color="#ccc" />
                    <Text style={s.noMeal}>Thêm món ăn</Text>
                  </TouchableOpacity>
                ) : (
                  meals[mealType].map((dish, idx) => (
                    <View key={dish.id || idx} style={s.dishCard}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                        onPress={() =>
                          navigation.navigate("Details", {
                            item: dish,
                            mealType,
                            selectedDate,
                          })
                        }
                      >
                        <Image source={{ uri: dish.image }} style={s.dishImage} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.dishTitle}>{dish.title}</Text>
                          <Text style={s.dishTime}>{dish.time}</Text>
                          {cookedMap[dish.id] && (
                            <Text style={s.cookedBadge}>Đã nấu</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={s.dishActions}>
                        <TouchableOpacity
                          style={[s.actionButton, cookedMap[dish.id] && s.disabledAction]}
                          disabled={!!cookedMap[dish.id]}
                          onPress={() => openRecipeModal(mealType, dish.id)}
                        >
                          <Ionicons name="swap-horizontal" size={20} color={cookedMap[dish.id] ? "#ccc" : "#4dabf7"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionButton, cookedMap[dish.id] && s.disabledAction]}
                          disabled={!!cookedMap[dish.id]}
                          onPress={() => handleRemoveRecipe(dish.id, mealType)}
                        >
                          <Ionicons name="trash-outline" size={20} color={cookedMap[dish.id] ? "#ccc" : "#ff6b6b"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))}

            {!token && (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: "#777" }}>Vui lòng đăng nhập để xem lịch thực đơn</Text>
              </View>
            )}
          </>
        )}
        <TabBarSpacer />
      </ScrollView>
      
      {/* Recipe Selection Modal */}
      <Modal
        visible={showRecipeModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowRecipeModal(false);
          setSelectedSlot(null);
          setRecipeSearchQuery("");
          setRecipeSearchResults([]);
          setReplaceRecipeId(null);
        }}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {selectedSlot === "breakfast" ? "Chọn món cho Bữa Sáng" : 
               selectedSlot === "lunch" ? "Chọn món cho Bữa Trưa" : 
               "Chọn món cho Bữa Tối"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowRecipeModal(false);
                setSelectedSlot(null);
                setRecipeSearchQuery("");
                setRecipeSearchResults([]);
                setReplaceRecipeId(null);
              }}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={s.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm kiếm món ăn..."
              value={recipeSearchQuery}
              onChangeText={setRecipeSearchQuery}
            />
          </View>
          
          {recipeSearchLoading ? (
            <View style={s.modalLoading}>
              <ActivityIndicator size="large" color="#f77" />
              <Text style={{ marginTop: 12, color: "#666" }}>Đang tải...</Text>
            </View>
          ) : recipeSearchResults.length === 0 && recipeSearchQuery ? (
            <View style={s.modalEmpty}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={s.modalEmptyText}>Không tìm thấy món ăn</Text>
              <Text style={[s.modalEmptyText, { fontSize: 13, marginTop: 8 }]}>
                Thử tìm kiếm với từ khóa khác
              </Text>
            </View>
          ) : recipeSearchResults.length === 0 ? (
            <View style={s.modalEmpty}>
              <Ionicons name="restaurant-outline" size={48} color="#ccc" />
              <Text style={s.modalEmptyText}>Đang tải danh sách món ăn...</Text>
            </View>
          ) : (
            <>
              <View style={s.resultsHeader}>
                <Text style={s.resultsHeaderText}>
                  {recipeSearchQuery 
                    ? `Tìm thấy ${recipeSearchResults.length} món ăn` 
                    : `${recipeSearchResults.length} món ăn có sẵn`}
                </Text>
              </View>
              <FlatList
                data={recipeSearchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.recipeItem}
                  onPress={() => {
                    if (replaceRecipeId && selectedSlot) {
                      handleReplaceRecipe(replaceRecipeId, item.id, selectedSlot);
                    } else {
                      handleAddRecipe(item.id);
                    }
                  }}
                >
                  <Image
                    source={{ uri: normalizeImage(item.image) }}
                    style={s.recipeItemImage}
                  />
                  <View style={s.recipeItemContent}>
                    <Text style={s.recipeItemTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={s.recipeItemDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <View style={s.recipeItemInfo}>
                      {item.cookTime && (
                        <View style={s.recipeItemInfoItem}>
                          <Ionicons name="time-outline" size={14} color="#f77" />
                          <Text style={s.recipeItemInfoText}>{item.cookTime} phút</Text>
                        </View>
                      )}
                      {item.totalKcal && (
                        <View style={s.recipeItemInfoItem}>
                          <Ionicons name="flame-outline" size={14} color="#f77" />
                          <Text style={s.recipeItemInfoText}>{Math.round(item.totalKcal)} kcal</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              onEndReached={() => {
                if (recipeSearchQuery.trim()) {
                  loadMoreRecipes();
                } else {
                  loadMoreDefaultRecipes();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => {
                if (!recipeSearchLoading || recipeSearchResults.length === 0) return null;
                return (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#f77" />
                    <Text style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                      Đang tải thêm...
                    </Text>
                  </View>
                );
              }}
            />
            </>
          )}
        </SafeAreaView>
      </Modal>
      <TabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#fff"}, 
  container:{flex:1,padding:16},
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title:{fontSize:22,fontWeight:"bold",color:"#f77"},
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f77",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  suggestButtonDisabled: {
    opacity: 0.6,
  },
  suggestButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  mealTitle:{fontSize:16,fontWeight:"600",color:"#f77"},
  addButton: {
    padding: 4,
  },
  noMeal:{fontSize:14,color:"#777",fontStyle:"italic",marginLeft:6,marginVertical:2},
  emptyMealCard: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#eee",
    borderStyle: "dashed",
  },
  dishCard:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff0f3",
    padding:8,
    borderRadius:12,
    marginVertical:4,
  },
  dishImage:{width:60,height:60,borderRadius:8},
  dishTitle:{fontSize:14,fontWeight:"600",color:"#333"},
  dishTime:{fontSize:12,color:"#555",marginTop:2},
  cookedBadge: {
    marginTop: 4,
    color: "#f77",
    fontWeight: "700",
    fontSize: 12,
  },
  dishActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  disabledAction: {
    opacity: 0.4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultsHeaderText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  recipeItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  recipeItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  recipeItemContent: {
    flex: 1,
  },
  recipeItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  recipeItemDesc: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  recipeItemInfo: {
    flexDirection: "row",
    gap: 16,
  },
  recipeItemInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeItemInfoText: {
    fontSize: 12,
    color: "#666",
  },
});
