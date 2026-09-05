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

Deep dive — not just "unique values":
```sql
-- Single column — unique roles
SELECT DISTINCT role FROM ipl_players;

-- Multiple columns — unique COMBINATIONS of (team, role), not unique per-column
SELECT DISTINCT team, role FROM ipl_players;

-- DISTINCT ON (Postgres-specific): one row per group, keeping the "first" row
-- per your ORDER BY — e.g., the highest-paid player per team:
SELECT DISTINCT ON (team) team, name, auction_price_crores
FROM ipl_players
ORDER BY team, auction_price_crores DESC;

-- COUNT(DISTINCT ...) — count of unique values, not unique rows
SELECT COUNT(DISTINCT team) AS total_teams FROM ipl_players;
```
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
FROM ipl_players;

-- CASE inside an aggregate — conditional counting ("pivot"-style summary)
SELECT
  COUNT(CASE WHEN role = 'Batsman' THEN 1 END) AS batsmen,
  COUNT(CASE WHEN role = 'Bowler'  THEN 1 END) AS bowlers
FROM ipl_players;
```
`CASE` is how you express "if this, then that" logic *inside* SQL, either as a computed column or bucketed inside an aggregate.

## Combining result sets: `UNION`, `UNION ALL`, `INTERSECT`, `EXCEPT`
```sql
-- UNION: combines rows from two queries, removing duplicates (slower, extra dedup work)
SELECT name FROM ipl_players WHERE team = 'CSK'
UNION
SELECT name FROM ipl_players WHERE role = 'Bowler';

-- UNION ALL: same, but keeps duplicates (faster — use this unless you specifically need dedup)
SELECT name FROM ipl_players WHERE team = 'CSK'
UNION ALL
SELECT name FROM ipl_players WHERE role = 'Bowler';

-- INTERSECT: only rows present in BOTH queries
SELECT name FROM ipl_players WHERE team = 'CSK'
INTERSECT
SELECT name FROM ipl_players WHERE role = 'Batsman';

-- EXCEPT: rows in the first query that are NOT in the second
SELECT name FROM ipl_players
EXCEPT
SELECT name FROM ipl_players WHERE team = 'CSK';
```
Rule: all queries being combined must return the **same number of columns**, with compatible types.

## Subqueries — a query inside a query
```sql
-- Subquery in WHERE: players priced above the average price
SELECT name, auction_price_crores FROM ipl_players
WHERE auction_price_crores > (SELECT AVG(auction_price_crores) FROM ipl_players);

-- EXISTS: players who have at least one internship (semantically like an INNER JOIN,
-- but often faster because it can stop at the FIRST match instead of joining all matches)
SELECT s.name FROM students s
WHERE EXISTS (SELECT 1 FROM internships i WHERE i.student_id = s.student_id);

-- NOT EXISTS: the anti-join equivalent (students with NO internships)
SELECT s.name FROM students s
WHERE NOT EXISTS (SELECT 1 FROM internships i WHERE i.student_id = s.student_id);

-- IN with a subquery: teams that have at least one player priced above 15 crores
SELECT DISTINCT team FROM ipl_players
WHERE team IN (SELECT team FROM ipl_players WHERE auction_price_crores > 15);

-- Subquery in FROM ("derived table") — must be aliased
SELECT team, avg_price FROM (
  SELECT team, AVG(auction_price_crores) AS avg_price
  FROM ipl_players GROUP BY team
) AS team_avgs
WHERE avg_price > 10;

-- Correlated subquery — references the OUTER query's row, re-evaluated per row
-- (Every player who earns more than their own team's average)
SELECT p1.name, p1.team, p1.auction_price_crores FROM ipl_players p1
WHERE p1.auction_price_crores > (
  SELECT AVG(p2.auction_price_crores) FROM ipl_players p2 WHERE p2.team = p1.team
);
```
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
FROM ipl_players;

-- ROW_NUMBER(): like RANK(), but never ties — always 1,2,3,4...
SELECT name, team, auction_price_crores,
       ROW_NUMBER() OVER (PARTITION BY team ORDER BY auction_price_crores DESC) AS row_num
FROM ipl_players;

-- DENSE_RANK(): like RANK(), but no gaps after a tie (1,1,2 instead of 1,1,3)
SELECT name, auction_price_crores,
       DENSE_RANK() OVER (ORDER BY auction_price_crores DESC) AS dense_price_rank
FROM ipl_players;

-- Running total (no PARTITION BY = the whole table is one window)
SELECT sale_date, units_sold,
       SUM(units_sold) OVER (ORDER BY sale_date) AS running_total
FROM smart_watch_sales;

-- LAG/LEAD: look at the previous/next row's value without a self-join
SELECT sale_date, units_sold,
       LAG(units_sold) OVER (ORDER BY sale_date) AS previous_day_units
FROM smart_watch_sales;
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
VALUES ('john@example.com', 'John')
ON CONFLICT (email)
DO UPDATE SET first_name = EXCLUDED.first_name;

-- Insert and immediately return the generated row (avoids a second SELECT)
INSERT INTO students (first_name, email) VALUES ('Asha', 'asha@example.com')
RETURNING student_id, enrollment_date;

-- Insert rows copied from another query
INSERT INTO archived_students (student_id, first_name)
SELECT student_id, first_name FROM students WHERE current_status = 'graduated';
```
`RETURNING` also works on `UPDATE` and `DELETE` — extremely useful in an API handler to get back the affected row without a second round-trip query.

---

**Next up:** [10-Classic-Interview-Query-Patterns.md](10-Classic-Interview-Query-Patterns.md) — worked examples using everything above.
