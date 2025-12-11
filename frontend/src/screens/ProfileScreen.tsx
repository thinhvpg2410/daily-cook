import React, {useState, useEffect} from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
    RefreshControl,
} from "react-native";
import {Calendar} from "react-native-calendars";
import {Ionicons} from "@expo/vector-icons";
import TabBar from "./TabBar";
import {useAuth} from "../context/AuthContext";
import {getMealPlansApi, getTodaySuggestApi} from "../api/mealplan";
import {getPreferencesApi} from "../api/users";
import {http} from "../api/http";
import { API_BASE_URL } from "../config/env";

const PLACEHOLDER_AVATAR =
    "https://ui-avatars.com/api/?name=User&background=f77&color=fff&size=200";

function normalizeImage(src?: string | null) {
    if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_AVATAR;
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
    return src;
}

export default function ProfileScreen({navigation}: any) {
    const {user, logout, token} = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [todayMeals, setTodayMeals] = useState<any>(null);
    const [userStats, setUserStats] = useState({
        totalRecipes: 0,
        totalMealPlans: 0,
        totalFavorites: 0,
    });
    const [userPreferences, setUserPreferences] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            loadAllData();
        } else {
            setLoading(false);
        }
    }, [token]);

    // Reload preferences when screen is focused (e.g., after updating in NutritionGoalsScreen)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (token) {
                loadUserPreferences();
                loadUserStats(); // Also reload stats in case they changed
            }
        });

        return unsubscribe;
    }, [navigation, token]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadMealPlans(),
                loadTodayMeals(),
                loadUserStats(),
                loadUserPreferences(),
            ]);
        } catch (error) {
            console.error("Error loading profile data:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);
    };

    const loadMealPlans = async () => {
        if (!token) return;

        setCalendarLoading(true);
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            const startStr = startOfMonth.toISOString().split("T")[0];
            const endStr = endOfMonth.toISOString().split("T")[0];

            const res = await getMealPlansApi({start: startStr, end: endStr});
            const plans = res.data || [];

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
                        selected: plan.date === selectedDate,
                    };
                }
            });

            const todayStr = new Date().toISOString().split("T")[0];
            if (marked[todayStr]) {
                marked[todayStr].selected = true;
                marked[todayStr].selectedColor = "#f77";
            } else {
                marked[todayStr] = {
                    selected: true,
                    selectedColor: "#f77",
                    marked: false,
                };
            }

            setMarkedDates(marked);
            setUserStats((prev) => ({...prev, totalMealPlans: plans.length}));
        } catch (error) {
            console.error("Error loading meal plans:", error);
        } finally {
            setCalendarLoading(false);
        }
    };

    const loadTodayMeals = async () => {
        if (!token) return;
        try {
            const res = await getTodaySuggestApi();
            if (res.data) {
                setTodayMeals(res.data);
            }
        } catch (error) {
            console.error("Error loading today's meals:", error);
        }
    };

    const loadUserStats = async () => {
        if (!token) return;
        try {
            // Load user recipes
            const recipesRes = await http.get("/users/me/recipes", {
                headers: {Authorization: `Bearer ${token}`},
            });
            const recipes = recipesRes.data || [];

            // Load favorite recipes
            const favoritesRes = await http.get("/recipes/me/favorites", {
                headers: {Authorization: `Bearer ${token}`},
            });
            const favorites = favoritesRes.data || [];

            setUserStats({
                totalRecipes: recipes.length,
                totalFavorites: favorites.length,
                totalMealPlans: userStats.totalMealPlans, // Will be updated by loadMealPlans
            });
        } catch (error) {
            console.error("Error loading user stats:", error);
        }
    };

    const loadUserPreferences = async () => {
        if (!token) return;
        try {
            const res = await getPreferencesApi();
            setUserPreferences(res.data);
        } catch (error) {
            console.error("Error loading preferences:", error);
        }
    };

    const handleDatePress = (day: any) => {
        setSelectedDate(day.dateString);
        navigation.navigate("Calendar", {selectedDate: day.dateString});
    };

    const onLogOut = async () => {
        try {
            await logout();
            navigation.reset({index: 0, routes: [{name: "SignInEmail"}]});
        } catch (e: any) {
            Alert.alert("Logout failed", e.message ?? "Unknown error");
        }
    };

    if (loading) {
        return (
            <SafeAreaView
                style={[s.safe, {alignItems: "center", justifyContent: "center"}]}
            >
                <ActivityIndicator size="large" color="#f77"/>
            </SafeAreaView>
        );
    }

    const getMealCount = (slot: string) => {
        if (!todayMeals) return 0;
        return todayMeals[slot]?.length || 0;
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={s.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                }
            >
                {/* Header */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>Hồ sơ</Text>
                </View>

                {/* Profile Card */}
                <View style={s.profileCard}>
                    <View style={s.avatarContainer}>
                        <Image
                            source={{uri: normalizeImage(user?.avatarUrl)}}
                            style={s.avatar}
                        />
                        <TouchableOpacity
                            style={s.editAvatarBtn}
                            onPress={() => navigation.navigate("EditProfile")}
                        >
                            <Ionicons name="camera" size={16} color="#fff"/>
                        </TouchableOpacity>
                    </View>
                    <Text style={s.name}>{user?.name || "Người dùng"}</Text>
                    <Text style={s.email}>{user?.email}</Text>
                    {user?.phone && <Text style={s.phone}>{user.phone}</Text>}

                    <TouchableOpacity
                        style={s.editBtn}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate("EditProfile")}
                    >
                        <Ionicons name="create-outline" size={18} color="#fff"/>
                        <Text style={s.editBtnText}>Chỉnh sửa hồ sơ</Text>
                    </TouchableOpacity>
                </View>

                {/* Calendar */}
                {token && (
                    <View style={s.calendarSection}>
                        <Text style={s.sectionTitle}>Lịch thực đơn</Text>
                        {calendarLoading ? (
                            <View style={s.calendarLoading}>
                                <ActivityIndicator size="small" color="#f77"/>
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
                            <Ionicons name="chevron-forward" size={18} color="#f77"/>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Stats Cards */}
                {token && (
                    <View style={s.statsContainer}>
                        <TouchableOpacity
                            style={s.statCard}
                            onPress={() => navigation.navigate("FavoriteRecipes")}
                        >
                            <View style={[s.statIcon, {backgroundColor: "#ffeef0"}]}>
                                <Ionicons name="heart" size={24} color="#f77"/>
                            </View>
                            <Text style={s.statValue}>{userStats.totalFavorites}</Text>
                            <Text style={s.statLabel}>Yêu thích</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.statCard}
                            onPress={() => navigation.navigate("Calendar")}
                        >
                            <View style={[s.statIcon, {backgroundColor: "#e8f5e9"}]}>
                                <Ionicons name="calendar" size={24} color="#4caf50"/>
                            </View>
                            <Text style={s.statValue}>{userStats.totalMealPlans}</Text>
                            <Text style={s.statLabel}>Kế hoạch</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.statCard}
                            onPress={() => navigation.navigate("Category", {category: "All"})}
                        >
                            <View style={[s.statIcon, {backgroundColor: "#e3f2fd"}]}>
                                <Ionicons name="restaurant" size={24} color="#2196f3"/>
                            </View>
                            <Text style={s.statValue}>{userStats.totalRecipes}</Text>
                            <Text style={s.statLabel}>Món ăn</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* User Preferences Summary */}
                {token && userPreferences && (
                    <View style={s.preferencesCard}>
                        <View style={s.preferencesHeader}>
                            <Ionicons name="settings-outline" size={20} color="#f77"/>
                            <Text style={s.preferencesTitle}>Mục tiêu dinh dưỡng</Text>
                        </View>
                        <View style={s.preferencesContent}>
                            <View style={s.preferenceItem}>
                                <Text style={s.preferenceLabel}>Mục tiêu calo/ngày</Text>
                                <Text style={s.preferenceValue}>
                                    {userPreferences.dailyKcalTarget || 2000} kcal
                                </Text>
                            </View>
                            <View style={s.preferenceItem}>
                                <Text style={s.preferenceLabel}>Chế độ ăn</Text>
                                <Text style={s.preferenceValue}>
                                    {userPreferences.dietType === "vegan"
                                        ? "Chay"
                                        : userPreferences.dietType === "low_carb"
                                            ? "Ít carb"
                                            : "Bình thường"}
                                </Text>
                            </View>
                            {userPreferences.goal && (
                                <View style={s.preferenceItem}>
                                    <Text style={s.preferenceLabel}>Mục tiêu</Text>
                                    <Text style={s.preferenceValue}>
                                        {userPreferences.goal === "lose_weight"
                                            ? "Giảm cân"
                                            : userPreferences.goal === "gain_muscle"
                                                ? "Tăng cơ"
                                                : "Duy trì"}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={s.preferencesButton}
                            onPress={() => navigation.navigate("NutritionGoals")}
                        >
                            <Text style={s.preferencesButtonText}>Cập nhật mục tiêu</Text>
                            <Ionicons name="chevron-forward" size={18} color="#f77"/>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Today's Meals */}
                {token && todayMeals && (
                    <View style={s.todayMealsCard}>
                        <View style={s.todayMealsHeader}>
                            <Ionicons name="restaurant-outline" size={20} color="#f77"/>
                            <Text style={s.todayMealsTitle}>Bữa ăn hôm nay</Text>
                        </View>
                        <View style={s.mealsGrid}>
                            <TouchableOpacity
                                style={s.mealSlotCard}
                                onPress={() => navigation.navigate("Calendar")}
                            >
                                <View style={[s.mealSlotIcon, {backgroundColor: "#fff5f7"}]}>
                                    <Ionicons name="sunny-outline" size={24} color="#f77"/>
                                </View>
                                <Text style={s.mealSlotCount}>
                                    {getMealCount("breakfast")}
                                </Text>
                                <Text style={s.mealSlotLabel}>Bữa sáng</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={s.mealSlotCard}
                                onPress={() => navigation.navigate("Calendar")}
                            >
                                <View style={[s.mealSlotIcon, {backgroundColor: "#e8f5e9"}]}>
                                    <Ionicons name="partly-sunny-outline" size={24} color="#4caf50"/>
                                </View>
                                <Text style={s.mealSlotCount}>{getMealCount("lunch")}</Text>
                                <Text style={s.mealSlotLabel}>Bữa trưa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={s.mealSlotCard}
                                onPress={() => navigation.navigate("Calendar")}
                            >
                                <View style={[s.mealSlotIcon, {backgroundColor: "#e3f2fd"}]}>
                                    <Ionicons name="moon-outline" size={24} color="#2196f3"/>
                                </View>
                                <Text style={s.mealSlotCount}>{getMealCount("dinner")}</Text>
                                <Text style={s.mealSlotLabel}>Bữa tối</Text>
                            </TouchableOpacity>
                        </View>
                        {todayMeals.totalKcal && (
                            <View style={s.totalKcalRow}>
                                <Ionicons name="flame" size={16} color="#f77"/>
                                <Text style={s.totalKcalText}>
                                    Tổng: ~{Math.round(todayMeals.totalKcal)} kcal
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Features Section */}
                <View style={s.featuresSection}>
                    <Text style={s.sectionTitle}>Tính năng</Text>

                    <TouchableOpacity
                        style={s.featureItem}
                        onPress={() => navigation.navigate("ShoppingList")}
                    >
                        <View style={s.featureIconContainer}>
                            <Ionicons name="cart-outline" size={22} color="#f77"/>
                        </View>
                        <View style={s.featureContent}>
                            <Text style={s.featureTitle}>Danh sách mua sắm</Text>
                            <Text style={s.featureSubtitle}>Quản lý nguyên liệu cần mua</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.featureItem}
                        onPress={() => navigation.navigate("FavoriteRecipes")}
                    >
                        <View style={s.featureIconContainer}>
                            <Ionicons name="heart-outline" size={22} color="#f77"/>
                        </View>
                        <View style={s.featureContent}>
                            <Text style={s.featureTitle}>Món ăn yêu thích</Text>
                            <Text style={s.featureSubtitle}>Xem các món bạn đã lưu</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.featureItem}
                        onPress={() => navigation.navigate("NutritionTracker")}
                    >
                        <View style={s.featureIconContainer}>
                            <Ionicons name="analytics-outline" size={22} color="#f77"/>
                        </View>
                        <View style={s.featureContent}>
                            <Text style={s.featureTitle}>Theo dõi dinh dưỡng</Text>
                            <Text style={s.featureSubtitle}>Xem thống kê dinh dưỡng</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.featureItem}
                        onPress={() => navigation.navigate("NutritionGoals")}
                    >
                        <View style={s.featureIconContainer}>
                            <Ionicons name="target-outline" size={22} color="#f77"/>
                        </View>
                        <View style={s.featureContent}>
                            <Text style={s.featureTitle}>Mục tiêu dinh dưỡng</Text>
                            <Text style={s.featureSubtitle}>Thiết lập mục tiêu của bạn</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.featureItem}
                        onPress={() => navigation.navigate("MealSuggest")}
                    >
                        <View style={s.featureIconContainer}>
                            <Ionicons name="sparkles" size={22} color="#f77"/>
                        </View>
                        <View style={s.featureContent}>
                            <Text style={s.featureTitle}>AI Gợi ý món ăn</Text>
                            <Text style={s.featureSubtitle}>Nhận gợi ý từ AI</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
                <View style={s.settingsSection}>
                    <Text style={s.sectionTitle}>Cài đặt tài khoản</Text>

                    <TouchableOpacity
                        style={s.settingItem}
                        onPress={() => navigation.navigate("ChangePassword")}
                    >
                        <View style={s.settingIconContainer}>
                            <Ionicons name="lock-closed-outline" size={22} color="#f77"/>
                        </View>
                        <Text style={s.settingTitle}>Đổi mật khẩu</Text>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.settingItem} onPress={onLogOut}>
                        <View style={s.settingIconContainer}>
                            <Ionicons name="log-out-outline" size={22} color="#ff4444"/>
                        </View>
                        <Text style={[s.settingTitle, {color: "#ff4444"}]}>Đăng xuất</Text>
                        <Ionicons name="chevron-forward" size={20} color="#ccc"/>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <View style={{marginBottom: 50}}>
                <TabBar/>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: {flex: 1, backgroundColor: "#fff"},
    container: {flex: 1},
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#f77",
    },
    profileCard: {
        backgroundColor: "#fff5f7",
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ffe0e6",
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#ffeef0",
    },
    editAvatarBtn: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#f77",
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#fff",
    },
    name: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: "#666",
        marginBottom: 2,
    },
    phone: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
    },
    editBtn: {
        flexDirection: "row",
        backgroundColor: "#f77",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
        alignItems: "center",
        gap: 6,
    },
    editBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#f0f0f0",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
    },
    preferencesCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#eee",
    },
    preferencesHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    preferencesTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    preferencesContent: {
        marginBottom: 12,
    },
    preferenceItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
    },
    preferenceLabel: {
        fontSize: 14,
        color: "#666",
    },
    preferenceValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    preferencesButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#f5f5f5",
        marginTop: 4,
    },
    preferencesButtonText: {
        color: "#f77",
        fontWeight: "600",
        fontSize: 14,
        marginRight: 4,
    },
    todayMealsCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#eee",
    },
    todayMealsHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    todayMealsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    mealsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    mealSlotCard: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 4,
    },
    mealSlotIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    mealSlotCount: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    mealSlotLabel: {
        fontSize: 12,
        color: "#666",
    },
    totalKcalRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#f5f5f5",
        marginTop: 8,
    },
    totalKcalText: {
        fontSize: 14,
        color: "#f77",
        fontWeight: "600",
        marginLeft: 6,
    },
    calendarSection: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#eee",
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
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
    },
    viewFullCalendarBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
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
    featuresSection: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#eee",
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff5f7",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 2,
    },
    featureSubtitle: {
        fontSize: 12,
        color: "#666",
    },
    settingsSection: {
        marginHorizontal: 16,
        marginBottom: 24,
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#eee",
    },
    settingIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff5f7",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    settingTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
    },
});
