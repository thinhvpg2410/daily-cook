-- Add comprehensive indexes for performance optimization

-- Recipe indexes (for search, trending, filtering)
CREATE INDEX IF NOT EXISTS "Recipe_createdAt_idx" ON "Recipe"("createdAt");
CREATE INDEX IF NOT EXISTS "Recipe_cookTime_idx" ON "Recipe"("cookTime");
CREATE INDEX IF NOT EXISTS "Recipe_likes_idx" ON "Recipe"("likes");
CREATE INDEX IF NOT EXISTS "Recipe_region_idx" ON "Recipe"("region");
CREATE INDEX IF NOT EXISTS "Recipe_likes_createdAt_idx" ON "Recipe"("likes", "createdAt");
CREATE INDEX IF NOT EXISTS "Recipe_authorId_idx" ON "Recipe"("authorId");

-- RecipeItem indexes (for joins)
CREATE INDEX IF NOT EXISTS "RecipeItem_recipeId_idx" ON "RecipeItem"("recipeId");
CREATE INDEX IF NOT EXISTS "RecipeItem_ingredientId_idx" ON "RecipeItem"("ingredientId");

CREATE INDEX IF NOT EXISTS "MealPlan_userId_date_idx" ON "MealPlan"("userId", "date");
-- Add unique constraint if not exists (prevent duplicate meal plans per user per day)
DO $$
BEGIN
    -- Skip if table does not exist (e.g., deploying onto partial schema)
    IF to_regclass('public."MealPlan"') IS NULL THEN
        RAISE NOTICE 'Table MealPlan not found, skipping unique constraint creation.';
        RETURN;
    END IF;

    -- Check by constraint name on the MealPlan table and avoid failing if it is already there
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'MealPlan'::regclass
          AND conname IN ('MealPlan_userId_date_key', 'mealplan_userid_date_key')
    ) THEN
        ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_date_key" UNIQUE ("userId", "date");
    ELSE
        RAISE NOTICE 'Constraint MealPlan_userId_date_key already exists, skipping.';
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        -- If a concurrent deploy or prior manual fix already added it, skip gracefully
        RAISE NOTICE 'Constraint MealPlan_userId_date_key already exists, skipping.';
END $$;

-- FoodLog indexes (for date range queries and stats)
CREATE INDEX IF NOT EXISTS "FoodLog_userId_date_idx" ON "FoodLog"("userId", "date");
CREATE INDEX IF NOT EXISTS "FoodLog_userId_mealType_idx" ON "FoodLog"("userId", "mealType");
CREATE INDEX IF NOT EXISTS "FoodLog_recipeId_idx" ON "FoodLog"("recipeId");

-- ShoppingList indexes
CREATE INDEX IF NOT EXISTS "ShoppingList_userId_createdAt_idx" ON "ShoppingList"("userId", "createdAt");

-- AIRecommendationLog indexes (for training data queries)
CREATE INDEX IF NOT EXISTS "AIRecommendationLog_userId_createdAt_idx" ON "AIRecommendationLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIRecommendationLog_modelName_idx" ON "AIRecommendationLog"("modelName");

-- UserFavoriteRecipe indexes (for favorites queries)
CREATE INDEX IF NOT EXISTS "UserFavoriteRecipe_userId_createdAt_idx" ON "UserFavoriteRecipe"("userId", "createdAt");

