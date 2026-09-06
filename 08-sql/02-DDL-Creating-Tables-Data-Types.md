# DDL Part 1 — Creating Tables & Choosing Data Types
## Part 2 of 19 — `CREATE TABLE` and the "Why" Behind Every Type

> Previous: [01-Why-Databases-Exist-SQL-vs-NoSQL.md](01-Why-Databases-Exist-SQL-vs-NoSQL.md)

---

## 📌 Executive Summary

- **DDL = Data Definition Language.** It defines and changes *structure*: databases, tables, columns, constraints, indexes. `CREATE` makes a structure for the first time; `ALTER` changes it later; `DROP` deletes it.
- **`CREATE TABLE`** lists each column with a **name** and a **type**, optionally followed by **constraints** (rules the database enforces on every row). This file focuses on the name + type; [03](03-DDL-Constraints-Alter-Drop.md) covers constraints and `ALTER`/`DROP` in full.
- **Identifiers are lowercased by default** in Postgres. `CREATE TABLE Students` silently becomes `students`. Use `snake_case` and never fight this.
- **Choosing a type is a "why" decision, not memorisation.** It's driven by: the *range* of values you need, how much *space* each row costs, whether you need *exact* math (money) or *approximate* is fine, and whether the value is ever used in arithmetic.
- **The three you'll use most:** `INT` / `SERIAL` for whole numbers and IDs, `VARCHAR(n)` / `TEXT` for strings, `NUMERIC(p, s)` for money, `TIMESTAMPTZ` for timestamps, `BOOLEAN` for flags.
- **Two classic fresher mistakes** this file kills: storing a **phone number as a number**, and using a **floating-point type for money**.

---

## 🧠 Core Analogy: A Blank Spreadsheet with Locked Column Rules

`CREATE TABLE` is like setting up a new sheet in Excel and, *before typing any data*, going into each column's settings and saying:

- "Column A is **whole numbers only**, auto-numbered."
- "Column B is **text, max 50 characters**, and cannot be left blank."
- "Column F is **a date**, and if I don't fill it in, default it to today."

From then on, Excel refuses any cell that breaks its column's rule. That's a SQL table: the shape and the rules are decided **first**, and the database enforces them on every insert forever after.

---

## 📝 1. Naming rules (easy to get wrong)

- SQL identifiers are **case-insensitive by default**, and Postgres **folds unquoted identifiers to lowercase**. `CREATE TABLE Students (...)` is stored as `students`. `SELECT * FROM STUDENTS` still works.
- To *force* a mixed-case name you must double-quote it everywhere: `CREATE TABLE "Students"` then `SELECT * FROM "Students"`. **Don't** — it causes confusing bugs later. Stick to lowercase.
- **Single quotes are for string values, not names.** `'students'` is the text value; `students` (or `"students"`) is the identifier. Using `'...'` where a name is expected is a syntax error.
- Convention across the SQL world: **`snake_case`** — `first_name`, `created_at`, `order_line_items`. Not `firstName`, not `first-name` (kebab-case is a syntax error — the parser reads `first - name` as subtraction).
- Comments: `-- single line`, or `/* block comment */`.

---

## 🏗️ 2. A first `CREATE TABLE`

```sql
DROP TABLE IF EXISTS students;
```
```text
DROP TABLE
```
> `DROP TABLE IF EXISTS` never errors, even if the table was never created. Without `IF EXISTS`, dropping a non-existent table throws `ERROR: table "students" does not exist`. Starting a script with `DROP ... IF EXISTS` makes it safely re-runnable.

```sql
CREATE TABLE students (
    student_id      SERIAL PRIMARY KEY,          -- auto-incrementing integer, uniquely identifies each row
    first_name      VARCHAR(50) NOT NULL,        -- text up to 50 chars, cannot be blank
    last_name       VARCHAR(50),                 -- nullable — some people have one name
    email           VARCHAR(100) UNIQUE NOT NULL,-- must be unique across all rows, and required
    phone_number    VARCHAR(15) UNIQUE,          -- string, NOT a number — see §5
    age             INT CHECK (age > 12),        -- a validation rule enforced on every write
    current_status  VARCHAR(20) DEFAULT 'active'
        CHECK (current_status IN ('active', 'graduated', 'dropped_out', 'on_leave')),
    current_score   NUMERIC(5, 2) CHECK (current_score >= 0 AND current_score <= 100),
    has_paid_fees   BOOLEAN DEFAULT FALSE,
    enrolled_on     DATE DEFAULT CURRENT_DATE
);
```
```text
CREATE TABLE
```
> `CREATE TABLE` returns no rows — just a confirmation that the structure now exists. You won't see any data until you `INSERT`.

Every line is `column_name TYPE [constraints...]`. The constraints (`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`) are explained fully in [03](03-DDL-Constraints-Alter-Drop.md) — for now, focus on the **types**.

---

## 🔢 3. Numeric types

