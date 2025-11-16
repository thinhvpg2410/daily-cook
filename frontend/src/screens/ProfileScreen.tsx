import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { getMealPlansApi } from "../api/mealplan";


export default function ProfileScreen({ navigation }: any) {
    const fallback = { name: "Dianne Russell", email: "dianne@example.com", phone: "+84 123 456 789" };
    const { user, logout, token } = useAuth()
    const profile = user ?? fallback

    const [calendarLoading, setCalendarLoading] = useState(false);
    const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Mock meals
    const [meals] = useState({
        breakfast: ["Pancakes", "Coffee"],
        lunch: ["Chicken Salad"],
        dinner: ["Grilled Salmon", "Steamed Veggies"]
    });

    // Load meal plans for calendar
    useEffect(() => {
        if (token) {
            loadMealPlans();
        }
    }, [token]);

    const loadMealPlans = async () => {
        if (!token) return;
        
        setCalendarLoading(true);
        try {
            // Get current month's meal plans
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const startStr = startOfMonth.toISOString().split('T')[0];
            const endStr = endOfMonth.toISOString().split('T')[0];
            
            const res = await getMealPlansApi({ start: startStr, end: endStr });
            const plans = res.data || [];
            
            // Mark dates that have meal plans
            const marked: Record<string, any> = {};
            plans.forEach((plan: any) => {
                const slots = plan.slots || {};
                const hasMeals = 
                    (slots.breakfast && slots.breakfast.length > 0) ||
                    (slots.lunch && slots.lunch.length > 0) ||
                    (slots.dinner && slots.dinner.length > 0);
                
                if (hasMeals) {
                    marked[plan.date] = { 
                        marked: true, 
                        dotColor: "#f77",
                        selected: plan.date === selectedDate
                    };
                }
            });
            
            // Mark today
            const todayStr = new Date().toISOString().split('T')[0];
            if (marked[todayStr]) {
                marked[todayStr].selected = true;
                marked[todayStr].selectedColor = "#f77";
            } else {
                marked[todayStr] = { 
                    selected: true, 
                    selectedColor: "#f77",
                    marked: false
                };
            }
            
            setMarkedDates(marked);
        } catch (error) {
            console.error("Error loading meal plans:", error);
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleDatePress = (day: any) => {
        setSelectedDate(day.dateString);
        // Navigate to calendar screen with selected date
        navigation.navigate("Calendar", { selectedDate: day.dateString });
    };
    const onLogOut = async () => {
        try {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "SignInEmail" }] });
        } catch (e: any) {
            Alert.alert("Logout failed", e.message ?? "Unknown error");
        }
    }
    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
                {/* Header */}
                <Text style={s.title}>Profile</Text>

                {/* User Info */}
                <View style={s.card}>
                    <Ionicons name="person-circle-outline" size={80} color="#f77" style={{ alignSelf: "center" }} />
                    <Text style={s.name}>{profile.name}</Text>
                    <Text style={s.text}>{profile.email}</Text>
                    <Text style={s.text}>{profile.phone}</Text>
                    <TouchableOpacity
                        style={s.editBtn}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("EditProfile")}
                    >
                        <Ionicons name="create-outline" size={18} color="#fff" />
                        <Text style={s.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>

                </View>

                {/* Calendar */}
                {token && (
                    <View style={s.calendarSection}>
                        <Text style={s.sectionTitle}>Lịch thực đơn</Text>
                        {calendarLoading ? (
                            <View style={s.calendarLoading}>
                                <ActivityIndicator size="small" color="#f77" />
                            </View>
                        ) : (
                            <Calendar
                                onDayPress={handleDatePress}
                                markedDates={markedDates}
                                style={s.calendar}
                                theme={{
                                    selectedDayBackgroundColor: "#f77",
                                    selectedDayTextColor: "#fff",
                                    todayTextColor: "#f77",
                                    arrowColor: "#f77",
                                    monthTextColor: "#333",
                                    textDayFontWeight: "500",
                                    textMonthFontWeight: "600",
                                    textDayHeaderFontWeight: "600",
                                }}
                                enableSwipeMonths={true}
                                hideExtraDays={true}
                            />
                        )}
                        <TouchableOpacity 
                            style={s.viewFullCalendarBtn}
                            onPress={() => navigation.navigate("Calendar")}
                        >
                            <Text style={s.viewFullCalendarText}>Xem lịch đầy đủ</Text>
                            <Ionicons name="chevron-forward" size={18} color="#f77" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Account Actions */}
                <TouchableOpacity style={s.item} onPress={() => navigation.navigate("ChangePassword")}>
                    <Ionicons name="lock-closed-outline" size={20} color="#f77" />
                    <Text style={s.itemText}>Change Password</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.item} onPress={onLogOut}>
                    <Ionicons name="log-out-outline" size={20} color="#f77" />
                    <Text style={[s.itemText, { color: "red" }]}>Log out</Text>
                </TouchableOpacity>

                {/* Today's Meals */}
                <Text style={[s.title, { marginTop: 24 }]}>Today's Meals</Text>
                {["breakfast", "lunch", "dinner"].map((meal) => (
                    <TouchableOpacity key={meal} style={s.mealCard} onPress={() => navigation.navigate("Calendar")}>
                        <Text style={s.mealTitle}>{meal.toUpperCase()}</Text>
                        {meals[meal as keyof typeof meals].length === 0 ? (
                            <Text style={s.noMeal}>No meal planned</Text>
                        ) : (
                            meals[meal as keyof typeof meals].map((dish, idx) => <Text key={idx}
                                style={s.mealText}>• {dish}</Text>)
                        )}
                    </TouchableOpacity>
                ))}

                {/* DailyCook Features */}
                <Text style={[s.title, { marginTop: 24 }]}>DailyCook Features</Text>
                <TouchableOpacity style={s.item} onPress={() => navigation.navigate("ShoppingList")}>
                    <Ionicons name="list-outline" size={20} color="#f77" />
                    <Text style={s.itemText}>Shopping List</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={s.item}
                    onPress={() => navigation.navigate("FavoriteRecipes")}
                >
                    <Ionicons name="heart-outline" size={20} color="#f77" />
                    <Text style={s.itemText}>Favorite Recipes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.item}><Ionicons name="restaurant-outline" size={20} color="#f77" /><Text
                    style={s.itemText}>Meal Planning Guide</Text></TouchableOpacity>
                <TouchableOpacity
                    style={s.item}
                    onPress={() => navigation.navigate("NutritionTracker")}
                >
                    <Ionicons name="analytics-outline" size={20} color="#f77" />
                    <Text style={s.itemText}>Nutrition Tracker</Text>
                </TouchableOpacity>

            </ScrollView>
            <View style={{ marginBottom: 50 }}><TabBar /></View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1, padding: 16 },
    title: { fontSize: 22, fontWeight: "bold", color: "#f77", marginBottom: 16 },
    card: { backgroundColor: "#ffeef0", padding: 16, borderRadius: 12, marginBottom: 24, alignItems: "center" },
    name: { fontSize: 18, fontWeight: "600", marginTop: 8 },
    text: { fontSize: 14, color: "#555", marginTop: 2 },
    editBtn: {
        flexDirection: "row",
        backgroundColor: "#f77",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        alignItems: "center"
    },
    editBtnText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
    item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#eee" },
    itemText: { fontSize: 16, marginLeft: 12, color: "#333" },
    mealCard: { backgroundColor: "#fff0f3", padding: 12, borderRadius: 12, marginVertical: 6 },
    mealTitle: { fontSize: 14, fontWeight: "600", color: "#f77" },
    mealText: { fontSize: 13, color: "#555", marginLeft: 6, marginVertical: 2 },
    noMeal: { fontSize: 13, color: "#777", fontStyle: "italic", marginLeft: 6, marginVertical: 2 },
    calendarSection: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#f77",
        marginBottom: 12,
    },
    calendar: {
        borderRadius: 12,
        marginBottom: 12,
    },
    calendarLoading: {
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
    },
    viewFullCalendarBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        marginTop: 8,
    },
    viewFullCalendarText: {
        color: "#f77",
        fontWeight: "600",
        fontSize: 14,
        marginRight: 4,
    },
});
