# Drizzle 01 — Setup in Express + Postgres
## Install, Config, Schema File, Connecting

> Section: [ORM](../README.md) · Concept first: [00 — What Is an ORM](../00-What-Is-an-ORM-Why.md) · Next: [02 — Schema & Migrations](02-Schema-and-Migrations.md)

---

## 📌 Executive Summary

- **Three packages:** `drizzle-orm` (runtime), `drizzle-kit` (CLI for migrations, dev-only), and `pg` (the Postgres driver). Plus `@types/pg` and `tsx`/`typescript` for a TS project.
- **Two files you write:** `src/db/schema.ts` (your tables, in TypeScript) and `drizzle.config.ts` (tells `drizzle-kit` where the schema and DB are).
- **One file that connects:** `src/db/index.ts` — creates a `pg` `Pool` and wraps it with `drizzle()`, exporting a `db` object you import everywhere.
- **`DATABASE_URL`** in a `.env` file is the single connection string both the app and the CLI read.
- No code generation. The moment you write a table in `schema.ts`, its types are available — because they *are* TypeScript.

---

## 🧠 Core Analogy: Wiring a Lamp

- `pg` `Pool` = the **wall socket** — the raw electrical connection to Postgres.
- `drizzle(pool, { schema })` = the **lamp** you plug into it — gives you a usable interface (`db.select()`, `db.insert()`) instead of bare wires.
- `schema.ts` = the **lamp's spec sheet** — what bulbs (tables/columns) it's built for.
- `drizzle.config.ts` = instructions for the **electrician** (`drizzle-kit`) who comes to update the wiring (migrations) — where the spec sheet lives, where the socket is.

---

## 1️⃣ Project skeleton

```
my-api/
├── .env
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── drizzle/                 ← generated migration .sql files live here
└── src/
    ├── index.ts            ← Express app
    ├── db/
    │   ├── index.ts        ← the `db` connection object
    │   └── schema.ts       ← table definitions
    └── routes/
        └── users.ts
```

---

## 2️⃣ Install

```bash
npm init -y
npm i express drizzle-orm pg dotenv
npm i -D drizzle-kit typescript tsx @types/express @types/pg @types/node
```

| Package | Role |
|---|---|
| `drizzle-orm` | The runtime — query builder, types, `drizzle()` |
| `drizzle-kit` | Dev CLI — `generate`, `migrate`, `push`, `studio` |
| `pg` | node-postgres driver (same one used in [15 — Transactions](../../15-Transactions-ACID-Locking.md)) |
| `dotenv` | Loads `.env` into `process.env` |
| `tsx` | Run `.ts` files directly, no build step, in dev |

`package.json` — set ESM and add scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

`tsconfig.json` — a minimal modern config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "drizzle.config.ts"]
}
```

---

## 3️⃣ `.env`

```bash
# Matches the Docker Postgres from file 00 of the main series
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/company_db"
```

> Use a dedicated database for the app (e.g. `blog_db`) rather than reusing `company_db` if you want to keep the ORM project separate — `CREATE DATABASE blog_db;` in psql, and point the URL at it.
>
> **Never commit `.env`.** Add it to `.gitignore` and commit a `.env.example` with placeholder values.

---

## 4️⃣ The schema file — `src/db/schema.ts`

This is your source of truth. Each `pgTable(...)` is one table; the object it returns is what you pass to every query.

```ts
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  published: boolean("published").default(false).notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Handy row types inferred straight from the schema — no codegen
export type User = typeof users.$inferSelect;      // shape of a row you SELECT
export type NewUser = typeof users.$inferInsert;   // shape you INSERT (defaults optional)
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

Notes:

- **First arg** to `pgTable` / column builders is the **real DB name** (`"users"`, `"created_at"`). The **JS key** (`createdAt`) is what you use in code. This is how you keep `snake_case` in the DB and `camelCase` in TypeScript.
- Column types map 1:1 to what you learned in [02 — Data Types](../../02-DDL-Creating-Tables-Data-Types.md): `serial`, `varchar`, `text`, `boolean`, `integer`, `timestamp`, `numeric`, `jsonb`, etc.
- `.notNull()`, `.unique()`, `.default(...)`, `.defaultNow()`, `.primaryKey()`, `.references(...)` are the constraints from [03 — Constraints](../../03-DDL-Constraints-Alter-Drop.md), as chainable methods.
- `.references(() => users.id, { onDelete: "cascade" })` is the foreign key with its `ON DELETE` behaviour.

---

## 5️⃣ `drizzle.config.ts`

Tells `drizzle-kit` (the CLI) where things are.

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",   // where your tables are defined
  out: "./drizzle",               // where generated migration .sql files go
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

---

## 6️⃣ The connection — `src/db/index.ts`

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";   // .js extension: NodeNext ESM resolution

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                    // pool size — see file 15 on why pooling matters
});

// Pass the schema so the relational query API (db.query.*) works — file 04
export const db = drizzle(pool, { schema });

// Export the pool too, for graceful shutdown (file 05)
export { pool };
```

That's it. `import { db } from "./db/index.js"` anywhere and you have a fully typed database handle.

---

## 7️⃣ Minimal Express app — `src/index.ts`

```ts
import "dotenv/config";
import express from "express";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

const app = express();
app.use(express.json());

// Smoke test: list users
app.get("/users", async (_req, res) => {
  const allUsers = await db.select().from(users);
  res.json(allUsers);
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`http://localhost:${port}`));
```

Run it:

```bash
npm run dev
```

`GET /users` will error until the table exists — that's the next file (migrations). If you just want to see it work *right now* for a local spike:

```bash
npm run db:push      # reshape the DB to match schema.ts directly — prototyping only
```

Then `GET /users` returns `[]`.

---

## ✅ Checklist

- [ ] `npm run dev` starts Express with no crash
- [ ] `.env` has a valid `DATABASE_URL` and is gitignored
- [ ] `src/db/schema.ts` has `users` and `posts`
- [ ] `drizzle.config.ts` points `schema` at that file
- [ ] `import { db } from "./db/index.js"` autocompletes `.select`, `.insert`, `.query`
- [ ] `npm run db:push` (spike) or migrations (next file) have created the tables

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What three packages does a Drizzle + Postgres setup need? | `drizzle-orm` (runtime), `drizzle-kit` (dev CLI), and a driver like `pg` |
| Does Drizzle have a code-generation step? | No — types come directly from your TypeScript schema file |
| Where is a Drizzle schema defined? | In TypeScript, using `pgTable(...)` and column builders from `drizzle-orm/pg-core` |
| What does `drizzle.config.ts` do? | Tells `drizzle-kit` the dialect, where the schema file is, where to write migrations, and the DB URL |
| How do you get `camelCase` in code but `snake_case` in the DB? | The first arg to a column builder is the DB name; the JS object key is the code name |
| What is `typeof users.$inferSelect`? | The inferred TypeScript type of a row returned by a `SELECT` on that table |

---

**Next:** [02 — Schema & Migrations](02-Schema-and-Migrations.md) — defining every column type/constraint/relation and running `generate` / `migrate` / `push`.
