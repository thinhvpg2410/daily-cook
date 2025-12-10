-- This migration is idempotent and handles both RecipeIngredient and RecipeItem scenarios
-- If RecipeItem already exists (from init migration), skip creating RecipeIngredient
-- If RecipeIngredient exists, migrate it to RecipeItem

DO $$ 
BEGIN
    -- Check if RecipeItem table already exists (from init migration)
    -- If it exists, this migration should be a no-op
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecipeItem') THEN
        RAISE NOTICE 'RecipeItem table already exists, skipping migration';
        -- Still ensure enum exists
        BEGIN
            CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
        RETURN;
    END IF;

    -- Check if RecipeIngredient exists and needs migration
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecipeIngredient') THEN
        -- Migrate RecipeIngredient to RecipeItem
        BEGIN
            CREATE TABLE "RecipeItem" (
                "id" TEXT NOT NULL,
                "recipeId" TEXT NOT NULL,
                "ingredientId" TEXT NOT NULL,
                "amount" DOUBLE PRECISION NOT NULL,
                "unitOverride" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
            );
        EXCEPTION
            WHEN duplicate_table THEN
                RAISE NOTICE 'RecipeItem table already exists during migration';
        END;

        -- Copy data from RecipeIngredient to RecipeItem (only if RecipeIngredient still exists)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecipeIngredient') THEN
            BEGIN
                INSERT INTO "RecipeItem" ("id", "recipeId", "ingredientId", "amount", "unitOverride", "createdAt")
                SELECT "id", "recipeId", "ingredientId", "amount", "unitOverride", COALESCE("createdAt", CURRENT_TIMESTAMP)
                FROM "RecipeIngredient"
                WHERE NOT EXISTS (
                    SELECT 1 FROM "RecipeItem" WHERE "RecipeItem"."id" = "RecipeIngredient"."id"
                );
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error copying data from RecipeIngredient: %', SQLERRM;
            END;

            -- Drop old RecipeIngredient table
            BEGIN
                DROP TABLE "RecipeIngredient" CASCADE;
            EXCEPTION
                WHEN undefined_table THEN null;
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error dropping RecipeIngredient: %', SQLERRM;
            END;
        END IF;

        RAISE NOTICE 'Migrated RecipeIngredient to RecipeItem';
        RETURN;
    END IF;

    -- CreateEnum (idempotent)
    BEGIN
        CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    -- Create tables only if they don't exist
    CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT,
        "name" TEXT,
        "avatarUrl" TEXT,
        "googleId" TEXT,
        "isTwoFAEnabled" BOOLEAN NOT NULL DEFAULT false,
        "twoFASecret" TEXT,
        "role" "Role" NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Ingredient" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "unit" TEXT,
        "kcal" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Recipe" (
        "id" TEXT NOT NULL,
        "authorId" TEXT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "steps" JSONB,
        "tags" TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "RecipeItem" (
        "id" TEXT NOT NULL,
        "recipeId" TEXT NOT NULL,
        "ingredientId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "unitOverride" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "MealPlan" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "slots" JSONB NOT NULL,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "ShoppingList" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "items" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
    );

    -- Create indexes (idempotent)
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    EXCEPTION
        WHEN OTHERS THEN null;
    END;

    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
    EXCEPTION
        WHEN OTHERS THEN null;
    END;

    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "RecipeItem_recipeId_ingredientId_key" ON "RecipeItem"("recipeId", "ingredientId");
    EXCEPTION
        WHEN OTHERS THEN null;
    END;

    -- Add foreign keys (idempotent)
    BEGIN
        ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN OTHERS THEN null;
    END;

    BEGIN
        ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN OTHERS THEN null;
    END;

    BEGIN
        ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN OTHERS THEN null;
    END;

    BEGIN
        ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN OTHERS THEN null;
    END;

    BEGIN
        ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
        WHEN OTHERS THEN null;
    END;
END $$;
