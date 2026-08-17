# Computer Networks: TCP, UDP & Application Layer Protocols
## Part 2 — After DNS Resolves the IP, How Does Data Actually Travel?

---

## 📌 Executive Summary

Once DNS resolves a domain to an IP address (e.g., `198.9.9.9`), a device needs to actually **send and receive data** with that server.

There are two fundamental ways to transport data across a network:

> **TCP** — reliable, ordered, but slower (handshake + retransmission overhead)
> **UDP** — fast, no guarantees, but lower latency (no handshake, no retransmission)

Almost everything that happens online rides on top of one of these two protocols. Choosing between them is a genuine engineering trade-off: **reliability vs. speed**.

---

## 🧠 Core Analogy: Registered Post vs. Postcard

- **TCP** = **Registered mail with tracking.** The post office confirms delivery, resends anything lost, and delivers pages in the exact order they were written. Slower, but nothing goes missing.
- **UDP** = **Throwing postcards into the wind.** Fast and cheap, but some may never arrive, arrive out of order, or get duplicated. Nobody's tracking them.

For a bank transfer, registered mail (TCP) is worth the wait. For a live video call, where a 200ms-old frame is already useless, it's better to drop it and move to the next one (UDP).

---

## 🔀 TCP vs UDP: Side-by-Side

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connection** | Connection-oriented (handshake required) | Connectionless (no handshake) |
| **Reliability** | Guaranteed delivery (retransmits lost packets) | Best-effort (lost packets are just gone) |
| **Ordering** | Packets arrive in the order sent | No ordering guarantee |
| **Speed** | Slower (overhead from handshake, ACKs, retransmission) | Faster (minimal overhead) |
| **Flow Control** | Yes (prevents overwhelming the receiver) | No |
| **Congestion Control** | Yes (backs off when the network is busy) | No |
| **Header Size** | 20 bytes | 8 bytes |
| **Use Case** | Web pages, APIs, file transfer, email | Video calls, live streaming, gaming, DNS queries |

**Why UDP is faster:** it skips the handshake, skips waiting for acknowledgments, and skips reordering packets. It just fires data and moves on. That's exactly why it's unreliable — there's no mechanism checking whether anything arrived.

---

## 🤝 The TCP 3-Way Handshake

Before any TCP data flows, the client and server must agree to talk. This is the handshake:

```
Client                          Server
  |                                |
  |------------ SYN ------------->|   "I'd like to connect. My starting sequence number is X."
  |                                |
  |<--------- SYN-ACK ------------|   "Got it. I acknowledge X+1. My starting sequence number is Y."
  |                                |
  |------------ ACK ------------->|   "Acknowledged. I confirm Y+1. Let's talk."
  |                                |
  |======= Connection Open =======|
```

**The 3 steps, precisely:**

1. **SYN** (Synchronize) — Client → Server: "Can we start a connection?"
2. **SYN-ACK** (Synchronize-Acknowledge) — Server → Client: "Yes, and I acknowledge your request." This is a **single combined packet**, not two separate ones — a common point of confusion when sketching this out.
3. **ACK** (Acknowledge) — Client → Server: "Confirmed. Connection established."

Only after all three steps complete can actual data (HTTP requests, file bytes, etc.) start flowing.

**Closing a connection** is a separate 4-way process (FIN, ACK, FIN, ACK) — TCP is polite on the way in and on the way out.

---

## 🌐 The OSI Model (High-Level)

