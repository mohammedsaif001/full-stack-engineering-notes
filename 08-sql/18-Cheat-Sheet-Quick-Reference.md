# SQL Cheat Sheet & Quick Reference
## Part 18 of 19 — The Whole Series, Condensed

> Previous: [17-Interview-Query-Patterns.md](17-Interview-Query-Patterns.md)

---

## 📌 How to use this file

One-page recall for everything in the series. Skim it before an interview; use it as an index back into the deep-dive files. Every row links a fact to the file that explains it in full.

---

## 🧭 The clause execution order (memorise this one thing)

```text
Written:   SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
Executed:  FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

| It explains why… | Reason |
|---|---|
| `WHERE` can't use `SUM(...)` | `WHERE` runs before `GROUP BY` — use `HAVING` |
| `WHERE` can't use a `SELECT` alias | the alias is created in `SELECT`, which runs later |
| `ORDER BY` **can** use a `SELECT` alias | `ORDER BY` runs after `SELECT` |
| a window function can't go in `WHERE` | window functions run in the `SELECT` step — wrap in a CTE, filter outside |

Full detail: [06](06-Aggregation-GroupBy-Having.md).

---

## 🗂️ The four (five) sub-languages

| | Purpose | Commands | File |
|---|---|---|---|
| **DDL** | structure | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | [02](02-DDL-Creating-Tables-Data-Types.md), [03](03-DDL-Constraints-Alter-Drop.md) |
| **DML** | row data | `INSERT`, `UPDATE`, `DELETE` | [04](04-DML-Insert-Update-Delete.md) |
| **DQL** | reads | `SELECT` | [05](05-DQL-Select-Where-Filtering.md), [06](06-Aggregation-GroupBy-Having.md) |
| **DCL** | permissions | `GRANT`, `REVOKE`, `CREATE ROLE` | [12](12-DCL-Roles-Grant-Revoke.md) |
| **TCL** | transactions | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` | [15](15-Transactions-ACID-Locking.md) |

---

## 🔧 psql quick commands

| Command | Does |
|---|---|
| `\l` | list databases |
| `\c dbname` | connect to a database |
| `\dt` | list tables |
| `\d table` | describe a table (columns, indexes, constraints) |
| `\dv` / `\du` / `\dn` | list views / roles / schemas |
| `\x` | toggle expanded (vertical) row display |
| `\q` | quit |

Setup, Docker, VS Code SQLTools: [00](00-Setup-Postgres-VSCode-psql.md).

---

## 🧱 Data types — the short list

| Need | Type | File |
|---|---|---|
| Whole-number ID | `SERIAL` / `BIGSERIAL` (or `UUID`) | [02](02-DDL-Creating-Tables-Data-Types.md) |
| Money | `NUMERIC(p, s)` — **never** `FLOAT`/`REAL`/`MONEY` | [02](02-DDL-Creating-Tables-Data-Types.md) |
| Short text, known max | `VARCHAR(n)` | [02](02-DDL-Creating-Tables-Data-Types.md) |
| Long free text | `TEXT` | [02](02-DDL-Creating-Tables-Data-Types.md) |
| Phone number | `VARCHAR(15)` — **never** a number type | [02](02-DDL-Creating-Tables-Data-Types.md) |
| True/false | `BOOLEAN` | [02](02-DDL-Creating-Tables-Data-Types.md) |
| "When it happened" | `TIMESTAMPTZ` | [02](02-DDL-Creating-Tables-Data-Types.md) |
| Flexible blob | `JSONB` | [02](02-DDL-Creating-Tables-Data-Types.md) |

---

## 🔒 Constraints

| Constraint | Rule | Violation code |
|---|---|---|
| `PRIMARY KEY` | unique + not null, one per table | `23505` |
| `FOREIGN KEY` | value must exist in another table's PK | `23503` |
| `UNIQUE` | no duplicates (NULLs exempt) | `23505` |
| `NOT NULL` | mandatory | `23502` |
| `CHECK (cond)` | custom boolean rule | `23514` |
| `DEFAULT val` | auto-fill when omitted | — |

`ALTER TABLE` / `DROP` / `TRUNCATE` / sequences: [03](03-DDL-Constraints-Alter-Drop.md).

---

## 🔗 Joins

| Join | Returns |
|---|---|
| `INNER JOIN` | only rows matching in both tables |
| `LEFT JOIN` | all left rows + matched right (NULL if none) |
| `RIGHT JOIN` | mirror of LEFT (rarely used — flip tables) |
| `FULL OUTER JOIN` | all rows from both, matched where possible |
| `SELF JOIN` | a table joined to itself (aliased twice) |
| `CROSS JOIN` | every left × every right combination |

