# Joins — Combining Tables
## Part 7 of 19 — INNER, LEFT, RIGHT, FULL, SELF, CROSS + Set Operations

> Previous: [06-Aggregation-GroupBy-Having.md](06-Aggregation-GroupBy-Having.md)

---

## 📌 Executive Summary

- A **join** combines rows from two tables using a shared column — almost always a **foreign key ↔ primary key** pair.
- **`INNER JOIN`** keeps only rows that match in **both** tables. **`LEFT JOIN`** keeps **all** left-table rows, filling `NULL` where the right has no match. `RIGHT JOIN` is the mirror (rarely used — flip the tables and use `LEFT`). `FULL OUTER JOIN` keeps everything from both sides.
- A join produces **one output row per matching pair** — so a student with two internships appears **twice**.
- **`LEFT JOIN ... WHERE right_table.id IS NULL`** is the **anti-join** — "rows on the left with no match on the right" (students with no internship).
- A **self-join** joins a table to itself (aliased twice) to compare rows within one table — employee vs their manager.
- A **`CROSS JOIN`** pairs every left row with every right row (Cartesian product) — useful only when one side has exactly one row.
- **`UNION` / `INTERSECT` / `EXCEPT`** combine the *results of two queries* vertically (stack rows), not tables horizontally.

---

## 🧠 Core Analogy: Joining Two Strips of Wood

To connect two strips of wood you need a **shared overlapping surface** — a common face where both pieces meet. In SQL that shared surface is a **common column**: `students.student_id` and `internships.student_id`. Line them up on that column and the two rows become one wider row.

- **`INNER JOIN`** = keep only the length where both strips actually overlap.
- **`LEFT JOIN`** = keep the entire left strip; where the right strip doesn't reach, leave that section bare (`NULL`).
- **`FULL OUTER JOIN`** = keep the entire length of both strips, overlapping where they can.

**Foreign key** = "a column whose value is *donated* by another table." `internships.student_id` doesn't get to hold arbitrary numbers — its values must come from `students.student_id`. That donation is what makes the join meaningful: it's how you say "this internship *belongs to* that student."

---

Dataset for this file (self-contained — a students/internships pair chosen to show unmatched rows):

```sql
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name       VARCHAR(100),
    email      VARCHAR(100),
    branch     VARCHAR(50)
);

CREATE TABLE internships (
    internship_id SERIAL PRIMARY KEY,
    student_id    INT REFERENCES students(student_id) ON DELETE CASCADE,
    company_name  VARCHAR(100),
    role          VARCHAR(50),
    stipend       INT,
    status        VARCHAR(20)
);

INSERT INTO students (name, email, branch) VALUES
('Rahul', 'rahul@gmail.com',   'Computer Science'),
('Sneha', 'sneha@yahoo.com',   'Information Tech'),
('Amit',  'amit@hotmail.com',  'Electronics'),
('Priya', 'priya@gmail.com',   'Mechanical'),    -- no internships (higher studies)
('Rohan', 'rohan@outlook.com', 'Civil');         -- no internships (startup)

INSERT INTO internships (student_id, company_name, role, stipend, status) VALUES
(1, 'Google',    'Software Engineering Intern', 100000, 'Selected'),
(1, 'Microsoft', 'SDE Intern',                   85000, 'Selected'),   -- Rahul has TWO
(2, 'Amazon',    'Data Analyst Intern',          60000, 'Pending'),
(3, 'TCS',       'System Engineer Intern',       20000, 'Selected');
```

---

## 🔗 1. `INNER JOIN` — matches in both tables only

```sql
SELECT s.name, s.branch, i.company_name, i.status
FROM students s
INNER JOIN internships i ON s.student_id = i.student_id;
```
```text
 name  |      branch      | company_name | status
-------+-----------------+--------------+-----------
 Rahul | Computer Science | Google       | Selected
 Rahul | Computer Science | Microsoft    | Selected
 Sneha | Information Tech  | Amazon       | Pending
 Amit  | Electronics      | TCS          | Selected
(4 rows)
```
- `Rahul` appears **twice** — one output row per matching internship. A join returns one row per matching *pair*, not per student.
- `Priya` and `Rohan` are **absent** — zero internships, so `INNER JOIN` excludes them.
- `s.` / `i.` are **table aliases** — declared right after the table name (`students s`). They keep column references unambiguous and short. `INNER` is optional — a bare `JOIN` means `INNER JOIN`.

