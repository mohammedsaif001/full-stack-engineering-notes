# Prisma 02 — Schema & Migrations
## `model` Syntax in Full, and `migrate dev` / `deploy` / `db push`

> Previous: [01 — Setup](01-Setup-Express-Postgres.md) · Next: [03 — CRUD Queries](03-CRUD-Queries.md)

---

## 📌 Executive Summary

- `schema.prisma` is the source of truth. Prisma diffs it against the database to produce migrations.
- **`prisma migrate dev`** (development) — diffs, creates a new `prisma/migrations/<timestamp>_<name>/migration.sql`, applies it to your dev DB, and re-runs `prisma generate`. Also uses a **shadow database** to detect drift.
- **`prisma migrate deploy`** (CI / production) — applies pending migration files only. No diffing, no shadow DB, no client generation. Safe and deterministic.
- **`prisma db push`** — makes the DB match `schema.prisma` directly, **no migration file**. Prototyping only.
- **Workflow for a real project:** edit `schema.prisma` → `migrate dev --name <what_changed>` → review the generated `migration.sql` → commit the whole `migrations/` folder → `migrate deploy` in CI/prod.
- Every SQL type/constraint has a Prisma equivalent; relations are first-class in the schema (unlike Drizzle, where they're separate metadata).

---

## 🧠 Core Analogy: Renovation Permits

- `schema.prisma` = your **updated house plans**.
- The **database** = the **house as built**.
- `migrate dev` = filing a **dated, numbered permit** for this specific change with the city, *and* the inspector doing the work on your house immediately, *and* handing you updated blueprints (regenerated client). The city also keeps a **reference copy of your house** (shadow DB) to check your permit matches what's actually there before approving.
- `migrate deploy` = the contractor at another property (staging/prod) executing **exactly the filed permits**, in order, no improvisation.
- `db push` = you knocking down a wall yourself to match the new plan. Fast. No permit. If the plan lacks a wall the old one had, that wall is gone and there's no record it existed.

---

## 1️⃣ Model syntax — the full reference

### Scalar types

```prisma
model Demo {
  id        Int       @id @default(autoincrement())
  bigId     BigInt?
  count     Int       @default(0)
  price     Decimal   @db.Decimal(10, 2)     // money — maps to NUMERIC(10,2)
  ratio     Float                             // DOUBLE PRECISION
  name      String    @db.VarChar(100)        // VARCHAR(100); plain `String` → TEXT
  bio       String?                           // nullable TEXT
  isActive  Boolean   @default(true)
  bornOn    DateTime? @db.Date                // DATE only
  createdAt DateTime  @default(now()) @db.Timestamptz(6)  // TIMESTAMPTZ
  updatedAt DateTime  @updatedAt              // auto-set to now() on every update
  prefs     Json      @default("{}")          // JSONB (Prisma uses jsonb on Postgres)
  publicId  String    @default(uuid()) @db.Uuid
  role      Role      @default(VIEWER)        // an enum (below)
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}
```

### Field attributes

| Prisma | SQL |
|---|---|
| `@id` | `PRIMARY KEY` |
| `@default(x)` | `DEFAULT x` — `autoincrement()`, `now()`, `uuid()`, `cuid()`, literals |
| `@unique` | `UNIQUE` |
| `@updatedAt` | app-level "set to now on update" (Prisma writes it; not a DB trigger) |
| `@map("col")` | column name in DB differs from field name |
| `@db.VarChar(n)` / `@db.Timestamptz` / `@db.Uuid` … | pin the exact Postgres type |
| `?` suffix (`String?`) | nullable |
| `[]` suffix (`Post[]`, `String[]`) | relation list, or a Postgres array column for scalars |

### Block attributes (`@@`)

```prisma
model Follow {
  followerId  Int @map("follower_id")
  followingId Int @map("following_id")
  follower    User @relation("followers",  fields: [followerId],  references: [id])
  following   User @relation("followedBy", fields: [followingId], references: [id])
  createdAt   DateTime @default(now())

  @@id([followerId, followingId])          // composite PRIMARY KEY
  @@unique([followerId, followingId])      // or a multi-col UNIQUE
  @@index([followingId])                   // CREATE INDEX
  @@map("follows")
}
```

> `CHECK` constraints aren't expressible in `schema.prisma` yet — add them via a manual edit to the generated `migration.sql` (`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)`), or a separate migration.

---

## 2️⃣ Relations — first-class in the schema

Every relation has **two ends**:

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]                              // the "many" end — navigation only
}

