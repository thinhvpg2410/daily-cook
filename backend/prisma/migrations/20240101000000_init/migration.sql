-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isTwoFAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFASecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "height" INTEGER,
    "weight" DOUBLE PRECISION,
    "activity" TEXT,
    "goal" TEXT,
    "dailyKcalTarget" DOUBLE PRECISION,
    "dietType" TEXT,
    "dislikedIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "likedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "kcal" DOUBLE PRECISION DEFAULT 0,
    "protein" DOUBLE PRECISION DEFAULT 0,
    "fat" DOUBLE PRECISION DEFAULT 0,
    "carbs" DOUBLE PRECISION DEFAULT 0,
    "fiber" DOUBLE PRECISION DEFAULT 0,
    "sugar" DOUBLE PRECISION DEFAULT 0,
    "sodium" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Recipe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "cookTime" INTEGER DEFAULT 30,
    "likes" INTEGER DEFAULT 0,
    "totalKcal" DOUBLE PRECISION DEFAULT 0,
    "protein" DOUBLE PRECISION DEFAULT 0,
    "fat" DOUBLE PRECISION DEFAULT 0,
    "carbs" DOUBLE PRECISION DEFAULT 0,
    "tags" TEXT[],
    "image" TEXT,
    "steps" JSONB,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RecipeItem" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unitOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "slots" JSONB NOT NULL,
    "totalKcal" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShoppingList" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Shopping List',
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FoodLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" TEXT NOT NULL,
    "recipeId" TEXT,
    "kcal" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIRecommendationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "modelName" TEXT,
    "durationMs" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserFavoriteRecipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ingredient_name_idx" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipe_createdAt_idx" ON "Recipe"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipe_cookTime_idx" ON "Recipe"("cookTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipe_likes_idx" ON "Recipe"("likes");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipe_region_idx" ON "Recipe"("region");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipe_likes_createdAt_idx" ON "Recipe"("likes", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Recipe_authorId_idx" ON "Recipe"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecipeItem_recipeId_idx" ON "RecipeItem"("recipeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecipeItem_ingredientId_idx" ON "RecipeItem"("ingredientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MealPlan_userId_date_idx" ON "MealPlan"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MealPlan_userId_date_key" ON "MealPlan"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShoppingList_userId_createdAt_idx" ON "ShoppingList"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FoodLog_userId_date_idx" ON "FoodLog"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FoodLog_userId_mealType_idx" ON "FoodLog"("userId", "mealType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FoodLog_recipeId_idx" ON "FoodLog"("recipeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIRecommendationLog_userId_createdAt_idx" ON "AIRecommendationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIRecommendationLog_modelName_idx" ON "AIRecommendationLog"("modelName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserFavoriteRecipe_userId_idx" ON "UserFavoriteRecipe"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserFavoriteRecipe_recipeId_idx" ON "UserFavoriteRecipe"("recipeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserFavoriteRecipe_userId_createdAt_idx" ON "UserFavoriteRecipe"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserFavoriteRecipe_userId_recipeId_key" ON "UserFavoriteRecipe"("userId", "recipeId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
    ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AIRecommendationLog" ADD CONSTRAINT "AIRecommendationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserFavoriteRecipe" ADD CONSTRAINT "UserFavoriteRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "UserFavoriteRecipe" ADD CONSTRAINT "UserFavoriteRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
