-- Add phone and dob columns to User table (idempotent)
-- This migration checks if columns already exist before adding them

DO $$ 
BEGIN
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '0000000000';
        RAISE NOTICE 'Added phone column to User table';
    ELSE
        RAISE NOTICE 'phone column already exists in User table';
    END IF;

    -- Add dob column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name = 'dob'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "dob" TIMESTAMP(3);
        RAISE NOTICE 'Added dob column to User table';
    ELSE
        RAISE NOTICE 'dob column already exists in User table';
    END IF;

    -- Remove default from phone if it exists and has default
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name = 'phone'
        AND column_default IS NOT NULL
    ) THEN
        -- Check if there are any rows with default value that need updating
        -- This is safe to run multiple times
        ALTER TABLE "User" ALTER COLUMN "phone" DROP DEFAULT;
        RAISE NOTICE 'Removed default from phone column';
    END IF;

    -- Create unique index on phone if it doesn't exist
    CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
END $$;
