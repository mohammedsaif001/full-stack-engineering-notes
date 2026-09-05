# Complete SQL Command & Clause Reference
## Every Keyword, What It Does, When to Use It

> Previous: [08-Schema-Design-Normalization.md](08-Schema-Design-Normalization.md)

---

This file exists to close every gap — every clause and keyword you'll realistically touch in Postgres, in one place, including the ones earlier files used without a full standalone explanation (`DEFAULT`, `DISTINCT`, `ORDER BY`, `EXISTS`, `UNION`, subqueries, `CASE`, and more).

## Clause Execution Order

SQL clauses must be **written** in this order, but they don't **execute** in this order — knowing the real execution order explains *why* `WHERE` can't filter on aggregates but `HAVING` can, and why an alias defined in `SELECT` can't be used in `WHERE`.

```sql
SELECT   [DISTINCT] column_list        -- 5th to execute (aliases created here)
FROM     table                         -- 1st to execute
JOIN     other_table ON ...            -- 2nd to execute
WHERE    row_condition                 -- 3rd to execute (before grouping — no aggregates allowed)
GROUP BY column_list                   -- 4th to execute
HAVING   group_condition               -- 5th to execute (after grouping — aggregates allowed)
ORDER BY column_list                   -- 6th to execute (can use SELECT aliases)
LIMIT    n OFFSET m;                   -- 7th, last to execute
```
| Written order | `SELECT` → `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `ORDER BY` → `LIMIT` |
|---|---|
| **Actual execution order** | `FROM/JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT` |

## `DEFAULT` — filling in values automatically

Already introduced in DDL, but it has more uses than just table definitions:
```sql
-- 1. As a column definition:
current_status VARCHAR(20) DEFAULT 'active'

-- 2. Explicitly requesting the default value on insert (rarely needed, but valid):
INSERT INTO students (first_name, current_status) VALUES ('Ravi', DEFAULT);

-- 3. Resetting a column back to its default value for existing rows:
UPDATE students SET current_status = DEFAULT WHERE student_id = 4;

-- 4. Common default-value patterns:
created_at TIMESTAMP DEFAULT NOW()          -- current timestamp at insert time
is_active  BOOLEAN   DEFAULT TRUE           -- assume active unless told otherwise
role       VARCHAR(20) DEFAULT 'user'       -- fallback role
```
`DEFAULT` only applies **when no value is supplied at all** for that column on `INSERT` — it does not apply if you explicitly pass `NULL` (that's a deliberate NULL, not "no value").

## `DISTINCT`

Deep dive — not just "unique values" (using the `ipl_players` dataset seeded in [03-DML-DQL-Insert-Update-Delete-Select.md](03-DML-DQL-Insert-Update-Delete-Select.md)):
```sql
-- Multiple columns — unique COMBINATIONS of (team, role), not unique per-column
SELECT DISTINCT team, role FROM ipl_players ORDER BY team;
```
```text
      team       |     role
------------------+---------------
                  | Batsman
 CSK              | Wicketkeeper
 Gujarat Titans   | Bowler
 KKR              | All-Rounder
 KKR              | Batsman
 LSG              | Batsman
 Mumbai Indians   | All-Rounder
 Mumbai Indians   | Batsman
 Mumbai Indians   | Bowler
 RCB              | Batsman
(10 rows)
```
> `Mumbai Indians` appears 3 times here — once per distinct **role** found on that team (Batsman, Bowler, All-Rounder) — because `DISTINCT` on multiple columns dedupes the *pair*, not each column separately.

```sql
-- DISTINCT ON (Postgres-specific): one row per group, keeping the "first" row
-- per your ORDER BY — e.g., the highest-paid player per team:
SELECT DISTINCT ON (team) team, name, auction_price_crores
FROM ipl_players
ORDER BY team, auction_price_crores DESC;
```
```text
      team       |      name       | auction_price_crores
------------------+-----------------+-----------------------
                  | Mystery Player  |                  1.00
 CSK              | MS Dhoni        |                 12.00
 Gujarat Titans   | Rashid Khan     |                 15.00
 KKR              | Sunil Narine    |                  8.50
 LSG              | Kane Williamson |                 11.00
 Mumbai Indians   | Rohit Sharma    |                 16.00
 RCB              | Virat Kohli     |                 15.00
