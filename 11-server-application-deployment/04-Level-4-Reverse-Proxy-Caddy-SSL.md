# 🔒 Level 4 — Reverse Proxy with Caddy & Automatic SSL Termination
## Step 4 of 5 — Ports 80/443, SSL Certificates & Load Balancing

> Previous: [03-Level-3-Dockerfile-And-Containers.md](03-Level-3-Dockerfile-And-Containers.md)  
> Next: [05-Level-5-Traefik-Multi-Project-Single-Machine.md](05-Level-5-Traefik-Multi-Project-Single-Machine.md)

---

## 📌 Executive Summary

- **Level 4 Goal:** Expose your application cleanly on standard HTTP/HTTPS ports (`80` / `443`), obtain automatic SSL certificates for `https://yourdomain.com`, and load-balance requests across multiple container instances.
- **The Reverse Proxy Solution:** **Caddy** — an modern, high-performance open-source reverse proxy and load balancer.
- **SSL Termination Explained:** Why cryptographic SSL key exchanges should happen at Caddy (the edge proxy) rather than inside Node.js application code.

---

## 🧠 Core Analogy: The Hotel Reception Desk

- **Direct Port Access (`:3000`):** Guests bypassing the hotel reception and knocking on room doors directly. Unsecure, confusing room numbers (`:8080`, `:4040`), and no security check.
- **Reverse Proxy (Caddy on Port 80/443):** The primary Concierge Desk at the hotel front entrance (`abc.com`).
  - The Concierge handles security verification (SSL Certificate / HTTPS).
  - The Concierge directs the guest to an available room (Node Container) behind the scenes.
  - Guests only see the polished front entrance — never raw room numbers!

---

## 🌐 1. Understanding Web Ports & Domain Mapping

By default on the internet:
- **Port 80:** Default port for **HTTP** unencrypted traffic.
- **Port 443:** Default port for **HTTPS** encrypted traffic.

When you type `https://abc.com` in your browser, the browser automatically targets **Port 443**. If your app is listening on Port 3000 or 8080 without a reverse proxy, users are forced to type `abc.com:8080` — which looks unprofessional and breaks standard web security!

---

## 🤔 2. What Actually is Caddy?

**Caddy** is a powerful reverse proxy server that sits between public users and your internal Docker containers.

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      AWS EC2 HOST                      │
                    │                                                        │
                    │   ┌────────────────────────────────────────────────┐   │
