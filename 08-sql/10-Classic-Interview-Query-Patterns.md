# Solving Classic SQL Interview Queries
## Worked Patterns: Nth Highest Salary, Duplicates, Self-Joins & More

> Previous: [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md)

---

These are the queries that show up in almost every SQL interview and take-home test. Each one is built from the clauses covered in the previous file — the goal here is to show *how to think through* the pattern, not just memorize the final query.

Sample schema and seed data used throughout this file:
```sql
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary NUMERIC(10, 2),
    manager_id INT REFERENCES employees(employee_id)
);

INSERT INTO employees (name, department, salary, manager_id) VALUES
('Aditi',  'Engineering', 95000, NULL),
('Rahul',  'Engineering', 88000, 1),
('Sneha',  'Engineering', 88000, 1),   -- tied with Rahul
('Kabir',  'Engineering', 72000, 1),
('Meera',  'Engineering', 65000, 2),
('Vikram', 'Sales',       78000, NULL),
('Pooja',  'Sales',       78000, 6),   -- tied with Vikram
('Arjun',  'Sales',       61000, 6);
```
```text
INSERT 0 8
```

## Find the Nth highest salary (overall)
```sql
-- Using DENSE_RANK (handles duplicate salaries correctly — recommended)
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 3;   -- change 3 to N for the Nth highest
```
```text
 salary
---------
 78000.00
(1 row)
```
> Walking through the ranks: `95000` → rank 1, `88000` (Rahul **and** Sneha, tied) → rank 2, `78000` (Vikram **and** Pooja, tied) → rank 3. So the "3rd highest salary" is `78000`, correctly skipping past both ties.

```sql
-- Quick-and-dirty version using OFFSET (breaks if salaries are duplicated!)
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;  -- 3rd highest
```
```text
 salary
---------
 78000.00
(1 row)
```
> This happens to give the same answer here — but only because we ran `DISTINCT salary` first, which already collapsed the ties down to one row per unique salary value before `OFFSET` counted past them. Drop the `DISTINCT` and this technique breaks (see below).

```sql
-- The version WITHOUT DistINCT that breaks on ties:
SELECT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;
```
```text
 salary
---------
 88000.00
(1 row)
```
> Wrong answer! Without `DISTINCT`, the ordered list is `95000, 88000, 88000, 78000, 78000, 72000, 65000, 61000` — skipping 2 rows lands on the *second* `88000` row, not the true 3rd-highest distinct value. This is exactly the bug `DENSE_RANK()` avoids by design.

## Find the 3rd (Nth) highest salary **per department**
```sql
SELECT department, name, salary FROM (
  SELECT
    department,
    name,
    salary,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
  FROM employees
) ranked
WHERE salary_rank = 3;   -- swap to any N
```
```text
 department  |  name  |  salary
--------------+--------+----------
 Engineering  | Kabir  | 72000.00
(1 row)
```
> Engineering's distinct salary tiers, ranked: `95000`(rank 1) → `88000`(rank 2, Rahul & Sneha tied) → `72000`(rank 3, Kabir). Sales only has **two** distinct salary tiers (`78000` tied between Vikram/Pooja at rank 1, then `61000` for Arjun at rank 2) — so Sales contributes **zero** rows at `salary_rank = 3`, because there is no 3rd-highest salary tier in a department that only has two tiers.

**Why `PARTITION BY department` is the key move**: it resets the ranking counter for *every department separately* — so "3rd highest in Engineering" and "3rd highest in Sales" are computed independently, in a single query, instead of needing one query per department. A department with fewer distinct salary tiers than N simply contributes **no row** to the final result, exactly as seen above with Sales.

```sql
-- Without window functions (correlated subquery version — works everywhere, slower on big tables)
SELECT e1.department, e1.name, e1.salary
FROM employees e1
WHERE 2 = (
  SELECT COUNT(DISTINCT e2.salary)
  FROM employees e2
  WHERE e2.department = e1.department AND e2.salary > e1.salary
);
-- "2 employees in the same department earn strictly more than me" = I am the 3rd highest
```
```text
 department  | name  |  salary
--------------+-------+----------
 Engineering  | Kabir | 72000.00
(1 row)
```
> Same correct result as the `DENSE_RANK` version above (only Kabir truly sits at "3rd highest" once you account for ties correctly) — just computed via a per-row correlated subquery instead of a window function. This confirms the `DENSE_RANK` calculation was right.

## Find duplicate rows
```sql
-- Find which emails appear more than once
SELECT email, COUNT(*) FROM students
GROUP BY email
HAVING COUNT(*) > 1;
```
```text
       email       | count
--------------------+-------
 john@example.com   |     2
(1 row)
```
> Assumes the DDL file's constraint-violation walkthrough was bypassed (e.g., data loaded from an external, unvalidated source) — in a table that actually enforces `UNIQUE` on `email`, this query would always return zero rows, since the constraint makes true duplicates impossible in the first place. This pattern is most useful when **cleaning** data before adding a `UNIQUE` constraint, or on a column that was never constrained.

