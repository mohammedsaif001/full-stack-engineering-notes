# How to Optimize a Slow Query
## A Structured, Step-by-Step Playbook

> Previous: [11-PostgreSQL-Data-Types-Reference.md](11-PostgreSQL-Data-Types-Reference.md)

---

A structured checklist for "this query is slow, how do I speed it up" — the actual thought process, in order.

## Step 1 — Measure first, don't guess
```sql
EXPLAIN ANALYZE
SELECT * FROM employees WHERE department = 'Engineering' AND salary > 50000;
```
- **`EXPLAIN`** shows the *planned* execution strategy without running the query.
- **`EXPLAIN ANALYZE`** actually **runs** the query and shows real timing alongside the plan — use this one when optimizing (be cautious running it on a heavy `INSERT`/`UPDATE`/`DELETE` in production, since it actually executes the statement).
- What to look for in the output:
  - **`Seq Scan`** → the table is being scanned row-by-row. Fine on a small table; a red flag on a large one.
  - **`Index Scan`** / **`Index Only Scan`** → good, an index is being used.
  - **`cost=`** → the planner's *estimated* relative cost (not real time) — useful for comparing two versions of the same query.
  - **`actual time=`** → real, measured milliseconds — this is the number that matters most.
  - **`rows=`** (estimated) vs the real row count returned → a huge mismatch here usually means outdated table statistics (see `ANALYZE` below).

> See [06-Indexing-Query-Performance-Internals.md](06-Indexing-Query-Performance-Internals.md) for how the B+Tree index structure works internally, and why an Index Scan beats a Seq Scan.

## Step 2 — Add the right indexes (and know when NOT to)
```sql
-- Index the column(s) actually used in WHERE / JOIN / ORDER BY
CREATE INDEX idx_employees_department ON employees (department);

-- Composite index — order matters! Put the most selective / most frequently
-- filtered column FIRST, matching your most common query pattern.
CREATE INDEX idx_employees_dept_salary ON employees (department, salary);

-- Partial index — only indexes rows matching a condition (smaller, faster to
-- maintain, when you only ever query for a subset, e.g. active users)
CREATE INDEX idx_active_users ON app_users (email) WHERE is_active = TRUE;

-- Covering index — include extra columns so the index alone can answer
-- the query without touching the actual table (an "Index Only Scan")
CREATE INDEX idx_covering ON employees (department) INCLUDE (name, salary);
```
- **Index columns used in `WHERE`, `JOIN ... ON`, and `ORDER BY`** — these are the columns Postgres needs to locate/sort rows by.
- **Don't over-index**: every index slows down `INSERT`/`UPDATE`/`DELETE` (each write must also update every index on that table) and costs disk space. Index based on actual, measured query patterns — not "just in case."
- **Low-cardinality columns index poorly**: an index on a `BOOLEAN` or a column with only 3 possible values (like `status`) rarely helps, because the index can't narrow the search down much — Postgres may just ignore it and do a Seq Scan anyway (correctly).
- **Composite index column order matters**: an index on `(department, salary)` speeds up `WHERE department = 'X' AND salary > Y` and `WHERE department = 'X'` alone, but does **not** help `WHERE salary > Y` alone (without `department`) — leftmost columns must be used first.

## Step 3 — Select only what you need
```sql
-- BAD: fetches every column, wastes I/O and network bandwidth
SELECT * FROM employees WHERE department = 'Engineering';

-- GOOD: fetches only what the application actually uses
SELECT employee_id, name, salary FROM employees WHERE department = 'Engineering';
```
`SELECT *` also silently breaks an **Index Only Scan** — if the index doesn't contain every selected column, Postgres must still visit the full table row, defeating part of the index's benefit.

## Step 4 — Avoid operations that block index usage
```sql
-- BAD: wrapping the indexed column in a function prevents the index from being used
SELECT * FROM students WHERE LOWER(email) = 'john@example.com';

-- GOOD: keep the column bare; if you need case-insensitive search often,
-- build the index on the function itself (a "functional index")
CREATE INDEX idx_lower_email ON students (LOWER(email));
SELECT * FROM students WHERE LOWER(email) = 'john@example.com';  -- now uses the functional index

-- BAD: leading wildcard defeats a standard B+Tree index (can't binary-search
-- for "ends with X" — has to scan everything)
SELECT * FROM students WHERE name LIKE '%mith';

-- OK: a trailing wildcard CAN still use a standard index (it can search "starts with")
SELECT * FROM students WHERE name LIKE 'Sm%';
```

