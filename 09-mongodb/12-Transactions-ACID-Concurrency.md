# 🔒 12 — Transactions & ACID Concurrency

> Previous: [11-Schema-Design-Embedding-vs-Referencing.md](11-Schema-Design-Embedding-vs-Referencing.md)  
> Next: [13-Mongoose-ORM-ODM-Nodejs.md](13-Mongoose-ORM-ODM-Nodejs.md)

---

## 📌 Executive Summary

- Single-document operations in MongoDB are **atomically isolated** out of the box.
- Starting in version 4.0, MongoDB supports **Multi-Document ACID Transactions** across multiple collections.
- Multi-document transactions require a running **Replica Set** or **Sharded Cluster**.
- **Write Concern** and **Read Concern** (`majority`) determine data durability and isolation levels during transaction commit.

---

## 🧠 Core Analogy: Banking Money Transfer

Transferring $500 from Account A to Account B requires two operations:
1. Deduct $500 from Account A.
2. Add $500 to Account B.

If the server loses power after Step 1, $500 vanishes! A **Transaction** wraps both steps into an **All-or-Nothing** unit. If any step fails, the entire transaction rolls back automatically!

---

## 🛠️ 1. Executing Multi-Document Transactions in Node.js

```javascript
const mongoose = require('mongoose');

async function transferFunds(fromAccountId, toAccountId, amount) {
  // 1. Start a client session
  const session = await mongoose.startSession();

  try {
    // 2. Start the transaction
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });

    // 3. Perform Operation A: Deduct from source account
    await Account.updateOne(
      { _id: fromAccountId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { session } // 👈 Pass session to participate in transaction!
    );

    // 4. Perform Operation B: Credit to target account
    await Account.updateOne(
      { _id: toAccountId },
      { $inc: { balance: amount } },
      { session }
    );

    // 5. Commit transaction changes
    await session.commitTransaction();
    console.log("Transaction committed successfully!");
  } catch (error) {
    // 6. Abort and rollback changes if any error occurs
    await session.abortTransaction();
    console.error("Transaction aborted due to error:", error);
    throw error;
  } finally {
    // 7. End session
    session.endSession();
  }
}
```

---

## ⚙️ 2. Read Concern & Write Concern Controls

| Setting | Value | Behavior |
|---|---|---|
| **Write Concern (`w`)** | `w: "majority"` | Transaction commits only after majority of replica set nodes write to disk log. |
| **Read Concern** | `readConcern: "snapshot"` | Returns data from a consistent point-in-time snapshot across collections. |
| **Read Preference** | `primary` | Routes reads strictly to the Primary replica set node. |

---

## ⚠️ Transaction Best Practices & Performance Rules

1. **Keep Transactions Short (< 5 seconds):** Transactions hold lock locks on documents. Long-running transactions degrade cluster performance.
2. **Avoid Overusing Transactions:** In 80%+ of MongoDB use cases, proper schema embedding removes the need for multi-document transactions altogether!
3. **Prerequisite:** Transactions require a **Replica Set** (will not execute on standalone single-node `mongod` without replica configuration).

---

## ✅ Takeaways

1. Single-document updates are natively atomic; multi-document operations use `session.startTransaction()`.
2. Always pass `{ session }` to every operation participating in the transaction.
3. Call `commitTransaction()` on success and `abortTransaction()` inside `catch` blocks.
4. Prefer embedding schemas to avoid multi-document transactions wherever possible.

---

Next: [13-Mongoose-ORM-ODM-Nodejs.md](13-Mongoose-ORM-ODM-Nodejs.md) — Integrating MongoDB with Node.js using Mongoose ODM.
