# Load Balancing, Target Groups & CDN
## Part 0b — Scaling Beyond One Machine

> Previous: [00a-Cloud-Fundamentals.md](00a-Cloud-Fundamentals.md)
> Next: [00c-Launching-Your-First-EC2-Instance.md](00c-Launching-Your-First-EC2-Instance.md)

---

## 📌 Executive Summary

- One EC2 instance = one point of failure and a hard ceiling on traffic. A **Load Balancer** sits in front of *multiple* instances and spreads incoming requests across them, all reachable through **one stable URL**.
- A **Target Group** is the load balancer's address book — the list of instances (or containers) it's allowed to send traffic to, plus the health check it uses to know which ones are currently alive.
- **AWS's Elastic Load Balancer (ELB/ALB)** is the managed version of this — it also does SSL termination and horizontal scaling for you.
- **S3** is object storage (files, not a running server) — used for static assets, backups, uploads.
- **CloudFront** is AWS's **CDN** (Content Delivery Network) — it caches your S3/API responses at edge locations physically close to users, so a user in Mumbai doesn't fetch an image from a server in Virginia every time.

---

## 🧠 Core Analogy: A Restaurant With Multiple Kitchens

- **One EC2 instance** = one kitchen. If it's busy or it catches fire, service stops.
- **Load balancer** = the host at the front door, deciding which kitchen (instance) handles the next order, so no one kitchen gets overwhelmed and one kitchen going down doesn't stop the restaurant.
- **Target group** = the host's staff roster — literally the list of which kitchens exist right now and whether each one currently has its lights on (health check passing).
- **CDN (CloudFront)** = instead of every customer in every city calling this one restaurant's kitchen, you set up small fridges stocked with the popular dishes in every neighborhood. Most people get served from the nearby fridge (**cache hit**); only first-time or unusual orders go all the way back to the real kitchen (**cache miss / origin fetch**).

---

## ⚖️ 1. Load Balancer + Target Group, Together

**The question this answers:** *"If I spin up multiple servers, how does everyone still hit the same URL?"*

1. You register your instances (or containers) into a **Target Group**.
2. The Target Group continuously **health-checks** each target (e.g., `GET /health` every N seconds) and marks it healthy/unhealthy.
3. The **Load Balancer** is given one DNS name / IP and forwards each incoming request to one *healthy* target in the group (round robin or least-connections).
4. Users always hit the load balancer's URL — they never know or care how many real instances sit behind it, or which one served them.

```
                     ┌───────────────┐
 users ───────────▶  │ Load Balancer │  (one stable URL / IP)
                     └───────┬───────┘
                             │  consults
                     ┌───────▼───────┐
                     │  Target Group │  (health-checks each target)
                     └───┬───┬───┬───┘
                         ▼   ▼   ▼
                     instance instance instance
                        A       B       C
```

On AWS this managed load balancer is the **ELB** (Elastic Load Balancer), most commonly used as an **ALB** (Application Load Balancer) for HTTP/HTTPS traffic. It also does:

- **SSL termination** — the ALB holds the SSL certificate and decrypts HTTPS, so your instances only need to speak plain HTTP internally.
- **Auto scaling integration** — new instances can auto-register into the target group as load increases.

> This is the AWS-managed version of the same problem [Level 4 (Caddy)](04-Level-4-Reverse-Proxy-Caddy-SSL.md) and [Level 5 (Traefik)](05-Level-5-Traefik-Multi-Project-Single-Machine.md) solve with a reverse proxy on a single box — different scale, same underlying idea: one address in front, many backends behind.

---

## 🪣 2. S3 — Object Storage

**S3 (Simple Storage Service)** stores files ("objects") — images, videos, backups, static site builds — not a running process. Key properties:

- Addressed by **bucket + key** (like a folder path), fetched over HTTP(S).
- Extremely durable and cheap for large, infrequently-changing files.
- Commonly used for: user-uploaded images, database backups, build artifacts, and static frontend hosting.

It answers *"where do I put files that don't belong on my application server's disk?"* — an EC2 instance's disk is ephemeral-ish and doesn't scale; S3 does.

---

## 🌍 3. CloudFront — The CDN

**The question this answers:** *"How do I make image/asset retrieval fast for users far from my server?"*

A **CDN (Content Delivery Network)** is a network of geographically distributed **edge servers** that cache copies of your content. **CloudFront** is AWS's CDN, typically placed in front of S3 (for static files) or an ALB (for a full app).

- First request for a file from a region → CloudFront has no cached copy yet, so it fetches from the **origin** (S3/ALB) and caches it at the nearest edge location (**cache miss**).
- Every subsequent request from users near that edge location → served straight from the cache, without touching your origin at all (**cache hit**) — much lower latency, and your origin server does far less work.
- You control **cache duration** (`Cache-Control` / `TTL`) per file type — long TTLs for versioned static assets (JS bundles, images), short/no caching for personalized API responses.

```
User (Mumbai) ──▶ CloudFront edge (Mumbai) ──cache hit──▶ (served instantly)
                          │
                          └──cache miss──▶ Origin (S3 bucket / ALB in us-east-1)
```

---

## 🧩 4. The Full Picture at This Level

| Piece | Role |
|---|---|
| **EC2** | Runs your actual application code |
| **Security Group** | Firewall rules on each EC2 instance |
| **Target Group** | List of healthy instances a load balancer can send traffic to |
| **Load Balancer (ALB)** | Single entry point, spreads traffic, terminates SSL |
| **S3** | Stores static files/objects outside the app server |
| **CloudFront** | Caches content at edge locations close to users for speed |

These are the AWS building blocks. Everything from here on (Levels 1–5) is about what actually *runs on* the EC2 instance itself — starting from the simplest possible thing: pulling code and running it.

---

## ✅ Takeaways

- A **Load Balancer** gives multiple instances one stable public address; a **Target Group** is the list of healthy instances it's allowed to route to.
- AWS's managed load balancer (**ALB**) also terminates SSL and integrates with auto-scaling.
- **S3** is file/object storage, not compute — use it for anything that isn't "a running process."
- **CloudFront** is AWS's CDN: it caches responses at edge locations near users, turning repeat requests into fast cache hits instead of round trips to the origin.
- This AWS-managed load-balancing pattern is the large-scale version of the reverse-proxy pattern you'll build by hand with Caddy/Traefik in Levels 4–5.

Next: [00c-Launching-Your-First-EC2-Instance.md](00c-Launching-Your-First-EC2-Instance.md) — the actual click-by-click walkthrough to get a machine running, before [Level 1](01-Level-1-Git-Pull-And-Run.md).
