# Subqueries — A Query Inside a Query
## Part 8 of 19 — Scalar, `IN`, `EXISTS`, Derived Tables & Correlated Subqueries

> Previous: [07-Joins-Combining-Tables.md](07-Joins-Combining-Tables.md)
> Uses the **`campus`** dataset (`students`, `exam_scores`, `projects`, `high_scorers_report`) from [00](00-Setup-Postgres-VSCode-psql.md). 🎥 Tutorial: https://www.youtube.com/watch?v=6-Dsfgui0sE

---

## 📌 Executive Summary

- A **subquery** is a complete `SELECT` wrapped in `( )` and placed inside another statement. It answers a question you must answer *first* before the outer query can run.
- **The one rule:** a subquery must return the right **shape** for where it sits — one value for a `=`/`>` comparison, one column (many rows) for `IN`, a full table for `FROM`.
- **Scalar subquery** (`WHERE score > (SELECT AVG(score) ...)`) — returns a single value, computed once.
- **`IN` subquery** — returns a one-column list; the outer row is kept if its value appears in that list.
- **`EXISTS` subquery** — returns nothing usable; it's just a yes/no "did the inner query find any row?" Often the fastest membership test because it stops at the first match.
- **Derived table** (subquery in `FROM`) — the inner query's result *is* a table you can join to. **Must be aliased.**
- **Correlated subquery** — the inner query references a column from the outer row, so it re-runs *per outer row*. Powerful but potentially O(n²); a window function or join is usually better.
- The moment a subquery is **repeated** or nested **3+ deep**, switch to a **CTE** ([09](09-CTEs-Common-Table-Expressions.md)).

---

## 🧠 Core Analogy: A Question You Must Answer First

> "Show me every exam score **above the class average**."

You can't filter until you know what the class average *is*. So the database runs the inner question first — `SELECT AVG(score) FROM exam_scores` → `77.44` — then uses that answer in the outer query: `WHERE score > 77.44`.

```
        OUTER QUERY (the real question)
        ┌─────────────────────────────────────────────┐
        │ SELECT ... FROM exam_scores                 │
        │ WHERE score >  ( SELECT AVG(score) ...  )    │  ← SUBQUERY runs first,
        │                └────────┬─────────────────┘  │    produces one value (77.44),
        └─────────────────────────┼───────────────────-┘    then the outer query uses it
                                  ▼
                               77.44
```

---

## 📐 The one rule: return the right shape

| Where the subquery sits | Shape it must return |
|---|---|
| After `=`, `<`, `>`, `<=`, `>=` (a "scalar" spot) | **Exactly one column, exactly one row** → a single value |
| After `IN` / `NOT IN` / `ANY` / `ALL` | **Exactly one column**, any number of rows → a list |
| In `FROM` | A full table (any columns, any rows) — **and it must have an alias** |

Types must match too: comparing `score` (integer) means the subquery must return a number.

---

## 1️⃣ Scalar subquery in `WHERE` — compare each row to one computed value

```sql
SELECT s.name AS student_name, s.branch, e.subject, e.score
FROM exam_scores e
JOIN students s ON s.student_id = e.student_id
WHERE e.score > (SELECT AVG(score) FROM exam_scores);     -- returns ONE number: 77.44
```
```text
 student_name | branch | subject | score
--------------+--------+---------+-------
 Rahul        | CSE    | DBMS    |    95
 Rahul        | CSE    | Maths   |    88
 Amit         | ECE    | DBMS    |    91
 Priya        | CSE    | DBMS    |    98
 Priya        | CSE    | Maths   |    93
(5 rows)
```
> The subquery returns a single scalar (`77.44`), so it can sit directly after `>`. If it returned two columns or many rows, Postgres throws `more than one row returned by a subquery used as an expression`.

Flip `>` to `<` for below-average — same structure. The subquery runs **once**, not once per row.

---

## 2️⃣ `IN` subquery — filter against a list

**Goal:** students who scored **≥ 90 in some exam** *and* have a **project scoring ≥ 85**.

```sql
SELECT s.student_id, s.name, s.branch
FROM students s
WHERE s.student_id IN (SELECT student_id FROM exam_scores WHERE score >= 90)
  AND s.student_id IN (SELECT student_id FROM projects    WHERE marks >= 85);
```
```text
 student_id | name  | branch
------------+-------+--------
          1 | Rahul | CSE
          3 | Amit  | ECE
          4 | Priya | CSE
(3 rows)
```
> Each `IN (…)` subquery returns **one column** (`student_id`), **many rows** — a list. `s.student_id IN (list)` keeps a student whose id appears anywhere in it. Two `IN` blocks joined by `AND` = "must be in both lists."

> ⚠️ Inside `IN`, select **only the one column** you're matching on. `SELECT *` inside an `IN` is a type mismatch.

**Why not just `JOIN`?** You often could. `IN (subquery)` is cleaner when you only want a **membership test** and don't want the extra columns (or the row duplication) a join brings.

---

## 3️⃣ `EXISTS` / `NOT EXISTS` — a yes/no membership test

```sql
-- Students who have at least one project
SELECT s.name
FROM students s
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.student_id = s.student_id);
```
```text
 name
-------
 Rahul
 Sneha
 Amit
 Priya
(4 rows)
```

