# Prisma 05 — Express Integration
## A Complete Router, Error Mapping, Shutdown, Seeding

> Previous: [04 — Relations, Joins & Advanced](04-Relations-Joins-Advanced.md) · Section index: [ORM](../README.md)

---

## 📌 Executive Summary

- **One `PrismaClient`, imported everywhere** (the singleton from [01 §6](01-Setup-Express-Postgres.md)). It manages its own connection pool.
- **Validate input first** with `zod` — bad requests become `400`s, never DB errors.
- **Map Prisma error codes in one middleware:** `P2002` (unique) → `409`, `P2025` (not found) → `404`, `P2003` (FK) → `409`/`400`, `P2000` (value too long) → `400`.
- **Graceful shutdown:** on `SIGTERM`/`SIGINT`, `server.close()` then `await prisma.$disconnect()`.
- **Seed script** is `prisma/seed.ts`, wired via `"prisma": { "seed": "..." }` in `package.json`, run with `npx prisma db seed` (and automatically by `prisma migrate reset`).
- **Pool sizing:** the pool size is in the `DATABASE_URL` (`?connection_limit=10`), not code. Default is `num_cpus * 2 + 1`.

---

## 🧠 Core Analogy: The Front Desk of a Clinic

- **The singleton client** = the clinic's one shared appointment system — every doctor's office queries the same system, nobody spins up a private copy.
- **Validation middleware** = the receptionist checking your form is filled in before you see a doctor.
- **Error middleware** = the office manager who turns "the lab rejected that sample (P2002)" into "that record already exists" for the patient.
- **Graceful shutdown** = at end of day, no new check-ins, finish with the patients already in rooms, then log off the system.

---

## 1️⃣ Folder recap

```
src/
├── index.ts              ← app wiring, middleware order, shutdown
├── db.ts                 ← the single PrismaClient (from 01 §6)
├── middleware/
│   ├── validate.ts       ← zod request validation
│   └── errors.ts         ← central Prisma-error → HTTP mapper
└── routes/
    ├── users.ts
    └── posts.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
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
    req.body = result.data;
    next();
  };
```

---

## 3️⃣ Central error handler — `src/middleware/errors.ts`

```ts
import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";

// Prisma error codes → HTTP.  https://www.prisma.io/docs/reference/api-reference/error-reference
const PRISMA_CODE_TO_HTTP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: "A record with that value already exists." },   // unique constraint
  P2025: { status: 404, message: "Record not found." },                          // no row matched where
  P2003: { status: 409, message: "Related record missing, or still referenced." },// FK constraint
  P2000: { status: 400, message: "A provided value is too long for the column." },
  P2011: { status: 400, message: "A required (non-null) field was missing." },
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // custom short-circuit: handlers can throw an error with a numeric .status
  if (typeof err?.status === "number") {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_CODE_TO_HTTP[err.code];
    if (mapped) {
      return res.status(mapped.status).json({
        error: mapped.message,
        code: err.code,
        target: (err.meta as any)?.target,   // e.g. ["email"] for a P2002
      });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: "Invalid query arguments." });
  }

  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
};
```

> Prisma **wraps** driver errors into typed classes with a stable `.code` (`P2002`, …) — unlike Drizzle, which rethrows the raw `pg` error with `23505`. Same idea, different code namespace.

---

## 4️⃣ The `users` router — `src/routes/users.ts`

```ts
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { validateBody } from "../middleware/validate.js";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
});
const updateUserSchema = createUserSchema.partial();

// CREATE
usersRouter.post("/", validateBody(createUserSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json(user);
  } catch (err) {
    next(err);   // P2002 → 409 via errorHandler
  }
});

// LIST + pagination
usersRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(100, Number(req.query.size) || 20);
  const [data, total] = await Promise.all([
    prisma.user.findMany({ skip: (page - 1) * size, take: size, orderBy: { id: "asc" } }),
    prisma.user.count(),
  ]);
  res.json({ page, size, total, data });
});

// READ ONE
usersRouter.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// UPDATE  (P2025 → 404 via errorHandler)
usersRouter.patch("/:id", validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE
usersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
```

---

## 5️⃣ The `posts` router — relation + nested write + transaction

