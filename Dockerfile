FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

COPY src ./src
COPY data ./data
COPY server.json README.md LICENSE ./

USER node

ENTRYPOINT ["node", "src/index.mjs"]
