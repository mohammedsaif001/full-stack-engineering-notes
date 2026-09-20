# 🏗️ Level 5 — Traefik Gateway: Multi-Project Single-Machine Architecture
## Step 5 of 5 — High-Level Production Deployment

> Previous: [04-Level-4-Reverse-Proxy-Caddy-SSL.md](04-Level-4-Reverse-Proxy-Caddy-SSL.md)  
> Next: [06-CICD-GitHub-Actions.md](06-CICD-GitHub-Actions.md)

---

## 📌 Executive Summary

- **Level 5 Goal (High Level):** Host **multiple completely independent projects** (e.g., `project-a.yourdomain.com` and `project-b.yourdomain.com`) on **ONE single cloud EC2 machine** without buying new servers for every project!
- **The Core Challenge:** Port `443` (HTTPS) can only be bound by ONE process on a server OS.
- **The Solution:** **Traefik Edge Router** — a cloud-native Docker reverse proxy that owns Port `443` for the entire host machine, manages SSL certificates centrally, and routes incoming domain traffic dynamically to independent project containers.

---

## 🧠 Multi-Project Single-Machine Architecture Diagram

```
                        ┌────────────────────────────────────────────────────────────────────────┐
                        │                  SINGLE EC2 CLOUD MACHINE INSTANCE                     │
                        │                                                                        │
                        │   ┌────────────────────────────────────────────────────────────────┐   │
Public Internet ───────┼──▶│ Traefik Edge Router Container (Owns Port 80 & 443 + SSL Certs) │   │
                        │   └──────────────────────────────┬─────────────────────────────────┘   │
                        │                                  │                                     │
                        │        ┌─────────────────────────┴────────────────────────┐            │
                        │        │                                                  │            │
                        │        ▼ (Host: project-a.domain.com)                     ▼ (Host: project-b.domain.com)
                        │ ┌───────────────────────────────┐          ┌───────────────────────────────┐   │
                        │ │ PROJECT A DOCKER NETWORK      │          │ PROJECT B DOCKER NETWORK      │   │
                        │ │                               │          │                               │   │
                        │ │  ┌─────────┐   ┌───────────┐  │          │  ┌─────────┐   ┌───────────┐  │   │
                        │ │  │ Caddy   │──▶│ Node App  │  │          │  │ Caddy   │──▶│ Python /  │  │   │
                        │ │  │ (Local) │   │ Container │  │          │  │ (Local) │   │ Node App  │  │   │
                        │ │  └─────────┘   └───────────┘  │          │  └─────────┘   └───────────┘  │   │
                        │ └───────────────────────────────┘          └───────────────────────────────┘   │
                        └────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 1. Why Move SSL Termination to Traefik?

In **Level 4 (Caddy)**, SSL certificates were managed inside Project A's own `docker-compose` setup. 

However, if you want to launch **Project B** on the same EC2 machine, Project B's container will fail to start because Project A's Caddy container has already claimed Port 443!

### The Solution:
1. **Traefik** runs as a central gateway container on the main machine and claims Port `80` and Port `443`.
2. All SSL certificates move from individual project containers UP to **Traefik**.
3. When requests arrive for `project-a.yourdomain.com`, Traefik inspects the HTTP Host header and forwards traffic to Project A's container network.
4. When requests arrive for `project-b.yourdomain.com`, Traefik forwards traffic to Project B's container network.
5. **Cost Saving:** You get to host 5, 10, or 20 client projects on a single $10/month EC2 instance without ever buying new server machines!

---

## 🛠️ 2. Setting Up Traefik on the Host Machine

Create a central gateway directory on your server: `~/gateway/docker-compose.yml`

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.1
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "traefik_letsencrypt:/letsencrypt"
    networks:
      - web_gateway

volumes:
  traefik_letsencrypt:

networks:
  web_gateway:
    external: true
```

Create the external gateway network once:
```bash
docker network create web_gateway
```

---

## 📦 3. Deploying Independent Projects Under Traefik

Now, any independent project on the machine simply connects to the `web_gateway` network and attaches Traefik labels!

### Project A (`project-a/docker-compose.yml`):
```yaml
version: '3.8'

services:
  app-a:
    image: yourusername/project-a:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.project-a.rule=Host(`project-a.yourdomain.com`)"
      - "traefik.http.routers.project-a.entrypoints=websecure"
      - "traefik.http.routers.project-a.tls.certresolver=myresolver"
    networks:
      - web_gateway
      - project_a_internal

networks:
  web_gateway:
    external: true
  project_a_internal:
```

### Project B (`project-b/docker-compose.yml`):
```yaml
version: '3.8'

services:
  app-b:
    image: yourusername/project-b:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.project-b.rule=Host(`project-b.yourdomain.com`)"
      - "traefik.http.routers.project-b.entrypoints=websecure"
      - "traefik.http.routers.project-b.tls.certresolver=myresolver"
    networks:
      - web_gateway
      - project_b_internal

networks:
  web_gateway:
    external: true
  project_b_internal:
```

Traefik listens to the Docker daemon socket (`/var/run/docker.sock`), automatically detects new containers, provisions SSL certificates for their host domain, and routes traffic seamlessly!

---

## 🏆 The Complete Deployment Evolution Matrix

| Level | Strategy | Background Runner | Port Routing | Multi-Project Support | SSL handling |
|---|---|---|---|---|---|
| **Level 1** | Git Pull & Run | Foreground Shell *(Dies on close!)* | Direct Port `:3000` | ❌ No | ❌ None |
| **Level 2** | PM2 Process Manager | PM2 Daemon | Direct Port `:3000` | ❌ No | ❌ None |
| **Level 3** | Docker Compose | Docker Detached (`-d`) *(No PM2 needed!)* | Exposed Ports | ❌ No | ❌ None |
| **Level 4** | Caddy Reverse Proxy | Docker Detached (`-d`) | Port 80 / 443 | ⚠️ Single Project | ✅ Automatic (Caddy) |
| **Level 5** | Traefik Edge Router | Docker Detached (`-d`) | Central Port 443 | ✅ Multi-Project on 1 Server | ✅ Centralized (Traefik) |

---

## ✅ Summary Takeaways

1. **Level 5** solves multi-project hosting on a single machine by using **Traefik** as a central edge router.
2. Centralizing SSL on Traefik frees up individual projects to manage their own internal containers.
3. Adding a new project is as simple as adding Traefik labels to your `docker-compose.yml` file!

---

Next: [06-CICD-GitHub-Actions.md](06-CICD-GitHub-Actions.md) — Automating builds and deployments with CI/CD pipelines!
