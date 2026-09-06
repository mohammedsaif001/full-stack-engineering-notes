# 19 — ORMs: Drizzle & Prisma

You've spent 18 files learning raw SQL. This section is about **not writing it by hand** in application code — using an **ORM** (Object-Relational Mapper) so your database work is TypeScript objects and function calls, type-checked at compile time, instead of hand-concatenated query strings.

Everything here targets **PostgreSQL**, **Express 5**, **ESM + TypeScript**.

---

## Read this first

| File | What it covers |
|---|---|
| [00 — What Is an ORM & Why](00-What-Is-an-ORM-Why.md) | The concept, why an ORM over raw `pg` queries, what a migration is and why you need one, and a head-to-head **Drizzle vs Prisma** comparison with "pick this one when…" |

Then pick a lane. **Read one lane fully before comparing** — jumping between them mid-concept is confusing because the mental models differ.

### Drizzle lane

| File | What it covers |
|---|---|
| [drizzle/01 — Setup in Express + Postgres](drizzle/01-Setup-Express-Postgres.md) | Install, `drizzle.config.ts`, the schema file, connecting with a `pg` Pool, folder layout |
| [drizzle/02 — Schema & Migrations](drizzle/02-Schema-and-Migrations.md) | Defining tables/columns/constraints/relations, `drizzle-kit generate` / `migrate` / `push`, evolving the schema |
| [drizzle/03 — CRUD Queries](drizzle/03-CRUD-Queries.md) | `insert` (one/many/`returning`/upsert), `select` (`where`, operators, `orderBy`, `limit`/`offset`), `update`, `delete` |
| [drizzle/04 — Relations, Joins & Advanced](drizzle/04-Relations-Joins-Advanced.md) | Relational query API (`with`), manual joins, aggregates & `groupBy`, transactions, prepared statements |
| [drizzle/05 — Express Integration](drizzle/05-Express-Integration.md) | A real `users` + `posts` router, error handling, pooling, graceful shutdown, a seed script |

### Prisma lane

| File | What it covers |
|---|---|
| [prisma/01 — Setup in Express + Postgres](prisma/01-Setup-Express-Postgres.md) | Install, `prisma init`, `schema.prisma`, `prisma generate`, the `PrismaClient` singleton |
| [prisma/02 — Schema & Migrations](prisma/02-Schema-and-Migrations.md) | `model` syntax, relations, `prisma migrate dev` / `deploy`, `prisma db push`, what's in a migration folder |
| [prisma/03 — CRUD Queries](prisma/03-CRUD-Queries.md) | `create`/`createMany`, `findMany`/`findUnique` (`where`, `select`, `orderBy`, pagination), `update`/`upsert`, `delete` |
| [prisma/04 — Relations, Joins & Advanced](prisma/04-Relations-Joins-Advanced.md) | `include` vs `select`, nested writes, `aggregate`/`groupBy`, `$transaction`, raw queries |
| [prisma/05 — Express Integration](prisma/05-Express-Integration.md) | A real router, error handling (`P2002` etc.), graceful shutdown, a seed script |

---

## The running example (both lanes use the same one)

A tiny blog API:

- **`users`** — `id`, `email` (unique), `name`, `created_at`
- **`posts`** — `id`, `title`, `content`, `published` (bool), `author_id` → `users.id`, `created_at`

One-to-many: a user has many posts. Every CRUD and relation example is built on these two tables, so you can compare "the same operation, Drizzle vs Prisma" side by side after reading both lanes.

---

## The 30-second version

- **ORM** = write DB operations as typed code (`db.insert(users).values({...})`) instead of SQL strings. You get autocomplete, compile-time errors, and no manual SQL-injection risk.
- **Migration** = a versioned file describing a schema change (`CREATE TABLE`, `ADD COLUMN`), checked into git, applied in order to every environment so all databases match your code.
- **Drizzle** = a thin, SQL-shaped query builder. You basically write SQL with TypeScript functions. Tiny, fast, no hidden magic, no separate engine.
- **Prisma** = a higher-level, model-centric toolkit. Its own schema language, a generated client, a polished migration workflow, great DX. More abstraction, a generation step, historically a heavier runtime.
- **Pick Drizzle** if you like being close to SQL, want minimal overhead, or run on edge/serverless. **Pick Prisma** if you want the smoothest DX, the strongest migration tooling out of the box, and don't mind the abstraction.
