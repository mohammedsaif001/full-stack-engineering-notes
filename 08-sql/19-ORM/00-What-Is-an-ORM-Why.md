# What Is an ORM & Why — Drizzle vs Prisma
## Part 1 of the ORM section — The Concept, Migrations, and Choosing a Tool

> Back to: [ORM section index](README.md) · Series: [08-sql](../README.md)

---

## 📌 Executive Summary

- An **ORM (Object-Relational Mapper)** lets you work with your database as **typed code** — objects, methods, and function calls — instead of hand-written SQL strings. `db.insert(users).values({ email })` instead of `` client.query(`INSERT INTO users (email) VALUES ($1)`, [email]) ``.
- **Why bother:** compile-time type safety (a typo in a column name fails to build, not at 3 a.m. in production), autocomplete, automatic parameterization (no SQL-injection footguns), one schema definition reused everywhere, and a structured **migration** workflow.
- **What you give up:** a layer of indirection. Complex analytical queries can be awkward; you must understand the SQL the ORM generates; there's a learning curve per ORM.
- **A migration** is a versioned, checked-in file describing a schema change (`CREATE TABLE users`, `ALTER TABLE posts ADD COLUMN ...`). Migrations are applied **in order** to every environment so your laptop, CI, staging, and production databases all match your code. Without them, "update the schema" is a manual, undocumented, drift-prone operation.
- **Drizzle** is a thin, SQL-shaped query builder — you basically write SQL with TypeScript functions. Tiny, fast, no codegen, no runtime engine.
- **Prisma** is a higher-level toolkit — its own schema language, a **generated** client, and a very polished migration/Studio experience. More abstraction, a generate step, historically a heavier runtime (much improved in recent versions).

---

## 🧠 Core Analogy: Talking to the Warehouse

Your database is a warehouse. You (the Express app) need things in and out of it.

- **Raw SQL (`pg`)** = writing every request as a hand-typed note in the warehouse's own shorthand, on a paper form, and mailing it in. Total control. But one misspelled shelf code and the note is silently misfiled — you find out when the wrong box arrives. And you re-copy the same note formats over and over.
- **An ORM** = an app on your phone with the warehouse's actual catalog built in. You tap "add item", pick from a dropdown of real shelves, fill typed fields. It *generates* the correct shorthand note for you and sends it. You can't pick a shelf that doesn't exist — the dropdown only shows real ones. That's compile-time type safety.
  - **Drizzle's app** looks almost exactly like the paper form — same fields, same order — just with the dropdowns and spell-check added. If you know the paper form, you know this.
  - **Prisma's app** is a friendlier redesign — "New Shipment" wizards, nested "add these 3 boxes to this pallet in one step", a nice dashboard. Further from the raw form, smoother to use.

---

## 1️⃣ What an ORM actually does

Given a schema you define once, an ORM provides:

1. **A typed query API.** `db.select().from(users).where(eq(users.id, 1))` — every table, column, and result row is a TypeScript type. Rename a column in the schema and every query referencing the old name is a **build error**.
2. **Automatic parameterization.** Values you pass are always sent as bound parameters, never string-concatenated. SQL injection via the ORM's normal API is not possible.
3. **Result mapping.** Rows come back as plain typed objects (`{ id: 1, email: "a@b.com" }`), with `snake_case` DB columns optionally mapped to `camelCase` fields.
4. **Migrations.** A CLI that diffs your schema against the database and writes the `CREATE`/`ALTER` SQL to apply the difference.
5. **Relations.** A way to load "a user and their posts" without hand-writing the join and de-duplicating rows yourself.

### The same operation, three ways

```ts
// Raw pg — a string, manual params, manual result typing
const { rows } = await pool.query<{ id: number; email: string }>(
  `SELECT id, email FROM users WHERE email = $1`,
  ["ada@example.com"]
);
const user = rows[0];

// Drizzle — SQL-shaped, fully typed, params automatic
const [user] = await db
  .select({ id: users.id, email: users.email })
  .from(users)
  .where(eq(users.email, "ada@example.com"));

// Prisma — model-centric, fully typed
const user = await prisma.user.findUnique({
  where: { email: "ada@example.com" },
  select: { id: true, email: true },
});
```

All three run essentially the same `SELECT`. The difference is how much the tool does for you, and how far the code sits from the SQL.

---

## 2️⃣ Why use an ORM instead of raw `pg`?