## Self-Join: Find employees who earn more than their manager
```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.employee_id   -- SELF JOIN: a table joined to itself
WHERE e.salary > m.salary;
```
```text
 employee | salary | manager | manager_salary
----------+--------+---------+-----------------
(0 rows)
```
> Zero rows — nobody in this seed data out-earns their manager (e.g., Meera at 65000 reports to Rahul at 88000, Kabir at 72000 reports to Aditi at 95000). A correctly written query returning zero rows isn't a bug; it just means the scenario doesn't exist in this data. To see it return something, try lowering Aditi's salary below Rahul's and Sneha's and re-running.

A **self-join** (aliasing the same table twice, `e` and `m`) is the standard way to compare rows within one table against each other — e.g., employee-vs-manager, or "players from the same team."

## Find the department with the highest average salary
```sql
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC
LIMIT 1;
```
```text
  department  |      avg_salary
--------------+------------------------
 Engineering  | 81600.0000000000000000
(1 row)
```
> Engineering's average: `(95000 + 88000 + 88000 + 72000 + 65000) / 5 = 81600`. Sales averages `(78000 + 78000 + 61000) / 3 ≈ 72333.33` — lower, so it's excluded by `LIMIT 1` after sorting descending.

## Find unmatched rows across tables (anti-join)
```sql
SELECT * FROM employees WHERE department IS NULL;
```
```text
 employee_id | name | department | salary | manager_id
-------------+------+------------+--------+-------------
(0 rows)
```
> Zero rows here since every seeded employee has a department — this pattern becomes non-empty the moment any row is inserted without one (e.g., a new hire whose department assignment is still pending).

## Running total / cumulative sum per group
```sql
SELECT department, name, salary,
       SUM(salary) OVER (PARTITION BY department ORDER BY employee_id) AS running_dept_total
FROM employees
ORDER BY department, employee_id;
```
```text
  department  |  name  |  salary  | running_dept_total
--------------+--------+----------+----------------------
 Engineering  | Aditi  | 95000.00 |            95000.00
 Engineering  | Rahul  | 88000.00 |           183000.00
 Engineering  | Sneha  | 88000.00 |           271000.00
 Engineering  | Kabir  | 72000.00 |           343000.00
 Engineering  | Meera  | 65000.00 |           408000.00
 Sales        | Vikram | 78000.00 |            78000.00
 Sales        | Pooja  | 78000.00 |           156000.00
 Sales        | Arjun  | 61000.00 |           217000.00
(8 rows)
```
> Each department's running total **restarts from zero** (well, from its first row) thanks to `PARTITION BY department` — Sales' running total doesn't carry over or get affected by Engineering's numbers at all, even though they're computed in the same single query.

## Find the second highest salary without `LIMIT`/`OFFSET`
A common "no shortcuts allowed" interview twist:
```sql
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```
```text
   max
----------
 88000.00
(1 row)
```
> The inner query finds the overall highest (`95000`, Aditi). The outer query then finds the highest salary that's *strictly less* than that — landing on `88000` (Rahul/Sneha's tier). This is a very common trick question because it forces you to reason with subqueries instead of `ORDER BY ... LIMIT`.

## Pivot-style summary (rows → columns) without a PIVOT keyword
Postgres has no native `PIVOT`; you fake it with conditional aggregation (`CASE` inside `SUM`/`COUNT`):
```sql
SELECT
  department,
  SUM(CASE WHEN salary > 75000 THEN 1 ELSE 0 END) AS high_earners,
  SUM(CASE WHEN salary <= 75000 THEN 1 ELSE 0 END) AS regular_earners
FROM employees
GROUP BY department;
```
```text
  department  | high_earners | regular_earners
--------------+---------------+------------------
 Engineering  |             3 |               2
 Sales        |             2 |               1
(2 rows)
```
> Engineering's 3 "high earners" are Aditi (95000), Rahul (88000), and Sneha (88000); Kabir (72000) and Meera (65000) fall into "regular." This is the standard way to turn one column's *values* into separate *output columns* — no `PIVOT` keyword needed.

## Find gaps in a sequence (e.g., missing IDs)
```sql
-- Simulate a gap: delete employee_id 4 (Kabir)
DELETE FROM employees WHERE employee_id = 4;
```
```text
DELETE 1
```
```sql
SELECT (t.employee_id + 1) AS missing_id
FROM employees t
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = t.employee_id + 1)
  AND EXISTS (SELECT 1 FROM employees WHERE employee_id = t.employee_id + 2)
ORDER BY missing_id;
```
```text
 missing_id
-------------
           4
(1 row)
```
> Confirms `employee_id = 4` is missing — exactly what deleting Kabir's row caused. Remember from [02-DDL-Data-Definition-Constraints.md](02-DDL-Data-Definition-Constraints.md): this ID (`4`) will **never** be reused by future inserts, even though it's now a "gap" — that's the `SERIAL` sequence behavior in action.

---

**Next up:** [11-PostgreSQL-Data-Types-Reference.md](11-PostgreSQL-Data-Types-Reference.md) — every data type Postgres offers, and when to use each.
