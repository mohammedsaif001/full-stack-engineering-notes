# Images & Containers
## Part 1 of 8 — The Two Words Everything Else Is Built On

> Previous: [00-What-Is-Docker-Why-We-Need-It.md](00-What-Is-Docker-Why-We-Need-It.md)
> Next: [02-Ports-Environment-Variables.md](02-Ports-Environment-Variables.md)

---

## 📌 Executive Summary

- **An image is a read-only, frozen blueprint** — a tarball of a filesystem plus metadata (what command to run, what ports it uses, what env vars it expects). `postgres:17` and `mongo:8.0` are images. You never "run an image" directly; you stamp **containers** out of it.
- **A container is a running (or stopped) instance of an image.** One image → as many containers as you want. Think class vs object: the image is the class, each container is a `new` instance with its own state.
- **Image names look like `repository:tag`** — `postgres:17`, `node:22-alpine`, `mongo:8.0`. The tag is the version. **Always pin a tag.** `postgres:latest` silently jumps major versions and breaks your database.
- **Images are built in layers.** Each build instruction adds one cached layer. That's why the *second* `docker pull` of a related image is fast (shared layers are already on disk) and why Dockerfile order matters (covered in [04](04-Writing-A-Dockerfile.md)).
- **Images live in registries.** The default is **Docker Hub**. `docker pull` downloads; `docker push` uploads. Official images (`postgres`, `node`, `redis`) are maintained by Docker/the project; anything with a `user/` prefix is community-published.
- **A container's own filesystem is disposable.** Anything written inside it is gone when you `docker rm` the container — *unless* that path is backed by a **volume** ([03](03-Volumes-Data-Persistence.md)). This is the single most important thing to understand before running a database.

---

## 🧠 Core Analogy: Class and Object

```
IMAGE  (postgres:17)          →   class Postgres17 { ... }         // frozen, read-only, shared
CONTAINER (your "postgresdb") →   const db = new Postgres17();     // running, has its own state
```

- You can create **many** containers from **one** image, each with different ports, env vars, and data.
- Deleting a container is like letting an object be garbage-collected — the class (image) is untouched and you can `new` another one instantly.
- Updating to `postgres:18` = swapping the class definition. Existing objects (containers) keep running the old code until you recreate them.

---

## 📦 1. Images

### What's actually inside an image

An image is a stack of **layers**, each a read-only diff of a filesystem, plus a small JSON **manifest** describing:

- the default command to run (`CMD` — e.g. `postgres` starts the DB server),
- which ports the software listens on (`EXPOSE`),
- environment variables it defines or expects,
- the working directory, the user, etc.

When you run a container, Docker stacks those read-only layers and adds **one thin writable layer on top** for that container. Writes go into the thin layer. Remove the container → the thin layer (and everything in it) is deleted. The image layers are untouched and reused by the next container.

### Image names: `repository:tag`

```
postgres:17
│        └── tag  — the version / variant. Defaults to "latest" if omitted.
└── repository — the image name. "postgres" is an OFFICIAL image (no user prefix).

mongo:8.0
node:22-alpine        ← "alpine" variant = tiny base OS, smaller image
redis:7.4
myname/my-api:1.2.0   ← a community / personal image on Docker Hub
ghcr.io/org/app:sha-abc123   ← full form: registry/repository:tag
```

**Always pin a real tag.** Here's why:

| Tag you write | What you get today | What you get in 6 months |
|---|---|---|
| `postgres:latest` | Postgres 17 | Maybe Postgres 18 — a major upgrade, possibly incompatible data files |
| `postgres:17` | Postgres 17.x (latest patch) | Still Postgres 17.x — safe patches only |
| `postgres:17.2` | Exactly 17.2 | Exactly 17.2 |

For local dev, `postgres:17` (major pinned, patches float) is the normal choice — it's what your `07-backend/setups/03` compose file uses.

### Registries and Docker Hub

- A **registry** is a server that stores images. The default is **Docker Hub** (`docker.io`).
- `docker pull postgres:17` → downloads that image's layers to your machine.
- `docker push myname/my-api:1.0.0` → uploads (needs `docker login` first).
- Other registries: **GHCR** (`ghcr.io`, GitHub), **ECR** (AWS), **GAR** (Google). You specify them as a prefix: `ghcr.io/org/image:tag`.
- **Official images** (`postgres`, `node`, `mongo`, `redis`, `nginx`) have no user prefix and are curated. Prefer them.

### Inspecting images

```bash
docker images                 # list images on your machine (name, tag, size, age)
docker pull mongo:8.0         # download an image without running it
docker image inspect postgres:17    # full JSON metadata (env, cmd, layers)
docker history postgres:17    # show the layers and what created each
docker rmi mongo:8.0          # remove an image (fails if a container still uses it)
docker image prune            # remove "dangling" images (untagged leftovers)
docker system prune -a        # remove ALL unused images + stopped containers + networks
```

`docker images` typical output:

```
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
postgres     17        a1b2c3d4e5f6   2 weeks ago    438MB
mongo        8.0       f6e5d4c3b2a1   3 weeks ago    812MB
node         22-alpine 9z8y7x6w5v4u   1 month ago    142MB
```

---

## � 2. Containers

### One image, many containers

```bash
# Two independent Postgres containers from the SAME image, on different host ports:
docker run -d --name pg-a -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:17
docker run -d --name pg-b -e POSTGRES_PASSWORD=secret -p 5433:5432 postgres:17
```

`pg-a` and `pg-b` share the read-only `postgres:17` layers but each has its own writable layer, its own data, its own port. Deleting one doesn't touch the other.

### The container lifecycle

