# 🗑️ 05 — CRUD: Delete & Drop Operations

> Previous: [04-CRUD-Update-Modify-Operations.md](04-CRUD-Update-Modify-Operations.md)  
> Next: [06-Array-And-Embedded-Document-Queries.md](06-Array-And-Embedded-Document-Queries.md)

---

## 📌 Executive Summary

- Removing documents is performed via `deleteOne()` or `deleteMany()`.
- Dropping an entire collection (`drop()`) or database (`dropDatabase()`) removes all indexes and storage allocations instantly.
- In production architectures, **Soft Delete** (`isDeleted: true` / `deletedAt: Date`) is strongly preferred over permanent **Hard Delete** to preserve audit logs and data recovery capability.

---

## 🛠️ 1. Deleting Documents (`deleteOne` & `deleteMany`)

```javascript
// Delete a single document matching filter
db.users.deleteOne({ email: "spammer@example.com" });

// Delete all documents matching condition
db.products.deleteMany({ status: "discontinued", stock: 0 });

// Delete ALL documents in a collection (keeps collection & index metadata intact)
db.logs.deleteMany({});
```

---

## 💣 2. Dropping Collections & Databases

Deleting documents one-by-one (`deleteMany({})`) is slow for large collections because it writes delete entries to the storage engine for every single document.

If you want to clear a collection completely, use `drop()`:

```javascript
// Drop an entire collection (Frees memory & drops indexes instantly!)
db.logs.drop();

// Drop current active database
db.dropDatabase();
```

---

## 🛡️ 3. Soft Delete Pattern vs Hard Delete

### Hard Delete (Permanent Removal):
`db.orders.deleteOne({ _id: ObjectId("...") })`
- 🚨 **Risk:** Data is permanently erased. Cannot be recovered without restoring database backup snapshots!

### Soft Delete (Recommended Production Pattern):
Instead of physically deleting the document, set a flag:

```javascript
// Soft Delete Operation
db.users.updateOne(
  { _id: ObjectId("650a...") },
  {
    $set: {
      isDeleted: true,
      deletedAt: new Date()
    }
  }
);

// Read queries then simply filter out soft-deleted documents
db.users.find({ isDeleted: { $ne: true } });
```

---

## ✅ Takeaways

1. Use `deleteOne()` for target removals and `deleteMany()` for bulk condition matching.
2. Use `db.collection.drop()` instead of `deleteMany({})` when wiping test or temporary collections for speed.
3. Prefer **Soft Deletes** (`isDeleted: true`) in production systems to maintain auditability and data recovery capabilities.

---

Next: [06-Array-And-Embedded-Document-Queries.md](06-Array-And-Embedded-Document-Queries.md) — Advanced querying on embedded sub-documents and array elements.
