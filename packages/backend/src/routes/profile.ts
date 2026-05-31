import { Elysia, t }        from "elysia"
import { eq, ilike, sql, desc } from "drizzle-orm"
import { db }               from "../db"
import { profiles, users, contacts, contactRequests, broadcasts } from "../db/schema"
import { authGuard }        from "../middleware/auth"
import { signChatJwt }      from "../lib/chat-jwt"

const CHAT_ENGINE = () => process.env.CHAT_SERVER_URL ?? "http://chat-engine:8080"

function dmRoomId(a: string, b: string) {
  return [a, b].sort().join("__")
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileRoutes = new Elysia({ prefix: "/profile" })
  .use(authGuard)

  .get("/", async ({ currentUser }) => {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.user_id, currentUser.id),
    })
    return { ...currentUser, profile: profile ?? null }
  })

  .post(
    "/",
    async ({ currentUser, body, set }) => {
      const now = Date.now()

      // 1. Check if email is already taken by another user
      if (body.email) {
        const existingEmail = await db.query.users.findFirst({
          where: sql`${users.email} = ${body.email} AND ${users.id} != ${currentUser.id}`,
          columns: { id: true },
        })
        if (existingEmail) {
          set.status = 409
          return { error: "email already taken" }
        }
      }

      // 2. Update users table (email and optionally password)
      const userUpdates: any = { email: body.email || null }
      if (body.password) {
        if (body.password.length < 4) {
          set.status = 400
          return { error: "Password must be at least 4 characters long" }
        }
        userUpdates.password_hash = await Bun.password.hash(body.password)
      }
      await db.update(users).set(userUpdates).where(eq(users.id, currentUser.id))

      // 3. Update or insert profiles table
      const exists = await db.query.profiles.findFirst({
        where: eq(profiles.user_id, currentUser.id),
        columns: { user_id: true },
      })
      if (exists) {
        await db.update(profiles)
          .set({ first_name: body.first_name, last_name: body.last_name, phone: body.phone, updated_at: now })
          .where(eq(profiles.user_id, currentUser.id))
      } else {
        await db.insert(profiles).values({
          user_id: currentUser.id, first_name: body.first_name,
          last_name: body.last_name, phone: body.phone,
          created_at: now, updated_at: now,
        })
      }
      return { ok: true }
    },
    {
      body: t.Object({
        first_name: t.String({ minLength: 1 }),
        last_name:  t.String({ minLength: 1 }),
        phone:      t.String({ minLength: 5 }),
        email:      t.Optional(t.String()),
        password:   t.Optional(t.String()),
      }),
    }
  )

  // PATCH /profile/avatar — обновляет только аватар
  .patch(
    "/avatar",
    async ({ currentUser, body }) => {
      await db.update(profiles)
        .set({ avatar_url: body.avatar_url, updated_at: Date.now() })
        .where(eq(profiles.user_id, currentUser.id))
      return { ok: true }
    },
    {
      body: t.Object({
        avatar_url: t.String({ minLength: 1 }),
      }),
    }
  )

// ── Search ────────────────────────────────────────────────────────────────────
export const searchRoutes = new Elysia({ prefix: "/users" })
  .use(authGuard)

  .get(
    "/search",
    async ({ query, currentUser }) => {
      const q = query.q?.trim()
      if (!q || q.length < 2) return []
      const p = `%${q}%`
      return db
        .select({
          id: users.id, username: users.username,
          first_name: profiles.first_name, last_name: profiles.last_name, phone: profiles.phone,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.user_id))
        .where(sql`${users.id} != ${currentUser.id} AND (
          ${ilike(profiles.first_name, p)} OR ${ilike(profiles.last_name, p)} OR
          ${ilike(users.username, p)}      OR ${ilike(profiles.phone, p)}
        )`)
        .limit(20)
    },
    { query: t.Object({ q: t.Optional(t.String()) }) }
  )

