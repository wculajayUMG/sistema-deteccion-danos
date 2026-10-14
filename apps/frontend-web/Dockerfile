FROM node:22-alpine AS builder
WORKDIR /app

# Archivos raíz del monorepo
COPY package.json package-lock.json ./
COPY turbo.json* ./

# Archivos de configuración del workspace
COPY apps/frontend-web/package.json apps/frontend-web/package-lock.json ./apps/frontend-web/
COPY apps/frontend-web/next.config* ./apps/frontend-web/

# Instalar todas las dependencias del monorepo
RUN npm install

# Copiar fuente del workspace
COPY apps/frontend-web ./apps/frontend-web

# Build de Next.js standalone
WORKDIR /app/apps/frontend-web
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend-web/.next/standalone ./
COPY --from=builder /app/apps/frontend-web/.next/static ./.next/static
COPY --from=builder /app/apps/frontend-web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
