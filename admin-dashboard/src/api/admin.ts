import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string;
  role: string;
  avatarUrl: string | null;
  isTwoFAEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  region: string | null;
  cookTime: number | null;
  likes: number | null;
  totalKcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  tags: string[];
  image: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  note: string | null;
  slots: any;
  totalKcal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  date: string;
  mealType: string;
  recipeId: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  pricePerUnit: number | null;
  priceCurrency: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalRecipes: number;
  totalMealPlans: number;
  totalFoodLogs: number;
  activeUsers: number;
  recentUsers: User[];
  recentRecipes?: Recipe[];
}

export const adminApi = {
  // Dashboard
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ data: User[]; total: number }> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUserRole: async (id: string, role: 'USER' | 'ADMIN'): Promise<User> => {
    const response = await apiClient.patch(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // Recipes
  getRecipes: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ data: Recipe[]; total: number }> => {
    const response = await apiClient.get('/admin/recipes', { params });
    return response.data;
  },

  getRecipe: async (id: string): Promise<Recipe> => {
    const response = await apiClient.get(`/admin/recipes/${id}`);
    return response.data;
  },

  createRecipe: async (data: any): Promise<Recipe> => {
    const response = await apiClient.post('/admin/recipes', data);
    return response.data;
  },

  updateRecipe: async (id: string, data: any): Promise<Recipe> => {
    const response = await apiClient.patch(`/admin/recipes/${id}`, data);
    return response.data;
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/recipes/${id}`);
  },

  fetchIngredientPrice: async (id: string): Promise<Ingredient> => {
    const response = await apiClient.post(`/admin/ingredients/${id}/fetch-price`);
    return response.data;
  },

  // Meal Plans
  getMealPlans: async (params?: { page?: number; limit?: number; userId?: string }): Promise<{ data: MealPlan[]; total: number }> => {
    const response = await apiClient.get('/admin/mealplans', { params });
    return response.data;
  },

  // Food Logs
  getFoodLogs: async (params?: { page?: number; limit?: number; userId?: string }): Promise<{ data: FoodLog[]; total: number }> => {
    const response = await apiClient.get('/admin/food-logs', { params });
    return response.data;
  },

  // Ingredients
  getIngredients: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ data: Ingredient[]; total: number }> => {
    const response = await apiClient.get('/admin/ingredients', { params });
    return response.data;
  },

  createIngredient: async (data: Partial<Ingredient>): Promise<Ingredient> => {
    const response = await apiClient.post('/admin/ingredients', data);
    return response.data;
  },

  updateIngredient: async (id: string, data: Partial<Ingredient>): Promise<Ingredient> => {
    const response = await apiClient.patch(`/admin/ingredients/${id}`, data);
    return response.data;
  },

  deleteIngredient: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/ingredients/${id}`);
  },

  // Tags
  getAllTags: async (): Promise<string[]> => {
    const response = await apiClient.get('/admin/tags');
    return response.data;
  },
};

