# Drizzle 03 — CRUD Queries
## `insert`, `select`, `update`, `delete` — Every Option You'll Use

> Previous: [02 — Schema & Migrations](02-Schema-and-Migrations.md) · Next: [04 — Relations, Joins & Advanced](04-Relations-Joins-Advanced.md)

---

## 📌 Executive Summary

- Drizzle's core API mirrors SQL: `db.select().from(t).where(...)`, `db.insert(t).values(...)`, `db.update(t).set(...).where(...)`, `db.delete(t).where(...)`.
- **Every query is a Promise** — `await` it. It resolves to an **array of typed rows** (even for one row — destructure `const [row] = ...`).
- **`.returning()`** on `insert`/`update`/`delete` gives you the affected rows back (like SQL `RETURNING` from [04](../../04-DML-Insert-Update-Delete.md)). Without it, you get metadata only.
- **Filters** are functions from `drizzle-orm`: `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `like`, `ilike`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `between`, `and`, `or`, `not`.
- **`WHERE` on `update`/`delete` is not enforced** — omit it and you hit every row, exactly like raw SQL. Always pass one.
- Upsert = `.insert(t).values(...).onConflictDoUpdate({ target, set })`.

---

## 🧠 Core Analogy: A Sentence Builder

Each Drizzle query reads like an English sentence assembled from Lego blocks: **verb** (`select` / `insert` / `update` / `delete`) → **table** (`.from(users)` / `(users)`) → **conditions** (`.where(...)`) → **extras** (`.orderBy`, `.limit`, `.returning`). You snap the blocks together in the order SQL expects, and TypeScript checks that every block fits the ones around it — you can't `.set()` a column that doesn't exist, or compare a `varchar` column to a number.

---

Setup for every example:

```ts
import { db } from "../db/index.js";
import { users, posts } from "../db/schema.js";
import {
  eq, ne, gt, gte, lt, lte,
  like, ilike, inArray, notInArray,
  isNull, isNotNull, between,
  and, or, not,
  desc, asc, count, sql,
} from "drizzle-orm";
```

---

## 1️⃣ INSERT

### One row

```ts
await db.insert(users).values({ email: "ada@example.com", name: "Ada" });
```
Returns driver metadata (row count), **not** the row. To get the row:

```ts
const [user] = await db
  .insert(users)
  .values({ email: "ada@example.com", name: "Ada" })
  .returning();               // → full row incl. generated id, createdAt

const [idOnly] = await db
  .insert(users)
  .values({ email: "grace@example.com" })
  .returning({ id: users.id });   // → { id: 2 }
```

- Columns with a `.default()` / `.defaultNow()` / `serial` can be omitted — TypeScript knows they're optional in `$inferInsert`.
- `name` is nullable, so it's optional too. `email` is `.notNull()` with no default → **required**, enforced at compile time.

### Many rows (one statement, one round trip)

```ts
const created = await db
  .insert(users)
  .values([
    { email: "a@x.com", name: "A" },
    { email: "b@x.com", name: "B" },
    { email: "c@x.com" },
  ])
  .returning();
```
> One `INSERT ... VALUES (...), (...), (...)` — the batching win from [16 §9](../../16-Query-Optimization-Playbook.md).

### Upsert — `onConflictDoUpdate` / `onConflictDoNothing`

```ts
// Insert, or update the existing row if `email` collides (SQL: ON CONFLICT ... DO UPDATE — file 04 §6)
const [u] = await db
  .insert(users)
  .values({ email: "ada@example.com", name: "Ada Lovelace" })
  .onConflictDoUpdate({
    target: users.email,                       // the UNIQUE column
    set: { name: "Ada Lovelace" },             // what to change on conflict
  })
  .returning();

// Insert, or silently skip if it already exists
await db
  .insert(users)
  .values({ email: "ada@example.com" })
  .onConflictDoNothing({ target: users.email });
