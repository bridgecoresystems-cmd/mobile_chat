import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const url = process.env.DATABASE_URL ?? "postgres://chat_user:chat_pass@localhost:5432/chat_db"

const client = postgres(url)
export const db = drizzle(client, { schema })