---

## ⬅️ 2. `LEFT JOIN` — all left rows, matched or not

```sql
SELECT s.name, s.branch,
       COALESCE(i.company_name, 'No Internship') AS company,
       COALESCE(i.stipend, 0)                    AS stipend
FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id;
```
```text
 name  |      branch      |    company     | stipend
-------+-----------------+----------------+---------
 Rahul | Computer Science | Google         |  100000
 Rahul | Computer Science | Microsoft      |   85000
 Sneha | Information Tech  | Amazon         |   60000
 Amit  | Electronics      | TCS            |   20000
 Priya | Mechanical       | No Internship  |       0
 Rohan | Civil            | No Internship  |       0
(6 rows)
```
> `Priya` and `Rohan` now appear, with `NULL` on every internship column. `COALESCE` turns those `NULL`s into readable fallbacks.

### The anti-join — "left rows with NO match on the right"

```sql
SELECT s.name, s.email, s.branch
FROM students s
LEFT JOIN internships i ON s.student_id = i.student_id
WHERE i.internship_id IS NULL;      -- the right side is NULL ⇒ no match existed
```
```text
 name  |      email        |   branch
-------+------------------+------------
 Priya | priya@gmail.com   | Mechanical
 Rohan | rohan@outlook.com | Civil
(2 rows)
```
> Filter on a **non-nullable** right-side column (`internship_id`, the PK). If it's `NULL` in the result, this left row had no match. This is the standard "find records missing a related record" pattern.

---

## ➡️ 3. `RIGHT JOIN` — the mirror image (rarely written)

`A RIGHT JOIN B` keeps all of `B`. In practice developers **flip the tables and use `LEFT JOIN`** — it reads more naturally top-to-bottom.

```sql
SELECT s.name, i.company_name FROM students s RIGHT JOIN internships i ON s.student_id = i.student_id;
-- ...is identical to...
SELECT s.name, i.company_name FROM internships i LEFT JOIN students s ON i.student_id = s.student_id;
```

Both give the same 4 rows. `A RIGHT JOIN B` ≡ `B LEFT JOIN A`.

---

## ↔️ 4. `FULL OUTER JOIN` — everything from both sides

```sql
SELECT s.name AS student, i.company_name, i.status
FROM students s
FULL OUTER JOIN internships i ON s.student_id = i.student_id;
```

Keeps: matched pairs, plus left rows with no right match (`Priya`, `Rohan` — internship columns `NULL`), plus right rows with no left match (an orphaned internship — its student columns would be `NULL`).

> With this data the result looks identical to the `LEFT JOIN` — because the `ON DELETE CASCADE` foreign key makes orphaned internships impossible. `FULL OUTER JOIN` earns its keep when *both* tables can legitimately have unmatched rows (e.g. reconciling two imported datasets).

---

## 🪞 5. `SELF JOIN` — a table joined to itself

Compare rows *within one table*. Alias the table twice. Classic case: an employee and their manager, both living in `employees` (the `company` dataset — [00](00-Setup-Postgres-VSCode-psql.md)).

```sql
SELECT e.name AS employee, e.salary,
       m.name AS manager,  m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.employee_id     -- e = the report, m = their manager
WHERE e.salary > m.salary;                            -- reports out-earning their manager
```
```text
 employee | salary | manager | manager_salary
----------+--------+---------+----------------
(0 rows)
```
> Zero rows here just means nobody in the seed data out-earns their boss — a correct query returning nothing is not a bug. `e` and `m` are the *same table* seen through two lenses. Any "compare a row to another row in the same table" question (employee/manager, player/teammate, this month vs last month by id) is a self-join.

---

## ✖️ 6. `CROSS JOIN` — every combination (Cartesian product)

