import { Elysia, t }         from "elysia"
import { jwt }               from "@elysiajs/jwt"
import { eq }                from "drizzle-orm"
import { db }                from "../db"
import { users }             from "../db/schema"
import { signChatJwt }       from "../lib/chat-jwt"
import { authGuard }         from "../middleware/auth"

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production"

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwt({ name: "bffJwt", secret: JWT_SECRET, exp: "7d" }))

  // ── POST /auth/register ───────────────────────────────────────────────────
  .post(
    "/register",
    async ({ body, bffJwt, set }) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.username, body.username),
        columns: { id: true },
      })
      if (existing) { set.status = 409; return { error: "username already taken" } }

      if (body.email) {
        const existingEmail = await db.query.users.findFirst({
          where: eq(users.email, body.email),
          columns: { id: true },
        })
        if (existingEmail) { set.status = 409; return { error: "email already taken" } }
      }

      const id  = crypto.randomUUID()
      const now = Date.now()

      await db.insert(users).values({
        id,
        username:      body.username,
        email:         body.email ?? null,
        password_hash: await Bun.password.hash(body.password),
        created_at:    now,
      })

      return {
        user:        { id, username: body.username, email: body.email ?? undefined, created_at: now },
        token:       await bffJwt.sign({ sub: id, username: body.username }),
        chat_token:  await signChatJwt(id),
      }
    },
    {
      body: t.Object({
        username: t.String({ minLength: 2, maxLength: 32 }),
        password: t.String({ minLength: 4 }),
        email:    t.Optional(t.String()),
      }),
    }
  )

  // ── POST /auth/login ──────────────────────────────────────────────────────
  .post(
    "/login",
    async ({ body, bffJwt, set }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.username, body.username),
      })
      if (!user || !(await Bun.password.verify(body.password, user.password_hash))) {
        set.status = 401; return { error: "invalid credentials" }
      }

      return {
        user:        { id: user.id, username: user.username, created_at: user.created_at },
        token:       await bffJwt.sign({ sub: user.id, username: user.username }),
        chat_token:  await signChatJwt(user.id),
      }
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )

  // ── GET /auth/me  (protected) ─────────────────────────────────────────────
  .use(authGuard)
  .get("/me", ({ currentUser }) => currentUser)

  // ── POST /auth/refresh-chat-token  (protected) ────────────────────────────
  // Issues a fresh chat JWT for the Rust engine (useful after long inactivity)
  .post("/refresh-chat-token", async ({ currentUser }) => ({
    chat_token: await signChatJwt(currentUser.id),
  }))
