# ✏️ 04 — CRUD: Update & Modify Operations

> Previous: [03-CRUD-Find-Read-Filtering.md](03-CRUD-Find-Read-Filtering.md)  
> Next: [05-CRUD-Delete-Drop-Operations.md](05-CRUD-Delete-Drop-Operations.md)

---

## 📌 Executive Summary

- Updates in MongoDB are performed using `updateOne()`, `updateMany()`, or `replaceOne()`.
- **Atomic Field Update Operators:** `$set` (update/create field), `$unset` (delete field), `$inc` (increment number), `$rename` (rename field key), `$currentDate`.
- **Array Update Operators:** `$push` (append item), `$addToSet` (append unique item), `$pull` (remove matching item), `$pop` (remove first/last item).
- **`upsert: true`:** Atomically inserts a new document if no matching document exists to update.

---

## 🚨 CRITICAL WARNING: Updating Without Operators

If you pass a plain document object to `updateOne()` without using an update operator like `$set`, **MongoDB will completely replace the target document!**

```javascript
// ❌ WRONG: Wipes out all other fields in the document!
db.users.updateOne({ _id: ObjectId("650a...") }, { name: "Saif" });

// ✅ CORRECT: Atomically updates ONLY the "name" field
db.users.updateOne({ _id: ObjectId("650a...") }, { $set: { name: "Saif" } });
```

---

## 🛠️ 1. Atomic Field Operators (`$set`, `$unset`, `$inc`)

```javascript
// Update single document
db.products.updateOne(
  { sku: "LAPTOP-01" },
  {
    $set: { status: "in_stock", "discount.active": true },
    $inc: { stock: -1, totalSold: 1 },        // Decrements stock by 1, increments totalSold by 1
    $currentDate: { updatedAt: true }          // Sets updatedAt to current timestamp
  }
);

// Delete/Remove a field from matching documents
db.users.updateMany(
  { tempToken: { $exists: true } },
  { $unset: { tempToken: "" } }
);
```

---

## 📦 2. Array Update Operators (`$push`, `$addToSet`, `$pull`)

MongoDB provides dedicated atomic operators for updating arrays embedded inside documents:

```javascript
// 1. $push: Append an item to an array (allows duplicates)
db.users.updateOne(
  { email: "saif@example.com" },
  { $push: { tags: "developer" } }
);

// 2. $addToSet: Append item ONLY if it does NOT already exist in array (Set behavior)
db.users.updateOne(
  { email: "saif@example.com" },
  { $addToSet: { roles: "admin" } }
);

// 3. $pull: Remove all instances matching a value/condition from array
db.users.updateOne(
  { email: "saif@example.com" },
  { $pull: { roles: "guest" } }
);

// 4. Advanced $push with $each, $slice, and $sort
db.users.updateOne(
  { email: "saif@example.com" },
  {
    $push: {
      recentLogins: {
        $each: [{ timestamp: new Date(), ip: "127.0.0.1" }],
        $sort: { timestamp: -1 },
        $slice: 5 // Keep ONLY the 5 most recent items in the array!
      }
    }
  }
);
```

---

## ⚡ 3. The Power of `upsert: true`

`upsert` is a combination of **UPDATE** and **INSERT**. If the query filter matches a document, it updates it. If no document matches, it creates a new one!

```javascript
db.analytics.updateOne(
  { date: "2026-09-20", page: "/checkout" }, // Filter
  { $inc: { views: 1 } },                     // Update action
  { upsert: true }                            // Options
);
```

*Result:* If no document exists for `/checkout` on `2026-09-20`, MongoDB creates it with `{ date: "2026-09-20", page: "/checkout", views: 1 }` automatically!

---

## ✅ Takeaways

1. Always use `$set` when updating specific document fields to avoid overwriting the document.
2. Use `$inc` for atomic counter increments (inventory, view counts, likes).
3. Use `$addToSet` for unique arrays and `$push` with `$slice` for capped history arrays.
4. Use `{ upsert: true }` to eliminate race conditions when performing "find-or-create" operations.

---

Next: [05-CRUD-Delete-Drop-Operations.md](05-CRUD-Delete-Drop-Operations.md) — Deleting documents, dropping collections, and soft vs. hard deletes.
