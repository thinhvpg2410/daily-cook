FROM node:18-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Cài tool để build native deps (argon2/bcrypt/sqlite3) trên Alpine
RUN apk add --no-cache python3 make g++ libc6-compat openssl-dev

# 1. Copy package.json & lockfile của backend
COPY backend/package*.json ./

# 2. Cài dependencies
RUN npm ci

# 3. Copy toàn bộ code backend cần để build
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src

# 4. Generate Prisma client + build NestJS
RUN npx prisma generate \
 && npm run build \
 && ls -R

# 5. Expose port & chạy app
EXPOSE 3000
CMD ["node", "dist/main.js"]
