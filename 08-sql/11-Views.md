# Views
## Part 11 of 19 — Saving a Query as a Reusable Virtual Table

> Previous: [10-Window-Functions.md](10-Window-Functions.md)
> Uses the **`company`** dataset from [00](00-Setup-Postgres-VSCode-psql.md).

---

## 📌 Executive Summary

- A **view** is a **saved `SELECT` statement** that you query like a table. It stores **no data** — every time you `SELECT` from it, the underlying query runs fresh against the real tables.
- Use it to (1) name and reuse a complex query across many places, (2) hide join/filter complexity behind a simple name, (3) expose a restricted slice of a table to some users (only certain columns/rows).
- A **CTE** lives for one statement; a **view** is permanent and shared. That's the core difference.
- A view is often **updatable** (you can `INSERT`/`UPDATE`/`DELETE` through it) *if* it's a simple single-table `SELECT` with no aggregation, `DISTINCT`, `GROUP BY`, etc. Anything complex is read-only.
- A **materialized view** *does* store its result on disk — a cached snapshot. It's fast to read but **stale** until you `REFRESH` it. Use it for expensive aggregations that don't need to be up-to-the-second.

---

## 🧠 Core Analogy: A Saved Search / Smart Playlist

- A **view** is a music app's **smart playlist**: "all songs rated 4★+, added this year, genre = jazz." You gave that rule a name. Open the playlist and it's evaluated *right now* against your library — add a matching song tomorrow and it appears automatically. The playlist stores no songs, just the rule.
- A **materialized view** is if you hit "download this playlist" — now it's a fixed list of files on your device. Instant to open, but it won't reflect songs added later until you re-download (`REFRESH`).

---

## 🪟 1. Creating and using a view

```sql
CREATE VIEW engineering_staff AS
SELECT employee_id, name, city, salary
FROM employees
WHERE department = 'Engineering';
```
```text
CREATE VIEW
```

Now query it exactly like a table:

```sql
SELECT name, salary FROM engineering_staff WHERE salary > 80000 ORDER BY salary DESC;
```
```text
 name  |  salary
-------+----------
 Aditi | 95000.00
 Rahul | 88000.00
 Sneha | 88000.00
(3 rows)
```

- No data was copied. `SELECT ... FROM engineering_staff` re-runs the stored `SELECT` (with your extra `WHERE`/`ORDER BY` folded in) against `employees`.
- Insert a new Engineering employee into `employees` and it shows up in the view immediately — the view is always live.

### A view over a complex query

The real payoff: hide a multi-join aggregation behind one name.

```sql
CREATE VIEW dept_salary_summary AS
SELECT department,
       COUNT(*)                AS headcount,
       ROUND(AVG(salary), 2)   AS avg_salary,
       MAX(salary)             AS top_salary
FROM employees
GROUP BY department;
```

```sql
SELECT * FROM dept_salary_summary ORDER BY avg_salary DESC;
```
```text
 department  | headcount | avg_salary | top_salary
-------------+-----------+------------+------------
 Engineering |         5 |   81600.00 |   95000.00
 Sales       |         3 |   72333.33 |   78000.00
 Marketing   |         2 |   61000.00 |   70000.00
(3 rows)
```
> Every report that needs per-department stats now says `SELECT ... FROM dept_salary_summary` instead of repeating the `GROUP BY`. Change the definition once (`CREATE OR REPLACE VIEW`) and every consumer gets the update.

---

## 2️⃣ Managing views

```sql
CREATE OR REPLACE VIEW engineering_staff AS      -- redefine without dropping first
SELECT employee_id, name, city, salary, hired_on
FROM employees WHERE department = 'Engineering';

DROP VIEW IF EXISTS engineering_staff;           -- remove it (underlying table untouched)

\dv                                              -- (psql) list all views
\d engineering_staff                             -- show a view's definition and columns
```

> `CREATE OR REPLACE` can add columns to the end, but can't remove or reorder existing ones — for that, `DROP VIEW` then `CREATE VIEW`.

---

## 3️⃣ Updatable views

If a view is a **simple `SELECT` from one table** — no `JOIN`, `GROUP BY`, `DISTINCT`, aggregates, `UNION`, window functions — Postgres lets you write through it:

