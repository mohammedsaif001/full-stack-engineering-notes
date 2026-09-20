# 🛠️ 00 — Setup: MongoDB, Compass GUI & Mongo Shell (`mongosh`)

> Next: [01-Why-NoSQL-Document-Model.md](01-Why-NoSQL-Document-Model.md)

---

## 📌 Executive Summary

- MongoDB can be installed locally via **Docker**, **MongoDB Community Server**, or **MongoDB Atlas** (Cloud Managed).
- **`mongosh` (Mongo Shell)** is the official interactive JavaScript terminal interface for running queries and administrative commands.
- **MongoDB Compass** is the official Graphical User Interface (GUI) for visualizing schemas, running aggregations, and inspecting indexes visually.
- Connection strings follow the standard format: `mongodb://localhost:27017` or `mongodb+srv://<user>:<password>@cluster.mongodb.net/dbname`.

---

## 🧠 Core Analogy: The Workbench & Tools

- **MongoDB Server (Daemon `mongod`):** The engine room / factory floor running in the background.
- **`mongosh` Shell:** The direct command-line terminal (like `psql` for Postgres or `bash`).
- **MongoDB Compass GUI:** The visual dashboard (like PgAdmin or DBeaver) allowing you to click, filter, and inspect documents visually.

---

## 🚀 1. Fast Setup with Docker (Recommended)

Running MongoDB inside a Docker container avoids polluting your host machine's system services:

```bash
# Run MongoDB 8.0 in detached mode with persistent volume storage
docker run -d \
  --name mongo-local \
  -p 27017:27017 \
  -v mongo_data:/data/db \
  mongo:8.0

# Verify it's running
docker ps
```

To connect to the container's shell directly:
```bash
docker exec -it mongo-local mongosh
```

---

## 💻 2. Installing `mongosh` (Mongo Shell)

If running locally on your laptop:

- **macOS (Homebrew):**
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community mongosh
  ```
- **Windows (winget / Powershell):**
  ```powershell
  winget install MongoDB.Mongosh
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get install -y mongodb-mongosh
  ```

### Connecting via Terminal
```bash
# Connect to local default instance
mongosh "mongodb://localhost:27017"

# Switch or create a database
use dev_db
```

---

## 🎨 3. Setting Up MongoDB Compass GUI

1. Download **MongoDB Compass** from the official MongoDB download center.
2. Open Compass and paste your connection string:
   `mongodb://localhost:27017`
3. Click **Connect**. You will see your databases, collections, document counts, and index statistics!

```
┌────────────────────────────────────────────────────────┐
│ MongoDB Compass GUI                                    │
├────────────────────────────────────────────────────────┤
│ Databases:                                             │
│  ├─ admin                                              │
│  ├─ config                                             │
│  └─ ecommerce_db                                       │
│      └─ Collections:                                   │
│          ├─ users       (12,450 docs)                  │
│          ├─ products    (3,200 docs)                   │
│          └─ orders      (45,100 docs)                  │
└────────────────────────────────────────────────────────┘
```

---

## ✅ Takeaways

1. Use Docker `docker run -d -p 27017:27017 mongo:8.0` for a clean local setup.
2. `mongosh` is your primary CLI terminal client.
3. MongoDB Compass provides visual debugging, aggregation builders, and performance metrics.

---

Next: [01-Why-NoSQL-Document-Model.md](01-Why-NoSQL-Document-Model.md) — Relational Tables vs. BSON Document Model.
