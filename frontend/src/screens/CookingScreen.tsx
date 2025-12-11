import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config/env";

const { width, height } = Dimensions.get("window");

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
  return src;
}

type Recipe = {
  id: string;
  title: string;
  image?: string | null;
  cookTime?: number | null;
  steps?: string[];
};

export default function CookingScreen({ route, navigation }: any) {
  const { recipe } = route.params as { recipe: Recipe };
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse steps if needed
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetTimer = () => {
    setTimerSeconds(0);
    setIsTimerRunning(false);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert("Hoàn thành!", "Bạn đã hoàn thành tất cả các bước nấu ăn! 🎉", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const img = normalizeImage(recipe.image);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f77" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đang nấu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recipe Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: img }} style={styles.image} />
          <View style={styles.imageOverlay}>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <View style={styles.timeInfo}>
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.timeText}>
                {recipe.cookTime ? `${recipe.cookTime} phút` : "30 phút"}
              </Text>
            </View>
          </View>
        </View>

        {/* Timer Section */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Bộ đếm thời gian</Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
            <View style={styles.timerButtons}>
              <TouchableOpacity
                style={[styles.timerBtn, styles.resetBtn]}
                onPress={resetTimer}
              >
                <Ionicons name="refresh" size={20} color="#f77" />
                <Text style={styles.timerBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerBtn, styles.playPauseBtn]}
                onPress={toggleTimer}
              >
                <Ionicons
                  name={isTimerRunning ? "pause" : "play"}
                  size={20}
                  color="#fff"
                />
                <Text style={[styles.timerBtnText, { color: "#fff" }]}>
                  {isTimerRunning ? "Tạm dừng" : "Bắt đầu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Current Step */}
        {steps.length > 0 && (
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepCounter}>
                Bước {currentStep + 1} / {steps.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentStep + 1) / steps.length) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.currentStepCard}>
              <View style={styles.stepNumberLarge}>
                <Text style={styles.stepNumberText}>{currentStep + 1}</Text>
              </View>
              <Text style={styles.stepContent}>{steps[currentStep]}</Text>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.prevButton,
                  currentStep === 0 && styles.navButtonDisabled,
                ]}
                onPress={goToPrevStep}
                disabled={currentStep === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={currentStep === 0 ? "#ccc" : "#f77"}
                />
                <Text
                  style={[
                    styles.navButtonText,
                    currentStep === 0 && styles.navButtonTextDisabled,
                  ]}
                >
                  Trước
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={goToNextStep}
              >
                <Text style={[styles.navButtonText, { color: "#fff" }]}>
                  {currentStep === steps.length - 1 ? "Hoàn thành" : "Tiếp theo"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* All Steps Overview */}
        {steps.length > 0 && (
          <View style={styles.allStepsSection}>
            <Text style={styles.sectionTitle}>Tất cả các bước</Text>
            {steps.map((step, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.stepOverviewItem,
                  idx === currentStep && styles.stepOverviewItemActive,
                ]}
                onPress={() => setCurrentStep(idx)}
              >
                <View
                  style={[
                    styles.stepOverviewNumber,
                    idx === currentStep && styles.stepOverviewNumberActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepOverviewNumberText,
                      idx === currentStep && styles.stepOverviewNumberTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepOverviewText,
                    idx === currentStep && styles.stepOverviewTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {step}
                </Text>
                {idx === currentStep && (
                  <Ionicons name="checkmark-circle" size={20} color="#f77" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 250,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 16,
  },
  recipeTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
  },
  timerSection: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  timerLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 12,
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#f77",
    marginBottom: 16,
    fontFamily: "monospace",
  },
  timerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 6,
  },
  resetBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f77",
  },
  playPauseBtn: {
    backgroundColor: "#f77",
  },
  timerBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f77",
  },
  stepSection: {
    padding: 16,
  },
  stepHeader: {
    marginBottom: 16,
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f77",
    borderRadius: 3,
  },
  currentStepCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#f77",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumberLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f77",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  stepContent: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    textAlign: "center",
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 25,
    gap: 6,
  },
  prevButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f77",
  },
  nextButton: {
    backgroundColor: "#f77",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f77",
  },
  navButtonTextDisabled: {
    color: "#ccc",
  },
  allStepsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
    marginBottom: 12,
  },
  stepOverviewItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  stepOverviewItemActive: {
    backgroundColor: "#ffeef0",
    borderColor: "#f77",
  },
  stepOverviewNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepOverviewNumberActive: {
    backgroundColor: "#f77",
  },
  stepOverviewNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  stepOverviewNumberTextActive: {
    color: "#fff",
  },
  stepOverviewText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  stepOverviewTextActive: {
    color: "#333",
    fontWeight: "500",
  },
});

