# Drizzle 04 — Relations, Joins & Advanced
## Relational Queries, Manual Joins, Aggregates, Transactions

> Previous: [03 — CRUD Queries](03-CRUD-Queries.md) · Next: [05 — Express Integration](05-Express-Integration.md)

---

## 📌 Executive Summary

- Drizzle has **two ways** to fetch related data:
  1. **Relational query API** — `db.query.users.findMany({ with: { posts: true } })`. Returns **nested objects** (`user.posts`). Needs `relations()` declared ([02 §2](02-Schema-and-Migrations.md)).
  2. **Manual joins** — `db.select().from(users).leftJoin(posts, eq(...))`. Returns **flat rows** with both tables' columns; you shape/group the result yourself.
- Use the **relational API** for "give me this entity and its children as JSON" (most API endpoints). Use **manual joins** for reporting, aggregates across tables, and full control over the exact SQL.
- **Aggregates + `GROUP BY`**: `db.select({ authorId: posts.authorId, n: count() }).from(posts).groupBy(posts.authorId)`.
- **Transactions**: `await db.transaction(async (tx) => { ... })` — everything on `tx` commits together, or the whole callback rolls back on a thrown error.
- **Prepared statements** (`.prepare("name")`) pre-compile a hot query for repeated execution.

---

## 🧠 Core Analogy: Two Ways to Get a Customer's Order History

- **Relational API** = asking a clerk "pull up customer #7's full file" — you get a folder with the customer's details and their orders tucked inside as sub-pages. Ready to hand over.
- **Manual join** = requesting the raw ledger — every line where customer #7 appears, one row per order, the customer's name repeated on each line. Total control, but *you* collate it into a folder.

---

## 1️⃣ Relational query API — nested results

Requires the `relations()` declarations from [02 §2](02-Schema-and-Migrations.md) and `drizzle(pool, { schema })` from [01 §6](01-Setup-Express-Postgres.md).

```ts
import { db } from "../db/index.js";
import { eq, desc } from "drizzle-orm";

// A user with all their posts nested
const user = await db.query.users.findFirst({
  where: (u, { eq }) => eq(u.id, 1),
  with: { posts: true },
});
// → { id: 1, email: "...", name: "...", posts: [ { id, title, ... }, ... ] }

// Many users, each with only published posts, newest first, just 2 columns
const usersWithPosts = await db.query.users.findMany({
  columns: { id: true, name: true },              // pick user columns
  with: {
    posts: {
      columns: { id: true, title: true },
      where: (p, { eq }) => eq(p.published, true),
      orderBy: (p, { desc }) => desc(p.createdAt),
      limit: 5,
    },
  },
  limit: 20,
});

// The inverse: a post with its author nested
const post = await db.query.posts.findFirst({
  where: (p, { eq }) => eq(p.id, 42),
  with: { author: true },
});
// → { id: 42, title: "...", author: { id, email, name, ... } }
```

- `findFirst` → one object or `undefined`. `findMany` → an array.
- `with` follows the relation **names** you gave in `relations()` (`posts`, `author`).
- `columns`, `where`, `orderBy`, `limit`, `offset` all nest per relation.
- Under the hood Drizzle emits **one** SQL statement (using lateral joins / json aggregation) — not N+1 queries.

---

## 2️⃣ Manual joins — flat results, full control

```ts
import { db } from "../db/index.js";
import { users, posts } from "../db/schema.js";
import { eq, and, count, desc } from "drizzle-orm";

// INNER JOIN — only users who have posts
const rows = await db
  .select({
    userId: users.id,
    userName: users.name,
    postId: posts.id,
    postTitle: posts.title,
  })
  .from(users)
  .innerJoin(posts, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt));
// → flat: [{ userId, userName, postId, postTitle }, ...] — userName repeats per post
```

| SQL join ([07](../../07-Joins-Combining-Tables.md)) | Drizzle |
|---|---|
| `INNER JOIN` | `.innerJoin(t, cond)` |
| `LEFT JOIN` | `.leftJoin(t, cond)` |
| `RIGHT JOIN` | `.rightJoin(t, cond)` |
| `FULL OUTER JOIN` | `.fullJoin(t, cond)` |
| `CROSS JOIN` | `.crossJoin(t)` |

```ts
// LEFT JOIN — every user, posts null if none
const withMaybePosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(posts.authorId, users.id));
// → [{ users: {...}, posts: {...} | null }, ...]   (namespaced by table when selecting *)

// Self-join — a post and the author's *other* posts count, etc.
// alias a table:
import { alias } from "drizzle-orm/pg-core";
const manager = alias(users, "manager");
// then .innerJoin(manager, eq(users.managerId, manager.id))  (if users had managerId)
```

> When you `select()` without an explicit column map on a join, results come back **namespaced by table**: `row.users`, `row.posts`. With an explicit `{ ... }` map, they're flat.

