# Stage 1: Build backend
FROM node:18-alpine AS builder
WORKDIR /app/backend

RUN apk add --no-cache python3 make g++ libc6-compat openssl-dev

# Copy backend files
COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src

# Install dependencies + generate Prisma + build NestJS
RUN npm ci \
 && npx prisma generate \
 && npm run build \
 && ls -la dist

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app/backend

RUN apk add --no-cache python3 make g++ libc6-compat openssl-dev

# Copy only required files
COPY backend/package*.json ./
COPY backend/prisma ./prisma

# Copy built node_modules + dist from builder
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist

# Remove devDependencies
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/main.js"]
    