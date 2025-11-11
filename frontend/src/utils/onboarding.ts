import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserPreferences } from "../api/users";

const ONBOARDING_COMPLETED_KEY = "@dailycook:onboarding_completed";
const PENDING_PREFERENCES_KEY = "@dailycook:pending_preferences";

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
};

export const setOnboardingCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  } catch (error) {
    console.error("Error saving onboarding status:", error);
  }
};

export const clearOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    await AsyncStorage.removeItem(PENDING_PREFERENCES_KEY);
  } catch (error) {
    console.error("Error clearing onboarding status:", error);
  }
};

export const savePendingPreferences = async (preferences: UserPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(PENDING_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving pending preferences:", error);
  }
};

export const getPendingPreferences = async (): Promise<UserPreferences | null> => {
  try {
    const value = await AsyncStorage.getItem(PENDING_PREFERENCES_KEY);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch {
    return null;
  }
};

export const clearPendingPreferences = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_PREFERENCES_KEY);
  } catch (error) {
    console.error("Error clearing pending preferences:", error);
  }
};

