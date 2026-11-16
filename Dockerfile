FROM node:22-alpine

WORKDIR /app

COPY package.json index.mjs server.json ./

USER node

ENTRYPOINT ["node", "index.mjs"]
