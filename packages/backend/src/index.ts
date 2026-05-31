import sharp             from "sharp"
import { Elysia, t }   from "elysia"
import { cors }         from "@elysiajs/cors"
import { swagger }      from "@elysiajs/swagger"
import { authRoutes }   from "./routes/auth"
import { authGuard }    from "./middleware/auth"
import { profileRoutes, searchRoutes, contactRoutes, notificationRoutes, chatSummaryRoutes } from "./routes/profile"
import { adminRoutes }  from "./routes/admin"
import { db }           from "./db"
import { deviceTokens } from "./db/schema"
import { startBroadcastWorker } from "./workers/broadcast.worker"

startBroadcastWorker()

const CHAT_ENGINE = process.env.CHAT_SERVER_URL ?? "http://chat-engine:8080"
const CHAT_WS     = CHAT_ENGINE.replace(/^http/, "ws")
const PORT        = Number(process.env.PORT ?? 3001)

// Per-connection WebSocket proxy state (keyed by an id stashed on ws.data)
const wsConns = new Map<string, { up: WebSocket; pending: Uint8Array[] }>()

const app = new Elysia()
  .use(cors())
  .use(swagger({ path: "/docs" }))

  .get("/health", () => ({ status: "ok" }))

  .use(authRoutes)
  .use(profileRoutes)
  .use(searchRoutes)
  .use(contactRoutes)
  .use(notificationRoutes)
  .use(adminRoutes)
  .use(chatSummaryRoutes)

  // ── Public: history (no auth needed, Rust engine is source of truth) ──────
  .get(
    "/history/:roomId",
    async ({ params, query }) => {
      const limit = Math.min(Number(query.limit ?? 50), 200)
      const res   = await fetch(`${CHAT_ENGINE}/history/${params.roomId}?limit=${limit}`)
      return res.json()
    },
    {
      params: t.Object({ roomId: t.String() }),
      query:  t.Object({ limit: t.Optional(t.Numeric()) }),
    }
  )

  // ── WebSocket proxy → Rust engine (auth via ?token= handled by Rust) ──────
  // Per-connection upstream state lives in a Map: Elysia rewraps `ws` on every
  // callback, so properties stashed on `ws` itself do not survive between them.
  // Frames sent before the upstream opens are buffered (the client's first frame
  // is the room-join declaration and must not be dropped). The upstream→client
  // path uses `ws.raw.send` to emit raw binary — Elysia's `ws.send` mangles
  // ArrayBuffers by serializing them.
  .ws("/", {
    query: t.Object({ token: t.Optional(t.String()) }),
    open(ws) {
      const id    = crypto.randomUUID()
      ;(ws.data as any)._id = id
      const token = ws.data.query.token ?? ""

      const upstream = new WebSocket(`${CHAT_WS}/?token=${token}`)
      upstream.binaryType = "arraybuffer"
      const state = { up: upstream, pending: [] as Uint8Array[] }
      wsConns.set(id, state)

      const sendBinary = (data: ArrayBuffer) => {
        const raw = (ws as any).raw
        if (raw?.send) raw.send(new Uint8Array(data))
        else           ws.send(new Uint8Array(data))
      }

      upstream.onopen    = ()  => { for (const m of state.pending) upstream.send(m); state.pending.length = 0 }
      upstream.onmessage = (e) => sendBinary(e.data as ArrayBuffer)
      upstream.onclose   = ()  => ws.close()
      upstream.onerror   = ()  => ws.close()
    },
    message(ws, msg) {
      const state = wsConns.get((ws.data as any)._id)
      if (!state) return
      // Copy the incoming frame: Bun reuses the backing Buffer for the next message.
      const data = new Uint8Array(msg as Uint8Array)
      if (state.up.readyState === 1) state.up.send(data)
      else                           state.pending.push(data)
    },
    close(ws) {
      const id = (ws.data as any)._id as string
      wsConns.get(id)?.up.close()
      wsConns.delete(id)
    },
  })

  // ── Protected endpoints (BFF JWT required) ────────────────────────────────
  .use(authGuard)

  .get("/rooms", async ({ headers, set }) => {
    const chatToken = headers["x-chat-token"]
    if (!chatToken) { set.status = 400; return { error: "missing X-Chat-Token header" } }
    const res = await fetch(`${CHAT_ENGINE}/rooms?token=${chatToken}`)
    return res.json()
  })

  .post(
    "/rooms",
    async ({ headers, body, set }) => {
      const chatToken = headers["x-chat-token"]
      if (!chatToken) { set.status = 400; return { error: "missing X-Chat-Token header" } }
      const res = await fetch(`${CHAT_ENGINE}/rooms?token=${chatToken}`, {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify(body),
      })
      set.status = res.status
      return res.json()
    },
    {
      body: t.Object({
        name:    t.String({ minLength: 1 }),
        members: t.Array(t.String()),
      }),
    }
  )

  .delete(
    "/rooms/:roomId",
    async ({ params, headers, set }) => {
      const chatToken = headers["x-chat-token"]
      if (!chatToken) { set.status = 400; return { error: "missing X-Chat-Token header" } }
      const res = await fetch(`${CHAT_ENGINE}/rooms/${params.roomId}?token=${chatToken}`, { method: "DELETE" })
      set.status = res.status
      return res.json()
    },
    { params: t.Object({ roomId: t.String() }) }
  )

  .get(
    "/upload-url",
    async ({ headers, query, set }) => {
      const chatToken = headers["x-chat-token"]
      if (!chatToken) { set.status = 400; return { error: "missing X-Chat-Token header" } }
      const { filename, content_type } = query
      const qs = `filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(content_type ?? "image/jpeg")}&token=${chatToken}`
      const res = await fetch(`${CHAT_ENGINE}/upload-url?${qs}`)
      return res.json()
    },
    {
      query: t.Object({
        filename:     t.String({ minLength: 1 }),
        content_type: t.Optional(t.String()),
      }),
    }
  )

  // POST /upload — Sharp compress → R2 via engine (no CORS issues on client)
  .post(
    "/upload",
    async ({ headers, body, set }) => {
      const chatToken = headers["x-chat-token"]
      if (!chatToken) { set.status = 400; return { error: "missing X-Chat-Token header" } }

      const file   = body.file as File
      const raw    = Buffer.from(await file.arrayBuffer())
      const processed = await sharp(raw)
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer()

      const qs        = `content_type=image/jpeg&token=${chatToken}`
      const uploadRes = await fetch(`${CHAT_ENGINE}/upload?${qs}`, {
        method:  "POST",
        headers: { "content-type": "image/jpeg" },
        body:    new Blob([processed], { type: "image/jpeg" }),
      })
      if (!uploadRes.ok) {
        const errBody = await uploadRes.text().catch(() => "")
        console.error(`[upload] engine upload failed: ${uploadRes.status} ${errBody}`)
        set.status = 502; return { error: "upload failed" }
      }

      const { file_url } = await uploadRes.json() as { file_url: string }
      return { file_url }
    },
    {
      body: t.Object({
        file: t.File({ maxSize: "20m" }),
      }),
    }
  )

  .use(
    new Elysia()
      .use(authGuard)
      .post(
        "/register-fcm-token",
        async ({ currentUser, body }) => {
          await db.insert(deviceTokens)
            .values({ user_id: currentUser.id, fcm_token: body.token, updated_at: Date.now() })
            .onConflictDoUpdate({
              target: deviceTokens.user_id,
              set: { fcm_token: body.token, updated_at: Date.now() },
            })
          return { ok: true }
        },
        { body: t.Object({ token: t.String() }) }
      )
  )

  .listen(PORT)

console.log(`BridgeCore Chat BFF → http://localhost:${PORT}`)
console.log(`Swagger docs        → http://localhost:${PORT}/docs`)
