# Level 3 — Dockerfile, Images, and Detached Containers
## Part 3 of 5 — Reproducible Environments for Multiple Services

> Previous: [02-Level-2-PM2-Process-Manager.md](02-Level-2-PM2-Process-Manager.md)
> Next: [04-Level-4-Reverse-Proxy-Caddy-SSL.md](04-Level-4-Reverse-Proxy-Caddy-SSL.md)

---

## 📌 Executive Summary

- Once your app depends on **multiple services** — Kafka, Redis, MongoDB, PostgreSQL, etc. — installing each one by hand on the EC2 instance (and keeping that identical to your laptop) becomes unmanageable.
- **Docker** packages your app (and, via Compose, its dependent services) into portable, reproducible units. The environment your app runs in is *defined in a file*, not manually assembled by memory.
- A **Dockerfile** is the recipe that builds an **image**. An image is run as a **container**. `docker run -d` (or `docker compose up -d`) runs it in **detached mode** — in the background, independent of your terminal, much like PM2 was, but for the *entire environment*, not just the Node process.
- **Important consequence: once Docker runs your app in detached mode, you no longer need PM2.** Docker's own restart policies (`restart: always` / `restart: unless-stopped`) replace PM2's job of "keep this alive and restart on crash."

For the full Dockerfile deep dive (multi-stage builds, `.dockerignore`, layer caching), see [10-docker/04-Writing-A-Dockerfile.md](../10-docker/04-Writing-A-Dockerfile.md) — this file focuses on how it fits into the *deployment levels* specifically.

---

## 🧠 Core Analogy

Level 2 (PM2) was a reliable wall switch for one lamp. Level 3 is: instead of wiring one lamp, you ship the **entire pre-furnished room** — lamp, wiring, extension cords, and all — as a single sealed crate (the **image**). Unpack that exact same crate on your laptop or on the server, and you get an identical room every time. No more "I forgot to install Redis on the server."

---

## 🏗️ 1. Why Docker at This Level

The trigger for reaching Level 3 is specifically: **"I have multiple services running — Kafka, Redis, Traefik/Caddy, MongoDB, PostgreSQL."** Installing all of that by hand, identically, on every machine (your laptop, staging, prod) is the overhead Docker removes.

- Write a **Dockerfile** once → build an **image** → that image runs identically anywhere Docker is installed.
- Your teammates and your CI pipeline use the *same* image — no drift between "works on my machine" and "works in prod."

---

## 📄 2. Minimal Dockerfile for the App

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build   # skip if plain JS

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Build and run it standalone:

```bash
docker build -t my-api .
docker run -d --name my-api -p 3000:3000 --env-file .env my-api
```

`-d` = **detached mode** — the container runs in the background immediately; closing your SSH session does not stop it. This is the Docker-native replacement for what PM2 did in Level 2.

---

## 🧩 3. Multiple Services via Docker Compose

When you have several services, `docker compose` describes and starts all of them together:

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
    depends_on:
      - redis
      - mongo

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  mongo:
    image: mongo:8.0
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

Bring the whole stack up:

```bash
docker compose up -d --build
```

- `up` — create and start every service defined in the file.
- `-d` — **detached mode** for the whole stack, not just one container.
- `--build` — rebuild the app's image first if the Dockerfile or context changed.
- `restart: unless-stopped` — Docker's own crash-recovery and reboot-survival policy. **This is why PM2 is no longer needed** — Docker is now the thing keeping your process alive, restarting it on crash, and (with `unless-stopped`) bringing it back after the host reboots and Docker's daemon starts.

Check it and tail logs:

```bash
docker compose ps
docker compose logs -f api
```

---

## 📦 4. Publishing the Image (Optional but Common)

Once the image is built, you can push it to a registry (Docker Hub, ECR, GHCR) so the server pulls a prebuilt image instead of rebuilding from source every deploy:

```bash
docker build -t <your-dockerhub-username>/my-api:latest .
docker push <your-dockerhub-username>/my-api:latest
```

On the server, `docker compose.yml` then references `image: <your-dockerhub-username>/my-api:latest` instead of `build: .`, and a deploy becomes `docker compose pull && docker compose up -d`.

---

## 🌐 5. The Port Problem This Level Doesn't Solve Yet

Right now, `http://<EC2_PUBLIC_IP>:3000` still works, but that's not how real websites are accessed:

- **HTTP defaults to port 80.** If your app isn't listening on 80, visitors must type `:3000`, `:8080`, etc. — bad UX and doesn't map to a clean domain.
- If you map your app straight onto port 80/443 with a domain, you get a normal-looking URL (`https://abc.com`) — but you still have no SSL, and if you have several containers, nothing is distributing traffic between them.

That's what a **reverse proxy** (Caddy) fixes next — including free automatic SSL.

---

## ✅ Takeaways

- Reach for Docker when you have **multiple services** to run reproducibly, not just one Node process.
- **Dockerfile → image → container.** `docker run -d` or `docker compose up -d` runs everything in **detached mode**.
- **Docker's `restart:` policy replaces PM2** — once your app runs as a Docker container with `restart: unless-stopped`, you no longer need PM2 for keep-alive/crash-restart duties.
- Compose lets you define and start an entire multi-service stack (app + Redis + Mongo + Kafka + …) with one `docker compose up -d`.
- Still missing: a clean domain on port 80/443 and SSL — next file.

Next: [04-Level-4-Reverse-Proxy-Caddy-SSL.md](04-Level-4-Reverse-Proxy-Caddy-SSL.md)
