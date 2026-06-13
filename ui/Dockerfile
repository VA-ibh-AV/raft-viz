# syntax=docker/dockerfile:1.7

# ── Build (Vite) ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /src

# Cache deps first
COPY package.json package-lock.json ./
RUN npm ci

# Source
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

# ── Serve (nginx) ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Static SPA
COPY --from=build /src/dist /usr/share/nginx/html

# Reverse-proxy + SPA fallback config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
