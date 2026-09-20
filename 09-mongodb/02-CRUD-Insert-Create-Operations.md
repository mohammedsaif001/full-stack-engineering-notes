# ➕ 02 — CRUD: Insert & Create Operations

> Previous: [01-Why-NoSQL-Document-Model.md](01-Why-NoSQL-Document-Model.md)  
> Next: [03-CRUD-Find-Read-Filtering.md](03-CRUD-Find-Read-Filtering.md)

---

## 📌 Executive Summary

- Creating documents in MongoDB is performed using `db.collection.insertOne()` or `db.collection.insertMany()`.
- Every document in MongoDB must have a unique **`_id`** field. If omitted, MongoDB automatically generates a 12-byte **`ObjectId`**.
- **Write Concern (`w`)** controls the level of acknowledgment requested from MongoDB for insert operations.

---

## 🛠️ 1. Inserting Single Documents (`insertOne`)

```javascript
// Switch to our database
use ecommerce_db;

// Insert a single user document
db.users.insertOne({
  name: "Mohammed Saif",
  email: "saif@example.com",
  age: 26,
  roles: ["admin", "developer"],
  address: {
    city: "Mumbai",
    country: "India"
  },
  createdAt: new Date()
});
```

### Response Output:
```javascript
{
  acknowledged: true,
  insertedId: ObjectId("66e5f8a2b3c1d4e5f6789012")
}
```

---

## 📦 2. Inserting Multiple Documents (`insertMany`)

```javascript
db.products.insertMany([
  {
    sku: "LAPTOP-01",
    name: "MacBook Pro 16",
    price: 2499.99,
    tags: ["electronics", "apple", "laptop"],
    stock: 15
  },
  {
    sku: "PHONE-01",
    name: "iPhone 16 Pro",
    price: 999.00,
    tags: ["electronics", "apple", "mobile"],
    stock: 50
  },
  {
    sku: "HEADPHONE-01",
    name: "Sony WH-1000XM5",
    price: 399.50,
    tags: ["electronics", "audio", "sony"],
    stock: 30
  }
], { ordered: true }); // ordered: true (default) stops inserts if one document fails
```

### Unordered Inserts (`ordered: false`)
If one document fails validation in an unordered insert, MongoDB continues inserting the remaining valid documents rather than aborting immediately!

```javascript
db.products.insertMany([...docs], { ordered: false });
```

---

## 🔍 3. Anatomy of the BSON `ObjectId`

If you don't specify `_id: 123` manually, MongoDB generates a 12-byte hex BSON `ObjectId`:

```
┌────────────────────────┬────────────────────────┬────────────────────────┐
│ 4-byte Timestamp       │ 5-byte Random Value    │ 3-byte Increment Counter│
│ (Seconds since epoch)  │ (Machine & Process ID) │ (Initialized randomly) │
└────────────────────────┴────────────────────────┴────────────────────────┘
  0x66e5f8a2               0xb3c1d4e5f6             0x789012
```

### Extracting Creation Timestamp from `_id`:
Because the first 4 bytes contain the Unix creation timestamp, you can extract the exact creation date from any `_id` without storing a separate `createdAt` field!

```javascript
const docId = ObjectId("66e5f8a2b3c1d4e5f6789012");
console.log(docId.getTimestamp()); 
// Output: 2026-09-14T20:45:22.000Z
```

---

## 🛡️ 4. Write Concern (`w`) Explained

Write Concern specifies the guarantee requested from MongoDB when inserting data:

```javascript
// w: 1 (Default) — Acknowledges write once primary node writes to memory
db.users.insertOne({ name: "Alice" }, { writeConcern: { w: 1 } });

// w: "majority" — Acknowledges write only after majority of replica set nodes write
db.users.insertOne({ name: "Bob" }, { writeConcern: { w: "majority", wtimeout: 5000 } });
```

---

## ✅ Takeaways

1. Use `insertOne()` for single documents and `insertMany()` for bulk insertion.
2. `_id` is automatically populated with a 12-byte time-sorted BSON `ObjectId` if omitted.
3. Use `{ ordered: false }` during bulk inserts to prevent a single duplicate key failure from blocking other valid documents.

---

Next: [03-CRUD-Find-Read-Filtering.md](03-CRUD-Find-Read-Filtering.md) — Advanced filtering, query operators, and field projection.
