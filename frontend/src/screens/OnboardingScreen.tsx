import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    key: "1",
    title: "Get Inspired",
    text: "Get inspired with our daily recipe recommendations.",
    image: require("../../assets/board1.jpg"),
  },
  {
    key: "2",
    title: "Increase Your Skills",
    text: "Learn essential cooking techniques at your own pace.",
    image: require("../../assets/board2.jpg"),
  },
  {
    key: "3",
    title: "Welcome",
    text: "Find the best recipes and increase your cooking skills.",
    grid: [
      require("../../assets/board3.jpg"),
      require("../../assets/board4.jpg"),
      require("../../assets/board5.jpg"),
      require("../../assets/board6.jpg"),
      require("../../assets/board7.jpg"),
      require("../../assets/board8.jpg"),
    ],
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const flRef = useRef<FlatList<any> | null>(null);

  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) setIndex(viewableItems[0].index ?? 0);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const goToIndex = (i: number) => flRef.current?.scrollToIndex({ index: i, animated: true });
  const onContinue = () => (index < slides.length - 1 ? goToIndex(index + 1) : navigation.replace("SignInEmail"));
  const onSkip = () => goToIndex(slides.length - 1);

  const renderSlide = ({ item }: { item: any }) => {
    if (item.grid) {
      return (
        <View style={[styles.slide, { width }]}>
          <View style={styles.gridWrap}>
            {item.grid.map((img: any, i: number) => (
              <Image key={i} source={img} style={styles.foodImage} />
            ))}
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: "#000" }]}>{item.title}</Text>
            <Text style={[styles.text, { color: "#444" }]}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.slide, { width }]}>
        <Image source={item.image} style={styles.topImage} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={[styles.title, { color: "#000" }]}>{item.title}</Text>
          <Text style={[styles.text, { color: "#444" }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        ref={flRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, index === i && styles.dotActive]} />
          ))}
        </View>

        {index < slides.length - 1 ? (
          <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace("SignUpEmail")}>
              <Text style={styles.primaryText}>I’m New</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.replace("SignInEmail")}>
              <Text style={styles.secondaryText}>I’ve Been Here</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topRight: { position: "absolute", right: 16, top: 12, zIndex: 10 },
  slide: { flex: 1, backgroundColor: "#fff" },
  // ảnh chỉ chiếm nửa trên, có bo góc
  topImage: {
    width: "100%",
    height: height * 0.60, // giảm xuống 55% thay vì full
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  info: { paddingHorizontal: 24, paddingTop: 28, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center", color: "#000" },
  text: { fontSize: 14, textAlign: "center", lineHeight: 20, color: "#444" },
  footer: { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 12 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: "#ddd", marginHorizontal: 6 },
  dotActive: { backgroundColor: "#f8a5a5", width: 18, borderRadius: 9 },
  continueBtn: { backgroundColor: "#f8a5a5", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  continueText: { color: "#e53935", fontWeight: "600", fontSize: 16 },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  foodImage: { width: (width - 64) / 2, height: 140, borderRadius: 12, marginBottom: 12 },
  primaryBtn: { backgroundColor: "#f8a5a5", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  primaryText: { color: "#e53935", fontWeight: "600", fontSize: 16 },
  secondaryBtn: { borderColor: "#f8a5a5", borderWidth: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#f8a5a5", fontWeight: "600", fontSize: 16 },
});

