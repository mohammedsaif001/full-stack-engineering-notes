# 🍃 09 — MongoDB & NoSQL Masterclass

Welcome! This repository is a comprehensive, production-grade guide to **MongoDB**, **NoSQL Database Architecture**, **Aggregation Pipelines**, **Indexing**, **Schema Design**, and **Mongoose ODM**.

Designed to mirror the depth and structure of the [08-sql](../08-sql/README.md) notes, every file includes an **Executive Summary**, a **Core Analogy**, runnable Mongo Shell (`mongosh`) and Mongoose code snippets, visual architectural diagrams, performance warnings, and a **Takeaways** summary.

---

## 🧭 Curriculum Roadmap

| # | File | What You Will Learn & Master |
|---|---|---|
| **00** | [Setup, Compass & Mongo Shell](00-Setup-MongoDB-Compass-MongoShell.md) | Installing MongoDB via Docker/Community, MongoDB Compass GUI, `mongosh` CLI, connection strings (`mongodb://`). |
| **01** | [Why NoSQL & Document Model](01-Why-NoSQL-Document-Model.md) | Relational tables vs. BSON documents, JSON vs. BSON, dynamic schemas, when to use MongoDB vs. PostgreSQL. |
| **02** | [CRUD — Insert / Create](02-CRUD-Insert-Create-Operations.md) | `insertOne()`, `insertMany()`, BSON `ObjectId` structure, Write Concern (`w: 1`, `w: majority`). |
| **03** | [CRUD — Find / Read Filtering](03-CRUD-Find-Read-Filtering.md) | `find()`, `findOne()`, query operators (`$eq`, `$gt`, `$in`, `$ne`), logical operators (`$and`, `$or`), element operators (`$exists`, `$type`). |
| **04** | [CRUD — Update / Modify](04-CRUD-Update-Modify-Operations.md) | `updateOne()`, `updateMany()`, `replaceOne()`, field operators (`$set`, `$inc`, `$unset`), array operators (`$push`, `$addToSet`, `$pull`), `upsert: true`. |
| **05** | [CRUD — Delete / Drop](05-CRUD-Delete-Drop-Operations.md) | `deleteOne()`, `deleteMany()`, `drop()`, `dropDatabase()`, soft vs. hard delete strategies. |
| **06** | [Array & Embedded Document Queries](06-Array-And-Embedded-Document-Queries.md) | Querying nested objects, `$elemMatch`, array size (`$size`), positional operators (`$`, `$[]`, `$[<identifier>]`). |
| **07** | [Aggregation Framework Basics](07-Aggregation-Framework-Basics.md) | Pipeline concept (`aggregate([ ... ])`), `$match`, `$project`, `$sort`, `$limit`, `$skip`, `$count`. |
| **08** | [Aggregation Advanced — Group & Unwind](08-Aggregation-Advanced-Group-Unwind.md) | `$group` accumulator operators (`$sum`, `$avg`, `$push`), `$unwind` array flattening, `$addFields`, `$facet` (multi-faceted search & pagination). |
| **09** | [Aggregation Lookup (Joins)](09-Aggregation-Lookup-Joins.md) | `$lookup` relational joins across collections, `from`, `localField`, `foreignField`, pipeline-based `$lookup`, performance impact. |
| **10** | [Indexes & Query Performance](10-Indexes-Query-Performance.md) | Single field, Compound indexes, ESR Rule (Equality, Sort, Range), Unique, TTL, Text indexes, `explain("executionStats")` analysis. |
| **11** | [Schema Design — Embedding vs Referencing](11-Schema-Design-Embedding-vs-Referencing.md) | 1:1, 1:N, M:N modeling patterns. Embedding vs Referencing rules ("Together vs Separate"), Bucket & Outlier patterns, `$jsonSchema` validation. |
| **12** | [Transactions & ACID Concurrency](12-Transactions-ACID-Concurrency.md) | Multi-document ACID transactions, session management (`session.startTransaction()`), Read/Write concern & Read preference. |
| **13** | [Mongoose ODM for Node.js](13-Mongoose-ORM-ODM-Nodejs.md) | Schemas, Models, Type definitions, validation, hooks/middleware (`pre`, `post`), virtuals, `.populate()` references. |
| **14** | [Replication & High Availability](14-Replication-High-Availability.md) | Replica Sets (Primary, Secondary, Arbiter), automatic failover, elections, read preferences (`primary`, `secondaryPreferred`). |
| **15** | [Sharding & Horizontal Scaling](15-Sharding-Horizontal-Scaling.md) | Sharding architecture (Mongos router, Config servers, Shards), Shard Keys (Hashed vs Range), avoiding monotonically increasing key traps. |
| **16** | [Performance Optimization Playbook](16-Performance-Optimization-Playbook.md) | Top MongoDB anti-patterns, WiredTiger cache management, unindexed query bottlenecks, projection optimization, `bulkWrite()`. |
| **17** | [Interview Query Patterns](17-Interview-Query-Patterns.md) | 15 real-world interview questions (E-commerce cart, Social media feeds, Pagination, Top-K items, Duplicate removal, `$lookup` joins). |
| **18** | [Cheat Sheet & Quick Reference](18-Cheat-Sheet-Quick-Reference.md) | Ultimate MongoDB CLI & Mongoose syntax cheat sheet. |

---

## 🆚 Quick Reference: SQL vs. MongoDB Terminology

| Relational SQL (e.g. PostgreSQL) | MongoDB / NoSQL Equivalent |
|---|---|
| **Database** | Database |
| **Table** | **Collection** |
| **Row** | **Document** (BSON format) |
| **Column** | **Field** |
| **Primary Key** (`id`) | **`_id`** (BSON `ObjectId`) |
| **Foreign Key / JOIN** | Embedded Documents or **`$lookup`** / `.populate()` |
| **SQL Select** | `find()` or `$project` |
| **Group By** | `$group` in Aggregation Pipeline |

---

💡 *Ready to get started? Dive into [00-Setup-MongoDB-Compass-MongoShell.md](00-Setup-MongoDB-Compass-MongoShell.md)!*
