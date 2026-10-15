# Multi-stage Dockerfile for Household Management App
# Stage 1: Build Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:22-alpine
WORKDIR /app

# Install build dependencies for better-sqlite3 native bindings on alpine if needed
RUN apk add --no-cache python3 make g++

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/src ./src

# Copy built frontend assets
COPY --from=client-builder /app/client/dist /app/client/dist

# Persistent data directory for SQLite
ENV DATA_DIR=/data
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "src/index.js"]
