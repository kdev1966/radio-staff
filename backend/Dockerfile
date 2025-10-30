# ------- deps stage -------
FROM node:20-slim AS deps
WORKDIR /app
# Configure npm to use mirror and increase timeout
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5
COPY package*.json ./
RUN npm ci

# ------- builder stage -------
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ------- runtime stage -------
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y dumb-init wget && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY start.sh ./
RUN chmod +x start.sh
EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]