import {http} from "./http";

export const suggestMealApi = (params: {
    region?: string;
    dietType?: string;
    targetKcal?: number;
}) => {
    return http.post("/mealplans/suggest", params);
};

export const suggestMenuApi = (params: {
    date: string;
    slot: "breakfast" | "lunch" | "dinner" | "all";
    includeStarter?: boolean;
    includeDessert?: boolean;
    vegetarian?: boolean;
    region?: "Northern" | "Central" | "Southern";
    maxCookTime?: number;
    excludeIngredientNames?: string;
    persist?: boolean;
}) => {
    return http.post("/mealplans/suggest-menu", params);
};

export const getTodaySuggestApi = (slot?: string) => {
    return http.get("/mealplans/today-suggest", {
        params: slot ? {slot} : {},
    });
};

export const getMealPlansApi = (params?: {
    start?: string;
    end?: string;
}) => {
    return http.get("/mealplans", {params});
};

export const upsertMealPlanApi = (data: {
    date: string;
    slots?: {
        breakfast?: string[];
        lunch?: string[];
        dinner?: string[];
    };
    note?: string;
}) => {
    return http.put("/mealplans", data);
};

export const getShoppingListApi = (params: {
    start: string;
    end: string;
}) => {
    return http.get("/mealplans/shopping/from-range", {params});
};

export const patchMealPlanSlotApi = (
    mealPlanId: string,
    data: {
        slot: "breakfast" | "lunch" | "dinner";
        set?: string[];
        add?: string;
        remove?: string;
    }
) => {
    return http.patch(`/mealplans/${mealPlanId}/slot`, data);
};

export const getMealPlanApi = (id: string) => {
    return http.get(`/mealplans/${id}`);
};