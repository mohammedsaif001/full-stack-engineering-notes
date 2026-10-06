import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().defaultRandom().notNull().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  salt: text("salt").notNull(),
  role: varchar({ length: 25 }).notNull().default("user"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const urlsTable = pgTable("urls", {
  id: uuid().defaultRandom().notNull().primaryKey(),
  url: text("url").notNull(),
  shortCode: varchar("short_code", { length: 50 }).notNull().unique(),
  clicks: integer("clicks").notNull().default(0),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});