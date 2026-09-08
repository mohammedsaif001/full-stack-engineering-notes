# docker-compose.yml Explained
## Part 5 of 8 — Your Whole Local Stack in One File, Started with One Command

> Previous: [04-Writing-A-Dockerfile.md](04-Writing-A-Dockerfile.md)
> Next: [06-Networking-Between-Containers.md](06-Networking-Between-Containers.md)

---

## 📌 Executive Summary

- **`docker-compose.yml` is a single YAML file that describes one or more containers, their volumes, and their network** — declaratively. Instead of remembering a 6-flag `docker run` line per service, you write it once and run `docker compose up`.
- It lives in your **project root**. Compose names everything after the folder (`cohort_postgresdb`, `cohort_pgdata`, `cohort_default` network) so multiple projects don't collide.
- **`services:`** is the heart — each key is one container. Under it you set `image` (or `build`), `ports`, `environment`, `volumes`, `depends_on`, etc. — the same concepts from files [01](01-Images-And-Containers.md)–[04](04-Writing-A-Dockerfile.md), just as YAML keys.
- **Top-level `volumes:`** declares named volumes so they persist and are shared/tracked.
- **`docker compose up`** = build (if needed), create, and start everything, and **stream all logs to your terminal**; `Ctrl+C` stops the stack. **`docker compose up -d`** = same, but **detached** (background) — you get your prompt back. `-d` is normal daily use; plain `up` is for watching a stack boot or debug.
- **`docker compose down`** stops and removes the containers and the network (keeps volumes); **`down -v`** also deletes the named volumes (wipes your DB).
- This file walks your **real** `07-backend/setups/03-prisma-express-ts` and `02-express-auth-setup-prod` compose files line by line.

---

## 🧠 Core Analogy: A Stage Play's Script

`docker run` commands are like directing actors one at a time by shouting individual instructions from the wings — repeatable only if you remember every word.

`docker-compose.yml` is the **script**: every character (service), their props (volumes), the set they share (network), and their cues (`depends_on`). Hand the script to the stage manager (`docker compose up`) and the whole scene assembles itself. `down` clears the stage.

---

## 🧱 1. Anatomy of the File

```yaml
# (version: "3.9")        ← legacy; Compose v2 ignores it. Fine to omit.

services:                 # ── each key below = one container ──────────────
  postgresdb:             # service name  (also its hostname on the network)
    image: postgres:17    # which image to run  (OR: build: . to build a Dockerfile)
    container_name: pg    # (optional) fixed container name instead of cohort_postgresdb_1
    restart: unless-stopped   # (optional) restart policy
    ports:
      - "5432:5432"       # HOST:CONTAINER  (file 02)
    environment:          # env vars for THIS container  (file 02)
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cohort-db
    volumes:
      - pgdata:/var/lib/postgresql/data   # named volume → data dir  (file 03)
    healthcheck:          # (optional) how Compose knows it's ready
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:                  # ── top-level: declare named volumes ────────────
  pgdata:

networks:                 # ── top-level: (optional) custom networks ───────
  default:
    name: cohort-net
```

### Key-by-key

