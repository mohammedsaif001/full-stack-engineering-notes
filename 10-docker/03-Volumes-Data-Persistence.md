# Volumes & Data Persistence
## Part 3 of 8 — Why Your Database Survives a Restart (and How to Wipe It on Purpose)

> Previous: [02-Ports-Environment-Variables.md](02-Ports-Environment-Variables.md)
> Next: [04-Writing-A-Dockerfile.md](04-Writing-A-Dockerfile.md)

---

## 📌 Executive Summary

- **A container's own filesystem is disposable.** It's a thin writable layer on top of the image's read-only layers. `docker rm` deletes that layer — everything written into it is gone.
- **A volume is storage that lives outside any container.** You mount it at a path inside the container; the container writes there as normal, but the bytes are kept by Docker on the host. Remove and recreate the container — the volume (and your data) is still there.
- **Two kinds of mount:**
  - **Named volume** (`pgdata:/var/lib/postgresql/data`) — Docker manages *where* it lives on disk. This is what you use for **database data**.
  - **Bind mount** (`./src:/app/src`) — you point a specific folder on your machine into the container. This is what you use for **live-reloading your source code** in dev.
- **Postgres writes its data to `/var/lib/postgresql/data`; Mongo writes to `/data/db`.** Mount a named volume at that exact path and the database persists across `down` / `up` / image upgrades.
- **`docker compose down` keeps volumes. `docker compose down -v` deletes them.** The `-v` is how you deliberately reset a corrupted database or force the `POSTGRES_*` init variables to run again.
- **Env-var credentials are baked into the volume on first init.** If your data lives in a volume with old credentials, editing `environment:` won't change them — you must `down -v` first.

---

## 🧠 Core Analogy: Whiteboard vs Filing Cabinet

- **The container's writable layer** = a whiteboard in the room. Great for scratch work. When the room is demolished (`docker rm`), the whiteboard goes with it.
- **A volume** = a steel filing cabinet bolted to the floor of the building, not the room. The room can be knocked down and rebuilt around it; the cabinet and its contents stay.
- **Mounting a volume** = putting the cabinet where the whiteboard was, so anything the database "writes on the wall" actually goes into the cabinet.
- **`down -v`** = hauling the cabinet to the dumpster. Deliberate. Irreversible.

---

## 🗑️ 1. Why "no volume" loses your data

```bash
docker run -d --name pg-novol -e POSTGRES_PASSWORD=x postgres:17
docker exec -it pg-novol psql -U postgres -c "CREATE TABLE t (id int);"
docker rm -f pg-novol                      # container + its writable layer deleted

docker run -d --name pg-novol -e POSTGRES_PASSWORD=x postgres:17
docker exec -it pg-novol psql -U postgres -c "\dt"    # → "Did not find any relations." Table is GONE.
```

Postgres wrote its files to `/var/lib/postgresql/data` — which, with no volume mounted there, was just the container's throwaway writable layer.

> `docker stop` / `docker start` would have **kept** the table — the writable layer survives a stop. It's `docker rm` (and therefore `docker compose down`, which removes containers) that discards it. Since you'll `down`/`up` constantly, you need a volume.

---

## 📁 2. Named Volumes — for database data

```yaml
services:
  postgresdb:
    image: postgres:17
    volumes:
      - pgdata:/var/lib/postgresql/data      # named volume "pgdata" → Postgres data dir
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cohort-db

volumes:
  pgdata:            # ← top-level declaration. Required for a named volume.
```

- `pgdata:/var/lib/postgresql/data` — **left of the colon** is the volume name, **right** is the path inside the container.
- The top-level `volumes: pgdata:` block *declares* the volume so Compose creates and tracks it. Its real name becomes `<projectname>_pgdata` (project name = the folder name, usually).
- Now: `docker compose down` removes the container but keeps `pgdata`. `docker compose up -d` creates a fresh container, re-mounts `pgdata`, and Postgres finds its existing data — same tables, same rows, same users.

Your `07-backend/setups/02` file does the same for Mongo:

```yaml
    volumes:
      - mongodb_data:/data/db      # Mongo's data path is /data/db
volumes:
  mongodb_data:
```

### Where does a named volume actually live?

Docker keeps it under its own storage area (on Linux, `/var/lib/docker/volumes/<name>/_data`; on Docker Desktop, inside the Linux VM). You're not meant to open it directly — you interact with it *through* a container. Inspect the metadata with:

