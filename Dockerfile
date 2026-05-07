FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN PAYLOAD_SECRET=temporary_secret_for_build_only npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/payload.config.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]