(7 rows)
```
> Exactly **one row per team** — the highest-priced player, because `DISTINCT ON (team)` keeps only the first row Postgres sees per `team` group, and `ORDER BY team, auction_price_crores DESC` makes sure that "first row" is the most expensive one.

```sql
-- COUNT(DISTINCT ...) — count of unique values, not unique rows
SELECT COUNT(DISTINCT team) AS total_teams FROM ipl_players;
```
```text
 total_teams
-------------
           6
(1 row)
```
> 6, not 7 — `NULL` (Mystery Player's team) is **never counted** by `COUNT(DISTINCT ...)`, since `NULL` represents "unknown," not a real distinct value.
- **Common mistake**: `SELECT DISTINCT team, role` does **not** give you unique teams *and* unique roles separately — it gives unique **pairs**. If you need one list per column, run two separate queries.
- **`DISTINCT ON (col)`** is Postgres-only (not standard SQL) but extremely useful for "top-1-per-group" queries without a window function.

## Every comparison & logical operator

| Operator | Meaning | Example |
|---|---|---|
| `=` | Equal to | `WHERE team = 'CSK'` |
| `!=` or `<>` | Not equal to | `WHERE team <> 'CSK'` |
| `>`, `<`, `>=`, `<=` | Greater/less than (or equal) | `WHERE age >= 18` |
| `BETWEEN a AND b` | Inclusive range | `WHERE price BETWEEN 10 AND 20` |
| `IN (list)` | Value exists in a list | `WHERE team IN ('CSK', 'RCB')` |
| `NOT IN (list)` | Value does not exist in a list | `WHERE team NOT IN ('CSK', 'RCB')` |
| `LIKE` / `ILIKE` | Pattern match (case-sensitive / insensitive) | `WHERE name LIKE 'R%'` |
| `IS NULL` / `IS NOT NULL` | NULL check (never use `= NULL`) | `WHERE team IS NULL` |
| `AND`, `OR`, `NOT` | Logical combinators | `WHERE a AND (b OR c)` |
| `EXISTS` / `NOT EXISTS` | True if a subquery returns any row | see Subqueries below |
| `ANY` / `ALL` | Compare against every value a subquery returns | see Subqueries below |

## `CASE` — conditional logic inside a query (SQL's if/else)
```sql
SELECT name, auction_price_crores,
  CASE
    WHEN auction_price_crores >= 15 THEN 'Marquee'
    WHEN auction_price_crores >= 8  THEN 'Mid-tier'
    ELSE 'Budget'
  END AS price_tier
FROM ipl_players
ORDER BY auction_price_crores DESC;
```
```text
       name       | auction_price_crores | price_tier
-------------------+-----------------------+------------
 Rohit Sharma      |                 16.00 | Marquee
 Virat Kohli       |                 15.00 | Marquee
 Hardik Pandya     |                 15.00 | Marquee
 Rashid Khan       |                 15.00 | Marquee
 MS Dhoni          |                 12.00 | Mid-tier
 Jasprit Bumrah    |                 12.00 | Mid-tier
 Kane Williamson   |                 11.00 | Mid-tier
 Sunil Narine      |                  8.50 | Mid-tier
 Mystery Player    |                  1.00 | Budget
 Rinku Singh       |                  0.55 | Budget
 Arjun Tendulkar   |                  0.30 | Budget
(11 rows)
```

```sql
-- CASE inside an aggregate — conditional counting ("pivot"-style summary)
SELECT
  COUNT(CASE WHEN role = 'Batsman' THEN 1 END) AS batsmen,
  COUNT(CASE WHEN role = 'Bowler'  THEN 1 END) AS bowlers
FROM ipl_players;
```
```text
 batsmen | bowlers
---------+---------
       5 |       3
