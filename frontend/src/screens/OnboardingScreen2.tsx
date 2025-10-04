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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Animatable from "react-native-animatable";

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
];
const diets = [
  "None",
  "Vegan",
  "Paleo",
  "Dukan",
  "Vegetarian",
  "Atkins",
  "Intermittent Fasting",
];

export default function Onboarding2() {
  const [step, setStep] = useState(1);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
            <Text style={styles.title}>Any ingredient allergies?</Text>
            <Text style={styles.subtitle}>
              Choose any ingredients you’re allergic to.
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
            <Text style={styles.title}>Do you follow any diets?</Text>
            <Text style={styles.subtitle}>Pick one or more diet preferences.</Text>
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
            <Text style={styles.title}>You're all set! 🎉</Text>
            <Text style={styles.subtitle}>
              Happy cooking and enjoy your meals!
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
      <Text style={styles.buttonTextSecondary}>Previous</Text>
    </TouchableOpacity>
  )}

  {step === 1 && (
    <TouchableOpacity style={styles.button} onPress={() => setStep(step + 1)}>
      <Text style={styles.buttonText}>Start Survey</Text>
    </TouchableOpacity>
  )}

  {step > 1 && step < 4 && (
    <TouchableOpacity style={styles.button} onPress={() => setStep(step + 1)}>
      <Text style={styles.buttonText}>Next</Text>
    </TouchableOpacity>
  )}

  {step === 4 && (
    <TouchableOpacity
      style={styles.button}
      onPress={() =>
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      }
    >
      <Text style={styles.buttonText}>Let's cook</Text>
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
