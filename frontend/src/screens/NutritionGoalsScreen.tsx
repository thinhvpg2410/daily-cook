import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import TabBar from "./TabBar";
import { getPreferencesApi, updatePreferencesApi, UserPreferences } from "../api/users";
import { getFoodLogStatsApi } from "../api/food-log";
import { calculateCalorieGoal, CalculateCalorieGoalResponse } from "../api/ai";
import { useAuth } from "../context/AuthContext";

// Tính toán BMR (Basal Metabolic Rate) - Mifflin-St Jeor Equation
function calculateBMR(gender: string, age: number, height: number, weight: number): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Tính toán TDEE (Total Daily Energy Expenditure)
function calculateTDEE(bmr: number, activity: string): number {
  const multipliers: Record<string, number> = {
    low: 1.2,      // Ít vận động
    medium: 1.55,  // Vận động vừa phải
    high: 1.725,   // Vận động nhiều
  };
  return Math.round(bmr * (multipliers[activity] || 1.2));
}

// Tính toán mục tiêu calories dựa trên goal
function calculateTargetCalories(tdee: number, goal: string): number {
  const adjustments: Record<string, number> = {
    lose_weight: -500,    // Giảm 500 cal để giảm cân
    maintain: 0,          // Giữ nguyên
    gain_muscle: 300,     // Tăng 300 cal để tăng cơ
  };
  return Math.max(1200, Math.round(tdee + (adjustments[goal] || 0)));
}

// Tính toán macro goals (protein, fat, carbs) dựa trên calories và goal
function calculateMacroGoals(calories: number, goal: string) {
  let proteinPercent = 0.3; // 30% protein
  let fatPercent = 0.25;    // 25% fat
  let carbsPercent = 0.45;  // 45% carbs

  // Điều chỉnh theo goal
  if (goal === "lose_weight") {
    proteinPercent = 0.35; // Tăng protein
    fatPercent = 0.25;
    carbsPercent = 0.40;
  } else if (goal === "gain_muscle") {
    proteinPercent = 0.35; // Tăng protein
    fatPercent = 0.20;
    carbsPercent = 0.45;
  }

  const protein = Math.round((calories * proteinPercent) / 4); // 4 cal/g protein
  const fat = Math.round((calories * fatPercent) / 9);         // 9 cal/g fat
  const carbs = Math.round((calories * carbsPercent) / 4);     // 4 cal/g carbs

  return { protein, fat, carbs };
}

