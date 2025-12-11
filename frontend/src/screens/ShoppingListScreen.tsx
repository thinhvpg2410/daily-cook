import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TabBar, { TabBarSpacer } from "./TabBar";
import { useAuth } from "../context/AuthContext";
import { getShoppingListApi } from "../api/mealplan";

type ShoppingItem = {
  ingredientId: string;
  name: string;
  unit?: string;
  qty: number;
  checked: boolean;
  unitPrice?: number;
  estimatedCost?: number;
  currency?: string;
  priceUpdatedAt?: string;
};

type DisplayShoppingItem = ShoppingItem & {
  displayQty: number;
  displayCost: number;
};

const DEFAULT_UNIT_PRICE = 10000; // fallback 10k VND per base unit

const computeEstimatedCost = (item: ShoppingItem, multiplier = 1) => {
  if (typeof item.unitPrice === "number") {
    return item.unitPrice * item.qty * multiplier;
  }
  if (typeof item.estimatedCost === "number") {
    return item.estimatedCost * multiplier;
  }
  // Fallback khi backend chưa trả về giá
  return DEFAULT_UNIT_PRICE * item.qty * multiplier;
};

const formatCurrency = (value: number, currency?: string) => {
  const symbol = !currency || currency === "VND" ? "₫" : ` ${currency}`;
  return `${Math.round(value).toLocaleString()}${symbol}`;
};

