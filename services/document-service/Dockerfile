# Build context: repo root (/) — no Prisma
# Coolify may inject NODE_ENV=production — build stage forces development.
FROM node:20-alpine AS build
RUN apk add --no-cache openssl libssl3
WORKDIR /repo
ENV NODE_ENV=development

# Stub root package WITHOUT workspaces (file:../.. deps need this name).
COPY docker/package.stub.json ./package.json

# Build shared library
COPY libs/common-auth ./libs/common-auth
RUN npm ci --prefix libs/common-auth --include=dev --no-workspaces && \
    node libs/common-auth/node_modules/typescript/bin/tsc -p libs/common-auth/tsconfig.json

# Build service
COPY services/document-service ./services/document-service
WORKDIR /repo/services/document-service
RUN npm ci --include=dev --no-workspaces && npm run build && \
    test -f dist/main.js

RUN npm prune --omit=dev

FROM node:20-alpine
RUN apk add --no-cache openssl libssl3
WORKDIR /app
ENV NODE_ENV=production
ENV SERVICE_NAME=document-service

COPY --from=build /repo/libs/common-auth /libs/common-auth
COPY --from=build /repo/services/document-service/node_modules ./node_modules
COPY --from=build /repo/services/document-service/dist ./dist
COPY --from=build /repo/services/document-service/package.json ./package.json

COPY docker/service-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3018
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/main.js"]
