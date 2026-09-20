# 📋 18 — Cheat Sheet & Quick Reference

> Previous: [17-Interview-Query-Patterns.md](17-Interview-Query-Patterns.md)  
> Home: [README.md](README.md)

---

## 📌 Executive Summary

- Fast reference for **`mongosh` CLI**, **CRUD operators**, **Aggregation stages**, **Indexing commands**, and **Mongoose ODM methods**.

---

## 🛠️ 1. Database & Collection CLI Commands

```bash
# Connect to Mongo Shell
mongosh "mongodb://localhost:27017"

# Show all databases
show dbs

# Switch or create database
use ecommerce_db

# Show collections in current database
show collections

# Drop collection
db.my_collection.drop()

# Drop database
db.dropDatabase()
```

---

## ➕ 2. Create / Insert Cheat Sheet

```javascript
// Insert One
db.users.insertOne({ name: "Saif", email: "saif@example.com" });

// Insert Many (Unordered)
db.users.insertMany([{ name: "A" }, { name: "B" }], { ordered: false });
```

---

## 🔍 3. Read / Find Query Operators

```javascript
// Comparison Operators
db.products.find({ price: { $gt: 100, $lte: 500 } });
db.products.find({ status: { $in: ["active", "pending"] } });
db.products.find({ status: { $ne: "deleted" } });

// Logical Operators
db.products.find({ $or: [{ price: { $lt: 50 } }, { featured: true }] });

// Element & Type
db.products.find({ discount: { $exists: true } });
db.products.find({ age: { $type: "number" } });

// Projection, Sort & Pagination
db.products.find({}, { name: 1, price: 1, _id: 0 })
  .sort({ price: -1 })
  .skip(20)
  .limit(10);
```

---

## ✏️ 4. Update Operators Cheat Sheet

```javascript
// Field Updates
db.users.updateOne(
  { _id: ObjectId("...") },
  {
    $set: { status: "active" },
    $unset: { tempToken: "" },
    $inc: { loginCount: 1 },
    $currentDate: { lastLogin: true }
  },
  { upsert: true }
);

// Array Updates
db.users.updateOne({ _id: id }, { $push: { tags: "new" } });
db.users.updateOne({ _id: id }, { $addToSet: { roles: "admin" } }); // Unique
db.users.updateOne({ _id: id }, { $pull: { tags: "old" } });
```

---

## ⚙️ 5. Aggregation Pipeline Stages

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: "$category",
      totalSales: { $sum: "$totalAmount" },
      avgPrice: { $avg: "$price" },
      count: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "_id",
      foreignField: "code",
      as: "categoryInfo"
    }
  },
  { $unwind: "$categoryInfo" },
  { $sort: { totalSales: -1 } },
  { $limit: 10 }
]);
```

---

## ⚡ 6. Indexing Commands

```javascript
// Single Field Index
db.users.createIndex({ email: 1 });

// Unique Index
db.users.createIndex({ email: 1 }, { unique: true });

// Compound Index (ESR Rule: Equality -> Sort -> Range)
db.orders.createIndex({ status: 1, createdAt: -1, price: 1 });

// TTL Index (Auto-delete after 1 hour)
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Explain Query Execution Stats
db.users.find({ email: "saif@example.com" }).explain("executionStats");
```

---

## 🍃 7. Mongoose ODM Cheat Sheet

```javascript
// Connection
await mongoose.connect('mongodb://localhost:27017/mydb');

// Schema Definition
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }]
}, { timestamps: true });

// Pre-Save Hook
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Model & Query
const User = mongoose.model('User', userSchema);
const user = await User.findById(id).populate('orders');
```

---

🎉 **Congratulations! You have completed the full MongoDB & NoSQL Masterclass!**  
Back to index: [README.md](README.md)