| Key | Meaning |
|---|---|
| `services:` | Map of containers. Each child key is a service name **and** a DNS hostname other services use ([06](06-Networking-Between-Containers.md)). |
| `image:` | Run this prebuilt image. Mutually exclusive with `build:`. |
| `build:` | Build an image from a Dockerfile. `build: .` (context = current dir) or `build: { context: ., dockerfile: Dockerfile.dev }`. |
| `container_name:` | Force an exact container name. Without it, Compose names it `<project>-<service>-<n>`. Setting it prevents running two copies. |
| `restart:` | `no` (default) / `on-failure` / `unless-stopped` / `always`. What Docker does if the container exits or the daemon restarts. |
| `ports:` | Publish ports to the host. `"HOST:CONTAINER"`. Quote them — YAML can misread `5432:5432` as a base-60 number. |
| `expose:` | Ports visible to other containers only, not the host. |
| `environment:` | Inline env vars. Map (`KEY: value`) or list (`- KEY=value`) form. |
| `env_file:` | Load env vars from a file (e.g. `- .env`). |
| `volumes:` (under a service) | Mounts: `name:/path` (named volume) or `./host:/path` (bind mount). |
| `depends_on:` | Start order. Alone it only waits for the container to *start*, not to be *ready* — pair with `healthcheck` + `condition: service_healthy`. |
| `command:` / `entrypoint:` | Override the image's default command. |
| `networks:` (under a service) | Which networks this service joins. Omit → the auto-created `default`. |
| top-level `volumes:` | Declares named volumes. A named volume used by a service **must** appear here. |
| top-level `networks:` | Declares/renames networks. Optional — Compose makes a `default` regardless. |

### `version:` — why your two files differ

Your `02` file starts with `version: "3.9"`; your `03` file has no version line. Both are correct. The `version` key was a **Compose v1** concept (it selected a schema). **Compose v2** (the `docker compose` subcommand you use today) ignores it and will even warn that it's obsolete. New files omit it.

---

## 🔎 2. Your Real File — `07-backend/setups/03-prisma-express-ts/docker-compose.yml`

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

| Line | Reading it |
|---|---|
| `services:` | One service follows. |
| `postgresdb:` | The service name. Becomes the container name (`03-prisma-express-ts-postgresdb-1`) and the hostname other containers would use. |
| `image: postgres:17` | Pull and run the official Postgres 17 image ([01](01-Images-And-Containers.md)). No `build:` — nothing custom to compile. |
| `ports: - "5432:5432"` | Publish container 5432 → host 5432. Your app (running on your machine) connects to `localhost:5432` ([02](02-Ports-Environment-Variables.md)). |
| `environment:` | Consumed by the Postgres image **on first init**: creates superuser `postgres` / password `postgres` and a database `cohort-db` ([02](02-Ports-Environment-Variables.md)). |
| `volumes: - pgdata:/var/lib/postgresql/data` | Mount the named volume `pgdata` at Postgres's data directory so data survives `down`/`up` ([03](03-Volumes-Data-Persistence.md)). |
| `volumes:` (top level) `pgdata:` | Declare that named volume. Without this block the mount above is an error. |

Its `.env` (`DATABASE_URL=postgres://postgres:postgres@localhost:5432/cohort-db`) mirrors those `environment:` values exactly — see the mapping table in [file 02](02-Ports-Environment-Variables.md).

`package.json` scripts wire it up:

```json
"studio":      "drizzle-kit studio",
"db:generate": "drizzle-kit generate",
"db:migrate":  "drizzle-kit migrate"
```

Typical loop: `docker compose up -d` → `npm run db:migrate` → `npm run dev`.

---

## 🔎 3. Your Real File — `07-backend/setups/02-express-auth-setup-prod/docker-compose.yml`