```
        docker run (= create + start)
              │
        ┌─────▼─────┐   docker stop    ┌───────────┐
        │  RUNNING  │ ───────────────► │  STOPPED   │
        │           │ ◄─────────────── │ (exited)   │
        └─────┬─────┘   docker start   └─────┬──────┘
              │                              │
              │         docker rm            │
              └──────────────┬───────────────┘
                             ▼
                          REMOVED   ← writable layer deleted; data in it is GONE
                                      (data in a VOLUME survives — see file 03)
```

| State | Meaning |
|---|---|
| **running** | The container's main process is alive. Shows in `docker ps`. |
| **exited / stopped** | The process ended (you stopped it, or it crashed, or it finished). Filesystem still on disk. Shows only in `docker ps -a`. `docker start` brings it back with its data intact. |
| **removed** | `docker rm` deleted the container and its writable layer. Unrecoverable. |

> **Stop ≠ remove.** `docker stop pg-a` then `docker start pg-a` keeps everything. `docker rm pg-a` throws away that container's writable layer. If your database wrote its files into that layer (i.e. you did *not* mount a volume), the data is lost. This is exactly why [file 03](03-Volumes-Data-Persistence.md) exists.

### `docker run` — the flags you'll actually use

```bash
docker run \
  -d \                              # detached: run in background, return the prompt
  --name postgresdb \               # a friendly name (else Docker invents "goofy_torvalds")
  -e POSTGRES_PASSWORD=postgres \   # set an environment variable inside the container
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=cohort-db \
  -p 5432:5432 \                    # map host port 5432 → container port 5432
  -v pgdata:/var/lib/postgresql/data \   # mount named volume "pgdata" for persistence
  postgres:17                       # the image to run
```

| Flag | Meaning |
|---|---|
| `-d` | Detached — background. Without it, the container's logs take over your terminal and `Ctrl+C` stops it. |
| `--name` | Address the container by a name you choose in later commands. |
| `-e KEY=value` | One environment variable. Repeatable. (Covered in [02](02-Ports-Environment-Variables.md).) |
| `--env-file .env` | Load many env vars from a file instead of many `-e` flags. |
| `-p host:container` | Publish a port. Left = your machine, right = inside the container. (Covered in [02](02-Ports-Environment-Variables.md).) |
| `-v name:/path` | Mount a volume or bind mount at a path. (Covered in [03](03-Volumes-Data-Persistence.md).) |
| `--rm` | Auto-delete the container the moment it stops. Handy for throwaway one-offs. |
| `-it` | Interactive + TTY — for containers you want a shell in (`docker run -it ubuntu bash`). |

> In practice you rarely type this whole command. You put it in a **`docker-compose.yml`** ([05](05-Docker-Compose-Explained.md)) and run `docker compose up -d`. The flags above map one-to-one to compose keys.

### Seeing your containers

```bash
docker ps                 # RUNNING containers only
docker ps -a              # ALL containers, including stopped/exited ones
docker compose ps         # just the containers defined in THIS project's compose file
```

`docker ps` output, annotated:

```
CONTAINER ID   IMAGE        COMMAND                  STATUS         PORTS                    NAMES
3f9a1c2b7d4e   postgres:17  "docker-entrypoint.s…"   Up 4 minutes   0.0.0.0:5432->5432/tcp   postgresdb
│              │            │                        │              │                        └ --name you gave it
│              │            │                        │              └ host:container port mapping
│              │            │                        └ how long it's been up (or "Exited (1) 2m ago")
│              │            └ the process running as PID 1 inside
│              └ image it was created from
└ short container ID (use this OR the name in commands)
```

If a container you expected is missing from `docker ps`, run `docker ps -a` — it probably **exited**. Then check *why*:

```bash
docker logs postgresdb          # its stdout/stderr — the error is almost always here
docker inspect postgresdb --format '{{.State.ExitCode}} {{.State.Error}}'
```

### Everyday container commands

```bash
docker start postgresdb         # start a stopped container (keeps its data)
docker stop postgresdb          # graceful stop (SIGTERM, then SIGKILL after ~10s)
docker restart postgresdb       # stop then start
docker rm postgresdb            # delete a STOPPED container
docker rm -f postgresdb         # force: stop AND delete in one go
docker logs postgresdb          # print all logs
docker logs -f postgresdb       # follow logs live (Ctrl+C to stop watching, container keeps running)
docker exec -it postgresdb bash # open a shell INSIDE the running container
docker exec -it postgresdb psql -U postgres   # run psql inside the DB container directly
docker stats                    # live CPU/RAM per container
docker top postgresdb           # processes running inside the container
```

---

## 🔬 3. Where the "class/object" analogy leaks

- **Containers can be committed back into images** (`docker commit`), but you almost never should — you build images from a **Dockerfile** ([04](04-Writing-A-Dockerfile.md)) so the process is reproducible and reviewable.
- **A stopped container still occupies disk** (its writable layer). Old exited containers pile up. `docker container prune` clears them.
- **Two containers from the same image can diverge** — one has a table you created, the other doesn't. State lives in the container (or its volume), not the image.

---

## ✅ Takeaways

- **Image = frozen blueprint (read-only layers). Container = a running copy with one writable layer on top.**
- Name images `repository:tag` and **pin the tag** (`postgres:17`, never `:latest`).
- Images come from **registries** (Docker Hub by default); `docker pull` / `docker push`.
- **`docker rm` deletes a container's writable layer** — data written there is lost. Persist databases with a **volume** ([03](03-Volumes-Data-Persistence.md)).
- **Stop keeps data; remove discards the writable layer.**
- See containers with **`docker ps`** (running), **`docker ps -a`** (all), **`docker compose ps`** (this project). When one's missing, it exited — read `docker logs`.