User Request  ─────┼──▶│ Caddy Reverse Proxy Container (Port 80 / 443)  │   │
(https://abc.com)   │   └───────────────────────┬────────────────────────┘   │
                    │                           │                            │
                    │             Internal Docker Network                    │
                    │                           │                            │
                    │       ┌───────────────────┼───────────────────┐        │
                    │       ▼                   ▼                   ▼        │
                    │ ┌───────────┐       ┌───────────┐       ┌───────────┐  │
                    │ │ Node API  │       │ Node API  │       │ Node API  │  │
                    │ │ Container │       │ Container │       │ Container │  │
                    │ └───────────┘       └───────────┘       └───────────┘  │
                    └────────────────────────────────────────────────────────┘
```

### Why use Caddy?
1. **Automatic HTTPS / SSL:** Caddy automatically provisions and renews free SSL certificates (via Let's Encrypt / ZeroSSL) for your domain with zero manual code.
2. **Reverse Proxying:** Maps public incoming domain requests on `80/443` to internal container ports like `3000`.
3. **Load Balancing:** Automatically distributes requests across multiple instances of your Node containers inside a Docker network.

---

## 🔐 3. SSL Certificate Masterclass — What, Who, Is it Paid, Purpose & Installation

### ❓ What is an SSL Certificate?
An **SSL (Secure Sockets Layer)** — modernly known as **TLS (Transport Layer Security)** — is a digital certificate that enables **HTTPS** (encrypted connections) instead of HTTP (plain text).
- **HTTP (`http://`):** Data (passwords, credit cards) is sent in raw plain text. Anyone on public Wi-Fi can steal it.
- **HTTPS (`https://`):** Data is scrambled into mathematical ciphertext (`a8f39b1d...`). Only your server holds the private decryption key.

---

### 🏛️ Who gives an SSL Certificate?
SSL Certificates are issued by trusted security organizations called **Certificate Authorities (CAs)**:
- **Let's Encrypt** *(The open-source non-profit CA powering 90%+ of the modern web)*
- **ZeroSSL**
- **Cloudflare**
- **AWS Certificate Manager (ACM)**
- **DigiCert / Comodo**

---

### 💰 Is an SSL Certificate Paid or Free?
**It is 100% FREE!**
- **In the past:** Companies used to charge $50 to $300 per year per domain.
- **Today:** Thanks to **Let’s Encrypt**, SSL certificates are completely free for everyone. Tools like **Caddy** and **Traefik** issue and renew them **100% automatically** without human intervention via the ACME protocol.

---

### 🤔 If anyone can get it for FREE, what is the purpose of it?
If a hacker can also request a free SSL certificate, why does SSL matter?  
An SSL certificate serves **two vital purposes**:

1. **Data Encryption (Privacy):** Scrambles connection data so ISPs, governments, or hackers on public Wi-Fi cannot read or intercept user traffic.
2. **Domain Ownership Verification (Identity & Trust):**
   - A Certificate Authority will **ONLY** issue a certificate for `yourdomain.com` if you can mathematically prove you own the DNS records of `yourdomain.com`.
   - A hacker **cannot** get a valid SSL certificate for `google.com` or `yourbank.com` because they don't own those domains.
   - When a browser displays the 🔒 padlock icon next to `https://yourdomain.com`, it guarantees both **data encryption** AND **proof of authentic domain control**.

---

### 📍 Where do you install an SSL Certificate & What is SSL Termination?

#### Where does it live?
The SSL certificate lives on the **Reverse Proxy / Edge Router** facing the public internet on **Port 443** (e.g., **Caddy**, **Traefik**, Nginx, or AWS Elastic Load Balancer).

#### Why NOT install it inside your Node.js application code?
**The Anti-Pattern (SSL in App Code):**  
If you write HTTPS key exchange directly inside Node.js (`https.createServer()`), Node has to run expensive RSA/ECC cryptographic math for *every single HTTP request*. This wastes CPU power and forces your app code to deal with certificate files!

**The Best Practice (SSL Termination at Reverse Proxy):**  
- **Caddy / Traefik** binds to Port `443`, holds the SSL certificate, and handles all cryptographic key exchanges with users on the public internet.
- Once Caddy decrypts the request, it forwards plain HTTP traffic over an isolated **Internal Docker Network** to your Node API container on Port 3000.
- **Result:** SSL is "terminated" at the reverse proxy. Your main Node server CPU is 100% free to focus on application business logic and routes!

---

### 🛠️ How do you install it in Caddy?
You don't manually download or copy `.crt` / `.key` files! In your `Caddyfile`:

```caddyfile
yourdomain.com {
    reverse_proxy api:3000
}
```

When Caddy starts:
1. It contacts **Let's Encrypt** automatically.
2. Proves DNS ownership of `yourdomain.com`.
3. Downloads the free SSL certificate.
4. Binds it to **Port 443**.
5. Automatically renews it every 90 days before expiration!

---

## 🛠️ 4. Docker Compose Setup with Caddy (`docker-compose.api-gateway.yml`)

Here is how to run Caddy alongside your Node API with persistent volumes and Docker networks:

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - app-network

  api:
    image: yourdockerhubusername/my-node-api:v1
    restart: unless-stopped
    networks:
      - app-network

volumes:
  caddy_data:
  caddy_config:

networks:
  app-network:
    driver: bridge
```

### 📄 The `Caddyfile` Configuration

Create a file named `Caddyfile` in the same directory:

```caddyfile
abc.com {
    # Reverse proxy to the container name inside the Docker network
    reverse_proxy api:3000
}
```

*When Caddy starts, it contacts Let's Encrypt, binds an SSL certificate to `abc.com`, listens on Port 443, and proxies traffic to `api:3000` automatically!*

---

## ⚡ 5. Scaling with Caddy Load Balancing

If traffic spikes, you can scale your Node API container instances instantly:

```bash
docker compose -f docker-compose.api-gateway.yml up -d --scale api=3
```

Because Caddy references the container network name `api`, Docker's embedded DNS load-balances requests across all 3 running API container instances automatically!

---

## ⚠️ The Limitation of Level 4

Caddy on Level 4 works amazingly well for **one single project**.  
However, what if you have **Project A (`project-a.com`)** and **Project B (`project-b.com`)** on the same EC2 machine?

If Project A's Caddy container binds to Port 443, Project B cannot bind to Port 443 because Port 443 is already occupied!

👉 **How do we host MULTIPLE independent projects on ONE single server machine?**  
👉 **Enter Level 5 (High Level): Traefik Central Gateway!**

---

## ✅ Summary Takeaways

1. Ports `80` (HTTP) and `443` (HTTPS) are standard web entry points.
2. **Caddy** acts as a reverse proxy, load balancer, and automatic SSL certificate manager.
3. **SSL Termination** offloads encryption overhead to Caddy, keeping Node.js fast and focused on business logic.

---

Next: [05-Level-5-Traefik-Multi-Project-Single-Machine.md](05-Level-5-Traefik-Multi-Project-Single-Machine.md) — Multi-Project Single Machine Architecture with Traefik!
