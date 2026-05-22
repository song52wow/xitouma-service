FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder

COPY prisma ./prisma
RUN npx prisma generate
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
  && npx prisma generate \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