```bash
docker volume ls                         # list volumes
docker volume inspect cohort_pgdata      # JSON: mountpoint, driver, created-at, labels
```

### Managing named volumes

```bash
docker volume ls                    # list all volumes
docker volume inspect <name>        # details
docker volume rm <name>             # delete one (must not be in use by a container)
docker volume prune                 # delete all volumes not currently used by any container
docker compose down -v              # remove this project's containers AND its named volumes
```

---

## 🔗 3. Bind Mounts — for live source code in dev

A bind mount maps a **specific folder on your machine** into the container. Edits on either side are instantly visible to the other.

```yaml
services:
  api:
    build: .
    volumes:
      - ./src:/app/src            # bind mount: your ./src → container's /app/src
      - /app/node_modules        # anonymous volume: keep container's node_modules,
                                 #   don't let the bind mount hide it
    command: npm run dev
```

- `./src:/app/src` — **left is a path** (starts with `.` or `/`), so Docker treats it as a bind mount, not a named volume.
- Now editing a file in `./src` on your machine triggers the container's `--watch` / `nodemon` / `tsc-watch` to reload — you get hot reload without rebuilding the image.
- The bare `/app/node_modules` line is a common trick: mounting `./src` is fine, but if you mounted the *whole* `./` you'd shadow the `node_modules` that was installed *inside* the image during build. The anonymous volume protects that directory.

| | Named volume | Bind mount |
|---|---|---|
| Written as | `name:/path` | `./host/path:/path` or `/abs/host/path:/path` |
| Location on disk | Docker decides | You decide (a real folder you can open) |
| Declared in top-level `volumes:` | Yes | No |
| Typical use | **Database data**, caches | **Source code in dev**, config files |
| Survives `down` | Yes (removed only with `-v`) | The host folder is yours — always there |

---

## ♻️ 4. Resetting a Database on Purpose

You'll need this when:

- the data dir is corrupted after a hard crash,
- you changed `POSTGRES_PASSWORD` / `POSTGRES_DB` in compose and need init to run again,
- you just want a clean slate.

```bash
docker compose down -v        # stop containers, remove them, AND delete named volumes
docker compose up -d          # fresh containers, fresh empty volumes → init runs with current env vars
```

Targeted version (one volume, keep the rest):

```bash
docker compose down
docker volume rm cohort_pgdata
docker compose up -d
```

> **This deletes all data in that database.** For a learning project that's fine and often the fastest fix. For anything real, dump first: `docker exec postgresdb pg_dump -U postgres cohort-db > backup.sql`.

### Why editing `environment:` alone didn't work

The `POSTGRES_*` variables are consumed **only when the data directory is empty** (first init). Once `pgdata` has a database in it, subsequent `up`s skip init entirely — the container just starts Postgres against the existing files, which still hold the *original* superuser and password. `down -v` empties `pgdata`, so the next `up` re-runs init with whatever `environment:` currently says.

---

## 💾 5. Backing Up and Restoring a Volume's Data

Logical dump (preferred for databases — portable, human-readable):

```bash
# Postgres
docker exec -t postgresdb pg_dump -U postgres cohort-db > backup.sql
cat backup.sql | docker exec -i postgresdb psql -U postgres -d cohort-db

# Mongo
docker exec -t mongodb mongodump --archive --db=cohort > dump.archive
docker exec -i mongodb mongorestore --archive < dump.archive
```

Raw volume copy (any volume, not DB-aware):

```bash
docker run --rm -v cohort_pgdata:/data -v "$PWD":/backup alpine \
  tar czf /backup/pgdata.tar.gz -C /data .
```

---

## ✅ Takeaways

- **Container filesystem = disposable.** `docker rm` / `docker compose down` throws away what was written inside it.
- **Named volume** (`pgdata:/var/lib/postgresql/data`, `mongodb_data:/data/db`) = Docker-managed storage for **database data** that survives recreation. Declare it in the top-level `volumes:` block.
- **Bind mount** (`./src:/app/src`) = a real folder from your machine, for **live-reloading source** in dev.
- **`down` keeps volumes; `down -v` deletes them.** `-v` is the deliberate "reset this database" switch, and the only way to force `POSTGRES_*` init vars to apply again.
- Credentials are written into the volume on **first init** — changing `environment:` later needs a `down -v`.
