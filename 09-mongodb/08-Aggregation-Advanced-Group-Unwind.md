# 📊 08 — Aggregation Advanced: Grouping (`$group`), Unwinding (`$unwind`) & Facets (`$facet`)

> Previous: [07-Aggregation-Framework-Basics.md](07-Aggregation-Framework-Basics.md)  
> Next: [09-Aggregation-Lookup-Joins.md](09-Aggregation-Lookup-Joins.md)

---

## 📌 Executive Summary

- **`$group`:** Groups documents by a specified identifier (`_id`) and computes metrics across grouped batches (equivalent to SQL `GROUP BY`).
- **Accumulator Operators:** `$sum`, `$avg`, `$min`, `$max`, `$push` (collect items into array), `$addToSet` (collect unique items).
- **`$unwind`:** Deconstructs an array field from input documents to output a document for *each* array element (flattening arrays).
- **`$facet`:** Executes multiple sub-pipeline aggregations in parallel on the same input data (used for search filtering & pagination UI).

---

## 📊 1. Grouping Data with `$group`

```javascript
db.orders.aggregate([
  // Stage 1: Filter completed orders
  { $match: { status: "completed" } },

  // Stage 2: Group by customerId and aggregate statistics
  {
    $group: {
      _id: "$customerId",                     // Group BY customerId
      totalSpent: { $sum: "$totalAmount" },   // Sum total revenue per user
      averageOrderValue: { $avg: "$totalAmount" },
      totalOrders: { $sum: 1 },              // Count total order documents
      purchasedItems: { $addToSet: "$itemCategory" } // Unique array of categories
    }
  },

  // Stage 3: Filter customers who spent more than $1000 (SQL HAVING)
  { $match: { totalSpent: { $gte: 1000 } } },

  // Stage 4: Sort by totalSpent descending
  { $sort: { totalSpent: -1 } }
]);
```

---

## 🌀 2. Flattening Arrays with `$unwind`

If a document contains an array, `$unwind` splits the single document into multiple documents — one for every item in the array!

### Example Input Document:
```json
{ "_id": 101, "user": "Alice", "hobbies": ["reading", "gaming", "coding"] }
```

### Aggregation Pipeline:
```javascript
db.users.aggregate([
  { $match: { _id: 101 } },
  { $unwind: "$hobbies" }
]);
```

### Output Documents:
```json
{ "_id": 101, "user": "Alice", "hobbies": "reading" }
{ "_id": 101, "user": "Alice", "hobbies": "gaming" }
{ "_id": 101, "user": "Alice", "hobbies": "coding" }
```

### Real-World Use Case: Top Sold Products across all order items:
```javascript
db.orders.aggregate([
  { $unwind: "$items" }, // Deconstruct items array
  {
    $group: {
      _id: "$items.productId",
      totalQuantitySold: { $sum: "$items.quantity" },
      totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
    }
  },
  { $sort: { totalQuantitySold: -1 } },
  { $limit: 10 }
]);
```

---

## 💎 3. Multi-Faceted Search with `$facet`

In modern e-commerce sites, a search page needs to return **both** the paginated products list AND category filter counters in a single database request!

```javascript
db.products.aggregate([
  { $match: { isAvailable: true } },
  {
    $facet: {
      // Sub-pipeline 1: Paginated Products List
      "productsList": [
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 10 }
      ],
      // Sub-pipeline 2: Category Counters (Facets)
      "categoryCounts": [
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ],
      // Sub-pipeline 3: Price Range Stats
      "priceStats": [
        { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
      ]
    }
  }
]);
```

---

## ✅ Takeaways

1. `$group` aggregates metrics per key; use `$sum: 1` for document counts.
2. `$unwind` flattens array elements into individual document streams for granular aggregation.
3. `$facet` runs parallel sub-pipelines to power complex search filters and pagination UI in one database roundtrip.

---

Next: [09-Aggregation-Lookup-Joins.md](09-Aggregation-Lookup-Joins.md) — Performing Relational Joins using `$lookup`.
