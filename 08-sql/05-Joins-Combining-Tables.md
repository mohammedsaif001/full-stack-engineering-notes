# Joins — Combining Tables
## INNER, LEFT, RIGHT, and FULL OUTER JOIN

> Previous: [04-Aggregation-GroupBy-Having.md](04-Aggregation-GroupBy-Having.md)

---

## 🧠 Core Analogy

**Foreign Key = "a column whose value is *donated* by another table"**: If any column's value must come from (reference) another table's Primary Key, that column is a Foreign Key. It's the mechanism that lets you say "this internship *belongs to* this specific student."

**Joining = combining two tables using a shared key** (usually a Foreign Key ↔ Primary Key relationship). Think of it like joining two strips of wood: you need a shared surface (a common column) to connect them, and once connected, that shared strip becomes common to both.

```sql
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    branch VARCHAR(50)
);

CREATE TABLE internships (
    internship_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
    company_name VARCHAR(100),
    role VARCHAR(50),
    stipend INT,
    status VARCHAR(20)
);

-- Students (including some who haven't applied for internships yet)
INSERT INTO students (name, email, branch) VALUES
('Rahul', 'rahul@gmail.com',  'Computer Science'),
('Sneha', 'sneha@yahoo.com',  'Information Tech'),
('Amit',  'amit@hotmail.com', 'Electronics'),
('Priya', 'priya@gmail.com',  'Mechanical'),   -- focusing on higher studies, no internships
('Rohan', 'rohan@outlook.com','Civil');        -- working on a startup, no internships

-- Internships
INSERT INTO internships (student_id, company_name, role, stipend, status) VALUES
(1, 'Google',    'Software Engineering Intern', 100000, 'Selected'),  -- Rahul
(1, 'Microsoft', 'SDE Intern',                   85000, 'Selected'),  -- Rahul (2 internships)
(2, 'Amazon',    'Data Analyst Intern',          60000, 'Pending'),   -- Sneha
(3, 'TCS',       'System Engineer Intern',       20000, 'Selected');  -- Amit
```
```text
INSERT 0 5
INSERT 0 4
```
> Priya (id 4) and Rohan (id 5) intentionally have **zero** internship rows — they're the ones who will demonstrate `LEFT JOIN`'s "keep unmatched rows" behavior below.

## Foreign Key `ON DELETE` behaviors (what happens to `internships` if a `student` is deleted)
| Option | Behavior |
|---|---|
| `ON DELETE CASCADE` | Deleting the student **also deletes** their internships automatically |
| `ON DELETE SET NULL` | Deleting the student sets `student_id` to `NULL` in internships (soft delete — the internship record survives, just disconnected) |
| `ON DELETE RESTRICT` (default) | Deleting the student is **blocked** entirely while any internship still references them |

> **Non-obvious but important**: the database does not "know" or care about *humans* — it only knows rows and IDs. If a student is deleted and the *same person* signs up again, they get an entirely new `student_id`. The old ID is never recycled. This is why `ON DELETE SET NULL` is called a form of "soft deletion" — the dependent data survives, just orphaned.

## 1. INNER JOIN — the "Match Maker"
Returns rows **only** where a match exists in **both** tables. Students without any internship (and internships without a valid student) are excluded.

```
      ┌───────────┐     ┌─────────────┐
      │  Students │ ╳╳╳ │ Internships │      Only the overlapping (shaded) region
      └───────────┘     └─────────────┘      is returned by INNER JOIN
```

```sql
SELECT s.name, s.branch, i.company_name, i.status
FROM students s
INNER JOIN internships i ON s.student_id = i.student_id;
```
```text
 name  |      branch       | company_name | status
-------+-------------------+--------------+-----------
 Rahul | Computer Science  | Google       | Selected
 Rahul | Computer Science  | Microsoft    | Selected
 Sneha | Information Tech  | Amazon       | Pending
 Amit  | Electronics       | TCS          | Selected
(4 rows)
```
> `Rahul` appears **twice** — once per matching internship row — because a `JOIN` produces one output row per matching *pair*, not per student. `Priya` and `Rohan` are completely absent: they have zero internships, so `INNER JOIN` excludes them entirely.

```sql
-- Select everything from BOTH aliased tables
SELECT s.*, i.* FROM students s INNER JOIN internships i ON s.student_id = i.student_id;
```
```text
 student_id | name  |      email       |      branch       | internship_id | student_id | company_name |     role      | stipend | status
------------+-------+-------------------+-------------------+----------------+------------+--------------+---------------+---------+-----------
          1 | Rahul | rahul@gmail.com   | Computer Science   |              1 |          1 | Google       | ... Intern    |  100000 | Selected
          1 | Rahul | rahul@gmail.com   | Computer Science   |              2 |          1 | Microsoft    | SDE Intern    |   85000 | Selected
          2 | Sneha | sneha@yahoo.com   | Information Tech   |              3 |          2 | Amazon       | ... Intern    |   60000 | Pending
          3 | Amit  | amit@hotmail.com  | Electronics        |              4 |          3 | TCS          | ... Intern    |   20000 | Selected
(4 rows)
```
> Notice `student_id` appears **twice** in the column list (once from each table) — this is exactly why real code should alias columns or select specific ones instead of `s.*, i.*`, to avoid ambiguous/duplicate column names in the result.

