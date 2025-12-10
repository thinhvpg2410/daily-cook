-- Normalize schema indices and reference actions (idempotent)
-- This migration works with RecipeItem (not RecipeIngredient)

DO $$ 
BEGIN
    -- Check if Ingredient table exists before adding unique constraint
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredient') THEN
        -- Add unique constraint on Ingredient.name if it doesn't exist
        -- Use join with pg_class to safely check constraint existence
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'Ingredient'
              AND c.conname = 'Ingredient_name_key'
        ) THEN
            BEGIN
                ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_name_key" UNIQUE ("name");
                RAISE NOTICE 'Added unique constraint on Ingredient.name';
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE 'Constraint Ingredient_name_key already exists, skipping.';
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error adding constraint: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Constraint Ingredient_name_key already exists, skipping.';
        END IF;

        -- Add index on Ingredient.name if it doesn't exist
        CREATE INDEX IF NOT EXISTS "Ingredient_name_idx" ON "Ingredient"("name");
    END IF;

    -- Handle RecipeItem foreign keys (not RecipeIngredient)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecipeItem') THEN
        -- Drop and recreate foreign keys with updated actions
        DO $$ BEGIN
            ALTER TABLE "RecipeItem" DROP CONSTRAINT IF EXISTS "RecipeItem_recipeId_fkey";
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;

        DO $$ BEGIN
            ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" 
                FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    END IF;

    -- Handle Recipe table modifications
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Recipe') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Recipe' AND column_name = 'cookTime'
        ) THEN
            ALTER TABLE "Recipe" ADD COLUMN "cookTime" INTEGER;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Recipe' AND column_name = 'image'
        ) THEN
            ALTER TABLE "Recipe" ADD COLUMN "image" TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Recipe' AND column_name = 'likes'
        ) THEN
            ALTER TABLE "Recipe" ADD COLUMN "likes" INTEGER NOT NULL DEFAULT 0;
        END IF;

        -- Make authorId nullable if it's not already
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'Recipe' 
            AND column_name = 'authorId' AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE "Recipe" ALTER COLUMN "authorId" DROP NOT NULL;
        END IF;

        -- Update Recipe foreign key
        DO $$ BEGIN
            ALTER TABLE "Recipe" DROP CONSTRAINT IF EXISTS "Recipe_authorId_fkey";
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;

        DO $$ BEGIN
            ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" 
                FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS "Recipe_createdAt_idx" ON "Recipe"("createdAt");
        CREATE INDEX IF NOT EXISTS "Recipe_cookTime_idx" ON "Recipe"("cookTime");
        CREATE INDEX IF NOT EXISTS "Recipe_likes_idx" ON "Recipe"("likes");
    END IF;

    -- Handle User table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
        -- Remove default from phone if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'User' 
            AND column_name = 'phone' AND column_default IS NOT NULL
        ) THEN
            ALTER TABLE "User" ALTER COLUMN "phone" DROP DEFAULT;
        END IF;

        CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
    END IF;

    -- Handle MealPlan
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MealPlan') THEN
        CREATE INDEX IF NOT EXISTS "MealPlan_userId_date_idx" ON "MealPlan"("userId", "date");

        -- Update foreign key
        DO $$ BEGIN
            ALTER TABLE "MealPlan" DROP CONSTRAINT IF EXISTS "MealPlan_userId_fkey";
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;

        DO $$ BEGIN
            ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    END IF;

    -- Handle ShoppingList
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ShoppingList') THEN
        CREATE INDEX IF NOT EXISTS "ShoppingList_userId_createdAt_idx" ON "ShoppingList"("userId", "createdAt");

        -- Update foreign key
        DO $$ BEGIN
            ALTER TABLE "ShoppingList" DROP CONSTRAINT IF EXISTS "ShoppingList_userId_fkey";
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;

        DO $$ BEGIN
            ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    END IF;
END $$;
