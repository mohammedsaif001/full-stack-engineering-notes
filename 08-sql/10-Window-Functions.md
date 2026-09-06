# Window Functions
## Part 10 of 19 — `OVER()`, `PARTITION BY`, Ranking, Running Totals, `LAG`/`LEAD`

> Previous: [09-CTEs-Common-Table-Expressions.md](09-CTEs-Common-Table-Expressions.md)
> Uses the **`campus`** and **`company`** datasets from [00](00-Setup-Postgres-VSCode-psql.md). 🎥 Tutorial: https://www.youtube.com/watch?v=Wh9yXS9sgio

---

## 📌 Executive Summary

- A **window function** does a group-style calculation but **keeps every row**, adding the answer as an extra column. `GROUP BY` *collapses* a group to one row; a window function *annotates* each row with its group's number.
- The `OVER(...)` clause is what makes a function a *window* function. Inside it:
  - **`PARTITION BY col`** — split rows into groups; restart the calculation at each group boundary. (The window-function equivalent of `GROUP BY`, but rows survive.)
  - **`ORDER BY col`** (inside `OVER`) — order rows within the partition; this turns a whole-group calc into a **running / cumulative** one.
  - a **frame** (`ROWS BETWEEN …`) — fine-tune exactly which rows around the current one are in scope.
- **Ranking functions** — `ROW_NUMBER()` (always unique: 1,2,3,4), `RANK()` (ties share, then a gap: 1,2,2,4), `DENSE_RANK()` (ties share, no gap: 1,2,2,3). `()` is always empty; `ORDER BY` inside `OVER` is mandatory.
- **You cannot filter on a window function in `WHERE`** — it's computed too late. Wrap the query in a CTE and filter outside. This is the "Nth highest per group" pattern.
- Other essentials: `SUM/AVG/COUNT/MIN/MAX ... OVER(...)`, `LAG()` / `LEAD()` (previous / next row), `NTILE(n)`, `FIRST_VALUE()` / `LAST_VALUE()`.

---

## 🧠 Core Analogy: A Report That Keeps Every Line

> "Show me each exam score, *and next to it* the total for that subject."

With `GROUP BY subject` you get one row per subject (`DBMS → 411`) and the individual scores vanish. With a window function you get **all 9 exam rows back**, each carrying its subject's total in a new column. The rows are still there; you just gained a column.

```
GROUP BY  →  squashes                    Window function  →  annotates
┌─────────┬───────────────┐              ┌───────┬───────┬───────┬───────────────┐
│ subject │ subject_total │              │ name  │ subj  │ score │ subject_total │
├─────────┼───────────────┤              ├───────┼───────┼───────┼───────────────┤
│ DBMS    │           411 │              │ Rahul │ DBMS  │    95 │           411 │
│ Maths   │           286 │              │ Sneha │ DBMS  │    72 │           411 │
└─────────┴───────────────┘              │ ...   │ ...   │   ... │           ... │
   2 rows, detail lost                   │ Priya │ Maths │    93 │           286 │
                                         └───────┴───────┴───────┴───────────────┘
                                            9 rows, detail kept + total added
```

---

## Why not just a subquery?

[08 §4](08-Subqueries.md) pasted a group value onto each row with a `GROUP BY` subquery joined back. Both *can* do "group total beside each row." The difference is **cost, and what's even expressible**.

**Subquery way — `GROUP BY` + a `JOIN` back (two passes):**

```sql
SELECT e.*, st.subject_total
FROM exam_scores e
JOIN (
    SELECT subject, SUM(score) AS subject_total
    FROM exam_scores GROUP BY subject
) st ON st.subject = e.subject;
```

**Window function — one pass, no join:**

```sql
SELECT *, SUM(score) OVER (PARTITION BY subject) AS subject_total
FROM exam_scores;
```

For that simple case they're interchangeable; the window version is just shorter. Window functions **earn their keep** on things a `GROUP BY` subquery can't do cleanly, because `GROUP BY` throws the individual rows away:

