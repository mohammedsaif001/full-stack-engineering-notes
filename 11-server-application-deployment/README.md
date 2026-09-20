# 11 — Server & Application Deployment

A practical, in-order path from "what is an EC2 instance?" to "one machine, multiple projects, automatic HTTPS, automated deploys." Read the files in sequence — each level exists specifically to fix a limitation of the one before it.

Every file follows the same shape as the [10-docker](../10-docker/README.md) notes: a **📌 Executive Summary**, a **🧠 Core Analogy**, numbered deep-dive sections with runnable commands/config, and a **✅ Takeaways** list at the end.

---

## The path

| # | File | What you'll be able to do after it |
|---|---|---|
| 00a | [Cloud Fundamentals](00a-Cloud-Fundamentals.md) | Explain EC2/instance/AMI/container, generate and use SSH keys, and configure security groups with correct CIDR ranges |
| 00b | [Load Balancing & CDN](00b-Load-Balancing-And-CDN.md) | Explain target groups, load balancers, S3, and how CloudFront speeds up asset delivery |
| 00c | [Launching Your First EC2 Instance](00c-Launching-Your-First-EC2-Instance.md) | Actually spin up a real, SSH-able EC2 instance — step by step via the AWS Console and via the AWS CLI |
| 01 | [Level 1 — Git Pull & Run](01-Level-1-Git-Pull-And-Run.md) | Clone a repo onto a fresh EC2 instance and run it so it's reachable by IP |
| 02 | [Level 2 — PM2](02-Level-2-PM2-Process-Manager.md) | Keep a Node app alive after disconnecting, auto-restart on crash, survive reboots |
| 03 | [Level 3 — Dockerfile & Containers](03-Level-3-Dockerfile-And-Containers.md) | Package the app (and its dependent services) into Docker images and run the whole stack detached — and explain why this replaces PM2 |
| 04 | [Level 4 — Caddy & SSL](04-Level-4-Reverse-Proxy-Caddy-SSL.md) | Put a reverse proxy in front of the app for a clean domain + automatic HTTPS, and explain why SSL shouldn't terminate in app code |
| 05 | [Level 5 — Traefik, Multi-Project](05-Level-5-Traefik-Multi-Project-Single-Machine.md) | Run multiple independent projects behind one Traefik instance on a single machine, each with its own domain |
| 06 | [CI/CD — GitHub Actions](06-CICD-GitHub-Actions.md) | Automate the entire pull → build → deploy loop on every `git push` |
| 07 | [Observability — OTel & Signoz](07-Observability-OTel-Signoz.md) | Explain the sidecar pattern for collecting traces/metrics/logs without touching app code |

---

## The levels, in one paragraph each

- **Level 1** proves the path end-to-end: SSH into a cloud machine, `git clone`, `npm install`, run it. Breaks the moment you close the terminal.
- **Level 2** fixes that with **PM2** — a background process manager that survives disconnects and restarts on crash.
- **Level 3** appears once you have *multiple services* (Kafka, Redis, Mongo, Postgres...) — Docker packages each into a reproducible image, run together with `docker compose up -d`. Docker's own `restart:` policy replaces PM2.
- **Level 4** gets you a clean `https://domain.com` instead of `http://ip:3000` — **Caddy** as a reverse proxy in front of the app, owning SSL certificate issuance/renewal automatically.
- **Level 5** scales that to *multiple independent projects on one machine* — **Traefik** owns port 443 for the whole box and routes by domain name to each project's containers.
- **Bonus:** **CI/CD (GitHub Actions)** automates the whole pull/build/deploy loop; **OTel + Signoz** adds visibility into what the deployed app is doing, typically via a sidecar container.

---

## Questions this series answers directly

| Question | Where |
|---|---|
| What is an EC2 instance, an AMI, a container? | [00a](00a-Cloud-Fundamentals.md) |
| How does SSH work, and how do I generate keys? | [00a §2](00a-Cloud-Fundamentals.md) |
| What is a security group / CIDR, and why is `0.0.0.0/0` dangerous for SSH? | [00a §3](00a-Cloud-Fundamentals.md) |
| What's a target group, a load balancer, and how does CloudFront speed up delivery? | [00b](00b-Load-Balancing-And-CDN.md) |
| How do I actually launch an EC2 instance, step by step? | [00c](00c-Launching-Your-First-EC2-Instance.md) |
| How do I get my app running on a server anyone can reach? | [01](01-Level-1-Git-Pull-And-Run.md) |
| How do I stop the app from dying when I close my SSH session? | [02](02-Level-2-PM2-Process-Manager.md) |
| Why Docker, and do I still need PM2 once I use it? | [03](03-Level-3-Dockerfile-And-Containers.md) |
| Why shouldn't my Node app manage SSL certificates itself? | [04 §2](04-Level-4-Reverse-Proxy-Caddy-SSL.md) |
| How do I run multiple different projects on one server without buying new machines? | [05](05-Level-5-Traefik-Multi-Project-Single-Machine.md) |
| How do I stop manually SSHing in for every deploy? | [06](06-CICD-GitHub-Actions.md) |
| How do I see what my app is doing in production without cluttering my code? | [07](07-Observability-OTel-Signoz.md) |

---

## If you only have 30 minutes

00a → 00c → 01 → 03 → 04 → 05. That's the security fundamentals, the simplest deploy, why Docker matters, why a reverse proxy matters, and how one machine hosts many projects — the shape of almost every real deployment.
