import React, { useState, useEffect } from "react";
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
import TabBar from "./TabBar";
import { getPreferencesApi, updatePreferencesApi, UserPreferences } from "../api/users";
import { getFoodLogStatsApi } from "../api/food-log";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Personal info
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [age, setAge] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [activity, setActivity] = useState<"low" | "medium" | "high" | "">("");
  const [goal, setGoal] = useState<"lose_weight" | "maintain" | "gain_muscle" | "">("");
  
  // Nutrition goals
  const [dailyKcalTarget, setDailyKcalTarget] = useState<string>("2000");
  const [proteinTarget, setProteinTarget] = useState<string>("");
  const [fatTarget, setFatTarget] = useState<string>("");
  const [carbsTarget, setCarbsTarget] = useState<string>("");
  
  // Calculated values
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [autoCalculated, setAutoCalculated] = useState(false);
  
  // Today's stats
  const [todayStats, setTodayStats] = useState<{
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  } | null>(null);

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
        setDailyKcalTarget(prefs.dailyKcalTarget?.toString() || "2000");
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error("Error loading preferences:", error);
      }
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

  useEffect(() => {
    loadPreferences();
    loadTodayStats();
  }, []);

  // Auto calculate when personal info changes
  useEffect(() => {
    if (gender && age && height && weight && activity && goal) {
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
        setDailyKcalTarget(targetCalories.toString());
        setProteinTarget(macros.protein.toString());
        setFatTarget(macros.fat.toString());
        setCarbsTarget(macros.carbs.toString());
        setAutoCalculated(true);
      }
    }
  }, [gender, age, height, weight, activity, goal]);

  // Recalculate macros when calories change
  useEffect(() => {
    if (goal && dailyKcalTarget) {
      const calories = parseInt(dailyKcalTarget);
      if (calories > 0) {
        const macros = calculateMacroGoals(calories, goal);
        setProteinTarget(macros.protein.toString());
        setFatTarget(macros.fat.toString());
        setCarbsTarget(macros.carbs.toString());
      }
    }
  }, [dailyKcalTarget, goal]);

  const handleSave = async () => {
    // Validation
    if (!gender || !age || !height || !weight || !activity || !goal) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin cá nhân");
      return;
    }

    if (!dailyKcalTarget || parseInt(dailyKcalTarget) < 500) {
      Alert.alert("Lỗi", "Mục tiêu calories phải lớn hơn 500");
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
      };

      await updatePreferencesApi(preferences);
      Alert.alert("Thành công", "Mục tiêu dinh dưỡng đã được lưu!", [
        { text: "OK", onPress: () => navigation.goBack() }
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
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Nhập tuổi"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Chiều cao (cm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder="170"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Cân nặng (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="70"
              />
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
          <Text style={styles.sectionTitle}>Mục tiêu dinh dưỡng hàng ngày</Text>
          {autoCalculated && (
            <View style={styles.autoCalculatedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.autoCalculatedText}>Đã tính toán tự động</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calories (kcal)</Text>
            <TextInput
              style={styles.input}
              value={dailyKcalTarget}
              onChangeText={setDailyKcalTarget}
              keyboardType="numeric"
              placeholder="2000"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={proteinTarget}
                onChangeText={setProteinTarget}
                keyboardType="numeric"
                placeholder="150"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                value={fatTarget}
                onChangeText={setFatTarget}
                keyboardType="numeric"
                placeholder="55"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={carbsTarget}
              onChangeText={setCarbsTarget}
              keyboardType="numeric"
              placeholder="225"
            />
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
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

