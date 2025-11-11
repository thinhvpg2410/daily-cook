import { http } from "./http";

export interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  cookTime?: number | null;
  likes?: number | null;
  tags?: string[];
  totalKcal?: number | null;
  region?: string | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
}

export interface FavoriteRecipe {
  id: string;
  recipe: Recipe;
  createdAt: string;
}

export const getFavoritesApi = () => {
  return http.get<FavoriteRecipe[]>("/recipes/me/favorites");
};

export const addFavoriteApi = (recipeId: string) => {
  return http.post(`/recipes/${recipeId}/favorite`);
};

export const removeFavoriteApi = (recipeId: string) => {
  return http.delete(`/recipes/${recipeId}/favorite`);
};

export const checkFavoriteApi = (recipeId: string) => {
  return http.get<{ isFavorite: boolean }>(`/recipes/${recipeId}/favorite`);
};

