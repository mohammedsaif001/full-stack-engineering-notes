# Why Databases Exist & SQL vs NoSQL
## Part 1 of 19 — The Mental Model Before Writing Any Query

> Previous: [00-Setup-Postgres-VSCode-psql.md](00-Setup-Postgres-VSCode-psql.md)

---

## 📌 Executive Summary

- **A database is software** (Postgres, MySQL, MongoDB). Software doesn't store bytes — the **hard disk / SSD** does. A database's real job is to sit between your application and the disk and give you a *query language* to say "get me this data" instead of hand-writing a program that walks raw disk sectors.
- **SQL vs NoSQL in one line:** SQL databases enforce a **strict, predefined schema** before you can insert a row — like TypeScript. NoSQL databases are **flexibly structured** — like JavaScript. Adding a field in NoSQL is just assigning it; in SQL you must `ALTER TABLE` first.
- **RDBMS ≈ Excel, formalised:** a Relational Database Management System stores data in **tables** (rows × columns), like a spreadsheet, but with strict data types and rules enforced on every single cell.
- **SQL has four sub-languages**, and every command you'll ever write belongs to one of them: **DDL** (structure), **DML** (row data), **DQL** (reading), **DCL** (permissions).
- **ORMs** (Prisma, Drizzle) let you define schema in JavaScript/TypeScript and generate SQL for you. Converting that code-level schema into real `CREATE TABLE` / `ALTER TABLE` statements and applying them is called a **migration**.
- **Pick SQL** when correctness matters (money, orders, bookings) — its strictness is the feature. **Pick NoSQL** when the shape of your data keeps changing and raw write speed matters more than airtight integrity (chat messages, event logs).

---

## 🧠 Core Analogy: The Librarian and the Library Building

- **The hard disk / SSD** is the physical library building. It *actually* holds every book (every byte), addressed by shelf location. It understands only one kind of request: "give me what's at location X, for length Y."
- **The database (Postgres)** is the librarian. You never walk the shelves yourself. You ask the librarian a question in a language it understands (SQL). Internally it works out a **query plan**, walks to the right shelf, and hands you the answer.
- **Why not skip the librarian and read the disk directly?** With a handful of rows you *could* write a program to scan raw bytes. At a billion rows it's hopeless — the librarian has already solved indexing, concurrent access, and crash recovery for you. That is the entire value of a database: it **decouples your application code from raw hardware I/O**.

### A second angle: "Shubham teaches Ankit in Hindi"

- Shubham = your **Express server**. Ankit = the **database engine** (Postgres). Ankit's brain = the **hard disk**.
- Ankit only understands English (the low-level machine operations the engine runs) — but the lesson Shubham wants delivered is written in Hindi. That "Hindi" is **SQL**: a structured, high-level language both sides agree on.
- Shubham speaks the query in SQL → Ankit parses it, works out the intent, runs operations on his own storage (his brain / the disk) → hands the result back.
- **SQL = Structured Query Language.** It's just the shared language an application uses to *tell* the database what to do. The database is the one that actually performs the work on disk.

---

## 🗄️ 1. Why Databases Exist

**The core problem:** a database is *software*, and software holds nothing permanently — the **disk** does. Under the hood, ~90% of the time, every database (SQL or NoSQL) ultimately reads and writes the same kind of disk.

Without a database, to fetch "the user whose username is `wajeshubham`" you'd have to write a low-level program that scans raw disk to locate that field. Fine for ten records. Impossible at a billion.

What a database gives you instead:

1. You send it a **query** — a request in a language it understands.
2. It builds a **query plan** — its internal strategy for finding the answer efficiently.
3. It executes that plan against the disk.
4. It returns the result to your application.

**Why you "need" one at all:** to decouple your backend code from raw hardware I/O. Any time you read or write data that must survive a restart, you go *through* the database rather than touching files yourself. You also inherit, for free: indexing, multi-user concurrency, transactions, crash recovery, backups, and access control.

---

## 🔀 2. SQL vs NoSQL — the real distinction

| | **SQL (Relational)** | **NoSQL** |
|---|---|---|
| Structure | Fixed schema, defined **upfront** | Flexible, shaped per-record |
| Mental model | TypeScript (strict, checked before it runs) | JavaScript (dynamic, checked as it runs) |
| Storage shape | Tables — rows × columns, like Excel | Documents / collections (JSON-like), key-value, wide-column, graph |
| Adding a new field | Requires `ALTER TABLE` first | Just assign it — no declaration needed |
| Examples | **PostgreSQL**, MySQL, Oracle, SQL Server | MongoDB (documents), Redis (key-value), Cassandra (wide-column), Neo4j (graph) |
| Relationships | First-class — `JOIN` across tables | Usually denormalised / embedded, or joined in app code |
| Best for | Data needing **strict integrity** — money, orders, inventory, bookings | Rapidly evolving shapes, very high write throughput, caching, logs |
| ACID guarantees | Most SQL databases are fully ACID (Postgres, MySQL) | Varies — many trade strict consistency for speed/availability |

