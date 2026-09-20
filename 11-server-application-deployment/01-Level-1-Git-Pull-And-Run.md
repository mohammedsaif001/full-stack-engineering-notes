# Level 1 — Clone, Install, Run
## Part 1 of 5 — The Simplest Possible Deployment

> Previous: [00c-Launching-Your-First-EC2-Instance.md](00c-Launching-Your-First-EC2-Instance.md)
> Next: [02-Level-2-PM2-Process-Manager.md](02-Level-2-PM2-Process-Manager.md)

---

## 📌 Executive Summary

- **Level 1 goal:** get your code from GitHub onto a cloud machine and running, so that anyone with the instance's public IP can hit it.
- No process manager, no Docker, no reverse proxy yet — deliberately. This level exists to prove the absolute basics work: SSH in, pull code, install deps, run it, open the port.
- **The catch you'll immediately hit:** the moment you close your SSH session, the app dies. That's the problem Level 2 solves.

---

## 🧠 Core Analogy

You've handed someone the keys to an empty apartment (the EC2 instance). Level 1 is just: walk in, plug in a lamp (`npm start`), leave the lamp on while you stand there. The moment you leave the room and let go of the switch, the light goes out. That's fine for a first test — not fine for anything real.

---

## 🛠️ 1. Prerequisites (from [00a](00a-Cloud-Fundamentals.md) & [00c](00c-Launching-Your-First-EC2-Instance.md))

1. An EC2 instance launched from an AMI (e.g., Ubuntu 22.04), with a **key pair** created/selected at launch — see [00c](00c-Launching-Your-First-EC2-Instance.md) for the exact click-by-click (or CLI) steps.
2. A **security group** allowing:
   - Port 22 (SSH) from your IP only.
   - Your app's port (e.g., 3000) from your IP, temporarily, just to prove external access works.
3. Your project pushed to a GitHub repository.

---

## 📥 2. SSH In and Install Node

```bash
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Once inside the instance (this is now *its* terminal, not your laptop's):

```bash
# Ubuntu/Debian example — install Node via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

node -v
npm -v
```

---

## 📦 3. Clone the Repository and Run It

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

npm install
npm start          # or: node index.js / node dist/index.js
```

If your app listens on, say, port 3000 (`app.listen(3000)`), and your security group allows inbound traffic on 3000 from anywhere, it is now reachable at:

```
http://<EC2_PUBLIC_IP>:3000
```

Anyone on the internet with that IP and port can hit your API right now.

---

## ⚠️ 4. The Problem With Level 1

Two things break this immediately:

1. **Close the terminal (or lose your SSH connection) → the process dies.** `npm start` is running in the *foreground* of your SSH session; the shell and the Node process are tied together. No terminal, no process.
2. **The app doesn't restart itself** if it crashes on an unhandled exception.

You *could* work around #1 with `nohup npm start &` or a detached `screen`/`tmux` session, but that's a hack, not a real solution — there's no automatic restart on crash, no log management, no "start this on server reboot."

That's exactly what a **process manager** is for — next file.

---

## ✅ Takeaways

- Level 1 is: SSH in → install Node/git → `git clone` → `npm install` → `npm start` → open the port in the security group.
- This proves the whole path works end-to-end (code → cloud machine → publicly reachable), but the process only survives as long as your SSH session does.
- Solving "keep it running after I disconnect, and restart it if it crashes" is Level 2.

Next: [02-Level-2-PM2-Process-Manager.md](02-Level-2-PM2-Process-Manager.md)