| Concern | Raw `pg` | ORM |
|---|---|---|
| **Column typos** | Runtime error (or silently wrong) | **Compile error** |
| **Result types** | You write the generic `query<T>` by hand, and it can lie | Inferred from the schema — always accurate |
| **SQL injection** | Safe *only if* you always use `$1` params, every time | Safe by construction via the normal API |
| **Refactoring** (rename a column) | Grep every `.sql` string and hope | Rename in schema → build fails everywhere it's used |
| **Schema as one source of truth** | The DB is the truth; your code guesses | Schema file *is* the truth; DB is generated from it |
| **Migrations** | Hand-write and hand-track `.sql` files | CLI generates and orders them |
| **Boilerplate** | Re-type `INSERT ... RETURNING`, result mapping, etc. | One-liners |
| **Complex analytical SQL** | Full power, natural | Sometimes awkward — drop to raw SQL (both ORMs allow this) |
| **Learning curve** | Just SQL | SQL **plus** the ORM's API |
| **Runtime weight** | Minimal | Small (Drizzle) to moderate (Prisma) |

**The honest summary:** for typical CRUD-heavy application code (90% of what an Express API does), an ORM removes a large class of bugs and boilerplate for a modest cost. For heavy reporting/analytics queries, you'll still write raw SQL — and both ORMs let you, so it's not either/or.

> You already know the SQL from files 01–18. That knowledge doesn't go to waste — it's exactly what lets you read the queries your ORM generates, debug a slow one, and know when to bypass the ORM.

---

## 3️⃣ Migrations — what and why

### The problem migrations solve

Your `users` table needs a new `phone` column. Without a migration process:

- You run `ALTER TABLE users ADD COLUMN phone VARCHAR(15)` in `psql` on your laptop. Works.
- A teammate pulls your code. Their code expects `phone`; their database doesn't have it. Their app crashes.
- You deploy to production. Same crash, now for real users.
- Six months later, nobody remembers whether staging ever got that column, or in what order three overlapping schema changes were applied.

This is **schema drift** — environments silently diverging.

### What a migration is

A **migration** is a file (SQL, or a small script) that describes **one schema change**, committed to git alongside the code that needs it:

```
migrations/
  0000_initial.sql              -- CREATE TABLE users; CREATE TABLE posts;
  0001_add_user_phone.sql       -- ALTER TABLE users ADD COLUMN phone VARCHAR(15);
  0002_posts_published_index.sql-- CREATE INDEX ... ON posts (published);
```

- Each migration has an **order** (the numeric prefix).
- The database records **which migrations it has already run** (in a small tracking table the ORM manages).
- Running "migrate" applies only the ones this database hasn't seen yet, **in order**.

So: teammate pulls, runs `migrate`, their DB gets `0001` and `0002` automatically. CI does the same. Production deploy runs `migrate` as a release step. Every database converges to the same schema, and the history is in git.

### Two workflows both ORMs offer

| Command style | What it does | Use for |
|---|---|---|
| **Generate + migrate** (Drizzle: `generate` then `migrate`; Prisma: `migrate dev`) | Diffs schema vs DB, writes a versioned migration file, then applies it | **Real projects.** Reviewable, reversible-ish, deployable |
| **Push** (Drizzle: `push`; Prisma: `db push`) | Directly reshapes the DB to match the schema, **no migration file** | Rapid local prototyping only. Not for production — no history, can silently drop columns |

**Rule:** `push` while you're still deciding the shape; switch to `generate`/`migrate dev` the moment the project is real and shared.

---

## 4️⃣ Drizzle vs Prisma — the comparison

Both are excellent, TypeScript-first, and production-ready. They make different bets.

| Dimension | **Drizzle** | **Prisma** |
|---|---|---|
| **Mental model** | A typed SQL query builder — "SQL, but in TS" | A data-model layer — "describe entities, call methods" |
| **Schema defined in** | TypeScript files (`users = pgTable("users", {...})`) | A dedicated `.prisma` file with its own syntax |
| **Code generation** | None. Types come straight from your TS schema | A `prisma generate` step produces the client (re-run after every schema change) |
| **Runtime** | Tiny; just your driver + a thin builder. No engine | The client is JS/TS now (older versions shipped a Rust query engine binary); still heavier than Drizzle |
| **Query style** | Two APIs: SQL-like (`select().from().where()`) **and** a relational API (`db.query.users.findMany({ with: { posts: true } })`) | One API: `prisma.user.findMany({ include: { posts: true } })` |
| **How close to SQL** | Very — you compose `and()`, `eq()`, `sql\`\``, joins explicitly | Further — joins are `include`/`select`, raw SQL is an escape hatch |
| **Migrations** | `drizzle-kit` — generates plain `.sql` files you can read/edit | `prisma migrate` — generates `.sql` in folders, plus a shadow-DB safety check; very polished |
| **Relations** | You declare `relations()` for the relational API; joins are otherwise manual | Relations are first-class in the schema; `include` just works |
| **GUI** | Drizzle Studio (`drizzle-kit studio`) | Prisma Studio (`prisma studio`) — very mature |
| **Edge / serverless** | Excellent — tiny bundle, no binary | Good now (driver adapters, no binary in modern versions), was historically painful |
| **Learning curve** | Low **if you know SQL** (this series) — the API mirrors it | Low in absolute terms — the API is friendly; but you learn a new schema language and the codegen loop |
| **Escape hatch to raw SQL** | `sql\`\`` template, `db.execute()` | `prisma.$queryRaw\`\``, `$executeRaw` |
| **Best fit** | SQL-comfortable teams, edge/serverless, minimal-overhead services, "I want to see the SQL" | Teams wanting maximum DX, the smoothest migrations/Studio out of the box, less concern about abstraction |

