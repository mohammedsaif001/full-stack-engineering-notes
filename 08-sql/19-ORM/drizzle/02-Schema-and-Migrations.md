# Drizzle 02 — Schema & Migrations
## Defining Tables, and `generate` / `migrate` / `push`

> Previous: [01 — Setup](01-Setup-Express-Postgres.md) · Next: [03 — CRUD Queries](03-CRUD-Queries.md)

---

## 📌 Executive Summary

- Your `schema.ts` is the **source of truth**. `drizzle-kit` compares it to the database and produces the SQL to close the gap.
- **`drizzle-kit generate`** — writes a versioned `.sql` migration file into `./drizzle/` describing the change. It does **not** touch the database.
- **`drizzle-kit migrate`** — applies any pending migration files to the database, in order, recording each in a `__drizzle_migrations` table.
- **`drizzle-kit push`** — skips migration files entirely and directly reshapes the DB to match `schema.ts`. **Prototyping only** — no history, can drop columns/data.
- **Workflow for a real project:** edit `schema.ts` → `generate` → review the generated `.sql` → commit it → `migrate` (locally, in CI, in prod deploy).
- Every column type and constraint from files [02](../../02-DDL-Creating-Tables-Data-Types.md)–[03](../../03-DDL-Constraints-Alter-Drop.md) has a Drizzle builder. Relations for the query API are declared separately with `relations()`.

---

## 🧠 Core Analogy: Blueprints vs the Building

- `schema.ts` = the **architect's current blueprint**.
- The **database** = the **building as it stands right now**.
- `generate` = the architect drawing up a **change order** ("add a window here, move that wall") — a dated document, filed. The building is untouched.
- `migrate` = the **construction crew** executing all filed change orders they haven't done yet, in date order, and ticking each off a checklist on the site office wall.
- `push` = a contractor with a photo of the blueprint just **rebuilding the wall on the spot** to match — fast, but no paperwork, and if the new plan has no doorway where the old one did, the doorway is gone.

---

## 1️⃣ Column types & constraints — the full mapping

From `drizzle-orm/pg-core`. Compare to [02 — Data Types](../../02-DDL-Creating-Tables-Data-Types.md).

```ts
import {
  pgTable, serial, bigserial, integer, bigint, smallint,
  numeric, real, doublePrecision,
  varchar, text, char,
  boolean,
  date, time, timestamp, interval,
  json, jsonb,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";

// An enum type (CREATE TYPE ... AS ENUM)
export const roleEnum = pgEnum("role", ["admin", "editor", "viewer"]);

export const demo = pgTable("demo", {
  id: serial("id").primaryKey(),               // SERIAL PRIMARY KEY
  bigId: bigserial("big_id", { mode: "number" }),
  count: integer("count").default(0).notNull(),// INTEGER DEFAULT 0 NOT NULL
  price: numeric("price", { precision: 10, scale: 2 }),  // NUMERIC(10,2) — money
  name: varchar("name", { length: 100 }).notNull(),
  bio: text("bio"),
  isActive: boolean("is_active").default(true).notNull(),
  birthday: date("birthday"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  prefs: jsonb("prefs").$type<{ theme: string }>().default({ theme: "light" }),
  publicId: uuid("public_id").defaultRandom().notNull(),
  role: roleEnum("role").default("viewer").notNull(),
});
```

### Constraint methods

| SQL ([03](../../03-DDL-Constraints-Alter-Drop.md)) | Drizzle |
|---|---|
| `PRIMARY KEY` | `.primaryKey()` |
| `NOT NULL` | `.notNull()` |
| `UNIQUE` | `.unique()` |
| `DEFAULT x` | `.default(x)` / `.defaultNow()` / `.defaultRandom()` |
| `CHECK (...)` | `check("name", sql\`...\`)` in the table's second-arg callback |
| `FOREIGN KEY ... REFERENCES` | `.references(() => other.col, { onDelete: "cascade" })` |
| Composite PK / multi-col UNIQUE / named index | table's second-arg callback (below) |

### Table-level constraints & indexes (second argument)

```ts
import { pgTable, integer, timestamp, primaryKey, unique, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const follows = pgTable(
  "follows",
  {
    followerId: integer("follower_id").notNull().references(() => users.id),
    followingId: integer("following_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followingId] }),  // composite PK
    // uniqPair: unique().on(t.followerId, t.followingId),
    // idx: index("follows_following_idx").on(t.followingId),
    // noSelfFollow: check("no_self_follow", sql`${t.followerId} <> ${t.followingId}`),
  })
);
```

---

## 2️⃣ Relations — for the relational query API

