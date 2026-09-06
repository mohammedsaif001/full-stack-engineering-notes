# 08 — SQL & PostgreSQL

A top-to-bottom SQL course for someone who has never opened a database. Read the files in order — each one builds on the last, and the terminology only gets introduced right before it's used.

Every file follows the same shape: a **📌 Executive Summary**, a **🧠 Core Analogy**, numbered deep-dive sections with runnable examples and their real output, and a **🎓 Interview one-liners** table at the end. All syntax is **PostgreSQL**; differences from MySQL/SQLite are noted only where a beginner would trip.

---

## The path

| # | File | What you'll be able to do after it |
|---|---|---|
| 00 | [Setup — Postgres, psql & VS Code](00-Setup-Postgres-VSCode-psql.md) | Run Postgres in Docker, connect with psql and VS Code SQLTools, create/drop databases, load the practice data |
| 01 | [Why Databases Exist & SQL vs NoSQL](01-Why-Databases-Exist-SQL-vs-NoSQL.md) | Explain what a database actually is, when to pick SQL vs NoSQL, and the four sub-languages |
| 02 | [DDL 1 — Creating Tables & Data Types](02-DDL-Creating-Tables-Data-Types.md) | Write `CREATE TABLE` and pick the right type for every column (and know why phone numbers aren't `INT`) |
| 03 | [DDL 2 — Constraints, ALTER, DROP](03-DDL-Constraints-Alter-Drop.md) | Use every constraint, evolve a table with `ALTER`, and tell `DROP`/`TRUNCATE`/`DELETE` apart |
| 04 | [DML — Insert, Update, Delete](04-DML-Insert-Update-Delete.md) | Write rows safely, get IDs back with `RETURNING`, and do upserts with `ON CONFLICT` |
| 05 | [DQL — SELECT, WHERE, Filtering](05-DQL-Select-Where-Filtering.md) | Query with every operator, handle `NULL` correctly, sort, paginate, and use `CASE` and `DISTINCT` |
| 06 | [Aggregation — GROUP BY, HAVING](06-Aggregation-GroupBy-Having.md) | Turn rows into summaries, and internalise the clause execution order |
| 07 | [Joins — Combining Tables](07-Joins-Combining-Tables.md) | INNER / LEFT / RIGHT / FULL / SELF / CROSS joins, anti-joins, and set operations |
| 08 | [Subqueries](08-Subqueries.md) | Scalar, `IN`, `EXISTS`, derived tables, and correlated subqueries — and when to stop using them |
| 09 | [CTEs — Common Table Expressions](09-CTEs-Common-Table-Expressions.md) | `WITH`, chaining multiple CTEs correctly, pipelines, and recursion |
| 10 | [Window Functions](10-Window-Functions.md) | `OVER()`, `PARTITION BY` vs `GROUP BY`, ranking, running totals, `LAG`/`LEAD`, Nth-per-group |
| 11 | [Views](11-Views.md) | Save a query as a virtual table; know when to reach for a materialized view |
| 12 | [DCL — Roles, GRANT, REVOKE](12-DCL-Roles-Grant-Revoke.md) | Set up least-privilege roles for an application and its BI tools |
| 13 | [Schema Design & Normalization](13-Schema-Design-Normalization.md) | Model relationships, build junction tables, and reason about 1NF→3NF and the anomalies they prevent |
| 14 | [Indexing & Query Performance](14-Indexing-Query-Performance.md) | Read `EXPLAIN ANALYZE`, understand B+Trees, and know the true cost of an index |
| 15 | [Transactions, ACID & Locking](15-Transactions-ACID-Locking.md) | Make multi-step operations safe, lock rows against races, and choose an isolation level |
| 16 | [Query Optimization Playbook](16-Query-Optimization-Playbook.md) | Work a slow query, in order, from measurement to caching |
| 17 | [Classic Interview Query Patterns](17-Interview-Query-Patterns.md) | Solve the ~12 queries every SQL interview asks — Nth highest, duplicates, self-joins, pivots, gaps |
| 18 | [Cheat Sheet & Quick Reference](18-Cheat-Sheet-Quick-Reference.md) | Recall the whole series on one page before an interview |
| 19 | [**ORMs — Drizzle & Prisma**](19-ORM/README.md) | Stop hand-writing SQL in app code: what an ORM is, why, migrations, and full Drizzle **and** Prisma setups for Express + Postgres (schema, CRUD, relations, transactions, a real router) |

---

## The practice data

Two small datasets, created once in [00](00-Setup-Postgres-VSCode-psql.md):

- **`company`** (`employees`) — used by aggregation, joins, window functions, and the interview patterns. 10 employees across Engineering / Sales / Marketing, with deliberate salary ties and a `manager_id` self-reference.
- **`campus`** (`students`, `exam_scores`, `projects`) — used by subqueries and CTEs. Plus a `bank_transactions` table for the running-balance example.

A few files (DQL, aggregation, indexing, schema design, transactions) create a small purpose-built table inline where the scenario needs a specific shape — those are self-contained and clearly marked.

---

## If you only have an hour

00 → 01 → 05 → 06 → 07 → 10 → 17. That's setup, the mental model, reading data, aggregation, joins, window functions, and the interview patterns — enough to be dangerous.
