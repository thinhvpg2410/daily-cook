#!/bin/sh

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma Client"
    exit 1
}

# Run database migrations
echo "📦 Running database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully"
else
    MIGRATE_EXIT_CODE=$?
    echo "⚠️  Migration failed with exit code $MIGRATE_EXIT_CODE"
    
    # Check if it's a P3018 error (failed migrations)
    if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
        echo "🔍 Attempting to auto-resolve failed migrations..."
        # Try to resolve failed migrations (all our migrations are idempotent)
        if [ -f "scripts/auto-resolve-migrations.js" ]; then
            node scripts/auto-resolve-migrations.js || echo "⚠️  Auto-resolve script had issues, continuing..."
        else
            echo "⚠️  Auto-resolve script not found, skipping..."
        fi
        
        echo "🔄 Retrying migrations after auto-resolve..."
        # Retry migrate deploy
        if npx prisma migrate deploy; then
            echo "✅ Migrations applied successfully after auto-resolve"
        else
            echo "❌ Migrations still failing after auto-resolve"
            echo "⚠️  This might require manual intervention"
            echo "💡 All migrations are idempotent, you can try:"
            echo "   npx prisma migrate resolve --applied <migration_name>"
            exit 1
        fi
    fi
fi

# Optional: Seed database (uncomment if needed)
# echo "🌱 Seeding database..."
# npm run prisma:seed

# Start the application
echo "🚀 Starting DailyCook API..."
node dist/src/main.js

