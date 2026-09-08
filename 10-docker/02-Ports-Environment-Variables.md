# Ports & Environment Variables
## Part 2 of 8 — How You Reach a Container, and How You Configure One

> Previous: [01-Images-And-Containers.md](01-Images-And-Containers.md)
> Next: [03-Volumes-Data-Persistence.md](03-Volumes-Data-Persistence.md)

---

## 📌 Executive Summary

- **A container is network-isolated by default.** Nothing on your machine can reach the database inside it until you **publish a port** with `-p HOST:CONTAINER` (CLI) or `ports:` (compose).
- **Port mapping is directional: `HOST:CONTAINER`.** The left number is the port *you* dial on your own machine (`localhost:5432`). The right number is the port the software actually listens on *inside* the container. They're usually the same, but don't have to be — `"5433:5432"` lets you dodge a clash.
- **Environment variables configure a container at startup.** Database images read specific ones on **first boot** to create the superuser, password, and initial database: `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` for Postgres, `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` for Mongo.
- **There are two separate `.env`-ish things and they must agree:**
  1. The **`environment:` block in `docker-compose.yml`** → configures the **database container**.
  2. Your **app's `.env` file** (`DATABASE_URL`, `MONGOD_URI`) → tells **your code** where and how to connect.
  If the username/password/db-name/port in these two don't line up, your app gets `password authentication failed` or `ECONNREFUSED`.
- **Env vars set at container creation are baked in for that container's life.** Changing the compose `environment:` and re-running does *not* change an already-initialized database (its user/password were written to the volume on first boot). To truly re-apply them you must recreate the volume — see [03](03-Volumes-Data-Persistence.md).

---

## 🧠 Core Analogy: An Apartment Building

- **The container** = one apartment. It has its own internal room numbers (ports) — "the router is in room 5432."
- **The building's street-facing intercom panel** = the host. **Port mapping** is wiring one button on the street panel to one apartment's internal room. `"5432:5432"` = "street button 5432 rings apartment room 5432."
- Without that wiring, you can stand on the street pressing buttons forever — the apartment is unreachable. That's a container with no published port.
- **Environment variables** = the move-in instructions you hand the apartment on day one: "the resident's name is `postgres`, the key code is `postgres`, set up a unit called `cohort-db`." The apartment follows them *once*, when it's first set up. Slipping new instructions under the door later does nothing — it's already furnished.

---

## 🔌 1. Port Mapping

### The shape: `HOST:CONTAINER`

```
ports:
  - "5432:5432"
     │    └────── CONTAINER port — what Postgres listens on INSIDE the container. Fixed by the image.
     └─────────── HOST port — what you connect to from your machine: localhost:5432
```

CLI equivalent:

```bash
docker run -p 5432:5432 postgres:17
```

Your app, running **on your machine** (not in a container), connects to `localhost:5432`. Docker forwards that to port 5432 inside the container, where Postgres is listening.

### Why you'd make the two numbers differ

You already have something on host port 5432 — maybe a system-installed Postgres, or another project's container. Starting a second one on 5432 fails with:

```
Error response from daemon: ... Bind for 0.0.0.0:5432 failed: port is already allocated
```

Fix: pick a free **host** port, leave the **container** port alone.

```
ports:
  - "5433:5432"      # dial localhost:5433; still Postgres:5432 inside
```

Then your app's connection string uses `5433`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5433/cohort-db
```

The container doesn't know or care — inside, it's still 5432.

### Common database ports (the container-side number)

| Service | Default port |
|---|---|
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| MySQL / MariaDB | 3306 |
| Redis | 6379 |
| RabbitMQ | 5672 (broker), 15672 (management UI) |

### Published vs unpublished

| In compose | Reachable from your machine? | Reachable from another container in the same compose? |
|---|---|---|
| `ports: ["5432:5432"]` | ✅ `localhost:5432` | ✅ `postgresdb:5432` |
| `expose: ["5432"]` (or nothing) | ❌ | ✅ `postgresdb:5432` |

If your API also runs as a compose service, the database doesn't *need* a published port — containers talk to each other over the private network by service name ([06](06-Networking-Between-Containers.md)). You still publish it so **you** can connect with a GUI client, psql, Prisma Studio, or Drizzle Studio during development.

### Checking what's mapped

```bash
docker ps            # PORTS column: 0.0.0.0:5432->5432/tcp
docker port postgresdb    # 5432/tcp -> 0.0.0.0:5432
```

---

## 🔧 2. Environment Variables

### What they do

An environment variable is a `KEY=value` pair visible to the process inside the container. Images use them for configuration instead of config files because they're easy to set from the outside.

Three ways to set them:

```bash
# CLI, one at a time
docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres postgres:17

# CLI, from a file
docker run --env-file ./db.env postgres:17
```

```yaml
# compose, inline
services:
  postgresdb:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cohort-db
```

```yaml
# compose, from a file
services:
  postgresdb:
    image: postgres:17
    env_file:
      - ./db.env
