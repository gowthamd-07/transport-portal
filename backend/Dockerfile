FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

USER appuser

CMD ["node", "server.js"]
