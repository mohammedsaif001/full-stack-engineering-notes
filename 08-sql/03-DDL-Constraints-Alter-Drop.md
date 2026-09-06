# DDL Part 2 — Constraints, ALTER, DROP & Sequences
## Part 3 of 19 — The Rules the Database Enforces, and How to Change Structure Later

> Previous: [02-DDL-Creating-Tables-Data-Types.md](02-DDL-Creating-Tables-Data-Types.md)

---

## 📌 Executive Summary

- A **constraint** is a rule the database itself enforces on every insert and update. If a write breaks the rule, the database **rejects the whole statement** — the bad data never lands. This is integrity you get for free, with no application code.
- The six you must know: **`PRIMARY KEY`** (unique row identity, never NULL), **`FOREIGN KEY`** (a value must exist in another table), **`UNIQUE`** (no duplicates in this column), **`NOT NULL`** (mandatory), **`CHECK`** (a custom true/false rule), **`DEFAULT`** (auto-fill when no value is given).
- **`ALTER TABLE`** changes a table after it exists — add/drop/rename columns, add/drop constraints, change a column's type. You use it constantly as requirements evolve.
- **`DROP`** deletes a structure (table, index, constraint, database) permanently. **`TRUNCATE`** empties every row from a table fast but keeps the structure. **`DELETE`** (a DML command, see [04](04-DML-Insert-Update-Delete.md)) removes *selected* rows and can be rolled back.
- A **sequence** is the counter behind `SERIAL`. It only ever moves forward — **a deleted ID is never reused**, so `1, 2, 4, 5` (with 3 missing) is normal and expected.
- Postgres reports constraint violations with a specific **SQLSTATE code** (`23505` unique, `23503` foreign key, `23502` not-null, `23514` check) — application code should branch on the code, not parse the message text.

---

## 🧠 Core Analogy: A Form with Validation That Won't Submit

A constraint is the web form that refuses to submit until every field is right:

- **`NOT NULL`** = the field marked with a red asterisk — you *must* fill it in.
- **`UNIQUE`** = "that email is already registered" — the form won't take a duplicate.
- **`CHECK`** = "password must be at least 8 characters" — a rule on the *value itself*.
- **`FOREIGN KEY`** = "pick your country from this list" — you can't type a country that isn't in the official list.
- **`DEFAULT`** = a field pre-filled with a sensible value you can leave as-is.
- **`PRIMARY KEY`** = the hidden, auto-generated confirmation number that uniquely identifies *this exact submission* forever.

The key point: the database is the form validator, and it **cannot be bypassed** — not by a buggy API, not by a direct `psql` connection, not by a careless script.

---

## 🔑 1. `PRIMARY KEY` — unique row identity

```sql
student_id SERIAL PRIMARY KEY
```

- Marks the column (or set of columns) that **uniquely identifies each row**. It can **never be NULL** and **never be duplicated** — the two rules are automatic.
- Used heavily in **joins** ([07](07-Joins-Combining-Tables.md)): "the internship with `student_id = 3` belongs to the student whose primary key is `3`."
- A table can have **only one** primary key — but that key can span multiple columns (a **composite key**):

```sql
CREATE TABLE follows (
    follower_id  INT REFERENCES users(user_id),
    following_id INT REFERENCES users(user_id),
    PRIMARY KEY (follower_id, following_id)   -- the PAIR must be unique
);
```
> This composite key makes "the same person following the same person twice" structurally impossible — no separate `UNIQUE` needed.

---

## 🔗 2. `FOREIGN KEY` / `REFERENCES` — a value that must exist elsewhere

A **foreign key** is a column whose value **must match** a primary key value in another table (or be `NULL`). It's the mechanism that expresses "this row *belongs to* that row."

```sql
CREATE TABLE internships (
    internship_id SERIAL PRIMARY KEY,
    student_id    INT REFERENCES students(student_id),  -- must be a real students.student_id
    company_name  VARCHAR(100),
    stipend       INT
);
```

- Inserting an internship with `student_id = 999` when no student `999` exists → rejected with a **foreign-key violation** (`23503`).
- This is how the database guarantees **referential integrity**: you can't have an internship pointing at a student who doesn't exist.

