# 🧩 06 — Array & Embedded Document Queries

> Previous: [05-CRUD-Delete-Drop-Operations.md](05-CRUD-Delete-Drop-Operations.md)  
> Next: [07-Aggregation-Framework-Basics.md](07-Aggregation-Framework-Basics.md)

---

## 📌 Executive Summary

- MongoDB excels at storing nested sub-documents and arrays inside documents.
- **Dot Notation (`"parent.child"`):** Used to query nested fields inside embedded documents or arrays.
- **`$elemMatch`:** Ensures multiple conditions match against the *same single array element* rather than splitting conditions across different array items.
- Positional Operators (`$`, `$[]`, `$[<identifier>]`) enable granular updates to specific elements inside arrays.

---

## 🏢 1. Querying Nested Embedded Documents

Consider a document structure with an embedded `address` sub-document:

```json
{
  "_id": 1,
  "name": "Saif",
  "address": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": 400001
  }
}
```

To query nested properties, use **Dot Notation** wrapped in double quotes:

```javascript
// Querying a nested sub-document property
db.users.find({ "address.city": "Mumbai" });
```

---

## 📦 2. Querying Arrays & The `$elemMatch` Trap

Consider a user document containing an array of order items:

```json
{
  "_id": 101,
  "name": "Alice",
  "orders": [
    { "item": "Laptop", "qty": 1, "price": 1200 },
    { "item": "Mouse", "qty": 5, "price": 25 }
  ]
}
```

### 🚨 The Multi-Condition Array Trap:

```javascript
// ❌ WRONG (Without $elemMatch):
// Matches if ANY item has item == "Laptop" AND ANY item (even a different one!) has qty >= 5!
db.users.find({
  "orders.item": "Laptop",
  "orders.qty": { $gte: 5 }
});
```

### ✅ The Solution (`$elemMatch`):

```javascript
// ✅ CORRECT (With $elemMatch):
// Matches ONLY if a SINGLE order item element satisfies BOTH conditions simultaneously!
db.users.find({
  orders: {
    $elemMatch: {
      item: "Laptop",
      qty: { $gte: 1 }
    }
  }
});
```

---

## 📏 3. Array Size & Exact Match Queries

```javascript
// Exact array match (order and elements must match exactly)
db.users.find({ tags: ["developer", "admin"] });

// Match array containing a specific element regardless of order
db.users.find({ tags: "admin" });

// Query array length using $size
db.users.find({ tags: { $size: 2 } });
```

---

## ✏️ 4. Updating Specific Array Elements (Positional Operators)

### 1. First Matching Element (`$`):
```javascript
// Update the status of ONLY the order item named "Mouse"
db.users.updateOne(
  { _id: 101, "orders.item": "Mouse" },
  { $set: { "orders.$.status": "shipped" } } // $ refers to the matched array index!
);
```

### 2. All Array Elements (`$[]`):
```javascript
// Add a discount field to ALL orders in the user's array
db.users.updateOne(
  { _id: 101 },
  { $set: { "orders.$[].discountApplied": true } }
);
```

### 3. Filtered Array Elements (`$[<identifier>]`):
```javascript
// Update price of ONLY array items where price > 500
db.users.updateOne(
  { _id: 101 },
  { $inc: { "orders$[elem].price": -50 } },
  { arrayFilters: [{ "elem.price": { $gt: 500 } }] }
);
```

---

## ✅ Takeaways

1. Always use quotes for Dot Notation (`"address.city"`).
2. Use `$elemMatch` whenever querying multiple attributes on the *same single item* inside an array of objects.
3. Use array positional operators (`$`, `$[]`, `$[elem]`) to perform granular updates on embedded array items without overwriting the entire array.

---

Next: [07-Aggregation-Framework-Basics.md](07-Aggregation-Framework-Basics.md) — Introduction to MongoDB Aggregation Pipelines.
