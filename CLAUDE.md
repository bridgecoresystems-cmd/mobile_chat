# mobile_chat

Mobile chat application built with Vue 3 + Capacitor for iOS/Android, Elysia (Bun) BFF backend, and a Rust WebSocket engine.

## Architecture

```
packages/
  mobile/   — Vue 3 + Vite + Capacitor (iOS/Android app)
  backend/  — Elysia (Bun) BFF — auth, profiles, REST proxy to Rust engine
  admin/    — Nuxt admin panel (broadcast, user management)
  shared/   — TypeScript types shared between frontend and backend
```

External services (run via Docker Compose):
- **Rust chat engine** — WebSocket server, rooms, message history, R2 uploads, FCM push, broadcast
- **PostgreSQL** — main database (port 5434 locally, port 5432 inside Docker network)
- **Redis** — pub/sub for real-time events

File storage: **Cloudflare R2** — direct `put_object` via aws-sdk-s3, NOT presigned URLs (presigned PUTs break with R2 CORS).

Push notifications: **Firebase FCM** — project `languageschool-mobile`, service account JSON in `FCM_SERVICE_ACCOUNT` env var.

Email (OTP): **Resend** — verified domain `bcs301.site`, sender `noreply@bcs301.site`.

## Dev setup

```bash
# Start infrastructure (Rust engine + Postgres + Redis)
docker compose up -d

# Start backend + mobile frontend concurrently
bun run dev
```

Backend runs on `localhost:3001`, Vite dev server on `localhost:5173`.

**Proxy note**: `ALL_PROXY` is set in `~/.bashrc`. `NO_PROXY=localhost,127.0.0.1` is also set so that backend→engine requests bypass the proxy.

## Production (VPS)

Domain: `konekt.bridgecore.tech` (Contabo VPS at `207.180.211.68`)

```bash
# On VPS — one-time setup
certbot certonly --nginx -d konekt.bridgecore.tech
cp nginx.konekt.conf /etc/nginx/sites-available/konekt
ln -s /etc/nginx/sites-available/konekt /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Start everything
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# Make user admin (run once after first login)
docker exec konekt_postgres psql -U chat_user -d chat_db \
  -c "UPDATE users SET is_admin = true WHERE username = 'batyr';"
```

Copy `.env.prod.example` → `.env` and fill in all secrets before running.

## Key patterns

### Auth
Two-token system: BFF JWT (`token`) + Rust engine JWT (`chat_token`). Both stored via **`@capacitor/preferences`** (NOT localStorage — Android can clear localStorage between app sessions).

- Auth store: `packages/mobile/src/stores/auth.ts` — exports `initAuth()` async function
- `main.ts` calls `initAuth()` before mounting Vue, so tokens are loaded before router guards run
- `email_verified: boolean` is part of AuthState — controls whether user goes to `/contacts` or `/setup`

`bffHeaders()` injects both tokens into fetch calls. For FormData uploads, use `bffHeaders({ skipContentType: true })`.

### Login & Registration flow

1. **LoginPage** — only Login and Register tabs (no OTP here)
   - After login: redirects to `/contacts` if `email_verified`, else `/setup`
   - After register: always redirects to `/setup`

2. **ProfileSetupPage** — mandatory after registration, two steps:
   - Step 1 (form): first_name, last_name, email, phone → `POST /profile` → `POST /auth/send-otp`
   - Step 2 (OTP): 6 boxes (flex layout, not fixed width — important for narrow screens like Z Fold 5)
   - After OTP verified: `registerPushNotifications()` → `/contacts`
   - Security: even if user closes app and re-logs in, `email_verified=false` sends them back to `/setup`

### OTP
- `POST /auth/send-otp` — generates 6-digit code, stores in `otp_codes` table (10min TTL, max 5 attempts), sends via Resend
- `POST /auth/verify-otp` — validates, sets `email_verified = true`, returns tokens

### File uploads (CORS fix)
Browser cannot PUT directly to R2 presigned URLs (CORS). Upload flow:
1. `POST /upload` → BFF backend (with FormData)
2. BFF fetches presigned URL from Rust engine server-side
3. BFF PUTs the file to R2 (no CORS)
4. Returns `{ file_url }` to frontend

### WebSocket
BFF proxies WebSocket connections to the Rust engine. The proxy is in `packages/backend/src/index.ts`. Client connects to `ws://localhost:3001/?token=<chat_token>`.

### FCM Push notifications
- Rust engine endpoints: `POST /push` (single user by user_id) and `POST /broadcast` (all users)
- BFF profile routes call `/push` on contact request sent and accepted
- Admin broadcast page (`/admin/broadcast`) calls `POST /admin/broadcast` → BFF → Rust `/broadcast`
- FCM token stored in Redis keyed by user_id, set on WebSocket connect

### Elysia plugin scoping — CRITICAL GOTCHA
`onBeforeHandle({ as: "scoped" })` in a plugin LEAKS the hook to the parent app when the plugin is `.use()`d.
Admin guard in `routes/admin.ts` MUST use `{ as: "local" }` — otherwise ALL routes (including public /history) get the admin check and return 403.

### FCM_SERVICE_ACCOUNT env var — CRITICAL GOTCHA
`dotenvy` (like shell `source`) strips inner double quotes from JSON values if the value is unquoted.
**Always wrap in single quotes** in `.env`:
```
FCM_SERVICE_ACCOUNT='{"type":"service_account","project_id":"languageschool-mobile",...}'
```
Without single quotes: Rust gets `{type:service_account,...}` (invalid JSON) → panic on startup.

### Composables (all singletons)
- `useAuthStore()` — auth state, token management (uses `@capacitor/preferences`)
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

Tables added (via `init.sql` or manual ALTER):
- `users`: added `email TEXT UNIQUE`, `is_admin BOOLEAN DEFAULT false`, `email_verified BOOLEAN DEFAULT false`
- `otp_codes`: `email PK`, `code`, `expires_at BIGINT`, `attempts INTEGER`

To apply schema changes in dev (if `drizzle-kit push` fails due to no TTY):
```bash
docker exec chat_postgres psql -U chat_user -d chat_db -c "ALTER TABLE ..."
```

Local Docker containers:
- `chat_postgres` on port **5434** (host) / 5432 (container)
- `chat_redis` on port **6381** (host) / 6379 (container)
- System redis on 6379 (used by Rust engine in dev via `.env`)

## Android APK

Keystore: `konekt-release.jks` (in repo root, gitignored), alias `konekt`, password `konekt2024`.
Gradle signing config is already set in `packages/mobile/android/app/build.gradle`.

```bash
cd packages/mobile
bun run build          # Vite build → dist/
npx cap sync android   # copy dist/ into Android project
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

Production APK points to `https://konekt.bridgecore.tech` (set via `VITE_API_URL` in `.env`).

`google-services.json` must be in `packages/mobile/android/app/` for FCM to work. App package: `com.bridgecore.konekt` (must match Firebase Console entry).

## Shell aliases (in ~/.bashrc)
- `bi` = `bun pm cache rm && bun install`
- `ba` = `bun pm cache rm && bun add`
- `bd` = `bun run dev`
