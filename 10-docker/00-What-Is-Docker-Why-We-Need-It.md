# What Is Docker & Why We Need It
## Part 0 of 8 — The Mental Model Before Running a Single Container

> Next: [01-Images-And-Containers.md](01-Images-And-Containers.md)

---

## 📌 Executive Summary

- **Docker runs software in isolated, disposable boxes called containers.** A container bundles a program *and everything it needs to run* (its OS libraries, its exact version, its config) so it behaves identically on your laptop, your teammate's laptop, and the production server.
- As a backend developer you mostly use Docker for **one thing at first**: getting a real database (Postgres, MongoDB, Redis) running in seconds without installing it on your operating system. One command up, one command gone, no trace left behind.
- **The problem it kills:** "works on my machine." No more "which Postgres version do you have?", no more three-page install guides for new team members, no more a broken local database you can't fix. You `docker compose down -v` and start fresh.
- **A container is not a virtual machine.** A VM boots a whole guest operating system (gigabytes, slow). A container shares your machine's kernel and only packages the application layer (megabytes, starts instantly).
- **Four nouns** cover 90% of daily Docker: an **image** (the blueprint), a **container** (a running copy of a blueprint), a **volume** (a disk that outlives the container, so your data survives), and a **network** (how containers talk to each other).
- You will meet Docker through **`docker` CLI commands** and a **`docker-compose.yml`** file that describes your whole local stack declaratively. Both are covered in this series, built around the real compose files in `07-backend/setups/02` and `07-backend/setups/03`.

---

## 🧠 Core Analogy: Shipping Containers

Before standardized shipping containers, loading a cargo ship meant hand-stacking barrels, sacks, and crates of every shape — slow, and what worked on one dock didn't fit the next. The steel shipping container fixed it: **one standard box**. The ship, the crane, the truck, and the train don't care what's *inside* the box — they just know how to pick it up and move it. A box packed in Shanghai arrives in Rotterdam and works exactly the same.

Docker is that box for software:

- **The container** = the sealed steel box. Inside is your app plus its exact dependencies. The outside is standard, so any machine with Docker can run it.
- **The image** = the *packing list plus contents*, frozen. You stamp out identical boxes from it.
- **"Works on my machine"** = hand-stacking barrels. It fit *your* dock. Nobody else's.
- **Docker Engine** = the crane and the standardized ship. It knows how to move any box, regardless of contents.

---

## 🩹 1. The Problems Docker Solves

### Problem 1 — "Install Postgres 17 on your OS"

To practice with a database the old way, every developer runs a system installer, picks a version, sets a superuser password, learns how to start/stop the service on *their* OS (systemd? brew services? a Windows service?), and hopes it doesn't clash with a different version they installed last year for another project.

With Docker: `docker compose up -d`. Postgres 17, isolated, gone when you want it gone.

### Problem 2 — Version drift across the team

You have Postgres 14. A teammate has 16. Production runs 17. A query that works for you throws a syntax error for them. Nobody can reproduce the other's bugs.

With Docker: the version is a single line in a file everyone shares — `image: postgres:17`. Everyone runs *the same thing*.

### Problem 3 — Onboarding a new developer

"Clone the repo, then: install Node, install Postgres, create a database, create a user, run these five SQL grants, install Redis, start both services…" — a day lost, and a wiki page that's always slightly out of date.

With Docker: clone the repo, `docker compose up -d`, done. The compose file *is* the setup instructions, and it can't drift because it's the thing that actually runs.

### Problem 4 — A polluted machine

Every system install leaves files, services, ports, and background daemons behind. After a year your laptop is running three database versions you forgot about.

With Docker: containers and their data are namespaced under Docker. `docker system prune -a` and `docker volume prune` give you the space back cleanly.

---

## 🆚 2. Containers vs Virtual Machines

Both isolate software. The difference is *how much they isolate*.

| | Virtual Machine | Container |
|---|---|---|
| **What it boots** | A full guest OS (its own kernel) | Nothing — shares the host's kernel |
| **Size** | Gigabytes | Megabytes |
| **Start time** | Tens of seconds to minutes | Milliseconds to a second |
| **Isolation** | Very strong (hardware-level) | Strong (process/namespace-level) |
| **How many on a laptop** | A handful | Dozens comfortably |
| **Good for** | Running a different OS, strict security boundaries | Packaging and shipping applications |

A container is essentially **a fenced-off process** on your existing OS, with its own filesystem, its own network view, and its own process list — but no separate kernel. That's why it's so light.

