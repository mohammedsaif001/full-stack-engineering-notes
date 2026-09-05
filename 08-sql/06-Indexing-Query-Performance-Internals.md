# Indexing & Query Performance Internals
## B+Trees, EXPLAIN ANALYZE, and the Seq Scan vs Index Scan Tradeoff

> Previous: [05-Joins-Combining-Tables.md](05-Joins-Combining-Tables.md)

---

## 🧠 Core Analogy

**A Dictionary Index as the mental model for database Indexes**:
- To find the meaning of "mat" in a dictionary, you don't read every page front to back. You jump to the **index pages**, find "mat" alphabetically, and jump directly to the page number.
- A database index works identically: it's a separate, sorted structure (technically a **B+Tree**, not a binary tree — a *balanced* tree) that maps a column's values → the physical location of the matching row. `EXPLAIN ANALYZE` shows you whether Postgres used a slow **Sequential (Parallel Seq) Scan** (check every row, one by one) or a fast **Index Scan** (jump straight to the location via the B+Tree).

---

## The problem indexes solve
Without an index, finding one row by e.g. `name = 'XYZ'` in a million-row table means Postgres must check **every single row**, one at a time, until it finds a match — this is a **Sequential Scan** (Postgres calls it a "Parallel Seq Scan" because it internally spins up multiple worker processes to scan chunks in parallel — but it's still fundamentally checking rows one-by-one).

```sql
-- Generate 1 million random rows to demonstrate the problem at scale
CREATE TABLE marks (
    id SERIAL PRIMARY KEY,
    name TEXT,
    marks INT NOT NULL
);

INSERT INTO marks (name, marks)
SELECT
    substr(translate(md5(random()::text || gs::text), 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 1, 12) AS name,
    floor(random() * 100 + 1)::int AS marks
FROM generate_series(1, 1000000) AS gs;

-- See what Postgres is actually doing internally:
EXPLAIN ANALYZE SELECT marks FROM marks WHERE name = '809E15792322';
```
```text
                                                     QUERY PLAN
---------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..11220.85 rows=1 width=4) (actual time=48.912..52.301 rows=1 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   ->  Parallel Seq Scan on marks  (cost=0.00..10220.75 rows=1 width=4) (actual time=39.774..48.921 rows=0 loops=3)
         Filter: (name = '809E15792322'::text)
         Rows Removed by Filter: 333333
 Planning Time: 0.114 ms
 Execution Time: 52.335 ms
```
> Read this bottom-up: Postgres spun up **2 parallel workers** and still had to check all **1,000,000 rows** (visible in `Rows Removed by Filter: 333333` per worker), taking **~52ms** total. `Parallel Seq Scan` confirms no index was used — this is the "check every row" scenario the Dictionary analogy above warns about.

## `EXPLAIN ANALYZE` — jumping into the DB's internals
`EXPLAIN ANALYZE` shows you the **query plan** and *actual* execution time — it answers "how will this query run, and how long did it really take?" This is literally what the query planner does internally every time you run any query; `EXPLAIN ANALYZE` just makes it visible to you.

## Creating an index
```sql
DROP INDEX IF EXISTS idx_name;
```
```text
DROP INDEX
```
```sql
CREATE INDEX idx_name ON marks (name);
```
```text
CREATE INDEX
```
> On a real million-row table, this itself can take a few seconds — `CREATE INDEX` isn't instant; Postgres has to read every existing row once to build the B+Tree.

```sql
-- Re-run the SAME query now that the index exists:
EXPLAIN ANALYZE SELECT marks FROM marks WHERE name = '809E15792322';
```
```text
                                                        QUERY PLAN
---------------------------------------------------------------------------------------------------------------------
 Index Scan using idx_name on marks  (cost=0.42..8.44 rows=1 width=4) (actual time=0.038..0.039 rows=1 loops=1)
   Index Cond: (name = '809E15792322'::text)
 Planning Time: 0.087 ms
 Execution Time: 0.058 ms
```
> Same query, same data — but now it says **`Index Scan`** instead of `Parallel Seq Scan`, and execution time dropped from **~52ms to ~0.06ms**: roughly **900x faster**. This is the single most convincing demonstration of why indexes exist.

```sql
-- A "covering index" — also stores marks alongside the index on `name`,
-- so a query needing only (name, marks) never has to visit the actual table at all.
CREATE INDEX idx_name_covering ON marks (name) INCLUDE (marks);
```
```text
CREATE INDEX
```
```sql
EXPLAIN ANALYZE SELECT marks FROM marks WHERE name = '809E15792322';
```
```text
                                                            QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------
 Index Only Scan using idx_name_covering on marks  (cost=0.42..4.44 rows=1 width=4) (actual time=0.021..0.022 rows=1 loops=1)
   Index Cond: (name = '809E15792322'::text)
   Heap Fetches: 0
 Planning Time: 0.075 ms
 Execution Time: 0.041 ms
```
> Notice it's now an **`Index Only Scan`** with `Heap Fetches: 0` — Postgres answered the entire query from the index alone, never touching the actual `marks` table on disk at all, because the index already contains everything the query asked for (`name` to search by, `marks` to return).

## How an index actually works internally
- Indexes are built as a **B+Tree** (a *balanced* tree, **not** a binary tree) — this data structure keeps lookup, insertion, and range-scan operations efficient even as the tree grows to millions of entries.
- Conceptually, the index stores `(column_value → row location in memory/disk)` pairs, sorted:

```
   Index (B+Tree, sorted)              Actual table (heap, unsorted order)
   ┌─────────────────────┐             ┌───────────────────────────────────┐
   │ 5178FE8BF887 → loc1  │  ────────▶ │ id:1, name:abc, marks:10           │
   │ abc11 → loc2         │             │ id:2, name:pqr, marks:10           │
   │ pqr121 → loc3        │             │ id:3, name:xyz, marks:10           │
   └─────────────────────┘             │ ... (up to 1,000,000 rows) ...     │
                                        └───────────────────────────────────┘
```
- **Without an index**: Postgres checks every row (1 → 2 → 3 → … up to a million) until a match is found — an **Index/Table Scan** on the raw table (a "Seq Scan").
- **With an index**: Postgres first goes to the B+Tree, which — because it's sorted and balanced — finds the matching entry in roughly `log(n)` comparisons instead of `n`, then jumps *directly* to that row's location in the actual table. This is an **Index Scan**, and it's dramatically faster at scale.
- **The catch — indexes are not free**:
  1. They take **disk space** (the index is a separate, physically stored structure).
  2. They take **time to build** (creating an index on a huge existing table is itself a slow operation).
  3. Every `INSERT`/`UPDATE`/`DELETE` must **also update every index** on that table — so indexes slow down writes in exchange for faster reads.
  4. This tradeoff is a decision usually made by a **DB admin**, not casually by every developer, and ideally decided early based on expected read/write patterns.
- **`CONCURRENTLY`**: normally, `CREATE INDEX` takes a lock that blocks concurrent `INSERT`/`UPDATE`/`DELETE` on the table while building. Adding `CONCURRENTLY` builds the index *without* blocking writes — useful on a live production table, though it takes longer overall.
- **Indexes can be created on any column**, not just the primary key — and you can absolutely still query a non-indexed column, it'll just fall back to a sequential scan.

> For the full checklist on *when and how* to add indexes for a specific slow query (composite indexes, partial indexes, functional indexes, and what defeats index usage), see [12-Query-Optimization-Playbook.md](12-Query-Optimization-Playbook.md).

---

**Next up:** [07-Transactions-ACID-Row-Locking-Concurrency.md](07-Transactions-ACID-Row-Locking-Concurrency.md) — making multi-step operations safe.
