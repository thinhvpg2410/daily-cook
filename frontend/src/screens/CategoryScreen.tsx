import React, {useEffect, useState} from "react";
import {
    View, Text, FlatList, Image, TouchableOpacity,
    StyleSheet, Dimensions, SafeAreaView
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import TabBar from "./TabBar";
import {http} from "../api/http";

const {width} = Dimensions.get("window");

// const recipesByCategory: Record<string, any[]> = {
//   Breakfast: [
//     { id: "1", title: "Pancake & Cream", desc: "Fluffy pancakes with cream", image: "https://heavenlyhomecooking.com/wp-content/uploads/2022/06/Sweet-Cream-Pancakes-Recipe-Featured-500x500.jpg", time: "20min", likes: 2273 },
//     { id: "2", title: "Omelette", desc: "Cheese omelette", image: "https://ichef.bbci.co.uk/food/ic/food_16x9_1600/recipes/cheeseomelette_80621_16x9.jpg", time: "10min", likes: 421 }
//   ],
//   Lunch: [
//     { id: "3", title: "Grilled Chicken", desc: "Juicy chicken breast", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBY_OVOu1ROZ9DPPdXQdcWDha6nGNTF21BEA&s", time: "35min", likes: 654 }
//   ],
//   Dinner: [
//     { id: "4", title: "Beef Steak", desc: "Steak with herbs", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFrW4AbObw9q8EZFHMCp830r40YXfVt27fjQ&s", time: "40min", likes: 320 }
//   ],
//   Vegan: [],
//   Dessert: [],
//   Drinks: [],
//   "Sea Food": [],
// };
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
    if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
    if (/^https?:\/\//i.test(src)) return src; // absolute URL
    if (src.startsWith("/")) return `http://localhost:3000${src}`; // relative from backend
    return src;
}


export default function CategoryScreen({route, navigation}: any) {
    const {category} = route.params;
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await http.get("/recipes", {params: {tag: category, page: 1, limit: 100}});
                const rows = (res.data?.data ?? []).map((x: any) => ({
                    id: x.id,
                    title: x.title,
                    desc: x.description || "",
                    image: normalizeImage(x.image),
                    time: `${x.cookTime ?? 30}min`,
                    likes: x.likes ?? 0,
                }));
                setData(rows);
            } catch (e) {
                console.warn("Fetch category fail:", e);
                setData([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [category]);


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
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={22} color="#f77"/>
                </TouchableOpacity>
                <Text style={s.headerTitle}>{category}</Text>
                <View style={{width: 22}}/>
            </View>

            {data.length === 0 ? (
                <View style={s.emptyBox}>
                    <Text style={s.emptyText}>No recipes in {category}</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(i) => i.id}
                    renderItem={({item}) => <SmallCard item={item}/>}
                    numColumns={2}
                    columnWrapperStyle={{justifyContent: "space-between"}}
                    contentContainerStyle={{padding: 12}}
                    showsVerticalScrollIndicator={false}
                />
            )}
            <View style={{marginBottom: 50}}>
                <TabBar/>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: {flex: 1, backgroundColor: "#fff"},
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },
    headerTitle: {fontSize: 18, fontWeight: "600", color: "#f77"},
    smallCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        width: width * 0.45,
        overflow: "hidden",
        elevation: 2
    },
    smallImage: {width: "100%", height: 100},
    heartSmall: {position: "absolute", top: 8, right: 8, backgroundColor: "#fff", borderRadius: 20, padding: 4},
    smallTitle: {fontSize: 14, fontWeight: "600"},
    smallDesc: {fontSize: 11, color: "#777", marginBottom: 4},
    row: {flexDirection: "row", alignItems: "center"},
    infoText: {fontSize: 12, color: "#777", marginLeft: 4},
    emptyBox: {flex: 1, justifyContent: "center", alignItems: "center"},
    emptyText: {fontSize: 16, color: "#999"}
});
