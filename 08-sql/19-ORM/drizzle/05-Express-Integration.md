# Drizzle 05 — Express Integration
## A Complete Router, Error Handling, Pooling, Shutdown, Seeding

> Previous: [04 — Relations, Joins & Advanced](04-Relations-Joins-Advanced.md) · Section index: [ORM](../README.md)

---

## 📌 Executive Summary

- **One `Pool`, one `db`, imported everywhere.** Never create a pool per request. Size it (`max`) to your workload; the pool queues requests when all connections are busy.
- **Validate input before it reaches the DB** — a small `zod` schema per route turns bad requests into clean `400`s instead of DB errors.
- **Map Postgres error codes to HTTP status** in one error-handling middleware: `23505` → `409 Conflict`, `23503` → `409`/`400`, `23502`/`23514` → `400`.
- **Graceful shutdown:** on `SIGTERM`/`SIGINT`, stop accepting requests, then `await pool.end()` so in-flight queries finish and connections close cleanly.
- **Seed script** = a plain `.ts` file run with `tsx` that inserts baseline/dev data, safe to re-run.

---

## 🧠 Core Analogy: A Restaurant's Service Flow

- **The pool** = a fixed set of waiters. Busy night, all waiters occupied → new tables wait briefly, they don't each hire a personal waiter.
- **Validation middleware** = the host checking reservations at the door — malformed parties turned away before they occupy a table.
- **Error middleware** = the manager who translates a kitchen problem ("we're out of that") into a polite line to the customer, instead of the raw shouting from the back.
- **Graceful shutdown** = at closing time, seat no new tables, but let the people mid-meal finish before locking up.

---

## 1️⃣ Folder recap

```
src/
├── index.ts              ← app wiring, middleware order, shutdown
├── db/
│   ├── index.ts          ← Pool + db (from 01 §6)
│   ├── schema.ts         ← tables + relations
│   └── seed.ts           ← dev/baseline data
├── middleware/
│   ├── validate.ts       ← zod request validation
│   └── errors.ts         ← central error handler
└── routes/
    ├── users.ts
    └── posts.ts
```

---

## 2️⃣ Validation middleware — `src/middleware/validate.ts`

```bash
npm i zod
```

```ts
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export const validateBody =
  (schema: ZodSchema): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "ValidationError",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;   // now typed & trimmed of unknown keys
    next();
  };
```

---

## 3️⃣ Central error handler — `src/middleware/errors.ts`

```ts
import type { ErrorRequestHandler } from "express";

// Postgres error codes → HTTP (see main series file 03 §7)
const PG_CODE_TO_STATUS: Record<string, { status: number; message: string }> = {
  "23505": { status: 409, message: "That value already exists." },        // unique_violation
  "23503": { status: 409, message: "Referenced record does not exist or is still in use." }, // foreign_key_violation
  "23502": { status: 400, message: "A required field is missing." },      // not_null_violation
  "23514": { status: 400, message: "A value failed a validation rule." }, // check_violation
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // `err.code` is present on node-postgres errors, which Drizzle rethrows
  const mapped = err?.code && PG_CODE_TO_STATUS[err.code];
  if (mapped) {
    return res.status(mapped.status).json({ error: mapped.message, code: err.code, detail: err.detail });
  }

  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
};
```

> Drizzle doesn't wrap driver errors — a unique violation surfaces as the raw `pg` error with `.code === "23505"`, exactly as in [15](../../15-Transactions-ACID-Locking.md). That's why branching on `err.code` works here.

A tiny helper so async route errors reach the handler (Express 5 forwards rejected promises automatically, but being explicit is fine):

```ts
// Express 5: throwing / rejecting inside an async handler is caught and passed to error middleware automatically.
// No express-async-errors package needed.
```

---

## 4️⃣ The `users` router — `src/routes/users.ts`

```ts
import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { validateBody } from "../middleware/validate.js";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
});
const updateUserSchema = createUserSchema.partial();

// CREATE
usersRouter.post("/", validateBody(createUserSchema), async (req, res) => {
  const [user] = await db.insert(users).values(req.body).returning();
  res.status(201).json(user);
});

// LIST (with simple pagination)
usersRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(100, Number(req.query.size) || 20);
  const rows = await db.select().from(users).limit(size).offset((page - 1) * size);
  res.json({ page, size, data: rows });
});

// READ ONE
usersRouter.get("/:id", async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, Number(req.params.id)));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// UPDATE
usersRouter.patch("/:id", validateBody(updateUserSchema), async (req, res) => {
  const [user] = await db
    .update(users)
    .set(req.body)
    .where(eq(users.id, Number(req.params.id)))
    .returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// DELETE
usersRouter.delete("/:id", async (req, res) => {
  const [user] = await db.delete(users).where(eq(users.id, Number(req.params.id))).returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.status(204).end();
});
```

---

## 5️⃣ The `posts` router — with a relation and a transaction

