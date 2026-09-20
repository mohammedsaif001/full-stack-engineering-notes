# ⚙️ 07 — Aggregation Framework Basics

> Previous: [06-Array-And-Embedded-Document-Queries.md](06-Array-And-Embedded-Document-Queries.md)  
> Next: [08-Aggregation-Advanced-Group-Unwind.md](08-Aggregation-Advanced-Group-Unwind.md)

---

## 📌 Executive Summary

- The **MongoDB Aggregation Framework** is a data processing pipeline modeled after assembly line data transformation.
- Documents enter a pipeline array: `db.collection.aggregate([ stage1, stage2, stage3 ])`.
- Basic Pipeline Stages:
  - **`$match`:** Filters documents (equivalent to SQL `WHERE`).
  - **`$project`:** Reshapes documents, computes new fields, or drops fields (equivalent to SQL `SELECT`).
  - **`$sort`:** Sorts documents (equivalent to SQL `ORDER BY`).
  - **`$limit` & `$skip`:** Handles pagination.
  - **`$count`:** Counts documents passing through the stage.

---

## 🧠 Core Analogy: Factory Assembly Line

Think of an aggregation pipeline as a factory conveyor belt:

```
[ Raw Documents ] ──▶ Stage 1: $match ──▶ Stage 2: $sort ──▶ Stage 3: $project ──▶ [ Final Result ]
                      (Filter out bad      (Order items       (Pick & reshape 
                       defects)             by price)          specific fields)
```

Documents flow sequentially through each stage. The output of Stage 1 becomes the direct input for Stage 2!

---

## 🛠️ 1. Basic Aggregation Pipeline Example

```javascript
db.products.aggregate([
  // Stage 1: Filter active electronics products costing over $100
  {
    $match: {
      category: "electronics",
      price: { $gt: 100 },
      isDeleted: { $ne: true }
    }
  },

  // Stage 2: Sort by price descending
  {
    $sort: { price: -1 }
  },

  // Stage 3: Skip 10, Limit to 5 (Pagination)
  { $skip: 10 },
  { $limit: 5 },

  // Stage 4: Reshape fields (Projection & Field Calculations)
  {
    $project: {
      _id: 0,
      productName: "$name",
      originalPrice: "$price",
      // Calculate 10% discounted price dynamically
      discountedPrice: { $multiply: ["$price", 0.90] }
    }
  }
]);
```

---

## ⚡ 2. Performance Optimization: Place `$match` Early!

Always place your `$match` and `$sort` stages at the **VERY BEGINNING** of your aggregation pipeline array!

### Why?
1. **Index Utilization:** MongoDB can use indexes for `$match` and `$sort` *only* if they occur at the start of the pipeline before any document reshaping stages.
2. **Reduced Workload:** Filtering out 95% of irrelevant documents at Stage 1 means downstream stages only process the remaining 5% of data.

---

## 🔢 3. Counting Documents with `$count`

```javascript
db.orders.aggregate([
  { $match: { status: "completed", totalAmount: { $gte: 500 } } },
  { $count: "highValueOrdersCount" }
]);

// Result Output: [{ "highValueOrdersCount": 142 }]
```

---

## ✅ Takeaways

1. Aggregation pipelines process documents sequentially in an array of stages (`aggregate([ ... ])`).
2. `$match` = `WHERE`, `$project` = `SELECT`, `$sort` = `ORDER BY`.
3. Always place `$match` first to leverage indexes and shrink dataset size early.

---

Next: [08-Aggregation-Advanced-Group-Unwind.md](08-Aggregation-Advanced-Group-Unwind.md) — Mastering `$group`, `$unwind`, and `$facet`.
