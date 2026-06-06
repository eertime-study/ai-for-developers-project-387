# syntax=docker/dockerfile:1.7

# ---------- 1. TypeSpec compile: openapi.yaml для фронта и бэка ----------
FROM node:22-alpine AS spec
WORKDIR /spec
COPY spec/package*.json ./
RUN npm ci
COPY spec/ ./
RUN npm run compile

# ---------- 2. Frontend build: статика SPA с VITE_API_URL=/api ----------
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json frontend/.npmrc ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
# Контракт нужен в том же относительном пути, который ждёт gen:api (../spec/...).
COPY --from=spec /spec/tsp-output/@typespec/openapi3/openapi.yaml /app/spec/tsp-output/@typespec/openapi3/openapi.yaml
RUN npm run gen:api
ENV VITE_API_URL=/api
RUN npm run build

# ---------- 3. Backend build: tsc → dist/ ----------
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
COPY --from=spec /spec/tsp-output/@typespec/openapi3/openapi.yaml /app/spec/tsp-output/@typespec/openapi3/openapi.yaml
RUN npm run gen:api
RUN npm run build

# ---------- 4. Runtime: prod-deps + dist + openapi.yaml + frontend-dist ----------
FROM node:22-alpine AS runtime
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=spec /spec/tsp-output/@typespec/openapi3/openapi.yaml ./openapi.yaml
COPY --from=frontend-build /app/frontend/dist ./frontend-dist

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    API_PREFIX=/api \
    STATIC_DIR=/app/frontend-dist \
    OPENAPI_SPEC_PATH=/app/openapi.yaml

# PORT приходит из окружения (Render задаёт сам, локально — `-e PORT=…`).
CMD ["node", "dist/server.js"]
