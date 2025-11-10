import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Animatable from "react-native-animatable";
import { useAuth } from "../context/AuthContext";
import { updatePreferencesApi, UserPreferences } from "../api/users";
import { setOnboardingCompleted, savePendingPreferences } from "../utils/onboarding";

const { width, height } = Dimensions.get("window");

// Quotes + ảnh đặc trưng
const slides = [
  {
    image: require("../../assets/beefwellington.jpg"), // Gordon Ramsay
    title: "“Cooking is about passion.”",
    subtitle: "— Gordon Ramsay",
  },
  {
    image: require("../../assets/peasoup.jpg"), // Graham Elliot
    title: "“The key to success is simplicity.”",
    subtitle: "— Graham Elliot",
  },
  {
    image: require("../../assets/rissoto.jpg"), // Joe Bastianich
    title: "“Cooking is not a job, it’s a joy.”",
    subtitle: "— Joe Bastianich",
  },
  {
    image: require("../../assets/milkbarcake.jpg"), // Christina Tosi
    title: "“Bake with love and fun.”",
    subtitle: "— Christina Tosi",
  },
];

const allergies = [
  "Gluten",
  "Dairy",
  "Egg",
  "Soy",
  "Peanut",
  "Wheat",
  "Milk",
  "Fish",
  "Tôm",
  "Cua",
  "Đậu phộng",
  "Hạt điều",
];

const diets = [
  "None",
  "Vegan",
  "Vegetarian",
  "Low Carb",
  "Paleo",
  "Keto",
];

export default function Onboarding2() {
  const { user, token } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<any>();

  // Auto chuyển ảnh sau 5s
  useEffect(() => {
    if (step !== 1) return;
    const interval = setInterval(() => {
      let nextIndex = (currentIndex + 1) % slides.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, step]);

  // Toggle chọn item
  const toggleSelection = (item: string, list: string[], setList: any) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Xử lý khi hoàn thành onboarding
  const handleFinish = async () => {
    setLoading(true);
    try {
      // Map allergies và diets sang format backend
      const dislikedIngredients = selectedAllergies.filter(a => a !== "None");
      const dietType = selectedDiets.includes("Vegan") 
        ? "vegan" 
        : selectedDiets.includes("Vegetarian")
        ? "vegetarian"
        : selectedDiets.includes("Low Carb") || selectedDiets.includes("Keto")
        ? "low_carb"
        : "normal";

      const preferences: UserPreferences = {
        dislikedIngredients,
        dietType: dietType as any,
        likedTags: [], // Có thể thêm sau
      };

      // Nếu user đã đăng nhập, lưu preferences vào backend
      if (token && user) {
        try {
          await updatePreferencesApi(preferences);
        } catch (error) {
          console.error("Error saving preferences:", error);
          // Không block flow nếu lưu preferences thất bại
        }
      } else {
        // Nếu chưa đăng nhập, lưu preferences tạm vào AsyncStorage
        // Sẽ được lưu vào backend khi user đăng nhập
        await savePendingPreferences(preferences);
      }

      // Đánh dấu đã hoàn thành onboarding
      await setOnboardingCompleted();

      // Chuyển đến màn hình phù hợp
      if (token && user) {
        // Đã đăng nhập -> Home
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } else {
        // Chưa đăng nhập -> Auth
        navigation.reset({
          index: 0,
          routes: [{ name: "SignInEmail" }],
        });
      }
    } catch (error) {
      console.error("Error finishing onboarding:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={{ flex: 1 }}>
            {/* Quotes */}
            <View style={styles.quoteContainer}>
              <Animatable.Text
                key={currentIndex}
                animation="fadeInUp"
                duration={1000}
                style={styles.title}
              >
                {slides[currentIndex].title}
              </Animatable.Text>
              <Animatable.Text
                key={currentIndex + "-sub"}
                animation="fadeIn"
                delay={400}
                duration={1200}
                style={styles.subtitle}
              >
                {slides[currentIndex].subtitle}
              </Animatable.Text>
            </View>

            {/* Carousel */}
            <FlatList
              ref={flatListRef}
              data={slides}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / width
                );
                setCurrentIndex(index);
              }}
              renderItem={({ item }) => (
                <Image source={item.image} style={styles.slideImage} />
              )}
            />

            {/* Pagination */}
            <View style={styles.pagination}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentIndex === index && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.center}>
            <Text style={styles.title}>Bạn có dị ứng với nguyên liệu nào không?</Text>
            <Text style={styles.subtitle}>
              Chọn các nguyên liệu bạn bị dị ứng (có thể bỏ qua nếu không có)
            </Text>
            <View style={styles.grid}>
              {allergies.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.option,
                    selectedAllergies.includes(item) && styles.optionSelected,
                  ]}
                  onPress={() =>
                    toggleSelection(
                      item,
                      selectedAllergies,
                      setSelectedAllergies
                    )
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedAllergies.includes(item) &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.center}>
            <Text style={styles.title}>Bạn theo chế độ ăn nào?</Text>
            <Text style={styles.subtitle}>Chọn một hoặc nhiều chế độ ăn (có thể bỏ qua)</Text>
            <View style={styles.grid}>
              {diets.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.option,
                    selectedDiets.includes(item) && styles.optionSelected,
                  ]}
                  onPress={() =>
                    toggleSelection(item, selectedDiets, setSelectedDiets)
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedDiets.includes(item) &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.center}>
            <Image
              source={require("../../assets/yummy.jpg")}
              style={styles.image}
            />
            <Text style={styles.title}>Hoàn tất! 🎉</Text>
            <Text style={styles.subtitle}>
              Bạn đã sẵn sàng để bắt đầu nấu ăn cùng DailyCook!
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {renderStep()}
      </ScrollView>

      {/* Footer */}
