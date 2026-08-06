# Multi-stage Dockerfile for Korean Star App

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept Vite build-time environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ZALO_BOT_TOKEN
ARG VITE_ONESIGNAL_APP_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_ZALO_BOT_TOKEN=$VITE_ZALO_BOT_TOKEN
ENV VITE_ONESIGNAL_APP_ID=$VITE_ONESIGNAL_APP_ID

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled dist folder (contains static frontend assets & server.cjs)
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
