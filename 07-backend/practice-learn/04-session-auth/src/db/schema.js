import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid({length:16}).defaultRandom().notNull().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  salt: text("salt").notNull(),
  role: varchar({ length: "25" }).notNull().default("user"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().notNull().$onUpdate(() => new Date()),
});

export const sessionTable = pgTable("sessions", {
  id: uuid({length:16}).defaultRandom().notNull().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
