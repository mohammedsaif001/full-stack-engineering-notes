# Prisma 04 — Relations, Joins & Advanced
## `include` vs `select`, Nested Writes, `groupBy`, `$transaction`, Raw SQL

> Previous: [03 — CRUD Queries](03-CRUD-Queries.md) · Next: [05 — Express Integration](05-Express-Integration.md)

---

## 📌 Executive Summary

- **`include`** adds related records as **nested objects** while keeping all scalar fields: `{ include: { posts: true } }` → `user.posts`.
- **`select`** replaces the field list — you choose *exactly* which scalars and relations come back. You can't use `include` and `select` at the same top level (but you can `select` inside an `include`).
- **Nested writes** — `create` / `connect` / `connectOrCreate` / `disconnect` / `update` / `deleteMany` inside a parent's `data` — create/link related rows in **one call, one transaction**. This is Prisma's standout feature.
- **`groupBy`** = SQL `GROUP BY` + aggregates + `HAVING`.
- **`$transaction`** has two forms: an **array** of independent operations (`prisma.$transaction([op1, op2])`), and an **interactive** callback (`prisma.$transaction(async (tx) => {...})`) for read-then-write logic.
- **Raw SQL:** `$queryRaw` (returns rows), `$executeRaw` (returns affected count). Tagged-template versions are parameterized and safe; the `...Unsafe` variants take a plain string — only for trusted input.

---

## 🧠 Core Analogy: Ordering a Combo vs À La Carte

- **`include`** = "the burger, **and add** fries and a drink." You get everything the burger normally comes with, plus the extras.
- **`select`** = building a custom plate: "just the patty and the pickle, none of the bun." You get *only* what you list.
- **Nested write** = a catering order: "one platter, and on it put these 6 specific sandwiches, and reuse the serving tray we already have (`connect`)" — assembled and delivered as one order.

---

## 1️⃣ `include` — related records as nested objects

```ts
// User + all their posts
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true },
});
// → { id, email, name, createdAt, posts: [ {id, title, ...}, ... ] }

// Filter / sort / paginate the included relation
const usersWithRecentPublished = await prisma.user.findMany({
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true },   // select is allowed *inside* include
    },
  },
});

// Count a relation without fetching it
const withCounts = await prisma.user.findMany({
  include: { _count: { select: { posts: true } } },
});
// → each user has _count.posts
```

The inverse direction:

```ts
const post = await prisma.post.findUnique({
  where: { id: 42 },
  include: { author: true },
});
// → { id, title, ..., author: { id, email, name, ... } }
```

> Prisma runs this as an efficient set of queries (or a single query with JSON aggregation, depending on version/`relationJoins` preview) — **not** N+1.

---

## 2️⃣ `select` — exactly these fields

```ts
const trimmed = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: {
      select: { id: true, title: true },   // nested select
    },
    _count: { select: { posts: true } },
  },
});
// → [ { id, email, posts: [{id, title}], _count: { posts: 3 } }, ... ]
```

- `select` and `include` are **mutually exclusive at the same level** — pick one. Need "all scalars plus a trimmed relation"? Use `include` with a nested `select`.
- `select` is the way to avoid over-fetching large columns (`content`, `bio`) on list endpoints.

---

## 3️⃣ Nested writes — the ergonomic edge

Inside a parent `data`, relation fields accept these operations:

| Operation | Does |
|---|---|
| `create` | make new related row(s) and link them |
| `createMany` | bulk-create related rows (to-many only) |
| `connect` | link to an **existing** row by unique field |
| `connectOrCreate` | link if it exists, else create it |
| `disconnect` | unlink (sets FK null — needs a nullable FK) |
| `set` | replace the whole set of linked rows (to-many) |
| `update` / `updateMany` | modify linked row(s) |
| `delete` / `deleteMany` | delete linked row(s) |

```ts
// Create a post, linking to an existing author by email (no need to know the id)
const post = await prisma.post.create({
  data: {
    title: "Hello",
    content: "...",
    author: { connect: { email: "ada@example.com" } },
  },
});

// Create an author AND two posts in one transaction
const user = await prisma.user.create({
  data: {
    email: "team@x.com",
    name: "Team",
    posts: {
      create: [
        { title: "First", published: true },
        { title: "Second" },
      ],
    },
  },
  include: { posts: true },
});

// Update a user and, in the same call, publish all their drafts
await prisma.user.update({
  where: { id: 1 },
  data: {
    name: "Ada L.",
    posts: {
      updateMany: { where: { published: false }, data: { published: true } },
    },
  },
});

// connectOrCreate — tag-style
await prisma.post.update({
  where: { id: 42 },
  data: {
    categories: {
      connectOrCreate: {
        where: { name: "databases" },
        create: { name: "databases" },
      },
    },
  },
});
```

> Doing the equivalent with Drizzle means multiple explicit statements inside `db.transaction`. This is the single biggest DX difference between the two.

---

## 4️⃣ Aggregates & `groupBy`

