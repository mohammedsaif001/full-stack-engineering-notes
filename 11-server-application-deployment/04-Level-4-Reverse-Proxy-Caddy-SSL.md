# Level 4 — Reverse Proxy, Caddy, and SSL
## Part 4 of 5 — A Clean Domain and HTTPS

> Previous: [03-Level-3-Dockerfile-And-Containers.md](03-Level-3-Dockerfile-And-Containers.md)
> Next: [05-Level-5-Traefik-Multi-Project-Single-Machine.md](05-Level-5-Traefik-Multi-Project-Single-Machine.md)

---

## 📌 Executive Summary

- **HTTP** defaults to **port 80**; **HTTPS** defaults to **port 443**. If your app listens on neither, visitors must type an ugly `:3000` in the URL.
- To serve `https://yourdomain.com` properly, you need an **SSL/TLS certificate** — a signed credential that lets browsers verify your server's identity and encrypt traffic to it.
- Your Node app should **not** be the thing managing that certificate and terminating HTTPS — that's an infrastructure concern that doesn't belong mixed into application code. This is solved with a **reverse proxy**.
- **Caddy** is a reverse proxy that sits in front of your app, listens on 80/443, automatically obtains and renews a free SSL certificate (via Let's Encrypt), and forwards plain HTTP internally to your app container.
- Because Caddy and your app both run as Docker containers on the same **Docker network**, Caddy can also **load-balance across multiple instances of your app** by just naming the service — setting up the exact same pattern as an AWS ALB + target group ([00b](00b-Load-Balancing-And-CDN.md)), but on a single machine.

---

## 🧠 Core Analogy: A Building Receptionist

Your Node app is an employee who only speaks through internal extension 3000 — no direct outside line. **Caddy is the receptionist at the front desk**: the public dials one well-known number (443, the domain), the receptionist checks ID/credentials (SSL handshake) on the visitor's behalf, then transfers the (now-verified, decrypted) call internally to whichever employee (container) is free. The employee never has to deal with the outside phone line's complexity directly.

---

## 🔐 1. What SSL/TLS Actually Buys You

**SSL (Secure Sockets Layer)** / its modern successor **TLS** is what turns `http://` into `https://`. A **certificate** is a signed file proving "this domain is who it claims to be," issued by a trusted **Certificate Authority** (e.g., Let's Encrypt). With it:

- Traffic between browser and server is **encrypted** (no one on the network path can read it).
- The browser can **verify identity** — you're actually talking to `yourdomain.com`, not an imposter.

Without it, browsers mark your site "Not Secure," and some browser features (geolocation, service workers, etc.) refuse to work at all.

---

## ❌ 2. Why *Not* Terminate SSL in Your Node App

**SSL termination** = the act of decrypting incoming HTTPS into plain HTTP. Technically your Node app *could* load a certificate and do this itself — but you shouldn't, because:

- Your application server would now also be responsible for **certificate renewal** (Let's Encrypt certs expire every 90 days) — an infrastructure job leaking into app code.
- It couples your business logic to networking/crypto concerns that have nothing to do with what your API actually does.
- It makes scaling to multiple app instances awkward — each one would need the cert and renewal logic independently.

**The fix:** put a reverse proxy in front that owns SSL entirely, and let your app only ever speak plain HTTP on an internal port.

---

## 🌀 3. What Caddy Is

**Caddy** is a web server / reverse proxy, notable for:

- **Automatic HTTPS** — point it at a domain, and it obtains and renews a Let's Encrypt certificate for you with essentially zero configuration.
- Acts as a **reverse proxy**: receives the public request on 443, forwards it internally (plain HTTP) to your app.
- Can also act as a **load balancer** across multiple backend containers — same concept as [ELB + target groups](00b-Load-Balancing-And-CDN.md), just running yourself, on one box.

### Request flow with Caddy in place

```
User ──HTTPS(443)──▶ Caddy (holds the SSL cert) ──HTTP──▶ Node app container(s)
```

Caddy talks to the outside world encrypted; internally, on the private Docker network, plain HTTP is fine because that traffic never leaves the machine.

---

## 🐳 4. Running Caddy via Docker Compose

Add Caddy as another service, on the **same Docker network** as your app, so it can reach it by service name:

```yaml
# docker-compose.yml
services:
  api:
    build: .
    expose:
      - "3000"          # only exposed to other containers on this network, not the host
    restart: unless-stopped
    networks:
      - webnet

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data        # persists SSL certs across restarts
      - caddy_config:/config
    networks:
      - webnet

networks:
  webnet:

volumes:
  caddy_data:
  caddy_config:
```

The `Caddyfile` (Caddy's config file) is remarkably short:

```
yourdomain.com {
    reverse_proxy api:3000
}
```

- `yourdomain.com` — the domain to serve (and to auto-provision an SSL cert for).
- `reverse_proxy api:3000` — forward requests to the container named `api` (Docker's internal DNS resolves service names automatically inside the `webnet` network), on its internal port 3000.

That's it — no manual certbot, no cron job for renewal. `docker compose up -d` and Caddy handles SSL issuance/renewal on its own.

### Load-balancing multiple app instances

```
yourdomain.com {
    reverse_proxy api1:3000 api2:3000 api3:3000
}
```

Caddy will distribute requests across all three by default (round robin) — the single-machine equivalent of an ALB + target group.

---

## 🌍 5. Domain + Machine, the Two Prerequisites

To get to `https://yourdomain.com`, two things must exist and be linked:

1. **A machine with a public IP** (your EC2 instance).
2. **A domain**, with its DNS **A record** pointed at that IP (bought from any registrar — Route 53, Namecheap, GoDaddy, etc.).

Caddy needs the domain's DNS already pointing at the machine *before* it can request a certificate — Let's Encrypt validates ownership by reaching the domain over HTTP first.

---

## ✅ Takeaways

- HTTP defaults to port **80**, HTTPS to **443** — mapping your app directly to one of these (via a proxy) is what gives you a clean `https://domain.com` URL with no port number.
- SSL/TLS certificates encrypt traffic and prove server identity; **terminate SSL at a reverse proxy, not inside your application code.**
- **Caddy** is a reverse proxy that automatically obtains/renews SSL certs and forwards requests internally over plain HTTP.
- Put Caddy and your app on the same **Docker network**; reference your app by its Compose **service name** in the Caddyfile.
- Caddy can **load-balance across multiple app containers** just by listing them — the same idea as an AWS load balancer + target group, run yourself on a single machine.
- Still unsolved: what if you want to host **multiple different projects** on this one machine, each with its own domain? That's Level 5.

Next: [05-Level-5-Traefik-Multi-Project-Single-Machine.md](05-Level-5-Traefik-Multi-Project-Single-Machine.md)