model Post {
  id       Int  @id @default(autoincrement())
  author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId Int                              // the scalar FK — the only real column
}
```

- The side with `@relation(fields: [...], references: [...])` **owns** the foreign key.
- `onDelete`: `Cascade` | `Restrict` | `SetNull` | `NoAction` — the `ON DELETE` behaviour from [03 §2](../../03-DDL-Constraints-Alter-Drop.md).
- **Self-relation** (a user's manager) needs a `@relation("name")` on each end to disambiguate:

```prisma
model Employee {
  id         Int        @id @default(autoincrement())
  manager    Employee?  @relation("reports", fields: [managerId], references: [id])
  managerId  Int?
  reports    Employee[] @relation("reports")
}
```

- **Many-to-many:** Prisma can do an **implicit** join table (`posts Post[]` on both sides, no model) or an **explicit** one (you write the junction model — needed if the join carries extra fields like `createdAt`). Explicit is usually right for real apps.

---

## 3️⃣ The migration workflow (real projects)

### Step 1 — edit `schema.prisma`

Add `phone` to `User`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  phone     String?  @db.VarChar(15)          // ← new
  createdAt DateTime @default(now()) @map("created_at")
  posts     Post[]

  @@map("users")
}
```

### Step 2 — create & apply the migration

```bash
npx prisma migrate dev --name add_user_phone
```
```text
Applying migration `20260907_add_user_phone`
The following migration(s) have been created and applied:
  migrations/
    └─ 20260907120000_add_user_phone/
       └─ migration.sql
✔ Generated Prisma Client (v5.x.x)
```

`prisma/migrations/20260907120000_add_user_phone/migration.sql`:

```sql
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(15);
```

**Review this file.** For additive changes it's trivial. For renames/type changes, Prisma may generate a **drop + add** (data loss) — edit the `migration.sql` by hand to `RENAME COLUMN` / `ALTER COLUMN ... TYPE ... USING ...` before it's applied anywhere else, or use `--create-only` (below).

### Step 3 — commit

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "Add phone to users"
```

Teammate pulls → `npx prisma migrate dev` → their DB gets the migration + a fresh client. CI and prod run `prisma migrate deploy`.

### `--create-only` — write the migration without applying it

```bash
npx prisma migrate dev --name rename_bio_to_about --create-only
# now edit migration.sql to use RENAME COLUMN, then:
npx prisma migrate dev
```

---

## 4️⃣ `migrate deploy` — CI & production

```bash
npx prisma migrate deploy
```

- Applies every migration folder the target DB hasn't run yet, in order.
- **No** schema diffing, **no** shadow database, **no** client generation, **no** prompts.
- Deterministic — it runs exactly the SQL you reviewed and committed.
- Run it as a **release step before the new app version starts**. (Also run `prisma generate` in your build so the client matches — or commit the generated client; most teams run `prisma generate` in `postinstall` / build.)

The `_prisma_migrations` table in your DB records what's been applied.

---

## 5️⃣ `db push` — prototyping only

```bash
npx prisma db push
```

- Reshapes the DB to match `schema.prisma` **directly**. Regenerates the client. **No migration file.**
- Warns before data-losing changes, but there's no history and nothing to review or roll back.
- Fine for a solo spike, a proof-of-concept, or resetting a scratch DB. **Never** on a database with data you care about or that anyone else shares.

| | `migrate dev` / `deploy` | `db push` |
|---|---|---|
| Writes a reviewable `migration.sql` | ✅ | ❌ |
| History committed to git | ✅ | ❌ |
| Production-safe | ✅ (`deploy`) | ❌ |
| Shadow-DB drift detection | ✅ (`dev`) | ❌ |
| Fastest for a throwaway prototype | — | ✅ |

---

## 6️⃣ Other useful commands

```bash
npx prisma migrate reset      # DROP everything, re-run all migrations, re-seed (dev only)
npx prisma migrate status     # what's applied / pending
npx prisma db seed            # run the seed script (prisma.seed in package.json)
npx prisma studio             # GUI DB browser
npx prisma format             # tidy schema.prisma
npx prisma validate           # check schema.prisma is valid
```

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| `prisma migrate dev` vs `migrate deploy`? | `dev` diffs the schema, creates + applies a migration, regenerates the client, uses a shadow DB; `deploy` only applies committed migrations in order — for CI/prod |
| What is the shadow database? | A temporary DB Prisma uses during `migrate dev` to detect drift between your migrations and the actual schema |
| `migrate` vs `db push`? | `migrate` produces reviewable, committed, ordered history and is prod-safe; `db push` reshapes the DB directly with no history — prototyping only |
| How do you avoid data loss on a column rename? | `migrate dev --create-only`, then hand-edit `migration.sql` to `RENAME COLUMN` before applying |
| Where do `CHECK` constraints go in Prisma? | Not in `schema.prisma` yet — add them via a hand-edited migration SQL |
| How are relations declared? | Both ends in the schema; the side with `@relation(fields, references)` owns the FK column |
| Where should `migrate deploy` run? | As a release step before the new app version serves traffic |

---

**Next:** [03 — CRUD Queries](03-CRUD-Queries.md) — `create`, `findMany`, `update`, `upsert`, `delete` with every option.