```yaml
version: "3.9"

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

| Line | Reading it |
|---|---|
| `version: "3.9"` | Legacy, ignored by Compose v2. Harmless. |
| `mongodb:` | Service name. |
| `image: mongo:8.0` | Official MongoDB 8.0 image. |
| `container_name: mongodb` | Force the exact name `mongodb` (not `02-…-mongodb-1`). Convenient for `docker exec -it mongodb mongosh`; the trade-off is you can't run two of them. |
| `restart: always` | If it crashes or Docker restarts (e.g. you reboot), bring it back automatically. `unless-stopped` is usually the better choice — it won't restart one you deliberately `docker stop`. |
| `ports: - "27017:27017"` | Publish Mongo's default port to the host. |
| `environment:` | `MONGO_INITDB_ROOT_USERNAME/PASSWORD` create a root user **on first init**. Note Mongo doesn't *enforce* auth without `--auth`, so this user isn't required yet (see the note in [file 02](02-Ports-Environment-Variables.md)). |
| `volumes: - mongodb_data:/data/db` | Mongo stores data in `/data/db`; the named volume persists it. |
| top-level `mongodb_data:` | Declares that volume. |

### What `02` has that `03` doesn't, and vice-versa

| Feature | `02` (Mongo) | `03` (Postgres) | Comment |
|---|---|---|---|
| `version:` line | ✅ | ❌ | `03` is the more modern style. |
| `container_name:` | ✅ `mongodb` | ❌ | `03` lets Compose auto-name — more flexible. |
| `restart:` policy | ✅ `always` | ❌ | Add `restart: unless-stopped` to `03` for parity. |
| `healthcheck:` | ❌ | ❌ | Neither has one — see §6. |
| named volume | ✅ | ✅ | Both persist their data. Good. |

Neither file is wrong; `03` is leaner, `02` is slightly more production-flavoured. §6 shows a version that merges the best of both.

---

## ▶️ 4. `up` vs `up -d` (and `down`)

### `docker compose up`

- Reads `docker-compose.yml`, creates the network, creates volumes, **builds images if `build:` is present and they're missing**, creates and starts every service.
- **Attaches your terminal to every container's logs**, interleaved and colour-tagged by service.
- `Ctrl+C` sends stop signals to all of them — the stack shuts down. (Containers are stopped, not removed.)
- Use it when you want to **watch a stack boot**, see a database's startup logs, or debug why something exits immediately.

```
$ docker compose up
[+] Running 2/2
 ✔ Network cohort_default   Created
 ✔ Container cohort-postgresdb-1  Created
postgresdb-1  | PostgreSQL init process complete; ready for start up.
postgresdb-1  | 2026-09-08 10:00:00 UTC [1] LOG:  database system is ready to accept connections
^C
[+] Stopping 1/1
 ✔ Container cohort-postgresdb-1  Stopped
```

### `docker compose up -d`

- Same setup, but **detached**: starts everything in the background and **returns your prompt immediately**.
- The containers keep running after you close the terminal.
- This is the **normal daily command**. View logs on demand:

```bash
docker compose logs            # all logs so far
docker compose logs -f         # follow live
docker compose logs -f postgresdb   # just one service
docker compose ps              # what's running in this project
```

```
$ docker compose up -d
[+] Running 2/2
 ✔ Network cohort_default        Created
 ✔ Container cohort-postgresdb-1  Started