```ts
import { Router } from "express";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, users } from "../db/schema.js";
import { validateBody } from "../middleware/validate.js";

export const postsRouter = Router();

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  published: z.boolean().optional(),
  authorId: z.number().int().positive(),
});

// CREATE — verify the author exists inside a transaction, then insert
postsRouter.post("/", validateBody(createPostSchema), async (req, res) => {
  const post = await db.transaction(async (tx) => {
    const [author] = await tx.select({ id: users.id }).from(users).where(eq(users.id, req.body.authorId));
    if (!author) {
      // throw a typed error the handler can map — or just 400 here:
      const e: any = new Error("author not found");
      e.status = 400;
      throw e;
    }
    const [created] = await tx.insert(posts).values(req.body).returning();
    return created;
  });
  res.status(201).json(post);
});

// LIST published, newest first, with author nested (relational API)
postsRouter.get("/", async (_req, res) => {
  const rows = await db.query.posts.findMany({
    where: (p, { eq }) => eq(p.published, true),
    orderBy: (p, { desc }) => desc(p.createdAt),
    with: { author: { columns: { id: true, name: true } } },
    limit: 50,
  });
  res.json(rows);
});

// PUBLISH toggle
postsRouter.patch("/:id/publish", async (req, res) => {
  const [post] = await db
    .update(posts)
    .set({ published: true })
    .where(eq(posts.id, Number(req.params.id)))
    .returning();
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});
```

> Note the custom `e.status = 400` — extend `errorHandler` to honour `err.status` if set:
> ```ts
> if (typeof err?.status === "number") return res.status(err.status).json({ error: err.message });
> ```

---

## 6️⃣ App wiring + graceful shutdown — `src/index.ts`

```ts
import "dotenv/config";
import express from "express";
import { pool } from "./db/index.js";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { errorHandler } from "./middleware/errors.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/users", usersRouter);
app.use("/posts", postsRouter);

// 404 for anything unmatched
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

// error handler LAST
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => console.log(`http://localhost:${port}`));

// Graceful shutdown: stop new requests, drain in-flight, close the pool
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down`);
  server.close(async () => {
    await pool.end();            // waits for active queries, closes all connections
    console.log("pool closed, bye");
    process.exit(0);
  });
  // hard cap in case something hangs
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

---

## 7️⃣ Seed script — `src/db/seed.ts`

```ts
import "dotenv/config";
import { db, pool } from "./index.js";
import { users, posts } from "./schema.js";

async function seed() {
  // idempotent-ish: clear first (dev only!)
  await db.delete(posts);
  await db.delete(users);

  const inserted = await db
    .insert(users)
    .values([
      { email: "ada@example.com", name: "Ada Lovelace" },
      { email: "grace@example.com", name: "Grace Hopper" },
    ])
    .returning();

  const [ada, grace] = inserted;

  await db.insert(posts).values([
    { title: "On Analytical Engines", content: "...", published: true, authorId: ada.id },
    { title: "Notes G", content: "...", published: false, authorId: ada.id },
    { title: "The First Bug", content: "...", published: true, authorId: grace.id },
  ]);

  console.log(`seeded ${inserted.length} users`);
}

seed()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
```

```bash
npm run db:seed
```

---

## 8️⃣ Pool sizing & config notes

```ts
new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                          // total connections. Rule of thumb: start ~ (2 × CPU cores), tune with metrics
  idleTimeoutMillis: 30_000,        // close idle connections after 30s
  connectionTimeoutMillis: 5_000,   // fail fast if the DB is unreachable
});
```

- **Don't set `max` huge.** Postgres has its own `max_connections` (default 100); many app instances × large pools can exhaust it. If you run many instances or serverless functions, put **PgBouncer** (a connection pooler) in front of Postgres and point the app at it.
- One pool per process. In serverless, reuse the pool across warm invocations (module-level, as in [01 §6](01-Setup-Express-Postgres.md)).

---

## ✅ Production checklist

- [ ] `.env` gitignored; real secrets from the platform's env, not a file
- [ ] Migrations run on deploy **before** new app code starts (`tsx src/db/migrate.ts`)
- [ ] Every route body validated (`zod`)
- [ ] Central `errorHandler` mounted last; maps `23505`/`23503`/`23502`/`23514`
- [ ] `SIGTERM`/`SIGINT` → `server.close()` → `pool.end()`
- [ ] `/health` endpoint for load-balancer checks
- [ ] Pool `max` sized to the DB's `max_connections` budget; PgBouncer if many instances

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| How many connection pools per process? | One — created at module load, imported everywhere; never per-request |
| How do you turn a unique-violation into a clean HTTP response? | Central error middleware branching on `err.code` (`23505` → `409`) — Drizzle rethrows the raw `pg` error |
| Does Express 5 need `express-async-errors`? | No — it forwards rejected promises from async handlers to error middleware automatically |
| What is graceful shutdown? | On `SIGTERM`/`SIGINT`: stop accepting new requests (`server.close`), let in-flight queries finish, then `pool.end()` |
| Why not set the pool `max` very high? | Postgres has a `max_connections` cap; many instances × big pools exhaust it — use PgBouncer instead |
| Where should migrations run in a deploy? | As a release step before the new app version starts serving traffic |

---

**Section done.** Compare with the [Prisma lane](../prisma/01-Setup-Express-Postgres.md), or back to the [ORM index](../README.md) / [main series](../../README.md).
