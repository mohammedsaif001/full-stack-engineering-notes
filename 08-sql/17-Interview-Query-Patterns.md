# Classic Interview Query Patterns
## Part 17 of 19 — Worked Solutions to the Queries Every SQL Interview Asks

> Previous: [16-Query-Optimization-Playbook.md](16-Query-Optimization-Playbook.md)
> Uses the **`company`** dataset (`employees`) from [00](00-Setup-Postgres-VSCode-psql.md).

---

## 📌 Executive Summary

These are the ~12 patterns that appear in nearly every SQL interview and take-home. Each is built from clauses covered earlier — the goal is to show **how to reason through the pattern**, not to memorize a final query. The recurring tools:

- **`DENSE_RANK() OVER (PARTITION BY … ORDER BY … DESC)` in a CTE, filtered outside** — Nth highest, Nth-per-group, top-N-per-group.
- **`GROUP BY … HAVING COUNT(*) > 1`** — duplicates.
- **Self-join** — compare a row to another row in the same table (employee vs manager).
- **`CASE` inside `SUM`/`COUNT`** — pivot rows into columns.
- **`SUM(...) OVER (PARTITION BY … ORDER BY …)`** — running totals.
- **`NOT EXISTS` / `LEFT JOIN … IS NULL`** — anti-joins, gaps.

Reminder of the seed data ([00](00-Setup-Postgres-VSCode-psql.md)): 10 employees across Engineering (5), Sales (3), Marketing (2). Ties: Rahul & Sneha at 88000 (Engineering); Vikram & Pooja at 78000 (Sales).

---

## 1️⃣ Nth highest salary — overall

```sql
WITH ranked AS (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT DISTINCT salary FROM ranked WHERE rnk = 3;      -- change 3 → N
```
```text
  salary
----------
 72000.00
```
> Ranks by **distinct value**: `95000`→1, `88000` (Rahul & Sneha tied)→2, `78000` (Vikram & Pooja tied)→3... wait — 78000 is rank 3 here, not 72000. Let's be precise: distinct salaries descending are `95000, 88000, 78000, 72000, 70000, 65000, 61000, 52000`. So **3rd highest = 78000**. `DENSE_RANK` collapses the ties so "3rd highest" means the 3rd distinct salary, correctly skipping duplicate values but not skipping *rank numbers*.

### The `OFFSET` shortcut — and why it's fragile

```sql
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;   -- 3rd highest → 78000 ✅
```
Works **only because `DISTINCT salary` collapsed the ties first**. Drop the `DISTINCT`:

```sql
SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;           -- → 88000 ❌ WRONG
```
The ordered list is `95000, 88000, 88000, 78000, …` — skipping 2 rows lands on the *second* `88000`, not the 3rd distinct value. This is exactly the bug `DENSE_RANK()` avoids by design.

---

## 2️⃣ Nth highest salary — **per department** (the favourite)

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
```

- **`PARTITION BY department` is the key move** — the ranking counter resets for each department, so "3rd highest in Engineering" and "3rd in Sales" are computed independently in one query, not one query per department.
- Engineering distinct tiers: `95000`(1) → `88000`(2, tied) → `72000`(3, Kabir). **Sales** has only two distinct tiers (`78000` tied at 1, `61000` at 2) → contributes **no row** at rank 3. **Marketing** likewise. Correct behaviour — a department with fewer than N tiers simply has no Nth.
- `= 1` → each department's top earner; `<= 3` → top three per department.
- **`DENSE_RANK` vs `ROW_NUMBER`:** `DENSE_RANK` for "3rd *distinct* salary even if people tie above"; `ROW_NUMBER` for "*exactly one* row per department, tie-break arbitrarily."

### Without window functions (correlated subquery — portable, slower)

```sql
SELECT e1.department, e1.name, e1.salary
FROM employees e1
WHERE 2 = (
    SELECT COUNT(DISTINCT e2.salary)
    FROM employees e2
    WHERE e2.department = e1.department AND e2.salary > e1.salary
);
-- "exactly 2 distinct salaries in my department beat mine" ⇒ I'm 3rd
```
Same single row (Kabir) — confirms the `DENSE_RANK` logic.

---

## 3️⃣ Second highest salary — **without `LIMIT`/`OFFSET`** ("no shortcuts")

```sql
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```
```text
   max
