import { pgTable, text, bigint, boolean, integer } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id:             text("id").primaryKey(),
  username:       text("username").notNull().unique(),
  email:          text("email").unique(),
  email_verified: boolean("email_verified").notNull().default(false),
  password_hash:  text("password_hash").notNull(),
  is_admin:       boolean("is_admin").notNull().default(false),
  created_at:     bigint("created_at", { mode: "number" }).notNull(),
})

export const profiles = pgTable("profiles", {
  user_id:    text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  first_name: text("first_name").notNull(),
  last_name:  text("last_name").notNull(),
  phone:      text("phone").notNull(),
  avatar_url: text("avatar_url"),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
  updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export const contacts = pgTable("contacts", {
  id:         text("id").primaryKey(),
  user_id:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contact_id: text("contact_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  room_id:    text("room_id").notNull(),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
})

// OTP коды для входа по email
export const otpCodes = pgTable("otp_codes", {
  email:      text("email").primaryKey(),
  code:       text("code").notNull(),
  expires_at: bigint("expires_at", { mode: "number" }).notNull(),
  attempts:   integer("attempts").notNull().default(0),
})

// Запрос на добавление в контакты
export const contactRequests = pgTable("contact_requests", {
  id:          text("id").primaryKey(),
  from_id:     text("from_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  to_id:       text("to_id").notNull().references(() => users.id,   { onDelete: "cascade" }),
  status:      text("status").notNull().default("pending"), // pending | accepted | rejected
  room_id:     text("room_id").notNull(),
  created_at:  bigint("created_at", { mode: "number" }).notNull(),
  resolved_at: bigint("resolved_at", { mode: "number" }),
})
