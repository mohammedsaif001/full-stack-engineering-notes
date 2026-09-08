# Networking Between Containers
## Part 6 of 8 — Why `localhost` Betrays You Inside a Container

> Previous: [05-Docker-Compose-Explained.md](05-Docker-Compose-Explained.md)
> Next: [07-Troubleshooting-And-Command-Cheat-Sheet.md](07-Troubleshooting-And-Command-Cheat-Sheet.md)

---

## 📌 Executive Summary

- **Compose automatically creates one private network** for your project and puts every service on it. No config needed.
- **On that network, each service is reachable by its service name as a hostname.** From the `api` container, the database is at `postgresdb:5432` — Compose runs an internal DNS that resolves service names to container IPs.
- **`localhost` inside a container means *that container itself*** — its own loopback. So an app running **in a container** must **not** use `localhost` to reach the database; it uses the **service name**. An app running **on your machine** (outside Docker) *does* use `localhost` (plus a published port).
- **`ports:` publishes to your host** (`localhost:5432` works for you). **`expose:` / no mapping** keeps a port container-only. Containers talk to each other on the **container-side** port regardless of what's published.
- The single most common connection bug: moving your API into Compose but leaving `DATABASE_URL=...@localhost:5432/...`. It must become `...@postgresdb:5432/...`.
- **Separate Compose projects can't see each other** unless you connect them to a shared **external network**.

---

## 🧠 Core Analogy: An Office Building's Internal Phone System

- **The Compose network** = the building's internal phone system. Every department (service) gets an extension registered by **department name** — dial "Accounts" and it rings Accounts.
- **`postgresdb:5432`** = "dial extension *postgresdb*, then ask for room 5432." Works from any other department in the building.
- **`localhost`** = the phone on *your own desk*. If the API "calls localhost", it's calling itself — Accounts never hears it.
- **A published port (`ports:`)** = a external line on the public phone directory, so someone *outside* the building (you, at `localhost:5432`) can call in.
- **Two different buildings** (two Compose projects) have separate phone systems. They can't dial each other's extensions unless you install a shared line (an external network).

---

## 🌐 1. The Network Compose Gives You for Free

Run `docker compose up -d` on the merged file from [file 05](05-Docker-Compose-Explained.md) and Compose:

1. Creates a network named `<project>_default` (project name ≈ the folder name).
2. Attaches `postgresdb` and `api` to it.
3. Registers DNS: the name `postgresdb` resolves to that container's IP, `api` resolves to its IP.

```
┌──────────────── network: cohort_default ────────────────┐
│                                                          │
│   ┌─────────────┐               ┌──────────────────┐     │
│   │   api       │  connects to  │   postgresdb     │     │
│   │  :4000      │ ────────────► │   :5432          │     │
│   │             │  "postgresdb:5432"                │     │
│   └─────┬───────┘               └────────┬─────────┘     │
│         │ ports: 4000:4000               │ ports: 5432:5432
└─────────┼────────────────────────────────┼──────────────┘
          ▼                                ▼
   host: localhost:4000            host: localhost:5432
   (your browser / curl)           (your psql / Drizzle Studio / GUI)
```

Verify it:

```bash
docker network ls                       # cohort_default is in the list
docker network inspect cohort_default   # shows which containers are attached + their IPs
docker compose exec api ping -c1 postgresdb    # resolves and replies
docker compose exec api getent hosts postgresdb
```

---

## 🎯 2. `localhost` — the Rule

| Where your app runs | Host it uses to reach Postgres | Port |
|---|---|---|
| **On your machine** (`npm run dev` in your terminal), DB in Docker | `localhost` (or `127.0.0.1`) | the **host** side of `ports:` (`5432`) |
| **In a container**, in the **same Compose project** as the DB | `postgresdb` (the **service name**) | the **container** side (`5432`) — published or not |
| In a container, DB is a **managed cloud DB** | the cloud host (`db.xxxx.rds.amazonaws.com`) | provider's port |

So your `.env` / `DATABASE_URL` **changes depending on where the app runs**:

```bash
# app runs on your machine, talking to the Docker DB:
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cohort-db

# app runs as a Compose service alongside the DB:
DATABASE_URL=postgres://postgres:postgres@postgresdb:5432/cohort-db
#                                          ^^^^^^^^^^ service name, NOT localhost
```

