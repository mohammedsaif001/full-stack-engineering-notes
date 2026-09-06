# Indexing & Query Performance Internals
## Part 14 of 19 — B+Trees, `EXPLAIN ANALYZE`, and Seq Scan vs Index Scan

> Previous: [13-Schema-Design-Normalization.md](13-Schema-Design-Normalization.md)

---

## 📌 Executive Summary

- Without an index, finding a row by a column value means checking **every row** — a **Sequential Scan** (`Seq Scan`). O(n).
- An **index** is a separate, sorted, balanced structure (a **B+Tree**) mapping `column value → row location`. Looking a value up is O(log n) — then one jump to the actual row. This is an **Index Scan**.
- On a million-row table the difference is real: ~52 ms (Seq Scan) → ~0.06 ms (Index Scan) in the demo below — roughly **900×**.
- **`EXPLAIN ANALYZE`** runs the query and shows the plan Postgres chose *and* real timings. It's how you tell whether an index is being used.
- **Indexes aren't free:** they cost disk space, take time to build, and every `INSERT`/`UPDATE`/`DELETE` must update every index on the table. You trade slower writes for faster reads — so index based on *measured* query patterns, not "just in case."
- On a **small** table Postgres will (correctly) ignore an index and Seq Scan anyway — consulting an index structure isn't worth it for a handful of rows.

---

## 🧠 Core Analogy: The Dictionary Index

To find "mat" in a dictionary you don't read every page front to back. You use the fact that words are **sorted** — flip roughly to the M's, narrow down, land on the page. A few comparisons instead of scanning thousands of pages.

A database index is the same idea: a sorted side-structure that maps a column's values to the location of the matching row. `EXPLAIN ANALYZE` tells you whether Postgres read the "dictionary" (**Index Scan**) or read every page (**Seq Scan**).

It's a **B+Tree**, not a binary tree — a *balanced*, high-fan-out tree that stays shallow (3–4 levels deep even for billions of rows), so a lookup is a handful of page reads regardless of table size.

---

## 🐢 1. The problem — a Seq Scan at scale

```sql
CREATE TABLE marks (
    id    SERIAL PRIMARY KEY,
    name  TEXT,
    marks INT NOT NULL
);

-- One million random rows
INSERT INTO marks (name, marks)
SELECT
    substr(md5(random()::text || gs::text), 1, 12) AS name,
    floor(random() * 100 + 1)::int                 AS marks
FROM generate_series(1, 1000000) AS gs;

EXPLAIN ANALYZE SELECT marks FROM marks WHERE name = '809e15792322';
```
```text
                                              QUERY PLAN
------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..11220.85 rows=1 width=4) (actual time=48.912..52.301 rows=1 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   ->  Parallel Seq Scan on marks  (cost=0.00..10220.75 rows=1 width=4) (actual time=39.774..48.921 ...)
         Filter: (name = '809e15792322'::text)
         Rows Removed by Filter: 333333
 Planning Time: 0.114 ms
 Execution Time: 52.335 ms
```
> Read it bottom-up. Postgres spun up **2 parallel workers** and still checked all **1,000,000 rows** (`Rows Removed by Filter: 333333` per worker × 3). `Parallel Seq Scan` = no index used. ~52 ms.

---

## 🌲 2. The fix — `CREATE INDEX`

```sql
CREATE INDEX idx_marks_name ON marks (name);
```
```text
CREATE INDEX
```
> On a real million-row table this takes a few seconds — Postgres reads every existing row once to build the B+Tree.

```sql
EXPLAIN ANALYZE SELECT marks FROM marks WHERE name = '809e15792322';
```
```text
                                            QUERY PLAN
--------------------------------------------------------------------------------------------------------
 Index Scan using idx_marks_name on marks  (cost=0.42..8.44 rows=1 width=4) (actual time=0.038..0.039 ...)
   Index Cond: (name = '809e15792322'::text)
 Planning Time: 0.087 ms
 Execution Time: 0.058 ms
```
> Same query, same data — now **`Index Scan`**, and execution dropped from **~52 ms to ~0.06 ms**, roughly **900×**. This is the single most convincing demonstration of why indexes exist.

### Covering index — answer the query from the index alone

```sql
CREATE INDEX idx_marks_name_cov ON marks (name) INCLUDE (marks);

EXPLAIN ANALYZE SELECT marks FROM marks WHERE name = '809e15792322';
```
```text
 Index Only Scan using idx_marks_name_cov on marks  (... actual time=0.021..0.022 rows=1 loops=1)
   Index Cond: (name = '809e15792322'::text)
   Heap Fetches: 0
 Execution Time: 0.041 ms
```
> **`Index Only Scan`**, `Heap Fetches: 0` — the whole query was answered from the index, never touching the `marks` table, because the index already holds both `name` (to search) and `marks` (to return).

---

## 🔬 3. How an index actually works

