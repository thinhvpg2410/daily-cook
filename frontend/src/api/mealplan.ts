import {http} from "./http";

export const suggestMealApi = (params: {
    region?: string;
    dietType?: string;
    targetKcal?: number;
}) => {
    return http.post("/mealplans/suggest", params);
};