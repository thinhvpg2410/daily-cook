-- Add ingredient pricing columns (idempotent)

DO $$
BEGIN
    -- Check if Ingredient table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Ingredient') THEN
        -- Add pricePerUnit column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'Ingredient' 
            AND column_name = 'pricePerUnit'
        ) THEN
            ALTER TABLE "Ingredient" ADD COLUMN "pricePerUnit" DOUBLE PRECISION DEFAULT 0;
            RAISE NOTICE 'Added pricePerUnit column to Ingredient table';
        END IF;

        -- Add priceCurrency column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'Ingredient' 
            AND column_name = 'priceCurrency'
        ) THEN
            ALTER TABLE "Ingredient" ADD COLUMN "priceCurrency" TEXT DEFAULT 'VND';
            RAISE NOTICE 'Added priceCurrency column to Ingredient table';
        END IF;

        -- Add priceUpdatedAt column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'Ingredient' 
            AND column_name = 'priceUpdatedAt'
        ) THEN
            ALTER TABLE "Ingredient" ADD COLUMN "priceUpdatedAt" TIMESTAMP(3);
            RAISE NOTICE 'Added priceUpdatedAt column to Ingredient table';
        END IF;
    ELSE
        RAISE NOTICE 'Ingredient table does not exist, skipping pricing columns';
    END IF;
END $$;