This is exactly the trap when you "dockerize the app": everything worked while Node ran in your terminal, then you add an `api` service and it can't connect — because `localhost:5432` inside the `api` container is the `api` container's own empty loopback.

### Why "the container side, published or not"

`ports: "5432:5432"` is only about **host ↔ container**. Container-to-container traffic goes straight over the private network to the port the service *actually listens on* (5432). Even if you wrote `ports: "5433:5432"` (host 5433), the `api` container still connects to `postgresdb:5432`. And if you removed `ports:` entirely, `api → postgresdb:5432` still works — you just couldn't reach it from your machine anymore.

---

## 🚪 3. `ports:` vs `expose:`

| Directive | Host can connect? | Other containers can connect? | Use when |
|---|---|---|---|
| `ports: ["5432:5432"]` | ✅ `localhost:5432` | ✅ `postgresdb:5432` | You want to use a GUI / psql / Studio from your machine (normal in dev). |
| `expose: ["5432"]` | ❌ | ✅ `postgresdb:5432` | Prod-ish: the DB should be private, only the app reaches it. |
| nothing | ❌ | ✅ `postgresdb:5432` | Same as `expose` — images already declare their port; `expose:` is mostly documentation. |

In development you almost always keep `ports:` on the database so you can inspect it. In production you typically drop it and let only the `api` service (which *is* exposed) reach the DB.

---

## 🔧 4. Custom Networks (when you need them)

The `default` network is enough for one project. You'd define your own to:

**Segment traffic** — e.g. a `frontend` net (nginx ↔ api) and a `backend` net (api ↔ db), so nginx can't reach the DB at all:

```yaml
services:
  nginx:
    image: nginx:1.27
    networks: [frontend]
  api:
    build: .
    networks: [frontend, backend]
  postgresdb:
    image: postgres:17
    networks: [backend]

networks:
  frontend:
  backend:
```

**Share a network between separate Compose projects** — project A owns the DB, project B needs it:

```yaml
# project A (creates the network)
networks:
  shared-db-net:
    name: shared-db-net

# project B (joins the existing one)
networks:
  shared-db-net:
    external: true
```

Then project B's service on `shared-db-net` can reach project A's `postgresdd` by name.

Commands:

```bash
docker network ls                          # all networks
docker network inspect <name>              # attached containers, subnet, gateway
docker network create my-net               # standalone network
docker network connect my-net <container>  # attach a running container
docker network disconnect my-net <container>
docker network prune                       # remove unused networks
```

---

## 🖥️ 5. Connecting From the Outside — GUI Clients, Prisma/Drizzle Studio

These run **on your machine**, so they use `localhost` + the published host port — the DB *must* have `ports:` mapped.

| Tool | Connection detail |
|---|---|
| **psql** | `psql "postgres://postgres:postgres@localhost:5432/cohort-db"` — or exec inside: `docker compose exec postgresdb psql -U postgres -d cohort-db` |
| **`mongosh`** | `mongosh "mongodb://localhost:27017/cohort"` — or `docker compose exec mongodb mongosh` |
| **Drizzle Studio** | `npm run studio` reads `DATABASE_URL` from `.env` → must point at `localhost:5432` (your `setups/03` has this) |
| **Prisma Studio** | `npx prisma studio` — same, reads `DATABASE_URL` |
| **DBeaver / TablePlus / pgAdmin / Compass** | Host `localhost`, port `5432` / `27017`, the user/password/db from the compose `environment:` |

If you ever run these tools *themselves* in a container (rare), they'd switch to the service name like any other container.

---

## ✅ Takeaways

- Compose makes **one private network** per project; every service is on it and reachable **by service name** as a hostname (`postgresdb:5432`).
- **`localhost` inside a container = that container.** App-in-container → use the **service name**; app-on-your-machine → use `localhost` + the published host port.
- Container-to-container traffic uses the **container-side port** and doesn't need `ports:` at all; `ports:` is purely for host access.
- The classic bug: dockerizing the API but keeping `DATABASE_URL=...@localhost:5432` — change it to `...@postgresdb:5432`.
- GUI clients and Drizzle/Prisma Studio run on your machine → `localhost` + a published port; keep `ports:` on the DB in dev.