```sql
CREATE VIEW active_engineers AS
SELECT employee_id, name, salary, city
FROM employees
WHERE department = 'Engineering';

UPDATE active_engineers SET salary = salary + 5000 WHERE name = 'Kabir';   -- rewrites the real row
INSERT INTO active_engineers (name, salary, city) VALUES ('Nisha', 60000, 'Pune');
```

- The `UPDATE` / `INSERT` is translated to run against `employees`.
- **Gotcha:** that `INSERT` creates a row with `department = NULL` (the view's `SELECT` doesn't include `department`, so the underlying column gets its default/NULL) — the new row **won't even appear in the view** because it fails the `WHERE department = 'Engineering'` filter. Add **`WITH CHECK OPTION`** to forbid writes that would fall outside the view:

```sql
CREATE VIEW active_engineers AS
SELECT employee_id, name, department, salary, city
FROM employees WHERE department = 'Engineering'
WITH CHECK OPTION;                 -- reject any INSERT/UPDATE whose result wouldn't match the WHERE
```

Anything with a join or aggregation is **read-only** — you'd write to the base tables directly, or use an `INSTEAD OF` trigger (advanced).

---

## 4️⃣ Materialized views — a cached snapshot

A plain view re-runs its query every time. If that query is expensive (scanning millions of rows to aggregate) and the data only needs to be fresh-ish, a **materialized view** stores the result on disk:

```sql
CREATE MATERIALIZED VIEW dept_salary_summary_mv AS
SELECT department, COUNT(*) AS headcount, ROUND(AVG(salary), 2) AS avg_salary
FROM employees
GROUP BY department;
```

```sql
SELECT * FROM dept_salary_summary_mv;      -- instant — reads the stored snapshot, no aggregation
```

- **It does not update automatically.** Insert new employees and the materialized view still shows the old numbers until you refresh:

```sql
REFRESH MATERIALIZED VIEW dept_salary_summary_mv;                 -- rebuild (locks the MV during rebuild)
REFRESH MATERIALIZED VIEW CONCURRENTLY dept_salary_summary_mv;    -- rebuild without blocking reads (needs a UNIQUE index on the MV)
```

- Typical use: a nightly-refreshed analytics dashboard, a leaderboard recomputed every few minutes, a search index. Anywhere "a few minutes stale" is acceptable and the live query is too slow to run per request.

| | **View** | **Materialized view** |
|---|---|---|
| Stores data? | No — re-runs the query each time | Yes — a snapshot on disk |
| Freshness | Always live | Stale until `REFRESH` |
| Read speed | As slow as the underlying query | Fast (just a table read) |
| Write-through? | Sometimes (simple views) | No |
| Use for | Naming/reusing/securing a query | Caching an expensive aggregation |

---

## 🆚 View vs CTE vs Materialized view

| | Lifetime | Stores data | Reusable across queries |
|---|---|---|---|
| **CTE** (`WITH`) | One statement | No | No |
| **View** | Permanent (until dropped) | No | Yes |
| **Materialized view** | Permanent | Yes (snapshot) | Yes |

If you're copy-pasting the same subquery into three different statements → make it a **view**. If it's one statement with repeated logic → **CTE**. If it's an expensive aggregation read far more often than the data changes → **materialized view**.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What is a view? | A saved `SELECT` you query like a table; it stores no data and runs fresh each time |
| View vs CTE? | A CTE exists for one statement; a view is permanent and shared across statements |
| Can you update data through a view? | Yes, if it's a simple single-table `SELECT` (no join/aggregate/`DISTINCT`); complex views are read-only |
| What does `WITH CHECK OPTION` do? | Rejects inserts/updates through the view whose result wouldn't satisfy the view's `WHERE` |
| What is a materialized view? | A view whose result is physically stored; fast to read but stale until `REFRESH` |
| When would you use a materialized view? | Expensive aggregations/dashboards where slightly stale data is acceptable |

---

**Next up:** [12-DCL-Roles-Grant-Revoke.md](12-DCL-Roles-Grant-Revoke.md) — who is allowed to do what: roles, `GRANT`, `REVOKE`.
