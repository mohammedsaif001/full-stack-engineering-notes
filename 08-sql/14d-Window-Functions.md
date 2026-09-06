# Window Functions — Explained From Scratch

> Part of the [14 — Advanced Queries](14-Subqueries-CTEs-Window-Functions.md) series · Previous: [14c — CTEs](14c-CTEs-Common-Table-Expressions.md)
> All examples use the [14a — Shared Dataset](14a-Shared-Dataset.md). 🎥 Tutorial: https://www.youtube.com/watch?v=Wh9yXS9sgio

---

## 🧠 Core Analogy

`GROUP BY` **collapses** a group into one summary row — you lose the individual rows.
A **window function** does a group-style calculation but **keeps every row**, adding the answer as an extra column next to it.

> "Show me each exam score, *and next to it* the total for that subject."

With `GROUP BY e.subject` you get one row per subject (`DBMS → 411`) and the individual scores vanish. With a window function you get **all 9 exam rows back**, each carrying its subject's total in a new column. The rows are still there; you just gained a column.

```
GROUP BY  →  squashes                    Window function  →  annotates
┌─────────┬───────────────┐              ┌───────┬───────┬───────┬───────────────┐
│ subject │ subject_total │              │ name  │ subj  │ score │ subject_total │
├─────────┼───────────────┤              ├───────┼───────┼───────┼───────────────┤
│ DBMS    │           411 │              │ Rahul │ DBMS  │    95 │           411 │
│ Maths   │           286 │              │ Sneha │ DBMS  │    72 │           411 │
└─────────┴───────────────┘              │ Amit  │ DBMS  │    91 │           411 │
   2 rows, detail lost                   │ Priya │ DBMS  │    98 │           411 │
                                         │ Rohan │ DBMS  │    55 │           411 │
                                         │ Rahul │ Maths │    88 │           286 │
                                         │ ...   │ ...   │   ... │           ... │
                                         └───────┴───────┴───────┴───────────────┘
                                            9 rows, detail kept + total added
```

---

## Why not just a subquery?