<View
  style={[
    styles.footer,
    (step === 1 || step === 4) && { justifyContent: "center" }, // chỉ 1 nút thì căn giữa
  ]}
>
  {step > 1 && step < 4 && (
    <TouchableOpacity
      style={[styles.button, styles.buttonSecondary]}
      onPress={() => setStep(step - 1)}
    >
      <Text style={styles.buttonTextSecondary}>Quay lại</Text>
    </TouchableOpacity>
  )}

  {step === 1 && (
    <TouchableOpacity style={styles.button} onPress={() => setStep(step + 1)}>
      <Text style={styles.buttonText}>Bắt đầu khảo sát</Text>
    </TouchableOpacity>
  )}

  {step > 1 && step < 4 && (
    <TouchableOpacity style={styles.button} onPress={() => setStep(step + 1)}>
      <Text style={styles.buttonText}>Tiếp theo</Text>
    </TouchableOpacity>
  )}

  {step === 4 && (
    <TouchableOpacity
      style={styles.button}
      onPress={handleFinish}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>Bắt đầu nấu ăn 🍳</Text>
      )}
    </TouchableOpacity>
  )}
</View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  slideImage: { width, height: height * 0.4, resizeMode: "cover" },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: "#e53935", width: 16 },
  quoteContainer: {
    height: height * 0.35,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#555",
    lineHeight: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 20,
    borderRadius: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 6,
    backgroundColor: "#fff",
  },
  optionSelected: { backgroundColor: "#e53935", borderColor: "#e53935" },
  optionText: { fontSize: 14, color: "#333" },
  optionTextSelected: { color: "#fff", fontWeight: "bold" },
  footer: {
  flexDirection: "row",
  justifyContent: "space-between", // đẩy về 2 bên
  alignItems: "center",
  padding: 20,
},

  button: {
    backgroundColor: "#e53935",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: "#eee", marginRight: 10 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  buttonTextSecondary: { color: "#333", fontSize: 16 },
});
