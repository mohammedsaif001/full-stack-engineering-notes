# Subqueries — Explained From Scratch

> Part of the [14 — Advanced Queries](14-Subqueries-CTEs-Window-Functions.md) series · Next: [14c — CTEs](14c-CTEs-Common-Table-Expressions.md)
> All examples use the [14a — Shared Dataset](14a-Shared-Dataset.md). 🎥 Tutorial: https://www.youtube.com/watch?v=6-Dsfgui0sE

---

## 🧠 Core Analogy

A **subquery** is *a question you have to answer before you can answer the main question.*

> "Show me every exam score **above the class average**."

You can't filter until you know what the class average *is*. So the database runs the inner question first (`SELECT AVG(score) FROM exam_scores` → `77.44`), then uses that answer in the outer query (`WHERE score > 77.44`). The inner query is the **subquery**; it's wrapped in parentheses `( … )` and lives inside the outer (the **outer query**).

```
        OUTER QUERY (the real question)
        ┌───────────────────────────────────────────┐
        │ SELECT ... FROM exam_scores               │
        │ WHERE score >  ( SELECT AVG(score) ...  )  │  ← SUBQUERY runs first,
        │                └────────┬───────────────┘  │    produces one value (77.44),
        └─────────────────────────┼─────────────────-┘    then the outer query uses it
                                  ▼
                            77.44
```

## What a subquery *is* and *does*

- **Is:** a complete `SELECT` statement placed inside another statement, inside `( )`.
- **Does:** produces a value (or a set of values, or a whole temporary table) that the outer statement consumes.
- **Runs where:** in `WHERE`, in `HAVING`, in `SELECT` (as a computed column), in `FROM` (as a derived table), and inside `INSERT` / `UPDATE` / `DELETE`.

### The one rule to memorise

> **A subquery must return the right *shape* for where it's used.**

| Where it's used | Shape the subquery must return |
|---|---|
| Compared with `=`, `<`, `>`, `<=`, `>=` (a "scalar" spot) | **Exactly one column, exactly one row** → a single value |
| Compared with `IN` / `NOT IN` / `ANY` / `ALL` | **Exactly one column**, any number of rows → a list |
| Used in `FROM` | A full table (any columns, any rows) — and it **must be given an alias** |

And the type must match: if you compare `score` (an integer) to a subquery, that subquery must return a number — not text, not a date.

---

## 1. Scalar subquery in `WHERE` — compare each row to one computed value

**Goal:** every score strictly *above* the class average.

```sql
SELECT
    s.name       AS student_name,
    s.branch     AS student_branch,
    e.subject,
    e.score
FROM exam_scores AS e
INNER JOIN students AS s ON s.student_id = e.student_id
WHERE e.score > (
    SELECT AVG(score) FROM exam_scores      -- returns ONE number: 77.44
);
```

```text
 student_name | student_branch | subject | score
--------------+----------------+---------+-------
 Rahul        | CSE            | DBMS    |    95
 Rahul        | CSE            | Maths   |    88
 Amit         | ECE            | DBMS    |    91
 Priya        | CSE            | DBMS    |    98
 Priya        | CSE            | Maths   |    93
(5 rows)
```

> The subquery `(SELECT AVG(score) FROM exam_scores)` returns a **single scalar** (77.44). That's why it can sit directly after `>`. If it returned two columns or many rows, Postgres would throw `more than one row returned by a subquery used as an expression`.

**Flip the comparison** for *below* average — same structure, just `<`:

```sql
SELECT
    s.name   AS student_name,
    s.branch AS student_branch,
    e.score
FROM exam_scores AS e
INNER JOIN students AS s ON s.student_id = e.student_id
WHERE e.score < (
    SELECT AVG(score) AS class_average
    FROM exam_scores
);
```

```text
 student_name | student_branch | score
--------------+----------------+-------
 Sneha        | IT             |    72
 Sneha        | IT             |    60
 Amit         | ECE            |    45
 Rohan        | ME             |    55
(4 rows)
```

> Naming the inner column `AS class_average` is harmless but **cosmetic** — nobody outside the subquery can see that name. The outer query only receives the *value*.

---

## 2. Subquery with `IN` — filter against a *list*, not a single value

**Goal:** students who scored **≥ 90 in some exam** *and* also have a **project with marks ≥ 85**.

```sql
SELECT
    s.student_id, s.name, s.branch
FROM students AS s
WHERE s.student_id IN (
    SELECT student_id FROM exam_scores WHERE score >= 90     -- list of student_ids
) AND s.student_id IN (
    SELECT student_id FROM projects WHERE marks >= 85        -- another list of student_ids
);
```

```text
 student_id | name  | branch
------------+-------+--------
          1 | Rahul | CSE
          3 | Amit  | ECE
          4 | Priya | CSE
(3 rows)
```

> Each `IN ( … )` subquery returns **one column** (`student_id`) but **many rows** — that's a list. `s.student_id IN (list)` keeps a student if their id appears anywhere in that list. Two `IN` blocks joined by `AND` = "must satisfy both lists."

> ⚠️ Common bug: `SELECT * FROM projects WHERE marks >= 85` inside an `IN` would return **every column** of `projects`, and `student_id IN (multi-column-thing)` is a type mismatch. Inside `IN`, select **only the one column** you're matching on.

**Why not just `JOIN`?** You often could. `IN (subquery)` shines when you only want to *test membership* and don't want the extra columns (or the row duplication) a join brings.