## 2. LEFT JOIN — the "Inclusive" Join
Returns **all** rows from the left table, plus matched rows from the right. Unmatched right-side columns become `NULL`.

```sql
SELECT s.name, s.branch,
       COALESCE(i.company_name, 'No Internship') AS company_name,  -- replace NULL with a fallback
       COALESCE(i.stipend, 0) AS stipend
FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id;
```
```text
 name  |      branch       | company_name  | stipend
-------+-------------------+----------------+---------
 Rahul | Computer Science  | Google         |  100000
 Rahul | Computer Science  | Microsoft      |   85000
 Sneha | Information Tech  | Amazon         |   60000
 Amit  | Electronics       | TCS            |   20000
 Priya | Mechanical        | No Internship  |       0
 Rohan | Civil             | No Internship  |       0
(6 rows)
```
> This is the key difference from `INNER JOIN`: `Priya` and `Rohan` now **do** appear, with `NULL` on the internship side — and `COALESCE` turns those `NULL`s into friendly display values instead of blank cells.

```sql
-- Find students with NO internships at all (anti-join pattern):
SELECT s.name, s.email, s.branch
FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id
WHERE i.internship_id IS NULL;
```
```text
 name  |      email        |   branch
-------+--------------------+------------
 Priya | priya@gmail.com    | Mechanical
 Rohan | rohan@outlook.com  | Civil
(2 rows)
```
`COALESCE(value, fallback)` returns the first non-NULL argument — extremely useful for display-friendly defaults.

## 3. RIGHT JOIN
Returns **all** rows from the right table, plus matched rows from the left. In practice, **developers rarely use `RIGHT JOIN`** — they just flip the table order and use `LEFT JOIN` instead, since it reads more naturally top-to-bottom, left-to-right. (These two are equivalent):
```sql
SELECT s.name, i.company_name FROM students s RIGHT JOIN internships i ON s.student_id = i.student_id;
```
```text
 name  | company_name
-------+---------------
 Rahul | Google
 Rahul | Microsoft
 Sneha | Amazon
 Amit  | TCS
(4 rows)
```
```sql
-- is the same result as:
SELECT s.name, i.company_name FROM internships i LEFT JOIN students s ON i.student_id = s.student_id;
```
```text
 name  | company_name
-------+---------------
 Rahul | Google
 Rahul | Microsoft
 Sneha | Amazon
 Amit  | TCS
(4 rows)
```
> Identical output, confirming `A RIGHT JOIN B` ≡ `B LEFT JOIN A` — this dataset happens to give the same result as `INNER JOIN` too, only because every internship currently has a valid `student_id` (no orphaned internship rows exist here).

## 4. FULL OUTER JOIN
Returns **all** rows from **both** tables — matched where possible, `NULL` on whichever side has no match. Equivalent to `LEFT JOIN` + `RIGHT JOIN` combined.
```sql
SELECT s.name AS student_name, i.company_name, i.status
FROM students s
FULL OUTER JOIN internships i ON s.student_id = i.student_id;
```
```text
 student_name | company_name | status
--------------+---------------+-----------
 Rahul        | Google        | Selected
 Rahul        | Microsoft     | Selected
 Sneha        | Amazon        | Pending
 Amit         | TCS           | Selected
 Priya        |               |
 Rohan        |               |
(6 rows)
```
> With this dataset, `FULL OUTER JOIN` happens to look identical to the `LEFT JOIN` result above — because there are no "orphan" internship rows without a valid student. The difference only becomes visible if an internship existed with a `student_id` that doesn't match any row in `students` (which our `ON DELETE CASCADE` foreign key actually prevents from ever happening in the first place).

## Join summary table
| Join type | Returns |
|---|---|
| `INNER JOIN` | Only rows where the condition matches in **both** tables |
| `LEFT JOIN` | All left-table rows + matched right-table rows (NULL if unmatched) |
| `RIGHT JOIN` | All right-table rows + matched left-table rows (rarely used — flip to LEFT instead) |
| `FULL OUTER JOIN` | Everything from both tables, matched where possible |

> A **self-join** (a table joined to itself, e.g. comparing an employee to their manager in the same `employees` table) is covered in [10-Classic-Interview-Query-Patterns.md](10-Classic-Interview-Query-Patterns.md#self-join).

---

**Next up:** [06-Indexing-Query-Performance-Internals.md](06-Indexing-Query-Performance-Internals.md) — how Postgres makes lookups fast.
