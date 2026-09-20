# 🔄 13b — Native MongoDB vs. Mongoose ODM: Side-by-Side CRUD Comparison

> Previous: [13-Mongoose-ORM-ODM-Nodejs.md](13-Mongoose-ORM-ODM-Nodejs.md)  
> Next: [14-Replication-High-Availability.md](14-Replication-High-Availability.md)

---

## 📌 Executive Summary

- In **Native MongoDB (`mongosh` / Native Driver)**, operations target collections directly via `db.collection.<method>()` and require explicit BSON `ObjectId` instantiation.
- In **Mongoose ODM**, operations target model classes (e.g. `User.<method>()`), casting string IDs to `ObjectId` automatically, applying schema validation rules, and executing pre/post middleware hooks.
- This guide provides a direct, step-by-step side-by-side comparison for every CRUD operation.

---

## 🆚 Side-by-Side Architectural Difference

```
NATIVE MONGODB APPROACH                     MONGOOSE ODM APPROACH
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│ Direct Database Connection           │    │ Schema Blueprint & Model Class       │
│                                      │    │ const userSchema = new Schema({...}) │
│ db.collection('users').findOne({     │    │ const User = model('User', schema)   │
│   _id: new ObjectId("650a...")       │    │                                      │
│ })                                   │    │ User.findById("650a...")             │
│                                      │    │ (Auto-casts string ID & validates!)  │
└──────────────────────────────────────┘    └──────────────────────────────────────┘
```

---

## ➕ 1. CREATE / INSERT OPERATIONS

### A) Native MongoDB (`mongosh` / Native Driver)
```javascript
// 1. Insert Single Document
db.users.insertOne({
  name: "Saif",
  email: "saif@example.com",
  age: 26,
  createdAt: new Date()
});

// 2. Insert Multiple Documents
db.users.insertMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" }
]);
```

### B) Mongoose ODM (Node.js)
```javascript
// Method 1: Using Model.create() (Direct Insert)
const newUser = await User.create({
  name: "Saif",
  email: "saif@example.com",
  age: 26
  // createdAt is added automatically via { timestamps: true }!
});

// Method 2: Instantiating a Model and calling .save() (Runs pre-save hooks!)
const user = new User({
  name: "Saif",
  email: "saif@example.com",
  age: 26
});
await user.save(); // Triggers schema validation & pre('save') password hashing hooks!

// Method 3: Insert Many
await User.insertMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" }
]);
```

---

## 🔍 2. READ / FIND OPERATIONS

### A) Native MongoDB (`mongosh` / Native Driver)
```javascript
// 1. Find All Matching Documents
db.users.find({ role: "admin" });

// 2. Find Single Document by Field
db.users.findOne({ email: "saif@example.com" });

// 3. Find Document by ID (MUST manually wrap string in new ObjectId!)
const { ObjectId } = require('mongodb');
db.users.findOne({ _id: new ObjectId("650a1b2c3d4e5f6789012345") });
```

### B) Mongoose ODM (Node.js)
```javascript
// 1. Find All Matching Documents
const admins = await User.find({ role: "admin" });

// 2. Find Single Document by Field
const user = await User.findOne({ email: "saif@example.com" });

// 3. Find Document by ID (Mongoose AUTO-CASTS string to ObjectId!)
const user = await User.findById("650a1b2c3d4e5f6789012345");
```

---

## ✏️ 3. UPDATE / MODIFY OPERATIONS

### A) Native MongoDB (`mongosh` / Native Driver)
```javascript
// 1. Update One Document by Filter
db.users.updateOne(
  { _id: new ObjectId("650a1b2c3d4e5f6789012345") },
  { $set: { age: 27 }, $inc: { loginCount: 1 } }
);

// 2. Update Many Documents
db.users.updateMany(
  { status: "pending" },
  { $set: { status: "active" } }
);
```

### B) Mongoose ODM (Node.js)
```javascript
// Method 1: findByIdAndUpdate() (Returns updated document!)
const updatedUser = await User.findByIdAndUpdate(
  "650a1b2c3d4e5f6789012345",
  { $set: { age: 27 }, $inc: { loginCount: 1 } },
  { new: true, runValidators: true } // { new: true } returns updated doc instead of old doc
);

// Method 2: Update Many
await User.updateMany(
  { status: "pending" },
  { $set: { status: "active" } }
);

// Method 3: Document Instance Save (Triggers Mongoose Validation & Pre-Hooks)
const user = await User.findById("650a1b2c3d4e5f6789012345");
user.age = 27;
await user.save(); // Recommended when schema getters/setters/validation are needed!
```

