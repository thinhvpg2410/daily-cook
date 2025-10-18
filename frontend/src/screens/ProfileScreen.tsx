// src/screens/ProfileScreen.tsx
import React, {useState} from "react";
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import TabBar from "./TabBar";
import {useAuth} from "../context/AuthContext";


export default function ProfileScreen({navigation}: any) {
    const fallback = {name: "Dianne Russell", email: "dianne@example.com", phone: "+84 123 456 789"};
    const {user, logout} = useAuth()
    const profile = user ?? fallback

    // Mock meals
    const [meals] = useState({
        breakfast: ["Pancakes", "Coffee"],
        lunch: ["Chicken Salad"],
        dinner: ["Grilled Salmon", "Steamed Veggies"]
    });
    const onLogOut = async () => {
        try {
            await logout();
            navigation.reset({index: 0, routes: [{name: "SignInEmail"}]});
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
                    <Ionicons name="person-circle-outline" size={80} color="#f77" style={{alignSelf: "center"}}/>
                    <Text style={s.name}>{profile.name}</Text>
                    <Text style={s.text}>{profile.email}</Text>
                    <Text style={s.text}>{profile.phone}</Text>
                    <TouchableOpacity style={s.editBtn}><Ionicons name="create-outline" size={18} color="#fff"/><Text
                        style={s.editBtnText}>Edit Profile</Text></TouchableOpacity>
                </View>

                {/* Account Actions */}
                <TouchableOpacity style={s.item}><Ionicons name="lock-closed-outline" size={20} color="#f77"/><Text
                    style={s.itemText}>Change Password</Text></TouchableOpacity>
                <TouchableOpacity style={s.item} onPress={onLogOut}>
                    <Ionicons name="log-out-outline" size={20} color="#f77" />
                    <Text style={[s.itemText, { color: "red" }]}>Log out</Text>
                </TouchableOpacity>

                {/* Today's Meals */}
                <Text style={[s.title, {marginTop: 24}]}>Today's Meals</Text>
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
                <Text style={[s.title, {marginTop: 24}]}>DailyCook Features</Text>
                <TouchableOpacity style={s.item}><Ionicons name="list-outline" size={20} color="#f77"/><Text
                    style={s.itemText}>Shopping List</Text></TouchableOpacity>
                <TouchableOpacity style={s.item}><Ionicons name="heart-outline" size={20} color="#f77"/><Text
                    style={s.itemText}>Favorite Recipes</Text></TouchableOpacity>
                <TouchableOpacity style={s.item}><Ionicons name="restaurant-outline" size={20} color="#f77"/><Text
                    style={s.itemText}>Meal Planning Guide</Text></TouchableOpacity>
                <TouchableOpacity style={s.item}><Ionicons name="analytics-outline" size={20} color="#f77"/><Text
                    style={s.itemText}>Nutrition Tracker</Text></TouchableOpacity>

            </ScrollView>
            <View style={{marginBottom: 50}}><TabBar/></View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: {flex: 1, backgroundColor: "#fff"},
    container: {flex: 1, padding: 16},
    title: {fontSize: 22, fontWeight: "bold", color: "#f77", marginBottom: 16},
    card: {backgroundColor: "#ffeef0", padding: 16, borderRadius: 12, marginBottom: 24, alignItems: "center"},
    name: {fontSize: 18, fontWeight: "600", marginTop: 8},
    text: {fontSize: 14, color: "#555", marginTop: 2},
    editBtn: {
        flexDirection: "row",
        backgroundColor: "#f77",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        alignItems: "center"
    },
    editBtnText: {color: "#fff", fontWeight: "600", marginLeft: 6},
    item: {flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#eee"},
    itemText: {fontSize: 16, marginLeft: 12, color: "#333"},
    mealCard: {backgroundColor: "#fff0f3", padding: 12, borderRadius: 12, marginVertical: 6},
    mealTitle: {fontSize: 14, fontWeight: "600", color: "#f77"},
    mealText: {fontSize: 13, color: "#555", marginLeft: 6, marginVertical: 2},
    noMeal: {fontSize: 13, color: "#777", fontStyle: "italic", marginLeft: 6, marginVertical: 2}
});
