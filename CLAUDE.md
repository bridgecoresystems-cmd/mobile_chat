# mobile_chat

Mobile chat application built with Vue 3 + Capacitor for iOS/Android, Elysia (Bun) BFF backend, and a Rust WebSocket engine.

## Architecture

```
packages/
  mobile/   — Vue 3 + Vite + Capacitor (iOS/Android app)
  backend/  — Elysia (Bun) BFF — auth, profiles, REST proxy to Rust engine
  shared/   — TypeScript types shared between frontend and backend
```

External services (run via Docker Compose):
- **Rust chat engine** — WebSocket server, rooms, message history, R2 uploads
- **PostgreSQL** — main database (port 5434 locally)
- **Redis** — pub/sub for real-time events

File storage: **Cloudflare R2** — R2 credentials live in `.env` and are passed to the Rust engine via docker-compose.

## Dev setup

```bash
# Start infrastructure (Rust engine + Postgres + Redis)
docker compose up -d

# Start backend + mobile frontend concurrently
bun run dev
```

Backend runs on `localhost:3001`, Vite dev server on `localhost:5173`.

**Proxy note**: `ALL_PROXY` is set in `~/.bashrc`. `NO_PROXY=localhost,127.0.0.1` is also set so that backend→engine requests bypass the proxy.

## Key patterns

### Auth
Two-token system: BFF JWT (`token`) + Rust engine JWT (`chat_token`). Both stored in localStorage via `useAuthStore` singleton. `bffHeaders()` injects both into fetch calls. For FormData uploads, use `bffHeaders({ skipContentType: true })` so the browser can set the correct `multipart/form-data` boundary.

### File uploads (CORS fix)
Browser cannot PUT directly to R2 presigned URLs (CORS). Upload flow:
1. `POST /upload` → BFF backend (with FormData)
2. BFF fetches presigned URL from Rust engine server-side
3. BFF PUTs the file to R2 (no CORS)
4. Returns `{ file_url }` to frontend

### WebSocket
BFF proxies WebSocket connections to the Rust engine. The proxy is in `packages/backend/src/index.ts`. Client connects to `ws://localhost:3001/?token=<chat_token>`.

### Composables (all singletons)
- `useAuthStore()` — auth state, token management
- `useTheme()` — dark/light theme, persisted to localStorage
- `useI18n()` — translations for ru/en/tk, persisted to localStorage
- `useAvatarCache()` — profile photo caching via `@capacitor/filesystem`
- `useChat(roomId)` — WebSocket connection, messages, typing indicators

### i18n
Custom lightweight i18n without a library. Single source of truth in `useI18n.ts`. Change language in ProfilePage → all components update reactively. Supports `{placeholder}` substitution via `t('key', { name: 'value' })`.

### Lazy loading
`IntersectionObserver` on a sentinel `<li>` element. Used in ChatsPage and ContactsPage. PAGE_SIZE = 20. Resets on search query change.

### Avatar caching
- Remote URL stored in `@capacitor/preferences` as `my_avatar_remote_url`
- File stored on device via `@capacitor/filesystem` as `my_avatar.jpg`
- `syncAvatar(remoteUrl)` — only re-downloads if URL changed
- `loadLocalAvatar()` — called on mount for instant display before network

## Database

PostgreSQL via Drizzle ORM. Schema in `packages/backend/src/db/schema.ts`.

To apply schema changes in dev (if `drizzle-kit push` fails due to no TTY):
```bash
docker exec chat_postgres psql -U chat_user -d chat_db -c "ALTER TABLE ..."
```

## Shell aliases (in ~/.bashrc)
- `bi` = `bun pm cache rm && bun install`
- `ba` = `bun pm cache rm && bun add`
- `bd` = `bun run dev`
