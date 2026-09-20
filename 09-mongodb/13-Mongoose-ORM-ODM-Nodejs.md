# 🍃 13 — Mongoose ODM for Node.js & Express

> Previous: [12-Transactions-ACID-Concurrency.md](12-Transactions-ACID-Concurrency.md)  
> Next: [14-Replication-High-Availability.md](14-Replication-High-Availability.md)

---

## 📌 Executive Summary

- **Mongoose** is an Object Data Modeling (ODM) library for Node.js and MongoDB.
- Provides strict schema definition, type casting, validation, middleware hooks (`pre`/`post`), and document query building.
- Key concepts: **Schema** (structure blueprint), **Model** (constructor interface for database collections), and **Document** (individual instance).
- **Virtuals:** Computed properties that do not persist to MongoDB disk.
- **`.populate()`:** Automatically replaces `ObjectId` reference fields with documents from target collections.

---

## 🛠️ 1. Connecting Mongoose to MongoDB

```javascript
const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/my_app_db', {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB Connected via Mongoose!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
}
```

---

## 📄 2. Defining Schemas, Models & Validation

```javascript
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^.+@.+\..+$/, "Please fill a valid email address"]
  },
  age: {
    type: Number,
    min: [18, "Must be at least 18 years old"]
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  // Reference link to Order model
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt Date fields!
});

// Compile Schema into a Model
const User = mongoose.model('User', userSchema);
module.exports = User;
```

---

## 🪝 3. Middleware Hooks (`pre` & `post` Hooks)

Mongoose middleware allows executing custom logic (like hashing passwords) before or after database actions:

```javascript
const bcrypt = require('bcryptjs');

// Pre-save hook: Hash password before saving to MongoDB
userSchema.pre('save', async function (next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

---

## 🔗 4. Populating Referenced Documents (`.populate()`)

Instead of writing custom `$lookup` aggregation stages, Mongoose provides `.populate()` to fetch referenced documents automatically:

```javascript
// Find user and replace orders array of ObjectIds with full Order documents
const user = await User.findById(userId)
  .populate({
    path: 'orders',
    select: 'totalAmount status createdAt', // Select specific fields
    match: { status: 'completed' }           // Filter populated items
  });

console.log(user.orders[0].totalAmount);
```

---

## 🧪 5. Virtuals (Computed Properties)

Virtuals are fields you can get and set but do NOT get persisted to MongoDB storage:

```javascript
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included when converting documents to JSON
userSchema.set('toJSON', { virtuals: true });
```

---

## ✅ Takeaways

1. Schemas define structure, types, and validation rules; Models provide database querying methods.
2. Use `timestamps: true` to automate `createdAt` and `updatedAt` tracking.
3. Use `pre('save')` hooks for automatic password hashing.
4. Use `.populate()` to easily resolve `ObjectId` references.

---

Next: [14-Replication-High-Availability.md](14-Replication-High-Availability.md) — Replica Sets, Failover & High Availability.
