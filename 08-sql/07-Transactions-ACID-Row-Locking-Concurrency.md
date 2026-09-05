# Transactions, ACID Properties & Row Locking
## Making Multi-Step Operations Safe Under Concurrency

> Previous: [06-Indexing-Query-Performance-Internals.md](06-Indexing-Query-Performance-Internals.md)

---

## 🧠 Core Analogy

**Transactions as an all-or-nothing checklist**: Imagine transferring money between two envelopes. You (1) remove ₹500 from envelope A and (2) put ₹500 into envelope B. If a power cut happens *between* steps 1 and 2, the money would just vanish. A transaction wraps both steps in a single unit — if step 2 fails for any reason, step 1 is automatically undone (`ROLLBACK`), so the money is never lost, never duplicated. This is exactly the **Atomicity** in ACID.

---

## 🔒 1. Transactions & ACID Properties

### What is a transaction?
A **transaction** groups multiple SQL statements into a single logical unit: either **all** of them succeed together, or **none** of them take effect at all — there is no partial, half-applied state. Classic example: a UPI transfer — deducting from one account and crediting another must happen **together**, or not at all.

```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    owner VARCHAR(50),
    balance INT CHECK (balance >= 0)   -- no overdrafts allowed
);

INSERT INTO accounts (owner, balance) VALUES ('Shubham', 1000), ('Hitesh', 1000);
```

### The happy path
```sql
BEGIN;
    UPDATE accounts SET balance = balance - 500 WHERE owner = 'Shubham';
    UPDATE accounts SET balance = balance + 500 WHERE owner = 'Hitesh';
COMMIT;   -- permanently saves both changes together
```

### The failure path — ROLLBACK
```sql
BEGIN;
    UPDATE accounts SET balance = balance - 5000 WHERE owner = 'Shubham';  -- would violate CHECK (balance >= 0)
    ROLLBACK;  -- manually undo everything since BEGIN
-- balances remain completely unchanged
```
- **Default behavior on any error inside a transaction**: unless you explicitly `COMMIT`, the database's default action is to `ROLLBACK` — nothing is saved unless you say so.
- Once `COMMIT` has run, you **cannot** `ROLLBACK` anymore — the transaction is finished and permanent.
- Rule of thumb: **keep transactions as small as possible** — the longer a transaction stays open, the longer it can hold locks and block other operations.

### ACID, property by property

**A — Atomicity**: all-or-nothing. If 100 statements are part of one transaction, either all 100 succeed, or all 100 fail — there is no "50 succeeded, 50 failed" outcome.
```sql
BEGIN;
    UPDATE accounts SET balance = balance - 200 WHERE owner = 'Shubham';  -- step 1 "succeeds"...
    SELECT 1 / 0;  -- ...but this error means step 2 never runs
ROLLBACK;   -- step 1 is undone too — Shubham's balance is back to 1000, not stuck at 800
```

**C — Consistency**: a transaction can only move the database from one *valid* state to another valid state. Any constraint (`CHECK`, `FOREIGN KEY`, etc.) is enforced strictly — an attempted transaction that would violate a rule is rejected outright.
```sql
BEGIN;
    UPDATE accounts SET balance = balance - 5000 WHERE owner = 'Shubham';  -- would make balance = -4000 → CHECK fails
    -- Once an error occurs, Postgres ignores subsequent statements until you ROLLBACK.
ROLLBACK;
```