## Step 5 — Filter as early and as cheaply as possible
```sql
-- Prefer filtering BEFORE joining large tables when possible, so the join
-- has fewer rows to process in the first place.
SELECT s.name, i.company_name
FROM (SELECT * FROM students WHERE branch = 'Computer Science') s
JOIN internships i ON s.student_id = i.student_id;
```
Modern query planners often reorder this automatically, but for very large tables or complex multi-join queries, explicitly narrowing down early can help the planner choose a better strategy.

## Step 6 — Use `EXISTS` instead of `IN`/`JOIN` for existence checks on large subqueries
```sql
-- Can be slower — builds/checks the full IN-list first
SELECT * FROM students WHERE student_id IN (SELECT student_id FROM internships);

-- Usually faster — stops at the FIRST match per row, no full list needed
SELECT * FROM students s WHERE EXISTS (
  SELECT 1 FROM internships i WHERE i.student_id = s.student_id
);
```

## Step 7 — Paginate properly on large tables (`OFFSET` gets slower as it grows)
```sql
-- BAD at scale: OFFSET 100000 still has to COUNT PAST 100,000 rows internally
SELECT * FROM smart_watch_sales ORDER BY sale_id LIMIT 20 OFFSET 100000;

-- GOOD: "keyset pagination" — jump directly using the last-seen value,
-- no counting-past-rows required, regardless of how deep you paginate
SELECT * FROM smart_watch_sales
WHERE sale_id > 100000        -- the last id seen on the previous page
ORDER BY sale_id
LIMIT 20;
```

## Step 8 — Keep table statistics fresh
```sql
ANALYZE employees;   -- refreshes the planner's internal statistics about this table
VACUUM ANALYZE employees;  -- also reclaims space from deleted/updated rows (Postgres-specific housekeeping)
```
The query planner's decisions (Seq Scan vs Index Scan, join order, etc.) are based on **statistics** about how many rows exist and how values are distributed. After a huge bulk insert/delete, those statistics can go stale, causing the planner to make a genuinely bad choice — running `ANALYZE` refreshes them. Postgres also runs this automatically in the background (`autovacuum`), but a manual `ANALYZE` after a big data load is a good habit.

## Step 9 — Batch writes instead of row-by-row
```sql
-- SLOW: one round-trip per row
INSERT INTO students (first_name) VALUES ('A');
INSERT INTO students (first_name) VALUES ('B');

-- FAST: one round-trip, many rows
INSERT INTO students (first_name) VALUES ('A'), ('B'), ('C');
```
This matters enormously from application code — looping and firing one `INSERT`/`UPDATE` per iteration is one of the most common real-world performance bugs; batch it into a single statement whenever possible.

## Optimization checklist (in the order to actually try them)
1. **Measure** with `EXPLAIN ANALYZE` — never optimize blind.
2. **Add an index** on columns used in `WHERE` / `JOIN` / `ORDER BY` — check column order for composite indexes.
3. **Stop using `SELECT *`** — select only needed columns.
4. **Don't wrap indexed columns in functions** — use a functional index if you must.
5. **Avoid leading-wildcard `LIKE '%x'`** searches on large tables.
6. **Prefer `EXISTS` over `IN`** for large subquery existence checks.
7. **Switch to keyset pagination** instead of large `OFFSET` values.
8. **Run `ANALYZE`** after large data loads so the planner has fresh statistics.
9. **Batch writes** instead of looping single-row `INSERT`/`UPDATE` statements from application code.
10. Only after all of the above — consider caching (e.g., Redis) in front of the database for read-heavy, rarely-changing queries.

---

**Next up:** [13-Interview-Quick-Reference-Whats-Next.md](13-Interview-Quick-Reference-Whats-Next.md) — a condensed Q&A summary and topics beyond this series.
