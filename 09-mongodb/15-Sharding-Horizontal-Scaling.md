# 🌐 15 — Sharding & Horizontal Scaling

> Previous: [14-Replication-High-Availability.md](14-Replication-High-Availability.md)  
> Next: [16-Performance-Optimization-Playbook.md](16-Performance-Optimization-Playbook.md)

---

## 📌 Executive Summary

- When a database exceeds the RAM, disk, or CPU capacity of a single machine, you must scale **horizontally**.
- **Sharding** is MongoDB's method for partitioning data across multiple physical machines (shards).
- A **Sharded Cluster Architecture** consists of:
  1. **`mongos` Query Routers:** Acts as the traffic director for client applications.
  2. **Config Servers:** Stores cluster metadata and routing mappings.
  3. **Shards:** Individual replica sets holding a subset of partition data.
- **Shard Key Selection:** Choosing an improper Shard Key creates hotspot bottlenecks that destroy cluster performance!

---

## 🏗️ 1. Sharded Cluster Architecture

```
                               ┌───────────────────────────┐
  Client Application ─────────▶│  mongos Query Router      │
                               └─────────────┬─────────────┘
                                             │ Consults Metadata
                               ┌─────────────▼─────────────┐
                               │  Config Server Cluster    │
                               └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
  ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
  │ SHARD 1 (Replica Set)   │   │ SHARD 2 (Replica Set)   │   │ SHARD 3 (Replica Set)   │
  │ Chunk Range: A — M      │   │ Chunk Range: N — S      │   │ Chunk Range: T — Z      │
  └─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

---

## 🗝️ 2. Choosing a Shard Key (Hashed vs. Range)

A **Shard Key** is an indexed field (or fields) that determines which shard stores a given document.

### Strategy 1: Range-Based Sharding
Documents are partitioned based on shard key ranges (e.g. `zipcode: 10000 - 20000` goes to Shard 1).
- **Pros:** Efficient for range queries (`find({ zipcode: { $gte: 10000, $lte: 15000 } })`).
- 🚨 **The Monotonically Increasing Key Trap:** If you pick `createdAt` or auto-incrementing `id` as a range shard key, 100% of ALL new inserts will hit ONLY the last shard (Shard 3)! This creates a massive write hotspot and ruins sharding!

### Strategy 2: Hashed Sharding
MongoDB computes an MD5 hash of the shard key field to distribute writes uniformly across all shards.
- **Pros:** Guarantees perfectly even write distribution across all machines!
- **Cons:** Range queries must be broadcast to all shards (`scatter-gather`).

```javascript
// Enable sharding for collection using Hashed Shard Key
sh.shardCollection("ecommerce.orders", { user_id: "hashed" });
```

---

## ✅ Takeaways

1. **Vertical Scaling** = Buying a bigger server; **Horizontal Scaling (Sharding)** = Spreading data across many cheap servers.
2. `mongos` routes client queries to the correct shard based on Config Server metadata.
3. Avoid monotonically increasing values (like `createdAt`) as Range Shard Keys to prevent write hotspots. Use Hashed Shard Keys for uniform write scaling.

---

Next: [16-Performance-Optimization-Playbook.md](16-Performance-Optimization-Playbook.md) — Top Performance Optimization & Anti-Pattern Playbook.
