// src/screens/CalendarScreen.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from "react-native";
import { Calendar } from "react-native-calendars";
import TabBar from "./TabBar";

export default function CalendarScreen({ navigation }: any) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Dữ liệu đồng bộ với Home/Category/Details
  const mealData: Record<string, { breakfast: any[]; lunch: any[]; dinner: any[] }> = {
    "2025-10-03": {
      breakfast: [
        { title: "Pancake & Cream", image: "https://heavenlyhomecooking.com/wp-content/uploads/2022/06/Sweet-Cream-Pancakes-Recipe-Featured-500x500.jpg", time: "20min", likes: 2273 },
        { title: "Omelette", image: "https://ichef.bbci.co.uk/food/ic/food_16x9_1600/recipes/cheeseomelette_80621_16x9.jpg", time: "10min", likes: 421 }
      ],
      lunch: [
        { title: "Grilled Chicken", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBY_OVOu1ROZ9DPPdXQdcWDha6nGNTF21BEA&s", time: "35min", likes: 654 }
      ],
      dinner: [
        { title: "Beef Steak", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFrW4AbObw9q8EZFHMCp830r40YXfVt27fjQ&s", time: "40min", likes: 320 }
      ]
    },
    "2025-10-04": {
      breakfast: [
        { title: "Tiramisu", image: "https://daotaobeptruong.vn/wp-content/uploads/2020/11/banh-tiramisu.jpg", time: "15min", likes: 5 }
      ],
      lunch: [],
      dinner: [
        { title: "Lemonade", image: "https://herbsandflour.com/wp-content/uploads/2020/05/Homemade-Lemonade-Recipe.jpg", time: "30min", likes: 4 },
        { title: "Taco", image: "https://mojo.generalmills.com/api/public/content/GmHhoT5mr0Sue2oMxdyEig_webp_base.webp?v=c67813e4&t=191ddcab8d1c415fa10fa00a14351227", time: "25min", likes: 3 }
      ]
    }
  };

  const meals = mealData[selectedDate] || { breakfast: [], lunch: [], dinner: [] };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
        <Text style={s.title}>Meal Planner</Text>

        {/* Calendar */}
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{ [selectedDate]: { selected: true, selectedColor: "#f77" } }}
          style={{ borderRadius: 12, marginBottom: 16 }}
        />

        {/* Meals */}
        {(["breakfast", "lunch", "dinner"] as const).map((mealType) => (
          <View key={mealType} style={{ marginBottom: 16 }}>
            <Text style={s.mealTitle}>{mealType.toUpperCase()}</Text>
            {meals[mealType].length === 0 ? (
              <Text style={s.noMeal}>No meal planned</Text>
            ) : (
              meals[mealType].map((dish, idx) => (
                <TouchableOpacity
                  key={idx}
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
