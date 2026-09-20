# 📐 11 — Schema Design: Embedding vs. Referencing

> Previous: [10-Indexes-Query-Performance.md](10-Indexes-Query-Performance.md)  
> Next: [12-Transactions-ACID-Concurrency.md](12-Transactions-ACID-Concurrency.md)

---

## 📌 Executive Summary

- Schema design in MongoDB is fundamentally different from SQL normalization.
- **Golden Rule of MongoDB Schema Design:** *"Data that is accessed together should be stored together!"*
- Two fundamental modeling approaches:
  1. **Embedding (Denormalization):** Storing sub-documents and arrays inside the main parent document.
  2. **Referencing (Normalization):** Storing `ObjectId` links referencing separate collections.
- **Document Size Ceiling:** MongoDB has a hard limit of **16 MB per BSON document**. Unbounded arrays lead to anti-pattern crashes!

---

## 🧠 Core Analogy: Book Chapters vs Library Card Numbers

- **Embedding:** Binding all chapter pages directly inside a single hardbound book. Opening the book gives you instant access to all text without leaving your seat.
- **Referencing:** Giving the reader a slip of paper with 10 library call numbers written on it. To read the full story, the reader has to walk down 10 different aisles (`$lookup`) to collect each volume!

---

## ⚖️ 1. Embedding vs. Referencing Comparison

```
EMBEDDING (Denormalized)                     REFERENCING (Normalized)
┌──────────────────────────────────────┐     ┌──────────────────────────────────┐
│ USER DOCUMENT                        │     │ USER DOCUMENT                    │
│ {                                    │     │ { _id: ObjectId("U1"),           │
│   _id: ObjectId("U1"),               │     │   name: "Saif" }                 │
│   name: "Saif",                      │     └──────────────────────────────────┘
│   addresses: [                       │                      │
│     { city: "Mumbai", zip: 400001 }, │                      ▼ (Ref via _id)
│     { city: "Delhi",  zip: 110001 }  │     ┌──────────────────────────────────┐
│   ]                                  │     │ ADDRESSES COLLECTION             │
│ }                                    │     │ { userId: ObjectId("U1"),        │
└──────────────────────────────────────┘     │   city: "Mumbai" }               │
                                             └──────────────────────────────────┘
```

| Decision Metric | Embed Sub-Document | Reference Collection |
|---|---|---|
| **Relationship Type** | 1:1 or 1:Few (e.g. 2-5 addresses) | 1:Many or 1:Squillions (e.g. 500,000 logs) |
| **Read/Write Ratio** | Read-Heavy, queried together | Updated independently, high volume |
| **Array Growth** | Bounded (will never exceed 16MB) | Unbounded (grows indefinitely over time) |
| **Data Duplication** | Acceptable if data rarely changes | Avoided if data changes frequently |

---

## 🚨 2. The Unbounded Array Anti-Pattern

```javascript
// ❌ ANTI-PATTERN: Storing millions of sensor logs in a single user array!
{
  _id: ObjectId("..."),
  user: "Sensor_01",
  readings: [
    { val: 22.4, time: 171890000 },
    { val: 22.5, time: 171890001 },
    ... // 🚨 Array grows until 16MB document size limit is hit -> CRASH!
  ]
}
```

### ✅ Solution: Bucket Pattern
Group sensor readings into hourly/daily documents instead:

```javascript
{
  _id: ObjectId("..."),
  sensorId: "Sensor_01",
  day: "2026-09-20",
  count: 1440,
  readings: [ ... 1440 entries max per day bucket ... ]
}
```

---

## 🛡️ 3. Schema Validation with `$jsonSchema`

Although MongoDB is schema-flexible, you can enforce strict schema rules at the collection level using `$jsonSchema`:

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "role"],
      properties: {
        name: {
          bsonType: "string",
          description: "Name must be a valid string"
        },
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "Must be a valid email address"
        },
        role: {
          enum: ["admin", "user", "editor"],
          description: "Role can only be admin, user, or editor"
        }
      }
    }
  }
});
```

---

## ✅ Takeaways

1. Embed when data is read together and arrays are small/bounded.
2. Reference when data grows unbounded or is shared independently across many entities.
3. Keep BSON documents well below the 16MB limit.
4. Use `$jsonSchema` for database-level type and constraint validation.

---

Next: [12-Transactions-ACID-Concurrency.md](12-Transactions-ACID-Concurrency.md) — Multi-Document ACID Transactions & Concurrency.
