# Rasputin – production image (gateway + login UI)
# Runtime env (required): DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
#   WINNOW_UPSTREAM, WINNOW_UI_TOKEN, RASPUTIN_ALLOWED_EMAILS
# Production also requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Optional: PREVIEW_PORTS
# Port 3001 (Coolify). SQLite volume: /app/data

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache libc6-compat

COPY --from=builder /app .
RUN npm prune --production && mkdir -p /app/data

EXPOSE 3001

CMD ["node", "dist/index.js"]
