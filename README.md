# 🚀 Full-Stack Engineering, Distributed Systems & Generative AI Mastery

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](#-06--typescript-engineering)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](#-07--backend-architecture--nodejs-internals)
[![React](https://img.shields.io/badge/React-18%2F19-61DAFB?logo=react&logoColor=black)](#-11--server-application-deployment--frontend-devops)
[![Next.js](https://img.shields.io/badge/Next.js-14%2F15-000000?logo=next.js&logoColor=white)](#-11--server-application-deployment--frontend-devops)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](#-08--relational-dbms--sql-mastery)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?logo=mongodb&logoColor=white)](#-09--nosql-document-dbms-mongodb)
[![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?logo=docker&logoColor=white)](#-10--docker--container-virtualization)
[![Redis](https://img.shields.io/badge/Redis-Pub%2FSub%20%26%20Cache-DC382D?logo=redis&logoColor=white)](#-07--backend-architecture--nodejs-internals)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-Event_Streaming-231F20?logo=apachekafka&logoColor=white)](#-07--backend-architecture--nodejs-internals)
[![GenAI](https://img.shields.io/badge/GenAI-Agents%20%26%20RAG-8A2BE2?logo=openai&logoColor=white)](#-13--generative-ai-rag--agentic-systems)

> **The complete, one-stop GitHub repository and production engineering handbook** covering the full spectrum of modern software development — from low-level computer networking and Docker containerization to relational DBMS (PostgreSQL), NoSQL databases (MongoDB), backend architecture, TypeScript, large-scale system design, cutting-edge Generative AI (LLMs, RAG & autonomous agents), React, Next.js, and Node.js runtime internals.

---

## 📌 What This Repository Covers

This repository serves as an all-in-one technical reference, architectural blueprint collection, and real-world project monorepo. It bridges theoretical fundamentals with production implementation across every layer of the modern tech stack:

- **Computer Networking & Protocols**: DNS mechanics, TCP/UDP transport, CDNs, HTTP/2 & HTTP/3, and edge caching.
- **Modern Web & Frontend**: HTML5 semantics, modern responsive CSS layouts (Flexbox/Grid), React (Vite SPA), and Next.js (SSR, Hybrid, Server Actions).
- **JavaScript & TypeScript Mastery**: V8 engine internals (memory heap, call stack, JIT), event loop, closures, prototypes, and advanced type-safe TypeScript engineering.
- **Node.js & Backend Architecture**: Libuv, threadpool, streams, buffers, production Express.js patterns, DTOs, and runtime validation with Zod.
- **DBMS & Storage Engines**: Relational databases (PostgreSQL, ACID, indexing, query optimization, EXPLAIN ANALYZE) and NoSQL document models (MongoDB aggregation pipelines, sharding, replication), paired with Prisma & Drizzle ORMs.
- **Distributed Systems & High Concurrency**: Redis caching, Redis Pub/Sub, Apache Kafka event streaming, WebSockets, rate limiting, and real-time state synchronization.
- **Security & Identity**: JWT dual-token architecture, OAuth2, OpenID Connect (OIDC), and authorization models (RBAC, ABAC, ReBAC, and Google Zanzibar-style FGA).
- **Docker & Cloud DevOps**: Multi-stage Dockerfiles, Docker Compose, AWS EC2, reverse proxies (Caddy, Traefik), SSL automation, CI/CD with GitHub Actions, and OpenTelemetry observability.
- **System Design & Distributed Patterns**: Scalable microservices, fault-tolerant event streams, database partitioning, load balancing, and high-availability topologies.
- **Generative AI & Agentic Engineering**: Transformer foundations, prompt engineering, structured outputs, multi-model ensemble judges, vector databases (pgvector, Pinecone, Qdrant), advanced RAG patterns (HyDE, RRF, reranking), and custom autonomous AI agent SDKs built from scratch.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FULL-STACK SYSTEM ARCHITECTURE                                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
    ┌─────────────────────────┐                                           ┌─────────────────────────┐
    │  CLIENT & EDGE (UI/UX)  │                                           │   CLOUD & INFRASTRUCTURE│
    │  • HTML5 / Modern CSS   │                                           │  • Docker & Compose     │
    │  • React (Vite SPA)     │                                           │  • Caddy / Traefik SSL  │
    │  • Next.js (SSR / ISR)  │                                           │  • AWS EC2 & Networking │
    │  • WebSockets & WebRTC  │                                           │  • OTel & Observability │
    └────────────┬────────────┘                                           └────────────▲────────────┘
                 │ HTTP/S, WS, gRPC                                                    │
                 ▼                                                                     │
    ┌──────────────────────────────────────────────────────────────────────────────────┴────┐
    │                               BACKEND APPLICATION & SYSTEM DESIGN                    │
    │  • Node.js Internals (Libuv, Event Loop, Buffers, Worker Threads)                     │
    │  • Express.js + TypeScript Production Architecture (DTOs, Middlewares, Services)      │
    │  • Type-Safe Contracts & Runtime Schemas (Zod)                                        │
    │  • Identity & Access: JWT, Refresh Tokens, OAuth2, OIDC, RBAC, ABAC, Zanzibar (FGA)   │
    └──────────────────────────────────────┬────────────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  RELATIONAL DBMS │             │   NOSQL & CACHE  │             │   GEN AI & LLMS  │
│  • PostgreSQL 17 │             │  • MongoDB 8.0   │             │  • Vector DBs    │
│  • ACID & Locks  │             │  • Redis Caching │             │  • Advanced RAG  │
│  • Indexing (B+) │             │  • Redis Pub/Sub │             │  • Agent SDKs    │
│  • Prisma/Drizzle│             │  • Apache Kafka  │             │  • Grounded LLMs │
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

---

## 📚 Curriculum & Directory Breakdown

### 🌐 [01 — Computer Networking](01-networking/)
- **DNS Deep Dive**: Recursive vs iterative resolvers, root nameservers, TLDs, authoritative DNS, record types (`A`, `AAAA`, `CNAME`, `MX`, `TXT`), and DNS propagation.
- **Transport Layer**: TCP 3-way handshake, 4-way termination, flow control (sliding window), congestion control, UDP vs TCP trade-offs.
- **Web Performance & Delivery**: Anycast routing, CDNs, HTTP/1.1 vs HTTP/2 multiplexing vs HTTP/3 (QUIC), edge caching strategies.

### 🐙 [02 — Git & GitHub Workflow](02-github/)
- **Version Control Foundations**: Internal object store (blobs, trees, commits, tags), commit graphs, detached HEAD states.
- **Branching Strategies**: Trunk-based development, GitHub Flow, merge vs rebase vs squash, interactive rebasing, merge conflict resolution.

### 🎨 [03 — HTML5 & Semantic Web](03-html/)
- **Semantic Structure**: Modern landmark elements (`<main>`, `<article>`, `<section>`, `<nav>`), SEO best practices, accessibility (ARIA attributes, WCAG compliance, screen-reader optimization).

### 💅 [04 — Modern CSS & Layouts](04-css/)
- **Layout Engines**: Deep dive into CSS Flexbox, CSS Grid systems, subgrid, fluid responsive design without media-query bloat.
- **Advanced Styling**: CSS Custom Properties (variables), stacking contexts (`z-index` internals), CSS containment, cross-browser compatibility, and CSS animations.

### ⚡ [05 — JavaScript Deep Dive & V8 Internals](05-javascript/)
- **V8 Engine Mechanics**: Memory heap, call stack, Ignition interpreter, TurboFan JIT compiler, garbage collection (Scavenger, Mark-Sweep-Compact).
- **Language Core**: Execution Context, Lexical Environment, Scope Chains, Hoisting, Type Coercion quirks, Closures & Currying.
- **Async Runtime**: Event loop, Microtask queue (`Promises`, `queueMicrotask`) vs Macrotask queue (`setTimeout`, `I/O`), Promises, `async`/`await`.
- **OOP & Meta-Programming**: Prototypes, Prototypal Inheritance, `this` binding (`call`, `apply`, `bind`), ES6 Classes, `Proxy` & `Reflect` APIs.

### 🛡️ [06 — TypeScript Type-Safe Engineering](06-typescript/)
- **Type Foundations**: Primitive types, literal types, type inference, `any` vs `unknown` vs `never`.
- **Composition**: Union & intersection types, discriminated unions, type narrowing & custom type guards.
- **Contracts**: Interfaces vs Type Aliases, object shapes, method signatures, declaration merging.
- **Advanced Generics**: Generic constraints, default type arguments, conditional types, template literal types.
- **Utility Types**: Mapped types, `keyof`, `typeof`, `Partial`, `Required`, `Readonly`, `Record`, `Pick`, `Omit`, `ReturnType`, `Parameters`.

### ⚙️ [07 — Backend Architecture & Node.js Internals](07-backend/)
- **Node.js Core Internals**: Libuv event loop phases (timers, pending I/O, idle/prepare, poll, check, close), threadpool operations, `process.nextTick()`.
- **Low-Level I/O**: `Buffer` memory allocation, binary encoding, `fs` file streaming, piping, backpressure handling, and custom `EventEmitter` patterns.
- **Production Server Architecture**: Express.js layered structure (Controllers, Services, Repositories, DTO validation, centralized error handling).
- **Authentication & Modern Identity**:
  - Stateless auth with JWT (access + rotating refresh tokens in `httpOnly` secure cookies).
  - OpenID Connect (OIDC) & OAuth 2.0 authorization code grant with PKCE.
  - Asymmetric cryptographic key pairs (RS256 with public/private PEM keys).
- **Authorization Models**:
  - RBAC (Role-Based Access Control)
  - ABAC (Attribute-Based Access Control)
  - ReBAC (Relationship-Based Access Control) & Google Zanzibar-inspired Fine-Grained Authorization (FGA).
- **Real-Time & Distributed Messaging**:
  - WebSockets & Socket.IO (room clustering, adapter scaling).
  - Redis Pub/Sub for cross-instance broadcast.
  - Apache Kafka event-driven architectures (topics, partitions, consumer groups, offsets).
  - Webhooks, Service Workers, and WebRTC peer-to-peer data channels.
- **Media & Storage**: Multer multi-part form uploads, stream-to-cloud pipelines, ImageKit CDN transformations.

### 🐘 [08 — Relational DBMS & SQL Mastery (PostgreSQL)](08-sql/)
- **SQL Foundations**: DDL (table schemas, constraints), DML (`INSERT`, `UPDATE`, `DELETE`), DQL (filtering, pattern matching).
- **Complex Querying**: Multi-table `JOIN`s (Inner, Left, Right, Full, Cross, Self), `GROUP BY`, `HAVING`, Aggregation functions.
- **Advanced SQL**: Subqueries (correlated vs uncorrelated), Common Table Expressions (`WITH` CTEs, recursive CTEs), Window Functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LEAD`, `LAG`).
- **Data Modeling**: Relational schema design, Normalization (1NF, 2NF, 3NF, BCNF) vs intentional denormalization.
- **Performance & Internals**:
  - B-Tree indexes, Hash indexes, GIN/GiST indexes.
  - Query execution plans: Reading and optimizing with `EXPLAIN (ANALYZE, BUFFERS)`.
  - Transaction isolation levels (`READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`), ACID guarantees, MVCC, deadlocks, and row locking (`SELECT FOR UPDATE`).
- **ORMs**: Prisma and Drizzle ORM setups, migration lifecycles, and relational mapping.

### 🍃 [09 — NoSQL & Document DBMS (MongoDB)](09-mongodb/)
- **Document Model**: BSON specifications, dynamic schemas, flexible JSON document storage.
- **CRUD Mastery**: Complex filtering with comparison/logical operators, embedded document queries, array updates (`$push`, `$addToSet`, `$[elem]`).
- **Aggregation Pipeline**: Multi-stage aggregation workflows (`$match`, `$project`, `$group`, `$unwind`, `$lookup` for joins, `$facet`, `$sort`).
- **Indexing & Performance**: Single field, compound indexes, multikey (array) indexes, text search, TTL indexes, explain plans (`executionStats`).
- **Data Modeling Strategies**: 1:1, 1:N, and N:M modeling trade-offs (embedding vs referencing / bucketing / subset pattern).
- **Distributed Scale**:
  - Multi-document ACID transactions with WiredTiger storage engine.
  - Replica sets, primary elections, write concerns (`w: "majority"`), read preferences.
  - Sharding architectures (mongos router, config servers, shard keys, chunk balancing).

### 🐳 [10 — Docker & Container Virtualization](10-docker/)
- **Core Mental Model**: Linux namespaces (`pid`, `net`, `mnt`), cgroups, UnionFS, image layers vs running containers.
- **CLI Lifecycle**: Managing images (`build`, `pull`, `tag`) and containers (`run`, `exec`, `logs`, `inspect`, `stop`, `rm`, `prune`).
- **Networking & Storage**: Host port forwarding, bridge networks, service discovery by DNS name, named volumes vs host bind-mounts.
- **Production Dockerfiles**: Multi-stage builds, Alpine/Distroless slim runtimes, non-root users, build cache optimization, `.dockerignore`.
- **Docker Compose**: Orchestrating multi-container environments (Node.js API, PostgreSQL, MongoDB, Redis) with healthchecks and dependencies.

### ☁️ [11 — Server Application Deployment & Frontend DevOps](11-server-application-deployment/)
- **Cloud Infrastructure**: AWS EC2 instance provisioning, security groups, VPC routing, Elastic IPs.
- **Process Supervision**: PM2 cluster mode, zero-downtime reloads, log rotation, memory limits.
- **Reverse Proxies & SSL**:
  - Caddy Server (automatic Let's Encrypt SSL/TLS reverse proxy).
  - Traefik reverse proxy for multi-container routing on a single machine.
- **CI/CD Pipelines**: Automated GitHub Actions workflows for linting, testing, Docker image building, and automated deployment via SSH.
- **Observability**: OpenTelemetry (OTel) instrumentation, metrics, traces, and SigNoz monitoring dashboards.
- **Frontend Deployments**:
  - **React (Vite / SPA)**: Static bundle optimization, Nginx multi-stage containerization, AWS S3 + CloudFront CDN hosting.
  - **Next.js (SSR / Hybrid)**: Node.js server runtime deployments (`next start`), standalone output mode, Dockerizing Next.js for production.

### 🧩 [12 — Zod Schema Validation & Data Integrity](12-zod/)
- **Foundations**: Schema declaration, `parse` vs `safeParse`, type inference with `z.infer<typeof schema>`.
- **Complex Schemas**: Objects, tuples, arrays, discriminated unions, enums, optional/nullable fields.
- **Transforms & Refinements**: Data pipelines, string coercion, custom refinements with `.refine()` and `.superRefine()`.
- **Custom Error Handling**: Formatting error trees, custom issue maps for user-friendly API responses.
- **Express Integration**: Type-safe request validation middleware for `req.body`, `req.query`, and `req.params`.

### 🧠 [13 — Generative AI, RAG & Agentic Systems](13-genai/)
- **LLM Fundamentals**: Tokenization (BPE), text embeddings, transformer architecture (Self-Attention, Encoder-Decoder, Decoder-only), context windows, temperature, top-p.
- **Prompt Engineering**: Structured outputs (JSON schemas, Function Calling), few-shot learning, chain-of-thought (CoT), system prompts.
- **Autonomous Agents**: ReAct pattern (Reasoning + Acting loops), agent harnesses, tool execution, planning engines, human-in-the-loop patterns.
- **Multi-Model Ensembles**: Multi-provider fallback systems, LLM-as-a-Judge evaluation pipelines.
- **AI Security & Guardrails**: Prompt injection defenses, jailbreak mitigation, output validation, defensive wrappers, RBAC for LLM tools.
- **Vector Databases & Semantic Search**: High-dimensional vector indexing (HNSW, IVFFlat), similarity metrics (Cosine, Euclidean, Dot Product), pgvector, Pinecone, Qdrant.
- **RAG Architectures**:
  - **Naive RAG**: Document loading, chunking strategies, embedding generation, vector search retrieval, context injection.
  - **Advanced RAG**: Query rewriting, HyDE (Hypothetical Document Embeddings), Reciprocal Rank Fusion (RRF), cross-encoder reranking, hierarchical chunking.
  - **Vectorless RAG**: Knowledge graphs, SQL/BM25 keyword search, hybrid dense-sparse retrieval.
  - **Agent Memory**: Ephemeral context, short-term buffer memory, long-term semantic memory, entity memory.
- **Realtime Voice Agents**: Cascaded STT-TTS pipelines, sentence-boundary streaming buffers, in-memory audio queues, hardware RMS/VAD barge-in interruption management, conversational psychology, and native multimodal speech-to-speech with OpenAI Realtime WebRTC.

---

## 🛠️ Featured Real-World Projects & Setups

### 1. 🧠 [Grounded Brain NotebookLLM](projects/genai/grounded-brain-notebook-llm/)
- A multi-agent grounded research assistant inspired by NotebookLM.
- Implements hybrid document parsing, vector indexing with embeddings, citation grounding, multi-source synthesis, and interactive visual architecture diagrams.

### 2. 🤖 [Agent SDK From Scratch](projects/genai/agent-sdk-from-scratch/)
- A zero-dependency autonomous AI agent framework built from first principles in TypeScript.
- Features pluggable LLM backends (Anthropic, OpenAI, Gemini), tool call validation, step execution loops, and stateful memory management.

### 3. 🚦 [1M Checkbox Real-Time Scaling & Redis Rate Limiting](07-backend/setups/06-1M_Checkbox-Redis-RateLimit/)
- High-concurrency state synchronization platform handling millions of simultaneous toggle events.
- Employs Redis bitmaps, sliding-window rate limiters, and WebSocket broadcast clusters.

### 4. 🚚 [Kafka Driver Location Real-Time Streaming](07-backend/setups/07-kafka-driver-location-setup/)
- Distributed geospatial tracking pipeline with high-throughput event producers, partitioned Kafka topic streams, and consumer group processing.

### 5. 🛡️ [Production Express + TypeScript Auth Architecture](07-backend/setups/02-express-auth-setup-prod/)
- Hardened enterprise API boilerplate featuring dual-token authentication (short-lived JWT + rotating refresh tokens), CSRF defense, rate-limiting, Docker Compose, and clean DTO architectures.

### 6. 🔑 [Custom OIDC & OAuth2 Server Implementation](07-backend/setups/04-oidc-setup/)
- Comprehensive identity provider implementation featuring RSA key generation, public JWKS endpoint, and OAuth2 authorization flows.

---

## 🧭 Repository Directory Structure

```text
├── 01-networking/                    # DNS, TCP/UDP, CDN, Caching, OSI & Performance
├── 02-github/                        # Git internals, branching models, rebasing, workflows
├── 03-html/                          # Semantic HTML5, accessibility, SEO best practices
├── 04-css/                           # Flexbox, Grid, custom properties, responsive layouts
├── 05-javascript/                    # V8 engine, event loop, closures, prototypes, async JS
├── 06-typescript/                    # Type systems, unions, interfaces, generics, utility types
├── 07-backend/                       # Node.js, Express, Auth, WebSockets, Kafka, Redis, Security
│   ├── setups/                       # Runnable production backend architectures & setups
│   └── practice-learn/               # Incremental projects (Drizzle, sessions, URLs, JWT)
├── 08-sql/                           # PostgreSQL, query optimization, ACID, indexing, ORMs
│   └── 19-ORM/                       # Prisma & Drizzle ORM architectural guides
├── 09-mongodb/                       # NoSQL, BSON, aggregation pipelines, replica sets, sharding
├── 10-docker/                        # Container virtualization, Dockerfiles, Compose, networking
├── 11-server-application-deployment/ # AWS EC2, PM2, Caddy, Traefik, OTel, React & Next.js deploy
├── 12-zod/                           # Schema declaration, validation pipelines, error handling
├── 13-genai/                         # LLMs, prompt engineering, RAG, vector DBs, AI agents
│   └── setup/                        # Practical AI setups (prompting, naive RAG, advanced RAG)
└── projects/                         # Production full-stack & AI engineering applications
    └── genai/
        ├── agent-sdk-from-scratch/   # Custom TypeScript AI Agent SDK
        └── grounded-brain-notebook-llm/ # Full-stack grounded multi-source RAG engine
```

---

## 💻 Tech Stack Summary

| Domain | Technologies & Frameworks |
|---|---|
| **Languages** | TypeScript, JavaScript (Node.js 22+ ES Modules), SQL |
| **Frontend** | React (Vite SPA), Next.js (App Router, SSR, Server Actions), HTML5, CSS3 |
| **Backend & APIs** | Node.js, Express.js, WebSockets (Socket.IO), WebRTC, REST, Zod |
| **Databases & ORMs** | PostgreSQL 17, MongoDB 8.0, Redis 7+, Prisma, Drizzle, Mongoose |
| **Distributed Systems** | Apache Kafka, Redis Pub/Sub, Distributed Rate Limiting |
| **DevOps & Cloud** | Docker, Docker Compose, AWS EC2, Caddy, Traefik, PM2, GitHub Actions |
| **Observability** | OpenTelemetry (OTel), SigNoz |
| **AI & LLM Engineering** | OpenAI, Anthropic Claude, Google Gemini, LangChain/LlamaIndex paradigms, Vector DBs (Pinecone, Qdrant, pgvector), Advanced RAG |

---

## 📝 License

This project is licensed under the MIT License — feel free to use it for learning, teaching, and building production applications.
