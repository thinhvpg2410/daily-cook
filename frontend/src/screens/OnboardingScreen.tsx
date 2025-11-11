import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
  const isScrollingProgrammatically = useRef(false);

  // Sync index khi scroll kết thúc - cách chính xác nhất
  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / width);
    console.log(`Momentum scroll ended. Offset: ${offsetX}, Calculated index: ${currentIndex}`);
    if (currentIndex >= 0 && currentIndex < slides.length) {
      setIndex(currentIndex);
    }
    isScrollingProgrammatically.current = false;
  }, []);

  const goToIndex = useCallback((i: number) => {
    if (!flRef.current) {
      console.warn("FlatList ref is not available");
      return;
    }
    if (i < 0 || i >= slides.length) {
      console.warn("Invalid index:", i);
      return;
    }
    
    console.log(`Scrolling to index ${i}, offset: ${i * width}`);
    // Set index ngay lập tức để UI update (dots, button)
    setIndex(i);
    isScrollingProgrammatically.current = true;
    
    // Scroll đến slide tiếp theo bằng offset
    const offset = i * width;
    try {
      flRef.current.scrollToOffset({
        offset,
        animated: true,
      });
    } catch (error) {
      console.error("Error scrolling:", error);
    }
  }, []);

  const onContinue = useCallback(() => {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      goToIndex(nextIndex);
    } else {
      // Chuyển đến OnboardingScreen2 để lấy preferences
      navigation.replace("Onboarding2");
    }
  }, [index, goToIndex, navigation]);

  const onSkip = useCallback(() => {
    goToIndex(slides.length - 1);
  }, [goToIndex]);

  const renderSlide = ({ item }: { item: any }) => {
    if (item.grid) {
      return (
        <View style={styles.slide}>
          <View style={styles.gridWrap}>
            {item.grid.map((img: any, i: number) => (
              <Image key={i} source={img} style={styles.foodImage} />
            ))}
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <Image source={item.image} style={styles.topImage} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.text}>{item.text}</Text>
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
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={() => {
          isScrollingProgrammatically.current = false;
        }}
        decelerationRate="fast"
        removeClippedSubviews={false}
        bounces={false}
        windowSize={5}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                index === i && styles.dotActive
              ]} 
            />
          ))}
        </View>

        {index < slides.length - 1 ? (
          <TouchableOpacity 
            style={styles.continueBtn} 
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Tiếp tục</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={() => navigation.replace("Onboarding2")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>Tiếp tục</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  topRight: { 
    position: "absolute", 
    right: 16, 
    top: 12, 
    zIndex: 10 
  },
  slide: { 
    width: width,
    backgroundColor: "#fff",
    justifyContent: "flex-start",
    paddingBottom: 100, // Để có không gian cho footer
  },
  // ảnh chỉ chiếm nửa trên, có bo góc
  topImage: {
    width: width,
    height: height * 0.60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  info: { 
    paddingHorizontal: 24, 
    paddingTop: 28, 
    alignItems: "center",
    flex: 1,
  },
  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    marginBottom: 8, 
    textAlign: "center", 
    color: "#000" 
  },
  text: { 
    fontSize: 14, 
    textAlign: "center", 
    lineHeight: 20, 
    color: "#444" 
  },
  footer: { 
    paddingHorizontal: 20, 
    paddingBottom: 28, 
    paddingTop: 12,
    backgroundColor: "#fff",
  },
  dots: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center",
    marginBottom: 12 
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: "#ddd", 
    marginHorizontal: 4 
  },
  dotActive: { 
    backgroundColor: "#f77", 
    width: 24, 
    height: 8,
    borderRadius: 4 
  },
  continueBtn: { 
    backgroundColor: "#f77", 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: "center",
    marginTop: 8,
  },
  continueText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16 
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  foodImage: { 
    width: (width - 64) / 2, 
    height: 140, 
    borderRadius: 12, 
    marginBottom: 12 
  },
  primaryBtn: { 
    backgroundColor: "#f77", 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: "center", 
    marginTop: 8,
  },
  primaryText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16 
  },
  secondaryBtn: { 
    borderColor: "#f8a5a5", 
    borderWidth: 2, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  secondaryText: { 
    color: "#f8a5a5", 
    fontWeight: "600", 
    fontSize: 16 
  },
});

