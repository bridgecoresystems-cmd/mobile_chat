FROM node:20-alpine AS builder
WORKDIR /app

COPY packages/admin/node_modules ./node_modules
COPY packages/admin/package.json ./
COPY packages/admin/nuxt.config.ts ./
COPY packages/admin/app.vue ./
COPY packages/admin/assets ./assets
COPY packages/admin/composables ./composables
COPY packages/admin/layouts ./layouts
COPY packages/admin/middleware ./middleware
COPY packages/admin/pages ./pages

RUN node_modules/.bin/nuxt build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
