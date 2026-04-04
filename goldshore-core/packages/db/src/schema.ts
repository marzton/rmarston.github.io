import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id:         integer("id").primaryKey({ autoIncrement: true }),
  email:      text("email").notNull().unique(),
  name:       text("name").notNull(),
  role:       text("role", { enum: ["admin", "member", "viewer"] }).notNull().default("member"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
export const sessions = sqliteTable("sessions", {
  id:         text("id").primaryKey(),
  user_id:    integer("user_id").notNull().references(() => users.id),
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------
export const events = sqliteTable("events", {
  id:         integer("id").primaryKey({ autoIncrement: true }),
  type:       text("type").notNull(),
  payload:    text("payload").notNull(), // JSON blob
  created_at: text("created_at").notNull(),
});
