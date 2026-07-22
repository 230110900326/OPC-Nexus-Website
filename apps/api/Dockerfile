# Build the NestJS API from the repository root so workspace packages remain available.
ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm config set registry "${NPM_REGISTRY}" && npm ci

FROM deps AS build
COPY apps/api apps/api
COPY packages packages
RUN npm run build --workspace=@opc/api

FROM deps AS production-deps
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-deps /app/package.json /app/package-lock.json ./
COPY --from=production-deps /app/apps/api/package.json apps/api/package.json
COPY --from=production-deps /app/apps/web/package.json apps/web/package.json
COPY --from=production-deps /app/packages/shared/package.json packages/shared/package.json
COPY --from=production-deps /app/packages/ui/package.json packages/ui/package.json
COPY --from=production-deps /app/node_modules node_modules
COPY --from=production-deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 4000
CMD ["sh", "-c", "npm run migration:run --workspace=@opc/api && npm run start --workspace=@opc/api"]
