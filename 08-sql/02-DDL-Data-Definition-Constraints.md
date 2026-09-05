# DDL — Data Definition Language (Structure)
## CREATE, ALTER, and Every Constraint Explained

> Previous: [01-Why-Databases-Exist-SQL-vs-NoSQL.md](01-Why-Databases-Exist-SQL-vs-NoSQL.md)

---

**DDL = Data Definition Language.** It defines or changes the *structure* of the database — table shapes, columns, constraints. `CREATE` defines a structure for the first time; `ALTER` changes/redefines it later.

## Naming conventions (important, and easy to get wrong)
- SQL identifiers are **case-insensitive by default** and Postgres **lowercases unquoted identifiers automatically**. If you write `CREATE TABLE Students`, Postgres silently stores it as `students`.
- If you truly need a capitalized/mixed-case name, wrap it in double quotes: `"Students"` — otherwise avoid this; it causes confusing bugs later.
- You **cannot** use single quotes (`'...'`) for naming identifiers — that syntax is reserved for string *values*, not identifiers, and will throw an error.
- Convention in SQL: **snake_case** (`first_name`, `created_at`) — not kebab-case (`first-name`) and not camelCase.
- Comments in SQL use `--` for a single line.

## Creating a table with realistic constraints
```sql
DROP TABLE IF EXISTS students;

CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,        -- auto-incrementing integer, uniquely identifies each row
    first_name VARCHAR(50) NOT NULL,      -- cannot be empty
    last_name VARCHAR(50),                -- nullable: some people have only one name
    email VARCHAR(100) UNIQUE NOT NULL,   -- must be unique across all rows, and required
    phone_number CHAR(10) UNIQUE,         -- fixed-length string
    age INT CHECK (age > 12),             -- validation rule enforced on every insert/update
    current_status VARCHAR(20) DEFAULT 'active'
        CHECK (current_status IN ('active', 'graduated', 'dropped_out', 'on_leave')),
    masterji_handle VARCHAR(50) UNIQUE,
    has_joined_masterji BOOLEAN DEFAULT FALSE,
    current_score NUMERIC(5, 2) CHECK (current_score >= 0 AND current_score <= 100),
    enrollment_date DATE DEFAULT CURRENT_DATE
);
```

## Breaking down every constraint (the "why", not just the syntax)
- **`SERIAL PRIMARY KEY`**: `SERIAL` is not really a separate type — it's an `INT` that Postgres auto-increments by 1 starting from 1, on every insert. `PRIMARY KEY` on top of that marks the column as the constraint used to uniquely identify a row (get used heavily when joining tables) — it can **never be NULL** and **never be duplicated**.
  - **Important, non-obvious fact**: once a row is deleted, its ID is **never reused** — even for "the same" real-world entity coming back later. If student ID 4 is deleted and that same human re-registers, they get a brand-new ID (e.g., 47), never 4 again. As far as the database is concerned, this is a completely new row. This auto-increment behavior is powered by what Postgres calls a **sequence**.
- **`VARCHAR(n)`**: variable-length string, capped at `n` **bytes** (roughly n characters for ASCII). Postgres does **not** pad or reserve unused space — `VARCHAR(50)` storing `"Sam"` uses only as much space as `"Sam"` needs.
- **`CHAR(n)`**: fixed-length string. Unlike `VARCHAR`, Postgres **pads the value with trailing spaces** up to length `n`. `CHAR(10)` storing `'ABC'` is actually stored as `'ABC       '` (padded to 10 chars). This is why phone numbers, fixed codes, etc. sometimes use `CHAR`, but in practice `VARCHAR` is usually the safer default because it doesn't waste space or introduce trailing-space bugs in comparisons.
- **`NOT NULL`**: by default, *any* column that doesn't get a value on insert is `NULL` (empty/unknown) unless you say otherwise. `NOT NULL` makes the field mandatory.
- **`UNIQUE`**: no two rows may share the same value in this column (e.g., you can't register the same email twice).
- **`CHECK (condition)`**: a column-level validation rule; the database will **reject** any insert/update that violates it. Example: `age INT CHECK (age > 12)` throws an error if you try to insert `age = 5`.
- **`DEFAULT value`**: if no value is provided on insert, use this instead of `NULL`. `CURRENT_DATE` / `CURRENT_TIMESTAMP` are reserved keywords that auto-fill the current date/time (stored in UTC internally).
- **Why phone numbers should *never* be an integer type** (a common fresher mistake):
  1. Leading zeros are silently dropped by integer types (`0987654321` → stored as `987654321`) — an integer *is a number*, and numbers don't have "leading zeros."
  2. Some countries format numbers with hyphens (`987-654-321`) — not a valid integer at all.
  3. `INT` is a signed 4-byte integer in Postgres → max value ≈ 2^31 ≈ 2.1 billion. A 10-digit Indian phone number like `9999999999` (≈9.9 billion) **overflows** a regular `INT`.
  4. Even `BIGINT` (8 bytes, up to 2^63 ≈ 9.2 quintillion) *could* technically hold the digits, but it still can't handle leading zeros or hyphens.
  5. You never do arithmetic on a phone number (you'd never "add two phone numbers"), so there's no benefit to a numeric type — it's just a fixed-format string. **Conclusion: always store phone numbers as `VARCHAR`.**
- **Byte-size cheat sheet** (this is the "why" behind choosing data types, not just memorizing them):

| Type | Storage size | Approx. range |
|---|---|---|
| `INT` | 4 bytes (32 bits) | ±2.1 billion (2³¹) — **signed**, so half positive, half negative |
| `BIGINT` | 8 bytes (64 bits) | ±9.2 quintillion (2⁶³) |
| `VARCHAR(n)` | ~n bytes (variable, no padding) | up to n characters |
| `CHAR(n)` | exactly n bytes (padded with spaces) | exactly n characters |

  - `1 byte = 8 bits`. This is why `VARCHAR(50)` is described as "50 bytes of allocatable space" — if you don't define a size limit at all, Postgres will allow the column to use effectively unlimited space (up to Postgres's internal limits).

> For the *complete* data types catalogue (numeric, date/time, JSON, arrays, UUID, ENUM, etc.) with a full decision guide, see [11-PostgreSQL-Data-Types-Reference.md](11-PostgreSQL-Data-Types-Reference.md).

## Altering an existing table (DDL isn't just `CREATE`)
```sql
-- Add a new column after the table already exists
ALTER TABLE students
ADD COLUMN batch_name VARCHAR(50) DEFAULT 'Web Dev 2026';

-- Add a CHECK constraint after the fact
ALTER TABLE submissions
ADD CONSTRAINT check_link_format CHECK (submission_link LIKE 'http%');

-- Remove a constraint
ALTER TABLE submissions DROP CONSTRAINT check_link_format;
```
`ALTER` means either adding or removing structure from an already-created table — you use it constantly as requirements evolve (e.g., "oops, we forgot a `batch_name` column").

## DDL cheat sheet
| Constraint | Purpose |
|---|---|
| `PRIMARY KEY` | Uniquely identifies each row; never NULL, never duplicated |
| `FOREIGN KEY` / `REFERENCES` | Links a row to a row in another table |
| `CHECK` | Validates a rule on the column's value |
| `UNIQUE` | Disallows duplicate values in the column |
| `NOT NULL` | Makes the field mandatory |
| `DEFAULT` | Auto-fills a value when none is provided |

---

**Next up:** [03-DML-DQL-Insert-Update-Delete-Select.md](03-DML-DQL-Insert-Update-Delete-Select.md) — reading and writing row-level data.
