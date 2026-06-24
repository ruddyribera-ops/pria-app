# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./dist/db/migrations

# Make migrations read-only
RUN chown -R appuser:appgroup /app/dist/db/migrations && chmod -R 555 /app/dist/db/migrations

ENV NODE_ENV=production
ENV PORT=3000
ENV CORS_ORIGINS="http://localhost:8080,http://localhost:5173"

EXPOSE 3000
USER appuser
CMD ["node", "dist/index.js"]