Pairs **every** left row with **every** right row. No `ON` clause. `9 rows × 4 rows = 36 rows`.

Almost always a mistake — *except* when one side has exactly **one** row, where it's the clean way to attach a single computed value to every row:

```sql
-- (campus dataset) put the class-wide average next to every exam score
SELECT e.*, ca.class_avg
FROM exam_scores e
CROSS JOIN (SELECT AVG(score) AS class_avg FROM exam_scores) ca;
```
> `ca` has one row, so `CROSS JOIN` staples its `class_avg` onto all 9 exam rows. If `ca` returned 3 rows this would triple every exam row — a classic accidental explosion. Only `CROSS JOIN` something you *know* returns one row. (Window functions — [10](10-Window-Functions.md) — do this without the join.)

---

## 📚 7. Set operations — stacking query results vertically

`JOIN` widens rows (more columns). `UNION` / `INTERSECT` / `EXCEPT` **stack** the results of two queries (more rows). Both queries must return the **same number of columns** with compatible types.

Using `ipl_players` from [05](05-DQL-Select-Where-Filtering.md):

```sql
-- UNION: rows from either query, DUPLICATES REMOVED (extra dedup work)
SELECT name FROM ipl_players WHERE team = 'CSK'
UNION
SELECT name FROM ipl_players WHERE role = 'Bowler';

-- UNION ALL: rows from either query, duplicates KEPT (faster — no dedup)
SELECT name FROM ipl_players WHERE team = 'CSK'
UNION ALL
SELECT name FROM ipl_players WHERE role = 'Bowler';

-- INTERSECT: only rows present in BOTH queries
SELECT name FROM ipl_players WHERE team = 'CSK'
INTERSECT
SELECT name FROM ipl_players WHERE role = 'Batsman';        -- 0 rows — Dhoni is a Wicketkeeper

-- EXCEPT: rows in the first query but NOT the second (set subtraction)
SELECT name FROM ipl_players WHERE role = 'Batsman'
EXCEPT
SELECT name FROM ipl_players WHERE team = 'RCB';            -- every Batsman except Kohli
```

| Operator | Returns |
|---|---|
| `UNION` | Rows from either query, **deduplicated** |
| `UNION ALL` | Rows from either query, **duplicates kept** (prefer this when you know there are no dupes — it's faster) |
| `INTERSECT` | Rows appearing in **both** |
| `EXCEPT` | Rows in the first, minus any that also appear in the second |

---

## 🗺️ Join type summary

| Join | Returns | Unmatched rows become |
|---|---|---|
| `INNER JOIN` | Only pairs that match in both tables | (excluded) |
| `LEFT JOIN` | All left rows + matched right rows | right columns `NULL` |
| `RIGHT JOIN` | All right rows + matched left rows | left columns `NULL` (rare — flip to `LEFT`) |
| `FULL OUTER JOIN` | All rows from both tables | the missing side `NULL` |
| `SELF JOIN` | A table joined to itself (aliased twice) | — |
| `CROSS JOIN` | Every left × every right combination | — |

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| `INNER` vs `LEFT JOIN`? | `INNER` keeps only matched rows; `LEFT` keeps all left rows, `NULL`-filling unmatched right columns |
| Why did a row appear twice in my join? | The join emits one row per matching *pair* — the row matched two rows on the other side |
| How do you find rows with no related record? | `LEFT JOIN ... WHERE right_table.<non-null col> IS NULL` (anti-join) |
| Why is `RIGHT JOIN` rare? | Flipping the table order and using `LEFT JOIN` gives the same result and reads better |
| What's a self-join, and when? | A table joined to itself (aliased twice) — to compare rows within one table (employee vs manager) |
| `UNION` vs `UNION ALL`? | `UNION` removes duplicate rows (slower); `UNION ALL` keeps them (faster) |
| `JOIN` vs `UNION` conceptually? | `JOIN` adds columns (widens rows); `UNION` adds rows (stacks results) |

---

**Next up:** [08-Subqueries.md](08-Subqueries.md) — a query inside a query: scalar, `IN`, `EXISTS`, derived tables, and correlated subqueries.
