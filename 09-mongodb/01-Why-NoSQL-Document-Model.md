# 📄 01 — Why NoSQL & The Document Model

> Previous: [00-Setup-MongoDB-Compass-MongoShell.md](00-Setup-MongoDB-Compass-MongoShell.md)  
> Next: [02-CRUD-Insert-Create-Operations.md](02-CRUD-Insert-Create-Operations.md)

---

## 📌 Executive Summary

- **NoSQL** does not mean "No SQL" — it stands for **"Not Only SQL"**.
- MongoDB is a **Document-Oriented Database**. Instead of storing data in rigid rows and columns across multiple normalized tables, data is stored as self-contained **BSON (Binary JSON)** documents.
- **Dynamic Schema:** Documents in the same collection do not need to share the exact same fields or structure.
- **JSON vs. BSON:** JSON is text-based human-readable formatting. BSON is MongoDB's binary extension that supports rich data types like `ObjectId`, `Date`, `BinData`, `Int32`, `Int64`, and `Decimal128`.

---

## 🧠 Core Analogy: Filing Cabinets vs. Manilla Folders

- **Relational SQL Database (PostgreSQL):** A giant grid of metal lockers. Every locker in row 5 must have 8 exact compartments of fixed sizes. If a user needs 9 fields, you must alter the entire building structure (`ALTER TABLE`).
- **Document NoSQL Database (MongoDB):** A collection of flexible manilla folders inside a filing cabinet. Folder A can contain 3 sheets of paper, Folder B can contain 10 sheets with nested photos and lists, and Folder C can contain a completely unique set of attributes!

---

## 🆚 1. Relational SQL vs. MongoDB Document Model

```
RELATIONAL MODEL (SQL)                      DOCUMENT MODEL (MongoDB)
┌─────────────────────────┐                 ┌──────────────────────────────────────┐
│ USERS TABLE             │                 │ USERS COLLECTION                     │
│ id | name  | email      │                 │ {                                    │
├────┼───────┼────────────┤                 │   "_id": ObjectId("650a..."),        │
│ 1  │ Alice │ a@test.com │                 │   "name": "Alice",                   │
└────┴───────┴────────────┘                 │   "email": "a@test.com",             │
             │                              │   "addresses": [                     │
             ▼ 1:N Join                     │     { "type": "home", "city": "NYC" }│
┌─────────────────────────┐                 │   ],                                 │
│ ADDRESSES TABLE         │                 │   "roles": ["admin", "user"]         │
│ id | user_id | city     │                 │ }                                    │
├────┼─────────┼──────────┤                 └──────────────────────────────────────┘
│ 10 │ 1       │ NYC      │                   (Everything stored together in ONE  │
└────┴─────────┴──────────┤                   document — no SQL JOIN required!)   │
```

### Key Differences:

| Metric | Relational SQL | MongoDB Document Store |
|---|---|---|
| **Data Format** | Rigid Tables, Rows & Columns | Flexible BSON Documents |
| **Schema** | Strict (Defined via DDL `CREATE TABLE`) | Dynamic / Schema-flexible |
| **Relationships** | Foreign Keys & Normalized `JOIN`s | Embedded Objects/Arrays OR Referencing |
| **Scaling** | Vertical Scaling (bigger CPU/RAM) | Horizontal Scaling (Sharding across nodes) |
| **ACID Guarantees** | Multi-table native transactions | Single-document native atomic + Multi-doc ACID |

---

## 📦 2. What is BSON (Binary JSON)?

MongoDB stores and transmits data as **BSON** internally.

```
JSON (Text Format):                 BSON (Binary Representation):
{                                   \x16\x00\x00\x00\x02name\x00\x06\x00\x00\x00Alice\x00
  "name": "Alice",                  (Fast binary parsing, type awareness,
  "age": 25                          and efficient index scanning)
}
```

### Extra Data Types Supported in BSON (Not in standard JSON):

1. **`ObjectId`:** 12-byte unique primary key header containing Timestamp + Machine Hash + Process ID + Counter.
2. **`Date`:** 64-bit integer representing milliseconds since Unix epoch.
3. **`Decimal128`:** High-precision 128-bit decimal for currency/financial math (prevents IEEE floating-point errors like `0.1 + 0.2 = 0.30000000000000004`).
4. **`BinData`:** Raw binary storage (image thumbnails, encrypted payloads).

---

## 🤔 3. When to Choose MongoDB vs. PostgreSQL

### Choose MongoDB when:
- Your data model is naturally hierarchical with nested structures (e.g. User Profiles, E-commerce Product Catalogs with varying attributes, Content Management Systems).
- You require high-velocity write throughput and horizontal auto-sharding.
- Your application requires rapid iteration where schema requirements evolve frequently.

### Choose PostgreSQL when:
- Your core domain involves complex multi-table relational links (e.g. Banking Ledger, Accounting, Complex ERP Systems).
- You require strict relational integrity constraints out of the box.

---

## ✅ Takeaways

1. MongoDB stores data as self-contained, schema-flexible BSON documents inside collections.
2. BSON adds support for `ObjectId`, `Date`, `Decimal128`, and binary types over plain JSON.
3. Embedding data together inside one document removes expensive SQL `JOIN` operations for read-heavy apps.

---

Next: [02-CRUD-Insert-Create-Operations.md](02-CRUD-Insert-Create-Operations.md) — Mastering `insertOne()`, `insertMany()`, and BSON ObjectIDs.
