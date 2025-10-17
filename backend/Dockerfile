# ------- deps stage -------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ------- builder stage -------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl
RUN npx prisma generate
COPY . .
RUN npm run build

# ------- runtime stage -------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --prod && apk add --no-cache dumb-init openssl
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]