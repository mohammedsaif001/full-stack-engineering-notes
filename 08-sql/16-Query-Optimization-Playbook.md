# Query Optimization Playbook
## Part 16 of 19 — "This Query Is Slow" — A Step-by-Step Checklist

> Previous: [15-Transactions-ACID-Locking.md](15-Transactions-ACID-Locking.md)

---

## 📌 Executive Summary

- **Measure before you touch anything.** `EXPLAIN ANALYZE` shows the real plan and timing. Optimizing blind wastes time and often makes things worse.
- **The highest-leverage fix is almost always an index** on the columns in `WHERE` / `JOIN ... ON` / `ORDER BY` — but only once the table is big enough for it to matter.
- **`SELECT *` is a tax** — more I/O, more network, and it can defeat an Index Only Scan.
- **Certain patterns silently disable indexes:** wrapping an indexed column in a function (`LOWER(email)`), a leading-wildcard `LIKE '%x'`, a type mismatch in the comparison.
- **`EXISTS` beats `IN`** for existence checks on large subqueries; **keyset pagination** beats a deep `OFFSET`; **batched writes** beat a loop of single-row `INSERT`s.
- **Fresh statistics matter** — after a big bulk load, run `ANALYZE` so the planner makes good Seq-Scan-vs-Index-Scan decisions.

---

## 🧠 Core Analogy: A Doctor, Not a Mechanic Guessing

You don't prescribe before diagnosing. `EXPLAIN ANALYZE` is the blood test — it tells you *what* is actually slow (a full scan? a bad join order? sorting a million rows with no index?). Every step below is a treatment for a *specific* finding, applied in order of leverage. Skipping the diagnosis and "just adding indexes" is the mechanic who replaces parts until the noise stops.

---

## Step 1 — Measure with `EXPLAIN ANALYZE`

```sql
EXPLAIN ANALYZE
SELECT * FROM employees WHERE department = 'Engineering' AND salary > 50000;
```
```text
 Seq Scan on employees  (cost=0.00..1.10 rows=3 width=72) (actual time=0.015..0.019 rows=4 loops=1)
   Filter: (((department)::text = 'Engineering'::text) AND (salary > 50000))
   Rows Removed by Filter: 4
 Execution Time: 0.041 ms
```
> On a tiny 10-row table, `Seq Scan` is **correct** — the planner would reject an index here even if one existed. `EXPLAIN ANALYZE` output only becomes a red flag at scale (thousands to millions of rows). See [14](14-Indexing-Query-Performance.md) for the same pattern at 1,000,000 rows, where Seq vs Index is ~52 ms vs ~0.06 ms.

- **`EXPLAIN`** — the planned strategy, without running.
- **`EXPLAIN ANALYZE`** — actually runs it, with real timings. Careful on production writes (it executes the `INSERT`/`UPDATE`/`DELETE`).
- Look for: `Seq Scan` on a big table (bad), `Index Scan` / `Index Only Scan` (good), `actual time` (the real number), estimated `rows` vs actual `rows` wildly off (stale stats → run `ANALYZE`).

---

## Step 2 — Add the right index (and know when not to)

```sql
CREATE INDEX idx_emp_department ON employees (department);

-- Composite: most-filtered / most-selective column FIRST
CREATE INDEX idx_emp_dept_salary ON employees (department, salary);

-- Partial: only index the subset you actually query
CREATE INDEX idx_active_users ON app_users (email) WHERE is_active = TRUE;

-- Covering: include extra columns so the index alone answers the query
CREATE INDEX idx_cov ON employees (department) INCLUDE (name, salary);
```

- Index columns used in `WHERE`, `JOIN ... ON`, `ORDER BY`.
- **Don't over-index** — every index slows every write and costs disk. Index measured patterns, not hypotheticals.
- **Low-cardinality columns** (`BOOLEAN`, a 3-value `status`) index poorly — the index can't narrow enough; Postgres may Seq Scan anyway.
- **Composite order:** `(department, salary)` helps `WHERE department = ?` and `WHERE department = ? AND salary > ?`, but **not** `WHERE salary > ?` alone (leftmost-prefix rule).

---

## Step 3 — Stop using `SELECT *`

```sql
-- BAD: every column, wasted I/O and bandwidth
SELECT * FROM employees WHERE department = 'Engineering';

-- GOOD: only what the app uses
SELECT employee_id, name, salary FROM employees WHERE department = 'Engineering';
```
`SELECT *` also silently breaks an **Index Only Scan** — if the index doesn't contain every selected column, Postgres must visit the full row anyway.

---

## Step 4 — Don't disable your own indexes

