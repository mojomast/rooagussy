# Discord Bot Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built files
COPY --from=builder /app/dist ./dist

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 discordbot && \
    chown -R discordbot:nodejs /app

USER discordbot

CMD ["node", "dist/index.js"]
