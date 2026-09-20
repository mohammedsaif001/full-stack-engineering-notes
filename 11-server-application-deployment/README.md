# 🚀 11 — Server & Application Deployment Guide

Welcome! If deploying servers ever felt overwhelming, confusing, or full of jargon, you are in the right place. 

This repository takes you on a step-by-step journey from **"What is a cloud server?"** all the way to **"A high-level, production-grade deployment with multiple microservices, automatic HTTPS, load balancing, multi-project hosting, CI/CD, and full observability."**

---

## 🧭 The 5-Step Deployment Evolution

We progress in levels. Each step exists for a single reason: **to solve the painful limitation of the previous step!**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1 (Novice): Git Pull & Run directly on EC2                                        │
│  └─ Problem: Closing SSH terminal kills the app!                                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 2: PM2 Process Manager                                                           │
│  └─ Problem: Adding Redis, DB, Kafka means manual setup overhead on server!            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 3: Dockerfile & Docker Compose (Detached Mode)                                   │
│  └─ Note: PM2 is NO LONGER NEEDED here! Docker handles background run & auto-restarts. │
│  └─ Problem: Apps exposed on raw ports like :3000 instead of clean domain & SSL!       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 4: Caddy Reverse Proxy & Automatic SSL Termination                               │
│  └─ Problem: What if we want to run MULTIPLE separate projects on ONE server machine?  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 5 (High Level): Traefik Gateway — Multi-Project Single Machine Architecture      │
│  └─ Result: Single machine hosting Project A & Project B with automatic HTTPS!          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Complete File Index

| # | File | What You Will Learn & Master |
|---|---|---|
| **00a** | [Cloud Fundamentals](00a-Cloud-Fundamentals.md) | AWS EC2, AMIs, SSH keys (`ssh-keygen`, public vs private key), Security Groups & CIDRs (`0.0.0.0/0` vs internal/Jio IP for port 22), Inbound/Outbound rules. |
| **00b** | [Load Balancing & CDN](00b-Load-Balancing-And-CDN.md) | Target Groups, Elastic Load Balancers (ELB), S3 storage, and CloudFront CDN for super-fast asset/image retrieval. |
| **00c** | [Launching Your First EC2 Instance](00c-Launching-Your-First-EC2-Instance.md) | Step-by-step hands-on walkthrough to launch an AWS EC2 instance, map IP addresses, buy custom domains, and understand OS internal DNS resolution (`/etc/hosts`, `127.0.0.1`, mapping `saif.ai` locally). |
| **01** | [Level 1 — Git Pull & Run](01-Level-1-Git-Pull-And-Run.md) | **Step 1 (Novice Level):** SSH into cloud server, clone GitHub repo, run Node server. Understand why closing terminal stops the app. |
| **02** | [Level 2 — PM2 Process Manager](02-Level-2-PM2-Process-Manager.md) | **Step 2:** Keep your server alive with `pm2 start index.js`. Automatic restarts on crash and system reboots. |
| **03** | [Level 3 — Dockerfile & Containers](03-Level-3-Dockerfile-And-Containers.md) | **Step 3:** Package app + services (Redis, Mongo, Kafka, Postgres). Dockerfile, Docker Hub images, `docker compose up -d`. *(Why PM2 is not needed in Docker)*. |
| **04** | [Level 4 — Caddy Reverse Proxy & SSL](04-Level-4-Reverse-Proxy-Caddy-SSL.md) | **Step 4:** Map domain to Port 80 (HTTP) / 443 (HTTPS). Understand SSL termination, load balancing, and Caddy reverse proxy via `docker-compose.api-gateway.yml`. |
| **05** | [Level 5 — Traefik Multi-Project Single Machine](05-Level-5-Traefik-Multi-Project-Single-Machine.md) | **Step 5 (High Level):** Host `project-a.com` and `project-b.com` on one server using Traefik as the central HTTPS edge router. |
| **06** | [CI/CD — GitHub Actions](06-CICD-GitHub-Actions.md) | Compare CI/CD providers (GitHub Actions, Jenkins, AWS CloudBuild, CircleCI, GCP Cloud Run). Create `.github/workflows/deploy.yml` with source, event, steps. |
| **07** | [Observability — OTel & Signoz](07-Observability-OTel-Signoz.md) | Implement OpenTelemetry (OTel) & Signoz using the **Sidecar Pattern** inside containers to track server health without altering API code. |
| **08** | [Frontend Deployment — React & Next.js](08-Deploying-Frontend-React-And-Nextjs.md) | Deploy React SPAs (Vite/Nginx/S3/CloudFront) vs Next.js SSR apps (Standalone Docker + Reverse Proxy). Manage `.env` secrets safely across cloud & CI/CD pipelines. |

---

## ⚡ Quick Summary of Key Concepts

- **SSH Keys:** Private key stays on your local machine; Public key lives in the server's `~/.ssh/authorized_keys`. Generate with `ssh-keygen` and inspect with `ls ~/.ssh | grep id_`.
- **Security Group Strategy:** Open ports `80` (HTTP) and `443` (HTTPS) to `0.0.0.0/0` (everyone on the internet), but lock port `22` (SSH/bash) strictly to your own IP / CIDR range (e.g., your home or Jio connection).
- **Internal OS DNS (`/etc/hosts`):** Your OS checks `/etc/hosts` first before contacting public DNS. `localhost` maps to `127.0.0.1`. You can map any custom domain like `saif.ai` to `127.0.0.1` locally to test servers without buying domains!
- **Environment Variables (`.env`):** Never commit `.env` to Git. Create `.env` directly on the server (`nano .env`), pass via Docker Compose `env_file`, or inject via GitHub Actions Secrets during deploy.
- **The Docker Detached Shift:** Running containers with `docker compose up -d` handles background execution and auto-restart policies natively — **PM2 is no longer required**.
- **SSL Termination:** Your reverse proxy (Caddy or Traefik) handles cryptographic key exchange on port 443 so your application containers don't waste CPU cycles on SSL and can focus purely on business routes.
- **Frontend Strategy:** React SPAs (Vite) compile into static files (`dist`) and are served via Nginx/Caddy or S3+CloudFront. Next.js SSR apps run as Node server containers (`output: 'standalone'`).
- **Single Machine, Multi-Project Scaling:** Using Traefik on port 443 lets you route incoming domains (`project-a.com`, `project-b.com`) to separate Docker container stacks on the exact same server without provisioning new virtual machines!

---

💡 *Ready to get started? Dive into [00a-Cloud-Fundamentals.md](00a-Cloud-Fundamentals.md)!*
