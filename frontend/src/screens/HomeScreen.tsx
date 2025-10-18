import React from "react";
import {
    View, Text, FlatList, Image, TouchableOpacity,
    StyleSheet, Dimensions, ScrollView, SafeAreaView
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import TabBar from "./TabBar";
import {useAuth} from "../context/AuthContext";

const {width} = Dimensions.get("window");

const categories = ["Breakfast", "Lunch", "Dinner", "Vegan", "Dessert", "Drinks", "Sea Food"];
const trending = [
    {
        id: "1",
        title: "Salami and cheese pizza",
        desc: "Quick overview of the ingredients...",
        image: "https://media.istockphoto.com/id/184946701/vi/anh/pizza.jpg?s=612x612&w=0&k=20&c=D6eJLNuSWoDoCmWyY42axAKmJykI5zLJNsItLy5KB84=",
        time: "30min",
        likes: 5
    }
];
const yourRecipes = [
    {
        id: "2",
        title: "Chicken Burger",
        desc: "Delicious homemade burger",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyDcH_MxdsTsK6KMVon-Ybfa2WiT-R70ZjWw&s",
        time: "15min",
        likes: 5
    },
    {
        id: "3",
        title: "Tiramisu",
        desc: "Classic Italian dessert",
        image: "https://daotaobeptruong.vn/wp-content/uploads/2020/11/banh-tiramisu.jpg",
        time: "15min",
        likes: 5
    }
];
const recentlyAdded = [
    {
        id: "4",
        title: "Lemonade",
        desc: "Acidic and refreshing",
        image: "https://herbsandflour.com/wp-content/uploads/2020/05/Homemade-Lemonade-Recipe.jpg",
        time: "30min",
        likes: 4
    },
    {
        id: "5",
        title: "Taco",
        desc: "Spicy Mexican taco",
        image: "https://mojo.generalmills.com/api/public/content/GmHhoT5mr0Sue2oMxdyEig_webp_base.webp?v=c67813e4&t=191ddcab8d1c415fa10fa00a14351227",
        time: "25min",
        likes: 3
    }
];

export default function HomeScreen({navigation}: any) {
    const {user} = useAuth()
    const TrendingCard = ({item}: any) => (
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

    const SmallCard = ({item}: any) => (
        <TouchableOpacity style={s.smallCard} onPress={() => navigation.navigate("Details", {item})}>
            <Image source={{uri: item.image}} style={s.smallImage}/>
            <TouchableOpacity style={s.heartSmall}>
                <Ionicons name="heart-outline" size={16} color="#f77"/>
            </TouchableOpacity>
            <View style={{padding: 6}}>
                <Text style={s.smallTitle}>{item.title}</Text>
                <Text style={s.smallDesc}>{item.desc}</Text>
                <View style={s.row}>
                    <Ionicons name="time-outline" size={12} color="#f77"/>
                    <Text style={s.infoText}>{item.time}</Text>
                    <Ionicons name="heart" size={12} color="#f77" style={{marginLeft: 8}}/>
                    <Text style={s.infoText}>{item.likes}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Hi{user?.name ? `! ${user.name}` : "!"}</Text>
                        <Text style={s.subtitle}>What are you cooking today</Text>
                    </View>
                    <View style={s.iconRow}>
                        <TouchableOpacity style={s.iconBtn}><Ionicons name="notifications-outline" size={20}
                                                                      color="#f77"/></TouchableOpacity>
                        <TouchableOpacity style={s.iconBtn}><Ionicons name="cart-outline" size={20}
                                                                      color="#f77"/></TouchableOpacity>
                    </View>
                </View>

                {/* Categories → scroll ngang */}
                <FlatList
                    data={categories}
                    horizontal
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingVertical: 6}}
                    renderItem={({item}) => (
                        <TouchableOpacity style={s.catBtn}
                                          onPress={() => navigation.navigate("Category", {category: item})}>
                            <Text style={s.catText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />

                {/* Trending */}
                <Text style={s.sectionTitle}>Trending Recipe</Text>
                <FlatList horizontal data={trending} renderItem={({item}) => <TrendingCard item={item}/>}
                          keyExtractor={(i) => i.id} showsHorizontalScrollIndicator={false}/>

                {/* Your Recipes */}
                <View style={s.sectionBox}>
                    <Text style={s.sectionTitleWhite}>Your Recipes</Text>
                    <FlatList horizontal data={yourRecipes} renderItem={({item}) => <SmallCard item={item}/>}
                              keyExtractor={(i) => i.id} showsHorizontalScrollIndicator={false}/>
                </View>

                {/* Recently Added */}
                <Text style={s.sectionTitle}>Recently Added</Text>
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
    heartButton: {position: "absolute", top: 10, right: 10, backgroundColor: "#fff", borderRadius: 20, padding: 6},
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