### The TypeScript vs JavaScript parallel, spelled out

- **TypeScript / SQL — strict.** If a type is `{ a: string; b: number }`, you can't write `obj.c = 2` — the compiler blocks it. Likewise, if a table has columns `a` and `b`, you **cannot** insert into a column `c` until you `ALTER TABLE ... ADD COLUMN c`.
- **JavaScript / NoSQL — dynamic.** `const obj = {}; obj.c = 2;` just works. MongoDB lets you drop a brand-new field into a document with no schema change anywhere.

### When to pick which

- **Chat app / activity feed / event log:** messages get written extremely fast, and their shape keeps growing (reactions, edited flags, attachments, threading). You don't want a schema migration every time. Lean **NoSQL**.
- **Payments / orders / seat booking / inventory:** the data must never silently become invalid or half-updated. SQL's strictness and **ACID** guarantees are exactly what you want. Lean **SQL**.
- **Most CRUD web apps** land comfortably in SQL, and Postgres in particular gives you a `JSONB` column type for the rare cases where you genuinely want a flexible blob *inside* an otherwise relational table.

> **RDBMS** = **R**elational **D**atabase **M**anagement **S**ystem — the family of SQL databases that store data as related tables. The one-line model: **RDBMS ≈ Excel with enforced rules.** Columns have strict types; you cannot put the string `"hello"` into a number column.

---

## 🧬 3. The four sub-languages of SQL

Every SQL statement belongs to one of these four buckets. Knowing which bucket a command is in tells you *what it affects* and *how dangerous it is*.

| Sub-language | Full name | What it touches | Commands | Covered in |
|---|---|---|---|---|
| **DDL** | Data **Definition** Language | The *structure* — databases, tables, columns, constraints, indexes | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | [02](02-DDL-Creating-Tables-Data-Types.md), [03](03-DDL-Constraints-Alter-Drop.md) |
| **DML** | Data **Manipulation** Language | The *rows* inside a table — the write side of CRUD | `INSERT`, `UPDATE`, `DELETE` | [04](04-DML-Insert-Update-Delete.md) |
| **DQL** | Data **Query** Language | *Reading* data, changing nothing | `SELECT` (with `WHERE`, `ORDER BY`, `LIMIT`, …) | [05](05-DQL-Select-Where-Filtering.md), [06](06-Aggregation-GroupBy-Having.md) |
| **DCL** | Data **Control** Language | *Permissions* — who is allowed to do what | `GRANT`, `REVOKE`, `CREATE ROLE` | [12](12-DCL-Roles-Grant-Revoke.md) |

> Some texts add **TCL** (Transaction Control Language) for `BEGIN` / `COMMIT` / `ROLLBACK` / `SAVEPOINT`. This series folds those into the Transactions file ([15](15-Transactions-ACID-Locking.md)).

Mnemonic for the split: **DDL builds the house, DML furnishes the rooms, DQL walks through and looks around, DCL hands out the keys.**

---

## 🔧 4. ORM / ODM and "migrations"

Writing raw SQL by hand from application code gets repetitive and error-prone, so most teams use a library to define the schema *in code* and translate it to SQL.

- **ORM — Object-Relational Mapping.** Maps code-level objects ↔ relational tables. For Postgres in the Node.js world: **Prisma**, **Drizzle**, **TypeORM**, or the raw **`pg`** client.
- **ODM — Object-Document Mapper.** The NoSQL equivalent — maps objects ↔ documents. Example: **Mongoose** (for MongoDB; technically an ODM, often loosely called an ORM).
- **Migration.** You describe a table shape in TypeScript. The database doesn't understand TypeScript, so the ORM *generates* the equivalent `CREATE TABLE` / `ALTER TABLE` SQL and *applies* it. That generate-and-apply step is a **migration** — you're "migrating" a schema change from your code into the actual database. Migrations are versioned and checked into git, so every environment (your laptop, staging, production) can be brought to the same schema state.

You'll still want to understand the SQL underneath — when a query is slow or a migration fails, the ORM abstraction leaks and you're reading raw SQL again. That's what the rest of this series is for.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What does SQL stand for? | Structured Query Language |
| Is SQL a database? | No — it's the *language*. Postgres/MySQL are databases (RDBMS) that speak it |
| SQL vs NoSQL, core difference? | SQL enforces a fixed schema before insert; NoSQL shapes data per-record with no upfront schema |
| What is an RDBMS? | A relational database — stores data as related tables with enforced types and constraints |
| Name the four SQL sub-languages | DDL (structure), DML (row data), DQL (reads), DCL (permissions) |
| What is a migration? | Generating and applying the SQL (`CREATE`/`ALTER`) that brings the database schema in line with your code-level schema definition |
| When would you choose NoSQL over SQL? | When the data shape changes often and write speed/scale matters more than strict multi-row integrity (chat, logs, caching) |

---

**Next up:** [02-DDL-Creating-Tables-Data-Types.md](02-DDL-Creating-Tables-Data-Types.md) — `CREATE TABLE` and choosing the right data type for every column.
