FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN groupadd --system underflow \
  && useradd --system --gid underflow --create-home --home-dir /home/underflow underflow \
  && chown -R underflow:underflow /app

USER underflow

EXPOSE 3080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3080') + '/api/v1/health').then((res) => { if (!res.ok) process.exit(1); }).catch(() => process.exit(1));"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
