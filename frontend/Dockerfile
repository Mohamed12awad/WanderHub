# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Build — compile React/Vite app into static files
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL is baked into the JS bundle at build time.
# Default is /api so nginx can proxy it to the backend on the same origin.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Serve — nginx serves static files and proxies /api/ to the backend
# ──────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist          /usr/share/nginx/html
COPY               nginx.conf          /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
