import { Elysia, t }              from "elysia"
import { eq, sql, desc }          from "drizzle-orm"
import { db }                     from "../db"
import { users, profiles, contacts, contactRequests, broadcasts } from "../db/schema"
import { authGuard }              from "../middleware/auth"
import { broadcastQueue }         from "../lib/queue"

const CHAT_ENGINE = () => process.env.CHAT_SERVER_URL ?? "http://chat-engine:8080"

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(authGuard)

  // Admin guard: reject non-admins (is_admin comes from authGuard's user query)
  .onBeforeHandle({ as: "local" }, ({ currentUser, set }) => {
    if (!(currentUser as any)?.is_admin) { set.status = 403; return { error: "forbidden" } }
  })

  // ── Stats ─────────────────────────────────────────────────────────────────
  .get("/stats", async () => {
    const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users)
    const [contactsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(contacts)
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactRequests)
      .where(eq(contactRequests.status, "pending"))

    return {
      users:    usersCount.count,
      contacts: contactsCount.count,
      pending:  pendingCount.count,
    }
  })

  // ── Users list ────────────────────────────────────────────────────────────
  .get(
    "/users",
    async ({ query }) => {
      const limit  = Math.min(query.limit ?? 50, 200)
      const offset = query.offset ?? 0

      const rows = await db
        .select({
          id:         users.id,
          username:   users.username,
          email:      users.email,
          is_admin:   users.is_admin,
          created_at: users.created_at,
          first_name: profiles.first_name,
          last_name:  profiles.last_name,
          phone:      profiles.phone,
          avatar_url: profiles.avatar_url,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.user_id))
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset(offset)

      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users)

      return { users: rows, total: count }
    },
    {
      query: t.Object({
        limit:  t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
      }),
    }
  )

  // ── Single user ───────────────────────────────────────────────────────────
  .get(
    "/users/:id",
    async ({ params, set }) => {
      const rows = await db
        .select({
          id:         users.id,
          username:   users.username,
          email:      users.email,
          is_admin:   users.is_admin,
          created_at: users.created_at,
          first_name: profiles.first_name,
          last_name:  profiles.last_name,
          phone:      profiles.phone,
          avatar_url: profiles.avatar_url,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.user_id))
        .where(eq(users.id, params.id))
        .limit(1)

      if (!rows.length) { set.status = 404; return { error: "not found" } }
      return rows[0]
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Update user profile ────────────────────────────────────────────────────
  .patch(
    "/users/:id/profile",
    async ({ params, body }) => {
      const now = Date.now()
      const profileSet: Record<string, unknown> = { updated_at: now }
      if (body.first_name !== undefined) profileSet.first_name = body.first_name
      if (body.last_name  !== undefined) profileSet.last_name  = body.last_name
      if (body.phone      !== undefined) profileSet.phone      = body.phone

      if (Object.keys(profileSet).length > 1) {
        await db.update(profiles).set(profileSet).where(eq(profiles.user_id, params.id))
      }
      if (body.email !== undefined) {
        await db.update(users).set({ email: body.email }).where(eq(users.id, params.id))
      }
      return { ok: true }
    },
    {
      params: t.Object({ id: t.String() }),
      body:   t.Object({
        first_name: t.Optional(t.String()),
        last_name:  t.Optional(t.String()),
        phone:      t.Optional(t.String()),
        email:      t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // ── Delete user ───────────────────────────────────────────────────────────
  .delete(
    "/users/:id",
    async ({ params, currentUser, set }) => {
      if (params.id === currentUser!.id) {
        set.status = 400
        return { error: "cannot delete yourself" }
      }
      await db.delete(users).where(eq(users.id, params.id))
      return { ok: true }
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Toggle admin ──────────────────────────────────────────────────────────
  .patch(
    "/users/:id/admin",
    async ({ params, body }) => {
      await db.update(users).set({ is_admin: body.is_admin }).where(eq(users.id, params.id))
      return { ok: true }
    },
    {
      params: t.Object({ id: t.String() }),
      body:   t.Object({ is_admin: t.Boolean() }),
    }
  )

  // ── Rooms (proxy to Rust engine) ──────────────────────────────────────────
  .get("/rooms", async () => {
    const res = await fetch(`${CHAT_ENGINE()}/rooms`)
    if (!res.ok) return []
    return res.json()
  })

  // ── Broadcasts list ────────────────────────────────────────────────────────
  .get(
    "/broadcasts",
    async ({ query }) => {
      const limit  = Math.min(query.limit ?? 50, 200)
      const offset = query.offset ?? 0

      const rows = await db
        .select()
        .from(broadcasts)
        .orderBy(desc(broadcasts.created_at))
        .limit(limit)
        .offset(offset)

      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(broadcasts)
      return { broadcasts: rows, total: count }
    },
    { query: t.Object({ limit: t.Optional(t.Numeric()), offset: t.Optional(t.Numeric()) }) }
  )

  // ── Single broadcast ───────────────────────────────────────────────────────
  .get(
    "/broadcasts/:id",
    async ({ params, set }) => {
      const row = await db.query.broadcasts.findFirst({ where: eq(broadcasts.id, params.id) })
      if (!row) { set.status = 404; return { error: "not found" } }
      return row
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Delete broadcast record ────────────────────────────────────────────────
  .delete(
    "/broadcasts/:id",
    async ({ params }) => {
      await db.delete(broadcasts).where(eq(broadcasts.id, params.id))
      return { ok: true }
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ── Send broadcast via BullMQ (immediate or scheduled) ────────────────────
  .post(
    "/broadcast",
    async ({ body, currentUser }) => {
      const id  = crypto.randomUUID()
      const now = Date.now()

      const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at).getTime() : null
      const delay       = scheduledAt && scheduledAt > now ? scheduledAt - now : 0
      const status      = delay > 0 ? "scheduled" : "pending"

      await db.insert(broadcasts).values({
        id,
        title:               body.title,
        body:                body.body,
        status,
        scheduled_at:        scheduledAt,
        recipients:          0,
        created_by:          currentUser!.id,
        created_by_username: currentUser!.username,
        created_at:          now,
      })

      const job = await broadcastQueue.add(
        "send",
        { broadcastId: id, title: body.title, body: body.body, data: body.data ?? {} },
        { jobId: id, ...(delay > 0 ? { delay } : {}) }
      )

      await db.update(broadcasts).set({ job_id: job.id }).where(eq(broadcasts.id, id))

      return { ok: true, id, scheduled: delay > 0, scheduled_at: scheduledAt }
    },
    {
      body: t.Object({
        title:        t.String({ minLength: 1 }),
        body:         t.String({ minLength: 1 }),
        data:         t.Optional(t.Record(t.String(), t.String())),
        scheduled_at: t.Optional(t.Nullable(t.String())), // ISO datetime, null = immediate
      }),
    }
  )
