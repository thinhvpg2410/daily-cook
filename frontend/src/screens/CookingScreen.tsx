import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config/env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createFoodLogApi, getFoodLogsApi } from "../api/food-log";
import { useAuth } from "../context/AuthContext";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

const TIMER_HISTORY_KEY = "COOK_TIMER_HISTORY";

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
  const { recipe, mealType: passedMealType, selectedDate: passedDate } = route.params as {
    recipe: Recipe;
    mealType?: "breakfast" | "lunch" | "dinner" | "snack";
    selectedDate?: string;
  };
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionRunning, setSessionRunning] = useState(true);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    passedMealType || "dinner"
  );
  const [finishing, setFinishing] = useState(false);
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const [stepTimers, setStepTimers] = useState(
    steps.map(() => ({
      duration: 0,
      remaining: 0,
      isRunning: false,
      spent: 0,
    }))
  );
  const prevStepTimersRef = useRef(stepTimers);

  // Reset timers when recipe changes
  useEffect(() => {
    setCurrentStep(0);
    setSessionSeconds(0);
    setSessionRunning(true);
    setStepTimers(
      steps.map(() => ({
        duration: 0,
        remaining: 0,
        isRunning: false,
        spent: 0,
      }))
    );
  }, [recipe.id]);

  useEffect(() => {
    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sessionRunning) {
      sessionIntervalRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, [sessionRunning]);

  // Tick step timers
  useEffect(() => {
    const interval = setInterval(() => {
      setStepTimers((prev) =>
        prev.map((timer) => {
          if (!timer.isRunning || timer.remaining <= 0) {
            return timer;
          }
          const nextRemaining = timer.remaining - 1;
          return {
            ...timer,
            remaining: Math.max(0, nextRemaining),
            isRunning: nextRemaining <= 0 ? false : timer.isRunning,
            spent: timer.spent + 1,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Notify when a step timer finishes
  useEffect(() => {
    const prev = prevStepTimersRef.current;

    stepTimers.forEach((timer, idx) => {
      const prevTimer = prev[idx];
      if (
        prevTimer &&
        prevTimer.remaining > 0 &&
        timer.remaining === 0 &&
        prevTimer.isRunning
      ) {
        Alert.alert(
          "Hết giờ bước nấu",
          `Bước ${idx + 1} đã hết thời gian!`,
          [
            { text: "OK" },
            {
              text: "Chuyển tới bước kế",
              onPress: () => {
                if (idx === currentStep && currentStep < steps.length - 1) {
                  setCurrentStep((c) => c + 1);
                }
              },
            },
          ],
          { cancelable: true }
        );
      }
    });

    prevStepTimersRef.current = stepTimers;
  }, [stepTimers, currentStep, steps.length]);

  // Pause other step timers when switching
  useEffect(() => {
    setStepTimers((prev) =>
      prev.map((timer, idx) =>
        idx === currentStep ? timer : { ...timer, isRunning: false }
      )
    );
  }, [currentStep]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetSessionTimer = () => {
    setSessionSeconds(0);
    setSessionRunning(false);
  };

  const toggleSessionTimer = () => {
    setSessionRunning((prev) => !prev);
  };

  const setCurrentStepDuration = (seconds: number) => {
    setStepTimers((prev) => {
      const next = [...prev];
      const current = next[currentStep] || {
        duration: 0,
        remaining: 0,
        isRunning: false,
        spent: 0,
      };
      next[currentStep] = {
        ...current,
        duration: seconds,
        remaining: seconds,
        isRunning: false,
        spent: 0,
      };
      return next;
    });
  };

  const toggleCurrentStepTimer = () => {
    setStepTimers((prev) =>
      prev.map((timer, idx) => {
        if (idx !== currentStep) {
          return { ...timer, isRunning: false };
        }
        const hasTime = timer.remaining > 0 || timer.duration > 0;
        const remaining = hasTime ? timer.remaining || timer.duration : 60;
        return {
          ...timer,
          remaining,
          isRunning: !timer.isRunning,
        };
      })
    );
  };

  const resetCurrentStepTimer = () => {
    setStepTimers((prev) =>
      prev.map((timer, idx) =>
        idx === currentStep
          ? {
              ...timer,
              remaining: timer.duration,
              isRunning: false,
              spent: 0,
            }
          : timer
      )
    );
  };

  const saveTimerHistory = async (payload: any) => {
    try {
      const raw = await AsyncStorage.getItem(TIMER_HISTORY_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const updated = [payload, ...current].slice(0, 30);
      await AsyncStorage.setItem(TIMER_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn("Không thể lưu lịch sử timer", error);
    }
  };

  const buildNoteFromTimers = () => {
    const stepsNote = stepTimers
      .map((t, idx) => {
        if (!t.spent && !t.duration) return null;
        return `B${idx + 1}:${formatTime(Math.max(t.spent, t.duration || 0))}`;
      })
      .filter(Boolean)
      .join(", ");

    return `Timer tổng: ${formatTime(sessionSeconds)}${stepsNote ? ` | ${stepsNote}` : ""}`;
  };

  const handleFinishCooking = async () => {
    if (finishing) return;
    setFinishing(true);
    const finishedAt = passedDate ? new Date(passedDate) : new Date();
    const dateStr = passedDate || finishedAt.toISOString().split("T")[0];

    const historyEntry = {
      id: `${recipe.id}-${finishedAt.getTime()}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      finishedAt: finishedAt.toISOString(),
      totalSeconds: sessionSeconds,
      steps: stepTimers.map((t, idx) => ({
        step: idx + 1,
        description: steps[idx],
        plannedDuration: t.duration,
        spentSeconds: t.spent,
        remainingSeconds: t.remaining,
      })),
    };

    try {
      await saveTimerHistory(historyEntry);

      if (token) {
        // Chỉ ghi nhận 1 lần trong ngày cho món này
        const todayLogs = await getFoodLogsApi({ start: dateStr, end: dateStr });
        const alreadyLogged = todayLogs.data.some(
          (log) => log.recipeId === recipe.id
        );

        if (!alreadyLogged) {
          await createFoodLogApi({
            date: dateStr,
            mealType,
            recipeId: recipe.id,
            note: buildNoteFromTimers(),
          });
        }
      }

      Alert.alert("Hoàn thành!", "Đã lưu lịch sử nấu & đánh dấu món đã nấu", [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("Calendar", {
              selectedDate: dateStr,
            }),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message ||
          "Không thể lưu lịch sử. Vui lòng thử lại."
      );
    } finally {
      setFinishing(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinishCooking();
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

        {/* Session Timer */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Tổng thời gian nấu</Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(sessionSeconds)}</Text>
            <View style={styles.timerButtons}>
              <TouchableOpacity
                style={[styles.timerBtn, styles.resetBtn]}
                onPress={resetSessionTimer}
              >
                <Ionicons name="refresh" size={20} color="#f77" />
                <Text style={styles.timerBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerBtn, styles.playPauseBtn]}
                onPress={toggleSessionTimer}
              >
                <Ionicons
                  name={sessionRunning ? "pause" : "play"}
                  size={20}
                  color="#fff"
                />
                <Text style={[styles.timerBtnText, { color: "#fff" }]}>
                  {sessionRunning ? "Tạm dừng" : "Bắt đầu"}
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

              <View style={styles.stepTimerBox}>
                <View style={styles.stepTimerHeader}>
                  <Text style={styles.stepTimerTitle}>Timer cho bước này</Text>
                  <View style={styles.stepTimerBadges}>
                    <Text style={styles.stepTimerBadge}>
                      Đã chạy: {formatTime(stepTimers[currentStep]?.spent || 0)}
                    </Text>
                    {stepTimers[currentStep]?.duration ? (
                      <Text style={styles.stepTimerBadgeSecondary}>
                        Đặt: {formatTime(stepTimers[currentStep].duration)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.stepTimerRemaining}>
                  Còn lại: {formatTime(stepTimers[currentStep]?.remaining || 0)}
                </Text>

                <View style={styles.presetRow}>
                  {[60, 180, 300].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.presetBtn}
                      onPress={() => setCurrentStepDuration(s)}
                    >
                      <Text style={styles.presetText}>{`${Math.round(s / 60)} phút`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.timerButtons}>
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.resetBtn]}
                    onPress={resetCurrentStepTimer}
                  >
                    <Ionicons name="refresh" size={18} color="#f77" />
                    <Text style={styles.timerBtnText}>Reset bước</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timerBtn, styles.playPauseBtn]}
                    onPress={toggleCurrentStepTimer}
                  >
                    <Ionicons
                      name={stepTimers[currentStep]?.isRunning ? "pause" : "play"}
                      size={18}
                      color="#fff"
                    />
                    <Text style={[styles.timerBtnText, { color: "#fff" }]}>
                      {stepTimers[currentStep]?.isRunning ? "Tạm dừng" : "Bắt đầu"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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

        {/* Meal type + finish */}
        <View style={styles.finishSection}>
          <Text style={styles.finishLabel}>Đánh dấu bữa ăn</Text>
          <View style={styles.mealChips}>
            {["breakfast", "lunch", "dinner", "snack"].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.mealChip,
                  mealType === m && styles.mealChipActive,
                ]}
                onPress={() => setMealType(m as any)}
              >
                <Text
                  style={[
                    styles.mealChipText,
                    mealType === m && styles.mealChipTextActive,
                  ]}
                >
                  {m === "breakfast"
                    ? "Sáng"
                    : m === "lunch"
                    ? "Trưa"
                    : m === "dinner"
                    ? "Tối"
                    : "Phụ"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.finishBtn, finishing && { opacity: 0.6 }]}
            onPress={handleFinishCooking}
            disabled={finishing}
          >
            <Ionicons name="checkmark-done" color="#fff" size={20} />
            <Text style={styles.finishBtnText}>
              Hoàn thành & lưu lịch sử
            </Text>
          </TouchableOpacity>
        </View>

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
                {stepTimers[idx]?.spent ? (
                  <Text style={styles.stepOverviewTimer}>
                    {formatTime(stepTimers[idx].spent)}
                  </Text>
                ) : null}
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
  stepTimerBox: {
    marginTop: 16,
    backgroundColor: "#fff9f9",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffe0e4",
    gap: 10,
  },
  stepTimerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepTimerTitle: { fontWeight: "700", color: "#d55" },
  stepTimerBadges: { flexDirection: "row", gap: 8 },
  stepTimerBadge: {
    backgroundColor: "#ffe0e4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: "#d55",
    fontSize: 12,
    fontWeight: "600",
  },
  stepTimerBadgeSecondary: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
  },
  stepTimerRemaining: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f77",
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f77",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  presetText: {
    color: "#f77",
    fontWeight: "600",
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
  stepOverviewTimer: {
    color: "#888",
    fontSize: 12,
    marginLeft: 8,
  },
  finishSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  finishLabel: {
    fontSize: 14,
    color: "#777",
  },
  mealChips: { flexDirection: "row", gap: 8 },
  mealChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f77",
    backgroundColor: "#fff",
  },
  mealChipActive: {
    backgroundColor: "#f77",
  },
  mealChipText: { color: "#f77", fontWeight: "600" },
  mealChipTextActive: { color: "#fff" },
  finishBtn: {
    backgroundColor: "#f77",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  finishBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

