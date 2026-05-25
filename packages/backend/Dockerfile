FROM oven/bun:1-alpine

WORKDIR /app

# Copy pre-installed node_modules from host (offline build — no internet in Docker)
COPY node_modules/ ./node_modules/
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/

EXPOSE 3001

CMD ["bun", "run", "packages/backend/src/index.ts"]
