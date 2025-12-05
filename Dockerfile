# Stage 1: Build backend
FROM node:18-alpine AS builder
WORKDIR /app

# Tooling needed for native deps (argon2/bcrypt/sqlite3) on Alpine
RUN apk add --no-cache python3 make g++ libc6-compat openssl-dev

# Copy backend manifests and sources (keep context small but complete)
COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src

# Install deps and build the Nest app
RUN npm ci \
 && npx prisma generate \
 && npm run build \
 && ls -la dist

# Stage 2: Runtime image
FROM node:18-alpine
WORKDIR /app
# Tooling for native deps at install time in runtime layer
RUN apk add --no-cache python3 make g++ libc6-compat openssl-dev

# Copy manifests and Prisma schema first so postinstall can generate client
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev

# Bring compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start:prod"]

