# Multistage Dockerfile for SentinelX Node.js Express API Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript code
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy built dist and dependencies
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create uploads directory structure
RUN mkdir -p uploads/datasets uploads/models uploads/machines uploads/merged_datasets

EXPOSE 5000

CMD ["node", "dist/server.js"]
