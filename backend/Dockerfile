# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Configure npm với retry và timeout
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 60000

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
# Thêm retry wrapper
RUN npm ci --legacy-peer-deps || \
    (echo "First install failed, retrying..." && sleep 5 && npm ci --legacy-peer-deps) || \
    (echo "Second install failed, retrying..." && sleep 10 && npm ci --legacy-peer-deps)

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Configure npm với retry và timeout
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 60000

# Copy package files
COPY package*.json ./

# Install only production dependencies với retry
RUN npm ci --omit=dev || \
    (echo "First install failed, retrying..." && sleep 5 && npm ci --omit=dev) || \
    (echo "Second install failed, retrying..." && sleep 10 && npm ci --omit=dev)

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma Client for production
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 404 ? 0 : 1)})"

# Start application
CMD ["npm", "run", "start:prod"]