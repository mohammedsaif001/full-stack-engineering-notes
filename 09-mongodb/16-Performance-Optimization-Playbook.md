# 🚀 16 — Performance Optimization & Anti-Pattern Playbook

> Previous: [15-Sharding-Horizontal-Scaling.md](15-Sharding-Horizontal-Scaling.md)  
> Next: [17-Interview-Query-Patterns.md](17-Interview-Query-Patterns.md)

---

## 📌 Executive Summary

- Most MongoDB performance issues stem from **unindexed collection scans**, **memory thrashing**, **oversized documents**, or **N+1 query patterns**.
- Understanding the **WiredTiger Cache**: MongoDB keeps frequently accessed indexes and documents in RAM.
- Use **`bulkWrite()`** for high-throughput batch operations instead of looping `insertOne()`.
- Use **Projections** to retrieve *only* necessary fields.

---

## 🚨 Top 5 MongoDB Anti-Patterns & Solutions

### Anti-Pattern 1: Unindexed Query (`COLLSCAN`)
- **Symptom:** High CPU utilization, slow response times (> 500ms).
- **Fix:** Run `.explain("executionStats")` and add compound indexes following the **ESR Rule** (**E**quality ──▶ **S**ort ──▶ **R**ange).

### Anti-Pattern 2: Document Growth Beyond 16MB
- **Symptom:** `BSONObj size is invalid` errors.
- **Fix:** Avoid unbounded arrays inside documents (e.g. infinite log arrays). Convert to the **Bucket Pattern** or split into referenced collections.

### Anti-Pattern 3: N+1 Database Query Loop
- **Symptom:** Executing 1 query for users, then running `db.orders.find()` in a `for` loop 1,000 times!
- **Fix:** Use `$in` or `$lookup` aggregation stages to fetch matching data in 1 single database request!

```javascript
// ❌ WRONG (N+1 Loop):
for (let user of users) {
  const orders = await Order.find({ userId: user._id }); // 1,000 DB network trips!
}

// ✅ CORRECT (Single $in query):
const userIds = users.map(u => u._id);
const orders = await Order.find({ userId: { $in: userIds } }); // 1 DB network trip!
```

### Anti-Pattern 4: Fetching Whole Documents When You Need 1 Field
- **Symptom:** Transferring 10MB documents over network to read a boolean flag.
- **Fix:** Use field projection `{ status: 1, _id: 0 }`.

### Anti-Pattern 5: High-Frequency Individual Inserts
- **Symptom:** Calling `insertOne()` 10,000 times in a loop.
- **Fix:** Use **`bulkWrite()`** to execute batch operations in 1 network payload!

---

## ⚡ High-Speed Batch Writes (`bulkWrite`)

```javascript
db.products.bulkWrite([
  {
    insertOne: {
      document: { sku: "CAM-01", name: "Canon EOS", price: 899 }
    }
  },
  {
    updateOne: {
      filter: { sku: "LAPTOP-01" },
      update: { $inc: { stock: -1 } }
    }
  },
  {
    deleteOne: {
      filter: { status: "expired" }
    }
  }
], { ordered: false });
```

---

## 🧠 Memory Management: WiredTiger Cache Rules

MongoDB uses the **WiredTiger** storage engine. By default, WiredTiger reserves:
$$\text{WiredTiger Cache RAM} = 50\% \text{ of (Total System RAM} - 1\text{ GB)}$$

Ensure your working set (frequently accessed documents + active indexes) fits completely inside this WiredTiger RAM cache for sub-millisecond query performance!

---

## ✅ Takeaways

1. Use `.explain("executionStats")` to spot `COLLSCAN` bottlenecks.
2. Eliminate N+1 query loops using `$in` or `$lookup`.
3. Use `bulkWrite()` for bulk insert/update pipelines.
4. Keep active indexes within WiredTiger RAM capacity.

---

Next: [17-Interview-Query-Patterns.md](17-Interview-Query-Patterns.md) — 15 Real-World MongoDB Interview Questions & Queries.