// ── Contacts ──────────────────────────────────────────────────────────────────
export const contactRoutes = new Elysia({ prefix: "/contacts" })
  .use(authGuard)

  .get("/", async ({ currentUser }) => {
    return db
      .select({
        contact_id: contacts.contact_id, room_id: contacts.room_id,
        created_at: contacts.created_at, username: users.username,
        first_name: profiles.first_name, last_name: profiles.last_name, phone: profiles.phone,
      })
      .from(contacts)
      .leftJoin(users,    eq(contacts.contact_id, users.id))
      .leftJoin(profiles, eq(contacts.contact_id, profiles.user_id))
      .where(eq(contacts.user_id, currentUser.id))
  })

  // Отправить запрос на добавление в контакты
  .post(
    "/:userId",
    async ({ params, currentUser, set }) => {
      if (params.userId === currentUser.id) {
        set.status = 400; return { error: "cannot add yourself" }
      }
      const target = await db.query.users.findFirst({
        where: eq(users.id, params.userId), columns: { id: true },
      })
      if (!target) { set.status = 404; return { error: "user not found" } }

      // Уже контакты?
      const alreadyContact = await db.query.contacts.findFirst({
        where: sql`${contacts.user_id} = ${currentUser.id} AND ${contacts.contact_id} = ${params.userId}`,
        columns: { id: true },
      })
      if (alreadyContact) return { ok: true, status: "already_contact" }

      // Уже есть pending запрос?
      const existing = await db.query.contactRequests.findFirst({
        where: sql`${contactRequests.from_id} = ${currentUser.id}
                   AND ${contactRequests.to_id} = ${params.userId}
                   AND ${contactRequests.status} = 'pending'`,
        columns: { id: true },
      })
      if (existing) return { ok: true, status: "pending" }

      const roomId = dmRoomId(currentUser.id, params.userId)
      await db.insert(contactRequests).values({
        id: crypto.randomUUID(), from_id: currentUser.id,
        to_id: params.userId, status: "pending",
        room_id: roomId, created_at: Date.now(),
      })

      // Notify the target user
      const chatToken = await signChatJwt(currentUser.id)
      await fetch(`${CHAT_ENGINE()}/push?token=${chatToken}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: params.userId,
          title:   "Новый запрос",
          body:    `${currentUser!.username} хочет добавить вас в контакты`,
          data:    { type: "contact_request", from_id: currentUser!.id },
        }),
      }).catch(() => {})

      return { ok: true, status: "pending" }
    },
    { params: t.Object({ userId: t.String() }) }
  )

  .delete(
    "/:userId",
    async ({ params, currentUser }) => {
      await db.delete(contacts).where(
        sql`${contacts.user_id} = ${currentUser.id} AND ${contacts.contact_id} = ${params.userId}`
      )
      return { ok: true }
    },
    { params: t.Object({ userId: t.String() }) }
  )

// ── Notifications (contact requests + broadcasts) ─────────────────────────────
export const notificationRoutes = new Elysia({ prefix: "/notifications" })
  .use(authGuard)

  // Contact requests + recent broadcasts, with is_new flag on broadcasts
  .get("/", async ({ currentUser }) => {
    const [contactRows, broadcastRows, profileRow] = await Promise.all([
      db.select({
          id: contactRequests.id, status: contactRequests.status,
          room_id: contactRequests.room_id,
          created_at: contactRequests.created_at, resolved_at: contactRequests.resolved_at,
          from_id: contactRequests.from_id,
          username: users.username,
          first_name: profiles.first_name, last_name: profiles.last_name, phone: profiles.phone,
        })
        .from(contactRequests)
        .leftJoin(users,    eq(contactRequests.from_id, users.id))
        .leftJoin(profiles, eq(contactRequests.from_id, profiles.user_id))
        .where(eq(contactRequests.to_id, currentUser.id))
        .orderBy(sql`${contactRequests.created_at} DESC`)
        .limit(50),

      db.select().from(broadcasts)
        .where(sql`${broadcasts.status} = 'sent'`)
        .orderBy(desc(broadcasts.created_at))
        .limit(30),

      db.select({ broadcasts_seen_at: profiles.broadcasts_seen_at })
        .from(profiles)
        .where(eq(profiles.user_id, currentUser.id))
        .limit(1),
    ])

    const seenAt = profileRow[0]?.broadcasts_seen_at ?? 0

    return {
      contact_requests: contactRows,
      broadcasts: broadcastRows.map(b => ({ ...b, is_new: b.created_at > seenAt })),
    }
  })

  // Total unread: pending contacts + broadcasts newer than last seen
  .get("/count", async ({ currentUser }) => {
    const [contactRows, profileRow] = await Promise.all([
      db.select({ id: contactRequests.id })
        .from(contactRequests)
        .where(sql`${contactRequests.to_id} = ${currentUser.id} AND ${contactRequests.status} = 'pending'`),

      db.select({ broadcasts_seen_at: profiles.broadcasts_seen_at })
        .from(profiles)
        .where(eq(profiles.user_id, currentUser.id))
        .limit(1),
    ])

    const seenAt = profileRow[0]?.broadcasts_seen_at ?? 0
    const [{ count: unreadBroadcasts }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(broadcasts)
      .where(sql`${broadcasts.status} = 'sent' AND ${broadcasts.created_at} > ${seenAt}`)

    return { count: contactRows.length + (unreadBroadcasts ?? 0) }
  })

  // Mark all broadcasts as seen
  .post("/broadcasts-seen", async ({ currentUser }) => {
    await db.update(profiles)
      .set({ broadcasts_seen_at: Date.now() })
      .where(eq(profiles.user_id, currentUser.id))
    return { ok: true }
  })

  // Принять запрос
  .post(
    "/:requestId/accept",
    async ({ params, currentUser, set }) => {
      const req = await db.query.contactRequests.findFirst({
        where: sql`${contactRequests.id} = ${params.requestId}
                   AND ${contactRequests.to_id} = ${currentUser.id}
                   AND ${contactRequests.status} = 'pending'`,
      })
      if (!req) { set.status = 404; return { error: "request not found" } }

      const now = Date.now()

      // Обновляем статус запроса
      await db.update(contactRequests)
        .set({ status: "accepted", resolved_at: now })
        .where(eq(contactRequests.id, req.id))

      // Добавляем контакты ОБОИМ
      await db.insert(contacts).values([
        { id: crypto.randomUUID(), user_id: req.from_id, contact_id: req.to_id,   room_id: req.room_id, created_at: now },
        { id: crypto.randomUUID(), user_id: req.to_id,   contact_id: req.from_id, room_id: req.room_id, created_at: now },
      ]).onConflictDoNothing()

      // Создаём комнату и уведомляем инициатора запроса
      const chatToken = await signChatJwt(currentUser.id)
      await Promise.all([
        fetch(`${CHAT_ENGINE()}/rooms?token=${chatToken}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: req.room_id, members: [req.from_id] }),
        }).catch(() => {}),
        fetch(`${CHAT_ENGINE()}/push?token=${chatToken}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            user_id: req.from_id,
            title:   "Запрос принят",
            body:    `${currentUser!.username} принял ваш запрос`,
            data:    { type: "contact_accepted", room_id: req.room_id },
          }),
        }).catch(() => {}),
      ])

      return { ok: true, room_id: req.room_id }
    },
    { params: t.Object({ requestId: t.String() }) }
  )

  // Отклонить запрос
  .post(
    "/:requestId/reject",
    async ({ params, currentUser, set }) => {
      const req = await db.query.contactRequests.findFirst({
        where: sql`${contactRequests.id} = ${params.requestId}
                   AND ${contactRequests.to_id} = ${currentUser.id}
                   AND ${contactRequests.status} = 'pending'`,
      })
      if (!req) { set.status = 404; return { error: "request not found" } }

      await db.update(contactRequests)
        .set({ status: "rejected", resolved_at: Date.now() })
        .where(eq(contactRequests.id, req.id))

      return { ok: true }
    },
    { params: t.Object({ requestId: t.String() }) }
  )

// ── Chat summaries (last message + unread count per room) ─────────────────────
export const chatSummaryRoutes = new Elysia({ prefix: "/chats" })
  .use(authGuard)
  .get("/", async ({ currentUser }) => {
    const rows = await db.execute(sql`
      WITH my_contacts AS (
        SELECT c.contact_id, c.room_id, c.created_at,
               u.username, p.first_name, p.last_name, p.phone
        FROM contacts c
        LEFT JOIN users    u ON u.id       = c.contact_id
        LEFT JOIN profiles p ON p.user_id  = c.contact_id
        WHERE c.user_id = ${currentUser.id}
      ),
      last_msgs AS (
        SELECT DISTINCT ON (m.room_id)
          m.room_id,
          convert_from(m.payload, 'UTF8') AS text,
          m.timestamp,
          m.sender_id
        FROM messages m
        JOIN my_contacts mc ON mc.room_id = m.room_id
        WHERE m.deleted_at IS NULL
          AND m.payload NOT IN ('join'::bytea, 'leave'::bytea)
        ORDER BY m.room_id, m.timestamp DESC
      ),
      unread AS (
        SELECT m.room_id, COUNT(*)::int AS cnt
        FROM messages m
        JOIN my_contacts mc ON mc.room_id = m.room_id
        WHERE m.sender_id  != ${currentUser.id}
          AND m.deleted_at IS NULL
          AND m.payload NOT IN ('join'::bytea, 'leave'::bytea)
          AND NOT EXISTS (
            SELECT 1 FROM read_receipts rr
            WHERE rr.message_id = m.id AND rr.user_id = ${currentUser.id}
          )
        GROUP BY m.room_id
      )
      SELECT
        mc.contact_id,
        mc.room_id,
        mc.created_at,
        mc.username,
        mc.first_name,
        mc.last_name,
        mc.phone,
        lm.text            AS last_message,
        lm.timestamp       AS last_message_at,
        lm.sender_id       AS last_sender_id,
        COALESCE(u.cnt, 0) AS unread_count
      FROM my_contacts mc
      LEFT JOIN last_msgs lm ON lm.room_id = mc.room_id
      LEFT JOIN unread     u  ON u.room_id  = mc.room_id
      ORDER BY COALESCE(lm.timestamp, mc.created_at) DESC
    `)
    return [...rows]
  })

