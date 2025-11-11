import React, {useEffect, useState} from "react";
import {
    View, Text, FlatList, Image, TouchableOpacity,
    StyleSheet, Dimensions, ScrollView, SafeAreaView, ActivityIndicator
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import TabBar from "./TabBar";
import {useAuth} from "../context/AuthContext";
import {http} from "../api/http";
import {getTodaySuggestApi, upsertMealPlanApi} from "../api/mealplan";

const {width} = Dimensions.get("window");

const categories = ["Breakfast", "Lunch", "Dinner", "Vegan", "Dessert", "Drinks", "Sea Food"];

type ApiRecipe = {
    id: string;
    title: string;
    description?: string | null;
    image?: string | null;
    cookTime?: number | null;
    likes?: number | null;
    tags: string[];
    createdAt?: string;
};
type UiCard = {
    id: string;
    title: string;
    desc: string;
    image: string;
    time: string;
    likes: number;
};

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";
function normalizeImage(src?: string | null) {
    if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
    if (/^https?:\/\//i.test(src)) return src; // absolute URL
    if (src.startsWith("/")) return `http://localhost:3000${src}`; // relative from backend
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


export default function HomeScreen({navigation}: any) {
    const {user, token} = useAuth()
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [todaySuggestLoading, setTodaySuggestLoading] = useState(false);
    const [todaySuggest, setTodaySuggest] = useState<any>(null);

    const [trending, setTrending] = useState<UiCard[]>([]);
    const [yourRecipes, setYourRecipes] = useState<UiCard[]>([]);
    const [recentlyAdded, setRecentlyAdded] = useState<UiCard[]>([]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await http.get("/recipes", {
                params: {page: 1, limit: 100}, // lấy nhiều một chút cho 3 section
                headers: token ? {Authorization: `Bearer ${token}`} : undefined,
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
                    const mine = await http.get("/users/me/recipes", {
                        headers: {Authorization: `Bearer ${token}`},
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
                    }));
                    setYourRecipes(myRows.slice(0, 10).map(mapToUi));
                } else {
                    const dinnerLike = rows.filter(r => r.tags?.includes("Dinner")).slice(0, 10).map(mapToUi);
                    setYourRecipes(dinnerLike.length ? dinnerLike : recentSorted.slice(0, 10));
                }
            } catch {
                //fallback
                const dinnerLike = rows.filter(r => r.tags?.includes("Dinner")).slice(0, 10).map(mapToUi);
                setYourRecipes(dinnerLike.length ? dinnerLike : recentSorted.slice(0, 10));
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

    const todayStr = new Date().toISOString().split("T")[0];

    const acceptTodaySuggest = async () => {
        if (!todaySuggest || !token) return;
        try {
            await upsertMealPlanApi({
                date: todayStr,
                slots: {
                    breakfast: todaySuggest.breakfast?.map((r: any) => r.id) || [],
                    lunch: todaySuggest.lunch?.map((r: any) => r.id) || [],
                    dinner: todaySuggest.dinner?.map((r: any) => r.id) || [],
                },
            });
            // Refresh today's suggest to show it's now saved
            await fetchTodaySuggest();
            // Shopping list will be automatically updated when user visits ShoppingListScreen
            // because it fetches from the date range which includes today
        } catch (error) {
            console.error("Error accepting suggestion:", error);
        }
    };

    useEffect(() => {
        fetchAll();
        if (token) {
            fetchTodaySuggest();
        }
    }, [token]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
        setRefreshing(false);
    };

    const TrendingCard = ({item}: { item: UiCard }) => (
        <TouchableOpacity style={s.trendingCard} onPress={() => navigation.navigate("Details", {item})}>
            <Image source={{uri: item.image}} style={s.trendingImage}/>
            <TouchableOpacity style={s.heartButton}>
                <Ionicons name="heart-outline" size={18} color="#f77"/>
            </TouchableOpacity>
            <View style={s.trendingInfo}>
                <Text style={s.trendingTitle}>{item.title}</Text>
                <Text style={s.trendingDesc}>{item.desc}</Text>
                <View style={s.row}>
                    <Ionicons name="time-outline" size={14} color="#f77"/>
                    <Text style={s.infoText}>{item.time}</Text>
                    <Ionicons name="heart" size={14} color="#f77" style={{marginLeft: 12}}/>
                    <Text style={s.infoText}>{item.likes}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const SmallCard = ({item}: { item: UiCard }) => (
        <TouchableOpacity style={s.smallCard} onPress={() => navigation.navigate("Details", {item})}>
            <Image source={{uri: item.image}} style={s.smallImage}/>
            <TouchableOpacity style={s.heartSmall}>
                <Ionicons name="heart-outline" size={16} color="#f77"/>
            </TouchableOpacity>
            <View style={{padding: 6}}>
                <Text style={s.smallTitle}>{item.title}</Text>
                <Text style={s.smallDesc} numberOfLines={1}>{item.desc}</Text>
                <View style={s.row}>
                    <Ionicons name="time-outline" size={12} color="#f77"/>
                    <Text style={s.infoText}>{item.time}</Text>
                    <Ionicons name="heart" size={12} color="#f77" style={{marginLeft: 8}}/>
                    <Text style={s.infoText}>{item.likes}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
    if (loading) {
        return (
            <SafeAreaView style={[s.safe, {alignItems: "center", justifyContent: "center"}]}>
                <ActivityIndicator size="large" color="#f77"/>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Xin chào{user?.name ? `, ${user.name}` : "!"}</Text>
                        <Text style={s.subtitle}>Hôm nay nấu gì nhỉ? 👨‍🍳</Text>
                    </View>
                    <View style={s.iconRow}>
                        <TouchableOpacity 
                            style={s.iconBtn}
                            onPress={() => navigation.navigate("ShoppingList")}
                        >
                            <Ionicons name="cart-outline" size={20} color="#f77"/>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Today's Suggestion Card */}
                {token && (
                    <View style={s.todayCard}>
                        <View style={s.todayCardHeader}>
                            <View>
                                <Text style={s.todayCardTitle}>✨ Gợi ý hôm nay</Text>
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
                                                <Text style={s.todayMealLabel}>🌅 Bữa sáng</Text>
                                                <FlatList
                                                    horizontal
                                                    data={todaySuggest.breakfast}
                                                    keyExtractor={(item) => item.id}
                                                    renderItem={({item}) => (
                                                        <TouchableOpacity
                                                            style={s.todayMealItem}
                                                            onPress={() => navigation.navigate("Details", {item})}
                                                        >
                                                            <Image 
                                                                source={{uri: normalizeImage(item.image)}} 
                                                                style={s.todayMealImage}
                                                            />
                                                            <Text style={s.todayMealTitle} numberOfLines={1}>
                                                                {item.title}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                />
                                            </View>
                                        )}
                                        {todaySuggest.lunch?.length > 0 && (
                                            <View style={s.todayMealSlot}>
                                                <Text style={s.todayMealLabel}>🌆 Bữa trưa</Text>
                                                <FlatList
                                                    horizontal
                                                    data={todaySuggest.lunch}
                                                    keyExtractor={(item) => item.id}
                                                    renderItem={({item}) => (
                                                        <TouchableOpacity
                                                            style={s.todayMealItem}
                                                            onPress={() => navigation.navigate("Details", {item})}
                                                        >
                                                            <Image 
                                                                source={{uri: normalizeImage(item.image)}} 
                                                                style={s.todayMealImage}
                                                            />
                                                            <Text style={s.todayMealTitle} numberOfLines={1}>
                                                                {item.title}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                />
                                            </View>
                                        )}
                                        {todaySuggest.dinner?.length > 0 && (
                                            <View style={s.todayMealSlot}>
                                                <Text style={s.todayMealLabel}>🌙 Bữa tối</Text>
                                                <FlatList
                                                    horizontal
                                                    data={todaySuggest.dinner}
                                                    keyExtractor={(item) => item.id}
                                                    renderItem={({item}) => (
                                                        <TouchableOpacity
                                                            style={s.todayMealItem}
                                                            onPress={() => navigation.navigate("Details", {item})}
                                                        >
                                                            <Image 
                                                                source={{uri: normalizeImage(item.image)}} 
                                                                style={s.todayMealImage}
                                                            />
                                                            <Text style={s.todayMealTitle} numberOfLines={1}>
                                                                {item.title}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                />
                                            </View>
                                        )}
                                        {todaySuggest.totalKcal && (
                                            <Text style={s.todayKcal}>
                                                🔥 Tổng: ~{Math.round(todaySuggest.totalKcal)} kcal
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {!todaySuggest.hasPlan && (
                                    <TouchableOpacity 
                                        style={s.acceptButton}
                                        onPress={acceptTodaySuggest}
                                    >
                                        <Text style={s.acceptButtonText}>✅ Chấp nhận gợi ý</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity 
                                    style={s.suggestButton}
                                    onPress={() => navigation.navigate("MealSuggest")}
                                >
                                    <Text style={s.suggestButtonText}>🎲 Gợi ý khác</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* Categories → scroll ngang */}
                <FlatList
                    data={categories}
                    horizontal
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingVertical: 6}}
                    renderItem={({item}) => (
                        <TouchableOpacity
                            style={s.catBtn}
                            onPress={() => navigation.navigate("Category", {category: item})}
                        >
                            <Text style={s.catText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />

                {/* Trending */}
                <Text style={s.sectionTitle}>🔥 Món ăn phổ biến</Text>
                <FlatList
                    horizontal
                    data={trending}
                    renderItem={({item}) => <TrendingCard item={item}/>}
                    keyExtractor={(i) => i.id}
                    showsHorizontalScrollIndicator={false}
                />

                {/* Your Recipes */}
                <View style={s.sectionBox}>
                    <Text style={s.sectionTitleWhite}>📚 Món ăn của bạn</Text>
                    <FlatList
                        horizontal
                        data={yourRecipes}
                        renderItem={({item}) => <SmallCard item={item}/>}
                        keyExtractor={(i) => i.id}
                        showsHorizontalScrollIndicator={false}
                    />
                </View>

                {/* Recently Added */}
                <Text style={s.sectionTitle}>🆕 Món mới thêm</Text>
                <View style={s.grid}>
                    {recentlyAdded.map((i) => <SmallCard key={i.id} item={i}/>)}
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
    container: {flex: 1, paddingHorizontal: 16},
    header: {flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 12},
    title: {fontSize: 22, fontWeight: "bold", color: "#f77"},
    subtitle: {fontSize: 14, color: "#555"},
    iconRow: {flexDirection: "row"},
    iconBtn: {backgroundColor: "#ffeef0", padding: 8, borderRadius: 20, marginLeft: 8},
    todayCard: {
        backgroundColor: "#fff5f7",
        borderRadius: 16,
        padding: 16,
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
    todayCardTitle: {fontSize: 18, fontWeight: "bold", color: "#f77", marginBottom: 4},
    todayCardSubtitle: {fontSize: 12, color: "#777"},
    todayMeals: {marginBottom: 12},
    todayMealSlot: {marginBottom: 12},
    todayMealLabel: {fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8},
    todayMealItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginRight: 12,
        width: 120,
        overflow: "hidden",
        elevation: 2,
    },
    todayMealImage: {width: 120, height: 80},
    todayMealTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
        padding: 8,
        textAlign: "center",
    },
    todayKcal: {
        fontSize: 12,
        color: "#777",
        textAlign: "center",
        marginTop: 8,
        fontStyle: "italic",
    },
    acceptButton: {
        backgroundColor: "#f77",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 8,
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
    },
    suggestButtonText: {
        color: "#f77",
        fontWeight: "600",
        fontSize: 14,
    },
    catBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#f77"
    },
    catText: {fontSize: 14, color: "#f77"},
    sectionTitle: {fontSize: 18, fontWeight: "600", marginVertical: 12, color: "#333"},
    trendingCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginRight: 16,
        width: width * 0.7,
        overflow: "hidden",
        elevation: 2
    },
    trendingImage: {width: "100%", height: 150},
    heartButton: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6
    },
    trendingInfo: {padding: 10},
    trendingTitle: {fontSize: 15, fontWeight: "600"},
    trendingDesc: {fontSize: 12, color: "#777", marginBottom: 6},
    row: {flexDirection: "row", alignItems: "center"},
    infoText: {fontSize: 12, color: "#777", marginLeft: 4},
    sectionBox: {
        backgroundColor: "#f77",
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginVertical: 12
    },
    sectionTitleWhite: {fontSize: 18, fontWeight: "600", marginVertical: 8, color: "#fff", marginLeft: 8},
    smallCard: {backgroundColor: "#fff", borderRadius: 12, margin: 6, width: width * 0.45, overflow: "hidden"},
    smallImage: {width: "100%", height: 100},
    heartSmall: {position: "absolute", top: 8, right: 8, backgroundColor: "#fff", borderRadius: 20, padding: 4},
    smallTitle: {fontSize: 14, fontWeight: "600"},
    smallDesc: {fontSize: 11, color: "#777", marginBottom: 4},
    grid: {flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between"}
});
