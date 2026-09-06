# Transactions, ACID & Concurrency
## Part 15 of 19 — `BEGIN`/`COMMIT`/`ROLLBACK`, ACID, Row Locking, Isolation Levels

> Previous: [14-Indexing-Query-Performance.md](14-Indexing-Query-Performance.md)

---

## 📌 Executive Summary

- A **transaction** groups statements into one unit: **all succeed together, or none take effect**. `BEGIN` starts it, `COMMIT` makes it permanent, `ROLLBACK` undoes everything since `BEGIN`.
- **ACID** = **A**tomicity (all-or-nothing), **C**onsistency (only valid states, constraints always hold), **I**solation (uncommitted changes are invisible to others), **D**urability (once committed, survives a crash — via the Write-Ahead Log).
- **Inside a transaction, the first error aborts the whole block** — Postgres rejects every further statement until you `ROLLBACK`. There's no "keep step 1, skip step 2."
- Transactions alone don't stop **two users racing for the same row**. `SELECT ... FOR UPDATE` **locks** the matched rows until the transaction ends; a second transaction wanting the same rows **waits**.
- **`SAVEPOINT`** lets you roll back *part* of a transaction. **Isolation levels** (`READ COMMITTED` → `REPEATABLE READ` → `SERIALIZABLE`) control which concurrency anomalies (dirty / non-repeatable / phantom reads) a transaction can be exposed to.
- **Keep transactions short.** An open transaction holds locks and blocks others.

---

## 🧠 Core Analogy: The All-or-Nothing Checklist

Transferring ₹500 between two envelopes: (1) take ₹500 from A, (2) put ₹500 in B. A power cut *between* the steps and the money vanishes. A transaction wraps both in one unit — if step 2 fails, step 1 is automatically undone (`ROLLBACK`). The money is never lost, never duplicated. That's **Atomicity**.

---

Dataset — a small self-contained `accounts` table:

```sql
CREATE TABLE accounts (
    id      SERIAL PRIMARY KEY,
    owner   VARCHAR(50),
    balance INT CHECK (balance >= 0)     -- no overdrafts
);
INSERT INTO accounts (owner, balance) VALUES ('Shubham', 1000), ('Hitesh', 1000);
```

---

## 1️⃣ The happy path and the failure path

```sql
BEGIN;
    UPDATE accounts SET balance = balance - 500 WHERE owner = 'Shubham';
    UPDATE accounts SET balance = balance + 500 WHERE owner = 'Hitesh';
COMMIT;                       -- both changes saved together, permanently
```
```text
 id |  owner  | balance
----+---------+---------
  1 | Shubham |     500
  2 | Hitesh  |    1500
```

```sql
BEGIN;
    UPDATE accounts SET balance = balance - 5000 WHERE owner = 'Shubham';   -- would be -4500
```
```text
ERROR:  new row for relation "accounts" violates check constraint "accounts_balance_check"
```
```sql
    ROLLBACK;                 -- undo everything since BEGIN
```
> The `CHECK (balance >= 0)` rejected the bad value the instant the `UPDATE` ran. Balances are untouched.

- **Default on any error:** unless you explicitly `COMMIT`, nothing is saved. An error forces the transaction into an aborted state.
- **After `COMMIT` you cannot `ROLLBACK`** — it's finished and permanent.

---

## 2️⃣ ACID, property by property

### A — Atomicity: all-or-nothing

```sql
BEGIN;
    UPDATE accounts SET balance = balance - 200 WHERE owner = 'Shubham';   -- "succeeds"
    SELECT 1 / 0;                                                          -- error!
```
```text
ERROR:  division by zero
```
```sql
    UPDATE accounts SET balance = balance + 200 WHERE owner = 'Hitesh';
```
```text
ERROR:  current transaction is aborted, commands ignored until end of transaction block
```
```sql
ROLLBACK;      -- step 1 is undone too — Shubham is back to his pre-BEGIN balance
```
> Once **any** statement errors, Postgres runs no further statements in the block — you must `ROLLBACK`. There is no way to keep step 1's partial change. That's Atomicity enforced by the engine.

### C — Consistency: only valid states