### `ON DELETE` behaviour — what happens to the child rows when the parent is deleted

```sql
student_id INT REFERENCES students(student_id) ON DELETE CASCADE
```

| Option | When you delete the parent student… |
|---|---|
| `ON DELETE RESTRICT` / `NO ACTION` (default) | The delete is **blocked** while any internship still references that student |
| `ON DELETE CASCADE` | Their internships are **automatically deleted too** |
| `ON DELETE SET NULL` | `student_id` becomes `NULL` in those internships — the record survives, just disconnected ("soft" disconnect) |

> **The database only knows rows and IDs — not humans.** If a student is deleted and the *same person* signs up again, they get a brand-new `student_id`. The old ID is gone forever. That's why `ON DELETE SET NULL` is a form of soft-deletion: the dependent data survives, orphaned.

---

## 🚫 3. `NOT NULL` — mandatory

By default, any column you don't supply a value for on `INSERT` gets `NULL` ("unknown / absent"). `NOT NULL` makes the column mandatory — an insert that omits it (and has no `DEFAULT`) is rejected (`23502`).

```sql
first_name VARCHAR(50) NOT NULL
```

> `NULL` is not `0`, not `''`, not `FALSE` — it's the *absence* of a value. This distinction drives a lot of SQL gotchas, covered in [05 §7](05-DQL-Select-Where-Filtering.md).

---

## 🎯 4. `UNIQUE` — no duplicates

No two rows may hold the same value in this column.

```sql
email VARCHAR(100) UNIQUE
```

