# 🔄 Level 2 — Keeping Apps Alive with PM2 Process Manager
## Step 2 of 5 — Background Process Management

> Previous: [01-Level-1-Git-Pull-And-Run.md](01-Level-1-Git-Pull-And-Run.md)  
> Next: [03-Level-3-Dockerfile-And-Containers.md](03-Level-3-Dockerfile-And-Containers.md)

---

## 📌 Executive Summary

- **Level 2 Goal:** Fix the major flaw of Level 1 ("If I close SSH, the app dies") by running Node.js in background daemon mode.
- **The Solution:** **PM2** — a production process manager for Node.js applications.
- **Key Features:** PM2 runs apps silently in the background, auto-restarts them if they crash, logs output to files, and brings apps back online automatically if the server reboots.

---

## 🧠 Core Analogy: Installing a Permanent Power Switch

Level 1 was standing in the room holding the light switch.  
Level 2 is installing a hardwired, automatic smart switch (**PM2**). You can leave the room, lock the door, and travel home — PM2 stays inside the server 24/7, keeping the lights on and automatically replacing the bulb if it burns out!

---

## 🛠️ Step-by-Step PM2 Setup Guide

### 1️⃣ Step 1: Install PM2 Globally

Inside your EC2 server terminal:

```bash
sudo npm install -g pm2
```

### 2️⃣ Step 2: Start Your Application with PM2

Navigate to your cloned repository folder and launch your app with PM2:

```bash
# Basic start command
pm2 start index.js --name "my-node-app"

# Or if your app uses npm start:
pm2 start npm --name "my-node-app" -- start
```

Output:
```
┌────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬───────┐
│ id │ name           │ mode        │ status  │ restart │ uptime   │ cpu    │ mem   │
├────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼───────┤
│ 0  │ my-node-app    │ fork        │ online  │ 0       │ 2s       │ 0%     │ 24MB  │
└────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴───────┘
```

You can now close your terminal window completely! The application will stay online at `http://<EC2_PUBLIC_IP>:3000`! 🎉

---

## 🕹️ Essential PM2 Cheat-Sheet Commands

| Command | Action / Description |
|---|---|
| `pm2 list` | View status of all running background processes. |
| `pm2 logs` | Stream real-time console log outputs. |
| `pm2 restart my-node-app` | Restart a running application process. |
| `pm2 stop my-node-app` | Stop an application process without deleting it. |
| `pm2 delete my-node-app` | Stop and remove app from PM2 list. |
| `pm2 monit` | Open an interactive CPU and RAM monitoring dashboard. |

---

## ⚡ Ensuring Server Reboot Survival

If AWS reboots your EC2 instance for maintenance, PM2 can automatically resurrect your apps on startup:

```bash
# Generate and configure the startup script
pm2 startup

# Save the current list of running processes
pm2 save
```

Now, even if your EC2 instance loses power or reboots, your app will automatically launch when the machine boots back up!

---

## ⚠️ The Limit of Level 2: Multiple Service Overhead

PM2 works great for managing raw Node.js script processes. But real-world applications don't run in isolation — they rely on **multiple services**:
- Redis for caching
- MongoDB / PostgreSQL for database
- Kafka for messaging queue
- Caddy / Nginx for reverse proxies

**The Overhead Problem:** If you deploy using PM2, you have to manually install, configure, and maintain Redis, MongoDB, PostgreSQL, and Kafka natively on the server OS! If your local machine uses Redis 7.2 but your server apt repository installs Redis 6.0, your app will break due to environment mismatch!

**How do we guarantee identical environments for all services without manual install overhead?**  
👉 **Enter Level 3: Docker containers & Docker Compose!**

---

## ✅ Summary Takeaways

1. PM2 solves terminal disconnects by daemonizing Node.js processes in the background.
2. Setup requires `npm install -g pm2`, `pm2 start index.js`, `pm2 startup`, and `pm2 save`.
3. **Transition to Level 3:** When dealing with multiple dependencies (Redis, DBs, Kafka), Docker replaces manual setup and provides complete environment isolation.

---

Next: [03-Level-3-Dockerfile-And-Containers.md](03-Level-3-Dockerfile-And-Containers.md) — Containerizing your stack with Docker & Docker Compose.