---

## 🗑️ 4. DELETE / REMOVE OPERATIONS

### A) Native MongoDB (`mongosh` / Native Driver)
```javascript
// 1. Delete One Document
db.users.deleteOne({ _id: new ObjectId("650a1b2c3d4e5f6789012345") });

// 2. Delete Many Documents
db.users.deleteMany({ isDeleted: true });
```

### B) Mongoose ODM (Node.js)
```javascript
// Method 1: findByIdAndDelete() (Deletes and returns deleted document)
const deletedUser = await User.findByIdAndDelete("650a1b2c3d4e5f6789012345");

// Method 2: deleteOne()
await User.deleteOne({ email: "spammer@example.com" });

// Method 3: deleteMany()
await User.deleteMany({ isDeleted: true });
```

---

## 🎯 5. PROJECTION, SORTING & PAGINATION

### A) Native MongoDB (`mongosh` / Native Driver)
```javascript
db.users.find(
  { role: "customer" },                  // Filter
  { name: 1, email: 1, _id: 0 }           // Projection (1 = Include, 0 = Exclude)
)
.sort({ createdAt: -1 })                 // -1 = Descending
.skip(10)                                // Skip first 10
.limit(5);                               // Limit to 5
```

### B) Mongoose ODM (Node.js)
```javascript
const users = await User.find({ role: "customer" })
  .select('name email -_id')             // Mongoose space-separated string selection syntax!
  .sort('-createdAt')                    // '-createdAt' = Descending, 'createdAt' = Ascending
  .skip(10)
  .limit(5);
```

### 🔒 5.2 Hiding Fields by Default at Schema Level (`select: false`) & Explicit Selection (`+password`)

In authentication systems, you want to **hide password hashes by default** from all queries, but retrieve them explicitly during login authentication!

#### 1. Schema Definition (Hide by Default):
```javascript
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: {
    type: String,
    required: true,
    select: false // 🔒 Excludes password from ALL find/findOne queries by default!
  }
});
```

#### 2. Querying Default (Password Excluded Automatically):
```javascript
// Password is NOT included in the returned user object!
const user = await User.findOne({ email: "saif@example.com" });
console.log(user.password); // undefined
```

#### 3. Explicit Querying when Password is Needed (e.g. Login Check):
```javascript
// Prefix field name with '+' to explicitly include a 'select: false' field!
const user = await User.findOne({ email: req.body.email }).select('+password');

// Now user.password is available for bcrypt.compare() validation!
const isMatch = await bcrypt.compare(req.body.password, user.password);
```

---

## 🔗 6. RELATIONAL JOINS (`$lookup` vs `.populate()`)

### A) Native MongoDB (`$lookup` Aggregation)
```javascript
db.orders.aggregate([
  { $match: { status: "shipped" } },
  {
    $lookup: {
      from: "users",                      // Target collection
      localField: "userId",               // Field in orders
      foreignField: "_id",                // Field in users
      as: "customer"                      // Output array name
    }
  },
  { $unwind: "$customer" }
]);
```

### B) Mongoose ODM (`.populate()`)
```javascript
// Assuming Order schema defined: userId: { type: Schema.Types.ObjectId, ref: 'User' }
const orders = await Order.find({ status: "shipped" })
  .populate('userId', 'name email');     // Automatically resolves & replaces userId ObjectId!
```

---

## 📊 Summary Cheat Sheet Matrix

| CRUD Operation | Native MongoDB Syntax | Mongoose ODM Syntax |
|---|---|---|
| **Insert One** | `db.users.insertOne({...})` | `User.create({...})` or `new User({...}).save()` |
| **Find By ID** | `db.users.findOne({ _id: new ObjectId(id) })` | `User.findById(id)` *(Auto-casts string ID)* |
| **Find One** | `db.users.findOne({ email })` | `User.findOne({ email })` |
| **Update By ID**| `db.users.updateOne({ _id: new ObjectId(id) }, { $set: {...} })` | `User.findByIdAndUpdate(id, {...}, { new: true })` |
| **Delete By ID**| `db.users.deleteOne({ _id: new ObjectId(id) })` | `User.findByIdAndDelete(id)` |
| **Select Fields**| `db.users.find({}, { name: 1, email: 1 })` | `User.find().select('name email')` |
| **Relational Join**| `db.orders.aggregate([ { $lookup: {...} } ])` | `Order.find().populate('userId')` |

---

Next: [14-Replication-High-Availability.md](14-Replication-High-Availability.md) — Replica Sets & High Availability.