----------
 88000.00
```
> Inner query: overall max (`95000`). Outer: the max salary strictly *below* that → `88000`. A common trick question that forces subquery reasoning.

---

## 4️⃣ Find duplicate values

```sql
SELECT email, COUNT(*)
FROM students
GROUP BY email
HAVING COUNT(*) > 1;
```
```text
       email       | count
-------------------+-------
 john@example.com  |     2
```
> `GROUP BY` the column, `HAVING COUNT(*) > 1` keeps only groups with more than one row. On a column with a `UNIQUE` constraint this always returns zero rows — it's most useful when **cleaning data before adding** a `UNIQUE` constraint, or on a never-constrained column.

To also see *which rows*:

```sql
SELECT * FROM students
WHERE email IN (
    SELECT email FROM students GROUP BY email HAVING COUNT(*) > 1
);
```

---

## 5️⃣ Self-join — employees who earn more than their manager

```sql
SELECT e.name AS employee, e.salary,
       m.name AS manager,  m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.employee_id      -- SELF JOIN
WHERE e.salary > m.salary;
```
```text
 employee | salary | manager | manager_salary
----------+--------+---------+----------------
(0 rows)
```
> Zero rows just means nobody out-earns their boss in this data — a correct query returning nothing is not a bug. `e` and `m` are the *same table* through two aliases. Any "compare a row to another row in the same table" question is a self-join.

---

## 6️⃣ Department with the highest average salary

```sql
SELECT department, ROUND(AVG(salary), 2) AS avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC
LIMIT 1;
```
```text
 department  | avg_salary
-------------+------------
 Engineering |   81600.00
```
> `(95000+88000+88000+72000+65000)/5 = 81600`. Sales ≈ 72333, Marketing = 61000 — excluded by `LIMIT 1` after the descending sort.

---

## 7️⃣ Running total per group

```sql
SELECT department, name, salary,
       SUM(salary) OVER (PARTITION BY department ORDER BY employee_id) AS running_dept_total
FROM employees
ORDER BY department, employee_id;
```
```text
 department  |  name  |  salary  | running_dept_total
-------------+--------+----------+--------------------
 Engineering | Aditi  | 95000.00 |           95000.00
 Engineering | Rahul  | 88000.00 |          183000.00
 Engineering | Sneha  | 88000.00 |          271000.00
 Engineering | Kabir  | 72000.00 |          343000.00
 Engineering | Meera  | 65000.00 |          408000.00
 Sales       | Vikram | 78000.00 |           78000.00
 Sales       | Pooja  | 78000.00 |          156000.00
 Sales       | Arjun  | 61000.00 |          217000.00
 Marketing   | Farah  | 70000.00 |           70000.00
 Marketing   | Dev    | 52000.00 |          122000.00
```
> Each department's running total **restarts** at its first row (`PARTITION BY department`), and grows in `employee_id` order (`ORDER BY` inside `OVER`). Sales' total is untouched by Engineering's, in the same single query.

---

## 8️⃣ Pivot — rows into columns (no `PIVOT` keyword in Postgres)

```sql
SELECT department,
       SUM(CASE WHEN salary >  75000 THEN 1 ELSE 0 END) AS high_earners,
       SUM(CASE WHEN salary <= 75000 THEN 1 ELSE 0 END) AS regular_earners
FROM employees
GROUP BY department;
```
```text
 department  | high_earners | regular_earners
-------------+--------------+-----------------
 Engineering |            3 |               2
 Sales       |            2 |               1
 Marketing   |            0 |               2