**I — Isolation**: an in-progress (uncommitted) transaction is invisible to other transactions until it commits. This prevents **dirty reads** (reading another transaction's not-yet-committed changes).
```
Terminal 1 (User A)                          Terminal 2 (User B)
--------------------                         --------------------
BEGIN;
UPDATE accounts SET balance = balance - 300
  WHERE owner = 'Shubham';
SELECT balance ...  → returns 700 (A's own view)
                                              SELECT balance ...  → returns 1000 (isolated from A's uncommitted change!)
COMMIT;
                                              SELECT balance ...  → NOW returns 700 (visible only after commit)
```

**D — Durability**: once `COMMIT` succeeds, the change is **permanent**, even if the server crashes a millisecond later. This is achieved via a **Write-Ahead Log (WAL)** — changes are physically flushed to non-volatile storage *before* the database reports success back to the client.

### Concurrency problem vocabulary (interview-relevant)
| Term | Definition |
|---|---|
| **Dirty read** | A transaction reads data that another transaction has modified but **not yet committed** — if the other transaction later rolls back, you "saw" data that never really existed. |
| **Non-repeatable read** | Reading the **same row twice** within one transaction and getting **different values**, because another transaction updated it in between. |
| **Phantom read** | Running the **same query twice** within one transaction and getting a **different set of rows** (not just different values) — e.g., a new row was inserted by someone else in between. |

`READ COMMITTED`, `REPEATABLE READ`, and `SERIALIZABLE` **isolation levels** let you control exactly which of these anomalies a transaction is allowed to be exposed to, via `SET TRANSACTION ISOLATION LEVEL ...` — worth exploring once the basics above are solid.

### ACID compliance across real databases
- **ACID-compliant**: PostgreSQL, MySQL, Oracle DB, CouchBase.
- **Not ACID-compliant (by default)**: Apache Cassandra — it trades strict consistency for availability/speed at scale (this is a common interview question: "name a database that is *not* ACID-compliant").
- **Redis**: an in-memory database — it stores data in **RAM** instead of disk, which is why it's extremely fast, but that also shapes its durability tradeoffs differently from disk-based RDBMSs.

---

## 🚦 2. Row Locking & Preventing Race Conditions in Real Applications

Transactions alone aren't enough once **multiple users hit your API concurrently** — e.g., two people trying to book the *same* seat at the exact same time. This is where **row-level locking** comes in.

### Real working example: a concurrency-safe seat booking API (Express + `pg`)
```js
import express from "express";
import pg from "pg";

// A connection pool is a managed group of reusable DB connections —
// like Mongoose's connection, but explicit. You "borrow" a connection,
// use it, then release it back to the pool instead of opening a fresh
// connection per request (which is slow and resource-heavy).
const pool = new pg.Pool({
  host: "localhost",
  port: 5433,
  user: "postgres",
  password: "postgres",
  database: "sql_class_2_db",
  max: 20,
});

const app = express();

app.get("/seats", async (req, res) => {
  const result = await pool.query("SELECT * FROM seats");
  res.send(result.rows);
});

// Book a seat by id, given the booker's name
app.put("/:id/:name", async (req, res) => {
  try {
    const { id, name } = req.params;
    const conn = await pool.connect();       // borrow a connection from the pool

    await conn.query("BEGIN");               // start a transaction — keep it as SHORT as possible

    // $1 is a PARAMETERIZED placeholder — never interpolate user input directly
    // into a SQL string (e.g. `... = ${id}`), or you open the door to SQL INJECTION.
    // FOR UPDATE locks the matching row until this transaction ends, so no other
    // concurrent request can read-and-book the same seat in between.
    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      res.send({ error: "Seat already booked" });
      return;
    }

    const sqlUpdate = "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1";
    const updateResult = await conn.query(sqlUpdate, [id, name]);

    await conn.query("COMMIT");
    conn.release();                          // return the connection to the pool
    res.send(updateResult);
  } catch (ex) {
    console.log(ex);
    res.send(500);
  }
});
```

### The three concepts this example ties together
1. **`SELECT ... FOR UPDATE`**: locks the selected row(s) for the duration of the transaction. If a second request tries to `SELECT ... FOR UPDATE` the *same* row before the first transaction commits, it will simply **wait** until the first one finishes — guaranteeing no two requests can both see the seat as "available" and both book it.
2. **Parameterized queries (`$1`, `$2`, …)**: never build SQL by string-concatenating user input (e.g. `` `SELECT * FROM seats WHERE id = ${id}` ``). A malicious `id` value could inject arbitrary SQL (**SQL injection**). Placeholders like `$1` tell the driver to treat the value strictly as *data*, never as executable SQL.
3. **Connection pooling**: opening a brand-new database connection per HTTP request is slow. A `Pool` keeps a set of already-open connections ready to be borrowed (`pool.connect()`) and returned (`conn.release()`) — conceptually similar to Mongoose's single persistent connection, but explicit and reusable across many concurrent requests.

---

**Next up:** [08-Schema-Design-Normalization.md](08-Schema-Design-Normalization.md) — designing real, multi-table schemas.