| Task | Subquery approach | Window function |
|---|---|---|
| Group total beside each row | works (needs a join back) | `SUM(x) OVER (PARTITION BY g)` — 1 pass |
| **Running / cumulative total** | painful self-join, slow | `SUM(x) OVER (ORDER BY d)` — trivial (§4) |
| **Ranking** (1st, 2nd, 3rd…) | correlated subquery counting "rows above me" — **O(n²)** | `RANK() OVER (ORDER BY x DESC)` (§5) |
| **Previous / next row's value** | impossible with plain aggregates | `LAG(x)` / `LEAD(x)` (§6) |
| **Row's share of its group** (`%`) | join back, then divide | `x * 100.0 / SUM(x) OVER (PARTITION BY g)` in one expression |

> Short version: if you just want a group value pasted on and don't mind the join, a subquery is fine. The moment **order within the group matters** — running sums, rankings, neighbour comparisons — reach for a window function.

---

## 1️⃣ The `OVER()` blueprint

A window function is **any aggregate/ranking function followed by `OVER( … )`**. Inside the parentheses you describe the *window* — the set of rows the function looks at for each row.

```sql
<function>(...)  OVER (
    PARTITION BY <column>     -- optional: split rows into groups; restart the calc per group
    ORDER BY     <column>     -- optional: order rows within the group; makes the calc "running"
    -- optional frame, e.g.  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)  AS <alias>
```