export default function ShoppingListScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [servings, setServings] = useState<number>(2);
  const [mode, setMode] = useState<"normal" | "saving">("normal");
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const fetchShoppingList = async (isRefresh = false) => {
    if (!token) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Chỉ lấy shopping list cho hôm nay
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Clear checked items if it's a new day
      const lastDateKey = await AsyncStorage.getItem("shopping_list_last_date");
      if (lastDateKey !== todayStr) {
        setCheckedItems(new Set());
        await AsyncStorage.setItem("shopping_list_last_date", todayStr);
      }

      const res = await getShoppingListApi({
        start: todayStr,
        end: todayStr,
      });

      const items: ShoppingItem[] = res.data?.items || [];
      setShoppingItems(items);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchShoppingList(true);
  };

  // Load checked items from storage when component mounts
  useEffect(() => {
    const loadCheckedItems = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const key = `shopping_list_checked_${today}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const checkedArray = JSON.parse(stored);
          setCheckedItems(new Set(checkedArray));
        }
      } catch (error) {
        console.error("Error loading checked items:", error);
      }
    };
    if (token) {
      loadCheckedItems();
      fetchShoppingList();
    }
  }, [token]);

  // Save checked items to storage
  useEffect(() => {
    const saveCheckedItems = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const key = `shopping_list_checked_${today}`;
        const checkedArray = Array.from(checkedItems);
        await AsyncStorage.setItem(key, JSON.stringify(checkedArray));
      } catch (error) {
        console.error("Error saving checked items:", error);
      }
    };
    if (checkedItems.size > 0 || shoppingItems.length > 0) {
      saveCheckedItems();
    }
  }, [checkedItems, shoppingItems.length]);

  const toggleItem = (ingredientId: string) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const savingFactor = mode === "saving" ? 0.85 : 1;
  const quantityMultiplier = servings * savingFactor;
  const adjustedItems: DisplayShoppingItem[] = shoppingItems.map((item) => ({
    ...item,
    displayQty: item.qty * quantityMultiplier,
    displayCost: computeEstimatedCost(item, quantityMultiplier),
  }));

  const totalCost = adjustedItems.reduce(
    (sum, item) => sum + (item.displayCost || 0),
    0,
  );

  const uncheckedItems = adjustedItems.filter((item) => !checkedItems.has(item.ingredientId));
  const remainingCost = uncheckedItems.reduce(
    (sum, item) => sum + (item.displayCost || 0),
    0,
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f77" />
        }
      >
        <View style={s.headerSection}>
          <View style={s.headerRow}>
            <View style={s.headerIconContainer}>
              <Ionicons name="cart" size={28} color="#fff" />
            </View>
            <View style={s.headerTextContainer}>
              <Text style={s.title}>Danh sách đi chợ</Text>
              <Text style={s.dateText}>{getTodayDate()}</Text>
            </View>
          </View>
        </View>

        {!token ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: "#777" }}>Vui lòng đăng nhập để xem danh sách mua sắm</Text>
          </View>
        ) : loading ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#f77" />
          </View>
        ) : shoppingItems.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="basket-outline" size={64} color="#ddd" />
            <Text style={s.emptyText}>Chưa có nguyên liệu nào cho hôm nay</Text>
            <Text style={s.emptySubtext}>
              Hãy lên kế hoạch thực đơn hôm nay để tạo danh sách mua sắm
            </Text>
          </View>
        ) : (
          <>
            {/* Settings Card */}
            <View style={s.settingsCard}>
              <View style={s.settingRow}>
                <View style={s.settingLabelContainer}>
                  <Ionicons name="people" size={20} color="#f77" />
                  <Text style={s.settingLabel}>Khẩu phần ăn</Text>
                </View>
                <View style={s.inputContainer}>
                  <TouchableOpacity
                    style={s.inputButton}
                    onPress={() => setServings(Math.max(1, servings - 1))}
                  >
                    <Ionicons name="remove" size={18} color="#f77" />
                  </TouchableOpacity>
                  <TextInput
                    keyboardType="numeric"
                    value={String(servings)}
                    onChangeText={(t) => setServings(Math.max(1, Number(t) || 1))}
                    style={s.input}
                  />
                  <TouchableOpacity
                    style={s.inputButton}
                    onPress={() => setServings(servings + 1)}
                  >
                    <Ionicons name="add" size={18} color="#f77" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.settingRow}>
                <View style={s.settingLabelContainer}>
                  <Ionicons name="flame" size={20} color="#f77" />
                  <Text style={s.settingLabel}>Chế độ nấu ăn</Text>
                </View>
                <View style={s.modeRow}>
                  <TouchableOpacity
                    style={[s.modeBtn, mode === "normal" && s.modeActive]}
                    onPress={() => setMode("normal")}
                  >
                    <Ionicons
                      name="restaurant"
                      size={18}
                      color={mode === "normal" ? "#fff" : "#999"}
                    />
                    <Text style={[s.modeText, mode === "normal" && s.modeTextActive]}>
                      Thường
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modeBtn, mode === "saving" && s.modeActive]}
                    onPress={() => setMode("saving")}
                  >
                    <Ionicons
                      name="wallet"
                      size={18}
                      color={mode === "saving" ? "#fff" : "#999"}
                    />
                    <Text style={[s.modeText, mode === "saving" && s.modeTextActive]}>
                      Tiết kiệm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Ingredients List */}
            <View style={s.ingredientsSection}>
              <View style={s.sectionHeader}>
                <Ionicons name="basket" size={20} color="#333" />
                <Text style={s.sectionTitle}>
                  Nguyên liệu cần mua ({adjustedItems.length})
                </Text>
              </View>

              {adjustedItems.map((item, index) => {
                const isChecked = checkedItems.has(item.ingredientId);
                return (
                  <TouchableOpacity
                    key={item.ingredientId}
                    style={[
                      s.ingredientCard,
                      isChecked && s.ingredientCardChecked,
                      index === adjustedItems.length - 1 && s.lastCard,
                    ]}
                    onPress={() => toggleItem(item.ingredientId)}
                    activeOpacity={0.7}
                  >
                    <View style={s.ingredientContent}>
                      <View style={s.checkboxContainer}>
                        <View
                          style={[
                            s.checkbox,
                            isChecked && s.checkboxChecked,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </View>
                      <View style={s.ingredientInfo}>
                        <Text
                          style={[
                            s.ingredientName,
                            isChecked && s.ingredientNameChecked,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={s.ingredientQty}>
                          {item.displayQty.toFixed(1)} {item.unit || "g"}
                        </Text>
                      </View>
                      <View style={s.priceContainer}>
                        <Text
                          style={[
                            s.ingredientCost,
                            isChecked && s.ingredientCostChecked,
                          ]}
                        >
                          {formatCurrency(item.displayCost || 0, item.currency)}
                        </Text>
                        {item.priceUpdatedAt && (
                          <Text style={s.priceMeta}>
                            <Ionicons name="time-outline" size={10} color="#999" />{" "}
                            {new Date(item.priceUpdatedAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary Card */}
            <View style={s.summaryCard}>
              <View style={s.summaryHeader}>
                <Ionicons name="receipt" size={24} color="#f77" />
                <Text style={s.summaryTitle}>Tóm tắt</Text>
              </View>
              <View style={s.summaryContent}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Tổng chi phí ước tính</Text>
                  <Text style={s.summaryValue}>{formatCurrency(totalCost)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Còn lại cần mua</Text>
                  <Text style={[s.summaryValue, s.remainingValue]}>
                    {formatCurrency(remainingCost)}
                  </Text>
                </View>
                <View style={[s.summaryRow, s.progressRow]}>
                  <Text style={s.summaryLabel}>Tiến độ</Text>
                  <View style={s.progressContainer}>
                    <View
                      style={[
                        s.progressBar,
                        {
                          width: `${(checkedItems.size / shoppingItems.length) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.progressText}>
                    {checkedItems.size}/{shoppingItems.length}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
        <TabBarSpacer />
      </ScrollView>
      <TabBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { flex: 1, padding: 16 },
  
  // Header Section
  headerSection: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f77",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#f77",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    marginBottom: 20,
  },
  settingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  inputButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff5f7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffe0e6",
  },
  input: {
    borderWidth: 2,
    borderColor: "#f77",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: 80,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    backgroundColor: "#fff",
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  modeActive: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  modeText: {
    color: "#999",
    fontWeight: "600",
    fontSize: 14,
  },
  modeTextActive: {
    color: "#fff",
  },

  // Ingredients Section
  ingredientsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  ingredientCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  ingredientCardChecked: {
    backgroundColor: "#fafafa",
    borderColor: "#e0e0e0",
    opacity: 0.7,
  },
  lastCard: {
    marginBottom: 0,
  },
  ingredientContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#f77",
    borderColor: "#f77",
  },
  ingredientInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  ingredientNameChecked: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  ingredientQty: {
    fontSize: 13,
    color: "#666",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  ingredientCost: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f77",
    marginBottom: 4,
  },
  ingredientCostChecked: {
    color: "#999",
  },
  priceMeta: {
    fontSize: 11,
    color: "#999",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderTopWidth: 4,
    borderTopColor: "#f77",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  summaryContent: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f77",
  },
  remainingValue: {
    color: "#ff6b9d",
  },
  progressRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  progressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#f77",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    minWidth: 50,
    textAlign: "right",
  },
});
