import { Elysia, t }              from "elysia"
import { eq, sql, desc }          from "drizzle-orm"
import { db }                     from "../db"
import { users, profiles, contacts, contactRequests } from "../db/schema"
import { authGuard }              from "../middleware/auth"

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

  // ── Broadcast push notification to all users ───────────────────────────────
  .post(
    "/broadcast",
    async ({ body, set }) => {
      const { signChatJwt } = await import("../lib/chat-jwt")
      const chatToken = await signChatJwt("admin")
      const res = await fetch(`${CHAT_ENGINE()}/broadcast?token=${chatToken}`, {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ title: body.title, body: body.body, data: body.data ?? {} }),
      })
      if (!res.ok) { set.status = 502; return { error: "broadcast failed" } }
      return res.json()
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        body:  t.String({ minLength: 1 }),
        data:  t.Optional(t.Record(t.String(), t.String())),
      }),
    }
  )
