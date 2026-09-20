# ⚡ 10 — Indexes & Query Performance Optimization

> Previous: [09-Aggregation-Lookup-Joins.md](09-Aggregation-Lookup-Joins.md)  
> Next: [11-Schema-Design-Embedding-vs-Referencing.md](11-Schema-Design-Embedding-vs-Referencing.md)

---

## 📌 Executive Summary

- Without indexes, MongoDB must perform a **Collection Scan (`COLLSCAN`)**, checking every single document in a collection line-by-line.
- Indexes use a **B-Tree** structure to allow log-time lookups (**`IXSCAN`**).
- **Compound Index Rule (ESR):** Order fields as **E**quality ──▶ **S**ort ──▶ **R**ange.
- Special Index Types: **Unique**, **TTL (Time To Live)**, **Partial**, and **Text Indexes**.
- Query analysis is performed using `.explain("executionStats")`.

---

## 🧠 Core Analogy: Book Index vs Scanning Pages

- **`COLLSCAN` (No Index):** Reading a 1,000-page encyclopedia page-by-page from start to finish just to find the definition of "Photosynthesis".
- **`IXSCAN` (With Index):** Turning to the alphabetized index at the back of the book, seeing "Photosynthesis ──▶ Page 412", and flipping directly to page 412 in 2 seconds!

---

## 🛠️ 1. Single Field & Compound Indexes

```javascript
// 1. Single Field Index on email
db.users.createIndex({ email: 1 }); // 1 = Ascending, -1 = Descending

// 2. Unique Index (Enforces uniqueness at database level)
db.users.createIndex({ email: 1 }, { unique: true });

// 3. View all indexes on a collection
db.users.getIndexes();

// 4. Drop an index
db.users.dropIndex("email_1");
```

---

## 📐 2. The ESR Rule for Compound Indexes

When creating a Compound Index (an index on multiple fields), the order of fields in the index key specifier is critical:

$$\text{Compound Index Order: } [\text{Equality}] \longrightarrow [\text{Sort}] \longrightarrow [\text{Range}]$$

1. **E - Equality:** Fields checked for exact value matches (`status: "active"`).
2. **S - Sort:** Fields used for ordering results (`sort({ createdAt: -1 })`).
3. **R - Range:** Fields checked for range bounds (`price: { $gt: 100 }`).

### Example Query:
```javascript
db.orders.find({ status: "active", price: { $gt: 100 } })
  .sort({ createdAt: -1 });
```

### ✅ Correct Compound Index (ESR Rule):
```javascript
// Order: status (Equality) -> createdAt (Sort) -> price (Range)
db.orders.createIndex({ status: 1, createdAt: -1, price: 1 });
```

---

## ⏱️ 3. Special Index Types

### 1. TTL (Time To Live) Index — Automatic Document Expiration:
Automatically deletes documents after a specified number of seconds (perfect for sessions, OTPs, log retention)!

```javascript
// Automatically delete documents 3600 seconds (1 hour) after 'createdAt' timestamp
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
);
```

### 2. Partial Index — Indexing a Subset of Documents:
Reduces index storage overhead by indexing *only* documents that satisfy a filter condition!

```javascript
// Index 'email' ONLY for active non-deleted users
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { isDeleted: false } }
);
```

### 3. Text Index — Full-Text Search:
```javascript
db.products.createIndex({ name: "text", description: "text" });

// Search for products containing "apple" or "laptop"
db.products.find({ $text: { $search: "apple laptop" } });
```

---

## 🔬 4. Analyzing Queries with `explain("executionStats")`

To verify if your query uses an index:

```javascript
db.users.find({ email: "saif@example.com" }).explain("executionStats");
```

### 🚩 Key Metrics to Check in Explain Output:

| Metric | Good Sign ✅ | Bad Sign / Warning 🚨 |
|---|---|---|
| **`stage`** | `IXSCAN` (Index Scan) or `FETCH` | `COLLSCAN` (Whole Collection Scan) |
| **`totalDocsExamined`** | Equal or close to `nReturned` | Hundreds of thousands examined for 1 return |
| **`executionTimeMillis`** | `< 10ms` | High delay |

---

## ✅ Takeaways

1. Create indexes on fields frequently used in `find()`, `sort()`, and `$lookup`.
2. Follow the **ESR Rule** (**E**quality ──▶ **S**ort ──▶ **R**ange) for compound indexes.
3. Use TTL indexes for temporary logs/sessions and Partial indexes to save memory space.
4. Run `.explain("executionStats")` to catch `COLLSCAN` bottlenecks before hitting production.

---

Next: [11-Schema-Design-Embedding-vs-Referencing.md](11-Schema-Design-Embedding-vs-Referencing.md) — Schema Design Patterns in MongoDB.
