FROM node:20-alpine AS builder
WORKDIR /app
# Copiar archivos raíz del monorepo
COPY package*.json ./
COPY apps/frontend-web/package*.json ./apps/frontend-web/
RUN npm ci --workspace=apps/frontend-web
COPY apps/frontend-web ./apps/frontend-web
WORKDIR /app/apps/frontend-web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/frontend-web/.next/standalone ./
COPY --from=builder /app/apps/frontend-web/.next/static ./.next/static
COPY --from=builder /app/apps/frontend-web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