| Type | Storage | Range / precision | Use it for |
|---|---|---|---|
| `SMALLINT` | 2 bytes | ±32,767 | Tightly bounded small counters (a 1–5 rating) where saving space matters at scale |
| `INTEGER` / `INT` | 4 bytes | ±2.1 billion (2³¹, **signed**) | **The default for whole numbers** — IDs, counts, quantities |
| `BIGINT` | 8 bytes | ±9.2 quintillion (2⁶³) | View counts, or IDs on tables expected to pass ~2 billion rows |
| `SERIAL` | 4 bytes (`INT` + a sequence) | same as `INT` | Auto-incrementing integer primary keys |
| `BIGSERIAL` | 8 bytes (`BIGINT` + a sequence) | same as `BIGINT` | Auto-incrementing PK on tables expected to grow past 2 billion rows |
| `NUMERIC(p, s)` / `DECIMAL(p, s)` | variable | **Exact**, `p` total digits, `s` after the decimal | **Money, prices, balances — anything needing exact decimal math** |
| `REAL` | 4 bytes | ~6 significant digits, **approximate** | Sensor/measurement data where tiny rounding error is acceptable |
| `DOUBLE PRECISION` | 8 bytes | ~15 significant digits, **approximate** | Scientific math — still never money |

### The two rules that matter

