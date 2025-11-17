import { http } from "./http";

export interface FoodLog {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId?: string | null;
  recipe?: {
    id: string;
    title: string;
    image?: string | null;
    totalKcal?: number | null;
  } | null;
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodLogData {
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId?: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  note?: string;
}

export interface UpdateFoodLogData {
  date?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId?: string | null;
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  note?: string | null;
}

export interface FoodLogStats {
  daily: Array<{
    date: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }>;
  average: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export const getFoodLogsApi = (params?: { start?: string; end?: string }) => {
  return http.get<FoodLog[]>("/food-logs", { params });
};

export const getFoodLogStatsApi = (start: string, end: string) => {
  return http.get<FoodLogStats>("/food-logs/stats", {
    params: { start, end },
  });
};

export const createFoodLogApi = (data: CreateFoodLogData) => {
  return http.post<FoodLog>("/food-logs", data);
};

export const updateFoodLogApi = (id: string, data: UpdateFoodLogData) => {
  return http.patch<FoodLog>(`/food-logs/${id}`, data);
};

export const deleteFoodLogApi = (id: string) => {
  return http.delete(`/food-logs/${id}`);
};

export const getFoodLogApi = (id: string) => {
  return http.get<FoodLog>(`/food-logs/${id}`);
};

