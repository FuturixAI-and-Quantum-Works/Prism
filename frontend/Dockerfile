# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/protocol/package.json ./packages/protocol/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@prism/frontend --workspace=@prism/protocol

COPY frontend/index.html ./frontend/index.html
COPY frontend/src ./frontend/src
COPY frontend/tsconfig.json ./frontend/tsconfig.json
COPY frontend/vite.config.js ./frontend/vite.config.js
COPY packages/protocol/src ./packages/protocol/src
COPY packages/protocol/tsconfig.json ./packages/protocol/tsconfig.json

ARG VITE_API_BASE_URL=http://localhost:8003
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build --workspace=@prism/protocol \
    && npm run build --workspace=@prism/frontend

FROM nginx:1.29-alpine AS runtime

ENV PORT=8080

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=build --chown=nginx:nginx /app/frontend/dist /usr/share/nginx/html
COPY --chown=nginx:nginx frontend/nginx.conf /etc/nginx/nginx.conf.template

USER nginx
EXPOSE 8080
STOPSIGNAL SIGQUIT
ENTRYPOINT []
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf && exec nginx -c /tmp/nginx.conf -g 'daemon off;'"]
