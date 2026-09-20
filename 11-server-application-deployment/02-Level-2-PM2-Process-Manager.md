# Level 2 — Keeping the Process Alive With PM2
## Part 2 of 5 — Surviving Disconnects and Crashes

> Previous: [01-Level-1-Git-Pull-And-Run.md](01-Level-1-Git-Pull-And-Run.md)
> Next: [03-Level-3-Dockerfile-And-Containers.md](03-Level-3-Dockerfile-And-Containers.md)

---

## 📌 Executive Summary

- **PM2** is a process manager for Node.js apps. It runs your app as a **background (daemon) process**, detached from your SSH session — closing the terminal no longer kills it.
- PM2 also **auto-restarts** the app if it crashes, and can be configured to start automatically if the whole EC2 instance reboots.
- This solves exactly the problem Level 1 ended on, with almost no extra setup: `npm install -g pm2`, then `pm2 start` instead of `npm start`.

---

## 🧠 Core Analogy

Level 1 was holding a lamp switch down with your own hand — the second you walk away (close SSH), the light goes off. PM2 is like installing an actual wall switch with its own power supply: it stays on regardless of whether you're in the room, and if the bulb blows, it automatically screws in a new one (auto-restart on crash).

---

## ⚙️ 1. Installing and Using PM2

```bash
npm install -g pm2
```

Instead of `npm start` / `node index.js`, start your app under PM2:

```bash
pm2 start index.js --name my-api
# or, for a project whose start script is `node dist/index.js`:
pm2 start npm --name my-api -- start
```

Now you can safely close the SSH session — the process keeps running under PM2's own daemon.

---

## 🔍 2. Everyday PM2 Commands

| Command | Purpose |
|---|---|
| `pm2 list` / `pm2 status` | See all managed processes, their status, CPU/memory |
| `pm2 logs my-api` | Tail logs for one app |
| `pm2 restart my-api` | Restart (e.g., after a new `git pull`) |
| `pm2 stop my-api` | Stop without removing it from PM2's list |
| `pm2 delete my-api` | Remove it entirely |
| `pm2 monit` | Live dashboard of CPU/memory per process |

---

## 🔁 3. Surviving a Full Instance Reboot

By default, if the EC2 instance itself restarts, PM2's daemon (and thus your app) won't come back automatically. Fix that once:

```bash
pm2 startup      # prints a command — copy/paste and run it (sets up a systemd service)
pm2 save         # snapshots the current process list
```

Now on every boot, PM2's systemd service starts and PM2 relaunches every app that was running when you last ran `pm2 save`.

---

## 🔄 4. The Redeploy Loop at This Level

```bash
cd my-repo
git pull
npm install        # only needed if dependencies changed
pm2 restart my-api
```

This is still fully manual — you SSH in and run these by hand every time you ship a change. Automating this loop is what [CI/CD (GitHub Actions)](06-CICD-GitHub-Actions.md) is for.

---

## ⚠️ 5. Where Level 2 Starts to Strain

PM2 solves *process* lifecycle, but not *environment* consistency:

- If your app also needs Redis, Postgres, Kafka, etc., you now have to manually install and configure each one **directly on the EC2 instance's OS** — a slow, error-prone, "works on my machine" setup you'd have to repeat identically on every new instance.
- There's no isolation between services; a bad `apt` upgrade or a leftover global npm package can break things in ways that are hard to reproduce locally.

That's the exact problem **Docker** solves — same image runs identically on your laptop and the server, no manual reinstallation of dependencies. Next level.

---

## ✅ Takeaways

- **PM2** = a background process manager for Node: `pm2 start`, survives SSH disconnects, auto-restarts on crash.
- `pm2 startup` + `pm2 save` makes your app survive a full instance reboot too.
- Redeploying is still `git pull` → `pm2 restart` by hand at this level — manual, but no longer fragile.
- PM2 does **not** solve "I have multiple services (DB, cache, queue) that need identical, reproducible environments" — that's what Docker (Level 3) is for.

Next: [03-Level-3-Dockerfile-And-Containers.md](03-Level-3-Dockerfile-And-Containers.md)
