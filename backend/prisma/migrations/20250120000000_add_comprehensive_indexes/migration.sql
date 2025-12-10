-- Add comprehensive indexes for performance optimization (idempotent)

DO $$
BEGIN
    -- Recipe indexes (for search, trending, filtering)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Recipe') THEN
        CREATE INDEX IF NOT EXISTS "Recipe_createdAt_idx" ON "Recipe"("createdAt");
        CREATE INDEX IF NOT EXISTS "Recipe_cookTime_idx" ON "Recipe"("cookTime");
        CREATE INDEX IF NOT EXISTS "Recipe_likes_idx" ON "Recipe"("likes");
        CREATE INDEX IF NOT EXISTS "Recipe_region_idx" ON "Recipe"("region");
        CREATE INDEX IF NOT EXISTS "Recipe_likes_createdAt_idx" ON "Recipe"("likes", "createdAt");
        CREATE INDEX IF NOT EXISTS "Recipe_authorId_idx" ON "Recipe"("authorId");
    END IF;

    -- RecipeItem indexes (for joins)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecipeItem') THEN
        CREATE INDEX IF NOT EXISTS "RecipeItem_recipeId_idx" ON "RecipeItem"("recipeId");
        CREATE INDEX IF NOT EXISTS "RecipeItem_ingredientId_idx" ON "RecipeItem"("ingredientId");
    END IF;

    -- MealPlan indexes and unique constraint
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MealPlan') THEN
        CREATE INDEX IF NOT EXISTS "MealPlan_userId_date_idx" ON "MealPlan"("userId", "date");
        
        -- Add unique constraint if not exists (prevent duplicate meal plans per user per day)
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'MealPlan'::regclass
              AND conname IN ('MealPlan_userId_date_key', 'mealplan_userid_date_key')
        ) THEN
            ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_date_key" UNIQUE ("userId", "date");
            RAISE NOTICE 'Added unique constraint MealPlan_userId_date_key';
        ELSE
            RAISE NOTICE 'Constraint MealPlan_userId_date_key already exists, skipping.';
        END IF;
    END IF;

    -- FoodLog indexes (for date range queries and stats)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'FoodLog') THEN
        CREATE INDEX IF NOT EXISTS "FoodLog_userId_date_idx" ON "FoodLog"("userId", "date");
        CREATE INDEX IF NOT EXISTS "FoodLog_userId_mealType_idx" ON "FoodLog"("userId", "mealType");
        CREATE INDEX IF NOT EXISTS "FoodLog_recipeId_idx" ON "FoodLog"("recipeId");
    END IF;

    -- ShoppingList indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ShoppingList') THEN
        CREATE INDEX IF NOT EXISTS "ShoppingList_userId_createdAt_idx" ON "ShoppingList"("userId", "createdAt");
    END IF;

    -- AIRecommendationLog indexes (for training data queries)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AIRecommendationLog') THEN
        CREATE INDEX IF NOT EXISTS "AIRecommendationLog_userId_createdAt_idx" ON "AIRecommendationLog"("userId", "createdAt");
        CREATE INDEX IF NOT EXISTS "AIRecommendationLog_modelName_idx" ON "AIRecommendationLog"("modelName");
    END IF;

    -- UserFavoriteRecipe indexes (for favorites queries)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'UserFavoriteRecipe') THEN
        CREATE INDEX IF NOT EXISTS "UserFavoriteRecipe_userId_createdAt_idx" ON "UserFavoriteRecipe"("userId", "createdAt");
    END IF;
END $$;
