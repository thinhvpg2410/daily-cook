// src/screens/CalendarScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, FlatList, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { getMealPlansApi, getTodaySuggestApi, patchMealPlanSlotApi, upsertMealPlanApi, suggestMenuApi } from "../api/mealplan";
import { searchRecipesApi, Recipe } from "../api/recipes";
import { http } from "../api/http";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `http://localhost:3000${src}`;
  return src;
}

export default function CalendarScreen({ navigation, route }: any) {
  const { token } = useAuth();
  const initialDate = route?.params?.selectedDate || new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [loading, setLoading] = useState(false);
  const [mealData, setMealData] = useState<Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }>>({});
  const [mealPlanIds, setMealPlanIds] = useState<Record<string, string>>({});
  
  // Modal state
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<"breakfast" | "lunch" | "dinner" | null>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");
  const [recipeSearchResults, setRecipeSearchResults] = useState<Recipe[]>([]);
  const [recipeSearchLoading, setRecipeSearchLoading] = useState(false);
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
      console.log("Fetched meal plans:", plans);
      const data: Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }> = {};
      const newMealPlanIds: Record<string, string> = { ...mealPlanIds };

      for (const plan of plans) {
        // Ensure date is in YYYY-MM-DD format
        const date = typeof plan.date === 'string' 
          ? plan.date.split('T')[0] 
          : new Date(plan.date).toISOString().split('T')[0];
        const slots = plan.slots || {};
        
        console.log(`Processing plan for date ${date}:`, slots);
        
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
          console.log(`Valid recipes for ${date}:`, validRecipes.length);
          
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
          
          console.log(`Recipes for ${date}:`, {
            breakfast: breakfastRecipes.length,
            lunch: lunchRecipes.length,
            dinner: dinnerRecipes.length,
          });
          
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
      console.log("Merged meal data:", Object.keys(mergedData));
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
    console.log("=== GET MEAL PLAN ID ===");
    console.log("Selected date:", selectedDate);
    console.log("Current mealPlanIds state:", mealPlanIds);
    
    // First check if we have it in state
    if (mealPlanIds[selectedDate]) {
      console.log("Found meal plan ID in state:", mealPlanIds[selectedDate]);
      return mealPlanIds[selectedDate];
    }
    
    console.log("Meal plan ID not in state, fetching from API...");
    
    // Try to fetch from API
    try {
      const plansRes = await getMealPlansApi({ 
        start: selectedDate, 
        end: selectedDate 
      });
      console.log("Fetched plans from API:", plansRes.data);
      const plans = plansRes.data || [];
      const existingPlan = plans.find((p: any) => {
        const planDate = typeof p.date === 'string' 
          ? p.date.split('T')[0] 
          : new Date(p.date).toISOString().split('T')[0];
        console.log(`Comparing plan date ${planDate} with selected date ${selectedDate}`);
        return planDate === selectedDate;
      });
      
      if (existingPlan) {
        console.log("Found existing plan:", existingPlan);
        const newMealPlanIds = { ...mealPlanIds, [selectedDate]: existingPlan.id };
        setMealPlanIds(newMealPlanIds);
        return existingPlan.id;
      }
      
      console.log("No existing plan found for date");
    } catch (error) {
      console.error("Error fetching meal plan:", error);
    }
    
    // Create new meal plan if doesn't exist
    console.log("Creating new meal plan...");
    try {
      const res = await upsertMealPlanApi({
        date: selectedDate,
        slots: { breakfast: [], lunch: [], dinner: [] },
      });
      const newId = res.data.id;
      console.log("Created new meal plan with ID:", newId);
      const newMealPlanIds = { ...mealPlanIds, [selectedDate]: newId };
      setMealPlanIds(newMealPlanIds);
      return newId;
    } catch (error) {
      console.error("Error creating meal plan:", error);
      throw error;
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
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể thêm món ăn");
    }
  };
  
  // Remove recipe from slot
  const handleRemoveRecipe = async (recipeId: string, slot: "breakfast" | "lunch" | "dinner") => {
    try {
      console.log("=== REMOVE RECIPE FUNCTION CALLED ===");
      console.log("Recipe ID:", recipeId, "Type:", typeof recipeId);
      console.log("Slot:", slot);
      console.log("Selected date:", selectedDate);
      console.log("Current mealPlanIds:", mealPlanIds);
      
      // Get meal plan ID first
      const mealPlanId = mealPlanIds[selectedDate] || await getMealPlanId();
      console.log("Meal plan ID:", mealPlanId);
      
      if (!mealPlanId) {
        Alert.alert("Lỗi", "Không tìm thấy meal plan ID");
        return;
      }
      
      // Show confirmation and execute removal
      Alert.alert(
        "Xóa món",
        "Bạn có chắc muốn xóa món này?",
        [
          { 
            text: "Hủy", 
            style: "cancel",
            onPress: () => {
              console.log("Remove cancelled by user");
            }
          },
          {
            text: "Xóa",
            style: "destructive",
            onPress: () => {
              console.log("User confirmed remove - starting removal process");
              executeRemove(mealPlanId, recipeId, slot);
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error: any) {
      console.error("=== ERROR IN REMOVE HANDLER ===");
      console.error("Error:", error);
      Alert.alert("Lỗi", error?.message || "Không thể xóa món ăn");
    }
  };
  
  // Execute the actual removal
  const executeRemove = async (mealPlanId: string, recipeId: string, slot: "breakfast" | "lunch" | "dinner") => {
    try {
      console.log("=== EXECUTING REMOVE ===");
      console.log(`Calling API: PATCH /mealplans/${mealPlanId}/slot with remove=${recipeId}`);
      
      const res = await patchMealPlanSlotApi(mealPlanId, {
        slot,
        remove: recipeId,
      });
      
      console.log("Remove API response:", res);
      console.log("Remove result data:", res.data);
      
      // Refresh meal data
      const date = new Date(selectedDate);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      await fetchMealPlans(
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );
      
      console.log("Remove completed successfully");
      Alert.alert("Thành công", "Đã xóa món ăn khỏi lịch");
    } catch (error: any) {
      console.error("=== ERROR EXECUTING REMOVE ===");
      console.error("Error object:", error);
      console.error("Error response:", error?.response);
      console.error("Error response data:", error?.response?.data);
      console.error("Error message:", error?.message);
      Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Không thể xóa món ăn");
    }
  };
  
  // Replace recipe in slot
  const handleReplaceRecipe = async (oldRecipeId: string, newRecipeId: string, slot: "breakfast" | "lunch" | "dinner") => {
    try {
      console.log("=== REPLACE RECIPE ===");
      console.log("Old recipe ID:", oldRecipeId, "Type:", typeof oldRecipeId);
      console.log("New recipe ID:", newRecipeId, "Type:", typeof newRecipeId);
      console.log("Slot:", slot);
      console.log("Selected date:", selectedDate);
      console.log("Current meals for slot:", meals[slot]);
      
      // Get meal plan ID first
      const mealPlanId = mealPlanIds[selectedDate] || await getMealPlanId();
      console.log("Meal plan ID:", mealPlanId);
      
      if (!mealPlanId) {
        Alert.alert("Lỗi", "Không tìm thấy meal plan ID");
        return;
      }
      
      const currentMeals = meals[slot].map((m: any) => m.id);
      console.log("Current meal IDs:", currentMeals);
      
      const newMeals = currentMeals.map((id: string) => id === oldRecipeId ? newRecipeId : id);
      console.log("New meal IDs:", newMeals);
      
      console.log(`Calling API: PATCH /mealplans/${mealPlanId}/slot with set=${JSON.stringify(newMeals)}`);
      
      const res = await patchMealPlanSlotApi(mealPlanId, {
        slot,
        set: newMeals,
      });
      
      console.log("Replace API response:", res);
      console.log("Replace result data:", res.data);
      
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
      
      Alert.alert("Thành công", "Đã thay đổi món ăn");
    } catch (error: any) {
      console.error("=== ERROR REPLACING RECIPE ===");
      console.error("Error object:", error);
      console.error("Error response:", error?.response);
      console.error("Error response data:", error?.response?.data);
      console.error("Error message:", error?.message);
      Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Không thể thay đổi món ăn");
    }
  };
  
  // Search recipes with debounce
  const searchRecipes = async (query: string) => {
    if (!query.trim()) {
      setRecipeSearchResults([]);
      return;
    }
    
    setRecipeSearchLoading(true);
    try {
      const res = await searchRecipesApi({ q: query, limit: 20 });
      setRecipeSearchResults(res.data.data || []);
    } catch (error) {
      console.error("Error searching recipes:", error);
    } finally {
      setRecipeSearchLoading(false);
    }
  };
  
  // Debounce search - only search when user types
  useEffect(() => {
    if (!showRecipeModal) return;
    
    // If query is empty, load default recipes
    if (!recipeSearchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        loadDefaultRecipes();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    
    // Debounce search when user types
    const timeoutId = setTimeout(() => {
      searchRecipes(recipeSearchQuery);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [recipeSearchQuery, showRecipeModal]);
  
  // Open recipe selection modal
  const openRecipeModal = (slot: "breakfast" | "lunch" | "dinner", replaceId?: string) => {
    setSelectedSlot(slot);
    setShowRecipeModal(true);
    setRecipeSearchQuery("");
    setRecipeSearchResults([]);
    setReplaceRecipeId(replaceId || null);
    
    // Load default recipes when modal opens
    loadDefaultRecipes();
  };
  
  // Load default recipes (without query)
  const loadDefaultRecipes = async () => {
    setRecipeSearchLoading(true);
    try {
      const res = await searchRecipesApi({ limit: 20 });
      setRecipeSearchResults(res.data.data || []);
    } catch (error) {
      console.error("Error loading default recipes:", error);
    } finally {
      setRecipeSearchLoading(false);
    }
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
      
      Alert.alert("Thành công", `Đã gợi ý và thêm món ăn vào lịch ngày ${selectedDate}!`);
    } catch (error: any) {
      console.error("Error suggesting meals:", error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể gợi ý món ăn. Vui lòng thử lại!");
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

  const meals = mealData[selectedDate] || { breakfast: [], lunch: [], dinner: [] };
  console.log(`Rendering meals for ${selectedDate}:`, {
    hasData: !!mealData[selectedDate],
    breakfast: meals.breakfast.length,
    lunch: meals.lunch.length,
    dinner: meals.dinner.length,
    availableDates: Object.keys(mealData),
  });

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
                        onPress={() => navigation.navigate("Details", { item: dish })}
                      >
                        <Image source={{ uri: dish.image }} style={s.dishImage} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.dishTitle}>{dish.title}</Text>
                          <Text style={s.dishTime}>{dish.time}</Text>
                        </View>
                      </TouchableOpacity>
                      <View style={s.dishActions}>
                        <TouchableOpacity
                          style={s.actionButton}
                          onPress={() => {
                            console.log("Replace button pressed for dish:", dish);
                            console.log("Dish ID:", dish.id, "Type:", typeof dish.id);
                            console.log("Meal type:", mealType);
                            console.log("Opening recipe modal for replace...");
                            openRecipeModal(mealType, dish.id);
                          }}
                        >
                          <Ionicons name="swap-horizontal" size={20} color="#4dabf7" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.actionButton}
                          onPress={async () => {
                            try {
                              console.log("Remove button pressed for dish:", dish);
                              console.log("Dish ID:", dish.id, "Type:", typeof dish.id);
                              console.log("Meal type:", mealType);
                              
                              // Get meal plan ID
                              let mealPlanId: string;
                              try {
                                mealPlanId = mealPlanIds[selectedDate] || await getMealPlanId();
                                console.log("Meal plan ID for remove:", mealPlanId);
                              } catch (error) {
                                console.error("Error getting meal plan ID:", error);
                                Alert.alert("Lỗi", "Không thể lấy meal plan ID");
                                return;
                              }
                              
                              if (!mealPlanId) {
                                Alert.alert("Lỗi", "Không tìm thấy meal plan ID");
                                return;
                              }
                              
                              // Remove directly without confirmation
                              console.log("Removing directly without confirmation");
                              await executeRemove(mealPlanId, dish.id, mealType);
                            } catch (error) {
                              console.error("Error in remove button handler:", error);
                              Alert.alert("Lỗi", "Đã xảy ra lỗi khi xóa món");
                            }
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
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
      </ScrollView>

      <View style={{ marginBottom: 50 }}><TabBar /></View>
      
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
            />
            </>
          )}
        </SafeAreaView>
      </Modal>
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
  dishActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
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