```ts
// Post count per author, only authors with > 2, busiest first  (GROUP BY ... HAVING)
const perAuthor = await prisma.post.groupBy({
  by: ["authorId"],
  _count: { _all: true },
  _max: { createdAt: true },
  where: { published: true },
  having: { authorId: { _count: { gt: 2 } } },
  orderBy: { _count: { authorId: "desc" } },
});
// → [ { authorId: 1, _count: { _all: 5 }, _max: { createdAt: ... } }, ... ]
```

- `by` = the `GROUP BY` columns.
- `_count` / `_sum` / `_avg` / `_min` / `_max` = the aggregates.
- `having` filters groups (like SQL `HAVING`).
- For anything more complex (window functions, multi-table aggregates with joins), drop to raw SQL (§6).

---

## 5️⃣ Transactions

### Form A — array of independent operations (all commit or all roll back)

```ts
const [user, postCount] = await prisma.$transaction([
  prisma.user.create({ data: { email: "x@y.com" } }),
  prisma.post.count(),
]);
```
Use when the operations don't depend on each other's results.

### Form B — interactive transaction (read, then decide, then write)

```ts
const result = await prisma.$transaction(async (tx) => {
  const author = await tx.user.findUnique({ where: { id: authorId } });
  if (!author) throw new Error("author not found");        // → ROLLBACK

  const post = await tx.post.create({
    data: { title, authorId },
  });

  await tx.user.update({
    where: { id: authorId },
    data: { postCount: { increment: 1 } },
  });

  return post;                                             // → COMMIT
});
```
- Everything on `tx` is one transaction ([main series 15](../../15-Transactions-ACID-Locking.md)). Throw → `ROLLBACK`. Return → `COMMIT`.
- Options: `prisma.$transaction(fn, { timeout: 10_000, isolationLevel: "Serializable" })` — isolation levels map to `READ COMMITTED` / `REPEATABLE READ` / `SERIALIZABLE` from [15 §5](../../15-Transactions-ACID-Locking.md).

### Row locking (`SELECT ... FOR UPDATE`)

Prisma's query API has **no direct `FOR UPDATE`**. Use raw SQL inside an interactive transaction:

```ts
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM seats WHERE id = ${seatId} AND is_booked = false FOR UPDATE
  `;
  if (rows.length === 0) throw new Error("Seat already booked");

  await tx.seat.update({ where: { id: seatId }, data: { isBooked: true, bookedBy: userId } });
});
```

---

## 6️⃣ Raw SQL escape hatches

```ts
import { Prisma } from "@prisma/client";

// $queryRaw — returns rows. Tagged template ⇒ values are parameterized (safe).
const rows = await prisma.$queryRaw<{ author_id: number; n: bigint }[]>`
  SELECT author_id, count(*) AS n
  FROM posts
  WHERE created_at > now() - interval '30 days'
  GROUP BY author_id
  ORDER BY n DESC
`;

// Interpolated user value — still safe, sent as a bound parameter
const email = req.body.email;
await prisma.$executeRaw`DELETE FROM users WHERE email = ${email}`;

// Build a dynamic fragment safely
const cond = Prisma.sql`published = ${true}`;
await prisma.$queryRaw`SELECT * FROM posts WHERE ${cond}`;

// ...Unsafe variants take a plain string — ONLY for fully trusted, non-user input
await prisma.$executeRawUnsafe('TRUNCATE TABLE "posts" RESTART IDENTITY CASCADE');
```

| Method | Returns | Use for |
|---|---|---|
| `$queryRaw` / `$queryRawUnsafe` | rows | `SELECT`, reporting, window functions |
| `$executeRaw` / `$executeRawUnsafe` | affected row count | `UPDATE` / `DELETE` / DDL |

> `count(*)` comes back as `bigint` — `Number(row.n)` to use it as a JS number.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| `include` vs `select`? | `include` adds relations while keeping all scalars; `select` returns only the fields you list — they can't be combined at the same level |
| What's a nested write? | Creating/linking related rows inside a parent's `data` (`create`, `connect`, `connectOrCreate`, …) in one call and one transaction |
| Does `include` cause N+1 queries? | No — Prisma batches it into an efficient query set / JSON aggregation |
| Two forms of `$transaction`? | An array of independent operations, and an interactive `async (tx) => {}` callback for read-then-write logic |
| How do you do `SELECT ... FOR UPDATE` in Prisma? | Raw SQL (`$queryRaw`) inside an interactive `$transaction` — the query API has no direct `FOR UPDATE` |
| `$queryRaw` vs `$executeRaw`? | `$queryRaw` returns rows (`SELECT`); `$executeRaw` returns an affected-row count (`UPDATE`/`DELETE`/DDL) |
| Is `$queryRaw` with `${value}` safe? | Yes — the tagged-template form parameterizes values; only the `...Unsafe` string variants aren't |

---

**Next:** [05 — Express Integration](05-Express-Integration.md) — a complete router, error mapping (`P2002` etc.), shutdown, seeding.
