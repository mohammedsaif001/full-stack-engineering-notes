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

## `EXPLAIN ANALYZE` — jumping into the DB's internals
`EXPLAIN ANALYZE` shows you the **query plan** and *actual* execution time — it answers "how will this query run, and how long did it really take?" This is literally what the query planner does internally every time you run any query; `EXPLAIN ANALYZE` just makes it visible to you.

## Creating an index
```sql
DROP INDEX IF EXISTS idx_name;
CREATE INDEX idx_name ON marks (name);

-- A "covering index" — also stores marks alongside the index on `name`,
-- so a query needing only (name, marks) never has to visit the actual table at all.
CREATE INDEX idx_name_covering ON marks (name) INCLUDE (marks);

-- Build the index WITHOUT locking the table for concurrent writers (safer in production):
CREATE INDEX CONCURRENTLY idx_name_safe ON marks (name);
```

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