```sql
-- BAD: function on the indexed column ⇒ the plain index can't be used
SELECT * FROM app_users WHERE LOWER(email) = 'john@example.com';

-- GOOD: build a functional index to match
CREATE INDEX idx_lower_email ON app_users (LOWER(email));
SELECT * FROM app_users WHERE LOWER(email) = 'john@example.com';   -- now uses it

-- BAD: leading wildcard ⇒ can't binary-search "ends with X", scans everything
SELECT * FROM app_users WHERE username LIKE '%smith';

-- OK: trailing wildcard ⇒ "starts with" can still use a B+Tree index
SELECT * FROM app_users WHERE username LIKE 'smith%';
```
Also defeats an index: comparing a column to a value of a different type (Postgres may add a cast that blocks the index).

---

## Step 5 — Filter early, before joining large tables

```sql
-- Narrow one side down before the join has to process it
SELECT s.name, i.company_name
FROM (SELECT * FROM students WHERE branch = 'Computer Science') s
JOIN internships i ON s.student_id = i.student_id;
```
Modern planners often reorder this automatically, but for very large or many-join queries, explicitly narrowing early helps the planner pick a better strategy.

---

## Step 6 — `EXISTS` over `IN` for existence checks

```sql
-- Can be slower — may build/check the whole list
SELECT * FROM students WHERE student_id IN (SELECT student_id FROM internships);

-- Usually faster — stops at the FIRST match per row
SELECT * FROM students s
WHERE EXISTS (SELECT 1 FROM internships i WHERE i.student_id = s.student_id);
```

---

## Step 7 — Keyset pagination instead of deep `OFFSET`

```sql
-- BAD at scale: OFFSET 100000 still walks past 100,000 rows internally
SELECT * FROM smart_watch_sales ORDER BY sale_id LIMIT 20 OFFSET 100000;

-- GOOD: jump using the last-seen key — no counting past rows, at any depth
SELECT * FROM smart_watch_sales
WHERE sale_id > 100000        -- the last id from the previous page
ORDER BY sale_id
LIMIT 20;
```

---

## Step 8 — Keep table statistics fresh

```sql
ANALYZE employees;              -- refresh the planner's row-count / distribution stats
VACUUM ANALYZE employees;       -- also reclaim space from dead (updated/deleted) rows
```
The planner's choices (Seq vs Index, join order) depend on **statistics**. After a large bulk insert/delete they can go stale and the planner makes a genuinely bad call. Postgres autovacuums in the background, but a manual `ANALYZE` after a big load is a good habit.

---

## Step 9 — Batch writes, don't loop single rows

```sql
-- SLOW: one network round trip per row
INSERT INTO students (first_name) VALUES ('A');
INSERT INTO students (first_name) VALUES ('B');

-- FAST: one round trip, many rows
INSERT INTO students (first_name) VALUES ('A'), ('B'), ('C');
```
Same data; the batched version is a **single** round trip. Local DB → invisible. App server → managed cloud DB → each round trip is 1–5 ms of latency; a loop of 1,000 single-row inserts turns a sub-second job into several seconds. This is one of the most common real-world performance bugs.

---

## ✅ The checklist, in order to actually try it

1. **Measure** with `EXPLAIN ANALYZE` — never optimize blind.
2. **Add an index** on `WHERE` / `JOIN` / `ORDER BY` columns — mind composite column order.
3. **Drop `SELECT *`** — select only needed columns.
4. **Don't wrap indexed columns in functions** — use a functional index if you must.
5. **Avoid leading-wildcard `LIKE '%x'`** on large tables.
6. **Prefer `EXISTS` over `IN`** for large existence checks.
7. **Keyset pagination** instead of large `OFFSET`.
8. **`ANALYZE`** after big data loads.
9. **Batch writes** instead of row-by-row loops.
10. Only after all of the above — **cache** (e.g. Redis, or a materialized view — [11](11-Views.md)) in front of read-heavy, rarely-changing queries.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| First step to optimize a slow query? | `EXPLAIN ANALYZE` — measure the real plan and timing before changing anything |
| Why avoid `SELECT *`? | Wastes I/O and bandwidth, and can prevent an Index Only Scan |
| Why does `WHERE LOWER(email) = ...` skip the index on `email`? | The function on the column means a plain index can't match — need a functional index on `LOWER(email)` |
| Why is deep `OFFSET` slow? | Postgres still walks past every skipped row — use keyset pagination (`WHERE id > last_seen`) |
| `IN` vs `EXISTS` for existence checks? | `EXISTS` can stop at the first match; `IN` may build/check the whole list |
| What does `ANALYZE` do? | Refreshes the planner's statistics so it makes good scan/join decisions |
| Why batch inserts? | Each statement is a network round trip; one multi-row `INSERT` replaces many |

---

**Next up:** [17-Interview-Query-Patterns.md](17-Interview-Query-Patterns.md) — worked solutions to the queries that show up in almost every SQL interview.