export default function NutritionGoalsScreen({ navigation }: any) {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiCalculating, setAiCalculating] = useState(false);
  
  // Mode: 'ai' or 'custom'
  const [mode, setMode] = useState<"ai" | "custom">("ai");
  
  // Personal info
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [age, setAge] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [activity, setActivity] = useState<"low" | "medium" | "high" | "">("");
  const [goal, setGoal] = useState<"lose_weight" | "maintain" | "gain_muscle" | "">("");
  
  // Nutrition goals
  const [dailyKcalTarget, setDailyKcalTarget] = useState<string>("");
  const [proteinTarget, setProteinTarget] = useState<string>("");
  const [fatTarget, setFatTarget] = useState<string>("");
  const [carbsTarget, setCarbsTarget] = useState<string>("");
  
  // Calculated values
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [autoCalculated, setAutoCalculated] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  
  // Today's stats
  const [todayStats, setTodayStats] = useState<{
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  } | null>(null);

  // Refs for TextInputs to fix clearing issue
  const ageInputRef = useRef<TextInput>(null);
  const heightInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);
  const kcalInputRef = useRef<TextInput>(null);
  const proteinInputRef = useRef<TextInput>(null);
  const fatInputRef = useRef<TextInput>(null);
  const carbsInputRef = useRef<TextInput>(null);

  const loadPreferences = async () => {
    try {
      const res = await getPreferencesApi();
      const prefs = res.data;
      
      if (prefs) {
        setGender(prefs.gender || "");
        setAge(prefs.age?.toString() || "");
        setHeight(prefs.height?.toString() || "");
        setWeight(prefs.weight?.toString() || "");
        setActivity(prefs.activity || "");
        setGoal(prefs.goal || "");
        setDailyKcalTarget(prefs.dailyKcalTarget?.toString() || "");
        
        // Recalculate macros from saved preferences
        if (prefs.dailyKcalTarget && prefs.goal) {
          const macros = calculateMacroGoals(prefs.dailyKcalTarget, prefs.goal);
          setProteinTarget(macros.protein.toString());
          setFatTarget(macros.fat.toString());
          setCarbsTarget(macros.carbs.toString());
          // Set mode based on whether we have full personal info
          if (prefs.gender && prefs.age && prefs.height && prefs.weight && prefs.activity && prefs.goal) {
            setMode("ai"); // Default to AI mode if we have full info
          } else {
            setMode("custom");
          }
        } else {
          // Set empty if no data
          setProteinTarget("");
          setFatTarget("");
          setCarbsTarget("");
          setMode("custom");
        }
      } else {
        // Set empty defaults if no preferences
        setDailyKcalTarget("");
        setProteinTarget("");
        setFatTarget("");
        setCarbsTarget("");
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error("Error loading preferences:", error);
      }
      // Set empty on error
      setDailyKcalTarget("");
      setProteinTarget("");
      setFatTarget("");
      setCarbsTarget("");
    } finally {
      setLoading(false);
    }
  };

  const loadTodayStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      
      const res = await getFoodLogStatsApi(todayStr, todayStr);
      if (res.data?.daily && res.data.daily.length > 0) {
        const todayData = res.data.daily[0];
        setTodayStats({
          calories: todayData.calories || 0,
          protein: todayData.protein || 0,
          fat: todayData.fat || 0,
          carbs: todayData.carbs || 0,
        });
      }
    } catch (error) {
      // Ignore errors, just don't show today's stats
      console.log("No stats for today yet");
    }
  };

  // Load data on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
      loadTodayStats();
    }, [])
  );

  // Calculate with AI when in AI mode and all info is available
  const calculateWithAI = async () => {
    if (!gender || !age || !height || !weight || !activity || !goal || !token) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin cá nhân trước khi sử dụng AI.");
      return;
    }

    const ageNum = parseInt(age);
    const heightNum = parseInt(height);
    const weightNum = parseFloat(weight);

    if (ageNum <= 0 || heightNum <= 0 || weightNum <= 0) {
      Alert.alert("Dữ liệu không hợp lệ", "Vui lòng kiểm tra lại thông tin cá nhân.");
      return;
    }

    setAiCalculating(true);
    try {
      const result: CalculateCalorieGoalResponse = await calculateCalorieGoal({
        gender,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        activity,
        goal,
      });

      // Apply AI results
      setBmr(result.bmr);
      setTdee(result.tdee);
      setDailyKcalTarget(result.dailyKcalTarget.toString());
      setProteinTarget(result.protein.toString());
      setFatTarget(result.fat.toString());
      setCarbsTarget(result.carbs.toString());
      setAiExplanation(result.explanation);
      setAutoCalculated(true);
      setMode("ai"); // Ensure we're in AI mode
    } catch (error: any) {
      console.error("AI calculation error:", error);
      // Fallback to manual calculation
      const calculatedBMR = calculateBMR(gender, ageNum, heightNum, weightNum);
      const calculatedTDEE = calculateTDEE(calculatedBMR, activity);
      const targetCalories = calculateTargetCalories(calculatedTDEE, goal);
      const macros = calculateMacroGoals(targetCalories, goal);

      setBmr(Math.round(calculatedBMR));
      setTdee(calculatedTDEE);
      setDailyKcalTarget(targetCalories.toString());
      setProteinTarget(macros.protein.toString());
      setFatTarget(macros.fat.toString());
      setCarbsTarget(macros.carbs.toString());
      setAiExplanation("Đã tính toán tự động (AI không khả dụng).");
      setAutoCalculated(true);

      Alert.alert(
        "AI không khả dụng",
        "Đã sử dụng tính toán thủ công. Vui lòng kiểm tra kết nối hoặc thử lại sau."
      );
    } finally {
      setAiCalculating(false);
    }
  };

  // Auto calculate with AI when personal info changes (only in AI mode)
  useEffect(() => {
    // Only auto-calculate if we're not loading initial data
    if (loading) return;

    if (mode === "ai" && gender && age && height && weight && activity && goal && token) {
      const ageNum = parseInt(age);
      const heightNum = parseInt(height);
      const weightNum = parseFloat(weight);

      if (ageNum > 0 && heightNum > 0 && weightNum > 0) {
        // Auto-calculate with AI when all fields are filled (debounced)
        const timer = setTimeout(() => {
          calculateWithAI();
        }, 1500); // Debounce 1.5 seconds to avoid too many calls

        return () => clearTimeout(timer);
      }
    } else if (mode === "custom" && gender && age && height && weight && activity && goal) {
      // Manual calculation in custom mode
      const ageNum = parseInt(age);
      const heightNum = parseInt(height);
      const weightNum = parseFloat(weight);

      if (ageNum > 0 && heightNum > 0 && weightNum > 0) {
        const calculatedBMR = calculateBMR(gender, ageNum, heightNum, weightNum);
        const calculatedTDEE = calculateTDEE(calculatedBMR, activity);
        const targetCalories = calculateTargetCalories(calculatedTDEE, goal);
        const macros = calculateMacroGoals(targetCalories, goal);

        setBmr(Math.round(calculatedBMR));
        setTdee(calculatedTDEE);
        // In custom mode, auto-fill if empty
        if (!dailyKcalTarget || dailyKcalTarget.trim() === "") {
          setDailyKcalTarget(targetCalories.toString());
        }
        if (!proteinTarget || proteinTarget.trim() === "" || 
            !fatTarget || fatTarget.trim() === "" || 
            !carbsTarget || carbsTarget.trim() === "") {
          setProteinTarget(macros.protein.toString());
          setFatTarget(macros.fat.toString());
          setCarbsTarget(macros.carbs.toString());
        }
        setAutoCalculated(true);
      }
    }
  }, [gender, age, height, weight, activity, goal, mode]);

  // Recalculate macros when calories change (only in custom mode)
  useEffect(() => {
    if (mode === "custom" && goal && dailyKcalTarget && dailyKcalTarget.trim() !== "") {
      const calories = parseInt(dailyKcalTarget);
      if (calories > 0) {
        const macros = calculateMacroGoals(calories, goal);
        // Only auto-fill if all macro fields are empty
        if ((!proteinTarget || proteinTarget.trim() === "") && 
            (!fatTarget || fatTarget.trim() === "") && 
            (!carbsTarget || carbsTarget.trim() === "")) {
          setProteinTarget(macros.protein.toString());
          setFatTarget(macros.fat.toString());
          setCarbsTarget(macros.carbs.toString());
        }
      }
    }
  }, [dailyKcalTarget, goal, mode]);

  const handleSave = async () => {
    // Validation
    if (!gender || !age || !height || !weight || !activity || !goal) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin cá nhân");
      return;
    }

    if (!dailyKcalTarget || dailyKcalTarget.trim() === "" || parseInt(dailyKcalTarget) < 500) {
      Alert.alert("Lỗi", "Mục tiêu calories phải lớn hơn 500");
      return;
    }

    if (!proteinTarget || proteinTarget.trim() === "" || parseInt(proteinTarget) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập mục tiêu protein hợp lệ");
      return;
    }

    if (!fatTarget || fatTarget.trim() === "" || parseInt(fatTarget) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập mục tiêu fat hợp lệ");
      return;
    }

    if (!carbsTarget || carbsTarget.trim() === "" || parseInt(carbsTarget) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập mục tiêu carbs hợp lệ");
      return;
    }

    setSaving(true);
    try {
      const preferences: UserPreferences = {
        gender,
        age: parseInt(age),
        height: parseInt(height),
        weight: parseFloat(weight),
        activity,
        goal,
        dailyKcalTarget: parseInt(dailyKcalTarget),
        // Note: Backend không có fields riêng cho protein/fat/carbs targets
        // Chúng sẽ được tính toán lại từ dailyKcalTarget và goal
      };

      // Save to backend
      const savedPreferences = await updatePreferencesApi(preferences);
      
      // Reload preferences để đảm bảo sync với backend
      await loadPreferences();
      
      // Reload today stats để cập nhật progress bars
      await loadTodayStats();

      Alert.alert("Thành công", "Mục tiêu dinh dưỡng đã được lưu và đồng bộ!", [
        { 
          text: "OK", 
          onPress: () => {
            // Navigate back and notify parent screens to refresh
            navigation.goBack();
          }
        }
      ]);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getProgressColor = (current: number, target: number): string => {
    const percent = (current / target) * 100;
    if (percent < 80) return "#4CAF50"; // Green
    if (percent <= 100) return "#FF9800"; // Orange
    return "#F44336"; // Red
  };

  const getProgressPercent = (current: number, target: number): number => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#f77" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#f77" />
          </TouchableOpacity>
          <Text style={styles.title}>Mục tiêu dinh dưỡng</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderButton, gender === "male" && styles.genderButtonActive]}
                onPress={() => setGender("male")}
              >
                <Text style={[styles.genderText, gender === "male" && styles.genderTextActive]}>Nam</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === "female" && styles.genderButtonActive]}
                onPress={() => setGender("female")}
              >
                <Text style={[styles.genderText, gender === "female" && styles.genderTextActive]}>Nữ</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tuổi</Text>
            <View style={styles.inputWithClear}>
              <TextInput
                ref={ageInputRef}
                style={[styles.input, styles.inputFullWidth]}
                value={age}
                onChangeText={(text) => {
                  if (text === "" || text.trim() === "") {
                    setAge("");
                    setAutoCalculated(false);
                    return;
                  }
                  const numericValue = text.replace(/[^0-9]/g, "");
                  setAge(numericValue);
                }}
                keyboardType="numeric"
                placeholder="Nhập tuổi"
                placeholderTextColor="#999"
                selectTextOnFocus
              />
              {age && (
                <TouchableOpacity
                  style={styles.clearButtonInline}
                  onPress={() => {
                    setAge("");
                    ageInputRef.current?.focus();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Chiều cao (cm)</Text>
              <View style={styles.inputWithClear}>
                <TextInput
                  ref={heightInputRef}
                  style={[styles.input, styles.inputFullWidth]}
                  value={height}
                  onChangeText={(text) => {
                    if (text === "" || text.trim() === "") {
                      setHeight("");
                      setAutoCalculated(false);
                      return;
                    }
                    const numericValue = text.replace(/[^0-9]/g, "");
                    setHeight(numericValue);
                  }}
                  keyboardType="numeric"
                  placeholder="170"
                  placeholderTextColor="#999"
                  selectTextOnFocus
                />
                {height && (
                  <TouchableOpacity
                    style={styles.clearButtonInline}
                    onPress={() => {
                      setHeight("");
                      heightInputRef.current?.focus();
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Cân nặng (kg)</Text>
              <View style={styles.inputWithClear}>
                <TextInput
                  ref={weightInputRef}
                  style={[styles.input, styles.inputFullWidth]}
                  value={weight}
                  onChangeText={(text) => {
                    if (text === "" || text.trim() === "") {
                      setWeight("");
                      setAutoCalculated(false);
                      return;
                    }
                    // Allow decimal point
                    const numericValue = text.replace(/[^0-9.]/g, "");
                    // Only allow one decimal point
                    const parts = numericValue.split(".");
                    if (parts.length > 2) {
                      setWeight(parts[0] + "." + parts.slice(1).join(""));
                    } else {
                      setWeight(numericValue);
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="70"
                  placeholderTextColor="#999"
                  selectTextOnFocus
                />
                {weight && (
                  <TouchableOpacity
                    style={styles.clearButtonInline}
                    onPress={() => {
                      setWeight("");
                      weightInputRef.current?.focus();
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mức độ hoạt động</Text>
            <View style={styles.optionsContainer}>
              {(["low", "medium", "high"] as const).map((act) => (
                <TouchableOpacity
                  key={act}
                  style={[styles.optionButton, activity === act && styles.optionButtonActive]}
                  onPress={() => setActivity(act)}
                >
                  <Text style={[styles.optionText, activity === act && styles.optionTextActive]}>
                    {act === "low" ? "Ít vận động" : act === "medium" ? "Vận động vừa" : "Vận động nhiều"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mục tiêu</Text>
            <View style={styles.optionsContainer}>
              {(["lose_weight", "maintain", "gain_muscle"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionButton, goal === g && styles.optionButtonActive]}
                  onPress={() => setGoal(g)}
                >
                  <Text style={[styles.optionText, goal === g && styles.optionTextActive]}>
                    {g === "lose_weight" ? "Giảm cân" : g === "maintain" ? "Duy trì" : "Tăng cơ"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calculated BMR and TDEE */}
          {bmr && tdee && (
            <View style={styles.calculatedInfo}>
              <View style={styles.calculatedItem}>
                <Text style={styles.calculatedLabel}>BMR (Calo cơ bản)</Text>
                <Text style={styles.calculatedValue}>{bmr} kcal</Text>
              </View>
              <View style={styles.calculatedItem}>
                <Text style={styles.calculatedLabel}>TDEE (Tổng calo/ngày)</Text>
                <Text style={styles.calculatedValue}>{tdee} kcal</Text>
              </View>
            </View>
          )}
        </View>

        {/* Nutrition Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Mục tiêu dinh dưỡng hàng ngày</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, mode === "ai" && styles.modeButtonActive]}
                onPress={() => {
                  setMode("ai");
                  if (gender && age && height && weight && activity && goal) {
                    calculateWithAI();
                  }
                }}
                disabled={aiCalculating}
              >
                <Ionicons 
                  name="sparkles" 
                  size={16} 
                  color={mode === "ai" ? "#fff" : "#f77"} 
                />
                <Text style={[styles.modeButtonText, mode === "ai" && styles.modeButtonTextActive]}>
                  AI
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === "custom" && styles.modeButtonActive]}
                onPress={() => setMode("custom")}
              >
                <Ionicons 
                  name="create-outline" 
                  size={16} 
                  color={mode === "custom" ? "#fff" : "#f77"} 
                />
                <Text style={[styles.modeButtonText, mode === "custom" && styles.modeButtonTextActive]}>
                  Tùy chỉnh
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {mode === "ai" && (
            <TouchableOpacity
              style={styles.aiCalculateButton}
              onPress={calculateWithAI}
              disabled={aiCalculating || !gender || !age || !height || !weight || !activity || !goal}
            >
              {aiCalculating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.aiCalculateButtonText}>Tính toán với AI</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {autoCalculated && (
            <View style={styles.autoCalculatedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.autoCalculatedText}>
                {mode === "ai" ? "Đã tính toán với AI" : "Đã tính toán tự động"}
              </Text>
            </View>
          )}

          {mode === "ai" && aiExplanation && (
            <View style={styles.aiExplanationBox}>
              <Ionicons name="information-circle" size={16} color="#f77" />
              <Text style={styles.aiExplanationText}>{aiExplanation}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calories (kcal)</Text>
            <View style={styles.inputWithClear}>
              <TextInput
                ref={kcalInputRef}
                style={[styles.input, styles.inputFullWidth]}
              value={dailyKcalTarget}
              onChangeText={(text) => {
                // Allow clearing
                if (text === "" || text.trim() === "") {
                  setDailyKcalTarget("");
                  setAutoCalculated(false);
                  return;
                }
                // Only allow numbers
                const numericValue = text.replace(/[^0-9]/g, "");
                if (numericValue !== text) {
                  // If we removed characters, user might be editing
                  setAutoCalculated(false);
                }
                setDailyKcalTarget(numericValue);
              }}
                keyboardType="numeric"
                placeholder="2000"
                placeholderTextColor="#999"
                editable={mode === "custom"}
                selectTextOnFocus={mode === "custom"}
              />
              {mode === "custom" && dailyKcalTarget && (
                <TouchableOpacity
                  style={styles.clearButtonInline}
                  onPress={() => {
                    setDailyKcalTarget("");
                    kcalInputRef.current?.focus();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Protein (g)</Text>
              <View style={styles.inputWithClear}>
                <TextInput
                  ref={proteinInputRef}
                  style={[styles.input, styles.inputFullWidth]}
                  value={proteinTarget}
                  onChangeText={(text) => {
                    if (text === "") {
                      setProteinTarget("");
                      return;
                    }
                    const numericValue = text.replace(/[^0-9]/g, "");
                    setProteinTarget(numericValue);
                  }}
                  keyboardType="numeric"
                  placeholder="150"
                  placeholderTextColor="#999"
                  editable={mode === "custom"}
                  selectTextOnFocus={mode === "custom"}
                />
                {mode === "custom" && proteinTarget && (
                  <TouchableOpacity
                    style={styles.clearButtonInline}
                    onPress={() => {
                      setProteinTarget("");
                      proteinInputRef.current?.focus();
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Fat (g)</Text>
              <View style={styles.inputWithClear}>
                <TextInput
                  ref={fatInputRef}
                  style={[styles.input, styles.inputFullWidth]}
                  value={fatTarget}
                  onChangeText={(text) => {
                    if (text === "") {
                      setFatTarget("");
                      return;
                    }
                    const numericValue = text.replace(/[^0-9]/g, "");
                    setFatTarget(numericValue);
                  }}
                  keyboardType="numeric"
                  placeholder="55"
                  placeholderTextColor="#999"
                  editable={mode === "custom"}
                  selectTextOnFocus={mode === "custom"}
                />
                {mode === "custom" && fatTarget && (
                  <TouchableOpacity
                    style={styles.clearButtonInline}
                    onPress={() => {
                      setFatTarget("");
                      fatInputRef.current?.focus();
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Carbs (g)</Text>
            <View style={styles.inputWithClear}>
              <TextInput
                ref={carbsInputRef}
                style={[styles.input, styles.inputFullWidth]}
                value={carbsTarget}
                onChangeText={(text) => {
                  if (text === "") {
                    setCarbsTarget("");
                    return;
                  }
                  const numericValue = text.replace(/[^0-9]/g, "");
                  setCarbsTarget(numericValue);
                }}
                keyboardType="numeric"
                placeholder="225"
                placeholderTextColor="#999"
                editable={mode === "custom"}
                selectTextOnFocus={mode === "custom"}
              />
              {mode === "custom" && carbsTarget && (
                <TouchableOpacity
                  style={styles.clearButtonInline}
                  onPress={() => {
                    setCarbsTarget("");
                    carbsInputRef.current?.focus();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Today's Progress Section */}
        {todayStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tiến độ hôm nay</Text>
            
            {["calories", "protein", "fat", "carbs"].map((macro) => {
              const target = macro === "calories" 
                ? parseInt(dailyKcalTarget) 
                : macro === "protein"
                ? parseInt(proteinTarget)
                : macro === "fat"
                ? parseInt(fatTarget)
                : parseInt(carbsTarget);
              
              const current = todayStats[macro as keyof typeof todayStats];
              const percent = getProgressPercent(current, target);
              const color = getProgressColor(current, target);
              const label = macro === "calories" ? "Calories" : macro.charAt(0).toUpperCase() + macro.slice(1);

              return (
                <View key={macro} style={styles.progressItem}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{label}</Text>
                    <Text style={styles.progressText}>
                      {current} / {target} {macro === "calories" ? "kcal" : "g"} ({percent}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${Math.min(100, percent)}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Lưu mục tiêu</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      <View style={{ marginBottom: 50 }}>
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#f77",
  },
  section: {
    backgroundColor: "#fff0f3",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  modeToggle: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    padding: 4,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modeButtonActive: {
    backgroundColor: "#f77",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f77",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  aiCalculateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f77",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  aiCalculateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  aiExplanationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff9e6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  aiExplanationText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  inputWithClear: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  inputFullWidth: {
    flex: 1,
  },
  clearButton: {
    position: "absolute",
    right: 8,
    padding: 4,
  },
  clearButtonInline: {
    marginLeft: 8,
    padding: 4,
  },
  genderContainer: {
    flexDirection: "row",
    gap: 12,
  },
  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  genderButtonActive: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  genderText: {
    fontSize: 15,
    color: "#333",
  },
  genderTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  optionButtonActive: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  optionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  calculatedInfo: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  calculatedItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  calculatedLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  calculatedValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f77",
  },
  autoCalculatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  autoCalculatedText: {
    fontSize: 12,
    color: "#4CAF50",
    marginLeft: 6,
    fontWeight: "600",
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#f77",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