```ts
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { validateBody } from "../middleware/validate.js";

export const postsRouter = Router();

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  published: z.boolean().optional(),
  authorId: z.number().int().positive(),
});

// CREATE — link to author via nested connect; P2025 (bad authorId) → 404
postsRouter.post("/", validateBody(createPostSchema), async (req, res, next) => {
  try {
    const { authorId, ...rest } = req.body;
    const post = await prisma.post.create({
      data: { ...rest, author: { connect: { id: authorId } } },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

// LIST published, newest first, with author
postsRouter.get("/", async (_req, res) => {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
    take: 50,
  });
  res.json(posts);
});

// PUBLISH toggle
postsRouter.patch("/:id/publish", async (req, res, next) => {
  try {
    const post = await prisma.post.update({
      where: { id: Number(req.params.id) },
      data: { published: true },
    });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// Example interactive transaction: create a post + bump the author's counter
postsRouter.post("/with-counter", validateBody(createPostSchema), async (req, res, next) => {
  try {
    const { authorId, ...rest } = req.body;
    const post = await prisma.$transaction(async (tx) => {
      const author = await tx.user.findUnique({ where: { id: authorId } });
      if (!author) {
        const e: any = new Error("author not found");
        e.status = 400;
        throw e;
      }
      const created = await tx.post.create({ data: { ...rest, authorId } });
      // await tx.user.update({ where: { id: authorId }, data: { postCount: { increment: 1 } } });
      return created;
    });
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});
```

---

## 6️⃣ App wiring + graceful shutdown — `src/index.ts`

```ts
import "dotenv/config";
import express from "express";
import { prisma } from "./db.js";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { errorHandler } from "./middleware/errors.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/users", usersRouter);
app.use("/posts", postsRouter);

app.use((_req, res) => res.status(404).json({ error: "Not Found" }));
app.use(errorHandler);   // LAST

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => console.log(`http://localhost:${port}`));

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("prisma disconnected, bye");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

---

## 7️⃣ Seed script — `prisma/seed.ts`

`package.json` already has:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

```ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // dev-only reset
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const ada = await prisma.user.create({
    data: {
      email: "ada@example.com",
      name: "Ada Lovelace",
      posts: {
        create: [
          { title: "On Analytical Engines", content: "...", published: true },
          { title: "Notes G", content: "...", published: false },
        ],
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "grace@example.com",
      name: "Grace Hopper",
      posts: { create: [{ title: "The First Bug", published: true }] },
    },
  });

  console.log(`seeded; ada.id=${ada.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

```bash
npx prisma db seed        # run manually
npx prisma migrate reset  # drop, re-migrate, then auto-run this seed  (dev only)
```

---

## 8️⃣ Pool & connection notes

- Pool size lives in the connection string, not code:
  ```bash
  DATABASE_URL="postgresql://user:pass@localhost:5432/blog_db?schema=public&connection_limit=10&pool_timeout=20"
  ```
  Default `connection_limit` = `num_physical_cpus * 2 + 1`.
- **One `PrismaClient` per process.** With many app instances or serverless functions, the total connections = instances × `connection_limit` — this can blow past Postgres's `max_connections` (default 100). Put **PgBouncer** (or your provider's pooler, e.g. Prisma Accelerate / Supabase pooler) in front, and add `?pgbouncer=true` to the URL so Prisma disables prepared statements it can't use through a transaction pooler.
- `prisma.$connect()` is lazy — the first query connects. `prisma.$disconnect()` on shutdown.
- Run `prisma generate` in your build/`postinstall` so the deployed client matches the schema.

---

## ✅ Production checklist

- [ ] `.env` gitignored; secrets from the platform env
- [ ] `prisma generate` in build; `prisma migrate deploy` as a release step **before** the app starts
- [ ] Every route body validated (`zod`)
- [ ] `errorHandler` mounted last; maps `P2002`/`P2025`/`P2003`/`P2000`
- [ ] `SIGTERM`/`SIGINT` → `server.close()` → `prisma.$disconnect()`
- [ ] `/health` endpoint
- [ ] `connection_limit` sized to the DB's budget; PgBouncer + `?pgbouncer=true` if many instances

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| How does Prisma surface a unique-constraint violation? | As `Prisma.PrismaClientKnownRequestError` with `code === "P2002"` (map to `409`) |
| What does `P2025` mean? | An `update`/`delete`/`findUniqueOrThrow` matched no row — map to `404` |
| Where is the Prisma pool size configured? | In the `DATABASE_URL` (`?connection_limit=10`), not in code |
| How many `PrismaClient` instances per process? | One — a singleton module export |
| What's the deploy migration command? | `prisma migrate deploy` — applies committed migrations only, no diffing or prompts |
| Why add `?pgbouncer=true`? | Through a transaction-mode pooler, Prisma must disable prepared statements it can't reuse |
| How is the seed script wired? | `"prisma": { "seed": "tsx prisma/seed.ts" }` in `package.json`; runs on `db seed` and `migrate reset` |

---

**Section done.** Compare with the [Drizzle lane](../drizzle/01-Setup-Express-Postgres.md), or back to the [ORM index](../README.md) / [main series](../../README.md).