$ _        ← prompt is back
```

### `docker compose down`

| Command | Removes containers | Removes network | Removes named volumes | Removes images |
|---|---|---|---|---|
| `docker compose stop` | ❌ (just stops) | ❌ | ❌ | ❌ |
| `docker compose down` | ✅ | ✅ | ❌ | ❌ |
| `docker compose down -v` | ✅ | ✅ | ✅ **(DB data gone)** | ❌ |
| `docker compose down --rmi local` | ✅ | ✅ | ❌ | ✅ (images built here) |

Everyday rhythm:

```bash
docker compose up -d          # start work
docker compose logs -f        # watch when needed
docker compose stop           # pause for the day (data + containers kept)
docker compose up -d          # resume next day
docker compose down           # tear down containers, keep data
docker compose down -v        # nuke everything including data (fresh start)
```

### Other `up` flags worth knowing

| Flag | Effect |
|---|---|
| `--build` | Force a rebuild of `build:` images before starting. |
| `--force-recreate` | Recreate containers even if config looks unchanged. |
| `--no-deps` | Start only the named service, not its `depends_on`. |
| `docker compose up -d postgresdb` | Start just one service from the file. |
| `--wait` | With `-d`, block until healthchecks pass (or fail). |

---

## 🧰 5. The Compose Command Set

```bash
docker compose up -d                 # create + start (detached)
docker compose up                    # create + start, stream logs, Ctrl+C stops
docker compose down                  # stop + remove containers & network
docker compose down -v               # ...and delete named volumes (wipes data)
docker compose stop [svc]            # stop without removing
docker compose start [svc]           # start previously-stopped
docker compose restart [svc]         # restart
docker compose ps                    # containers in THIS project (add -a for stopped)
docker compose logs -f [svc]         # follow logs
docker compose exec postgresdb psql -U postgres    # run a command in a RUNNING service
docker compose run --rm postgresdb bash            # one-off NEW container for a service
docker compose build [svc]           # build images without starting
docker compose pull                  # pull latest of all image: refs
docker compose config                # print the fully-resolved, validated config
docker compose top                   # processes per service
docker compose -f docker-compose.prod.yml up -d    # use a non-default file
```

> `exec` runs inside the **already-running** container. `run` spins up a **fresh** one-off container for that service (use `--rm` so it's cleaned up). Use `exec` to poke at your live DB; use `run` for a throwaway task.

---

## 🏭 6. A Merged, Slightly-Upgraded Version

Combining your `02` and `03` files with healthchecks, a sane restart policy, and (optionally) your API as a service:

```yaml
services:
  postgresdb:
    image: postgres:17
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cohort-db
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d cohort-db"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build: .                        # uses the Dockerfile from file 04
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      # NOTE: host is "postgresdb" (the service name), NOT localhost — see file 06
      DATABASE_URL: postgres://postgres:postgres@postgresdb:5432/cohort-db
      NODE_ENV: production
    depends_on:
      postgresdb:
        condition: service_healthy  # wait until pg_isready passes, not just "started"

volumes:
  pgdata:
```

Changes and why:

| Addition | Why |
|---|---|
| `restart: unless-stopped` | Survives reboots, but respects a manual `stop`. |
| `healthcheck` on `postgresdb` | Compose can tell when Postgres is *actually accepting connections*, not just running. |
| `depends_on: { condition: service_healthy }` | The `api` waits for a healthy DB, avoiding the classic "app started before DB was ready → crash" race. |
| `api` service with `build: .` | The whole stack — DB + app — comes up with one `docker compose up -d`. |
| `DATABASE_URL` host = `postgresdb` | Inside the Compose network the app reaches the DB by **service name**, not `localhost` ([06](06-Networking-Between-Containers.md)). |

### Dev vs prod: override files

Compose automatically merges `docker-compose.override.yml` on top of `docker-compose.yml` when you run `docker compose up`. Keep shared config in the base file, dev-only tweaks (bind-mount source, `command: npm run dev`, expose a debugger port) in the override, and run production with an explicit `-f docker-compose.yml -f docker-compose.prod.yml`.

```yaml
# docker-compose.override.yml  (picked up automatically in dev)
services:
  api:
    build:
      target: builder          # stop at the builder stage — has tsc-watch
    command: npm run dev
    volumes:
      - ./src:/app/src         # live reload (file 03)
    environment:
      NODE_ENV: development
```

> There's also `docker compose watch` (a newer feature): declare `develop.watch` rules and Compose syncs changed files into the container or rebuilds automatically. The bind-mount + `npm run dev` approach above is simpler and works everywhere.

---

## ✅ Takeaways

- **`docker-compose.yml`** describes services + volumes + network in one declarative file at the project root. Each key under `services:` is a container **and** a network hostname.
- Keys map to concepts you already know: `image`/`build`, `ports` (`HOST:CONTAINER`), `environment`, `volumes` (named vs bind), `depends_on` (+ `healthcheck`).
- **`up`** streams logs and stops on `Ctrl+C`; **`up -d`** runs detached (the daily default) — read logs with `docker compose logs -f`.
- **`down`** removes containers + network (keeps data); **`down -v`** also deletes named volumes (wipes the DB).
- The `version:` line is obsolete in Compose v2 — your `03` file's style (no version) is current.
- When the app runs *inside* Compose, its `DATABASE_URL` host is the **service name** (`postgresdb`), not `localhost` — next file.