```
   Index (B+Tree, sorted)             Actual table (heap, unsorted)
   ┌────────────────────┐             ┌────────────────────────────────┐
   │ 5178fe8bf887 → loc1 │  ────────▶ │ id:1, name:abc11,  marks:10     │
   │ abc11       → loc2  │            │ id:2, name:pqr121, marks:47     │
   │ pqr121      → loc3  │            │ id:3, name:5178fe..., marks:88  │
   └────────────────────┘             │ ... up to 1,000,000 rows ...   │
                                       └────────────────────────────────┘
```

- **Without an index:** scan the heap row by row until a match (`Seq Scan`), O(n).
- **With an index:** descend the B+Tree (sorted + balanced) in ~log(n) steps to find the entry, then jump straight to that row's location in the heap (`Index Scan`).

### The cost of an index

1. **Disk space** — it's a real, separately-stored structure.
2. **Build time** — creating one on a big existing table is slow.
3. **Write amplification** — every `INSERT`/`UPDATE`/`DELETE` must also update **every index** on that table. More indexes → slower writes.
4. It's a **read-vs-write trade**, ideally decided early from expected access patterns.

### `CREATE INDEX CONCURRENTLY`

Plain `CREATE INDEX` takes a lock that blocks writes to the table while it builds. `CREATE INDEX CONCURRENTLY idx ON table (col);` builds without blocking writes — slower overall, but safe on a live production table.

---

## 🧰 4. Index types you'll actually create

```sql
-- Single column — the default
CREATE INDEX idx_emp_dept ON employees (department);

-- Composite — column ORDER matters (see below)
CREATE INDEX idx_emp_dept_salary ON employees (department, salary);

-- Unique — enforces uniqueness AND speeds lookups
CREATE UNIQUE INDEX idx_users_email ON app_users (email);

-- Partial — only indexes rows matching a condition (smaller, cheaper)
CREATE INDEX idx_active_users ON app_users (email) WHERE is_active = TRUE;

-- Functional / expression — index the result of an expression
CREATE INDEX idx_lower_email ON app_users (LOWER(email));
```

- **Composite index column order:** an index on `(department, salary)` helps `WHERE department = 'X' AND salary > Y` **and** `WHERE department = 'X'` alone — but **not** `WHERE salary > Y` alone. Leftmost columns must be used first (the "leftmost prefix" rule). Put the column you filter on most, most selectively, first.
- **Low-cardinality columns index poorly:** an index on a `BOOLEAN` or a 3-value `status` column rarely helps — it can't narrow the search much, and Postgres may Seq Scan anyway (correctly).
- **Index the columns in `WHERE`, `JOIN ... ON`, and `ORDER BY`** — those are what Postgres needs to locate and sort by.

---

## 📖 5. Reading `EXPLAIN ANALYZE`

| Line / field | Meaning |
|---|---|
| `Seq Scan` | Row-by-row scan. Fine on a small table; a red flag on a large one |
| `Index Scan` / `Index Only Scan` | An index is being used (`Only` = answered from the index alone) |
| `Bitmap Heap Scan` | Index used to gather many matching row locations, then fetch them in bulk — common for medium-selective filters |
| `cost=A..B` | The planner's *estimated* relative cost (not ms). Useful for comparing two versions of a query |
| `actual time=A..B` | Real measured milliseconds — the number that matters |
| `rows=N` (est) vs actual `rows` | A big mismatch usually means stale statistics — run `ANALYZE tablename` |
| `Rows Removed by Filter` | How many rows were read and thrown away — high = wasteful scan |

- **`EXPLAIN`** shows the plan without running the query.
- **`EXPLAIN ANALYZE`** actually **runs** it (be careful with `INSERT`/`UPDATE`/`DELETE` in production — it executes the write).

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What's the point of an index? | Turns an O(n) full-table scan into an O(log n) B+Tree lookup, at the cost of disk space and slower writes |
| Is an index a binary tree? | No — a B+Tree: balanced, high fan-out, stays shallow even for billions of rows |
| What does `EXPLAIN ANALYZE` show? | The actual query plan Postgres used plus real execution timings — reveals Seq Scan vs Index Scan |
| Why not index every column? | Every index costs space and slows every write (each write updates every index) |
| Composite index `(a, b)` — which queries does it help? | `WHERE a = ?`, `WHERE a = ? AND b = ?` — not `WHERE b = ?` alone (leftmost-prefix rule) |
| Why might Postgres ignore an index on a small table? | Scanning a few rows directly is cheaper than descending an index structure |
| What is `CREATE INDEX CONCURRENTLY` for? | Building an index on a live table without blocking writes |

---

**Next up:** [15-Transactions-ACID-Locking.md](15-Transactions-ACID-Locking.md) — making multi-step operations safe under concurrency: `BEGIN`/`COMMIT`/`ROLLBACK`, ACID, row locks, isolation levels.