(1 row)
```
> This is the trick behind `CASE` inside `COUNT()`: when the condition is false, `CASE` returns `NULL` (there's no `ELSE`), and `COUNT()` **never counts `NULL`s** — so each `COUNT(CASE WHEN ...)` effectively counts only the rows matching that one condition, letting you compute several conditional counts side-by-side in a single pass over the table.

`CASE` is how you express "if this, then that" logic *inside* SQL, either as a computed column or bucketed inside an aggregate.

## Combining result sets: `UNION`, `UNION ALL`, `INTERSECT`, `EXCEPT`
```sql
-- UNION: combines rows from two queries, removing duplicates (slower, extra dedup work)
SELECT name FROM ipl_players WHERE team = 'CSK'
UNION
SELECT name FROM ipl_players WHERE role = 'Bowler';
```
```text
      name
------------------
 MS Dhoni
 Jasprit Bumrah
 Rashid Khan
 Arjun Tendulkar
(4 rows)
```
> `MS Dhoni` (CSK) and the three bowlers are combined into one flat list — since no player is *both* on CSK *and* a Bowler here, there's nothing for `UNION` to actually deduplicate in this particular case.

```sql
-- INTERSECT: only rows present in BOTH queries
SELECT name FROM ipl_players WHERE team = 'CSK'
INTERSECT
SELECT name FROM ipl_players WHERE role = 'Batsman';
```
```text
 name
------
(0 rows)
```
> Zero rows — because `MS Dhoni` (the only CSK player) has `role = 'Wicketkeeper'`, not `'Batsman'`, so no name satisfies *both* conditions at once.

```sql
-- EXCEPT: rows in the first query that are NOT in the second
SELECT name FROM ipl_players WHERE role = 'Batsman'
EXCEPT
SELECT name FROM ipl_players WHERE team = 'RCB';
```
```text
      name
-----------------
 Rohit Sharma
 Rinku Singh
 Kane Williamson
 Mystery Player
(4 rows)
```
> Every Batsman **except** the one on RCB (`Virat Kohli` is subtracted out) — `EXCEPT` is set-subtraction: "everything in query 1, minus anything that also appears in query 2."

Rule: all queries being combined must return the **same number of columns**, with compatible types.

## Subqueries — a query inside a query
```sql
-- Subquery in WHERE: players priced above the average price
SELECT name, auction_price_crores FROM ipl_players
WHERE auction_price_crores > (SELECT AVG(auction_price_crores) FROM ipl_players);
```
```text
      name       | auction_price_crores
------------------+-----------------------
 Virat Kohli      |                 15.00
 MS Dhoni         |                 12.00
 Jasprit Bumrah   |                 12.00
 Hardik Pandya    |                 15.00
 Rohit Sharma     |                 16.00
 Rashid Khan      |                 15.00
 Kane Williamson  |                 11.00
(7 rows)
```
> The inner query `(SELECT AVG(auction_price_crores) FROM ipl_players)` computes roughly `9.29` first — then the outer query filters against that single number. This runs the aggregate exactly once, not once per row.

```sql
-- EXISTS: players who have at least one internship (semantically like an INNER JOIN,
-- but often faster because it can stop at the FIRST match instead of joining all matches)
SELECT s.name FROM students s
WHERE EXISTS (SELECT 1 FROM internships i WHERE i.student_id = s.student_id);
```
```text
 name
-------
 Rahul
 Sneha
 Amit
(3 rows)
```
> Compare this to the `INNER JOIN` version in [05-Joins-Combining-Tables.md](05-Joins-Combining-Tables.md) — that version returned **4 rows** (Rahul appeared twice, once per internship). `EXISTS` returns **3 rows** — one per matching student, regardless of how many internships they have — because `EXISTS` only asks "does at least one match exist?", it never actually joins in the matched rows.

```sql
-- Subquery in FROM ("derived table") — must be aliased
SELECT team, avg_price FROM (
  SELECT team, AVG(auction_price_crores) AS avg_price
  FROM ipl_players GROUP BY team
) AS team_avgs
WHERE avg_price > 10;
```
```text
      team       | avg_price
------------------+-----------------------
 RCB              | 15.0000000000000000
 CSK              | 12.0000000000000000
 Gujarat Titans   | 15.0000000000000000
 Mumbai Indians   | 10.8250000000000000
 LSG              | 11.0000000000000000