```
> `CASE` inside an aggregate turns one column's *values* into separate *output columns*. `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` counts matching rows; `COUNT(CASE WHEN cond THEN 1 END)` (no `ELSE`) does the same, relying on `COUNT` ignoring `NULL`.

---

## 9️⃣ Anti-join — rows with no related record

```sql
-- Employees who manage nobody (not referenced as anyone's manager_id)
SELECT e.name
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM employees r WHERE r.manager_id = e.employee_id
);
```
`NOT EXISTS` is the safe form (handles `NULL`s correctly, unlike `NOT IN`). The `LEFT JOIN … IS NULL` phrasing works too:

```sql
SELECT e.name
FROM employees e
LEFT JOIN employees r ON r.manager_id = e.employee_id
WHERE r.employee_id IS NULL;
```

---

## 🔟 Find gaps in a sequence (missing IDs)

```sql
-- Simulate a gap
DELETE FROM employees WHERE employee_id = 4;

SELECT t.employee_id + 1 AS missing_id
FROM employees t
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = t.employee_id + 1)
  AND     EXISTS (SELECT 1 FROM employees WHERE employee_id = t.employee_id + 2)
ORDER BY missing_id;
```
```text
 missing_id
------------
          4
```
> "An id where `id+1` doesn't exist but `id+2` does" = the start of a gap. Recall from [03](03-DDL-Constraints-Alter-Drop.md): id `4` will **never** be reused by future inserts — that's the `SERIAL` sequence behaviour.

A window-function version, "gap between consecutive rows":

```sql
SELECT employee_id AS after_id,
       LEAD(employee_id) OVER (ORDER BY employee_id) AS before_id,
       LEAD(employee_id) OVER (ORDER BY employee_id) - employee_id - 1 AS gap_size
FROM employees
WHERE LEAD(employee_id) OVER (ORDER BY employee_id) - employee_id > 1;
```

---

## 1️⃣1️⃣ Top-N per group (all of the top 3, per department)

```sql
WITH ranked AS (
    SELECT department, name, salary,
           DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT department, name, salary
FROM ranked
WHERE rnk <= 3
ORDER BY department, salary DESC;
```
> Same CTE-then-filter shape as pattern 2; just `<= 3` instead of `= 3`. Use `ROW_NUMBER` instead of `DENSE_RANK` if you want *at most* 3 rows per department even when there are ties at 3rd place.

---

## 1️⃣2️⃣ Latest row per group (most recent hire per department)

```sql
WITH ranked AS (
    SELECT department, name, hired_on,
           ROW_NUMBER() OVER (PARTITION BY department ORDER BY hired_on DESC) AS rn
    FROM employees
)
SELECT department, name, hired_on FROM ranked WHERE rn = 1;
```
Or the Postgres-specific shortcut:

```sql
SELECT DISTINCT ON (department) department, name, hired_on
FROM employees
ORDER BY department, hired_on DESC;
```
> `DISTINCT ON (department)` keeps the first row per department given the `ORDER BY` — the "latest / top-1 per group" pattern without a window function. (Postgres-only.)

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| Nth highest salary? | `DENSE_RANK() OVER (ORDER BY salary DESC)` in a CTE, filter `WHERE rnk = N` — handles ties, unlike `LIMIT/OFFSET` |
| Nth highest per group? | Same, plus `PARTITION BY <group>` so ranking resets per group |
| Second highest without `LIMIT`? | `SELECT MAX(salary) WHERE salary < (SELECT MAX(salary) ...)` |
| Find duplicates? | `GROUP BY col HAVING COUNT(*) > 1` |
| Compare a row to another row in the same table? | Self-join — alias the table twice |
| Pivot without a `PIVOT` keyword? | `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` per output column |
| Latest row per group? | `ROW_NUMBER() OVER (PARTITION BY g ORDER BY ts DESC)` filtered to `= 1`, or `DISTINCT ON (g)` in Postgres |
| Rows with no related record? | `NOT EXISTS (...)` or `LEFT JOIN ... WHERE right.id IS NULL` |

---

**Next up:** [18-Cheat-Sheet-Quick-Reference.md](18-Cheat-Sheet-Quick-Reference.md) — the whole series condensed: clause order, operator table, and a rapid-fire Q&A.
