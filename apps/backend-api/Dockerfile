FROM node:22-alpine AS builder
WORKDIR /app

# Archivos raíz del monorepo
COPY package.json package-lock.json ./
COPY turbo.json* ./

# Package del workspace
COPY apps/backend-api/package.json apps/backend-api/package-lock.json ./apps/backend-api/

# Instalar todas las dependencias del monorepo
RUN npm install

# Copiar fuente del workspace
COPY apps/backend-api ./apps/backend-api

# Build desde el directorio del workspace
WORKDIR /app/apps/backend-api
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/apps/backend-api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend-api/package*.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
