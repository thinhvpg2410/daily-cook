#!/bin/sh

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Optional: Seed database (uncomment if needed)
# echo "🌱 Seeding database..."
# npm run prisma:seed

# Start the application
echo "🚀 Starting DailyCook API..."
node dist/src/main.js

