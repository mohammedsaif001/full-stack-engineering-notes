# 🎯 17 — Interview Query Patterns & Real-World Solutions

> Previous: [16-Performance-Optimization-Playbook.md](16-Performance-Optimization-Playbook.md)  
> Next: [18-Cheat-Sheet-Quick-Reference.md](18-Cheat-Sheet-Quick-Reference.md)

---

## 📌 Executive Summary

- Master these 15 real-world MongoDB interview query problems.
- Topics cover **Aggregation Pipelines**, **Pagination**, **Finding Duplicates**, **Array Manipulation**, and **`$lookup` Joins**.

---

## 💻 Top 15 MongoDB Interview Queries

### Q1: Find Top 3 Users Who Spent the Most Money
```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", totalSpent: { $sum: "$totalAmount" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 3 }
]);
```

---

### Q2: Count Total Active Products Per Category
```javascript
db.products.aggregate([
  { $match: { isAvailable: true } },
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

---

### Q3: Find Duplicate Emails in Users Collection
```javascript
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 }, userIds: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
]);
```

---

### Q4: Join Orders with User Information (`$lookup`)
```javascript
db.orders.aggregate([
  { $match: { status: "pending" } },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userInfo"
    }
  },
  { $unwind: "$userInfo" },
  {
    $project: {
      _id: 1,
      totalAmount: 1,
      userName: "$userInfo.name",
      userEmail: "$userInfo.email"
    }
  }
]);
```

---

### Q5: Find Products That Have ALL Specified Tags (`$all`)
```javascript
// Find products containing BOTH "apple" AND "wireless" tags
db.products.find({ tags: { $all: ["apple", "wireless"] } });
```

---

### Q6: Update Embedded Array Item Matching Condition (`$elemMatch`)
```javascript
db.users.updateOne(
  { _id: 101, "cart.productId": "PROD-99" },
  { $inc: { "cart.$.quantity": 1 } }
);
```

---

### Q7: Calculate Monthly Sales Revenue Breakdown
```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      monthlyRevenue: { $sum: "$totalAmount" },
      totalOrders: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": -1, "_id.month": -1 } }
]);
```

---

### Q8: Find Users Who Placed NO Orders
```javascript
db.users.aggregate([
  {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "userId",
      as: "userOrders"
    }
  },
  { $match: { userOrders: { $size: 0 } } },
  { $project: { name: 1, email: 1 } }
]);
```

---

### Q9: Paginated Products Search with Total Count (`$facet`)
```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  {
    $facet: {
      metadata: [{ $count: "totalResults" }],
      data: [{ $sort: { price: 1 } }, { $skip: 20 }, { $limit: 10 }]
    }
  }
]);
```

---

### Q10: Add New Tag to Array Without Creating Duplicates (`$addToSet`)
```javascript
db.users.updateOne(
  { _id: ObjectId("...") },
  { $addToSet: { roles: "editor" } }
);
```

---

### Q11: Calculate Average Product Rating from Reviews Array
```javascript
db.products.aggregate([
  { $unwind: "$reviews" },
  {
    $group: {
      _id: "$_id",
      productName: { $first: "$name" },
      averageRating: { $avg: "$reviews.rating" }
    }
  }
]);
```

---

### Q12: Find Documents Where Field Value is Greater Than Another Field in Same Document (`$expr`)
```javascript
// Find products where salePrice is less than original cost
db.products.find({
  $expr: { $lt: ["$salePrice", "$costPrice"] }
});
```

---

### Q13: Remove the Last Element from an Embedded Array (`$pop`)
```javascript
db.users.updateOne(
  { _id: ObjectId("...") },
  { $pop: { recentSearches: 1 } } // 1 = Remove last item, -1 = Remove first item
);
```

---

### Q14: Perform Text Search with Relevance Score Sorting
```javascript
db.articles.find(
  { $text: { $search: "database scaling" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

---

### Q15: Increment Document Counter and Return Updated Version (`findOneAndUpdate`)
```javascript
db.counters.findOneAndUpdate(
  { _id: "orderId" },
  { $inc: { seq: 1 } },
  { returnDocument: "after", upsert: true }
);
```

---

## ✅ Takeaways

1. Use `$expr` to compare two fields inside the same document.
2. Use `$facet` for simultaneous pagination + total result count.
3. Master `$group`, `$unwind`, and `$lookup` for aggregation interview questions.

---

Next: [18-Cheat-Sheet-Quick-Reference.md](18-Cheat-Sheet-Quick-Reference.md) — MongoDB Syntax & Command Cheat Sheet.
