# Multi-stage build cho DailyCook Backend trên Railway

# Stage 1: Builder - Build ứng dụng
FROM node:18-alpine AS builder

WORKDIR /app

# Cài đặt build dependencies cho native modules (argon2, bcrypt, sqlite3)
RUN apk add --no-cache python3 make g++ libc6-compat openssl-dev

# Copy package files để cache dependencies
COPY backend/package*.json ./

# Cài đặt tất cả dependencies (bao gồm devDependencies cho build)
RUN npm ci --legacy-peer-deps

# Copy Prisma schema và migrations
COPY backend/prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code và config files
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/src ./src

# Build ứng dụng NestJS
RUN npm run build

# Stage 2: Production - Runtime image
FROM node:18-alpine AS production

WORKDIR /app

# Cài đặt runtime dependencies cho native modules
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY backend/package*.json ./

# Cài đặt chỉ production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy Prisma files từ builder
COPY --from=builder /app/prisma ./prisma

# Generate Prisma Client cho production
RUN npx prisma generate

# Copy built application từ builder
COPY --from=builder /app/dist ./dist

# Tạo startup script để chạy migrations trước khi start app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "🚀 Running Prisma migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "✅ Migrations completed. Starting application..."' >> /app/start.sh && \
    echo 'exec node dist/src/main.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Tạo non-root user để chạy ứng dụng (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port (Railway sẽ tự động map port)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 404 ? 0 : 1)})"

# Start application với migrations
CMD ["/app/start.sh"]
