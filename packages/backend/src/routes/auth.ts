import { Elysia, t }         from "elysia"
import { jwt }               from "@elysiajs/jwt"
import { eq }                from "drizzle-orm"
import { db }                from "../db"
import { users, otpCodes }   from "../db/schema"
import { signChatJwt }       from "../lib/chat-jwt"
import { authGuard }         from "../middleware/auth"

const RESEND_KEY = () => process.env.RESEND_API_KEY ?? ""
const RESEND_FROM = () => process.env.RESEND_FROM ?? "onboarding@resend.dev"
const OTP_TTL_MS = 10 * 60 * 1000  // 10 minutes
const MAX_ATTEMPTS = 5

function generateOtp(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000))
}

async function sendOtpEmail(to: string, code: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    RESEND_FROM(),
      to,
      subject: "Ваш код входа в Konekt",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
          <h2 style="color:#6366f1;margin-bottom:8px">konekt</h2>
          <p style="color:#555;margin-bottom:24px">Ваш код для входа:</p>
          <div style="background:#f4f4f8;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:700;color:#111">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;margin-top:20px">Код действителен 10 минут. Никому не сообщайте его.</p>
        </div>
      `,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`Resend error: ${res.status} ${err}`)
  }
}

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

  // ── POST /auth/send-otp ───────────────────────────────────────────────────
  .post(
    "/send-otp",
    async ({ body, set }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
        columns: { id: true },
      })
      if (!user) { set.status = 404; return { error: "email not found" } }

      const code = generateOtp()
      const expiresAt = Date.now() + OTP_TTL_MS

      await db.insert(otpCodes)
        .values({ email: body.email, code, expires_at: expiresAt, attempts: 0 })
        .onConflictDoUpdate({
          target: otpCodes.email,
          set: { code, expires_at: expiresAt, attempts: 0 },
        })

      await sendOtpEmail(body.email, code)
      return { ok: true }
    },
    { body: t.Object({ email: t.String({ format: "email" }) }) }
  )

  // ── POST /auth/verify-otp ─────────────────────────────────────────────────
  .post(
    "/verify-otp",
    async ({ body, bffJwt, set }) => {
      const row = await db.query.otpCodes.findFirst({
        where: eq(otpCodes.email, body.email),
      })

      if (!row) { set.status = 401; return { error: "invalid code" } }
      if (Date.now() > row.expires_at) {
        await db.delete(otpCodes).where(eq(otpCodes.email, body.email))
        set.status = 401; return { error: "code expired" }
      }
      if (row.attempts >= MAX_ATTEMPTS) {
        set.status = 429; return { error: "too many attempts" }
      }
      if (row.code !== body.code) {
        await db.update(otpCodes)
          .set({ attempts: row.attempts + 1 })
          .where(eq(otpCodes.email, body.email))
        set.status = 401; return { error: "invalid code" }
      }

      // Код верный — удаляем и выдаём токены
      await db.delete(otpCodes).where(eq(otpCodes.email, body.email))

      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      })
      if (!user) { set.status = 404; return { error: "user not found" } }

      return {
        user:       { id: user.id, username: user.username, email: user.email, created_at: user.created_at },
        token:      await bffJwt.sign({ sub: user.id, username: user.username }),
        chat_token: await signChatJwt(user.id),
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        code:  t.String({ minLength: 6, maxLength: 6 }),
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
