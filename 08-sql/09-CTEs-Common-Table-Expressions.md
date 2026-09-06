# CTEs — Common Table Expressions
## Part 9 of 19 — `WITH`: Naming a Subquery, Chaining Many, and Recursion

> Previous: [08-Subqueries.md](08-Subqueries.md)
> Uses the **`campus`** dataset from [00](00-Setup-Postgres-VSCode-psql.md). 🎥 Tutorial: https://www.youtube.com/watch?v=3OGrCtdnSFA

---

## 📌 Executive Summary

- A **CTE** (Common Table Expression) is a **named, temporary result** you define with `WITH` at the top of a statement, then use like a real table in the query below it.
- It computes the same thing a subquery would — the win is **readability, reuse, and debuggability**: you read top-to-bottom instead of inside-out, you name each step, and you can run any step's body alone to inspect it.
- **`WITH` appears once per statement.** Multiple CTEs are separated by **commas**, not repeated `WITH` keywords. **No comma after the last CTE**, before the main query.
- **A `WITH` is not a runnable statement on its own** — it must be followed by a `SELECT` (or `INSERT`/`UPDATE`/`DELETE`) that uses it.
- A later CTE **can reference an earlier one** (they're read in order). The reverse is not allowed.
- A CTE lives for **one statement only** — like a local variable. If you need the result across many queries, that's a **`VIEW`** ([11](11-Views.md)).
- **`WITH RECURSIVE`** lets a CTE reference itself — the standard way to walk trees/hierarchies (org charts, comment threads, category trees).

---

## 🧠 Core Analogy: Chopping Ingredients on a Board First

A subquery is an ingredient you chop **inside the pot** while cooking — it works, but the recipe gets crowded and hard to follow.

A CTE is chopping that ingredient **on its own board first**, putting it in a labelled bowl, and then just reaching for the bowl by name when the recipe calls for it. Same food, far easier to follow — and if two dishes need the same chopped onion, you chop once.

```
WITH  <name>  AS (
    <a full SELECT — the "prepped bowl">
)
SELECT ...            ← the MAIN query. Uses <name> as if it were a table.
FROM <name>
```

`CTE` = **C**ommon **T**able **E**xpression. "Common" = reusable; "Table Expression" = behaves like a table. It exists **only for that one statement** — nothing is saved to disk.

---

## 🆚 CTE vs subquery — what actually changes

Both compute the same intermediate result. The difference:

| Subquery | CTE |
|---|---|
| Read **inside-out** — hunt for the innermost `( )` first | Read **top-to-bottom** — CTE first, then the query using it |
| Anonymous — no name to refer to | **Named** — `class_avg`, `exam_toppers` — self-documenting |
| Need the same sub-result twice → **write it twice** | Define once, **reference many times** below |
| Nesting 3+ deep becomes unreadable | Each CTE stays flat; chain them with commas |
| Hard to test in isolation | **Run the CTE body alone** to see its rows |

> Rule of thumb: *the moment a subquery is repeated, or nested more than ~2 levels, convert it to a CTE.*

---

## 1️⃣ The `WITH` skeleton (memorise this first)

```sql
WITH cte_name AS (
    SELECT ...            -- any full SELECT: columns, joins, WHERE, GROUP BY, DISTINCT
    FROM ...
    WHERE ...
)
SELECT ...                -- the MAIN query — REQUIRED, right after the closing )
FROM cte_name;            -- use the CTE by name, like a table
```

Three things that trip up beginners:

1. **`WITH x AS (…)` alone is a syntax error.** It must be followed by a statement that uses it.
2. **The CTE body is just a normal `SELECT`** — nothing special about what goes inside.
3. **You still have to `FROM` / `JOIN` the CTE** in the main query. Naming it doesn't automatically pull its rows in.

---

## 2️⃣ Single CTE — "scores above class average", rewritten

The [08 §1](08-Subqueries.md) scalar subquery, as a CTE:

```sql
WITH class_avg AS (
    SELECT AVG(score) AS avg_score
    FROM exam_scores
)                                       -- class_avg = a 1-row, 1-column table: | avg_score | 77.44 |
SELECT s.name AS student_name, s.branch, e.score, ca.avg_score
FROM exam_scores e
JOIN students s ON s.student_id = e.student_id
CROSS JOIN class_avg ca                 -- attach the single average value to every row
WHERE e.score > ca.avg_score;
```
```text
 student_name | branch | score | avg_score
--------------+--------+-------+---------------------
 Rahul        | CSE    |    95 | 77.4444444444444444
 Rahul        | CSE    |    88 | 77.4444444444444444
 Amit         | ECE    |    91 | 77.4444444444444444
 Priya        | CSE    |    98 | 77.4444444444444444
 Priya        | CSE    |    93 | 77.4444444444444444
(5 rows)
```
> Same 5 rows as the subquery version — but `avg_score` is now a **visible column**, because the CTE gave it a name (`ca.avg_score`). A bare `WHERE score > (SELECT AVG…)` uses that number and throws it away.

### Why `CROSS JOIN` here?

`CROSS JOIN` pairs every left row with every right row. `class_avg` has **exactly one row**, so this just "staples" its single `avg_score` value onto every exam row — the standard way to make one aggregate available to every row for comparison. (If `class_avg` returned 3 rows this would triple every exam row — only `CROSS JOIN` a CTE you *know* returns one row.)

---

## 3️⃣ Multiple CTEs — one `WITH`, commas between

The [08 §2](08-Subqueries.md) double-`IN` query — students who scored **≥ 90 in an exam** *and* have a **project scoring ≥ 85** — with each list named:

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
SELECT s.student_id, s.name, s.branch
FROM students s
JOIN exam_toppers    et ON et.student_id = s.student_id
JOIN project_toppers pt ON pt.student_id = s.student_id;
```
```text
 student_id | name  | branch
------------+-------+--------
          1 | Rahul | CSE
          3 | Amit  | ECE
          4 | Priya | CSE
(3 rows)
```
> Identical result to the double-`IN`, but you read the intent straight down: "exam toppers, project toppers, students in both."

### The comma rule — spelled out

Write `WITH` **once**, separate CTEs with commas:

```sql
WITH first_cte AS (
    ...
),                       -- comma BETWEEN CTEs
second_cte AS (
    ...
),                       -- comma again
third_cte AS (
    ...
)                        -- NO comma after the FINAL CTE
SELECT ... FROM first_cte JOIN second_cte ... ;   -- then the main query
```

| Mistake | What happens |
|---|---|
| `WITH a AS (…) WITH b AS (…)` | Syntax error — only **one** `WITH` per statement |
| Comma **after** the last CTE, before `SELECT` | `syntax error at or near "SELECT"` |
| **Missing** comma between two CTEs | Parser expects `SELECT` after the first `)` — syntax error |

A later CTE **can** `SELECT ... FROM` an earlier one (read in order). The reverse can't.

### Why `DISTINCT` inside those CTEs?

Priya has DBMS 98 **and** Maths 93 — two rows with `score >= 90`. Without `DISTINCT`, `exam_toppers` would hold `student_id = 4` **twice**, and the `JOIN` would make Priya's row appear twice in the final result. `SELECT DISTINCT student_id` collapses the CTE to one row per student. **Rule: if a CTE is just a list of IDs to match against, `DISTINCT` it.**

---

## 4️⃣ Chained CTEs — a multi-step pipeline

CTEs shine when a query is really a sequence of steps. Each step is a named, individually-testable block.

**Goal:** per branch, the average of students' total exam scores — but only branches whose average clears 100.

```sql
WITH per_student AS (                       -- step 1: total score per student
    SELECT student_id, SUM(score) AS total_score
    FROM exam_scores
    GROUP BY student_id
),
per_branch AS (                            -- step 2: average those totals per branch
    SELECT s.branch, AVG(ps.total_score) AS avg_total
    FROM per_student ps
    JOIN students s ON s.student_id = ps.student_id
    GROUP BY s.branch
)
SELECT branch, ROUND(avg_total, 1) AS avg_total     -- step 3: filter & present
FROM per_branch
WHERE avg_total > 100
ORDER BY avg_total DESC;
```
```text
 branch | avg_total