Anti-join = `LEFT JOIN ... WHERE right.<pk> IS NULL`. Set ops: `UNION` (dedup) / `UNION ALL` (keep dups) / `INTERSECT` / `EXCEPT`. File [07](07-Joins-Combining-Tables.md).

---

## 🎯 Advanced query tools — which one?

| Situation | Tool | File |
|---|---|---|
| One value to compare against, used once | **Subquery** (scalar) | [08](08-Subqueries.md) |
| A membership test against a list | **Subquery** (`IN` / `EXISTS`) | [08](08-Subqueries.md) |
| Same sub-result needed 2+ times, or 3+ levels of nesting | **CTE** | [09](09-CTEs-Common-Table-Expressions.md) |
| A multi-step pipeline (filter → aggregate → join → filter) | **Chained CTEs** | [09](09-CTEs-Common-Table-Expressions.md) |
| Tree / hierarchy walking | **Recursive CTE** | [09](09-CTEs-Common-Table-Expressions.md) |
| Per-row output **plus** a group calc (running total, rank, % of group) | **Window function** | [10](10-Window-Functions.md) |
| Nth highest / top-N per group | **Window function in a CTE**, filter outside | [10](10-Window-Functions.md), [17](17-Interview-Query-Patterns.md) |
| Result reused across **many separate queries** | **`VIEW`** | [11](11-Views.md) |
| Expensive aggregation, staleness OK | **Materialized view** | [11](11-Views.md) |

### Ranking functions

| Function | On a tie | After a tie |
|---|---|---|
| `ROW_NUMBER()` | forces unique numbers | `+1` (1,2,3,4) |
| `RANK()` | tied rows share | **skips** (1,2,2,4) |
| `DENSE_RANK()` | tied rows share | **no gap** (1,2,2,3) |

### CTE syntax rules

- One `WITH` per statement; separate multiple CTEs with **commas**; **no comma** before the final `SELECT`.
- A `WITH` must be followed by a statement that uses it.
- A later CTE can reference an earlier one, not vice versa.

---

## 🕳️ `NULL` rules

- `NULL` is "unknown" — not `0`, `''`, `FALSE`.
- `col = NULL` → never true. Use `IS NULL` / `IS NOT NULL`.
- `NOT IN (list with a NULL)` → excludes every row. Use `NOT EXISTS`.
- Aggregates (`SUM`, `AVG`, `COUNT(col)`) skip `NULL`. `COUNT(*)` doesn't.
- `COALESCE(a, b, …)` → first non-NULL. `NULLIF(a, b)` → `NULL` if `a = b`.

File [05](05-DQL-Select-Where-Filtering.md).

---

## ⚡ Performance

| Symptom | Fix | File |
|---|---|---|
| `Seq Scan` on a big table | index the `WHERE`/`JOIN`/`ORDER BY` columns | [14](14-Indexing-Query-Performance.md) |
| `SELECT *` everywhere | select only needed columns | [16](16-Query-Optimization-Playbook.md) |
| `WHERE LOWER(col) = ...` | functional index on `LOWER(col)` | [16](16-Query-Optimization-Playbook.md) |
| `LIKE '%x'` slow | leading wildcard can't use a B+Tree — rethink | [16](16-Query-Optimization-Playbook.md) |
| deep `OFFSET` slow | keyset pagination (`WHERE id > last_seen`) | [16](16-Query-Optimization-Playbook.md) |
| planner making bad choices after a bulk load | `ANALYZE tablename` | [16](16-Query-Optimization-Playbook.md) |
| loop of single-row inserts | one multi-row `INSERT` | [16](16-Query-Optimization-Playbook.md) |

`EXPLAIN ANALYZE` first, always.

---

## 🔐 Transactions & ACID

- `BEGIN` … `COMMIT` (permanent) / `ROLLBACK` (undo all since `BEGIN`).
- First error in a transaction aborts the whole block.
- **ACID**: Atomicity, Consistency, Isolation, Durability (via Write-Ahead Log).
- `SELECT ... FOR UPDATE` locks matched rows until the transaction ends; others wait.
- Isolation levels: `READ COMMITTED` (default) → `REPEATABLE READ` → `SERIALIZABLE`.
- Anomalies: dirty read, non-repeatable read, phantom read.
- Not ACID by default: Apache Cassandra.
- Parameterized queries (`$1`, `$2`) prevent SQL injection.

File [15](15-Transactions-ACID-Locking.md).

---

## 🎓 Rapid-fire Q&A

