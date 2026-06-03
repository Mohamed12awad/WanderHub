# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder — install all deps, generate Prisma client, compile TypeScript
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm ci

# Generate Prisma client before copying source
COPY prisma        ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npx nest build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Production — minimal runtime image
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS production

# Install system Chromium for Puppeteer (PDF invoice generation).
# The app already passes --no-sandbox / --disable-setuid-sandbox at launch.
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Production npm dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the generated Prisma client and CLI from the builder.
# The CLI (prisma binary) is needed to run `migrate deploy` at startup.
COPY --from=builder /app/node_modules/.prisma     ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma      ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# App build output and runtime assets
COPY --from=builder /app/dist ./dist
COPY prisma        ./prisma
COPY prisma.config.ts ./
COPY static        ./static
COPY utils/invoice.pug ./utils/invoice.pug

EXPOSE 3000

# Run pending migrations then start the server.
# `migrate deploy` is idempotent — safe to run on every restart.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
