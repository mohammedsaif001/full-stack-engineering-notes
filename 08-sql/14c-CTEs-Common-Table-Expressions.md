# CTEs — Common Table Expressions

> Part of the [14 — Advanced Queries](14-Subqueries-CTEs-Window-Functions.md) series · Previous: [14b — Subqueries](14b-Subqueries.md) · Next: [14d — Window Functions](14d-Window-Functions.md)
> All examples use the [14a — Shared Dataset](14a-Shared-Dataset.md). 🎥 Tutorial: https://www.youtube.com/watch?v=3OGrCtdnSFA

---

## 🧠 Core Analogy

A **CTE** is *a named scratch result you define at the top, then use like a real table in the query below it.*

Think of a subquery as an ingredient you chop **inside the pot** while cooking — it works, but the recipe gets crowded. A CTE is chopping that ingredient **on its own board first**, labelling the bowl, and then just reaching for the bowl by name when you need it. Same food, far easier to follow — and if two dishes need the same chopped onion, you chop once.

```
WITH  <name>  AS (
    <a full SELECT — the "scratch bowl">
)
SELECT ...            ← the MAIN query. Uses <name> as if it were a table.
FROM <name>
```

`CTE` stands for **Common Table Expression**. "Common" = reusable, "Table Expression" = it behaves like a table. It exists **only for the duration of that one statement** (basically like a local variable in JS) — nothing is saved to disk, and you can't `SELECT` from it in a later query.

## What advantage does a CTE have over a subquery?

Both compute the same intermediate result. The difference is **readability, reuse, and debuggability**:

| Subquery | CTE |
|---|---|
| Read **inside-out** — you hunt for the innermost `( )` first | Read **top-to-bottom** — CTE first, then the query that uses it |
| Anonymous — no name to refer to | **Named** — `cls_avg`, `exam_toppers`… self-documenting |
| If you need the same sub-result twice, you **write it twice** | Define once, **reference many times** below |
| Nesting 3+ deep becomes unreadable | Each CTE stays flat; chain them with commas |
| Hard to test in isolation | **Run the CTE body alone** to see exactly what it returns |

> Rule of thumb: *the moment a subquery is repeated, or nested more than ~2 levels, convert it to a CTE.*

---

## 1. The `WITH` blueprint (memorise this skeleton first)

```sql
-- ! CTE: Common Table Expression

WITH cte_name AS (
    -- ? any full SELECT query goes here
    SELECT ...
    FROM ...
    WHERE ...
)
SELECT ...              -- the MAIN query — required, comes right after the closing )
FROM cte_name;          -- use the CTE by name, like a table
```

Three things that trip up beginners:

1. **The CTE alone is not a runnable statement.** `WITH x AS (…)` *must* be followed by a `SELECT` (or `INSERT`/`UPDATE`/`DELETE`) that uses it. A `WITH` with no main query is a syntax error.
2. **The CTE body is just a normal `SELECT`** — any columns, joins, `WHERE`, `GROUP BY`, even `DISTINCT`.
3. **You still have to `FROM` / `JOIN` the CTE** in the main query. Naming it doesn't automatically pull its rows in.

---

## 2. Single CTE — rewrite of "scores above class average"

Here's the [14b §1](14b-Subqueries.md#1-scalar-subquery-in-where--compare-each-row-to-one-computed-value) scalar subquery, redone as a CTE.

```sql
WITH cls_avg AS (
    SELECT AVG(score) AS class_average
    FROM exam_scores
)                                       -- cls_avg = a 1-row, 1-column table: | class_average | 77.44 |
SELECT
    s.name   AS student_name,
    s.branch AS student_branch,
    e.score,
    ca.class_average
FROM exam_scores AS e
INNER JOIN students AS s ON s.student_id = e.student_id
CROSS JOIN cls_avg AS ca                -- attach the single class_average value to every row
WHERE e.score > ca.class_average;
```

```text
 student_name | student_branch | score | class_average
--------------+----------------+-------+---------------------
 Rahul        | CSE            |    95 | 77.4444444444444444
 Rahul        | CSE            |    88 | 77.4444444444444444
 Amit         | ECE            |    91 | 77.4444444444444444
 Priya        | CSE            |    98 | 77.4444444444444444
 Priya        | CSE            |    93 | 77.4444444444444444
(5 rows)
```

> Same 5 rows as the subquery version in 14b §1 — but now `class_average` is also a **visible column** in the output, because the CTE gave us a name (`ca.class_average`) to select. With the bare subquery `WHERE score > (SELECT AVG…)`, that number is used and thrown away.

### What is `CROSS JOIN`?

`CROSS JOIN` pairs **every row of the left table with every row of the right table** — a Cartesian product. No `ON` condition. If the left has 9 rows and the right has 4, you get 9 × 4 = 36 rows.

```
exam_scores (9 rows)   CROSS JOIN   cls_avg (1 row)   →   9 × 1 = 9 rows
```

