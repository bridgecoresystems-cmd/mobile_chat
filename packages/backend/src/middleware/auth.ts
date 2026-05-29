import { Elysia }  from "elysia"
import { jwt }     from "@elysiajs/jwt"
import { eq }      from "drizzle-orm"
import { db }      from "../db"
import { users }   from "../db/schema"

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production"

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwt({ name: "bffJwt", secret: JWT_SECRET, exp: "7d" }))

  // Step 1: resolve currentUser (null if token missing/invalid)
  .resolve({ as: "scoped" }, async ({ headers, bffJwt }) => {
    const bearer = headers.authorization?.startsWith("Bearer ")
      ? headers.authorization.slice(7)
      : null

    if (!bearer) return { currentUser: null as null }

    const payload = await bffJwt.verify(bearer)
    if (!payload)  return { currentUser: null as null }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub as string),
      columns: { id: true, username: true, is_admin: true, created_at: true },
    })

    return { currentUser: user ?? null }
  })

  // Step 2: reject unauthenticated requests before they reach the handler
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, set }) => {
    if (!currentUser) {
      set.status = 401
      return { error: "unauthorized" }
    }
  })