---

## 3️⃣ Aggregates & GROUP BY

```ts
import { count, sum, avg, min, max, sql } from "drizzle-orm";

// Post count per author (GROUP BY)
const perAuthor = await db
  .select({
    authorId: posts.authorId,
    postCount: count(),
    lastPostAt: max(posts.createdAt),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .having(({ postCount }) => gt(postCount, 2))     // HAVING
  .orderBy(desc(count()));

// Join + aggregate: each user with their published-post count (LEFT JOIN keeps zero-post users)
const userPostCounts = await db
  .select({
    id: users.id,
    name: users.name,
    published: count(posts.id),                    // COUNT(posts.id) — nulls not counted
  })
  .from(users)
  .leftJoin(posts, and(eq(posts.authorId, users.id), eq(posts.published, true)))
  .groupBy(users.id, users.name);
```

Window functions ([10](../../10-Window-Functions.md)) — via `sql`:

```ts
await db
  .select({
    id: posts.id,
    title: posts.title,
    authorId: posts.authorId,
    rankInAuthor: sql<number>`row_number() over (partition by ${posts.authorId} order by ${posts.createdAt} desc)`,
  })
  .from(posts);
```

---

## 4️⃣ Transactions

Everything on `tx` is one transaction. Return normally → `COMMIT`. Throw → `ROLLBACK`. ([15](../../15-Transactions-ACID-Locking.md))

```ts
import { db } from "../db/index.js";
import { users, posts } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

const result = await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email: "team@x.com", name: "Team" })
    .returning();

  await tx.insert(posts).values([
    { title: "Hello", authorId: user.id },
    { title: "World", authorId: user.id },
  ]);

  // any throw here rolls back BOTH inserts
  if (!user.email.includes("@")) {
    throw new Error("bad email");          // → automatic ROLLBACK
  }

  return user;                             // → COMMIT, and `result` = user
});
```

### Row locking — `SELECT ... FOR UPDATE`

```ts
await db.transaction(async (tx) => {
  const [seat] = await tx
    .select()
    .from(seats)
    .where(and(eq(seats.id, seatId), eq(seats.isBooked, false)))
    .for("update");                        // locks the row until this tx ends

  if (!seat) throw new Error("Seat already booked");

  await tx.update(seats).set({ isBooked: true, bookedBy: userId }).where(eq(seats.id, seatId));
});
```
> Same race-condition fix as [15 §4](../../15-Transactions-ACID-Locking.md), now in Drizzle. `.for("update")`, `.for("share")`, `.for("update", { skipLocked: true })`, `.for("update", { noWait: true })`.

### Nested transactions → savepoints

```ts
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: "a@x.com" });
  await tx.transaction(async (tx2) => {       // SAVEPOINT
    await tx2.insert(users).values({ email: "b@x.com" });
    // throw here → only the inner insert rolls back
  });
});
```

---

## 5️⃣ Prepared statements (hot-path optimization)

Pre-compile a query you run constantly (e.g. "get user by id" on every authenticated request):

```ts
import { sql } from "drizzle-orm";

const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder("id")))
  .prepare("get_user_by_id");

// later, per request — reuses the compiled plan
const [user] = await getUserById.execute({ id: 42 });
```

---

## 6️⃣ Raw SQL escape hatches

```ts
import { sql } from "drizzle-orm";

// Returns rows (typed loosely — you assert the shape)
const { rows } = await db.execute(sql`
  SELECT author_id, count(*) AS n
  FROM posts
  WHERE created_at > now() - interval '30 days'
  GROUP BY author_id
  ORDER BY n DESC
`);

// Interpolated values are still parameterized — safe
const email = req.body.email;
await db.execute(sql`DELETE FROM users WHERE email = ${email}`);
```

Use this for reporting queries, DB-specific features, or anything the builder makes awkward — without abandoning Drizzle for the rest of the app.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| Drizzle's two ways to load related data? | The relational query API (`db.query.*` with `with:` → nested objects) and manual `.leftJoin()` etc. (→ flat rows) |
| When use each? | Relational API for "entity + children as JSON"; manual joins for reporting, cross-table aggregates, exact SQL control |
| Does the relational API cause N+1 queries? | No — it emits a single SQL statement using lateral joins / JSON aggregation |
| How do you start a transaction? | `await db.transaction(async (tx) => { ... })` — throw to roll back, return to commit |
| How do you lock a row for update? | `.for("update")` on a `select` inside a transaction |
| How do you run a raw reporting query? | `db.execute(sql\`...\`)` — interpolated values are still parameterized |
| What's a prepared statement for? | Pre-compiling a frequently-run query with `.prepare(name)` and `sql.placeholder()` |

---

**Next:** [05 — Express Integration](05-Express-Integration.md) — a complete router, error handling, pooling, shutdown, seed script.
