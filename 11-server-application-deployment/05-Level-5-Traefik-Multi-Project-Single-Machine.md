# Level 5 — Traefik: Multiple Projects, One Machine
## Part 5 of 5 — The High-Level Deployment Architecture

> Previous: [04-Level-4-Reverse-Proxy-Caddy-SSL.md](04-Level-4-Reverse-Proxy-Caddy-SSL.md)
> Next: [06-CICD-GitHub-Actions.md](06-CICD-GitHub-Actions.md)

---

## 📌 Executive Summary

- Level 4 solved SSL + routing for **one project**. But renting a new EC2 instance for every side project is wasteful — most projects don't need a dedicated machine's worth of resources.
- **Traefik** is a reverse proxy, just like Caddy, but designed specifically to sit at the very top of a machine that hosts **multiple, independent projects**, each potentially with its own tech stack (Node, Python, whatever) and each with its own domain/subdomain.
- The pattern: **one Traefik container owns port 443 on the whole machine.** Each project underneath can still run its own internal Caddy (or talk to Traefik directly); Traefik is the thing that decides, purely from the incoming domain name, which project's containers should handle the request.
- This is exactly the picture from the reference screenshot: `project-a.piyushgarg.online` and `project-b.piyushgarg.online` both arrive at the same machine's Traefik, which routes each to its own isolated project.

---

## 🧠 Core Analogy: A Serviced Office Building

Level 4's Caddy was a receptionist for **one company's office**. Traefik is the **building's main lobby security desk** — the building houses several *different, independent companies* (Project A, Project B, …), each with their own floor, their own staff, maybe their own internal receptionist. Visitors arrive at one lobby address; the front desk reads *which company* they're visiting off their badge (the domain name) and routes them to the right floor. Crucially, the building's front door (port 443, and the SSL certificates) is managed once, centrally, not floor by floor.

---

## 🏢 1. Why You Need This: One Machine, Many Projects

Without Traefik, each project needing SSL on 443 would independently try to bind port 443 — but **only one process can listen on a given port on a machine at a time.** You can't run two separate Caddy instances each trying to own 443.

Traefik's job is to be the **single owner of port 443** for the entire machine, and internally forward each request to the right project based on the incoming hostname:

```
                          ┌─────────────────────────────┐
                          │   EC2 instance (one machine) │
                          │                              │
 project-a.domain.com ──▶ │  ┌────────┐                  │
                          │  │Traefik │──▶ Project A      │
 project-b.domain.com ──▶ │  │ (443)  │──▶ Project B      │
                          │  └────────┘                  │
                          └─────────────────────────────┘
```

This directly answers: *"How do I avoid buying a new machine every time I have a new project?"* — you don't; you add another service block under the same Traefik.

---

## 🔀 2. How Traefik Decides Where to Route

Traefik reads **labels** on Docker containers to build its routing rules dynamically — no static config file to hand-edit per project. Each project declares, via labels on its own container/compose file, which hostname it wants to own:

```yaml
# project-a/docker-compose.yml
services:
  app:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.project-a.rule=Host(`project-a.piyushgarg.online`)"
      - "traefik.http.routers.project-a.entrypoints=websecure"
      - "traefik.http.routers.project-a.tls.certresolver=le"
      - "traefik.http.services.project-a.loadbalancer.server.port=3000"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

```yaml
# project-b/docker-compose.yml — same pattern, different hostname
services:
  app:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.project-b.rule=Host(`project-b.piyushgarg.online`)"
      - "traefik.http.routers.project-b.entrypoints=websecure"
      - "traefik.http.routers.project-b.tls.certresolver=le"
      - "traefik.http.services.project-b.loadbalancer.server.port=3000"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

Each project is otherwise fully independent — its own repo, its own Dockerfile, its own internal services (Project B in the reference screenshot even mixes Node and Python containers). They only share one thing: the `traefik-public` Docker network, so Traefik's container can reach each project's app container.

---

## 🐳 3. The Traefik Container Itself

Traefik runs once, centrally, typically in its own compose file (e.g., `docker-compose.api-gateway.yml`):

```yaml
# docker-compose.api-gateway.yml
services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.le.acme.httpchallenge=true"
      - "--certificatesresolvers.le.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.le.acme.email=you@example.com"
      - "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"   # lets Traefik read container labels
      - "letsencrypt:/letsencrypt"                        # persists certs
    networks:
      - traefik-public

networks:
  traefik-public:
    name: traefik-public

volumes:
  letsencrypt:
```

Key points:

- `providers.docker=true` — Traefik watches the Docker socket and auto-discovers routing rules from container **labels**, live, with no restart needed when you add a new project.
- `entrypoints.websecure.address=:443` — Traefik itself is the only thing binding 443 on the whole host.
- The `certificatesresolvers.le...` block is Traefik's own built-in Let's Encrypt integration — same automatic SSL idea as Caddy, but managing certificates for **every project's domain**, centrally, from one place.
- The Docker socket mount (`/var/run/docker.sock`) is what lets Traefik "see" every other container's labels across the whole machine, even containers defined in totally separate compose files/projects, as long as they share the `traefik-public` network.

You bring this up once: `docker compose -f docker-compose.api-gateway.yml up -d`. Then every project just needs to join `traefik-public` and add its labels — no changes to Traefik itself.

---

## 🔁 4. Where Caddy Fits Once Traefik Exists

A project can still keep its own internal Caddy (as in the reference screenshot) if it wants an internal reverse proxy / internal load balancer across its *own* multiple containers — Traefik then simply routes `project-a.domain.com` traffic to that project's Caddy, and Caddy handles the rest internally on a plain HTTP port. In simpler projects, skip the internal Caddy and let Traefik talk to the app container directly (as in the label examples above) — both are valid; it depends on whether a project needs its own internal routing/load-balancing on top of what Traefik already provides.

Either way, **the SSL certificate boundary moves up**: instead of every project's own Caddy independently managing SSL, only Traefik, at the top, terminates SSL on 443 for the entire machine.

---

## ✅ Takeaways

- **Traefik** is the reverse proxy that owns port 443 for the **whole machine**, and routes to different independent projects based on the incoming domain/subdomain — read from Docker **labels**, discovered automatically.
- This is what lets you host unlimited independent projects on **one EC2 instance** instead of renting a new machine per project.
- Each project keeps its own Dockerfile/compose file and joins one shared external Docker network (`traefik-public`) so Traefik can reach it.
- A project may still run its own internal Caddy for its own internal routing — Traefik just becomes the outer layer; SSL termination moves up to Traefik.
- This is the natural ceiling of "how far can I push a single machine" before you'd actually go back to [Level 0b's](00b-Load-Balancing-And-CDN.md) AWS-managed ALB + target groups across *multiple* machines.

Next: [06-CICD-GitHub-Actions.md](06-CICD-GitHub-Actions.md) — automating everything above instead of SSHing in by hand every deploy.