> On Windows and macOS, Docker actually runs a tiny Linux VM under the hood (because containers need a Linux kernel), and your containers run inside that. You don't manage it — Docker Desktop does. On Linux, containers run directly.

---

## 💻 3. Install Docker

| OS | Install |
|---|---|
| **Windows** | Docker Desktop (needs WSL 2, which its installer sets up) |
| **macOS** | Docker Desktop (Apple Silicon or Intel build) |
| **Linux** | Docker Engine (the CLI + daemon) — Docker Desktop for Linux is optional |

Verify it works:

```bash
docker --version           # e.g. Docker version 27.x
docker compose version     # Compose v2 is built into the docker CLI
docker run hello-world     # pulls a tiny image and prints a success message
```

If `hello-world` prints a paragraph starting with "Hello from Docker!", your install is good.

> **`docker-compose` (with a hyphen) is the old v1 tool.** Modern Docker uses **`docker compose`** (a space) as a built-in subcommand. This series uses the space form. If a tutorial shows `docker-compose up`, mentally translate it.

---

## 🖥️ 4. Docker Desktop, Briefly

Docker Desktop (Windows/macOS) gives you a GUI over the same engine the CLI uses. Worth knowing where things are:

- **Containers** tab — every container, running or stopped. Start/stop/delete buttons, a one-click **logs** view, and a one-click **terminal into the container** (`exec`). Great for a quick look; the CLI is faster once you know it.
- **Images** tab — images you've pulled or built, and their sizes. Delete unused ones here to reclaim disk.
- **Volumes** tab — the named volumes holding your database data. You can browse and delete them here.
- **Settings → Resources** — how much CPU/RAM/disk the Linux VM may use. Bump memory if containers get killed under load.

Everything the GUI does, a CLI command also does. This series teaches the CLI because it's scriptable, copy-pasteable into notes and READMEs, and identical across all three operating systems.

---

## 🧩 5. The Four Nouns You'll Keep Meeting

| Noun | One-liner | Covered in |
|---|---|---|
| **Image** | A read-only, frozen blueprint. `postgres:17` is an image. You don't run an image directly — you stamp containers out of it. | [01](01-Images-And-Containers.md) |
| **Container** | A running (or stopped) instance of an image. One image → many containers. Its internal filesystem is thrown away when the container is removed. | [01](01-Images-And-Containers.md) |
| **Volume** | A storage area managed by Docker that lives *outside* any container, so data (your database files) survives `down` / `up` / recreate. | [03](03-Volumes-Data-Persistence.md) |
| **Network** | A private virtual network Docker creates so containers can reach each other by name (`postgresdb:5432`) without exposing ports to your machine. | [06](06-Networking-Between-Containers.md) |

Two more you'll meet slightly later:

| Noun | One-liner | Covered in |
|---|---|---|
| **Dockerfile** | A recipe for building *your own* image (e.g. packaging your Express API). | [04](04-Writing-A-Dockerfile.md) |
| **`docker-compose.yml`** | A single file describing several containers + their volumes + their network, started together with one command. | [05](05-Docker-Compose-Explained.md) |

---

## 🗺️ 6. What This Series Covers

| File | Topic |
|---|---|
| [00 (this file)](00-What-Is-Docker-Why-We-Need-It.md) | What Docker is, why, containers vs VMs, install |
| [01](01-Images-And-Containers.md) | Images vs containers, tags, layers, registries, container lifecycle |
| [02](02-Ports-Environment-Variables.md) | Port mapping (`host:container`), env vars (compose vs your app's `.env`) |
| [03](03-Volumes-Data-Persistence.md) | Named volumes vs bind mounts, why DB data persists, resetting a DB |
| [04](04-Writing-A-Dockerfile.md) | Writing a Dockerfile for your Node/Express app, layer caching, multi-stage builds |
| [05](05-Docker-Compose-Explained.md) | `docker-compose.yml` line by line (your real `02` & `03` files), `up` vs `up -d` |
| [06](06-Networking-Between-Containers.md) | Service-name hostnames, `localhost` inside a container, published vs internal ports |
| [07](07-Troubleshooting-And-Command-Cheat-Sheet.md) | Symptom → cause → fix, and the full command cheat sheet |

---

## ✅ Takeaways

- Docker packages an app **with its dependencies** into a standard box (container) so it runs the same everywhere.
- Your first and most common use as a backend dev: **disposable local databases** via `docker compose`.
- A container is a **fenced-off process sharing your kernel** — not a VM. That's why it's fast and small.
- Learn four nouns: **image, container, volume, network**. The rest builds on them.
- Use **`docker compose`** (space), not the legacy `docker-compose` (hyphen).
