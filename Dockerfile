# Multi-stage build for Next.js application with FFmpeg and custom server

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install FFmpeg and build dependencies
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files needed for build
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY next.config.js ./
COPY tailwind.config.ts postcss.config.js ./
COPY .eslintrc.json ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY server.ts ./
COPY public ./public

# Set environment to production for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install FFmpeg runtime (required for video processing)
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-libs && \
    which ffmpeg && \
    ffmpeg -version

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json and install production dependencies only
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built Next.js application
COPY --from=builder /app/.next ./.next
# Copy public directory (Next.js static assets)
COPY --from=builder /app/public ./public

# Copy custom server and required source files
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the custom server using tsx
CMD ["npx", "tsx", "server.ts"]