That sounds dangerous, and usually it is — but here `cls_avg` has **exactly one row**, so `CROSS JOIN` just "staples" that single `class_average` value onto every exam row. It's the standard way to make one aggregate value available to every row for comparison.

> If `cls_avg` returned 3 rows, this `CROSS JOIN` would triple every exam row — a classic accidental-explosion bug. Only `CROSS JOIN` a CTE you *know* returns one row.

---

## 3. Multiple CTEs — rewrite of the double-`IN` subquery

[14b §2](14b-Subqueries.md#2-subquery-with-in--filter-against-a-list-not-a-single-value) asked: students who scored **≥ 90 in some exam** *and* have a **project with marks ≥ 85**. Two `IN` subqueries. As CTEs, each list gets a name:

```sql
WITH exam_toppers AS (
    SELECT DISTINCT student_id
    FROM exam_scores
    WHERE score >= 90
),                                  -- ← comma separates one CTE from the next
project_toppers AS (
    SELECT DISTINCT student_id
    FROM projects
    WHERE marks >= 85
)                                   -- ← NO comma after the last CTE
SELECT
    s.student_id,
    s.name,
    s.branch
FROM students AS s
INNER JOIN exam_toppers    AS et ON et.student_id = s.student_id
INNER JOIN project_toppers AS pt ON pt.student_id = s.student_id;
```

```text
 student_id | name  | branch
------------+-------+--------
          1 | Rahul | CSE
          3 | Amit  | ECE
          4 | Priya | CSE
(3 rows)
```

> Identical result to the double-`IN` subquery in 14b §2 — but you can read the intent straight down: "exam toppers, project toppers, students who are in both."

### One `WITH`, many CTEs — the comma rule

You do **not** repeat `WITH` for each CTE. Write it **once**, then separate the CTEs with commas:

```sql
WITH first_cte AS (
    ...
),                       -- comma BETWEEN CTEs
second_cte AS (
    ...
),                       -- comma again
third_cte AS (
    ...
)                        -- NO comma after the final CTE
SELECT ... FROM first_cte JOIN second_cte ... ;   -- then the main query
```

| Mistake | What happens |
|---|---|
| `WITH a AS (…) WITH b AS (…)` | Syntax error — only one `WITH` per statement |
| Comma **after** the last CTE, before `SELECT` | Syntax error — `syntax error at or near "SELECT"` |
| **Missing** comma between two CTEs | Syntax error — parser expects `SELECT` after the first `)` |

A later CTE **can reference an earlier one** (e.g. `second_cte` can `SELECT ... FROM first_cte`), because they're read in order. The reverse is not allowed.

### Why `DISTINCT` inside the CTE?

Look at `exam_scores`: Priya has DBMS 98 **and** Maths 93 — **two** rows with `score >= 90`. Without `DISTINCT`, `exam_toppers` would contain `student_id = 4` **twice**:

```text
without DISTINCT          with DISTINCT
 student_id                student_id
-----------               -----------
         1                         1
         3                         3
         4    ← Priya               4
         4    ← Priya again
```

When you then `INNER JOIN` on `student_id`, that duplicate makes **Priya's row appear twice** in the final result. `SELECT DISTINCT student_id` collapses the CTE to one row per student, so the join stays clean. Rule: **if a CTE is just a list of IDs to match against, `DISTINCT` it.**

---

## 4. Recursive CTEs (just so you've seen the name)

A CTE can refer to **itself** with `WITH RECURSIVE` — used for tree/hierarchy walking (org charts, category trees, "all comments under this comment"). Beginner-level: know it exists, know the keyword is `WITH RECURSIVE`, and that it has a *base* part `UNION ALL` a *recursive* part. Full treatment is out of scope here.

```sql
WITH RECURSIVE countdown AS (
    SELECT 5 AS n              -- base case
    UNION ALL
    SELECT n - 1 FROM countdown WHERE n > 1   -- recursive step
)
SELECT n FROM countdown;       -- 5, 4, 3, 2, 1
```

---

## CTEs — Advantages

- **Named and self-documenting** — the query reads like a list of steps.
- **Define once, reuse many times** in the same statement (no copy-pasted subquery logic).
- **Top-to-bottom readability** instead of inside-out nesting.
- **Debuggable** — run any CTE's body on its own to inspect its rows.
- **Chainable** — later CTEs can build on earlier ones.

## CTEs — Disadvantages

- **More verbose** for a one-off, trivial sub-result (a tiny scalar subquery is shorter).
- Historically an **optimization fence** in some databases (the CTE was always fully computed first). Modern Postgres (12+) can inline simple CTEs, but it's worth knowing.
- Still **scoped to one statement** — if you need the result reusable across many queries, that's a `VIEW`, not a CTE.

---

**Next:** [14d — Window Functions](14d-Window-Functions.md) · **Back to:** [14 — overview](14-Subqueries-CTEs-Window-Functions.md)