- `EXISTS` doesn't care *what* the inner query selects — `SELECT 1`, `SELECT *`, anything. It only asks **"did that return any row?"**
- It's **correlated** (the inner `WHERE` references `s.student_id` from the outer row), so it's evaluated per outer row — but it can **stop at the first match**, which often makes it faster than `IN` or a join for pure existence checks on large tables ([16 §6](16-Query-Optimization-Playbook.md)).
- `EXISTS` returns **one row per matching outer row** — unlike an `INNER JOIN` to `projects`, which would return Rahul... once (he has one project) but would double a student with two projects. `EXISTS` never duplicates.
- **`NOT EXISTS`** is the safe anti-join — unlike `NOT IN`, it behaves correctly even when `NULL`s are present:

```sql
SELECT s.name FROM students s
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.student_id = s.student_id);   -- Rohan
```

---

## 4️⃣ Subquery in `FROM` — a derived table (inline view)

Sometimes you must **aggregate first, then join**. `GROUP BY` collapses rows, so you can't group *and* keep student names in one flat query. Solution: group in a subquery, treat its result as a table, join to it.

**Goal:** each student's **total score** and **exam count**, beside their name and branch.

```sql
SELECT s.name, s.branch, stats.total_score, stats.attempts
FROM (
    SELECT student_id,
           SUM(score) AS total_score,
           COUNT(*)   AS attempts
    FROM exam_scores
    GROUP BY student_id
) AS stats                                            -- ← the derived table MUST be aliased
JOIN students s ON s.student_id = stats.student_id;
```
```text
 name  | branch | total_score | attempts
-------+--------+-------------+----------
 Rahul | CSE    |         183 |        2
 Sneha | IT     |         132 |        2
 Amit  | ECE    |         136 |        2
 Priya | CSE    |         191 |        2
 Rohan | ME     |          55 |        1
(5 rows)
```
> The subquery produces a temporary 3-column table (`student_id`, `total_score`, `attempts`), one row per student. Alias it (`stats`), join `students` to it. Without the alias: `ERROR: subquery in FROM must have an alias`.

> This "paste a group value onto each row" job is exactly what a **window function** does in one pass with no join — see [10 §1](10-Window-Functions.md).

---

## 5️⃣ Correlated subquery — re-runs per outer row

An ordinary subquery runs once. A **correlated** subquery references a column from the *current outer row*, so it's re-evaluated for **every** outer row — like a loop.

**Goal:** each student's highest single exam score, using a correlated scalar subquery.

```sql
SELECT s.name,
       (SELECT MAX(e.score)
        FROM exam_scores e
        WHERE e.student_id = s.student_id) AS best_score      -- refers to s.student_id → correlated
FROM students s;
```
```text
 name  | best_score
-------+------------
 Rahul |         95
 Sneha |         72
 Amit  |         91
 Priya |         98
 Rohan |         55
(5 rows)
```

- The inner query can't run standalone — `s.student_id` only has meaning per outer row.
- **Cost:** for `N` students this is `N` inner queries. On small data, fine. On large data it can become O(n²) — a `JOIN` + `GROUP BY`, or a window function, does the same work in one pass. Correlated subqueries are readable but watch the row counts.
- `EXISTS` (§3) is itself a correlated subquery — the acceptable, optimised case, because it short-circuits.

---

## 6️⃣ Subquery driving an `INSERT` — `INSERT INTO … SELECT`

**Goal:** fill `high_scorers_report` with every (student, subject, score) beating the class average.

```sql
INSERT INTO high_scorers_report (student_id, student_name, subject, score)
SELECT s.student_id, s.name, e.subject, e.score
FROM exam_scores e
JOIN students s ON s.student_id = e.student_id
WHERE e.score > (SELECT AVG(score) FROM exam_scores);
```
```text
INSERT 0 5
```

Rules (also in [04 §1](04-DML-Insert-Update-Delete.md)):

1. **No `VALUES`** — the `SELECT` replaces it.
2. **Column positions line up** — Nth insert column ← Nth selected column, types compatible. Swap two same-typed columns and you get a silent data bug.
3. The `SELECT` can be arbitrarily complex, including its own nested subqueries (the `> AVG(...)` scalar above).

---

## ⚖️ Subqueries — trade-offs

**Good for:** simple one-off filters and calculations; reads naturally in `SELECT` / `INSERT` / `UPDATE` / `DELETE`; a scalar subquery is the shortest possible tool for "compare to one number."

**Bad for:** anything **repeated** (you write it twice) or nested **3+ deep** (unreadable, hard to debug). Complex multi-step logic.

> Every disadvantage points the same way: *repeating a subquery, or nesting it deep, means switch to a **CTE*** → [09](09-CTEs-Common-Table-Expressions.md).

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What is a subquery? | A `SELECT` wrapped in `()` inside another statement, producing a value/list/table the outer statement consumes |
| Scalar vs `IN` subquery? | Scalar returns exactly one value (for `=`/`>`); `IN` returns a one-column list of many values |
| Why must a subquery in `FROM` be aliased? | The outer query needs a name to reference the derived table's columns |
| `EXISTS` vs `IN`? | `EXISTS` is a yes/no check that can stop at the first match — often faster; `IN` builds/checks the whole list |
| Why is `NOT EXISTS` safer than `NOT IN`? | `NOT IN` returns `NULL` (excludes the row) if the list contains a `NULL`; `NOT EXISTS` handles `NULL`s correctly |
| What's a correlated subquery? | One that references a column from the outer row, so it re-runs per outer row |
| When do you switch a subquery to a CTE? | When it's repeated, or nested more than ~2 levels deep |

---

**Next up:** [09-CTEs-Common-Table-Expressions.md](09-CTEs-Common-Table-Expressions.md) — naming a subquery with `WITH`, chaining multiple CTEs, and recursion.