--------+-----------
 CSE    |     187.0
 ECE    |     136.0
 IT     |     132.0
(3 rows)
```
> `per_branch` builds directly on `per_student`. To debug, run each CTE's body on its own — you see exactly what step 1 produced before step 2 touched it. That inspectability is the whole point.

---

## 5️⃣ Recursive CTEs — `WITH RECURSIVE`

A CTE can reference **itself**, to walk tree/hierarchy data: org charts, category trees, "every comment under this comment," "everyone who reports (directly or indirectly) to this manager."

A recursive CTE has two parts joined by `UNION ALL`:

- **Anchor** — the starting row(s). Runs once.
- **Recursive step** — joins back to the CTE itself, producing the next "level." Repeats until it returns no new rows.

### Toy example — a countdown

```sql
WITH RECURSIVE countdown AS (
    SELECT 5 AS n                                   -- anchor
    UNION ALL
    SELECT n - 1 FROM countdown WHERE n > 1         -- recursive step
)
SELECT n FROM countdown;                            -- 5, 4, 3, 2, 1
```

### Real example — the management chain (uses the `company` dataset)

**Goal:** everyone in Aditi's reporting tree (Aditi is `employee_id = 1`).

```sql
WITH RECURSIVE org_tree AS (
    SELECT employee_id, name, manager_id, 1 AS depth
    FROM employees
    WHERE employee_id = 1                           -- anchor: the top person

    UNION ALL

    SELECT e.employee_id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.employee_id   -- recursive: people reporting to someone already in the tree
)
SELECT depth, name, manager_id FROM org_tree ORDER BY depth, name;
```
```text
 depth |  name  | manager_id