(5 rows)
```
> `KKR` (avg ≈ 4.53) is filtered out — the outer `WHERE avg_price > 10` runs *after* the inner query has already computed each team's average, which is exactly why you can't just write `GROUP BY team HAVING AVG(...) > 10` and skip the subquery... except you actually can; this derived-table version is shown mainly to demonstrate the "subquery in FROM" pattern itself.

- **Subquery vs `JOIN`**: a `JOIN` is usually faster when you need columns from *both* tables in the result. `EXISTS`/`IN` subqueries are often clearer (and can be faster) when you only need to *filter* one table based on another, without needing the other table's columns.

## Common Table Expressions (`WITH` / CTEs) — naming a subquery for readability
```sql
WITH team_avgs AS (
  SELECT team, AVG(auction_price_crores) AS avg_price
  FROM ipl_players
  GROUP BY team
)
SELECT p.name, p.team, p.auction_price_crores, t.avg_price
FROM ipl_players p
JOIN team_avgs t ON p.team = t.team
WHERE p.auction_price_crores > t.avg_price;

-- Recursive CTE — e.g., walking an org chart / category tree
WITH RECURSIVE subordinates AS (
  SELECT employee_id, manager_id, name FROM employees WHERE employee_id = 1  -- anchor row
  UNION ALL
  SELECT e.employee_id, e.manager_id, e.name
  FROM employees e
  JOIN subordinates s ON e.manager_id = s.employee_id                        -- recursive step
)
SELECT * FROM subordinates;
```
A CTE (`WITH ... AS (...)`) is essentially a **named, temporary result set** you can reference later in the same query — it makes deeply nested subqueries readable, and a `RECURSIVE` CTE is the standard way to query hierarchical/tree-shaped data (org charts, comment threads, category trees) in SQL.

## Window Functions — aggregates that don't collapse rows

Unlike `GROUP BY` (which merges rows into one summary row per group), a window function computes a value **per row**, using a "window" of related rows, while still returning every original row.
```sql
-- Rank players by price WITHIN their own team, without losing any rows
SELECT name, team, auction_price_crores,
       RANK() OVER (PARTITION BY team ORDER BY auction_price_crores DESC) AS price_rank
FROM ipl_players
WHERE team = 'Mumbai Indians';
```
```text
      name       |      team      | auction_price_crores | price_rank
------------------+-----------------+-----------------------+------------
 Rohit Sharma     | Mumbai Indians  |                 16.00 |          1
 Hardik Pandya    | Mumbai Indians  |                 15.00 |          2
 Jasprit Bumrah   | Mumbai Indians  |                 12.00 |          3
 Arjun Tendulkar  | Mumbai Indians  |                  0.30 |          4
(4 rows)
```
> Every Mumbai Indians row survives — unlike `GROUP BY brand` in file 04, which would have collapsed these 4 rows into 1. `PARTITION BY team` means the ranking restarts at 1 for every team; Mumbai Indians' ranking is completely independent of RCB's, CSK's, etc.

```sql
-- DENSE_RANK(): like RANK(), but no gaps after a tie (1,1,2 instead of 1,1,3)
SELECT name, auction_price_crores,
       DENSE_RANK() OVER (ORDER BY auction_price_crores DESC) AS dense_price_rank
FROM ipl_players
ORDER BY auction_price_crores DESC
LIMIT 6;
```
```text
      name       | auction_price_crores | dense_price_rank
------------------+-----------------------+-------------------
 Rohit Sharma     |                 16.00 |                 1
 Virat Kohli      |                 15.00 |                 2
 Hardik Pandya    |                 15.00 |                 2
 Rashid Khan      |                 15.00 |                 2
 MS Dhoni         |                 12.00 |                 3
 Jasprit Bumrah   |                 12.00 |                 3
