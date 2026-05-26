FROM node:22-alpine
WORKDIR /app
ENV PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true
ENV PNPM_CONFIG_FETCH_TIMEOUT=600000
ENV PNPM_CONFIG_FETCH_RETRIES=5
ENV PNPM_CONFIG_NETWORK_CONCURRENCY=1
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile --prefer-offline
WORKDIR /app/artifacts/api-server
RUN pnpm run build
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