| Question | Answer |
|---|---|
| SQL stands for? | Structured Query Language |
| DDL / DML / DQL / DCL? | structure / row data / reads / permissions |
| `CHAR` vs `VARCHAR`? | fixed-length space-padded vs variable-length |
| Why not `INT` for phone numbers? | leading zeros dropped, symbols invalid, overflow; no math needed |
| Why not `FLOAT` for money? | binary float can't represent `0.1 + 0.2` exactly — use `NUMERIC` |
| Primary key? | unique row identity — never NULL, never duplicated |
| Foreign key? | value must reference another table's PK |
| `DELETE` vs `TRUNCATE` vs `DROP`? | selected rows (has `WHERE`) / all rows fast / the whole table |
| Why gaps in `SERIAL` ids? | the sequence only moves forward — deleted/rolled-back ids never reused |
| `WHERE` vs `HAVING`? | rows before grouping vs groups after grouping |
| Clause execution order? | FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT |
| `INNER` vs `LEFT JOIN`? | matched only vs all left rows + NULL-filled right |
| Why is `RIGHT JOIN` rare? | flip the tables and use `LEFT` — same result, reads better |
| Self-join, when? | comparing rows within one table (employee vs manager) |
| `UNION` vs `UNION ALL`? | dedup (slower) vs keep dups (faster) |
| Subquery vs CTE? | same computation; CTE adds a name, readability, reuse, testability |
| CTE vs view? | CTE = one statement; view = saved, reusable across statements |
| Multiple CTEs syntax? | one `WITH`, comma-separated, no comma before final `SELECT` |
| Recursive CTE parts? | anchor `UNION ALL` recursive step |
| `GROUP BY` vs `PARTITION BY`? | collapses to one row per group vs keeps every row, annotated |
| `RANK` vs `DENSE_RANK` vs `ROW_NUMBER`? | 1,2,2,4 / 1,2,2,3 / 1,2,3,4 |
| Why can't a window function be in `WHERE`? | computed after WHERE/GROUP BY/HAVING — wrap in a CTE |
| Nth highest per group? | `DENSE_RANK() OVER (PARTITION BY g ORDER BY x DESC)` in a CTE, `WHERE rnk = N` |
| Point of an index? | O(n) scan → O(log n) B+Tree lookup; costs disk + slower writes |
| B+Tree vs binary tree? | balanced, high fan-out, shallow even for billions of rows |
| `EXPLAIN ANALYZE`? | real plan + real timings; Seq Scan vs Index Scan |
| Why not index everything? | every index slows every write and costs disk |
| Composite index `(a,b)` helps which queries? | `a`, `a AND b` — not `b` alone |
| 4 ACID properties? | Atomicity, Consistency, Isolation, Durability |
| Dirty read? | reading another transaction's uncommitted change |
| `SELECT ... FOR UPDATE`? | locks matched rows until the transaction ends |
| Postgres default isolation? | READ COMMITTED |
| Prevents SQL injection? | parameterized queries (`$1`, `$2`) — never string-concatenation |
| Non-ACID database example? | Apache Cassandra |
| Deep `OFFSET` slow — fix? | keyset pagination |
| Nth highest, no `LIMIT`? | `MAX(x) WHERE x < (SELECT MAX(x) ...)` |
| Find duplicates? | `GROUP BY col HAVING COUNT(*) > 1` |
| Pivot without `PIVOT`? | `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` per column |
| Latest row per group? | `ROW_NUMBER() OVER (PARTITION BY g ORDER BY ts DESC)` = 1, or `DISTINCT ON (g)` |
| Rows with no related record? | `NOT EXISTS` or `LEFT JOIN ... IS NULL` |
| What is a migration? | generating + applying the SQL that syncs the DB schema to your code's schema |
| View vs materialized view? | live re-query vs stored snapshot refreshed on demand |
| DCL: user vs role in Postgres? | same thing — a user is a role `WITH LOGIN` |

---

## 🧩 Beyond this series

- **Stored procedures & functions** (`CREATE FUNCTION`, PL/pgSQL) — named procedural logic inside the database.
- **Triggers** — functions that auto-run `BEFORE`/`AFTER` an `INSERT`/`UPDATE`/`DELETE` (e.g. maintain an `updated_at`, or a denormalized count from [13](13-Schema-Design-Normalization.md)).
- **Full-text search** (`tsvector`, `tsquery`, `to_tsvector`) — Postgres's built-in search engine.
- **Partitioning** — splitting one huge table into physical chunks by range/list/hash.
- **Replication & sharding** — scaling reads/writes across multiple servers.
- **Extensions** — `pg_trgm` (fuzzy text search / trigram indexes), `PostGIS` (geospatial), `pg_stat_statements` (query profiling).

---

**Back to the start:** [00-Setup-Postgres-VSCode-psql.md](00-Setup-Postgres-VSCode-psql.md) · **Series index:** [README.md](README.md)
