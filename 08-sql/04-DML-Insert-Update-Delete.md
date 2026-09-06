# DML — Writing Row Data
## Part 4 of 19 — `INSERT`, `UPDATE`, `DELETE`, `RETURNING` & Upserts

> Previous: [03-DDL-Constraints-Alter-Drop.md](03-DDL-Constraints-Alter-Drop.md)

---

## 📌 Executive Summary

- **DML = Data Manipulation Language.** It changes the *rows* inside a table — the write side of CRUD. It never touches structure (that's DDL).
- **`INSERT`** adds rows. You can insert one row, many rows in a single statement (faster — one round trip), or the *result of a query* (`INSERT ... SELECT`).
- **`UPDATE`** and **`DELETE`** without a `WHERE` clause hit **every row in the table**. This is the single most common catastrophic SQL mistake. Always dry-run the `WHERE` as a `SELECT` first.
- Postgres replies to a write with a **count, not data**: `INSERT 0 3`, `UPDATE 1`, `DELETE 0`. `DELETE 0` / `UPDATE 0` means "matched nothing" — not an error, but a signal to check your `WHERE`.
- **`RETURNING`** hands back the affected rows (including auto-generated IDs) in the same round trip — no follow-up `SELECT` needed. Works on `INSERT`, `UPDATE`, and `DELETE`.
- **`INSERT ... ON CONFLICT`** ("upsert") turns a would-be unique-violation into an update of the existing row instead — insert-or-update in one atomic statement.

---

## 🧠 Core Analogy: Editing Rows in a Shared Spreadsheet

- **`INSERT`** = adding a new row at the bottom.
- **`UPDATE ... WHERE`** = selecting specific rows with a filter, then typing a new value into a column for just those.
- **`UPDATE`** with no filter = selecting the *entire column* and overwriting every cell. Occasionally what you want. Usually a disaster.
- **`DELETE ... WHERE`** = filtering to some rows and hitting delete-row.
- **`RETURNING`** = the spreadsheet showing you exactly which rows it just changed, with their final values, instead of you scrolling to find them.

The difference from a spreadsheet: there's no visible undo button. Your `WHERE` clause *is* the safety mechanism.

---

## ✍️ 1. `INSERT` — the C in CRUD

Uses a small self-contained table for clarity:

```sql
CREATE TABLE canteen_menu (
    item_id      SERIAL PRIMARY KEY,
    item_name    VARCHAR(100),
    category     VARCHAR(50),
    price        INT,
    is_available BOOLEAN DEFAULT TRUE
);
```

### One row

```sql
-- No need to supply item_id — SERIAL fills it automatically
INSERT INTO canteen_menu (item_name, category, price)
VALUES ('Vada Pav', 'Snacks', 15);
```
```text
INSERT 0 1
```
> The reply is `INSERT <oid> <rows>`. `oid` is a legacy field, almost always `0` now. The second number is the rows actually inserted — this is what `pg`'s `result.rowCount` gives you.

### Many rows in one statement

```sql
INSERT INTO canteen_menu (item_name, category, price) VALUES
('Masala Chai',  'Beverages', 10),
('Samosa',       'Snacks',    12),
('Rajma Chawal', 'Meals',     60);
```
```text
INSERT 0 3
```

> **Always batch.** Three rows in one `INSERT` is a *single* network round trip; three separate `INSERT`s are three. On a local database that's invisible; against a managed cloud database, each round trip costs 1–5 ms of latency, so a loop of 1,000 single-row inserts can turn a sub-second job into several seconds. (More in [16](16-Query-Optimization-Playbook.md).)

### Columns you omit fall back to `DEFAULT` or `NULL`

```sql
SELECT * FROM canteen_menu;
```
```text
 item_id |  item_name   | category  | price | is_available
---------+--------------+-----------+-------+--------------
       1 | Vada Pav     | Snacks    |    15 | t
       2 | Masala Chai  | Beverages |    10 | t
       3 | Samosa       | Snacks    |    12 | t
       4 | Rajma Chawal | Meals     |    60 | t
(4 rows)
```
> `is_available` was never supplied, so every row got its `DEFAULT TRUE` (shown as `t` in psql).

### `INSERT ... SELECT` — insert the result of a query

You don't have to hand-type values. You can insert rows *produced by a query* — copying or transforming data from other tables.

```sql
-- (campus dataset) Fill high_scorers_report with every above-average score
INSERT INTO high_scorers_report (student_id, student_name, subject, score)
SELECT s.student_id, s.name, e.subject, e.score
FROM exam_scores AS e
JOIN students AS s ON s.student_id = e.student_id
WHERE e.score > (SELECT AVG(score) FROM exam_scores);
```
```text
INSERT 0 5
```

The rules:

1. **No `VALUES` keyword** — the `SELECT` replaces it entirely.
2. **Column positions must line up.** The Nth column in the `INSERT` list receives the Nth column the `SELECT` produces, and the types must be compatible. Swap two same-typed columns by accident and the insert still *runs* — you just get a silent data bug (names in the `subject` column).
3. The `SELECT` can be arbitrarily complex — joins, `WHERE`, its own subqueries. Full treatment in [08 §4](08-Subqueries.md).

---

## 🔧 2. `UPDATE` — the U in CRUD

```sql
-- CRITICAL: without WHERE, this sets EVERY row's price to 20.
UPDATE canteen_menu
SET price = 20
WHERE item_name = 'Vada Pav';
```
```text
UPDATE 1
```
> The reply is just `UPDATE <rows_affected>` — no result set. That count is what you'd check in app code (`result.rowCount`) to confirm something actually changed.

### Compute from the existing value

```sql
UPDATE canteen_menu
SET price = price - 5              -- reference the current value in the same statement
WHERE category = 'Beverages';
```
```text
UPDATE 1
```

### Several columns at once

```sql
UPDATE canteen_menu
SET is_available = FALSE, price = 10
WHERE item_name = 'Samosa';
```
```text
UPDATE 1
```

You can target rows by **any** column, not just the primary key — `WHERE item_id = 3` and `WHERE item_name = 'Samosa'` are equally valid filters.

---

## 🗑️ 3. `DELETE` — the D in CRUD

```sql
-- CRITICAL: always use WHERE.
DELETE FROM canteen_menu WHERE item_name = 'Cold Coffee';
```
```text
DELETE 0
```
> `DELETE 0` = the `WHERE` matched **zero rows**. Nothing broke; nothing was deleted. `DELETE`/`UPDATE` never error just because no row matched — always check the returned count.

```sql
-- THE DANGER ZONE — no WHERE wipes the whole table:
-- DELETE FROM canteen_menu;
-- → DELETE 4   (every row gone)
```

- For removing *all* rows fast, `TRUNCATE` is better (see [03 §9](03-DDL-Constraints-Alter-Drop.md)) — but `TRUNCATE` can't be filtered and doesn't fire row triggers.
- `DELETE` inside a transaction can be rolled back (see [15](15-Transactions-ACID-Locking.md)).

---

## 🛟 4. The dry-run habit (do this every time)

Before any `UPDATE` or `DELETE`, run the identical `WHERE` as a `SELECT` and eyeball the rows:

```sql
-- 1. Dry run — exactly which rows will be hit?
SELECT * FROM canteen_menu WHERE category = 'Snacks' AND price < 15;

-- 2. Only once that looks right, run the real mutation:
UPDATE canteen_menu SET is_available = FALSE
WHERE category = 'Snacks' AND price < 15;
```

In `psql` you can go further and wrap it in a transaction you can abort:

```sql
BEGIN;
DELETE FROM canteen_menu WHERE category = 'Snacks';
SELECT * FROM canteen_menu;   -- inspect the aftermath
ROLLBACK;                     -- ...or COMMIT if it's correct
```

---

## 📤 5. `RETURNING` — get the affected rows back

Without `RETURNING`, an `INSERT` tells you only `INSERT 0 1` — you don't know the auto-generated `item_id` without a second query.

```sql
INSERT INTO canteen_menu (item_name, category, price)
VALUES ('Filter Coffee', 'Beverages', 25)
RETURNING item_id, item_name, is_available;
```
```text
 item_id |  item_name    | is_available
---------+---------------+--------------
       5 | Filter Coffee | t
(1 row)
```
> This is exactly what an API handler needs — insert the row, get its new ID back in the same round trip, send it to the client.

`RETURNING` works on `UPDATE` and `DELETE` too:

```sql
UPDATE canteen_menu SET price = price + 5 WHERE category = 'Snacks'
RETURNING item_name, price;

DELETE FROM canteen_menu WHERE is_available = FALSE
RETURNING *;          -- see everything you just deleted (handy for audit logs)
```

---

## 🔁 6. `INSERT ... ON CONFLICT` — upsert (insert-or-update)

When a row with the same `UNIQUE` / `PRIMARY KEY` value already exists, a plain `INSERT` throws `23505`. `ON CONFLICT` lets you handle the collision instead.

```sql
-- (using the students table from file 02)
INSERT INTO students (email, first_name)
VALUES ('john@example.com', 'Johnny')
ON CONFLICT (email)
DO UPDATE SET first_name = EXCLUDED.first_name;
```
```text
INSERT 0 1
```
```sql
SELECT student_id, first_name, email FROM students WHERE email = 'john@example.com';
```
```text
 student_id | first_name |       email
------------+------------+-------------------
          1 | Johnny     | john@example.com
(1 row)
```

- No duplicate row was created, and no error was thrown. The existing row's `first_name` went from `'John'` to `'Johnny'`.
- **`EXCLUDED`** is a special reference to *the row you were trying to insert* before the conflict — so `EXCLUDED.first_name` is `'Johnny'`.
- To swallow the conflict and change nothing: `ON CONFLICT (email) DO NOTHING`.
- The conflict target (`(email)`) must match an actual `UNIQUE` or `PRIMARY KEY` constraint.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What does `INSERT 0 3` mean? | 0 is a legacy OID field; 3 rows were inserted |
| What's the danger with `UPDATE` / `DELETE`? | Omitting `WHERE` applies the change to every row in the table |
| Does `DELETE` with no matching rows throw an error? | No — it returns `DELETE 0`; you check the count yourself |
| How do you get an auto-generated ID back after an insert? | `INSERT ... RETURNING id` — one round trip, no follow-up `SELECT` |
| What is an upsert? | `INSERT ... ON CONFLICT (col) DO UPDATE` — insert, or update the existing row if a unique key collides |
| What does `EXCLUDED` refer to in `ON CONFLICT`? | The row that was about to be inserted before the conflict was detected |
| How do you copy rows between tables? | `INSERT INTO target (cols) SELECT ... FROM source` — no `VALUES` keyword |

---

**Next up:** [05-DQL-Select-Where-Filtering.md](05-DQL-Select-Where-Filtering.md) — reading data: `SELECT`, `WHERE`, operators, `ORDER BY`, `LIMIT`, `DISTINCT`, `LIKE`, `CASE`, and `NULL` logic.