(6 rows)
```
> Three players tie at 15.00 crores and all get `dense_price_rank = 2` — the **next** distinct price (12.00) becomes rank **3**, not rank 5. Plain `RANK()` would instead have jumped straight to rank 5 for the 12.00 tier, skipping 3 and 4 entirely.

Also available for time-series data (running totals, comparing to the previous row):
```sql
SUM(units_sold) OVER (ORDER BY sale_date) AS running_total   -- running/cumulative total
LAG(units_sold)  OVER (ORDER BY sale_date) AS previous_day_units  -- look at the previous row
LEAD(units_sold) OVER (ORDER BY sale_date) AS next_day_units      -- look at the next row
```
| Function | Behavior |
|---|---|
| `RANK()` | 1, 2, 2, 4 — ties share a rank, next rank skips |
| `DENSE_RANK()` | 1, 2, 2, 3 — ties share a rank, no gap after |
| `ROW_NUMBER()` | 1, 2, 3, 4 — always unique, ties broken arbitrarily by `ORDER BY` |
| `LAG(col)` / `LEAD(col)` | Value from the previous / next row in the window |
| `SUM()/AVG()/COUNT() OVER (...)` | Running/moving aggregate without collapsing rows |

`PARTITION BY` inside `OVER (...)` is the window-function equivalent of `GROUP BY` — it resets the calculation per group, but (unlike `GROUP BY`) keeps every row visible.

> `DENSE_RANK()` is exactly the tool used to solve "Nth highest salary per department" — see [10-Classic-Interview-Query-Patterns.md](10-Classic-Interview-Query-Patterns.md).

## String, date, and math functions you'll actually use
```sql
-- STRING functions
SELECT UPPER(name), LOWER(name) FROM ipl_players;
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM students;
SELECT first_name || ' ' || last_name AS full_name FROM students;   -- Postgres concat operator
SELECT LENGTH(name) FROM ipl_players;
SELECT TRIM('  padded  ');            -- removes leading/trailing whitespace
SELECT SUBSTRING(name FROM 1 FOR 3);  -- first 3 characters
SELECT REPLACE(email, '@old.com', '@new.com') FROM students;

-- DATE/TIME functions
SELECT NOW();                                     -- current timestamp
SELECT CURRENT_DATE;                              -- current date only
SELECT AGE(NOW(), enrollment_date) FROM students;  -- interval since enrollment
SELECT EXTRACT(YEAR FROM sale_date) FROM smart_watch_sales;  -- pull out year/month/day/etc.
SELECT sale_date + INTERVAL '7 days' FROM smart_watch_sales; -- date arithmetic
SELECT DATE_TRUNC('month', sale_date) FROM smart_watch_sales; -- round down to start of month

-- MATH / NUMERIC functions
SELECT ROUND(auction_price_crores, 1) FROM ipl_players;
SELECT CEIL(auction_price_crores), FLOOR(auction_price_crores) FROM ipl_players;
SELECT ABS(-5);
SELECT COALESCE(nickname, name) FROM ipl_players;   -- first non-NULL value
SELECT NULLIF(stipend, 0) FROM internships;         -- returns NULL if the two args are equal (avoids /0 errors)
```

## `INSERT` variants you'll need beyond the basics
```sql
-- Upsert: insert, but update instead if it already exists (conflict on a UNIQUE/PK column)
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
> No duplicate row was created, and no unique-constraint error was thrown either — `ON CONFLICT (email) DO UPDATE` caught the collision and updated `first_name` from `'John'` to `'Johnny'` on the *existing* row instead. `EXCLUDED.first_name` refers to the value that was *about to be inserted* before the conflict was detected.

```sql
-- Insert and immediately return the generated row (avoids a second SELECT)
INSERT INTO students (first_name, email) VALUES ('Asha', 'asha@example.com')
RETURNING student_id, enrollment_date;
```
```text
 student_id | enrollment_date
------------+------------------
          4 | 2026-09-05
(1 row)
```
> Without `RETURNING`, you'd only get back `INSERT 0 1` — no way to know the auto-generated `student_id` without a follow-up `SELECT`. `RETURNING` hands it back in the same round trip, which is exactly what you want in an API handler that needs to send the new record's ID back to the client immediately.

`RETURNING` also works on `UPDATE` and `DELETE` — extremely useful in an API handler to get back the affected row without a second round-trip query.

---

**Next up:** [10-Classic-Interview-Query-Patterns.md](10-Classic-Interview-Query-Patterns.md) — worked examples using everything above.