The OSI (Open Systems Interconnection) model is a **conceptual 7-layer framework** describing how network communication works. Memorizing every layer's internals isn't necessary, but knowing where things sit clarifies a lot of confusion (e.g., "is HTTP the same as TCP?" — no, they're different layers, covered below).

| Layer | Name | What Lives Here | Example |
|---|---|---|---|
| 7 | **Application** | What the user-facing software actually needs | HTTP, FTP, SMTP, DNS |
| 6 | **Presentation** | Data formatting, encryption, compression | TLS/SSL, JPEG, ASCII |
| 5 | **Session** | Managing conversations/sessions between apps | Session tokens, API sessions |
| 4 | **Transport** | End-to-end delivery, reliability | **TCP, UDP** |
| 3 | **Network** | Routing across networks | IP, routers |
| 2 | **Data Link** | Node-to-node delivery on the same network | Ethernet, WiFi (MAC addresses) |
| 1 | **Physical** | Actual bits over wires/radio | Cables, fiber, radio waves |

**Simplified real-world mapping (TCP/IP 4-layer model, what's actually used in practice):**

```
Application  →  HTTP, FTP, SMTP, DNS         (Layer 7 equivalent)
Transport    →  TCP, UDP                      (Layer 4)
Internet     →  IP (routing, addressing)      (Layer 3)
Network      →  Ethernet, WiFi                (Layers 1-2)
```

**Key clarity point:** HTTP is an **Application layer** protocol. TCP is a **Transport layer** protocol. HTTP *runs on top of* TCP — they are not the same thing, and one doesn't replace the other.

---

## 📡 Application Layer Protocols: HTTP, FTP, SMTP

All three of these are **Application layer protocols** — meaning they define the *rules of conversation* for a specific purpose. All three historically run on top of **TCP**, because they need reliability.

| Protocol | Full Name | Purpose | Default Port | Runs On |
|---|---|---|---|---|
| **HTTP** | HyperText Transfer Protocol | Request/serve web pages and API data | 80 (HTTPS: 443) | TCP (or QUIC/UDP for HTTP/3) |
| **FTP** | File Transfer Protocol | Upload/download files | 21 (control), 20 (data) | TCP |
| **SMTP** | Simple Mail Transfer Protocol | Send email between mail servers | 25 (or 587 for submission) | TCP |
| **DNS** | Domain Name System | Resolve domain names to IPs | 53 | **UDP** (mostly), TCP for large responses/zone transfers |

**Why they're "different" even though they all use TCP:** the transport protocol (TCP) only guarantees the *bytes* arrive correctly. What those bytes *mean* is entirely defined by the application protocol on top:
- HTTP bytes mean: "GET this URL, here's a status code and HTML body back."
- FTP bytes mean: "Here's a filename, upload/download it, here's a directory listing."
- SMTP bytes mean: "MAIL FROM, RCPT TO, DATA — here's an email body."

**DNS is the exception worth calling out:** it doesn't follow the "always TCP" pattern most application protocols use. Most DNS queries use **UDP**, because a query/response pair is small and speed matters more than guaranteed delivery — if a query is lost, the resolver simply retries. DNS only switches to TCP for larger responses (e.g., DNSSEC-signed records) or zone transfers between nameservers.

---

## 🌐 Subdomains: Why "www" Exists, and Why api / images / mail Are Different

A domain like `example.com` is called the **apex** (or root) domain. On top of it, unlimited **subdomains** can be created by simply prefixing a label:

```
example.com           ← apex domain
www.example.com        ← subdomain
api.example.com        ← subdomain
images.example.com     ← subdomain
mail.example.com       ← subdomain
blog.example.com       ← subdomain
```

Each subdomain is its own independent DNS entry. It can point to a completely different IP address, a different hosting provider, or an entirely different piece of infrastructure, while still sharing the same recognizable brand domain.

### Where "www" Came From

In the early web, a single organization often ran several services on one domain: a website, an FTP server, a mail server, sometimes other early internet protocols. The convention that emerged was to put each service on its own subdomain:

- `www.example.com` → World Wide Web server (HTTP/HTTPS)
- `ftp.example.com` → File Transfer Protocol server
- `mail.example.com` → Mail server

"www" was never a technical requirement — it's a naming convention that stuck. It simply signals: "this is the subdomain serving web pages," distinguishing it from other services (FTP, mail) the same organization might also run.

### A Technical Reason "www" Still Persists Today

There's also a DNS-specific reason many sites keep a `www` version around: the **apex (root) of a domain cannot use a `CNAME` record**. This is a DNS specification rule — the apex must hold other required records (like SOA and NS), and those can't coexist with a CNAME at the same name. In practice this means:

- `example.com` (apex) can only use an **A record** — a fixed IP address.
- `www.example.com` (a subdomain) can use a **CNAME**, pointing to a flexible target like a CDN or hosting provider (e.g., `cname.vercel-dns.com`), which can change its underlying IP anytime without anyone touching DNS.

This is exactly why many hosting providers (Vercel, Netlify, GitHub Pages) ask for a `CNAME` on the `www` subdomain but require an `A` record — or a provider-specific workaround like ALIAS/ANAME/CNAME-flattening — on the bare apex domain.

### Subdomains as Independent Services

The same principle scales to modern architecture. A single domain is often split across subdomains that each serve a distinct purpose and may run on entirely separate infrastructure:

| Subdomain | Typical Purpose | Might Be Hosted On |
|---|---|---|
| `www.example.com` | Main marketing website | Webflow, Vercel, WordPress |
| `api.example.com` | Backend API server | AWS, a container cluster |
| `images.example.com` / `cdn.example.com` | Static assets, images, video | A CDN (Cloudflare, CloudFront) |
| `mail.example.com` | Email service | Google Workspace, Microsoft 365 |
| `blog.example.com` | Company blog | A different platform entirely (Ghost, Medium) |
| `status.example.com` | Uptime/status page | A third-party status page service |

Each subdomain resolves through the exact same DNS hierarchy (Recursive Resolver → Root → TLD → Authoritative). The only difference between subdomains is which specific record the Authoritative server returns for that particular label.

**Why this matters architecturally:** it's the same loose-coupling principle behind splitting a registrar, DNS provider, and web host across different companies. A website, API, image storage, and email can each be run by different teams on entirely different providers, with no direct coordination between them — DNS is the only thing tying them together under one brand domain.

---

## 🔒 HTTP vs HTTPS

| | HTTP | HTTPS |
|---|---|---|
| **Full name** | HyperText Transfer Protocol | HTTP **Secure** |
| **Encryption** | None — plain text | TLS/SSL encrypted |
| **Port** | 80 | 443 |
| **Handshake** | TCP 3-way handshake only | TCP handshake **+** TLS handshake |
| **Data visibility** | Anyone snooping the network can read it | Encrypted — only client and server can read it |
| **Certificate** | Not required | Requires an SSL/TLS certificate from a trusted CA |

**The relationship, precisely:** HTTPS is not a different protocol from HTTP — it's **HTTP running inside a TLS-encrypted tunnel**. The HTTP request/response format is identical; only the transport is wrapped in encryption. This is the same TLS handshake step that happens during a full page load, right after the TCP handshake and before any HTTP request is sent.

---

## ⚖️ TCP vs HTTP

These two are often confused because they're constantly mentioned together, but they sit at completely different layers:

- **TCP** = Transport layer. Handles *how bytes get delivered reliably* between two machines. Doesn't know or care what the bytes mean.
- **HTTP** = Application layer. Defines *what the bytes mean* — methods (GET, POST), status codes (200, 404), headers, body format. HTTP needs a transport underneath it to actually move those bytes — that transport is normally TCP.

**Analogy:** TCP is the postal service guaranteeing an envelope arrives intact and in order. HTTP is the *language and format* of the letter inside the envelope (a request form with a specific structure). The postal service doesn't read the letter; it just delivers it.

**Exception worth knowing:** HTTP/3 breaks this pattern — it runs over **QUIC**, which is built on **UDP**, not TCP. QUIC reimplements reliability and ordering *inside* UDP (application-layer reliability instead of transport-layer), mainly to avoid a problem called "head-of-line blocking" that plain TCP has. So the "HTTP always uses TCP" rule has one major modern exception.

---

## 🎥 TCP vs UDP in Practice: What Actually Uses Which

| Use Case | Protocol | Why |
|---|---|---|
| **Web browsing (HTML, JSON APIs)** | TCP (HTTP/HTTPS) | A missing/corrupted byte in an API response breaks the whole payload — reliability matters more than speed |
| **File downloads** | TCP (FTP, HTTP) | Every byte of a file must arrive correctly |
| **Email** | TCP (SMTP) | A dropped word in an email is unacceptable |
| **On-demand video (Netflix, YouTube)** | **TCP** (HTTPS, adaptive bitrate chunks) | Common misconception: this is TCP-based, not UDP. It's essentially downloading small video segments over HTTPS and buffering them |
| **Live video calls (Zoom, WebRTC)** | **UDP** (RTP over UDP) | A frame that arrives late is useless anyway — better to drop it and show the next one than pause the whole call waiting for a retransmit |
| **Online gaming** | UDP | Same logic — a stale position update is worse than a missing one |
| **DNS queries** | UDP (mostly) | Query/response is tiny, speed matters, and a lost query is cheap to just retry |

### Common Misconception: Zoom's UDP/TCP Usage

A common misconception is that Zoom (or similar video call platforms) switches between UDP and TCP depending on whether a participant is speaking, listening, or sharing their screen. That's not how it works.

- Zoom's real-time audio, video, **and** screen share all prefer **UDP**, in **both directions**, regardless of who is speaking, listening, or sharing. Latency matters symmetrically — the person listening needs audio in real time just as much as the person speaking needs it delivered.
- Zoom only **falls back to TCP** when UDP traffic is blocked by a restrictive firewall/network (common on corporate networks). This is a **network-condition fallback**, not a role-based (speaker vs. listener) choice.
- TCP-as-fallback is slower and can cause the lag/freezing sometimes seen on strict corporate networks — that's usually a sign the call got pushed onto TCP.

---

## 🔌 WebSockets: A Persistent Two-Way Pipe Over TCP

Regular HTTP is **request → response, then the connection is done**. If the server has new data 10 seconds later, it has no way to push it — the client has to ask again (polling).

**WebSockets** solve this by upgrading a single TCP connection into a **persistent, full-duplex channel** that stays open, so either side can send data to the other **at any time**, without re-asking.

### How the Upgrade Happens

1. The client sends a normal HTTP request, but with special headers:
   ```
   GET /chat HTTP/1.1
   Host: example.com
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   ```
2. The server agrees and responds:
   ```
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   ```
3. From this point on, it's **no longer HTTP** — the same underlying TCP connection is repurposed as a raw, persistent WebSocket pipe. Both sides can send messages whenever they want, in either direction, with no new handshake per message.

### WebSocket vs Plain HTTP

| | HTTP | WebSocket |
|---|---|---|
| **Connection lifetime** | Opens and closes per request | Stays open (persistent) |
| **Direction** | Client asks, server answers (one-way trigger) | Full-duplex — either side pushes anytime |
| **Overhead per message** | Full headers every request | Tiny frame overhead after the initial handshake |
| **Transport** | TCP | TCP (starts as HTTP, then upgrades) |
| **Typical use** | Loading pages, REST APIs | Live chat, live notifications, collaborative editing, live dashboards/stock tickers |

**Analogy:** HTTP is like sending a letter and waiting for a reply letter each time. A WebSocket is like opening a phone line and leaving it connected — either person can talk whenever they want without redialing.

**Important:** WebSockets still run on **TCP**, so they're reliable and ordered — just not "request/response" shaped anymore. This differs from WebRTC below, which typically uses UDP.

---

## 📹 WebRTC: Peer-to-Peer Audio, Video & Data in the Browser

**WebRTC (Web Real-Time Communication)** is the technology that powers browser-based video calls — direct **peer-to-peer** audio/video/data between browsers, without routing every frame through a central server.

### Why WebRTC Exists

Before WebRTC, real-time video in a browser needed a plugin (Flash, Java applets). WebRTC made it a native browser capability — an API grabs camera/mic access, then a peer connection handles the rest.

### What WebRTC Uses Underneath

| Component | Protocol | Purpose |
|---|---|---|
| **Media (audio/video)** | **RTP over UDP** | Real-time transport — same reasoning as any live call: a late frame is worse than a dropped one |
| **Signaling** (negotiating the call before it starts — exchanging an offer and network info) | Not standardized by WebRTC itself — usually **WebSockets or HTTP** | The two peers need to exchange metadata *before* they can talk directly; that exchange happens through a regular server |
| **NAT Traversal** | **STUN / TURN / ICE** (still over UDP, sometimes TCP as a last resort) | Most devices sit behind home routers (NAT) with no public IP — STUN discovers the public-facing address, TURN relays traffic if a direct peer-to-peer path is impossible |

### The Full Picture: How a Browser Video Call Actually Starts

1. **Signaling (via WebSocket or HTTPS):** The two browsers exchange connection info (codecs supported, network candidates) through a regular server — this part is often built on WebSockets because it needs to be fast and bidirectional.
2. **ICE/STUN/TURN negotiation:** Both browsers figure out the most direct path to reach each other despite sitting behind routers/firewalls.
3. **Peer-to-peer media starts:** Once a path is found, actual audio/video flows **directly between the two browsers** (not through the server) using **RTP over UDP**.
4. **TURN relay (fallback):** If a direct peer-to-peer path truly isn't possible (a strict corporate firewall, for example), a TURN server relays the media — slower, since it's now a 3-hop path instead of a direct one.

This is the same architecture idea behind the Zoom UDP/TCP fallback behavior described earlier — UDP peer-to-peer when possible, relayed/TCP fallback when the network won't allow direct UDP.

### WebSocket vs WebRTC — Don't Confuse Them

| | WebSocket | WebRTC |
|---|---|---|
| **Transport** | TCP | UDP (media), TCP/UDP (signaling varies) |
| **Topology** | Client ↔ Server | Peer ↔ Peer (direct, server only helps set it up) |
| **Best for** | Chat, live notifications, dashboards | Video/audio calls, screen share, low-latency data channels |
| **Reliability** | Fully reliable (it's TCP) | Media is best-effort/lossy by design |

---

## 💡 Cheat Sheet: Quick Reference

| Term | One-Line Definition |
|---|---|
| **TCP** | Reliable, ordered, connection-based transport (handshake required) |
| **UDP** | Fast, unreliable, connectionless transport (no handshake) |
| **3-Way Handshake** | SYN → SYN-ACK → ACK, establishes a TCP connection before data flows |
| **OSI Model** | 7-layer conceptual map of networking (Physical → Application) |
| **HTTP** | Application-layer protocol for requesting/serving web resources, runs on TCP (or QUIC/UDP for HTTP/3) |
| **HTTPS** | HTTP wrapped in a TLS-encrypted tunnel |
| **FTP** | Application-layer protocol for file transfer, runs on TCP |
| **SMTP** | Application-layer protocol for sending email, runs on TCP |
| **DNS** | Application-layer protocol for name resolution, runs mostly on UDP |
| **Subdomain** | An independent DNS label under an apex domain (`www`, `api`, `images`), each can point anywhere |
| **QUIC** | Modern transport built on UDP that adds TCP-like reliability at the application layer — powers HTTP/3 |
| **WebSocket** | Persistent, full-duplex channel upgraded from an HTTP connection, still runs on TCP |
| **WebRTC** | Peer-to-peer audio/video/data API for browsers, media runs on UDP (RTP), signaling usually over WebSockets |
| **STUN/TURN/ICE** | Helper protocols WebRTC uses to find a path through NAT/firewalls between two peers |

---

## 🎯 Key Takeaways

1. **TCP and UDP solve the same problem (moving data) with opposite priorities** — TCP prioritizes correctness, UDP prioritizes speed.

2. **The 3-way handshake is TCP-only.** UDP has no handshake — it's why UDP is faster but also why nothing guarantees delivery.

3. **HTTP ≠ TCP.** HTTP is application layer (what the data means), TCP is transport layer (how the data physically gets there reliably). HTTP normally rides on TCP, except HTTP/3, which rides on UDP-based QUIC.

4. **HTTPS = HTTP + TLS.** Same request/response format, just encrypted in transit.

5. **"Video" isn't one category.** On-demand streaming (Netflix) is TCP-based. Live/real-time video (calls) is UDP-based. The deciding factor is whether a late packet is still useful (on-demand: yes, buffer and wait) or useless (live: no, drop and move on).

6. **DNS quietly uses UDP** — this is *why* DNS lookups are so fast (roughly 15-30ms even on a cold cache): no handshake overhead, just a quick fire-and-response.

7. **"www" is a naming convention, not a requirement** — it historically separated the web server from other services (FTP, mail) on the same domain, and persists today partly because DNS won't allow a CNAME at the apex domain.

8. **Subdomains let one company split its infrastructure freely** — `api.`, `images.`, `mail.` can each run on entirely different providers without coordinating with each other.

9. **Zoom's (and WebRTC's) TCP fallback is about network conditions, not the participant's role in the call.**

10. **WebSockets upgrade a single TCP connection into a persistent two-way pipe** — no more request/reply-only HTTP, either side can push data anytime.

11. **WebRTC is peer-to-peer, WebSocket is client-server.** WebRTC uses a signaling server (often over WebSockets) just to set up the call, then the actual audio/video flows directly between the two browsers over UDP.

---

## 📚 Related Concepts to Explore Next

- **QUIC & HTTP/3** — how UDP got reliability bolted back on for the modern web
- **Congestion control algorithms** — TCP Reno, CUBIC, BBR (how TCP decides how fast to send without flooding the network)
- **Server-Sent Events (SSE)** — a lighter one-way alternative to WebSockets (server → client push only, over plain HTTP)
- **SDP (Session Description Protocol)** — the format WebRTC uses during signaling to describe codecs/network candidates
- **Socket.IO** — a popular library built on top of WebSockets (with automatic fallbacks) — a library, not a protocol itself
- **CNAME flattening / ALIAS / ANAME records** — how modern DNS providers work around the apex-domain CNAME restriction

---

**Last updated:** 2026-08-03
**Author:** Mohammed Saif
**LinkedIn:** linkedin.com/in/mohammedsaif001/
**Series:** Part 2 of Computer Networks Deep Dive (Part 1: DNS)