[14b §3](14b-Subqueries.md#3-subquery-in-from--a-derived-table-aka-inline-view) put a group value (`avg_score`) next to each row using a `GROUP BY` subquery joined back. Both approaches *can* paste a group value onto every row. The difference is **cost, and what's even expressible**.

**The subquery way needs `GROUP BY` + a `JOIN` back — two passes over the data:**

```sql
SELECT e.*, subject_totals.subject_total
FROM exam_scores AS e
INNER JOIN (
    SELECT subject, SUM(score) AS subject_total
    FROM exam_scores
    GROUP BY subject                       -- pass 1: aggregate
) AS subject_totals ON subject_totals.subject = e.subject;   -- pass 2: scan + join back
```

**The window function is one pass, no join:**

```sql
SELECT *, SUM(score) OVER (PARTITION BY subject) AS subject_total
FROM exam_scores;
```

For this simple "group total beside each row" case they're interchangeable — the window version is just shorter. Window functions **earn their keep** on things a `GROUP BY` subquery *cannot* do cleanly, because `GROUP BY` throws the individual rows away:

| Task | Subquery approach | Window function |
|---|---|---|
| Group total beside each row | works (needs a join back) | `SUM(x) OVER (PARTITION BY g)` — shorter, 1 pass |
| **Running / cumulative total** | painful self-join, slow | `SUM(x) OVER (ORDER BY d)` — trivial (see §4) |
| **Ranking** (1st, 2nd, 3rd…) | correlated subquery counting "rows above me" — **O(n²)** | `RANK() OVER (ORDER BY x DESC)` (see §5) |
| **Previous / next row's value** | impossible with plain aggregates | `LAG(x)` / `LEAD(x)` |
| **Row's share of its group** (`%`) | join back, then divide | `x * 100.0 / SUM(x) OVER (PARTITION BY g)` in one expression |

> Short version: if you just want a group value pasted on and don't mind the join, a subquery is fine. The moment **order within the group matters** — running sums, rankings, neighbour comparisons — reach for a window function; the subquery version is either impossible or O(n²).

---

## 1. The `OVER()` blueprint (learn the skeleton first)

A window function is **any aggregate/ranking function followed by `OVER( … )`**. The `OVER()` is what makes it a *window* function instead of a plain aggregate. Inside the parentheses you describe the "window" — the set of rows the function looks at for each row.

```sql
<function>(...)  OVER (
    PARTITION BY <column>     -- optional: split rows into groups; restart the calc per group
    ORDER BY     <column>     -- optional: order rows within the group; makes the calc "running"
)  AS <alias>
```

| Piece | What it does | If you omit it |
|---|---|---|
| `OVER ()` | Marks this as a window function; empty = "the whole result set is one window" | — (required) |
| `PARTITION BY col` | Cuts the rows into groups; the function resets at each group boundary | The whole result is a single group |
| `ORDER BY col` | Sorts rows inside each partition; the window becomes "all rows *up to and including* this one" → running total / ranking | The function sees the *entire* partition for every row (no running effect) |

Two flavours you'll use constantly:

- **`SUM(x) OVER (PARTITION BY g)`** → same total on every row of the group (a "group total" column).
- **`SUM(x) OVER (PARTITION BY g ORDER BY d)`** → a **running** total that grows row by row within the group (like a bank statement: closing balance after each transaction).

---

## 2. `PARTITION BY` alone — a group total on every row

```sql
-- ! Window function
SELECT
    *,
    SUM(e.score) OVER (
        PARTITION BY e.subject
    ) AS subject_total
FROM exam_scores AS e;
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

> All 9 rows survive. Every `DBMS` row shows `411` (95+91+98+72+55), every `Maths` row shows `286` (88+60+45+93). `PARTITION BY e.subject` said "compute `SUM(score)` separately for each subject, then paste that subject's total onto each of its rows."

### `PARTITION BY` vs `ORDER BY` — what's the difference?

They answer different questions and are **not interchangeable**:

| | `PARTITION BY` | `ORDER BY` (inside `OVER`) |
|---|---|---|
| **Job** | *Which rows* are in this row's window (the group) | *In what sequence* those rows are considered |
| **Effect on the number** | Resets the calculation at each group boundary | Turns a whole-group calc into a **running / cumulative** one (row 1, rows 1-2, rows 1-3 …) |
| **Analogy** | "Sort the deck into suits" | "Within a suit, deal the cards low-to-high" |
| **Omit it and…** | there's just one big group (the whole result) | the function sees the entire partition at once — no running effect, no ranking sequence |

> `ORDER BY` inside `OVER( … )` is **completely separate** from the `ORDER BY` at the end of the query. The one inside orders the *window*; the one at the end orders the *final output rows*.

### `PARTITION BY` vs `GROUP BY` — what's the difference?

They both "split rows into groups and compute an aggregate per group." The difference is **what comes out the other end**:

| | `GROUP BY` | `PARTITION BY` (inside `OVER`) |
|---|---|---|
| **Row count** | **Collapses** each group to **one** row | **Keeps every** input row |
| **Where it goes** | A clause of the whole query — changes the query's shape | Only inside `OVER( … )` — changes one column |
| **Other columns** | Only grouped columns + aggregates are selectable | **Every** column is still selectable (it's the same row) |
| **How many aggregates** | All aggregates share the one `GROUP BY` | Each window function can partition **differently** in the same `SELECT` |
| **Result** | A summary table | The original table + extra annotation column(s) |

Same question, both ways — "total score per subject":

```sql
-- GROUP BY: 2 rows out, individual scores gone
SELECT subject, SUM(score) AS subject_total
FROM exam_scores
GROUP BY subject;
```
```text
 subject | subject_total
---------+---------------
 DBMS    |           411
 Maths   |           286
(2 rows)
```

```sql
-- PARTITION BY: 9 rows out, every score still there, total pasted alongside
SELECT subject, score,
       SUM(score) OVER (PARTITION BY subject) AS subject_total
FROM exam_scores;
```
```text
 subject | score | subject_total
---------+-------+---------------
 DBMS    |    95 |           411
 DBMS    |    91 |           411
 ...     |   ... |           ...
 Maths   |    93 |           286
(9 rows)
```

> Mental model: `GROUP BY` **folds** the group down to a summary; `PARTITION BY` **reflects** the summary back onto each member of the group. If the question is "one number per group," use `GROUP BY`. If it's "each row, *plus* its group's number," use `PARTITION BY`.

> You can even mix them: `PARTITION BY` in a window function can slice by a *different* column than the query's `GROUP BY` — e.g. `GROUP BY student_id` while a window function does `... OVER (PARTITION BY branch)` in the same `SELECT` (this is exactly what §5 does).

---

## 3. Aggregate window functions — the family

Any aggregate works as a window function: `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`. Same rule — add `OVER()`, keep every row.

```sql
SELECT
    s.name,
    e.subject,
    e.score,
    AVG(e.score) OVER (PARTITION BY e.subject)              AS subject_avg,
    MAX(e.score) OVER (PARTITION BY e.subject)              AS subject_high,
    COUNT(*)     OVER (PARTITION BY e.subject)              AS subject_count,
    e.score - AVG(e.score) OVER (PARTITION BY e.subject)    AS diff_from_subject_avg
FROM exam_scores AS e
INNER JOIN students AS s ON s.student_id = e.student_id;
```

```text
 name  | subject | score |     subject_avg      | subject_high | subject_count | diff_from_subject_avg
-------+---------+-------+----------------------+--------------+---------------+-----------------------
 Rahul | DBMS    |    95 | 82.2000000000000000  |           98 |             5 |   12.8000000000000000
 Amit  | DBMS    |    91 | 82.2000000000000000  |           98 |             5 |    8.8000000000000000
 Priya | DBMS    |    98 | 82.2000000000000000  |           98 |             5 |   15.8000000000000000
 Sneha | DBMS    |    72 | 82.2000000000000000  |           98 |             5 |  -10.2000000000000000
 Rohan | DBMS    |    55 | 82.2000000000000000  |           98 |             5 |  -27.2000000000000000
 Rahul | Maths   |    88 | 71.5000000000000000  |           93 |             4 |   16.5000000000000000
 Sneha | Maths   |    60 | 71.5000000000000000  |           93 |             4 |  -11.5000000000000000
 Amit  | Maths   |    45 | 71.5000000000000000  |           93 |             4 |  -26.5000000000000000
 Priya | Maths   |    93 | 71.5000000000000000  |           93 |             4 |   21.5000000000000000
(9 rows)
```

> `diff_from_subject_avg` mixes a raw column (`e.score`) with a window function in one expression — perfectly legal, because the window function resolves to a value *per row*. This is the "compare each row to its group" pattern the subquery version needs a join for.

---

## 4. `PARTITION BY` + `ORDER BY` — a running balance

Uses the `bank_transactions` table from [14a](14a-Shared-Dataset.md#extra-table--bank_transactions).

```sql
SELECT
    *,
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

> Adding `ORDER BY transaction_date` changed `SUM` from "whole-group total" to **"total of every row from the start of this person's history up to and including this one"** — a running balance. `PARTITION BY account_holder` keeps Rahul's running total from leaking into Shubham's: each person's balance **restarts** at their first transaction.

---

## 5. Ranking window functions — `ROW_NUMBER()` vs `RANK()` vs `DENSE_RANK()`

### 🧠 Core Analogy

These three answer "**what position is this row in, when I sort the group by some value?**" — like handing out finishing positions in a race. They differ only in **how they treat a dead heat**:

- **`ROW_NUMBER()`** — the referee *must* break every tie. Two runners cross together? One is still called 2nd, the other 3rd (which one is arbitrary).
- **`RANK()`** — ties are honoured: two joint-2nd runners. But the next runner is **4th**, not 3rd — the 3rd spot is "used up" by the tie.
- **`DENSE_RANK()`** — ties are honoured *and* no position is skipped: two joint-2nd runners, then the next is **3rd**. It counts *distinct values*, not rows.

### The blueprint

Ranking functions take **no arguments** — the `()` is always empty. All the information comes from `OVER()`:

```sql
ROW_NUMBER() OVER (
    PARTITION BY <group column>    -- optional: restart numbering at 1 for each group
    ORDER BY     <rank-by column>  -- REQUIRED: what "position" means — the sort key
)  AS <alias>
```

| Piece | For ranking functions |
|---|---|
| `ROW_NUMBER() / RANK() / DENSE_RANK()` | empty parentheses — no arguments ever |
| `ORDER BY` inside `OVER()` | **mandatory** — there is no "position" without a sort key. Add `DESC` for "highest = rank 1" |
| `PARTITION BY` inside `OVER()` | optional — with it, numbering restarts per group; without it, one ranking over the whole result |

### The example

"Rank students **within their branch** by total exam score, highest first":

```sql
-- ! RANKING WINDOW FUNCTIONS
-- ? ROW_NUMBER(), RANK(), DENSE_RANK()

SELECT
    s.name,
    s.branch,
    SUM(e.score) AS total_score,
    ROW_NUMBER() OVER (
        PARTITION BY s.branch
        ORDER BY SUM(e.score) DESC
    ) AS row_num,
    RANK() OVER (
        PARTITION BY s.branch
        ORDER BY SUM(e.score) DESC
    ) AS rank_num,
    DENSE_RANK() OVER (
        PARTITION BY s.branch
        ORDER BY SUM(e.score) DESC
    ) AS dense_rank_num
FROM exam_scores AS e
INNER JOIN students AS s ON s.student_id = e.student_id
GROUP BY e.student_id, s.name, s.branch;
```

```text
 name  | branch | total_score | row_num | rank_num | dense_rank_num
-------+--------+-------------+---------+----------+----------------
 Priya | CSE    |         191 |       1 |        1 |              1
 Rahul | CSE    |         183 |       2 |        2 |              2
 Amit  | ECE    |         136 |       1 |        1 |              1
 Sneha | IT     |         132 |       1 |        1 |              1
 Rohan | ME     |          55 |       1 |        1 |              1
(5 rows)
```

**Reading it:**
- `PARTITION BY s.branch` → numbering **restarts at 1** for every branch. That's why CSE has a 1 and a 2, but ECE/IT/ME each start over at 1 (they have one student each).
- `ORDER BY SUM(e.score) DESC` → rank 1 = highest total. Priya (191) beats Rahul (183) in CSE.
- This query also has a plain `GROUP BY e.student_id` (to compute `SUM(e.score)` per student) *and* a window `PARTITION BY s.branch` in the same `SELECT` — the two slice by different columns, which is fine (see §2's mix note).

### Where the three differ: ties

Our dataset has no ties, so all three columns above are identical. **The difference only appears when the `ORDER BY` value repeats.** Imagine four students in one branch with totals `191, 183, 183, 150`:

```text
 total_score | ROW_NUMBER | RANK | DENSE_RANK
-------------+------------+------+------------
         191 |          1 |    1 |          1
         183 |          2 |    2 |          2     ← tie
         183 |          3 |    2 |          2     ← tie
         150 |          4 |    4 |          3
                    ▲          ▲          ▲
                    |          |          └─ next value after a tie: +1 (NO gap)     → 1,2,2,3
                    |          └─ tied rows share a rank, then the next SKIPS ahead   → 1,2,2,4
                    └─ never ties: every row gets a unique running number             → 1,2,3,4
```

Why `RANK()` jumps to 4: it's really "**how many rows sorted strictly before me, plus 1**". Three rows are ahead of the `150` row, so `3 + 1 = 4`. `DENSE_RANK()` is "**how many distinct values before me, plus 1**" → two distinct values (`191`, `183`) → `2 + 1 = 3`.

| Function | On a tie | Number after the tie | Column can have… | Reach for it when |
|---|---|---|---|---|
| `ROW_NUMBER()` | forces **different** numbers (tie broken arbitrarily) | continues `+1` | no duplicates, no gaps (1,2,3,4) | you need **exactly one row per group** — "the top scorer", dedup, paginate |
| `RANK()` | tied rows get the **same** number | **skips** — leaves a gap (1,2,2,**4**) | duplicates **and** gaps | leaderboards / competition standings where "joint 2nd → no 3rd" is correct |
| `DENSE_RANK()` | tied rows get the **same** number | **no gap** (1,2,2,**3**) | duplicates, no gaps | "the **Nth distinct** highest value" — 2nd-highest salary, top-3 price tiers |

### The classic use: "Nth highest per group"

You **can't** filter on a window function in `WHERE` (it's computed too late). Wrap it in a CTE, filter outside:

```sql
WITH ranked AS (
    SELECT
        s.name,
        s.branch,
        SUM(e.score) AS total_score,
        DENSE_RANK() OVER (
            PARTITION BY s.branch
            ORDER BY SUM(e.score) DESC
        ) AS rnk
    FROM exam_scores AS e
    INNER JOIN students AS s ON s.student_id = e.student_id
    GROUP BY e.student_id, s.name, s.branch
)
SELECT name, branch, total_score
FROM ranked
WHERE rnk = 1;                    -- the top scorer in each branch
```

```text
 name  | branch | total_score
-------+--------+-------------
 Priya | CSE    |         191
 Amit  | ECE    |         136
 Sneha | IT     |         132
 Rohan | ME     |          55
(4 rows)
```

> Change `WHERE rnk = 1` to `= 2` for the runner-up per branch, `<= 3` for the top three. Use `DENSE_RANK` when you want "2nd *distinct* highest even if two students tie for 1st"; use `ROW_NUMBER` when you want *exactly one* row back per group no matter what.

---

## Window functions — key facts

- **They don't remove rows.** `WHERE` and `GROUP BY` change the row count; window functions never do.
- **They run *after* `WHERE`, `GROUP BY`, `HAVING`** — you can't put a window function in a `WHERE` clause. To filter on one, wrap the query in a CTE/subquery and filter outside (the classic "Nth highest" pattern).
- **`OVER()` is mandatory** — it's the keyword that distinguishes `SUM(x) OVER(...)` (window, keeps rows) from `SUM(x)` + `GROUP BY` (aggregate, collapses rows).
- Other common ones: `AVG/MIN/MAX ... OVER()`, `LAG()` / `LEAD()` (peek at the previous / next row), `NTILE(n)` (split into n buckets), `FIRST_VALUE()` / `LAST_VALUE()`.

---

**Back to:** [14 — overview](14-Subqueries-CTEs-Window-Functions.md) · then [13-Interview-Quick-Reference-Whats-Next.md](13-Interview-Quick-Reference-Whats-Next.md)
