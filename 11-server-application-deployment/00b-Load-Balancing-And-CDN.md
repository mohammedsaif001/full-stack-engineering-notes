# ⚖️ Load Balancing, Target Groups, S3 & CloudFront CDN
## Part 0b — Scaling Beyond a Single Machine

> Previous: [00a-Cloud-Fundamentals.md](00a-Cloud-Fundamentals.md)  
> Next: [00c-Launching-Your-First-EC2-Instance.md](00c-Launching-Your-First-EC2-Instance.md)

---

## 📌 Executive Summary

- Running a single EC2 instance creates a **single point of failure** and puts a limit on how much traffic your website can handle.
- An **Elastic Load Balancer (ELB)** acts as the front door to your application. It receives all incoming traffic on one single URL and distributes requests evenly across multiple EC2 server instances.
- A **Target Group** is the health-checking address book for the Load Balancer. It continuously checks if each instance is alive before forwarding traffic to it.
- **S3 (Simple Storage Service)** is cloud storage for files, assets, and images, keeping heavy media off your application server's hard drive.
- **CloudFront (CDN)** is a Content Delivery Network that caches S3 static files (like images, JS, CSS) at edge server locations worldwide to make asset retrieval lightning fast ("hot retrieval").

---

## 🧠 Core Analogy: The Multi-Kitchen Restaurant

Imagine running a high-demand restaurant:

- **Single EC2 Instance** = 1 Chef in 1 Kitchen. If 1,000 customers arrive at once, the chef is overwhelmed and service crashes.
- **Target Group** = The roster of active, healthy chefs currently standing in the kitchen ready to cook.
- **Elastic Load Balancer (ELB)** = The Master Front-Desk Host. All customers line up at one host desk (`api.yourdomain.com`). The host hands incoming food orders to Chef A, Chef B, and Chef C evenly.
- **S3 Bucket** = The central pantry storehouse where pre-packaged drinks, sauces, and raw ingredients are stored.
- **CloudFront CDN** = Local express vending fridges placed in cities across the world. When a customer in Mumbai wants a popular drink, they grab it instantly from the local fridge (**cache hit**) instead of waiting for a truck to deliver it from a central warehouse in Virginia (**origin fetch**).

---

## ⚖️ 1. How Load Balancers & Target Groups Work

**The Core Problem Solved:** *"If I spin up 5 identical EC2 instances to handle high traffic, how do users connect to all of them using just one single URL?"*

```
                                  ┌────────────────────────────────┐
                                  │ Elastic Load Balancer (ELB)    │
  User Requests ───────────────▶  │ Single Entry URL: api.demo.com │
                                  └───────────────┬────────────────┘
                                                  │
                                       Checks Target Group
                                                  │
                                  ┌───────────────▼────────────────┐
                                  │ Target Group (Health Checks)   │
                                  └───────┬───────┬────────┬───────┘
                                          │       │        │
                                          ▼       ▼        ▼
                                      EC2 Server EC2 Server EC2 Server
                                       Instance A Instance B Instance C
```

### Key Responsibilities of Elastic Load Balancer (ELB):

1. **Single Entry Point:** Users only ever see one domain name (e.g., `https://api.yourdomain.com`).
2. **Traffic Distribution:** Uses round-robin routing to spread incoming requests evenly across instances.
3. **Health Checking:** If `EC2 Instance B` crashes or fails its health check (e.g., `GET /health`), the Target Group automatically marks it as unhealthy and the ELB stops sending traffic to it until it recovers.
4. **SSL Termination:** The ELB decrypts HTTPS requests at the edge so individual backend EC2 servers only deal with lightweight internal HTTP traffic.

---

## 🪣 2. AWS S3 — Scalable Object Storage

**AWS S3 (Simple Storage Service)** is designed to store files (images, videos, PDFs, backups, static build files) rather than run code logic.

### Why not store user uploads directly on the EC2 instance disk?
1. **Disk Space Limit:** EC2 hard drives can fill up quickly.
2. **Multi-Instance Sync:** If a user uploads a profile picture to `Instance A`, `Instance B` won't have it on its disk!
3. **Ephemeral Storage:** If an EC2 instance is terminated, local files are lost. S3 stores files persistently in a dedicated cloud storage bucket accessible by all instances.

---

## ⚡ 3. CloudFront — CDN for Hot Asset Retrieval

**CloudFront** is AWS's global **Content Delivery Network (CDN)**.

```
User (India) ──▶ CloudFront Edge (Mumbai) ──▶ [Cache Hit: Image Served instantly in 5ms!]
                        │
                  (Cache Miss)
                        │
                        ▼
               Origin (S3 Bucket in US-East Virginia) [180ms delay]
```

### Why CDN makes things "Hot" (Fast):
- **Edge Caching:** CloudFront caches heavy assets (like product images, videos, static bundles) at hundreds of "Edge Locations" close to users worldwide.
- **Reduced Origin Load:** Instead of hit-hitting your backend EC2 or S3 bucket millions of times, 95%+ of asset requests hit the local CDN cache instantly.
- **Latency Reduction:** Delivering an image from a local CDN edge in Mumbai takes ~5ms compared to ~200ms fetching from AWS Virginia.

---

## 🧩 4. AWS Cloud Infrastructure Architecture Summary

| AWS Component | Function in Deployment |
|---|---|
| **EC2 Instance** | Virtual machine that executes application logic & code. |
| **Security Group** | Virtual firewall managing inbound/outbound ports (80, 443, 22). |
| **Target Group** | Keeps track of healthy EC2 backend instances. |
| **Elastic Load Balancer (ELB)** | Entry-point URL distributor & SSL terminator. |
| **S3 Storage** | Central file bucket for user uploads & assets. |
| **CloudFront CDN** | High-speed global edge cache for fast image & static asset retrieval. |

---

## ✅ Summary Takeaways

1. **Load Balancers** allow multiple EC2 instances to share a single public domain address seamlessly.
2. **Target Groups** automatically isolate unhealthy instances so users never encounter dead server errors.
3. **S3 + CloudFront CDN** offloads file storage and static asset serving, ensuring images and media render blistering fast for global users.

---

Next: [00c-Launching-Your-First-EC2-Instance.md](00c-Launching-Your-First-EC2-Instance.md) — Hands-on step-by-step walkthrough to launch an EC2 machine and set up domain mapping.
