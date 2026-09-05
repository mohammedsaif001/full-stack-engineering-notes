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
```

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

-- Multi-condition join (join on more than one shared column)
SELECT s.*, i.company_name
FROM students AS s
INNER JOIN internships AS i
  ON i.student_id = s.student_id AND i.company_name = s.name;

-- Select everything from BOTH aliased tables
SELECT s.*, i.* FROM students s INNER JOIN internships i ON s.student_id = i.student_id;
```

## 2. LEFT JOIN — the "Inclusive" Join
Returns **all** rows from the left table, plus matched rows from the right. Unmatched right-side columns become `NULL`.

```sql
SELECT s.name, s.branch,
       COALESCE(i.company_name, 'No Internship') AS company_name,  -- replace NULL with a fallback
       COALESCE(i.stipend, 0) AS stipend
FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id;

-- Find students with NO internships at all (anti-join pattern):
SELECT s.name, s.email, s.branch
FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id
WHERE i.internship_id IS NULL;
```
`COALESCE(value, fallback)` returns the first non-NULL argument — extremely useful for display-friendly defaults.

## 3. RIGHT JOIN
Returns **all** rows from the right table, plus matched rows from the left. In practice, **developers rarely use `RIGHT JOIN`** — they just flip the table order and use `LEFT JOIN` instead, since it reads more naturally top-to-bottom, left-to-right. (These two are equivalent):
```sql
SELECT s.name, i.company_name FROM students s RIGHT JOIN internships i ON s.student_id = i.student_id;
-- is the same result as:
SELECT s.name, i.company_name FROM internships i LEFT JOIN students s ON i.student_id = s.student_id;
```

## 4. FULL OUTER JOIN
Returns **all** rows from **both** tables — matched where possible, `NULL` on whichever side has no match. Equivalent to `LEFT JOIN` + `RIGHT JOIN` combined.
```sql
SELECT s.name AS student_name, i.company_name, i.status
FROM students s
FULL OUTER JOIN internships i ON s.student_id = i.student_id;

-- Find rows that are UNMATCHED on either side:
SELECT s.name, i.company_name
FROM students s
FULL OUTER JOIN internships i ON s.student_id = i.student_id
WHERE s.student_id IS NULL OR i.internship_id IS NULL;
```

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
