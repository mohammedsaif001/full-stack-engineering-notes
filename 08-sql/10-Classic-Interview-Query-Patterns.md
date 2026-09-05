# Solving Classic SQL Interview Queries
## Worked Patterns: Nth Highest Salary, Duplicates, Self-Joins & More

> Previous: [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md)

---

These are the queries that show up in almost every SQL interview and take-home test. Each one is built from the clauses covered in the previous file — the goal here is to show *how to think through* the pattern, not just memorize the final query.

Sample schema used throughout this file:
```sql
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary NUMERIC(10, 2),
    manager_id INT REFERENCES employees(employee_id)
);
```

## Find the Nth highest salary (overall)
```sql
-- Using DENSE_RANK (handles duplicate salaries correctly — recommended)
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 3;   -- change 3 to N for the Nth highest

-- Classic pre-window-function approach (works on any SQL engine)
SELECT MIN(salary) FROM (
  SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 3
) top3;

-- Quick-and-dirty version using OFFSET (breaks if salaries are duplicated!)
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;  -- 3rd highest
```
**Why `DENSE_RANK` is the "correct" answer in interviews**: if two employees are tied for 2nd highest salary, the `OFFSET` version silently skips ahead incorrectly, but `DENSE_RANK` correctly treats them as sharing rank 2, so rank 3 is still the *true* 3rd distinct salary.

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
**Why `PARTITION BY department` is the key move**: it resets the ranking counter for *every department separately* — so "3rd highest in Engineering" and "3rd highest in Sales" are computed independently, in a single query, instead of needing one query per department.

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

## Find duplicate rows
```sql
-- Find which emails appear more than once
SELECT email, COUNT(*) FROM students
GROUP BY email
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the lowest student_id per email
DELETE FROM students
WHERE student_id NOT IN (
  SELECT MIN(student_id) FROM students GROUP BY email
);
```

## Self-Join: Find employees who earn more than their manager
```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.employee_id   -- SELF JOIN: a table joined to itself
WHERE e.salary > m.salary;
```
A **self-join** (aliasing the same table twice, `e` and `m`) is the standard way to compare rows within one table against each other — e.g., employee-vs-manager, or "players from the same team."

## Find the department with the highest average salary
```sql
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC
LIMIT 1;
```

## Find unmatched rows across tables (anti-join)
```sql
SELECT * FROM employees WHERE department IS NULL;

-- Cross-table version: students with no internship
SELECT s.* FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id
WHERE i.internship_id IS NULL;
```

## Running total / cumulative sum per group
```sql
SELECT department, name, salary,
       SUM(salary) OVER (PARTITION BY department ORDER BY employee_id) AS running_dept_total
FROM employees;
```

## Find the second highest salary without `LIMIT`/`OFFSET`
A common "no shortcuts allowed" interview twist:
```sql
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
```
This is a very common trick question because it forces you to reason with subqueries instead of `ORDER BY ... LIMIT`.

## Pivot-style summary (rows → columns) without a PIVOT keyword
Postgres has no native `PIVOT`; you fake it with conditional aggregation (`CASE` inside `SUM`/`COUNT`):
```sql
SELECT
  department,
  SUM(CASE WHEN salary > 50000 THEN 1 ELSE 0 END) AS high_earners,
  SUM(CASE WHEN salary <= 50000 THEN 1 ELSE 0 END) AS regular_earners
FROM employees
GROUP BY department;
```

## Find gaps in a sequence (e.g., missing IDs)
```sql
SELECT (t.id + 1) AS missing_id
FROM employees t
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = t.employee_id + 1)
ORDER BY missing_id;
```

---

**Next up:** [11-PostgreSQL-Data-Types-Reference.md](11-PostgreSQL-Data-Types-Reference.md) — every data type Postgres offers, and when to use each.
