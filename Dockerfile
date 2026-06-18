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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 && apk add --no-cache su-exec chromium nss freetype harfbuzz ca-certificates ttf-freefont
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/payload.config.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /app/media && chown -R nextjs:nodejs /app/media
EXPOSE 3001
CMD ["sh", "-c", "mkdir -p /app/media && chown -R nextjs:nodejs /app/media && su-exec nextjs sh -c 'npx payload migrate --yes && node server.js'"]