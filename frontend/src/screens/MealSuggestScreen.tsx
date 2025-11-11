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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { suggestMealApi, suggestMenuApi } from "../api/mealplan";
import { useAuth } from "../context/AuthContext";
import TabBar from "./TabBar";

const { width } = Dimensions.get("window");

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

export default function MealSuggestScreen({ navigation }: any) {
  const { token } = useAuth();
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
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when new message is added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const onSuggest = async () => {
    setLoading(true);
    try {
      const res = await suggestMealApi({ region, dietType, targetKcal });
      const suggestedRecipes = res.data?.recipes || [];
      setRecipes(suggestedRecipes);

      // Add suggestion message to chat
      const suggestionMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `Tôi đã tìm thấy ${suggestedRecipes.length} món ăn phù hợp với bạn! 🍽️`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, suggestionMessage]);
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

  const onSendMessage = async () => {
    if (!inputText.trim() || chatLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setChatLoading(true);

    // TODO: Integrate with AI API when ready
    // For now, show a placeholder response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Tính năng AI đang được phát triển. Hiện tại bạn có thể sử dụng bộ lọc bên dưới để tìm món ăn phù hợp! 🤖",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setChatLoading(false);
    }, 1000);
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
    <TouchableOpacity
      style={styles.recipeCard}
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
        {item.description && (
          <Text style={styles.recipeDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.recipeInfo}>
          <View style={styles.recipeInfoItem}>
            <Ionicons name="time-outline" size={14} color="#f77" />
            <Text style={styles.recipeInfoText}>
              {item.cookTime ?? 30} phút
            </Text>
          </View>
          <View style={styles.recipeInfoItem}>
            <Ionicons name="flame-outline" size={14} color="#f77" />
            <Text style={styles.recipeInfoText}>
              {Math.round(item.totalKcal ?? 0)} kcal
            </Text>
          </View>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#f77" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gợi ý món ăn</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              scrollEnabled={false}
            />
            {chatLoading && (
              <View style={[styles.messageContainer, styles.assistantMessage]}>
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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Hỏi về món ăn, công thức, nguyên liệu..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={onSendMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || chatLoading) && styles.sendButtonDisabled,
              ]}
              onPress={onSendMessage}
              disabled={!inputText.trim() || chatLoading}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !chatLoading ? "#fff" : "#ccc"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Bộ lọc nhanh</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                region === "All" && styles.filterChipActive,
              ]}
              onPress={() => setRegion("All")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  region === "All" && styles.filterChipTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                region === "Northern" && styles.filterChipActive,
              ]}
              onPress={() => setRegion("Northern")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  region === "Northern" && styles.filterChipTextActive,
                ]}
              >
                Miền Bắc
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                region === "Central" && styles.filterChipActive,
              ]}
              onPress={() => setRegion("Central")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  region === "Central" && styles.filterChipTextActive,
                ]}
              >
                Miền Trung
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                region === "Southern" && styles.filterChipActive,
              ]}
              onPress={() => setRegion("Southern")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  region === "Southern" && styles.filterChipTextActive,
                ]}
              >
                Miền Nam
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                dietType === "normal" && styles.filterChipActive,
              ]}
              onPress={() => setDietType("normal")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dietType === "normal" && styles.filterChipTextActive,
                ]}
              >
                Thông thường
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                dietType === "vegan" && styles.filterChipActive,
              ]}
              onPress={() => setDietType("vegan")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dietType === "vegan" && styles.filterChipTextActive,
                ]}
              >
                Chay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                dietType === "low_carb" && styles.filterChipActive,
              ]}
              onPress={() => setDietType("low_carb")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  dietType === "low_carb" && styles.filterChipTextActive,
                ]}
              >
                Ít carb
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Kcal Target */}
          <View style={styles.kcalContainer}>
            <Text style={styles.kcalLabel}>Mục tiêu năng lượng:</Text>
            <View style={styles.kcalControls}>
              <TouchableOpacity
                style={styles.kcalButton}
                onPress={() => setTargetKcal(Math.max(1000, targetKcal - 100))}
              >
                <Ionicons name="remove-circle" size={24} color="#f77" />
              </TouchableOpacity>
              <Text style={styles.kcalValue}>{targetKcal} kcal</Text>
              <TouchableOpacity
                style={styles.kcalButton}
                onPress={() => setTargetKcal(Math.min(5000, targetKcal + 100))}
              >
                <Ionicons name="add-circle" size={24} color="#f77" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Suggest Button */}
          <TouchableOpacity
            style={[styles.suggestButton, loading && styles.suggestButtonDisabled]}
            onPress={onSuggest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.suggestButtonText}>Tìm món ăn</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Recipes Section */}
        {recipes.length > 0 && (
          <View style={styles.recipesSection}>
            <View style={styles.recipesHeader}>
              <Text style={styles.recipesTitle}>
                {recipes.length} món ăn được gợi ý
              </Text>
            </View>
            <FlatList
              data={recipes}
              keyExtractor={(item) => item.id}
              renderItem={renderRecipe}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recipesList}
            />
          </View>
        )}
      </KeyboardAvoidingView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
  },
  chatSection: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  filterSection: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f77",
    marginBottom: 12,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  filterChipActive: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  kcalContainer: {
    marginBottom: 16,
  },
  kcalLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  kcalControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff5f7",
    borderRadius: 12,
    paddingVertical: 12,
  },
  kcalButton: {
    padding: 4,
  },
  kcalValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
    marginHorizontal: 20,
    minWidth: 80,
    textAlign: "center",
  },
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f77",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
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
    padding: 16,
    backgroundColor: "#fff",
  },
  recipesHeader: {
    marginBottom: 12,
  },
  recipesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f77",
  },
  recipesList: {
    paddingRight: 16,
  },
  recipeCard: {
    width: 200,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
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
    height: 140,
    resizeMode: "cover",
  },
  recipeContent: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  recipeDesc: {
    fontSize: 12,
    color: "#777",
    marginBottom: 8,
    lineHeight: 16,
  },
  recipeInfo: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 12,
  },
  recipeInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeInfoText: {
    fontSize: 12,
    color: "#666",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    backgroundColor: "#ffeef0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    color: "#f77",
    fontWeight: "500",
  },
});
