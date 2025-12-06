import { http } from "./http";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  timestamp: string;
}

export interface SuggestFromChatResponse {
  date: string;
  slot?: "breakfast" | "lunch" | "dinner" | "all";
  dishes: Array<{
    id: string;
    title: string;
    image?: string | null;
    cookTime?: number | null;
    likes?: number | null;
    tags?: string[];
    totalKcal?: number | null;
  }>;
  totalKcal?: number;
  dailyKcalTarget?: number;
  withinLimit?: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

/**
 * Chat với AI về gợi ý món ăn
 */
export const chatWithAI = async (
  message: string,
  history?: ChatMessage[]
): Promise<ChatResponse> => {
  const res = await http.post<ChatResponse>("/ai/chat", {
    message,
    history,
  });
  return res.data;
};

/**
 * Gợi ý món ăn từ yêu cầu chat
 */
export const suggestFromChat = async (
  request: string,
  date?: string
): Promise<SuggestFromChatResponse> => {
  const res = await http.post<SuggestFromChatResponse>("/ai/suggest-from-chat", {
    request,
    date,
  });
  return res.data;
};

/**
 * Tính toán năng lượng và macros phù hợp dựa trên thông tin cá nhân
 */
export interface CalculateCalorieGoalParams {
  gender: "male" | "female";
  age: number;
  height: number; // cm
  weight: number; // kg
  activity: "low" | "medium" | "high";
  goal: "lose_weight" | "maintain" | "gain_muscle";
}

export interface CalculateCalorieGoalResponse {
  bmr: number;
  tdee: number;
  dailyKcalTarget: number;
  protein: number;
  fat: number;
  carbs: number;
  explanation: string;
}

export const calculateCalorieGoal = async (
  params: CalculateCalorieGoalParams
): Promise<CalculateCalorieGoalResponse> => {
  const res = await http.post<CalculateCalorieGoalResponse>("/ai/calculate-calorie-goal", params);
  return res.data;
};

/**
 * Gen nutrition tips bằng AI dựa trên dữ liệu dinh dưỡng
 */
export interface GenerateNutritionTipsParams {
  daily: Array<{
    date: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    source?: string;
  }>;
  average: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  calorieTarget: number;
  weekStart?: string;
  weekEnd?: string;
}

export interface GenerateNutritionTipsResponse {
  tips: string[];
  summary: string;
  week: string;
  generatedAt: string;
}

export const generateNutritionTips = async (
  params: GenerateNutritionTipsParams
): Promise<GenerateNutritionTipsResponse> => {
  const res = await http.post<GenerateNutritionTipsResponse>("/ai/generate-nutrition-tips", params);
  return res.data;
};

