# 🔄 14 — Replication & High Availability

> Previous: [13-Mongoose-ORM-ODM-Nodejs.md](13-Mongoose-ORM-ODM-Nodejs.md)  
> Next: [15-Sharding-Horizontal-Scaling.md](15-Sharding-Horizontal-Scaling.md)

---

## 📌 Executive Summary

- High availability and data redundancy in MongoDB are achieved using **Replica Sets**.
- A **Replica Set** is a group of `mongod` instances that maintain the exact same dataset.
- A standard production Replica Set consists of:
  - **1 Primary Node:** Receives all write operations.
  - **2+ Secondary Nodes:** Replicate the Primary's operations log (**`oplog`**) and serve read traffic.
- If the Primary node goes offline, an **Automatic Election** elects a new Primary in seconds!

---

## 🧠 Core Analogy: Pilot, Co-Pilot & Black Box

```
                      ┌───────────────────────────────┐
                      │    PRIMARY NODE               │
                      │  (Receives Writes & Reads)    │
                      └──────────────┬────────────────┘
                                     │
                        Replicates Oplog Stream
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │  SECONDARY NODE A         │           │  SECONDARY NODE B         │
    │  (Backup & Read Replica)  │           │  (Backup & Read Replica)  │
    └───────────────────────────┘           └───────────────────────────┘
```

- **Primary Node:** The lead pilot steering the airplane and making commands (writes).
- **Secondary Nodes:** Co-pilots watching every command, updating their identical flight logs (`oplog`), and ready to take the controls instantly if the lead pilot faints (failover election)!

---

## 🛠️ 1. How Replication Works (`oplog`)

1. When a client performs a write operation (`insertOne`, `updateOne`) on the Primary node, the operation is executed.
2. The Primary records the operation in its **`oplog` (Operations Log)** capped collection.
3. Secondary nodes continuously pull and apply the primary's `oplog` entries to maintain an identical dataset snapshot.

---

## 🗳️ 2. Automatic Failover & Heartbeats

- Every node in a Replica Set sends ping **heartbeats** to every other node every 2 seconds.
- If Secondaries do not receive a response from the Primary for 10 seconds, the cluster triggers an **Automatic Election**.
- The Secondary with the most up-to-date `oplog` timestamp receives the majority of votes and becomes the **new Primary**!

```
         Primary Node Crashes / Power Loss!
                         │
                         ▼
        Secondaries detect missing heartbeat (10s)
                         │
                         ▼
             Automatic Vote Election
                         │
                         ▼
      Secondary A elected as NEW PRIMARY automatically!
```

---

## 📖 3. Read Preferences (Routing Read Traffic)

By default, all read queries hit the Primary. You can customize **Read Preferences** to offload heavy read queries to Secondary nodes:

```javascript
// Route reads strictly to Primary (Default)
mongoose.connect(uri, { readPreference: 'primary' });

// Route reads to Secondary nodes to offload Primary CPU
mongoose.connect(uri, { readPreference: 'secondary' });

// Route reads to Secondary, fallback to Primary if all secondaries offline
mongoose.connect(uri, { readPreference: 'secondaryPreferred' });

// Route reads to node with lowest network latency
mongoose.connect(uri, { readPreference: 'nearest' });
```

---

## ✅ Takeaways

1. Replica sets provide data redundancy and 99.999% high availability.
2. Minimum production setup requires 3 nodes (1 Primary + 2 Secondaries).
3. If Primary crashes, Secondaries automatically elect a new Primary via `oplog` vote.
4. Use `secondaryPreferred` read preferences to offload heavy analytical reads from the Primary node.

---

Next: [15-Sharding-Horizontal-Scaling.md](15-Sharding-Horizontal-Scaling.md) — Horizontal Scaling & Database Sharding.
