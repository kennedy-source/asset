FROM node:22-slim AS builder
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
WORKDIR /app/artifacts/pajoy
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/artifacts/pajoy/dist /usr/share/nginx/html
COPY artifacts/pajoy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
