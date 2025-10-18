import React, {useState} from "react";
import {View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, ScrollView} from "react-native";
import {useTheme} from "@react-navigation/native";
import {Ionicons} from "@expo/vector-icons";
import {suggestMealApi} from "../api/mealplan";
import {Picker} from "@react-native-picker/picker";

export default function MealSuggestScreen() {
    const {colors} = useTheme();
    const [region, setRegion] = useState("All");
    const [dietType, setDietType] = useState("normal");
    const [targetKcal, setTargetKcal] = useState<number>(2000);
    const [loading, setLoading] = useState(false);
    const [recipes, setRecipes] = useState<any[]>([]);

    const onSuggest = async () => {
        setLoading(true);
        try {
            const res = await suggestMealApi({region, dietType, targetKcal});
            setRecipes(res.data?.recipes || []);
        } catch (err) {
            console.error("Error suggesting meals:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={{flex: 1, backgroundColor: colors.background, padding: 16}}>
            <Text style={{fontSize: 24, fontWeight: "bold", marginBottom: 8, color: colors.text}}>
                🍱 Gợi ý bữa ăn hôm nay
            </Text>
            <Text style={{color: colors.text, marginBottom: 12}}>
                Hệ thống sẽ gợi ý bữa ăn Việt Nam phù hợp với khẩu vị và nhu cầu năng lượng của bạn.
            </Text>

            {/* Bộ lọc */}
            <Text style={{marginBottom: 4, color: colors.text}}>Vùng miền:</Text>
            <View style={{borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#ddd", marginBottom: 10}}>
                <Picker selectedValue={region} onValueChange={(v) => setRegion(v)}>
                    <Picker.Item label="Tất cả" value="All"/>
                    <Picker.Item label="Miền Bắc" value="Northern"/>
                    <Picker.Item label="Miền Trung" value="Central"/>
                    <Picker.Item label="Miền Nam" value="Southern"/>
                </Picker>
            </View>

            <Text style={{marginBottom: 4, color: colors.text}}>Chế độ ăn:</Text>
            <View style={{borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#ddd", marginBottom: 10}}>
                <Picker selectedValue={dietType} onValueChange={(v) => setDietType(v)}>
                    <Picker.Item label="Thông thường" value="normal"/>
                    <Picker.Item label="Ăn chay (vegan)" value="vegan"/>
                    <Picker.Item label="Ít carb (low-carb)" value="low_carb"/>
                </Picker>
            </View>

            <Text style={{marginBottom: 4, color: colors.text}}>Mục tiêu năng lượng (kcal/ngày):</Text>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#ddd",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    marginBottom: 16,
                    height: 44,
                }}
            >
                <Text style={{color: colors.text, flex: 1}}>{targetKcal} kcal</Text>
                <TouchableOpacity onPress={() => setTargetKcal(targetKcal - 100)}>
                    <Ionicons name="remove-circle-outline" size={22} color={colors.primary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTargetKcal(targetKcal + 100)} style={{marginLeft: 8}}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary}/>
                </TouchableOpacity>
            </View>

            {/* Nút gợi ý */}
            <TouchableOpacity
                onPress={onSuggest}
                style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    marginBottom: 20,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#fff"/>
                ) : (
                    <Text style={{color: "#fff", fontWeight: "600"}}>✨ Gợi ý bữa ăn</Text>
                )}
            </TouchableOpacity>

            {/* Danh sách món gợi ý */}
            {recipes.length > 0 && (
                <View>
                    <Text style={{fontSize: 20, fontWeight: "bold", marginBottom: 12, color: colors.text}}>
                        Gợi ý hôm nay ({recipes.length} món):
                    </Text>
                    <FlatList
                        data={recipes}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
                            <View
                                style={{
                                    marginBottom: 16,
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    backgroundColor: colors.card,
                                    shadowColor: "#000",
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                }}
                            >
                                <Image source={{uri: item.image}} style={{height: 180, width: "100%"}}/>
                                <View style={{padding: 10}}>
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        color: colors.text
                                    }}>{item.title}</Text>
                                    <Text style={{
                                        color: "#777",
                                        fontSize: 13,
                                        marginVertical: 4
                                    }}>{item.description}</Text>
                                    <Text style={{color: colors.text, fontSize: 12}}>
                                        ⏱ {item.cookTime ?? 30} phút · 🔥 {Math.round(item.totalKcal ?? 0)} kcal
                                    </Text>
                                    <View style={{flexDirection: "row", marginTop: 6, flexWrap: "wrap"}}>
                                        {item.tags?.map((tag: string, i: number) => (
                                            <View
                                                key={i}
                                                style={{
                                                    backgroundColor: "#eef",
                                                    borderRadius: 6,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 2,
                                                    marginRight: 6,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                <Text style={{fontSize: 12, color: "#445"}}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}
                    />
                </View>
            )}
        </ScrollView>
    );
}
