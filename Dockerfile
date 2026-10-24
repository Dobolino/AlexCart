FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=extra_ca \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production BIND_ADDRESS=0.0.0.0 PORT=8787 ALEXCART_DATA_DIR=/data
COPY --chown=node:node package*.json ./
RUN --mount=type=secret,id=extra_ca \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund && mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node src/utils/syncProtocol.ts ./src/utils/syncProtocol.ts
COPY --chown=node:node src/types ./src/types
USER node
VOLUME ["/data"]
EXPOSE 8787
CMD ["npm", "run", "server"]
