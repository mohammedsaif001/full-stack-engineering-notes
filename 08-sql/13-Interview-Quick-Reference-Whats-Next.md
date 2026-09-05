# Interview-Ready Quick Reference & What's Next
## Condensed Q&A Summary and Topics Beyond This Series

> Previous: [12-Query-Optimization-Playbook.md](12-Query-Optimization-Playbook.md)

---

## 🎓 Interview-Ready Quick Reference

| Question | Answer |
|---|---|
| What does SQL stand for? | Structured Query Language |
| What is DDL? | Data Definition Language — defines/alters structure (`CREATE`, `ALTER`, `DROP`) |
| What is DML? | Data Manipulation Language — edits row data (`INSERT`, `UPDATE`, `DELETE`) |
| What is DQL? | Data Query Language — reads data without modifying it (`SELECT`) |
| What's the difference between `CHAR` and `VARCHAR`? | `CHAR(n)` is fixed-length and space-pads short values; `VARCHAR(n)` is variable-length and stores only what's needed |
| Why shouldn't phone numbers be `INT`? | Leading zeros are dropped, hyphens aren't valid integers, and large numbers can overflow `INT`'s ~2.1 billion range |
| What is a Primary Key? | A column (or set of columns) that uniquely identifies each row; never NULL, never duplicated |
| What is a Foreign Key? | A column whose value must reference a Primary Key in another table, creating a relationship between the two |
| `DELETE` vs `TRUNCATE`? | Both empty rows without touching structure; `DELETE` supports `WHERE` and is transaction-safe, `TRUNCATE` wipes everything at once |
| Why does `RIGHT JOIN` rarely get used? | Flipping table order and using `LEFT JOIN` instead reads more naturally — same result, cleaner code |
| What's the point of an index? | Turns an O(n) full table scan into a much faster lookup via a sorted B+Tree structure, at the cost of extra disk space and slower writes |
| What does `EXPLAIN ANALYZE` do? | Shows the actual query plan and execution time Postgres used — reveals whether a Seq Scan or Index Scan was used |
| What are the 4 ACID properties? | Atomicity, Consistency, Isolation, Durability |
| Name a database that is NOT ACID-compliant. | Apache Cassandra |
| What is a dirty read? | Reading another transaction's uncommitted changes |
| What prevents SQL injection? | Parameterized queries (`$1`, `$2`, …) instead of string-concatenating user input into SQL |
| What does `SELECT ... FOR UPDATE` do? | Locks the selected row(s) until the transaction ends, preventing another concurrent transaction from reading/modifying the same row in the meantime |
| What is a connection pool? | A managed set of reusable, already-open database connections, borrowed and released per request instead of opening a new one each time |
| How do you find the Nth highest salary? | `DENSE_RANK() OVER (ORDER BY salary DESC)` wrapped in a subquery, filtered to `rnk = N` — handles duplicate salaries correctly, unlike `LIMIT/OFFSET` |
| How do you find the Nth highest salary per group? | Same `DENSE_RANK()`, but add `PARTITION BY <group_column>` so ranking resets per group |
| `RANK()` vs `DENSE_RANK()` vs `ROW_NUMBER()`? | `RANK` skips numbers after a tie (1,1,3), `DENSE_RANK` doesn't (1,1,2), `ROW_NUMBER` never ties (1,2,3) |
| Why avoid `SELECT *`? | Wastes I/O/bandwidth, and can prevent Postgres from using an efficient Index Only Scan |
| Why avoid floating point (`REAL`/`DOUBLE`) for money? | Binary floating point causes rounding errors (`0.1 + 0.2 ≠ 0.3` exactly) — use `NUMERIC(p,s)` instead |
| Why is `OFFSET` slow for deep pagination? | Postgres must still count past every skipped row internally — use keyset pagination (`WHERE id > last_seen_id`) instead |
| What does `ANALYZE` do? | Refreshes the query planner's internal statistics about a table so it can make good Seq-Scan-vs-Index-Scan decisions |

---

## 🧩 What's Next (Beyond This Series)

Window functions, CTEs, and query optimization are covered in depth in [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md) and [12-Query-Optimization-Playbook.md](12-Query-Optimization-Playbook.md). What's genuinely left beyond this series:
- **Views & Materialized Views** — a saved, reusable query that behaves like a virtual table (a Materialized View additionally *caches* the result physically, refreshed on demand).
- **Stored Procedures & Functions** (`CREATE FUNCTION` / `CREATE PROCEDURE`, PL/pgSQL) — reusable, named blocks of procedural SQL logic saved inside the database itself (this is also how auto-increment sequences work under the hood).
- **Triggers** — functions that automatically run `BEFORE`/`AFTER` an `INSERT`/`UPDATE`/`DELETE` on a table (e.g., auto-updating an `updated_at` column).
- **`DCL` (Data Control Language)** — `GRANT` / `REVOKE`, for managing *who* can do *what* on a database (roles/permissions).
- **Isolation Levels** (`READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`) — fine-grained control over exactly which concurrency anomalies (dirty/non-repeatable/phantom reads) a transaction is allowed to be exposed to; set per-transaction with `SET TRANSACTION ISOLATION LEVEL ...`.
- **Database replication & sharding** — scaling reads/writes horizontally across multiple database servers once a single instance isn't enough.
- **Full-text search** (`tsvector`, `tsquery`, `to_tsvector(...)`) — Postgres's built-in search engine for querying free text without a separate search service.