- Attempting a second row with an existing email → **unique violation** (`23505`).
- `UNIQUE` can also span multiple columns — `UNIQUE (user_id, post_id)` means "a user may like a given post only once," while each column individually can repeat.
- **`NULL` is exempt:** Postgres allows *many* `NULL`s in a `UNIQUE` column, because `NULL` ≠ `NULL` (two unknowns aren't "equal").

---

## ✔️ 5. `CHECK` — a custom rule on the value

A boolean expression the database evaluates on every write. `FALSE` → the write is rejected (`23514`).

```sql
age           INT CHECK (age > 12),
current_score NUMERIC(5, 2) CHECK (current_score >= 0 AND current_score <= 100),
current_status VARCHAR(20) CHECK (current_status IN ('active', 'graduated', 'dropped_out', 'on_leave'))
```

- `CHECK (col IN (...))` is the portable way to constrain a column to a fixed set of values without an `ENUM` type.
- A `CHECK` can be **named** so error messages and later `ALTER` statements can refer to it:

```sql
CONSTRAINT score_in_range CHECK (current_score BETWEEN 0 AND 100)
```

---

## 🩹 6. `DEFAULT` — auto-fill when no value is supplied

```sql
current_status VARCHAR(20) DEFAULT 'active',
has_paid_fees  BOOLEAN     DEFAULT FALSE,
enrolled_on    DATE        DEFAULT CURRENT_DATE,
created_at     TIMESTAMPTZ DEFAULT NOW()
```

`DEFAULT` applies **only when the column is omitted entirely** from the `INSERT`. It does **not** fire if you explicitly pass `NULL` — that's a deliberate NULL, which is a different thing from "no value given."

`DEFAULT` has three other uses beyond table definitions:

```sql
-- Explicitly request the default on insert
INSERT INTO students (first_name, current_status) VALUES ('Ravi', DEFAULT);

-- Reset an existing row's column back to its default
UPDATE students SET current_status = DEFAULT WHERE student_id = 4;

-- Change a column's default later
ALTER TABLE students ALTER COLUMN current_status SET DEFAULT 'active';
ALTER TABLE students ALTER COLUMN current_status DROP DEFAULT;
```

---

## 👀 7. Watching constraints fire (Postgres's real error output)

```sql
INSERT INTO students (first_name, email, age) VALUES ('John', 'john@example.com', 22);
```
```text
INSERT 0 1
```

```sql
-- Violating CHECK (age > 12):
INSERT INTO students (first_name, email, age) VALUES ('Baby', 'baby@example.com', 5);
```
```text
ERROR:  new row for relation "students" violates check constraint "students_age_check"
DETAIL:  Failing row contains (2, Baby, null, baby@example.com, null, 5, active, null, f, 2026-09-05).
```

```sql
-- Violating UNIQUE (email already exists):
INSERT INTO students (first_name, email, age) VALUES ('Johnny', 'john@example.com', 25);
```
```text
ERROR:  duplicate key value violates unique constraint "students_email_key"
DETAIL:  Key (email)=(john@example.com) already exists.
```

```sql
-- Violating NOT NULL (first_name omitted, no default):
INSERT INTO students (email, age) VALUES ('noname@example.com', 20);
```
```text
ERROR:  null value in column "first_name" of relation "students" violates not-null constraint
```

| Violation | SQLSTATE code | Catch it in app code by |
|---|---|---|
| Unique | `23505` | `err.code === '23505'` |
| Foreign key | `23503` | `err.code === '23503'` |
| Not-null | `23502` | `err.code === '23502'` |
| Check | `23514` | `err.code === '23514'` |

> **Never parse the message string** — Postgres phrasing changes between versions and locales. Branch on `err.code`.

---

## 🔧 8. `ALTER TABLE` — changing structure after the fact

`ALTER TABLE` is how a schema evolves. You'll run these constantly ("oops, we forgot a `batch_name` column", "this `VARCHAR(20)` is too small now").

### Columns

```sql
-- Add a column (existing rows get the DEFAULT, or NULL if none)
ALTER TABLE students ADD COLUMN batch_name VARCHAR(50) DEFAULT 'Web Dev 2026';

-- Drop a column (its data is gone permanently)
ALTER TABLE students DROP COLUMN batch_name;

-- Rename a column
ALTER TABLE students RENAME COLUMN phone_number TO contact_number;

-- Change a column's type (must be a compatible conversion, or provide USING)
ALTER TABLE students ALTER COLUMN age TYPE SMALLINT;
ALTER TABLE students ALTER COLUMN current_score TYPE NUMERIC(6, 2);

-- Make a column mandatory / optional
ALTER TABLE students ALTER COLUMN last_name SET NOT NULL;   -- fails if any existing row is NULL there
ALTER TABLE students ALTER COLUMN last_name DROP NOT NULL;
```

```text
ALTER TABLE
```

> Adding `ADD COLUMN ... DEFAULT ...` **back-fills every existing row** with the default in the same statement — the old `John` row instantly has `batch_name = 'Web Dev 2026'`.

### Constraints

```sql
-- Add a CHECK after the fact
ALTER TABLE submissions
    ADD CONSTRAINT check_link_format CHECK (submission_link LIKE 'http%');

-- Add a UNIQUE constraint
ALTER TABLE students ADD CONSTRAINT uq_students_email UNIQUE (email);

-- Add a FOREIGN KEY
ALTER TABLE internships
    ADD CONSTRAINT fk_internships_student
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;

-- Remove a constraint (by name)
ALTER TABLE submissions DROP CONSTRAINT check_link_format;
```

> If any **existing** row would violate a constraint you're adding, the `ALTER` itself fails — Postgres validates all current data before accepting the new rule. You must clean the data first (see the "find duplicates" pattern in [17](17-Interview-Query-Patterns.md)).

### The whole table

```sql
ALTER TABLE students RENAME TO enrolled_students;
```

---

## 🗑️ 9. `DROP` vs `TRUNCATE` vs `DELETE`

| | `DROP TABLE` | `TRUNCATE` | `DELETE` |
|---|---|---|---|
| **Sub-language** | DDL | DDL | DML ([04](04-DML-Insert-Update-Delete.md)) |
| **What it removes** | The **entire table** — structure *and* rows | **All rows**, keeps the structure | **Selected rows** (`WHERE`), or all if no `WHERE` |
| **Speed on a big table** | Instant | Very fast (doesn't scan rows) | Slower (processes row by row) |
| **`WHERE` filter?** | No | No | **Yes** |
| **Rollback-able?** | In Postgres, yes *inside a transaction*; but treat as permanent | Yes, inside a transaction | Yes, inside a transaction |
| **Resets `SERIAL` counter?** | N/A (table's gone) | Optionally — `TRUNCATE ... RESTART IDENTITY` | No |
| **Fires row triggers?** | No | No (unless `... CASCADE`-style trigger config) | Yes |

```sql
DROP TABLE IF EXISTS students;                 -- table no longer exists at all
TRUNCATE TABLE students;                        -- table still exists, 0 rows
TRUNCATE TABLE students RESTART IDENTITY;       -- also resets the id sequence back to 1
DELETE FROM students WHERE current_status = 'dropped_out';   -- only some rows
```

```sql
DROP INDEX IF EXISTS idx_students_email;        -- drop an index (see file 14)
DROP DATABASE IF EXISTS old_db;                 -- drop a whole database (must not be connected to it)
```

- **`DROP` and `TRUNCATE` are not "big DELETE."** Reach for them when you truly want the structure gone (`DROP`) or a fast full wipe of a scratch/staging table (`TRUNCATE`).
- **Always dry-run a `DELETE`** — run the matching `SELECT ... WHERE ...` first to confirm exactly which rows will go. More on that in [04](04-DML-Insert-Update-Delete.md).

---

## 🔢 10. Sequences — the counter behind `SERIAL`

When you write `student_id SERIAL PRIMARY KEY`, Postgres quietly creates a **sequence** object (named `students_student_id_seq`) that hands out the next integer on each insert.

Key facts:

- **A sequence only moves forward.** Delete row `3` and the next insert still gets `4`, never `3`. Gaps in an ID column are **normal** — don't try to "fill" them.
- **A rolled-back transaction still consumes IDs.** If an insert inside a transaction grabs id `10` and the transaction then rolls back, id `10` is burned — the next successful insert gets `11`. Sequences are deliberately *not* transactional, so concurrent inserters never block each other waiting for an id.
- Inspect / control it:

```sql
SELECT last_value FROM students_student_id_seq;   -- current position
SELECT nextval('students_student_id_seq');        -- consume and return the next value
ALTER SEQUENCE students_student_id_seq RESTART WITH 1000;   -- e.g. after a bulk import
```

- The modern SQL-standard equivalent of `SERIAL` is `GENERATED ALWAYS AS IDENTITY`:

```sql
student_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```
Behaves the same; it's the newer spelling. `SERIAL` remains extremely common in existing codebases.

---

## 📋 Constraint cheat sheet

| Constraint | Purpose | Violation code |
|---|---|---|
| `PRIMARY KEY` | Unique row identity; never NULL, never duplicated; one per table | `23505` |
| `FOREIGN KEY` / `REFERENCES` | Value must exist in another table's PK (or be NULL) | `23503` |
| `UNIQUE` | No duplicate values in this column (or column set) | `23505` |
| `NOT NULL` | Column is mandatory | `23502` |
| `CHECK (cond)` | Custom boolean rule on the value | `23514` |
| `DEFAULT val` | Auto-fill when the column is omitted on insert | — |

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What is a primary key? | A column (or column set) that uniquely identifies each row — never NULL, never duplicated |
| What is a foreign key? | A column whose value must reference a primary key in another table, enforcing referential integrity |
| `DELETE` vs `TRUNCATE` vs `DROP`? | `DELETE` removes selected rows (has `WHERE`, DML); `TRUNCATE` fast-wipes all rows keeping the table (DDL); `DROP` removes the table entirely |
| Why are there gaps in my `SERIAL` id column? | The sequence only moves forward — deleted or rolled-back IDs are never reused |
| Can you add a `NOT NULL` column to a table with existing rows? | Only if you provide a `DEFAULT`, or every existing row already has a value for it |
| What happens to child rows on `ON DELETE CASCADE`? | Deleting the parent row automatically deletes all rows that reference it |
| How should application code detect a unique-constraint violation? | Check the error's SQLSTATE `code` (`23505`), never parse the message string |

---

**Next up:** [04-DML-Insert-Update-Delete.md](04-DML-Insert-Update-Delete.md) — writing row data safely: `INSERT`, `UPDATE`, `DELETE`, `RETURNING`, and upserts.