1. **`INT` is signed and 4 bytes** → max ≈ 2.1 billion. If a value could exceed that (a global view counter, a phone number's digits), use `BIGINT` — or, for phone numbers, a *string* (§5).
2. **`NUMERIC(p, s)` is exact; `REAL`/`DOUBLE` are not.** `NUMERIC(10, 2)` means "10 total digits, 2 after the point" and stores `0.1 + 0.2` as exactly `0.30`. `REAL`/`DOUBLE` are binary floating-point — `0.1 + 0.2` can come out `0.30000000000000004`. **Never use floating point for prices, balances, or anything financial.**

> `SERIAL` isn't really its own type — it's shorthand for "an `INT` column, plus a **sequence** object that hands out `1, 2, 3, …` automatically on insert." More on sequences and why deleted IDs are never reused: [03 §7](03-DDL-Constraints-Alter-Drop.md).

**Byte-size intuition** (`1 byte = 8 bits`):

| Type | Size | Approx range |
|---|---|---|
| `INT` | 4 bytes (32 bits) | ±2.1 billion — half the range is negative |
| `BIGINT` | 8 bytes (64 bits) | ±9.2 quintillion |
| `VARCHAR(n)` | ~n bytes (no padding) | up to n characters |
| `CHAR(n)` | exactly n bytes (space-padded) | exactly n characters |

---

## 🔤 4. Character / string types

| Type | Behaviour | Use it for |
|---|---|---|
| `VARCHAR(n)` | Variable-length, capped at `n` characters. **No padding** — `"Sam"` in a `VARCHAR(50)` uses only 3 chars' worth of space | The default for text with a sensible known max: names, emails, titles, slugs |
| `CHAR(n)` | **Fixed**-length, space-padded to exactly `n`. `CHAR(10)` storing `'ABC'` is really `'ABC       '` | Rare — genuinely fixed-width codes (a 2-letter country code). The trailing spaces cause comparison bugs; usually avoid |
| `TEXT` | Variable-length, **no limit** | Open-ended content: bios, captions, comments, article bodies |

**Rule of thumb:** if you can name a sensible max (`email ≤ 255`, `username ≤ 50`), use `VARCHAR(n)` — the cap doubles as lightweight validation and documentation. If the content is genuinely unbounded (a blog post), use `TEXT`. In Postgres, `TEXT` and an uncapped `VARCHAR` perform *identically* — `TEXT` just signals "no natural limit" more clearly.

---

## 📞 5. Why a phone number is **never** a number type

A frequent fresher mistake. `phone_number INT` is wrong for five reasons:

1. **Leading zeros vanish.** `0987654321` stored as an integer becomes `987654321` — a number has no concept of a leading zero.
2. **Formatting isn't numeric.** `+91-98765-43210` or `(415) 555-0134` aren't valid integers at all.
3. **`INT` overflows.** A 10-digit Indian mobile like `9999999999` ≈ 9.9 billion — well past `INT`'s ~2.1 billion ceiling.
4. **Even `BIGINT` doesn't fix 1 and 2** — it holds the digits but still can't keep a leading zero or a `+`/`-`.
5. **You never do arithmetic on a phone number.** You'll never "add two phone numbers." A numeric type buys you nothing.

**Store phone numbers as `VARCHAR`** (e.g. `VARCHAR(15)`, enough for `+` and the longest international number).

---

## 📅 6. Date & time types

| Type | Stores | Use it for |
|---|---|---|
| `DATE` | A calendar date, no time | Birthdates, due dates, `hired_on` |
| `TIME` | A time of day, no date | Opening hours, a daily schedule slot |
| `TIMESTAMP` | Date + time, **no timezone** | Rarely ideal — ambiguous the moment two timezones are involved |
| `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | Date + time, stored internally as **UTC** | **The correct default for `created_at` / `updated_at`** in any real app |
| `INTERVAL` | A *span* of time (`'3 days'`, `'2 hours 30 minutes'`) | Date arithmetic: `enrolled_on + INTERVAL '30 days'` |

> **Prefer `TIMESTAMPTZ` over `TIMESTAMP`** for anything recording "when something happened." Postgres stores it as UTC and converts to the client's timezone on display — this sidesteps the entire "why is this time 5 hours off" category of bugs.

Helpful defaults you'll reach for constantly:

```sql
created_at TIMESTAMPTZ DEFAULT NOW()      -- timestamp at insert time
enrolled_on DATE       DEFAULT CURRENT_DATE
```

---

## ✅ 7. Boolean

| Type | Values | Use it for |
|---|---|---|
| `BOOLEAN` | `TRUE`, `FALSE`, or `NULL` (unknown) | Any true/false flag: `is_active`, `has_paid_fees`, `is_published` |

In psql output, booleans render as `t` / `f`. They're still real `true`/`false` values — a client library like `pg` returns them as actual JS booleans; the `t`/`f` is just how the terminal prints them.

---

## 🧱 8. Postgres-specific richer types

| Type | What it is | Use it for |
|---|---|---|
| `JSON` | JSON stored as text (validated, not optimised for querying) | Rarely — `JSONB` is almost always better |
| `JSONB` | JSON stored in a parsed, **indexable binary** format | A flexible/variable-shaped blob *inside* an otherwise relational table (user preferences, a webhook payload) — SQL + a touch of NoSQL |
| `ARRAY` (`INT[]`, `TEXT[]`) | A native array column | Small simple lists that don't deserve their own table (`tags TEXT[]`). For anything joined/queried heavily, a junction table is still better |
| `UUID` | A 128-bit universally-unique identifier | Primary keys that must be **unguessable** or generated without a central counter (distributed systems). Unlike `SERIAL`, a UUID leaks no ordering or row count |
| `ENUM` (`CREATE TYPE mood AS ENUM (...)`) | A fixed, named set of allowed string values, stored compactly | A closed set of states where you want stricter-than-`CHECK` validation. Caveat: not every database supports `ENUM`; some teams prefer `VARCHAR` + `CHECK` for portability |
| `BYTEA` | Raw binary | Rare — usually store the file in blob storage and keep only its URL as `TEXT` |
| `INET` / `CIDR` | IP addresses and network ranges | Access logs, security tables |
| `MONEY` | A currency type | **Avoid** — `NUMERIC(p, 2)` is more portable and predictable |

---

## 🧭 9. Choosing a type — quick decision guide

| You're storing… | Use |
|---|---|
| A whole-number ID | `SERIAL` / `BIGSERIAL` (or `UUID` if it must be unguessable/distributed) |
| A price, balance, or any money value | `NUMERIC(p, s)` — **never** `REAL` / `FLOAT` / `MONEY` |
| A short label with a known max length | `VARCHAR(n)` |
| Long free-form text | `TEXT` |
| A phone number | `VARCHAR(15)` — never a numeric type |
| A true/false flag | `BOOLEAN` |
| A "when did this happen" timestamp | `TIMESTAMPTZ` |
| Just a calendar date | `DATE` |
| A fixed set of allowed string states | `VARCHAR` + `CHECK (x IN (...))`, or `ENUM` if cross-database portability doesn't matter |
| A flexible/variable-shaped blob | `JSONB` |
| A small simple list on one row | an array type, e.g. `TEXT[]` |

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| `CHAR` vs `VARCHAR`? | `CHAR(n)` is fixed-length and space-pads short values; `VARCHAR(n)` is variable-length and stores only what's needed |
| Why not store a phone number as `INT`? | Leading zeros are dropped, `+`/`-`/spaces aren't valid integers, and long numbers overflow `INT`'s ~2.1 billion range — and you never do math on it |
| Why not use `FLOAT`/`REAL` for money? | Binary floating point can't represent `0.1 + 0.2` exactly — use `NUMERIC(p, s)` for exact decimal math |
| What is `SERIAL`? | An `INT` column plus an auto-incrementing sequence that supplies `1, 2, 3, …` on insert |
| `TIMESTAMP` vs `TIMESTAMPTZ`? | `TIMESTAMPTZ` stores as UTC and converts on display; plain `TIMESTAMP` has no timezone and is ambiguous across zones |
| When would you use `JSONB`? | To store a flexible/variable-shaped blob inside an otherwise relational table, while keeping it queryable and indexable |

---

**Next up:** [03-DDL-Constraints-Alter-Drop.md](03-DDL-Constraints-Alter-Drop.md) — every constraint in depth, plus `ALTER TABLE`, `DROP`, `TRUNCATE`, and sequences.
