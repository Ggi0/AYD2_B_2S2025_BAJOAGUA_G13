 # ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite build — ajusta si usas un script distinto
RUN npm run build
# ---- Production Stage (Nginx) ----
FROM nginx:1.27-alpine
# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*
# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
# Custom nginx config to support React Router (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]