A transaction can only move the database from one **valid** state to another. Every constraint (`CHECK`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`) is enforced; a transaction that would violate one is rejected outright. The overdraft attempt above is Consistency in action.

### I — Isolation: uncommitted work is invisible to others

```text
Terminal 1 (User A)                        Terminal 2 (User B)
--------------------                       --------------------
BEGIN;
UPDATE accounts SET balance = balance-300
  WHERE owner = 'Shubham';
SELECT balance ... 'Shubham';
  → 200   (A's own uncommitted view)
                                           SELECT balance ... 'Shubham';
                                             → 500   (B does NOT see A's uncommitted change)
COMMIT;
                                           SELECT balance ... 'Shubham';
                                             → 200   (now visible, only after A committed)
```
> B never sees `200` until A commits. Had A rolled back, B would never have been misled by a value that turned out never to exist. This prevents **dirty reads**.

### D — Durability: committed means committed

Once `COMMIT` returns success, the change survives even an immediate crash. Postgres achieves this with a **Write-Ahead Log (WAL)** — changes are flushed to durable storage *before* `COMMIT` reports success.

---

## 3️⃣ `SAVEPOINT` — partial rollback

Roll back *part* of a transaction without abandoning the whole thing:

```sql
BEGIN;
    INSERT INTO accounts (owner, balance) VALUES ('Asha', 500);
    SAVEPOINT after_asha;

    INSERT INTO accounts (owner, balance) VALUES ('Bad', -100);   -- CHECK fails, block aborts to the savepoint
```
```text
ERROR:  new row for relation "accounts" violates check constraint "accounts_balance_check"
```
```sql
    ROLLBACK TO SAVEPOINT after_asha;    -- undo only the bad insert; Asha's insert survives
    INSERT INTO accounts (owner, balance) VALUES ('Bala', 800);
COMMIT;                                   -- Asha and Bala are saved; "Bad" never happened
```

---

## 4️⃣ Row locking — stopping a real race condition

Two users trying to book the **same seat** at the same instant. Transactions don't help — both could read "seat available" and both write "booked." You need a **lock**.

```sql
-- Inside a transaction, in each request handler:
BEGIN;

-- FOR UPDATE locks the matched row(s) until this transaction ends.
SELECT * FROM seats WHERE id = $1 AND is_booked = FALSE FOR UPDATE;

-- if 0 rows: seat already taken → ROLLBACK, tell the user
-- else:
UPDATE seats SET is_booked = TRUE, booked_by = $2 WHERE id = $1;

COMMIT;
```

What happens when A and B race for seat 5:

```text
Client A                                   Client B
--------------------------------------     --------------------------------------
BEGIN;
SELECT * FROM seats WHERE id=5
  AND is_booked=FALSE FOR UPDATE;
  → 1 row — LOCKED
                                           BEGIN;
                                           SELECT * FROM seats WHERE id=5
                                             AND is_booked=FALSE FOR UPDATE;
                                           → ⏳ BLOCKS — waits for A's txn to end
UPDATE seats SET is_booked=TRUE ...;
COMMIT;
  → success, seat 5 booked by A
                                           → (unblocked) re-evaluates WHERE:
                                             0 rows (seat 5 no longer is_booked=FALSE)
                                           → "Seat already booked"
```
> B's query doesn't fail or return stale data — it **waits**, then re-checks the `WHERE` against the now-committed state. No possibility of a double-booking.

### The three ideas this ties together (application context)

1. **`SELECT ... FOR UPDATE`** — locks the selected rows for the rest of the transaction. Other transactions wanting those exact rows wait.
2. **Parameterized queries (`$1`, `$2`)** — never string-concatenate user input into SQL (`` `WHERE id = ${id}` ``); that's **SQL injection**. Placeholders make the driver treat the value strictly as data.
3. **Connection pooling** — opening a fresh DB connection per request is slow. A pool keeps a set of open connections to borrow and return. Keep the transaction between borrow and return as **short** as possible — it holds locks the whole time.

Related locking clauses: `FOR NO KEY UPDATE` (weaker, allows concurrent FK checks), `FOR SHARE` (blocks writers but not other readers), `... FOR UPDATE SKIP LOCKED` (skip already-locked rows — the basis of a simple job queue), `... FOR UPDATE NOWAIT` (error instead of waiting).

---

## 5️⃣ Concurrency anomalies & isolation levels

| Anomaly | What it is |
|---|---|
| **Dirty read** | Reading another transaction's **uncommitted** change — which may then roll back, so you saw data that never existed |
| **Non-repeatable read** | Reading the **same row twice** in one transaction and getting **different values** (someone updated it in between) |
| **Phantom read** | Running the **same query twice** and getting a **different set of rows** (someone inserted/deleted matching rows in between) |

| Isolation level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| `READ UNCOMMITTED` | possible (spec) — **Postgres treats it as READ COMMITTED** | possible | possible |
| `READ COMMITTED` *(Postgres default)* | prevented | possible | possible |
| `REPEATABLE READ` | prevented | prevented | prevented in Postgres (spec allows phantoms; Postgres's snapshot model blocks them too) |
| `SERIALIZABLE` | prevented | prevented | prevented — transactions behave as if run one at a time; conflicting ones fail with a serialization error to retry |

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ... every read in here sees the same snapshot taken at the first query ...
COMMIT;

BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- ... strongest guarantee; be ready to catch a serialization_failure and retry the whole transaction ...
COMMIT;
```

Default `READ COMMITTED` is right for the vast majority of app code. Reach for `REPEATABLE READ` when a transaction makes several reads that must agree with each other (a report), and `SERIALIZABLE` when correctness under concurrency is critical and you can implement retry-on-conflict.

---

## 6️⃣ ACID compliance across real databases

- **Fully ACID:** PostgreSQL, MySQL (InnoDB), Oracle, SQL Server, SQLite.
- **Not ACID by default:** Apache Cassandra — trades strict consistency for availability and write scale. (Common interview question: "name a database that is *not* ACID-compliant.")
- **Redis:** in-memory (data in RAM) — extremely fast; its durability model is configurable and weaker than a disk-based RDBMS by design.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What are the 4 ACID properties? | Atomicity, Consistency, Isolation, Durability |
| What does `ROLLBACK` do? | Undoes every change since `BEGIN`; nothing is persisted |
| What happens after the first error inside a transaction? | The block aborts — all further statements are rejected until `ROLLBACK` |
| What is a dirty read? | Reading another transaction's uncommitted (possibly-to-be-rolled-back) change |
| What does `SELECT ... FOR UPDATE` do? | Locks the matched rows until the transaction ends; other transactions wanting them wait |
| Postgres's default isolation level? | `READ COMMITTED` |
| What prevents SQL injection? | Parameterized queries (`$1`, `$2`) — never string-concatenating user input into SQL |
| How is Durability achieved? | The Write-Ahead Log — changes are flushed to durable storage before `COMMIT` returns |
| Name a database that is not ACID-compliant. | Apache Cassandra (by default) |

---

**Next up:** [16-Query-Optimization-Playbook.md](16-Query-Optimization-Playbook.md) — a step-by-step checklist for "this query is slow, now what."