```

### The env vars the official database images read

**Postgres** (`postgres:17`) — read **only on first initialization** (when the data directory is empty):

| Variable | Effect | Default |
|---|---|---|
| `POSTGRES_PASSWORD` | Password for the superuser. **Required** — the image refuses to start without it (unless you opt into trust auth). | — |
| `POSTGRES_USER` | Name of the superuser to create. | `postgres` |
| `POSTGRES_DB` | Name of a database to create on first boot. | value of `POSTGRES_USER` |
| `PGDATA` | Where inside the container the data files live. | `/var/lib/postgresql/data` |

**MongoDB** (`mongo:8.0`) — also read only on first initialization:

| Variable | Effect |
|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | Creates a root user with this name. |
| `MONGO_INITDB_ROOT_PASSWORD` | That root user's password. |
| `MONGO_INITDB_DATABASE` | Database that first-boot init scripts run against (does **not** restrict later connections). |

> **"First initialization" is the catch.** These variables are consumed once, when the database's data directory is empty. After that the credentials live in the data files (on your volume). Editing `environment:` later and running `docker compose up` again starts the *same* database with its *old* credentials. See [file 03](03-Volumes-Data-Persistence.md) — you `docker compose down -v` to wipe the volume and let init run fresh.

### Reading env vars back

```bash
docker exec postgresdb env                 # all env vars inside the container
docker exec postgresdb printenv POSTGRES_USER
docker inspect postgresdb --format '{{json .Config.Env}}'
```

---

## 🔗 3. The Two `.env` Worlds — and Making Them Line Up

This is where most "why can't my app connect" pain comes from. There are **two independent configurations**:

```
┌─────────────────────────────────────┐        ┌─────────────────────────────────────┐
│  docker-compose.yml                  │        │  your app's .env                     │
│  environment:  ← configures the      │        │  DATABASE_URL / MONGOD_URI            │
│    POSTGRES_USER: postgres           │        │  ← tells YOUR CODE where to connect   │
│    POSTGRES_PASSWORD: postgres       │        │                                      │
│    POSTGRES_DB: cohort-db            │        │  read by dotenv → process.env        │
│  ports: ["5432:5432"]               │        │  used by pg / mongoose / prisma       │
└─────────────────────────────────────┘        └─────────────────────────────────────┘
        sets up the DB container                     dials into it from outside
                    └──────────────── must describe the same DB ────────────────┘
```

### Worked example — your `07-backend/setups/03-prisma-express-ts`

Its `docker-compose.yml`:

```yaml
services:
  postgresdb:
    image: postgres:17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cohort-db
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Its `.env`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cohort-db
```

How every piece of that URL is decided:

| URL piece | Value | Comes from |
|---|---|---|
| scheme | `postgres://` | fixed — it's a Postgres connection |
| username | `postgres` | compose `POSTGRES_USER` |
| password | `postgres` | compose `POSTGRES_PASSWORD` |
| host | `localhost` | **your machine**, because the app runs on your machine (not in a container). Would be `postgresdb` from inside a sibling container — see [06](06-Networking-Between-Containers.md) |
| port | `5432` | the **host** side of `ports: "5432:5432"` |
| database | `cohort-db` | compose `POSTGRES_DB` |

Change any left-column value in compose and you must change the URL to match — or the connection fails.

### Worked example — your `07-backend/setups/02-express-auth-setup-prod`

Its `docker-compose.yml`:

```yaml
services:
  mongodb:
    image: mongo:8.0
    container_name: mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

Its `.env.example`:

```
MONGOD_URI=mongodb://localhost:27017/cohort
```

| URI piece | Value | Comes from |
|---|---|---|
| scheme | `mongodb://` | fixed |
| host | `localhost` | your machine (app runs outside Docker) |
| port | `27017` | host side of `ports: "27017:27017"` |
| database | `cohort` | chosen by your app — Mongo creates it lazily on first write |

> Note this compose file sets a **root username/password** (`admin`/`password`) but the connection URI has **no credentials** and connects to a different db name (`cohort`). Mongo, unlike Postgres, starts *without enforced auth* unless you pass `--auth`; the root vars create a user that isn't required yet. For a learning setup this "works," but the honest production URI would be `mongodb://admin:password@localhost:27017/cohort?authSource=admin` with `--auth` enabled. Keep the two sides consistent as you harden it.

### A checklist when "my app can't connect"

1. Is the container **running**? `docker ps` — not just `docker ps -a`.
2. Is the **port published** and matching your URL? `docker ps` PORTS column vs the port in `DATABASE_URL`.
3. Do **username / password / db name** in the URL exactly match the compose `environment:` values?
4. Did you change `environment:` *after* the volume was created? The DB still has the old creds → `docker compose down -v && docker compose up -d` (destroys data).
5. Is your app using `localhost` while itself running **inside** a container? Then it should use the **service name** ([06](06-Networking-Between-Containers.md)).

---

## ✅ Takeaways

- **Publish a port** or the container is unreachable from your machine. Mapping is **`HOST:CONTAINER`**; change the host side to avoid clashes, leave the container side alone.
- Database images read **`POSTGRES_*` / `MONGO_INITDB_*`** env vars **only on first boot** to create the user, password, and database.
- **Two configs, kept in sync:** compose `environment:` sets up the DB container; your app's `.env` (`DATABASE_URL` / `MONGOD_URI`) dials into it. Same user, same password, same db name, same port.
- Changing `environment:` doesn't retro-fit an existing database — recreate the **volume** ([03](03-Volumes-Data-Persistence.md)) to re-run init.
