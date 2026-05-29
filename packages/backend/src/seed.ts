/**
 * Seed script — creates an admin user if one doesn't exist.
 *
 * Usage:
 *   bun run src/seed.ts
 *   bun run src/seed.ts --username admin --password secret123
 *
 * Env vars (optional overrides):
 *   SEED_USERNAME  — default: "admin"
 *   SEED_PASSWORD  — default: "admin123"
 *   SEED_EMAIL     — default: "admin@konekt.local"
 */

import { eq } from "drizzle-orm"
import { db } from "./db"
import { users, profiles } from "./db/schema"

const args    = process.argv.slice(2)
const argMap  = Object.fromEntries(
  args.flatMap((a, i) => a.startsWith("--") ? [[a.slice(2), args[i + 1]]] : [])
)

const USERNAME = argMap.username ?? process.env.SEED_USERNAME ?? "admin"
const PASSWORD = argMap.password ?? process.env.SEED_PASSWORD ?? "admin123"
const EMAIL    = argMap.email    ?? process.env.SEED_EMAIL    ?? "admin@konekt.local"

async function seed() {
  console.log("🌱 Seeding admin user...")

  const existing = await db.query.users.findFirst({
    where: eq(users.username, USERNAME),
    columns: { id: true, is_admin: true },
  })

  if (existing) {
    if (!existing.is_admin) {
      await db.update(users).set({ is_admin: true }).where(eq(users.id, existing.id))
      console.log(`✅ User "@${USERNAME}" already exists — promoted to admin.`)
    } else {
      console.log(`ℹ️  User "@${USERNAME}" already exists and is already an admin. Nothing to do.`)
    }
    return
  }

  const id  = crypto.randomUUID()
  const now = Date.now()

  await db.insert(users).values({
    id,
    username:      USERNAME,
    email:         EMAIL,
    password_hash: await Bun.password.hash(PASSWORD),
    is_admin:      true,
    created_at:    now,
  })

  await db.insert(profiles).values({
    user_id:    id,
    first_name: "Admin",
    last_name:  "konekt",
    phone:      "",
    created_at: now,
    updated_at: now,
  })

  console.log(`✅ Admin user created:`)
  console.log(`   username : ${USERNAME}`)
  console.log(`   password : ${PASSWORD}`)
  console.log(`   email    : ${EMAIL}`)
  console.log(`   id       : ${id}`)
  console.log()
  console.log("👉 Open http://localhost:3002 and log in.")
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌ Seed failed:", err); process.exit(1) })
