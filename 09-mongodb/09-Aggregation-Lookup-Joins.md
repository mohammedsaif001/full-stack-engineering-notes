# 🔗 09 — Aggregation `$lookup` (Relational Joins)

> Previous: [08-Aggregation-Advanced-Group-Unwind.md](08-Aggregation-Advanced-Group-Unwind.md)  
> Next: [10-Indexes-Query-Performance.md](10-Indexes-Query-Performance.md)

---

## 📌 Executive Summary

- MongoDB is a document database, but real-world apps often require joining data across separate collections.
- **`$lookup`** is MongoDB's stage for performing left outer joins between collections (equivalent to SQL `LEFT OUTER JOIN`).
- Basic `$lookup` matches a local field to a foreign field.
- Pipeline-based `$lookup` allows executing custom multi-stage query logic, filtering, and sub-queries on joined collections.
- 🚨 **Performance Warning:** Unindexed `$lookup` operations trigger expensive collection scans. Always index `foreignField`!

---

## 🧠 Core Analogy: Linking Catalogues

Imagine two catalogues on your desk:
1. `orders` catalogue: Lists order IDs and `userId` numbers.
2. `users` catalogue: Lists `_id` numbers, user names, and emails.

`$lookup` takes each order, looks up the matching `userId` inside the `users` catalogue, and staples the user's profile info as an array field onto the order page!

---

## 🛠️ 1. Basic Equality `$lookup`

### Syntax:
```javascript
{
  $lookup: {
    from: "target_collection",   // Collection to join with
    localField: "current_field", // Field in input document
    foreignField: "other_field", // Field in target collection
    as: "output_array_name"      // Name of new embedded array field
  }
}
```

### Real-World Example: Joining `orders` with `users`:

```javascript
db.orders.aggregate([
  // Stage 1: Match recent pending orders
  { $match: { status: "pending" } },

  // Stage 2: Join with 'users' collection
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userDetails"
    }
  },

  // Stage 3: $lookup outputs an array! Flatten userDetails array to single object
  {
    $unwind: "$userDetails"
  },

  // Stage 4: Reshape output
  {
    $project: {
      _id: 1,
      totalAmount: 1,
      customerName: "$userDetails.name",
      customerEmail: "$userDetails.email"
    }
  }
]);
```

---

## 🔬 2. Pipeline `$lookup` with Sub-Queries & Filtering

You can run custom sub-pipeline stages *inside* the joined collection before returning data:

```javascript
db.users.aggregate([
  { $match: { role: "customer" } },
  {
    $lookup: {
      from: "orders",
      let: { targetUserId: "$_id" }, // Define variables from local document
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$userId", "$$targetUserId"] }, // Match user ID
                { $gte: ["$totalAmount", 100] }        // ONLY orders >= $100
              ]
            }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 3 } // Limit to last 3 high-value orders
      ],
      as: "recentLargeOrders"
    }
  }
]);
```

---

## ⚡ 3. Performance Best Practices for `$lookup`

1. **Always Index `foreignField`:** If joining `orders.userId` ──▶ `users._id`, ensure an index exists on `userId` in `orders` and `_id` in `users`. Without an index, MongoDB scans the entire collection for every document!
2. **Filter First (`$match` before `$lookup`):** Reduce the number of incoming documents *before* triggering `$lookup`.
3. **Prefer Embedding for 1:Few Relationships:** If a user only ever has 2 shipping addresses, embed them inside the user document instead of creating an `addresses` collection and using `$lookup`!

---

## ✅ Takeaways

1. `$lookup` performs SQL-style `LEFT OUTER JOIN`s between collections.
2. `$lookup` outputs results as an array field; use `$unwind` to flatten it into an object.
3. Always create an index on `foreignField` to prevent slow $lookup performance bottlenecks.

---

Next: [10-Indexes-Query-Performance.md](10-Indexes-Query-Performance.md) — Indexing strategies, Compound Indexes, and ESR Rule.
