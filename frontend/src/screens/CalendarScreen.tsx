// src/screens/CalendarScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Calendar } from "react-native-calendars";
import TabBar from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { getMealPlansApi, getTodaySuggestApi } from "../api/mealplan";
import { http } from "../api/http";

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `http://localhost:3000${src}`;
  return src;
}

export default function CalendarScreen({ navigation }: any) {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [mealData, setMealData] = useState<Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }>>({});

  const fetchMealPlans = async (startDate: string, endDate: string) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const startOfWeek = new Date(startDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6); // Sunday

      const res = await getMealPlansApi({
        start: startOfWeek.toISOString().split("T")[0],
        end: endOfWeek.toISOString().split("T")[0],
      });

      const plans = res.data || [];
      const data: Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }> = {};

      for (const plan of plans) {
        const date = plan.date;
        const slots = plan.slots || {};
        
        const breakfastIds = slots.breakfast || [];
        const lunchIds = slots.lunch || [];
        const dinnerIds = slots.dinner || [];

        // Fetch recipe details
        const allIds = [...breakfastIds, ...lunchIds, ...dinnerIds];
        if (allIds.length > 0) {
          const recipes = await Promise.all(
            allIds.map(async (id: string) => {
              try {
                const recipeRes = await http.get(`/recipes/${id}`);
                return recipeRes.data;
              } catch {
                return null;
              }
            })
          );

          const validRecipes = recipes.filter(Boolean);
          data[date] = {
            breakfast: validRecipes
              .filter((r: any) => breakfastIds.includes(r.id))
              .map((r: any) => ({
                id: r.id,
                title: r.title,
                image: normalizeImage(r.image),
                time: `${r.cookTime ?? 30}min`,
                likes: r.likes ?? 0,
              })),
            lunch: validRecipes
              .filter((r: any) => lunchIds.includes(r.id))
              .map((r: any) => ({
                id: r.id,
                title: r.title,
                image: normalizeImage(r.image),
                time: `${r.cookTime ?? 30}min`,
                likes: r.likes ?? 0,
              })),
            dinner: validRecipes
              .filter((r: any) => dinnerIds.includes(r.id))
              .map((r: any) => ({
                id: r.id,
                title: r.title,
                image: normalizeImage(r.image),
                time: `${r.cookTime ?? 30}min`,
                likes: r.likes ?? 0,
              })),
          };
        } else {
          data[date] = { breakfast: [], lunch: [], dinner: [] };
        }
      }

      setMealData(data);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
    } finally {
      setLoading(false);
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
        <Text style={s.title}>Lịch Thực Đơn</Text>

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
                <Text style={s.mealTitle}>
                  {mealType === "breakfast" ? "Bữa Sáng" : mealType === "lunch" ? "Bữa Trưa" : "Bữa Tối"}
                </Text>
                {meals[mealType].length === 0 ? (
                  <Text style={s.noMeal}>Chưa có món ăn nào được lên kế hoạch</Text>
                ) : (
                  meals[mealType].map((dish, idx) => (
                    <TouchableOpacity
                      key={dish.id || idx}
                      style={s.dishCard}
                      onPress={() => navigation.navigate("Details", { item: dish })}
                    >
                      <Image source={{ uri: dish.image }} style={s.dishImage} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.dishTitle}>{dish.title}</Text>
                        <Text style={s.dishTime}>{dish.time}</Text>
                      </View>
                    </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#fff"}, container:{flex:1,padding:16}, title:{fontSize:22,fontWeight:"bold",color:"#f77",marginBottom:16},
  mealTitle:{fontSize:16,fontWeight:"600",color:"#f77",marginBottom:6},
  noMeal:{fontSize:14,color:"#777",fontStyle:"italic",marginLeft:6,marginVertical:2},
  dishCard:{flexDirection:"row",alignItems:"center",backgroundColor:"#fff0f3",padding:8,borderRadius:12,marginVertical:4},
  dishImage:{width:60,height:60,borderRadius:8},
  dishTitle:{fontSize:14,fontWeight:"600",color:"#333"},
  dishTime:{fontSize:12,color:"#555",marginTop:2},
});