```

`sql\`excluded.name\`` is available inside `set` if you need "the value that was about to be inserted" (Postgres's `EXCLUDED`):

```ts
.onConflictDoUpdate({ target: users.email, set: { name: sql`excluded.name` } })
```

### Insert from a select

```ts
await db.insert(archivedPosts).select(
  db.select().from(posts).where(eq(posts.published, false))
);
```

---

## 2️⃣ SELECT

### All columns / specific columns

```ts
const all = await db.select().from(users);                        // SELECT * ...
const some = await db
  .select({ id: users.id, email: users.email })                   // SELECT id, email ...
  .from(users);
```

### Filtering — `.where(...)`

```ts
await db.select().from(users).where(eq(users.id, 1));
await db.select().from(users).where(ne(users.name, "Ada"));
await db.select().from(posts).where(gt(posts.id, 100));
await db.select().from(users).where(like(users.email, "%@example.com"));
await db.select().from(users).where(ilike(users.name, "ada%"));   // case-insensitive
await db.select().from(users).where(inArray(users.id, [1, 2, 3]));
await db.select().from(users).where(isNull(users.name));
await db.select().from(posts).where(between(posts.id, 10, 20));
```

### Combining — `and()` / `or()` / `not()`

```ts
await db
  .select()
  .from(posts)
  .where(
    and(
      eq(posts.published, true),
      gt(posts.id, 50),
      or(eq(posts.authorId, 1), eq(posts.authorId, 2)),
    ),
  );
```
> `and(...)` / `or(...)` make the precedence explicit — no operator-precedence trap like raw SQL ([05 §2](../../05-DQL-Select-Where-Filtering.md)).

| SQL operator | Drizzle function |
|---|---|
| `=` `<>` `>` `<` `>=` `<=` | `eq` `ne` `gt` `lt` `gte` `lte` |
| `LIKE` / `ILIKE` | `like` / `ilike` |
| `IN` / `NOT IN` | `inArray` / `notInArray` |
| `IS NULL` / `IS NOT NULL` | `isNull` / `isNotNull` |
| `BETWEEN` | `between` |
| `AND` / `OR` / `NOT` | `and` / `or` / `not` |
| anything else | `` sql`...` `` escape hatch |

### Sorting, limiting, paginating

```ts
await db
  .select()
  .from(posts)
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt), asc(posts.title))   // ORDER BY created_at DESC, title ASC
  .limit(10)
  .offset(20);                                        // page 3 at 10/page
```

### One row

```ts
const [user] = await db.select().from(users).where(eq(users.email, "ada@example.com"));
// user is `User | undefined` — check for undefined
if (!user) throw new Error("not found");
```

### Distinct

```ts
await db.selectDistinct({ authorId: posts.authorId }).from(posts);
```

### A raw SQL fragment when you need it

```ts
await db
  .select({
    id: users.id,
    lowerEmail: sql<string>`lower(${users.email})`,   // typed via sql<T>
  })
  .from(users)
  .where(sql`${users.createdAt} > now() - interval '7 days'`);
```

---

## 3️⃣ UPDATE

```ts
// Always pass .where() — without it, EVERY row is updated (file 04 §2)
const updated = await db
  .update(users)
  .set({ name: "Ada L." })
  .where(eq(users.id, 1))
  .returning();

// Compute from the current value
await db
  .update(posts)
  .set({ title: sql`${posts.title} || ' (archived)'` })
  .where(eq(posts.published, false));

// Several columns
await db
  .update(posts)
  .set({ published: true, title: "Launch!" })
  .where(eq(posts.id, 42))
  .returning({ id: posts.id, published: posts.published });
```

- `.set({...})` is type-checked against the table — unknown keys and wrong types fail to compile.
- The return value without `.returning()` is metadata (`rowCount`); with it, the affected rows.

---

## 4️⃣ DELETE

```ts
// Always .where()
const deleted = await db
  .delete(posts)
  .where(eq(posts.id, 42))
  .returning();

// Delete many
await db.delete(posts).where(eq(posts.published, false));

// Delete all rows (rare — usually you want this only for tests/seeds)
await db.delete(posts);
```

> `db.delete(posts)` with no `.where()` empties the table. For a fast full wipe, a raw `TRUNCATE` is better: `await db.execute(sql\`TRUNCATE TABLE posts RESTART IDENTITY CASCADE\`)` ([03 §9](../../03-DDL-Constraints-Alter-Drop.md)).

---

## 5️⃣ Counting & existence

```ts
// COUNT(*)
const [{ value }] = await db.select({ value: count() }).from(users);

// COUNT with a filter
const [{ value: publishedCount }] = await db
  .select({ value: count() })
  .from(posts)
  .where(eq(posts.published, true));

// Exists check (cheap — LIMIT 1)
const [maybe] = await db.select({ id: users.id }).from(users).where(eq(users.email, "x@y.com")).limit(1);
const exists = Boolean(maybe);
```

---

## 6️⃣ Putting it in an Express handler

```ts
import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const usersRouter = Router();

usersRouter.post("/", async (req, res) => {
  const { email, name } = req.body;
  const [user] = await db.insert(users).values({ email, name }).returning();
  res.status(201).json(user);
});

usersRouter.get("/:id", async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, Number(req.params.id)));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

usersRouter.patch("/:id", async (req, res) => {
  const [user] = await db
    .update(users)
    .set(req.body)                       // validate this in real code! (zod)
    .where(eq(users.id, Number(req.params.id)))
    .returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

usersRouter.delete("/:id", async (req, res) => {
  const [user] = await db.delete(users).where(eq(users.id, Number(req.params.id))).returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.status(204).end();
});
```

Error handling (unique violations etc.) and validation are in [05 — Express Integration](05-Express-Integration.md).

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What does a Drizzle query resolve to? | A Promise of an **array** of typed rows — destructure `const [row]` for single-row results |
| How do you get the inserted row back? | `.returning()` (optionally `.returning({ id: t.id })` for specific columns) |
| How are `WHERE` conditions written? | Functions from `drizzle-orm`: `eq`, `gt`, `like`, `inArray`, `and`, `or`, … |
| What happens if you omit `.where()` on an update/delete? | Every row is affected — exactly like raw SQL; always pass one |
| How do you do an upsert? | `.insert(t).values(...).onConflictDoUpdate({ target, set })` |
| How do you run SQL Drizzle's builder can't express? | The `` sql`...` `` template tag, or `db.execute(sql\`...\`)` |
| How do you `COUNT(*)`? | `db.select({ value: count() }).from(t)` — `count` imported from `drizzle-orm` |

---

**Next:** [04 — Relations, Joins & Advanced](04-Relations-Joins-Advanced.md) — loading related rows, manual joins, aggregates, transactions.
