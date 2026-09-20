# 🔍 03 — CRUD: Find, Read & Filtering Operations

> Previous: [02-CRUD-Insert-Create-Operations.md](02-CRUD-Insert-Create-Operations.md)  
> Next: [04-CRUD-Update-Modify-Operations.md](04-CRUD-Update-Modify-Operations.md)

---

## 📌 Executive Summary

- Reading documents in MongoDB is performed using `db.collection.find(query, projection)` and `db.collection.findOne(query, projection)`.
- Query expressions use rich comparison operators (`$gt`, `$lt`, `$in`, `$ne`), logical operators (`$and`, `$or`), and element operators (`$exists`, `$type`).
- **Field Projection** allows fetching *only* the specific document fields required, drastically cutting down network payload size.

---

## 🔍 1. Basic Read Queries (`find` & `findOne`)

```javascript
// Find all documents in collection
db.products.find({});

// Find one matching document
db.products.findOne({ sku: "LAPTOP-01" });

// Limit, Skip & Sort (Pagination)
db.products.find({})
  .sort({ price: -1 }) // -1 = Descending, 1 = Ascending
  .skip(10)            // Skip first 10 documents
  .limit(5);           // Return 5 documents
```

---

## ⚖️ 2. Comparison Query Operators

| Operator | Meaning | Example Mongo Shell Query |
|---|---|---|
| **`$eq`** | Equal to | `db.products.find({ category: { $eq: "electronics" } })` |
| **`$ne`** | Not equal to | `db.products.find({ status: { $ne: "discontinued" } })` |
| **`$gt`** / **`$gte`** | Greater than / Greater than or equal | `db.products.find({ price: { $gte: 500 } })` |
| **`$lt`** / **`$lte`** | Less than / Less than or equal | `db.products.find({ price: { $lte: 100 } })` |
| **`$in`** | Value matches any in array | `db.products.find({ category: { $in: ["tech", "audio"] } })` |
| **`$nin`** | Value does NOT match any in array | `db.products.find({ tags: { $nin: ["refurbished"] } })` |

---

## 🧠 3. Logical Operators (`$and`, `$or`, `$nor`, `$not`)

### Combined Query Example:

```javascript
// Find products that are EITHER (Price >= 1000 AND category is "electronics") OR in stock > 50
db.products.find({
  $or: [
    {
      $and: [
        { price: { $gte: 1000 } },
        { category: "electronics" }
      ]
    },
    { stock: { $gt: 50 } }
  ]
});
```

*Note: In MongoDB, multiple comma-separated conditions in the same query object implicitly act as an `$and` operator!*

---

## 🧪 4. Element & Type Operators (`$exists`, `$type`)

```javascript
// Find all documents where the field "discountPrice" EXISTS
db.products.find({ discountPrice: { $exists: true } });

// Find documents where "age" is stored specifically as a Number / Double (Type 1 or "double")
db.users.find({ age: { $type: "number" } });
```

---

## 🎯 5. Field Projection (Selecting Specific Fields)

In MongoDB, **Projection** controls which fields are returned. `1` includes a field, `0` excludes it.

```javascript
// Return ONLY name and price (exclude _id explicitly)
db.products.find(
  { category: "electronics" },      // 1. Query Filter
  { name: 1, price: 1, _id: 0 }      // 2. Projection Matrix
);
```

### 🚨 Projection Rule Warning:
You cannot mix `1` (inclusion) and `0` (exclusion) in the same projection specifier, EXCEPT for excluding `_id: 0`!

---

## ✅ Takeaways

1. `find()` returns a cursor; `findOne()` returns the first matching document.
2. Use `$gt`, `$lt`, `$in`, and `$or` for flexible filtering.
3. Always use projections (`{ name: 1, email: 1 }`) to avoid transferring megabytes of unnecessary document payload over the network.

---

Next: [04-CRUD-Update-Modify-Operations.md](04-CRUD-Update-Modify-Operations.md) — Mastering `updateOne()`, atomic update operators (`$set`, `$inc`, `$push`), and `upsert`.
