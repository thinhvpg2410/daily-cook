import { http } from "./http";

export interface UserPreferences {
  gender?: "male" | "female";
  age?: number;
  height?: number;
  weight?: number;
  activity?: "low" | "medium" | "high";
  goal?: "lose_weight" | "maintain" | "gain_muscle";
  dailyKcalTarget?: number;
  dietType?: "normal" | "vegan" | "vegetarian" | "low_carb";
  dislikedIngredients?: string[];
  likedTags?: string[];
}

export const getPreferencesApi = () => {
  return http.get("/users/me/preferences");
};

export const updatePreferencesApi = (data: UserPreferences) => {
  return http.patch("/users/me/preferences", data);
};

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  dob?: string;
  avatarUrl?: string;
}

export const updateProfileApi = (data: UpdateProfileData) => {
  return http.patch("/users/me", data);
};

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export const changePasswordApi = (data: ChangePasswordData) => {
  return http.patch("/users/me/password", data);
};

export const uploadAvatarApi = (imageData: string) => {
  return http.post("/users/me/avatar", { imageData });
};

