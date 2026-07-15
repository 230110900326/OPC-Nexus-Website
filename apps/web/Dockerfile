ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm config set registry "${NPM_REGISTRY}" && npm ci

FROM deps AS build
COPY apps/web apps/web
COPY packages packages
RUN npm run build --workspace=@opc/web

FROM deps AS production-deps
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=production-deps /app/package.json /app/package-lock.json ./
COPY --from=production-deps /app/apps/api/package.json apps/api/package.json
COPY --from=production-deps /app/apps/web/package.json apps/web/package.json
COPY --from=production-deps /app/packages/shared/package.json packages/shared/package.json
COPY --from=production-deps /app/packages/ui/package.json packages/ui/package.json
COPY --from=production-deps /app/node_modules node_modules
COPY --from=production-deps /app/apps/web/node_modules apps/web/node_modules
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/public apps/web/public
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@opc/web"]
