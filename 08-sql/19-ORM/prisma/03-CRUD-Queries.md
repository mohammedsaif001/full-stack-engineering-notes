# Prisma 03 — CRUD Queries
## `create`, `findMany`, `update`, `upsert`, `delete` — Every Option

> Previous: [02 — Schema & Migrations](02-Schema-and-Migrations.md) · Next: [04 — Relations, Joins & Advanced](04-Relations-Joins-Advanced.md)

---

## 📌 Executive Summary

- The API is **one method style per model**: `prisma.user.create()`, `.findMany()`, `.findUnique()`, `.update()`, `.upsert()`, `.delete()`, plus `createMany`, `updateMany`, `deleteMany`, `count`, `aggregate`, `groupBy`.
- Everything is an object argument: `{ where, data, select, include, orderBy, skip, take, distinct }`. No SQL-shaped chaining.
- **`create` / `update` return the full row by default** (no `RETURNING` needed — it's automatic). Use `select` to trim it.
- **`findUnique`** requires a unique field in `where` (id, `@unique`, or a `@@unique`); **`findFirst`** takes any filter and returns the first match or `null`.
- **`where` operators** are nested objects: `{ age: { gt: 18 } }`, `{ email: { contains: "@x.com" } }`, `{ OR: [...] }`, `{ id: { in: [1,2,3] } }`.
- **`updateMany` / `deleteMany` require a `where`** (pass `{}` to hit all rows — explicit). Single `update`/`delete` throw if `where` matches nothing.
- **Upsert** is `prisma.user.upsert({ where, create, update })`.

---

## 🧠 Core Analogy: Ordering From a Detailed Menu

Every Prisma call is a structured order form: **what** (`prisma.user`), **action** (`.create` / `.findMany` / …), and a **spec object** — "these fields (`data`), matching this (`where`), show me only these columns (`select`) and their related items (`include`), sorted like this (`orderBy`), this page (`skip`/`take`)." You never assemble a sentence; you fill in a form, and Prisma cooks the SQL.

---

Setup for every example:

```ts
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";   // for error types & helpers
```

---

## 1️⃣ CREATE

### One row (returns the full created row)

```ts
const user = await prisma.user.create({
  data: { email: "ada@example.com", name: "Ada" },
});
// → { id: 1, email: "ada@example.com", name: "Ada", createdAt: ... }
```

Trim the returned columns:

```ts
const idOnly = await prisma.user.create({
  data: { email: "grace@example.com" },
  select: { id: true },
});
// → { id: 2 }
```

- Fields with `@default(...)` / `autoincrement()` / `@updatedAt` are optional in `data` — the generated type knows.
- `name` is `String?` → optional. `email` is required with no default → **compile error if omitted**.

### Many rows (one statement)

```ts
const result = await prisma.user.createMany({
  data: [
    { email: "a@x.com", name: "A" },
    { email: "b@x.com", name: "B" },
    { email: "c@x.com" },
  ],
  skipDuplicates: true,        // skip rows that would violate a unique constraint
});
// → { count: 3 }   ← createMany returns a COUNT, not the rows
```
> `createMany` does **not** return the created rows (a Postgres limitation Prisma respects). If you need them back, use `createManyAndReturn` (recent Prisma) or loop `create` inside a transaction.

```ts
const created = await prisma.user.createManyAndReturn({
  data: [{ email: "d@x.com" }, { email: "e@x.com" }],
});
// → [ {id, email, ...}, {id, email, ...} ]
```

### Nested create (a user *and* their posts in one call)

```ts
const userWithPosts = await prisma.user.create({
  data: {
    email: "team@x.com",
    name: "Team",
    posts: {
      create: [
        { title: "Hello", content: "..." },
        { title: "World", published: true },
      ],
    },
  },
  include: { posts: true },
});
```
> This is Prisma's ergonomic edge — one call, one transaction, the FK wired automatically. More in [04](04-Relations-Joins-Advanced.md).

---

## 2️⃣ READ

### `findUnique` — by a unique field

```ts
const byId = await prisma.user.findUnique({ where: { id: 1 } });          // → User | null
const byEmail = await prisma.user.findUnique({ where: { email: "ada@example.com" } });
```
`where` must be a unique field (`@id`, `@unique`, or a named `@@unique`). Returns `null` if not found (doesn't throw).

`findUniqueOrThrow` throws a `P2025` instead of returning `null` — handy in handlers where "not found" is a `404`.

### `findFirst` — first match of any filter

```ts
const firstDraft = await prisma.post.findFirst({
  where: { published: false },
  orderBy: { createdAt: "asc" },
});
```

### `findMany` — a list

```ts
const users = await prisma.user.findMany({
  where: { name: { not: null } },
  select: { id: true, email: true },            // pick columns
  orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  skip: 20,                                     // OFFSET
  take: 10,                                     // LIMIT
});
```

### `where` operators

```ts
await prisma.user.findMany({ where: { id: 1 } });                       // =
await prisma.user.findMany({ where: { name: { not: "Ada" } } });        // <>
await prisma.post.findMany({ where: { id: { gt: 100 } } });             // > (also gte, lt, lte)
await prisma.user.findMany({ where: { email: { contains: "@x.com" } } });// LIKE '%@x.com%'
await prisma.user.findMany({ where: { email: { endsWith: "@x.com" } } });// LIKE '%@x.com'
await prisma.user.findMany({ where: { name: { startsWith: "Ad" } } });
await prisma.user.findMany({ where: { email: { contains: "ADA", mode: "insensitive" } } }); // ILIKE
await prisma.user.findMany({ where: { id: { in: [1, 2, 3] } } });       // IN
await prisma.user.findMany({ where: { id: { notIn: [1, 2] } } });       // NOT IN
await prisma.post.findMany({ where: { id: { gte: 10, lte: 20 } } });    // BETWEEN-ish
await prisma.user.findMany({ where: { name: null } });                  // IS NULL
await prisma.user.findMany({ where: { NOT: { name: null } } });         // IS NOT NULL
```

Combining — `AND` (implicit for multiple keys), `OR`, `NOT`:

```ts
await prisma.post.findMany({
  where: {
    published: true,                            // AND
    id: { gt: 50 },                             // AND
    OR: [{ authorId: 1 }, { authorId: 2 }],
    NOT: { title: { contains: "draft" } },
  },
});
```

| SQL ([05](../../05-DQL-Select-Where-Filtering.md)) | Prisma |
|---|---|
| `=` `<>` `>` `>=` `<` `<=` | `id: 1` · `{ not: x }` · `{ gt/gte/lt/lte: x }` |
| `LIKE` | `{ contains / startsWith / endsWith: s }` |
| `ILIKE` | add `mode: "insensitive"` |
| `IN` / `NOT IN` | `{ in: [...] }` / `{ notIn: [...] }` |
| `IS NULL` / `IS NOT NULL` | `field: null` / `NOT: { field: null }` |
| `AND` / `OR` / `NOT` | multiple keys / `OR: [...]` / `NOT: {...}` |
| anything else | `prisma.$queryRaw` ([04](04-Relations-Joins-Advanced.md)) |

### `distinct`

```ts
await prisma.post.findMany({ distinct: ["authorId"], select: { authorId: true } });
```

---

## 3️⃣ UPDATE

### `update` — one row by unique field (throws `P2025` if not found)

```ts
const user = await prisma.user.update({
  where: { id: 1 },
  data: { name: "Ada L." },
});
// → the full updated row
```

### Atomic number operations

```ts
await prisma.post.update({
  where: { id: 42 },
  data: { viewCount: { increment: 1 } },     // also: decrement, multiply, divide, set
});
```

### `updateMany` — many rows (requires `where`, returns a count)

```ts
const res = await prisma.post.updateMany({
  where: { published: false },
  data: { published: true },
});
// → { count: 7 }
```

### `upsert` — insert or update

```ts
const u = await prisma.user.upsert({
  where: { email: "ada@example.com" },
  create: { email: "ada@example.com", name: "Ada Lovelace" },   // if not found
  update: { name: "Ada Lovelace" },                             // if found
});
```
> Maps to `INSERT ... ON CONFLICT ... DO UPDATE` ([main series 04 §6](../../04-DML-Insert-Update-Delete.md)). `where` must be unique.

---

## 4️⃣ DELETE

```ts
// One row (throws P2025 if not found)
const deleted = await prisma.post.delete({ where: { id: 42 } });   // → the deleted row

// Many (requires where, returns count)
const res = await prisma.post.deleteMany({ where: { published: false } }); // → { count: N }

// All rows — explicit empty where
await prisma.post.deleteMany({});
```

> For a fast full wipe, raw SQL is better: `await prisma.$executeRawUnsafe('TRUNCATE TABLE "posts" RESTART IDENTITY CASCADE')` ([03 §9](../../03-DDL-Constraints-Alter-Drop.md)).

---

## 5️⃣ Count, aggregate

```ts
const total = await prisma.user.count();
const publishedCount = await prisma.post.count({ where: { published: true } });

const agg = await prisma.post.aggregate({
  _count: true,
  _avg: { viewCount: true },
  _max: { createdAt: true },
  where: { published: true },
});
// → { _count: 12, _avg: { viewCount: 3.4 }, _max: { createdAt: ... } }
```

`groupBy` (SQL `GROUP BY` + `HAVING`) is in [04 §3](04-Relations-Joins-Advanced.md).

---

## 6️⃣ In an Express handler

```ts
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const usersRouter = Router();

usersRouter.post("/", async (req, res, next) => {
  try {
    const user = await prisma.user.create({ data: req.body });   // validate in real code!
    res.status(201).json(user);
  } catch (err) {
    next(err);   // central handler maps P2002 → 409 (file 05)
  }
});

usersRouter.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

usersRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    next(err);
  }
});

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    next(err);
  }
});
```

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| Does `create` need a `RETURNING`? | No — Prisma returns the full created row by default; use `select` to trim it |
| `findUnique` vs `findFirst`? | `findUnique` needs a unique field in `where`; `findFirst` takes any filter, returns the first match or `null` |
| Does `createMany` return the rows? | No — it returns `{ count }`; use `createManyAndReturn` for the rows |
| How do you write `WHERE age > 18`? | `where: { age: { gt: 18 } }` |
| Case-insensitive `LIKE`? | `{ contains: "x", mode: "insensitive" }` |
| What happens if `update`'s `where` matches nothing? | It throws `P2025`; `updateMany` just returns `{ count: 0 }` |
| How do you do an upsert? | `prisma.model.upsert({ where, create, update })` |
| How do you increment a counter atomically? | `data: { field: { increment: 1 } }` |

---

**Next:** [04 — Relations, Joins & Advanced](04-Relations-Joins-Advanced.md) — `include`/`select`, nested writes, `groupBy`, `$transaction`, raw SQL.
