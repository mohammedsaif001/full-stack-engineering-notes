import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users.models.js";

export const booksTable = pgTable("books", {
  id: uuid().primaryKey().notNull().defaultRandom(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  authorId: uuid().notNull().references(()=>usersTable.id),
  genre: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
