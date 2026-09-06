# Prisma 01 — Setup in Express + Postgres
## Install, `prisma init`, `schema.prisma`, the Client Singleton

> Section: [ORM](../README.md) · Concept first: [00 — What Is an ORM](../00-What-Is-an-ORM-Why.md) · Next: [02 — Schema & Migrations](02-Schema-and-Migrations.md)

---

## 📌 Executive Summary

- **Two packages:** `prisma` (dev CLI) and `@prisma/client` (the runtime client you import).
- **`npx prisma init`** scaffolds `prisma/schema.prisma` and a `.env` with a `DATABASE_URL` placeholder.
- **`schema.prisma`** is Prisma's own file format — a `datasource`, a `generator`, and your `model` blocks. It is the single source of truth.
- **`npx prisma generate`** reads `schema.prisma` and generates a **typed client** into `node_modules/@prisma/client`. You **re-run it after every schema change** (Prisma reminds you; `prisma migrate` runs it for you).
- **One `PrismaClient` instance** for the whole app, exported from a module — creating many leaks connections.
- The generated client is `prisma.user.findMany(...)`, `prisma.post.create(...)` — one method style, model-centric.

---

## 🧠 Core Analogy: A Made-to-Measure Toolset

- `schema.prisma` = the **measurements you hand to a workshop** — "I need tools for these exact parts."
- `prisma generate` = the **workshop fabricating the toolset** to those measurements. Change the measurements → send them back → get a new toolset. (Drizzle skips this — it hands you a universal adjustable wrench that reads your spec at runtime.)
- `@prisma/client` = the **toolbox** the workshop delivers — every tool shaped exactly for your models, with labels (autocomplete).
- `PrismaClient` instance = **picking up the toolbox**. You keep *one* on the workbench; you don't grab a fresh toolbox for every screw.

---

## 1️⃣ Project skeleton

```
my-api/
├── .env
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma        ← datasource + generator + models
│   ├── migrations/          ← generated migration folders
│   └── seed.ts              ← dev/baseline data
└── src/
    ├── index.ts            ← Express app
    ├── db.ts               ← the single PrismaClient
    └── routes/
        └── users.ts
```

---

## 2️⃣ Install & init

```bash
npm init -y
npm i express dotenv
npm i -D prisma typescript tsx @types/express @types/node

npx prisma init --datasource-provider postgresql
```

`prisma init` creates:
- `prisma/schema.prisma` (with a `postgresql` datasource)
- `.env` with `DATABASE_URL="postgresql://..."` placeholder

Then add the client runtime:

```bash
npm i @prisma/client
```

`package.json` — ESM + scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

`tsconfig.json`:

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
  "include": ["src", "prisma"]
}
```

---

## 3️⃣ `.env`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blog_db?schema=public"
```

> `?schema=public` is Prisma's way of naming the Postgres schema (namespace). Create the database first if needed: `CREATE DATABASE blog_db;` in psql (see [main series file 00](../../00-Setup-Postgres-VSCode-psql.md)).
>
> **Never commit `.env`.** `.gitignore` it (Prisma adds it for you), commit `.env.example`.

---

## 4️⃣ `prisma/schema.prisma` — the source of truth

```prisma
// 1. Where the DB is, and what kind
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 2. What to generate (the TypeScript client)
generator client {
  provider = "prisma-client-js"
}

// 3. Your models
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  posts     Post[]                              // one User → many Post (relation field, no DB column)

  @@map("users")                                // table name in the DB
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published  Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  Int      @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("posts")
  @@index([authorId])
}
```

Reading it against what you know:

| Prisma | SQL ([02](../../02-DDL-Creating-Tables-Data-Types.md)–[03](../../03-DDL-Constraints-Alter-Drop.md)) |
|---|---|
| `Int @id @default(autoincrement())` | `SERIAL PRIMARY KEY` |
| `String` | `TEXT` / `VARCHAR` (Prisma uses `text` by default; `@db.VarChar(255)` to pin it) |
| `String?` | nullable column |
| `Boolean @default(false)` | `BOOLEAN NOT NULL DEFAULT FALSE` |
| `DateTime @default(now())` | `TIMESTAMP(3) NOT NULL DEFAULT now()` (add `@db.Timestamptz` for `TIMESTAMPTZ`) |
| `@unique` | `UNIQUE` |
| `@map("created_at")` | column name in the DB is `created_at`; the field in code is `createdAt` |
| `@@map("users")` | the table name in the DB is `users`; the model is `User` |
| `@relation(fields: [authorId], references: [id], onDelete: Cascade)` | `FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE` |
| `posts Post[]` / `author User` | **relation fields** — navigational only, no column of their own |
| `@@index([authorId])` | `CREATE INDEX ON posts (author_id)` |

> `posts Post[]` on `User` and `author User` + `authorId Int` on `Post` are **two ends of one relation**. Only `authorId` becomes a real column. Prisma needs both ends declared.

---

## 5️⃣ Generate the client

```bash
npx prisma generate
```
```text
✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in 45ms
```

Now `import { PrismaClient } from "@prisma/client"` exists and is fully typed to your models. **Re-run `generate` every time you edit `schema.prisma`** — `prisma migrate dev` does it automatically, but a bare schema edit doesn't.

---

## 6️⃣ The client singleton — `src/db.ts`

Creating a `new PrismaClient()` opens a connection pool. Do it **once**.

```ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// In dev with hot-reload (tsx watch), guard against creating many clients on reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],          // add "query" while debugging to see generated SQL
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

`import { prisma } from "./db.js"` anywhere.

---

## 7️⃣ Minimal Express app — `src/index.ts`

```ts
import "dotenv/config";
import express from "express";
import { prisma } from "./db.js";

const app = express();
app.use(express.json());

app.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`http://localhost:${port}`));
```

```bash
npm run dev
```

`GET /users` errors until the table exists. Create it:

```bash
npm run db:migrate       # first migration — creates users & posts (next file)
# or, for a pure local spike with no migration history:
npm run db:push
```

Then `GET /users` → `[]`.

---

## ✅ Checklist

- [ ] `npm run dev` starts Express with no crash
- [ ] `.env` has a valid `DATABASE_URL`, gitignored
- [ ] `prisma/schema.prisma` has `User` and `Post` models
- [ ] `npx prisma generate` ran with no errors
- [ ] `import { prisma } from "./db.js"` autocompletes `.user`, `.post`
- [ ] Only **one** `new PrismaClient()` in the whole codebase
- [ ] `npm run db:migrate` (or `db:push`) created the tables

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What two Prisma packages do you install? | `prisma` (dev CLI) and `@prisma/client` (runtime) |
| What is `schema.prisma`? | Prisma's own file: a `datasource`, a `generator`, and `model` blocks — the single source of truth |
| What does `prisma generate` produce? | A TypeScript client typed to your models, written into `node_modules/@prisma/client` |
| When must you re-run `prisma generate`? | After every `schema.prisma` change (`prisma migrate dev` does it for you) |
| How many `PrismaClient` instances should an app have? | One — creating many exhausts DB connections |
| How do you map `camelCase` fields to `snake_case` columns? | `@map("col_name")` on the field, `@@map("table_name")` on the model |
| What are relation fields like `posts Post[]`? | Navigation-only fields — they don't create a column; only the scalar FK (`authorId`) does |

---

**Next:** [02 — Schema & Migrations](02-Schema-and-Migrations.md) — model syntax in full, and `migrate dev` / `deploy` / `db push`.