-------+--------+------------
     1 | Aditi  |
     2 | Kabir  |          1
     2 | Rahul  |          1
     2 | Sneha  |          1
     3 | Meera  |          2
(5 rows)
```
> Level 1 = Aditi. Level 2 = her direct reports. Level 3 = *their* reports (Meera reports to Rahul). The recursion stops when a level adds nobody new. Always ensure the recursive step eventually stops — a cycle in the data (A manages B manages A) loops forever; guard with a `depth < N` cap or `UNION` (which dedupes) if that's possible.

---

## ⚖️ CTEs — trade-offs

**Good:** named and self-documenting; define once, reuse many times in the statement; top-to-bottom readability; each CTE body is independently runnable; chainable into pipelines; the only way to do recursion.

**Watch out for:** overkill for a trivial one-off scalar (a tiny subquery is shorter). Historically an **optimisation fence** — some databases always materialised the CTE fully before the main query could use it. Modern Postgres (12+) inlines simple non-recursive CTEs by default; add `MATERIALIZED` / `NOT MATERIALIZED` to force the behaviour if it ever matters. And a CTE is **scoped to one statement** — cross-query reuse needs a `VIEW`.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What is a CTE? | A named temporary result defined with `WITH`, usable like a table within that one statement |
| CTE vs subquery? | Same computation; CTE adds a name, top-to-bottom readability, reuse, and independent testability |
| How do you write multiple CTEs? | One `WITH`, CTEs separated by commas, no comma before the final `SELECT` |
| Can a CTE reference another CTE? | Yes — a later one can reference an earlier one; not the reverse |
| CTE vs VIEW? | A CTE lives for one statement; a VIEW is a saved query reusable across many statements |
| What is a recursive CTE for? | Walking hierarchical/tree data — org charts, category trees, threaded comments |
| What are the two parts of a recursive CTE? | An anchor (base rows) `UNION ALL` a recursive step that joins back to the CTE |

---

**Next up:** [10-Window-Functions.md](10-Window-Functions.md) — calculations across a set of rows that still return every row: `OVER()`, `PARTITION BY`, ranking, running totals.