| Piece | What it does | Omit it → |
|---|---|---|
| `OVER ()` | Marks this as a window function; empty = "the whole result set is one window" | (required — it's what makes it a window function) |
| `PARTITION BY col` | Cuts rows into groups; the function resets at each group boundary | The whole result is one group |
| `ORDER BY col` (inside `OVER`) | Sorts rows within each partition; the window becomes "all rows up to and including this one" → running total / ranking | The function sees the *entire* partition for every row (no running effect) |

Two flavours you'll use constantly:

- **`SUM(x) OVER (PARTITION BY g)`** → the same group total on every row of the group.
- **`SUM(x) OVER (PARTITION BY g ORDER BY d)`** → a **running** total that grows row by row within the group (a bank statement's closing balance after each transaction).

---

## 2️⃣ `PARTITION BY` alone — a group total on every row

```sql
SELECT *,
       SUM(score) OVER (PARTITION BY subject) AS subject_total
FROM exam_scores;
```
```text
 exam_id | student_id | subject | score | subject_total
---------+------------+---------+-------+---------------
       1 |          1 | DBMS    |    95 |           411
       5 |          3 | DBMS    |    91 |           411
       7 |          4 | DBMS    |    98 |           411
       3 |          2 | DBMS    |    72 |           411
       9 |          5 | DBMS    |    55 |           411
       2 |          1 | Maths   |    88 |           286
       4 |          2 | Maths   |    60 |           286
       6 |          3 | Maths   |    45 |           286
       8 |          4 | Maths   |    93 |           286
(9 rows)
```
> All 9 rows survive. Every `DBMS` row shows `411`, every `Maths` row shows `286`. `PARTITION BY subject` = "compute `SUM(score)` separately per subject, then paste that subject's total onto each of its rows."

### `PARTITION BY` vs `ORDER BY` (inside `OVER`)

They answer different questions and are **not interchangeable**:

| | `PARTITION BY` | `ORDER BY` (inside `OVER`) |
|---|---|---|
| **Job** | *Which rows* are in this row's window (the group) | *In what sequence* those rows are considered |
| **Effect on the number** | Resets the calculation at each group boundary | Turns a whole-group calc into a **running / cumulative** one (row 1, rows 1–2, rows 1–3 …) |
| **Analogy** | "Sort the deck into suits" | "Within a suit, deal the cards low-to-high" |
| **Omit it →** | one big group (the whole result) | the function sees the entire partition at once — no running effect, no ranking sequence |

> `ORDER BY` inside `OVER( … )` is **completely separate** from the `ORDER BY` at the end of the query. The inner one orders the *window*; the outer one orders the *final output rows*.

### `PARTITION BY` vs `GROUP BY`

Both "split rows into groups and compute an aggregate per group." The difference is **what comes out**:

| | `GROUP BY` | `PARTITION BY` (inside `OVER`) |
|---|---|---|
| **Row count** | **Collapses** each group to **one** row | **Keeps every** input row |
| **Where it lives** | A clause of the whole query — changes the query's shape | Only inside `OVER( … )` — changes one column |
| **Other columns** | Only grouped columns + aggregates are selectable | **Every** column is still selectable (same row) |
| **Multiple aggregates** | All share the one `GROUP BY` | Each window function can partition **differently** in the same `SELECT` |
| **Result** | A summary table | The original table + extra annotation column(s) |

> Mental model: `GROUP BY` **folds** the group down to a summary; `PARTITION BY` **reflects** the summary back onto each member. Question is "one number per group"? → `GROUP BY`. "Each row, *plus* its group's number"? → `PARTITION BY`.
>
> You can mix them: a window function can `PARTITION BY` a *different* column than the query's `GROUP BY` (§5 does exactly this).

---

## 3️⃣ Aggregate window functions — the family

Any aggregate works with `OVER()`: `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`. Same rule — add `OVER()`, keep every row.

```sql
SELECT s.name, e.subject, e.score,
       AVG(e.score)  OVER (PARTITION BY e.subject)           AS subject_avg,
       MAX(e.score)  OVER (PARTITION BY e.subject)           AS subject_high,
       COUNT(*)      OVER (PARTITION BY e.subject)           AS subject_count,
       e.score - AVG(e.score) OVER (PARTITION BY e.subject)  AS diff_from_subject_avg
FROM exam_scores e
JOIN students s ON s.student_id = e.student_id;
```
```text
 name  | subject | score |    subject_avg      | subject_high | subject_count | diff_from_subject_avg
-------+---------+-------+---------------------+--------------+---------------+-----------------------
 Rahul | DBMS    |    95 | 82.2000000000000000 |           98 |             5 |   12.8000000000000000
 Amit  | DBMS    |    91 | 82.2000000000000000 |           98 |             5 |    8.8000000000000000
 ...   | ...     |   ... | ...                 |          ... |           ... |                   ...
 Priya | Maths   |    93 | 71.5000000000000000 |           93 |             4 |   21.5000000000000000
(9 rows)
```
> `diff_from_subject_avg` mixes a raw column (`e.score`) with a window function in one expression — legal, because the window function resolves to a value *per row*. This is the "compare each row to its group" pattern that the subquery version needs a join for.

---

## 4️⃣ `PARTITION BY` + `ORDER BY` — a running balance

Uses `bank_transactions` from [00](00-Setup-Postgres-VSCode-psql.md).

```sql
SELECT *,
       SUM(amount) OVER (
           PARTITION BY account_holder
           ORDER BY transaction_date
       ) AS closing_balance
FROM bank_transactions;
```
```text
 txn_id | account_holder | transaction_date | transaction_type | amount  | closing_balance
--------+----------------+------------------+------------------+---------+-----------------
      5 | Rahul          | 2026-01-01       | DEPOSIT          | 2000.00 |         2000.00
      6 | Rahul          | 2026-01-04       | WITHDRAW         | -300.00 |         1700.00
      7 | Rahul          | 2026-01-06       | DEPOSIT          |  400.00 |         2100.00
      1 | Shubham        | 2026-01-01       | DEPOSIT          | 1000.00 |         1000.00
      2 | Shubham        | 2026-01-03       | WITHDRAW         | -200.00 |          800.00
      3 | Shubham        | 2026-01-05       | DEPOSIT          |  500.00 |         1300.00
      4 | Shubham        | 2026-01-07       | WITHDRAW         | -100.00 |         1200.00
(7 rows)
```
> Adding `ORDER BY transaction_date` changed `SUM` from "whole-group total" to **"total of every row from the start of this person's history up to and including this one"** — a running balance. `PARTITION BY account_holder` keeps Rahul's running total from leaking into Shubham's — each person restarts at their first transaction.

### The frame clause (a quick note)

When you add `ORDER BY` inside `OVER`, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — "everything from the start of the partition to here." You can narrow it:

```sql
AVG(amount) OVER (
    PARTITION BY account_holder ORDER BY transaction_date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW      -- a 3-row moving average
) AS moving_avg_3
```

You won't need custom frames often; know they exist for moving averages and "last N rows" calculations.

---

## 5️⃣ Ranking functions — `ROW_NUMBER()` vs `RANK()` vs `DENSE_RANK()`

### 🧠 Analogy: finishing positions in a race

They all answer "**what position is this row in, when I sort the group by some value?**" They differ only in how they treat a dead heat:

- **`ROW_NUMBER()`** — the referee *must* break every tie. Two runners cross together? One is 2nd, the other 3rd (which one, arbitrary).
- **`RANK()`** — ties are honoured: two joint-2nd runners. But the next runner is **4th** — the 3rd spot is used up by the tie.
- **`DENSE_RANK()`** — ties honoured *and* no position skipped: two joint-2nd, then the next is **3rd**. It counts *distinct values*, not rows.

### The blueprint

Ranking functions take **no arguments** — `()` is always empty. Everything comes from `OVER()`:

```sql
ROW_NUMBER() OVER (
    PARTITION BY <group column>    -- optional: restart numbering at 1 per group
    ORDER BY     <rank-by column>  -- REQUIRED: what "position" means. Add DESC for "highest = rank 1"
)  AS <alias>
```

### Example — rank employees within their department by salary (`company` dataset)

```sql
SELECT name, department, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank_num,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_num
FROM employees;
```
```text
  name  | department  |  salary  | row_num | rank_num | dense_num
--------+-------------+----------+---------+----------+-----------
 Aditi  | Engineering | 95000.00 |       1 |        1 |         1
 Rahul  | Engineering | 88000.00 |       2 |        2 |         2     ← tie
 Sneha  | Engineering | 88000.00 |       3 |        2 |         2     ← tie
 Kabir  | Engineering | 72000.00 |       4 |        4 |         3
 Meera  | Engineering | 65000.00 |       5 |        5 |         4
 Vikram | Sales       | 78000.00 |       1 |        1 |         1     ← tie
 Pooja  | Sales       | 78000.00 |       2 |        1 |         1     ← tie
 Arjun  | Sales       | 61000.00 |       3 |        3 |         2
 Farah  | Marketing   | 70000.00 |       1 |        1 |         1
 Dev    | Marketing   | 52000.00 |       2 |        2 |         2
```

Reading Engineering's `88000` tie (Rahul & Sneha):

```text
 salary | ROW_NUMBER | RANK | DENSE_RANK
--------+------------+------+------------
  95000 |          1 |    1 |          1
  88000 |          2 |    2 |          2     ← tie
  88000 |          3 |    2 |          2     ← tie
  72000 |          4 |    4 |          3
               ▲          ▲          ▲
               |          |          └─ next value after a tie: +1, NO gap        → 1,2,2,3
               |          └─ tied rows share, then the next SKIPS the gap          → 1,2,2,4
               └─ never ties: every row a unique running number                    → 1,2,3,4
```

- `RANK()` = "**rows sorted strictly before me, + 1**" → 3 rows before `72000` → rank `4`.
- `DENSE_RANK()` = "**distinct values before me, + 1**" → 2 distinct values (`95000`, `88000`) → rank `3`.

| Function | On a tie | After the tie | Use it when |
|---|---|---|---|
| `ROW_NUMBER()` | forces different numbers (arbitrary) | continues `+1` | you need **exactly one row per group** — "the top earner", dedup, paginate |
| `RANK()` | tied rows share a number | **skips** — leaves a gap (1,2,2,4) | leaderboards where "joint 2nd → no 3rd" is correct |
| `DENSE_RANK()` | tied rows share a number | **no gap** (1,2,2,3) | "the **Nth distinct** highest value" — 2nd-highest salary, top-3 price tiers |

---

## 6️⃣ `LAG()` / `LEAD()` — peek at the previous / next row

```sql
SELECT account_holder, transaction_date, amount,
       LAG(amount)  OVER (PARTITION BY account_holder ORDER BY transaction_date) AS prev_amount,
       LEAD(amount) OVER (PARTITION BY account_holder ORDER BY transaction_date) AS next_amount,
       amount - LAG(amount) OVER (PARTITION BY account_holder ORDER BY transaction_date) AS change_vs_prev
FROM bank_transactions;
```
> `LAG(col)` returns `col` from the row *before* this one in the window (`NULL` for the first row of a partition); `LEAD(col)` from the row *after*. This is how you compute "change since last transaction", "days between signups", "this month vs last month" — without a self-join.

Also in this family: `NTILE(n)` (split each partition into `n` roughly-equal buckets — quartiles, percentiles), `FIRST_VALUE(col)` / `LAST_VALUE(col)` (the first / last value in the window frame).

---

## 7️⃣ The classic: "Nth highest per group"

**You cannot filter on a window function in `WHERE`** — window functions run *after* `WHERE`/`GROUP BY`/`HAVING`, in the `SELECT` step. To filter on a rank, compute it in a **CTE** (or subquery), then filter in the outer query.

### 3rd highest salary — overall

```sql
WITH ranked AS (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT DISTINCT salary FROM ranked WHERE rnk = 3;
```
```text
  salary
----------
 72000.00
(1 row)
```
> Ranks: `95000` → 1, `88000` (Rahul & Sneha tied) → 2, `72000` → 3. `DENSE_RANK` steps by *distinct value*, so "3rd highest" correctly means the 3rd distinct salary, `72000` — not the 3rd row.

### 3rd highest salary — **per department** (the interview favourite)

```sql
WITH ranked AS (
    SELECT department, name, salary,
           DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
    FROM employees
)
SELECT department, name, salary
FROM ranked
WHERE salary_rank = 3;
```
```text
 department  | name  |  salary
-------------+-------+----------
 Engineering | Kabir | 72000.00
(1 row)
```

- **`PARTITION BY department` is the key move** — it resets the ranking counter for every department independently, so "3rd highest in Engineering" and "3rd highest in Sales" are computed in one query, not one query per department.
- Engineering's distinct tiers: `95000`(1) → `88000`(2, tied) → `72000`(3, Kabir). **Sales** has only two distinct tiers (`78000` tied at rank 1, `61000` at rank 2), so it contributes **zero rows** at `salary_rank = 3` — there simply is no 3rd tier. **Marketing** likewise. That's correct behaviour, not a bug.
- Change `WHERE salary_rank = 3` to `= 1` for each department's top earner, `<= 3` for the top three per department.
- **`DENSE_RANK` vs `ROW_NUMBER` here:** use `DENSE_RANK` for "3rd *distinct* salary even if people tie above." Use `ROW_NUMBER` if you want *exactly one* row per department no matter what (e.g. "give me one 3rd-place person, tie-break arbitrarily").

### Same result without window functions (correlated subquery — works on old databases, slower)

```sql
SELECT e1.department, e1.name, e1.salary
FROM employees e1
WHERE 2 = (
    SELECT COUNT(DISTINCT e2.salary)
    FROM employees e2
    WHERE e2.department = e1.department AND e2.salary > e1.salary
);
-- "exactly 2 distinct salaries in my department are higher than mine" ⇒ I'm 3rd
```
Same single row (Kabir) — confirms the `DENSE_RANK` logic.

---

## 🔑 Window functions — key facts

- **They never remove rows.** `WHERE` / `GROUP BY` change the row count; window functions never do.
- **They run *after* `WHERE`, `GROUP BY`, `HAVING`** — you can't reference one in `WHERE`. Wrap in a CTE/subquery and filter outside.
- **`OVER()` is mandatory** — it's what separates `SUM(x) OVER(...)` (window, keeps rows) from `SUM(x)` + `GROUP BY` (aggregate, collapses rows).
- Common members: `SUM/AVG/MIN/MAX/COUNT ... OVER()`, `ROW_NUMBER/RANK/DENSE_RANK`, `LAG/LEAD`, `NTILE(n)`, `FIRST_VALUE/LAST_VALUE`.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| `GROUP BY` vs `PARTITION BY`? | `GROUP BY` collapses each group to one row; `PARTITION BY` keeps every row and annotates it with the group's value |
| `RANK()` vs `DENSE_RANK()` vs `ROW_NUMBER()`? | `RANK` skips after ties (1,2,2,4); `DENSE_RANK` doesn't (1,2,2,3); `ROW_NUMBER` never ties (1,2,3,4) |
| Why can't you use a window function in `WHERE`? | Window functions are computed after `WHERE`/`GROUP BY`/`HAVING` — wrap in a CTE and filter outside |
| How do you get the Nth highest salary per department? | `DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC)` in a CTE, then `WHERE rank = N` |
| What does `PARTITION BY` do that `GROUP BY` can't? | Keep the detail rows while still showing each group's aggregate; and partition different columns per window function in one `SELECT` |
| What are `LAG` / `LEAD` for? | Reading the previous / next row's value without a self-join — change-over-time calculations |
| What does adding `ORDER BY` inside `OVER()` do to `SUM`? | Turns a whole-group total into a running/cumulative total |

---

**Next up:** [11-Views.md](11-Views.md) — saving a query as a reusable virtual table, and materialized views.
