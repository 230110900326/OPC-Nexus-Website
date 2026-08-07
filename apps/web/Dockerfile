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
# Ensure the Linux SWC compiler binary is present. npm ci treats it as an optional
# dependency, so a flaky registry download silently skips it, which makes `next build`
# try to patch the lockfile at runtime and time out. Install it explicitly from the
# configured mirror using the exact version pinned in the lockfile.
RUN npm install --no-save --registry "${NPM_REGISTRY}" --workspace=@opc/web "@next/swc-linux-x64-musl@$(node -p "require('./package-lock.json').packages['apps/web/node_modules/next/node_modules/@next/swc-linux-x64-musl'].version")"

FROM deps AS build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
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
RUN mkdir -p /app/apps/web/.next/cache && chown -R node:node /app/apps/web/.next/cache
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@opc/web"]