### Advantages of each, in brief

**Drizzle advantages**
- Almost no abstraction — what you write is what runs; easy to predict the SQL and performance.
- No codegen step — no "I forgot to re-run generate" class of bugs.
- Tiny footprint; ideal for Lambda/Cloudflare Workers/Vercel Edge.
- Your SQL knowledge transfers directly.
- Schema is plain TypeScript — refactor with normal TS tooling.

**Prisma advantages**
- Best-in-class developer experience — the API is intuitive, the errors are clear, the docs are excellent.
- The migration workflow (`migrate dev`, shadow DB, drift detection) is more turnkey.
- Nested writes (`create` a user *and* their 3 posts in one call) are very ergonomic.
- Prisma Studio is a genuinely useful DB browser for non-DBAs.
- Huge ecosystem, tons of tutorials and integrations.

### How to actually decide

- **Building a service you'll deploy to the edge / serverless, or you want the smallest possible dependency?** → Drizzle.
- **You (and this series) are comfortable with SQL and want the code to look like it?** → Drizzle.
- **You want the smoothest onboarding for a team, the most hand-holding, and the strongest migration tooling with zero setup?** → Prisma.
- **You want nested/relational writes to be effortless?** → Prisma.
- **Genuinely torn?** Either is a good choice — this is not a decision you'll regret. Pick one, learn its lane in the next 5 files, ship.

---

## 5️⃣ Where an ORM sits in an Express app

```
┌─────────────────────────────────────────────┐
│  Express route handler                       │
│    app.post("/users", async (req, res) => {  │
│      const user = await db.insert(users)...   │  ← ORM call
│      res.json(user);                          │
│    })                                         │
└───────────────────┬─────────────────────────┘
                    │ ORM builds parameterized SQL
                    ▼
┌─────────────────────────────────────────────┐
│  Driver (pg Pool)  ── TCP ──▶  PostgreSQL     │
└─────────────────────────────────────────────┘
```

The ORM replaces the "hand-write SQL strings and map rows" part of your handlers. Everything else — routing, validation, auth, the `pg` connection pool underneath — is unchanged. The next files wire this up concretely for each ORM.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What is an ORM? | A library that maps database tables/rows to typed objects and methods, generating SQL for you |
| Why use an ORM over raw SQL? | Compile-time type safety, autocomplete, automatic parameterization, one schema as source of truth, structured migrations, less boilerplate |
| What's a downside of an ORM? | An abstraction layer to learn; complex analytical queries can be awkward (both allow dropping to raw SQL) |
| What is a migration? | A versioned, checked-in file describing a schema change, applied in order so every environment's schema matches the code |
| Why not just `ALTER TABLE` manually? | Schema drift — environments silently diverge, with no history or ordering |
| `migrate` vs `push`? | `migrate` writes a reviewable versioned file then applies it (real projects); `push` reshapes the DB directly with no history (local prototyping only) |
| Drizzle vs Prisma in one line? | Drizzle is a thin typed SQL builder (no codegen, tiny, close to SQL); Prisma is a higher-level toolkit with its own schema language, a generated client, and a polished migration/Studio DX |
| When pick Drizzle? | SQL-comfortable teams, edge/serverless, minimal overhead, wanting to see the generated SQL |
| When pick Prisma? | Maximum DX, turnkey migrations, effortless nested/relational writes |

---

**Next:** pick a lane — [drizzle/01](drizzle/01-Setup-Express-Postgres.md) or [prisma/01](prisma/01-Setup-Express-Postgres.md).