> The CTE rewrite of this exact query is in [14c §3](14c-CTEs-Common-Table-Expressions.md#3-multiple-ctes--rewrite-of-the-double-in-subquery).

---

## 3. Subquery in `FROM` — a "derived table" (a.k.a. inline view)

Sometimes you need to **aggregate first, then join**. `GROUP BY` collapses rows, so you can't group *and* keep student names in the same simple query. Solution: do the grouping in a subquery, treat its result as a table, and join to it.

**Goal:** each student's **total score** and **number of exam attempts**, next to their name and branch.

```sql
SELECT
    s.name,
    s.branch,
    total_stats.total_score,
    total_stats.number_of_attempts
FROM (
    SELECT
        student_id,
        SUM(score)  AS total_score,
        COUNT(*)    AS number_of_attempts
    FROM exam_scores
    GROUP BY student_id
) AS total_stats                                     -- ← the derived table MUST have an alias
INNER JOIN students AS s ON s.student_id = total_stats.student_id;
```

```text
 name  | branch | total_score | number_of_attempts
-------+--------+-------------+--------------------
 Rahul | CSE    |         183 |                  2
 Sneha | IT     |         132 |                  2
 Amit  | ECE    |         136 |                  2
 Priya | CSE    |         191 |                  2
 Rohan | ME     |          55 |                  1
(5 rows)
```

> The subquery in `FROM` produces a **temporary 3-column table** (`student_id`, `total_score`, `number_of_attempts`), one row per student. We alias it `total_stats` and join `students` to it on `student_id`. Without the alias, Postgres errors with `subquery in FROM must have an alias`.

Same pattern with `AVG` instead of `SUM/COUNT`, joined into a bigger query:

```sql
SELECT
    s.name,
    s.branch,
    p.title,
    p.marks,
    exam_avg.avg_score
FROM projects AS p
INNER JOIN students AS s   ON s.student_id = p.student_id
INNER JOIN (
    SELECT
        student_id,
        AVG(score) AS avg_score
    FROM exam_scores
    GROUP BY student_id
) AS exam_avg ON exam_avg.student_id = p.student_id;
```

```text
 name  | branch | title          | marks | avg_score
-------+--------+----------------+-------+----------------------
 Rahul | CSE    | Chat App       |    87 | 91.5000000000000000
 Amit  | ECE    | Compiler       |    90 | 68.0000000000000000
 Priya | CSE    | ML Model       |    95 | 95.5000000000000000
 Sneha | IT     | Portfolio Site |    70 | 66.0000000000000000
(4 rows)
```

> This is three tables in one query: `projects`, `students`, and a **derived table** `exam_avg` computed on the fly. Rohan has no project, so he doesn't appear. Each `INNER JOIN` only keeps rows that match on both sides.

> This "paste a group value onto each row" job is exactly what a **window function** does in one pass, no join — see [14d §1](14d-Window-Functions.md#why-not-just-a-subquery).

---

## 4. Subquery for **insertion** — `INSERT INTO … SELECT …`

You don't always insert hand-typed values. You can insert **the result of a query** — copying/transforming rows from other tables into a target table.

**Goal:** fill `high_scorers_report` with every (student, subject, score) where the score beats the class average.

```sql
INSERT INTO high_scorers_report (
    student_id,
    student_name,
    subject,
    score
)
SELECT
    s.student_id,
    s.name,
    e.subject,
    e.score
FROM exam_scores AS e
INNER JOIN students AS s ON s.student_id = e.student_id
WHERE e.score > (
    SELECT AVG(score) FROM exam_scores
);
```

```text
INSERT 0 5
```

```sql
SELECT * FROM high_scorers_report;
```

```text
 student_id | student_name | subject | score
------------+--------------+---------+-------
          1 | Rahul        | DBMS    |    95
          1 | Rahul        | Maths   |    88
          3 | Amit         | DBMS    |    91
          4 | Priya        | DBMS    |    98
          4 | Priya        | Maths   |    93
(5 rows)
```

### The rules for `INSERT … SELECT`

1. **No `VALUES` keyword.** It's `INSERT INTO target (cols…) SELECT …` — you replace the `VALUES (…)` part entirely with a `SELECT`.
2. **Column order must line up.** The Nth column in your `INSERT` list receives the Nth column your `SELECT` produces. Here:

   | Position | `INSERT` column | `SELECT` expression | Type must match |
   |---|---|---|---|
   | 1 | `student_id` | `s.student_id` | INT ↔ INT ✅ |
   | 2 | `student_name` | `s.name` | VARCHAR ↔ VARCHAR ✅ |
   | 3 | `subject` | `e.subject` | VARCHAR ↔ VARCHAR ✅ |
   | 4 | `score` | `e.score` | INT ↔ INT ✅ |

   If you swapped `s.name` and `e.subject` in the `SELECT`, the insert would still *run* (both are text) but your report would have names in the `subject` column — a silent data bug.
3. **`INSERT 0 5`** means "0 OIDs, **5 rows inserted**" — the row count is the second number.
4. The `SELECT` can be arbitrarily complex — joins, `WHERE`, its own nested subqueries (like the `> AVG(...)` scalar subquery above). It's still "a subquery feeding an insert."

---

## Subqueries — Advantages

- **Concise and easy to write** for simple problems.
- **Read naturally** and are often intuitive to understand (*not* in complex queries).
- **Useful for filtering conditions or one-time calculations** — can be used in `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

## Subqueries — Disadvantages

- **Deeply nested subqueries become difficult to read** and harder to debug.
- **Logic may need to be repeated** if reused multiple times (CTEs are often preferred for better readability and reusability).
- **Complex business logic** is often easier to organize with CTEs.

> Every disadvantage points the same direction: *the moment you're repeating a subquery or nesting it 3 levels deep, switch to a CTE* → [14c — CTEs](14c-CTEs-Common-Table-Expressions.md).

---

**Next:** [14c — CTEs (Common Table Expressions)](14c-CTEs-Common-Table-Expressions.md) · **Back to:** [14 — overview](14-Subqueries-CTEs-Window-Functions.md)
