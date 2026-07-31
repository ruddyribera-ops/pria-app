FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
# Override build: TypeScript compile + copy markdown prompts + copy migrations
RUN npx tsc && \
    mkdir -p dist/motores/prompts && \
    mkdir -p dist/db/migrations && \
    cp src/motores/prompts/*.md dist/motores/prompts/ 2>/dev/null || true && \
    cp -r src/db/migrations/* dist/db/migrations/ 2>/dev/null || true
ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]