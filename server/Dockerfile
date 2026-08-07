# Express API production image
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY api ./api
# Runtime needs tsx to execute TypeScript sources in this project layout.
RUN npm install tsx --no-save
RUN mkdir -p uploads
EXPOSE 4000
CMD ["npx", "tsx", "api/src/server.ts"]
