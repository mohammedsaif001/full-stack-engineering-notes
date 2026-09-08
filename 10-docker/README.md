# 10 — Docker for Backend Developers

A practical, in-order introduction to Docker for someone who has used it only by copy-pasting a `docker compose up` line. Read the files in sequence — each introduces its terminology right before using it, and later files lean on earlier ones.

Every file follows the same shape as the SQL notes: a **📌 Executive Summary**, a **🧠 Core Analogy**, numbered deep-dive sections with runnable commands, and a **✅ Takeaways** list at the end. All examples are built around the **real compose files** in `07-backend/setups/02-express-auth-setup-prod` (MongoDB) and `07-backend/setups/03-prisma-express-ts` (PostgreSQL).

---

## The path

| # | File | What you'll be able to do after it |
|---|---|---|
| 00 | [What Is Docker & Why We Need It](00-What-Is-Docker-Why-We-Need-It.md) | Explain what a container is, how it differs from a VM, the problems Docker solves, and install it |
| 01 | [Images & Containers](01-Images-And-Containers.md) | Tell images from containers, read `repository:tag`, understand layers and registries, and drive the container lifecycle (`ps`, `run`, `stop`, `rm`, `logs`, `exec`) |
| 02 | [Ports & Environment Variables](02-Ports-Environment-Variables.md) | Map ports with `HOST:CONTAINER`, set env vars, and keep the compose `environment:` block in sync with your app's `.env` / `DATABASE_URL` |
| 03 | [Volumes & Data Persistence](03-Volumes-Data-Persistence.md) | Know why DB data survives a restart, use named volumes vs bind mounts, and reset a database on purpose with `down -v` |
| 04 | [Writing a Dockerfile](04-Writing-A-Dockerfile.md) | Package your own Express/TS app into an image, order instructions for layer caching, add a `.dockerignore`, and write a multi-stage build |
| 05 | [docker-compose.yml Explained](05-Docker-Compose-Explained.md) | Read every key in your real `02` and `03` compose files, and know exactly what `up`, `up -d`, `down`, and `down -v` each do |
| 06 | [Networking Between Containers](06-Networking-Between-Containers.md) | Reach one container from another by service name, know why `localhost` fails inside a container, and connect GUI clients / Drizzle Studio from your machine |
| 07 | [Troubleshooting & Command Cheat Sheet](07-Troubleshooting-And-Command-Cheat-Sheet.md) | Diagnose the six common failures (port in use, instant exit, can't connect, auth fails, env ignored, disk full) and recall every command from one page |

---

## The questions this series answers directly

| Question | Where |
|---|---|
| What is Docker, and why do we need it? | [00](00-What-Is-Docker-Why-We-Need-It.md) |
| What is a container? What are images? | [01](01-Images-And-Containers.md) |
| How do I see running containers? | [01 §2](01-Images-And-Containers.md) and [07 §2](07-Troubleshooting-And-Command-Cheat-Sheet.md) — `docker ps`, `docker ps -a`, `docker compose ps` |
| What is port mapping? | [02 §1](02-Ports-Environment-Variables.md) |
| What are the `environment:` values / env vars? | [02 §2–3](02-Ports-Environment-Variables.md) |
| What is a `docker-compose.yml` file? | [05 §1](05-Docker-Compose-Explained.md), with your real files walked line by line in [05 §2–3](05-Docker-Compose-Explained.md) |
| What is `docker compose up` vs `docker compose up -d`? | [05 §4](05-Docker-Compose-Explained.md) |
| Why does my app get "connection refused" / "password authentication failed"? | [07 §1](07-Troubleshooting-And-Command-Cheat-Sheet.md) |

---

## The worked examples

Both live in `07-backend/setups/`:

- **`02-express-auth-setup-prod/docker-compose.yml`** — `mongo:8.0`, `container_name`, `restart: always`, `MONGO_INITDB_ROOT_*` vars, `mongodb_data:/data/db` volume. Paired `.env` uses `MONGOD_URI`.
- **`03-prisma-express-ts/docker-compose.yml`** — `postgres:17`, `POSTGRES_USER/PASSWORD/DB` vars, `pgdata:/var/lib/postgresql/data` volume. Paired `.env` uses `DATABASE_URL`. Drizzle scripts (`db:generate`, `db:migrate`, `studio`) show the day-to-day loop.

[File 05 §3](05-Docker-Compose-Explained.md) compares what each file includes and omits, and [§6](05-Docker-Compose-Explained.md) shows a merged, upgraded version with healthchecks and the API added as its own service.

---

## If you only have 30 minutes

00 → 01 → 05 → 07. That's the mental model, images vs containers, the compose file line by line, and the troubleshooting page — enough to run and debug any project's local stack with confidence.
