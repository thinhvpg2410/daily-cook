import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  suggestMenuApi,
  upsertMealPlanApi,
  patchMealPlanSlotApi,
  getMealPlansApi,
} from "../api/mealplan";
import { chatWithAI, suggestFromChat } from "../api/ai";
import { getPreferencesApi } from "../api/users";
import { useAuth } from "../context/AuthContext";
import TabBar from "./TabBar";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

function normalizeImage(src?: string | null) {
  if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `http://localhost:3000${src}`;
  return src;
}

type Message = {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Recipe = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  cookTime?: number | null;
  totalKcal?: number | null;
  tags?: string[];
};

type TabType = "chat" | "filter";

export default function MealSuggestScreen({ navigation }: any) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [region, setRegion] = useState("All");
  const [dietType, setDietType] = useState("normal");
  const [targetKcal, setTargetKcal] = useState<number>(2000);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "Xin chào! Tôi có thể giúp bạn tìm món ăn phù hợp. Bạn muốn ăn gì hôm nay? 😊",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [suggestionData, setSuggestionData] = useState<{
    totalKcal: number;
    dailyKcalTarget: number;
    withinLimit: boolean;
  } | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  // Load user preferences on mount and when screen is focused
  useEffect(() => {
    loadUserPreferences();
    // Auto-suggest based on current time
    autoSuggestBasedOnTime();
  }, []);

  // Reload preferences when screen is focused (e.g., after updating in NutritionGoalsScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserPreferences();
    });

    return unsubscribe;
  }, [navigation]);

  // Load user preferences
  const loadUserPreferences = async () => {
    try {
      const prefs = await getPreferencesApi();
      if (prefs.data) {
        setUserPreferences(prefs.data);
        setTargetKcal(prefs.data.dailyKcalTarget || 2000);
        setDietType(prefs.data.dietType || "normal");
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  // Auto-suggest based on current time
  const autoSuggestBasedOnTime = async () => {
    const hour = new Date().getHours();
    let slot: "breakfast" | "lunch" | "dinner" = "lunch";
    if (hour < 10) slot = "breakfast";
    else if (hour < 16) slot = "lunch";
    else slot = "dinner";

    // Add quick suggestion message
    const quickMessage: Message = {
      id: Date.now().toString(),
      type: "assistant",
      content: `💡 Gợi ý: Bạn có thể hỏi tôi về món ăn cho ${slot === "breakfast" ? "bữa sáng" : slot === "lunch" ? "bữa trưa" : "bữa tối"} hôm nay, hoặc sử dụng bộ lọc bên dưới để tìm món phù hợp!`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, quickMessage]);
  };

  // Quick suggestions based on time
  const getQuickSuggestions = () => {
    const hour = new Date().getHours();
    const suggestions = [];
    
    if (hour < 10) {
      suggestions.push({ text: "Gợi ý món sáng", slot: "breakfast" });
      suggestions.push({ text: "Món ăn nhẹ", slot: "breakfast" });
    } else if (hour < 16) {
      suggestions.push({ text: "Gợi ý món trưa", slot: "lunch" });
      suggestions.push({ text: "Món nhanh", slot: "lunch" });
    } else {
      suggestions.push({ text: "Gợi ý món tối", slot: "dinner" });
      suggestions.push({ text: "Món đầy đủ", slot: "dinner" });
    }
    
    suggestions.push({ text: "Món chay", slot: "all" });
    suggestions.push({ text: "Món ít calo", slot: "all" });
    
    return suggestions;
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const onSuggest = async () => {
    setLoading(true);
    try {
      const res = await suggestMenuApi({
        date: selectedDate,
        slot: "all",
        region: region !== "All" ? (region as "Northern" | "Central" | "Southern") : undefined,
        vegetarian: dietType === "vegan",
        persist: false,
      });

      const suggestedRecipes = res.data?.dishes || [];
      const totalKcal = res.data?.totalKcal || 0;
      const dailyKcalTarget = res.data?.dailyKcalTarget || targetKcal;
      const withinLimit = res.data?.withinLimit ?? true;

      setRecipes(suggestedRecipes);
      setSuggestionData({
        totalKcal,
        dailyKcalTarget,
        withinLimit,
      });

      const suggestionMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `Tôi đã tìm thấy ${suggestedRecipes.length} món ăn phù hợp (${Math.round(totalKcal)}/${Math.round(dailyKcalTarget)} kcal)! ${withinLimit ? "✅ Phù hợp với mục tiêu của bạn." : "⚠️ Vượt quá một chút so với mục tiêu."} Bạn có thể xem và chọn món để thêm vào lịch. 🍽️`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, suggestionMessage]);
      setActiveTab("chat"); // Switch to chat tab to see results
    } catch (err) {
      console.error("Error suggesting meals:", err);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "Xin lỗi, đã có lỗi xảy ra khi tìm món ăn. Vui lòng thử lại!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSuggestion = async (text: string, slot: string) => {
    setInputText(text);
    setActiveTab("chat");
    
    // Simulate sending the message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const suggestions = await suggestFromChat(text, selectedDate);
      
      // Handle clarification request
      if (suggestions.needsClarification && suggestions.clarificationQuestion) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: "assistant",
          content: suggestions.clarificationQuestion,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        return;
      }

      const suggestedRecipes = suggestions.dishes || [];
      const totalKcal = suggestions.totalKcal || 0;
      const dailyKcalTarget = suggestions.dailyKcalTarget || targetKcal;
      const withinLimit = suggestions.withinLimit ?? true;

      if (suggestedRecipes.length > 0) {
        setRecipes(suggestedRecipes);
        setSuggestionData({
          totalKcal,
          dailyKcalTarget,
          withinLimit,
        });
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: "assistant",
          content: `Tôi đã tìm thấy ${suggestedRecipes.length} món ăn phù hợp (${Math.round(totalKcal)}/${Math.round(dailyKcalTarget)} kcal):\n\n${suggestedRecipes
            .map(
              (r: Recipe, idx: number) =>
                `${idx + 1}. ${r.title}${r.totalKcal ? ` (~${Math.round(r.totalKcal)} kcal)` : ""}`
            )
            .join("\n")}\n\n${withinLimit ? "✅ Phù hợp với mục tiêu của bạn." : "⚠️ Vượt quá một chút so với mục tiêu."}\n\nBạn có thể xem chi tiết và chọn món để thêm vào lịch! 🍽️`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setShowSuggestionModal(true);
      } else {
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: "assistant",
          content: "Xin lỗi, tôi không tìm thấy món ăn phù hợp với yêu cầu của bạn. Vui lòng thử lại với yêu cầu khác hoặc cung cấp thêm thông tin.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Error in quick suggestion:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại hoặc cung cấp thêm thông tin về yêu cầu của bạn.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddToCalendar = async (
    recipeId: string,
    slot: "breakfast" | "lunch" | "dinner"
  ) => {
    try {
      let mealPlanId: string;
      try {
        const plansRes = await getMealPlansApi({
          start: selectedDate,
          end: selectedDate,
        });
        const plans = plansRes.data || [];
        const existingPlan = plans.find((p: any) => p.date === selectedDate);

        if (existingPlan) {
          mealPlanId = existingPlan.id;
        } else {
          const createRes = await upsertMealPlanApi({
            date: selectedDate,
            slots: { breakfast: [], lunch: [], dinner: [] },
          });
          mealPlanId = createRes.data.id;
        }
      } catch (error) {
        const createRes = await upsertMealPlanApi({
          date: selectedDate,
          slots: { breakfast: [], lunch: [], dinner: [] },
        });
        mealPlanId = createRes.data.id;
      }

      await patchMealPlanSlotApi(mealPlanId, {
        slot,
        add: recipeId,
      });

      Alert.alert(
        "Thành công! ✅",
        `Đã thêm món vào ${slot === "breakfast" ? "Bữa Sáng" : slot === "lunch" ? "Bữa Trưa" : "Bữa Tối"} ngày ${selectedDate}!`
      );
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể thêm món vào lịch. Vui lòng thử lại!");
    }
  };

  const handleAcceptSuggestions = async () => {
    if (recipes.length === 0) return;

    // Check if within limit
    if (suggestionData && !suggestionData.withinLimit) {
      Alert.alert(
        "Cảnh báo",
        `Tổng calories (${Math.round(suggestionData.totalKcal)}) vượt quá mục tiêu hàng ngày (${Math.round(suggestionData.dailyKcalTarget)}). Bạn vẫn muốn thêm vào lịch?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Thêm",
            onPress: async () => {
              await acceptSuggestions();
            },
          },
        ]
      );
      return;
    }

    await acceptSuggestions();
  };

  const acceptSuggestions = async () => {
    setAccepting(true);
    try {
      // Distribute recipes intelligently to breakfast/lunch/dinner based on tags
      const lightRecipes = recipes.filter((r) =>
        r.tags?.some((t) => ["Veggie", "Soup", "Salad", "Breakfast"].includes(t))
      );
      const otherRecipes = recipes.filter((r) =>
        !r.tags?.some((t) => ["Veggie", "Soup", "Salad", "Breakfast"].includes(t))
      );

      // Breakfast: prefer light recipes (1-2 items)
      const breakfastIds = lightRecipes.length > 0
        ? lightRecipes.slice(0, 2).map((r) => r.id)
        : recipes.length > 0 ? [recipes[0].id] : [];

      // Lunch: remaining light recipes + half of other recipes
      const remainingLight = lightRecipes.slice(2).map((r) => r.id);
      const lunchCount = Math.max(2, Math.ceil(otherRecipes.length / 2));
      const lunchOther = otherRecipes.slice(0, lunchCount).map((r) => r.id);
      const lunchIds = [...remainingLight, ...lunchOther];

      // Dinner: remaining other recipes
      const dinnerIds = otherRecipes.slice(lunchCount).map((r) => r.id);

      // If no recipes left for dinner, use some from lunch
      let finalLunchIds = lunchIds;
      let finalDinnerIds = dinnerIds;
      if (dinnerIds.length === 0 && lunchIds.length > 2) {
        finalLunchIds = lunchIds.slice(0, -2);
        finalDinnerIds = lunchIds.slice(-2);
      }

      // Get or create meal plan
      let mealPlanId: string;
      try {
        const plansRes = await getMealPlansApi({
          start: selectedDate,
          end: selectedDate,
        });
        const plans = plansRes.data || [];
        const existingPlan = plans.find((p: any) => {
          const planDate = typeof p.date === 'string' 
            ? p.date.split('T')[0] 
            : new Date(p.date).toISOString().split('T')[0];
          return planDate === selectedDate;
        });

        if (existingPlan) {
          mealPlanId = existingPlan.id;
        } else {
          const createRes = await upsertMealPlanApi({
            date: selectedDate,
            slots: { breakfast: [], lunch: [], dinner: [] },
          });
          mealPlanId = createRes.data.id;
        }
      } catch (error) {
        const createRes = await upsertMealPlanApi({
          date: selectedDate,
          slots: { breakfast: [], lunch: [], dinner: [] },
        });
        mealPlanId = createRes.data.id;
      }

      // Update meal plan with distributed recipes
      await upsertMealPlanApi({
        date: selectedDate,
        slots: {
          breakfast: breakfastIds,
          lunch: finalLunchIds,
          dinner: finalDinnerIds,
        },
      });

      Alert.alert(
        "Thành công! ✅",
        `Đã thêm ${recipes.length} món ăn vào lịch ngày ${selectedDate}!\n\n- Bữa sáng: ${breakfastIds.length} món\n- Bữa trưa: ${finalLunchIds.length} món\n- Bữa tối: ${finalDinnerIds.length} món`,
        [
          {
            text: "Xem lịch",
            onPress: () => {
              // Clear suggestions before navigating
              setRecipes([]);
              setSuggestionData(null);
              navigation.navigate("Calendar", { 
                refreshDate: selectedDate,
                refresh: true 
              });
            },
          },
          { 
            text: "OK",
            onPress: () => {
              // Clear suggestions after accepting
              setRecipes([]);
              setSuggestionData(null);
            }
          },
        ]
      );
    } catch (error: any) {
      console.error("Error accepting suggestions:", error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể thêm món vào lịch. Vui lòng thử lại!");
    } finally {
      setAccepting(false);
    }
  };

  const onSendMessage = async () => {
    if (!inputText.trim() || chatLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText("");
    setChatLoading(true);

    try {
      const recentMessages = messages.slice(-10).map((msg) => ({
        role: msg.type as "user" | "assistant",
        content: msg.content,
      }));

      const userRequest = messageText.toLowerCase();
      const isRecipeRequest =
        userRequest.includes("gợi ý") ||
        userRequest.includes("suggest") ||
        userRequest.includes("món") ||
        userRequest.includes("ăn") ||
        userRequest.includes("recipe") ||
        userRequest.includes("thực đơn");

      if (isRecipeRequest) {
        try {
          const suggestions = await suggestFromChat(messageText, selectedDate);
          
          // Handle clarification request
          if (suggestions.needsClarification && suggestions.clarificationQuestion) {
            const aiMessage: Message = {
              id: Date.now().toString(),
              type: "assistant",
              content: suggestions.clarificationQuestion,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            setChatLoading(false);
            return;
          }

          const suggestedRecipes = suggestions.dishes || [];
          const totalKcal = suggestions.totalKcal || 0;
          const dailyKcalTarget = suggestions.dailyKcalTarget || targetKcal;
          const withinLimit = suggestions.withinLimit ?? true;

          if (suggestedRecipes.length > 0) {
            setRecipes(suggestedRecipes);
            setSuggestionData({
              totalKcal,
              dailyKcalTarget,
              withinLimit,
            });
            const aiMessage: Message = {
              id: Date.now().toString(),
              type: "assistant",
              content: `Tôi đã tìm thấy ${suggestedRecipes.length} món ăn phù hợp (${Math.round(totalKcal)}/${Math.round(dailyKcalTarget)} kcal):\n\n${suggestedRecipes
                .map(
                  (r: Recipe, idx: number) =>
                    `${idx + 1}. ${r.title}${r.totalKcal ? ` (~${Math.round(r.totalKcal)} kcal)` : ""}`
                )
                .join("\n")}\n\n${withinLimit ? "✅ Phù hợp với mục tiêu của bạn." : "⚠️ Vượt quá một chút so với mục tiêu."}\n\nBạn có thể xem chi tiết và chọn món để thêm vào lịch! 🍽️`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            setShowSuggestionModal(true);
          } else {
            const response = await chatWithAI(messageText, recentMessages);
            const aiMessage: Message = {
              id: Date.now().toString(),
              type: "assistant",
              content: response.message,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } catch (suggestError) {
          console.error("Error suggesting recipes:", suggestError);
          const response = await chatWithAI(messageText, recentMessages);
          const aiMessage: Message = {
            id: Date.now().toString(),
            type: "assistant",
            content: response.message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      } else {
        const response = await chatWithAI(messageText, recentMessages);
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: "assistant",
          content: response.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error: any) {
      console.error("Error in AI chat:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content:
          error?.response?.data?.message ||
          "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.type === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="restaurant" size={20} color="#f77" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
        {isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <View style={styles.recipeCard}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => navigation.navigate("Details", { item })}
      >
        <Image
          source={{ uri: normalizeImage(item.image) }}
          style={styles.recipeImage}
        />
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.recipeInfo}>
            {item.cookTime && (
              <View style={styles.recipeInfoItem}>
                <Ionicons name="time-outline" size={12} color="#f77" />
                <Text style={styles.recipeInfoText}>{item.cookTime} phút</Text>
              </View>
            )}
            {item.totalKcal && (
              <View style={styles.recipeInfoItem}>
                <Ionicons name="flame-outline" size={12} color="#f77" />
                <Text style={styles.recipeInfoText}>
                  {Math.round(item.totalKcal)} kcal
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.recipeQuickActions}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => handleAddToCalendar(item.id, "breakfast")}
        >
          <Text style={styles.quickActionText}>Sáng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => handleAddToCalendar(item.id, "lunch")}
        >
          <Text style={styles.quickActionText}>Trưa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => handleAddToCalendar(item.id, "dinner")}
        >
          <Text style={styles.quickActionText}>Tối</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Hôm nay";
    if (date.toDateString() === tomorrow.toDateString()) return "Ngày mai";
    return date.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#f77" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gợi ý món ăn</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={16} color="#f77" />
              <Text style={styles.dateBadgeText}>{formatDate(selectedDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "chat" && styles.tabActive]}
            onPress={() => setActiveTab("chat")}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={activeTab === "chat" ? "#f77" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "chat" && styles.tabTextActive,
              ]}
            >
              Chat AI
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "filter" && styles.tabActive]}
            onPress={() => setActiveTab("filter")}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeTab === "filter" ? "#f77" : "#999"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "filter" && styles.tabTextActive,
              ]}
            >
              Bộ lọc
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === "chat" ? (
          <View style={styles.chatTabContent}>
            {/* Quick Suggestions */}
            {messages.length <= 2 && (
              <View style={styles.quickSuggestionsContainer}>
                <Text style={styles.quickSuggestionsTitle}>Gợi ý nhanh</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickSuggestionsList}
                >
                  {getQuickSuggestions().map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickSuggestionChip}
                      onPress={() =>
                        handleQuickSuggestion(suggestion.text, suggestion.slot)
                      }
                    >
                      <Text style={styles.quickSuggestionText}>
                        {suggestion.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Chat Section */}
            <View style={styles.chatSection}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  scrollEnabled={false}
                />
                {chatLoading && (
                  <View
                    style={[styles.messageContainer, styles.assistantMessage]}
                  >
                    <View style={styles.avatarContainer}>
                      <Ionicons name="restaurant" size={20} color="#f77" />
                    </View>
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                      <ActivityIndicator size="small" color="#f77" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input Section */}
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Hỏi về món ăn, công thức, nguyên liệu..."
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || chatLoading) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={onSendMessage}
                    disabled={!inputText.trim() || chatLoading}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color={
                        inputText.trim() && !chatLoading ? "#fff" : "#ccc"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.filterTabContent}
            contentContainerStyle={styles.filterTabContentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* User Preferences Info */}
            {userPreferences && (
              <View style={styles.preferencesCard}>
                <View style={styles.preferencesHeader}>
                  <Ionicons name="person-circle-outline" size={20} color="#f77" />
                  <Text style={styles.preferencesTitle}>Thông tin của bạn</Text>
                </View>
                <View style={styles.preferencesInfo}>
                  <Text style={styles.preferencesText}>
                    Mục tiêu: {userPreferences.dailyKcalTarget || 2000} kcal/ngày
                  </Text>
                  <Text style={styles.preferencesText}>
                    Chế độ: {userPreferences.dietType === "vegan" ? "Chay" : userPreferences.dietType === "low_carb" ? "Ít carb" : "Bình thường"}
                  </Text>
                </View>
              </View>
            )}

            {/* Region Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Vùng miền</Text>
              <View style={styles.filterChipsContainer}>
                {["All", "Northern", "Central", "Southern"].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.filterChip,
                      region === r && styles.filterChipActive,
                    ]}
                    onPress={() => setRegion(r)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        region === r && styles.filterChipTextActive,
                      ]}
                    >
                      {r === "All"
                        ? "Tất cả"
                        : r === "Northern"
                        ? "Miền Bắc"
                        : r === "Central"
                        ? "Miền Trung"
                        : "Miền Nam"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Diet Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Chế độ ăn</Text>
              <View style={styles.filterChipsContainer}>
                {[
                  { key: "normal", label: "Thông thường" },
                  { key: "vegan", label: "Chay" },
                  { key: "low_carb", label: "Ít carb" },
                ].map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[
                      styles.filterChip,
                      dietType === d.key && styles.filterChipActive,
                    ]}
                    onPress={() => setDietType(d.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        dietType === d.key && styles.filterChipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Kcal Target */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Mục tiêu năng lượng</Text>
              <View style={styles.kcalContainer}>
                <TouchableOpacity
                  style={styles.kcalButton}
                  onPress={() => setTargetKcal(Math.max(1000, targetKcal - 100))}
                >
                  <Ionicons name="remove-circle" size={28} color="#f77" />
                </TouchableOpacity>
                <Text style={styles.kcalValue}>{targetKcal} kcal</Text>
                <TouchableOpacity
                  style={styles.kcalButton}
                  onPress={() => setTargetKcal(Math.min(5000, targetKcal + 100))}
                >
                  <Ionicons name="add-circle" size={28} color="#f77" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Suggest Button */}
            <TouchableOpacity
              style={[
                styles.suggestButton,
                loading && styles.suggestButtonDisabled,
              ]}
              onPress={onSuggest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.suggestButtonText}>Gợi ý món ăn</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngày</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.dateInputModal}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalConfirmText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Suggestion Modal */}
      <Modal
        visible={showSuggestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuggestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.suggestionModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {recipes.length} món được gợi ý
                </Text>
                {suggestionData && (
                  <View style={styles.caloriesInfo}>
                    <Ionicons 
                      name={suggestionData.withinLimit ? "checkmark-circle" : "warning"} 
                      size={14} 
                      color={suggestionData.withinLimit ? "#4CAF50" : "#FF9800"} 
                    />
                    <Text style={[
                      styles.caloriesText,
                      !suggestionData.withinLimit && styles.caloriesTextWarning
                    ]}>
                      {Math.round(suggestionData.totalKcal)} / {Math.round(suggestionData.dailyKcalTarget)} kcal
                      {!suggestionData.withinLimit && " ⚠️"}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowSuggestionModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.suggestionModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {recipes.map((recipe) => (
                <View key={recipe.id} style={styles.suggestionModalRecipeCard}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", flex: 1 }}
                    onPress={() => {
                      setShowSuggestionModal(false);
                      navigation.navigate("Details", { item: recipe });
                    }}
                  >
                    <Image
                      source={{ uri: normalizeImage(recipe.image) }}
                      style={styles.suggestionModalImage}
                    />
                    <View style={styles.suggestionModalRecipeInfo}>
                      <Text style={styles.suggestionModalRecipeTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                      <View style={styles.recipeInfo}>
                        {recipe.cookTime && (
                          <View style={styles.recipeInfoItem}>
                            <Ionicons name="time-outline" size={12} color="#f77" />
                            <Text style={styles.recipeInfoText}>{recipe.cookTime} phút</Text>
                          </View>
                        )}
                        {recipe.totalKcal && (
                          <View style={styles.recipeInfoItem}>
                            <Ionicons name="flame-outline" size={12} color="#f77" />
                            <Text style={styles.recipeInfoText}>
                              {Math.round(recipe.totalKcal)} kcal
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.suggestionModalQuickActions}>
                    <TouchableOpacity
                      style={styles.suggestionModalQuickActionBtn}
                      onPress={() => {
                        handleAddToCalendar(recipe.id, "breakfast");
                        setShowSuggestionModal(false);
                      }}
                    >
                      <Text style={styles.suggestionModalQuickActionText}>Sáng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.suggestionModalQuickActionBtn}
                      onPress={() => {
                        handleAddToCalendar(recipe.id, "lunch");
                        setShowSuggestionModal(false);
                      }}
                    >
                      <Text style={styles.suggestionModalQuickActionText}>Trưa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.suggestionModalQuickActionBtn}
                      onPress={() => {
                        handleAddToCalendar(recipe.id, "dinner");
                        setShowSuggestionModal(false);
                      }}
                    >
                      <Text style={styles.suggestionModalQuickActionText}>Tối</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
              onPress={async () => {
                setShowSuggestionModal(false);
                await handleAcceptSuggestions();
              }}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>Chấp nhận tất cả</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ marginBottom: 50 }}>
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 12,
    color: "#f77",
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#f77",
  },
  tabText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#f77",
    fontWeight: "600",
  },
  chatTabContent: {
    flex: 1,
  },
  quickSuggestionsContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  quickSuggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  quickSuggestionsList: {
    gap: 8,
  },
  quickSuggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff5f7",
    borderWidth: 1,
    borderColor: "#f77",
    marginRight: 8,
  },
  quickSuggestionText: {
    fontSize: 13,
    color: "#f77",
    fontWeight: "500",
  },
  chatSection: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  assistantMessage: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffeef0",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#f77",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  userMessageText: {
    color: "#fff",
  },
  assistantMessageText: {
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: "#333",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f77",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#eee",
  },
  filterTabContent: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  filterTabContentInner: {
    padding: 16,
    paddingBottom: 100,
  },
  preferencesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  preferencesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  preferencesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  preferencesInfo: {
    gap: 6,
  },
  preferencesText: {
    fontSize: 14,
    color: "#666",
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterChipActive: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  kcalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  kcalButton: {
    padding: 4,
  },
  kcalValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#f77",
    marginHorizontal: 24,
    minWidth: 100,
    textAlign: "center",
  },
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f77",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  suggestButtonDisabled: {
    opacity: 0.6,
  },
  suggestButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  recipesSection: {
    maxHeight: 400,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    padding: 16,
  },
  recipesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recipesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
    marginBottom: 4,
  },
  caloriesInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  caloriesText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  caloriesTextWarning: {
    color: "#FF9800",
    fontWeight: "600",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  clearButton: {
    padding: 4,
  },
  recipesList: {
    paddingBottom: 8,
  },
  recipeRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recipeCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  recipeImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  recipeContent: {
    padding: 10,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    minHeight: 36,
  },
  recipeInfo: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  recipeInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeInfoText: {
    fontSize: 11,
    color: "#666",
  },
  recipeQuickActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 4,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: "#fff5f7",
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    fontSize: 11,
    color: "#f77",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  dateInputModal: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
  },
  modalConfirmButton: {
    backgroundColor: "#f77",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  suggestionModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  suggestionModalScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  suggestionModalRecipeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  suggestionModalImage: {
    width: 100,
    height: 100,
    resizeMode: "cover",
  },
  suggestionModalRecipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  suggestionModalRecipeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  suggestionModalQuickActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 4,
  },
  suggestionModalQuickActionBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "#fff5f7",
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionModalQuickActionText: {
    fontSize: 12,
    color: "#f77",
    fontWeight: "600",
  },
});
