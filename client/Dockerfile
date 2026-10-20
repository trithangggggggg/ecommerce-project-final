# syntax=docker/dockerfile:1
# =============================================================================
#  Dockerfile Frontend - Multi-stage build (ReactJS + Vite + Nginx)
# =============================================================================

# ---------- Stage 1: build - biên dịch static files bằng Node.js ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependencies manifest trước để tận dụng cache
COPY package*.json ./
RUN npm ci

# Copy toàn bộ mã nguồn frontend và build bản production
COPY . .
RUN npm run build

# ---------- Stage 2: runtime - Nginx phục vụ static file ----------
FROM nginx:1.27-alpine AS runtime

# Copy file build từ stage 1 vào thư mục phục vụ web của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
