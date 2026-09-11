import {
  uuid,
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", { length: 25 }),
  lastName: varchar("last_name", { length: 25 }),

  profileImageURL: text("profile_image_url"),

  email: varchar("email", { length: 322 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),

  password: varchar("password", { length: 60 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const oauthClientsTable = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),

  clientId: varchar("client_id", { length: 64 }).notNull().unique(),
  clientSecretHash: varchar("client_secret_hash", { length: 60 }).notNull(),

  name: varchar("name", { length: 100 }).notNull(),
  redirectUri: text("redirect_uri").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