`.references()` creates the **foreign key in the database**. To also use Drizzle's `db.query.users.findMany({ with: { posts: true } })` API (file 04), you declare the relationship in JS with `relations()`. This adds **no SQL** — it's metadata for the query builder.

```ts
import { relations } from "drizzle-orm";
import { users, posts } from "./schema.js";

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),                 // one user → many posts
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {                // one post → one user
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

Put these in `schema.ts` (or a `relations.ts` also imported by `db/index.ts`).

---

## 3️⃣ The migration workflow (real projects)

### Step 1 — edit the schema

Say you add `phone` to `users`:

```ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  phone: varchar("phone", { length: 15 }),          // ← new
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Step 2 — generate the migration

```bash
npm run db:generate
```
```text
drizzle-kit: v0.2x.x
Reading config file 'drizzle.config.ts'
1 tables
users 5 columns 1 indexes 0 fks
[✓] Your SQL migration file ➜ drizzle/0001_flaky_moon_knight.sql 🚀
```

The generated `drizzle/0001_flaky_moon_knight.sql`:

```sql
ALTER TABLE "users" ADD COLUMN "phone" varchar(15);
```

**Read this file before committing.** For simple additive changes it's trivial; for renames or type changes, verify it does what you intend (Drizzle may ask, on `generate`, whether a change is a rename or a drop+add — answer carefully, a wrong answer here loses data).

### Step 3 — apply it

```bash
npm run db:migrate
```
```text
[✓] migrations applied successfully!
```

Drizzle records `0001_...` in the `__drizzle_migrations` table. Run `migrate` again and it does nothing — already applied.

### Step 4 — commit

```bash
git add src/db/schema.ts drizzle/0001_flaky_moon_knight.sql drizzle/meta/
git commit -m "Add phone to users"
```

Now a teammate pulls, runs `npm run db:migrate`, and their DB gets `0001` automatically. CI runs it. Your deploy pipeline runs `drizzle-kit migrate` (or a small script calling the `migrate()` function) as a release step **before** the new app code starts.

### The first migration

The very first `generate` produces `0000_*.sql` with the full `CREATE TABLE` statements for `users` and `posts`. `migrate` creates them.

---

## 4️⃣ `push` — the prototyping shortcut

```bash
npm run db:push
```
```text
[✓] Changes applied
```

- Diffs `schema.ts` against the live DB and **directly** runs the `ALTER`/`CREATE`/`DROP` to match — **no file written**.
- Great while you're still shaping the model and the DB has no data you care about.
- **Dangerous with real data:** removing a column from `schema.ts` and pushing **drops the column** (Drizzle warns, but it's one keypress). No history, nothing to roll back, nothing to review.
- **Rule:** `push` for a solo local spike; the instant the project is shared or has data that matters, switch to `generate` + `migrate` and never `push` that database again.

| | `generate` + `migrate` | `push` |
|---|---|---|
| Writes a reviewable `.sql` file | ✅ | ❌ |
| Safe for production | ✅ | ❌ |
| History in git | ✅ | ❌ |
| Fastest for a throwaway prototype | — | ✅ |

---

## 5️⃣ Applying migrations from code (deploy step)

Instead of the CLI in production, you can run migrations programmatically — handy in a Docker entrypoint or a release script:

```ts
// src/db/migrate.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./drizzle" });
await pool.end();
console.log("migrations done");
```

```bash
tsx src/db/migrate.ts    # run this before starting the app on deploy
```

---

## 6️⃣ Drizzle Studio — browse the DB

```bash
npm run db:studio
```

Opens a local web UI to view/edit table data — Drizzle's equivalent of Prisma Studio. Useful for eyeballing what your queries actually wrote.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What does `drizzle-kit generate` do? | Diffs the schema against the DB and writes a versioned `.sql` migration file — without touching the DB |
| What does `drizzle-kit migrate` do? | Applies pending migration files in order, recording them in `__drizzle_migrations` |
| `generate`/`migrate` vs `push`? | The first pair writes reviewable, committable history and is production-safe; `push` reshapes the DB directly with no history — prototyping only |
| How does `.references()` differ from `relations()`? | `.references()` creates the actual FK in the DB; `relations()` is JS-only metadata enabling the `with:` relational query API |
| How do you keep `snake_case` columns but `camelCase` code? | The column builder's first argument is the DB name; the object key is the code name |
| How do you run migrations on deploy without the CLI? | Call the `migrate()` function from `drizzle-orm/.../migrator` in a small script, before the app starts |

---

**Next:** [03 — CRUD Queries](03-CRUD-Queries.md) — `insert`, `select`, `update`, `delete` with every option you'll use.
