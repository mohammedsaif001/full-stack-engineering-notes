# 🐣 Level 1 — Git Pull & Run (Novice Deployment)
## Step 1 of 5 — The Simplest Possible Deployment

> Previous: [00c-Launching-Your-First-EC2-Instance.md](00c-Launching-Your-First-EC2-Instance.md)  
> Next: [02-Level-2-PM2-Process-Manager.md](02-Level-2-PM2-Process-Manager.md)

---

## 📌 Executive Summary

- **Level 1 Goal:** Prove the path end-to-end! Clone a GitHub repository onto your EC2 server, install dependencies, run `npm start`, and access it over the internet.
- **Level 1 Architecture:** No process manager, no Docker, no reverse proxy — just raw Node.js running directly on the cloud server OS.
- 🚨 **The Major Catch:** The moment you close your SSH terminal session or step away from your laptop shell, **your Node server immediately stops running!**

---

## 🧠 Core Analogy: Holding the Light Switch

Level 1 is like walking into an empty cloud room, flipping on a lamp switch (`npm start`), and keeping your finger pressed on the switch while standing there. The second you let go and leave the room (close your SSH connection), the lights go completely dark.

---

## 🛠️ Hands-on Step-by-Step Execution

### 1️⃣ Step 1: SSH into your EC2 Instance

```bash
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 2️⃣ Step 2: Install Node.js & Git on the Server

Inside your EC2 server shell:

```bash
# Update package lists and install Node.js 22 LTS & Git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Verify installation
node -v
npm -v
git --version
```

### 3️⃣ Step 3: Clone Your GitHub Repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 4️⃣ Step 4: Install Dependencies & Run the Application

```bash
npm install
npm start
```

If your Node.js app runs on port `3000` (`app.listen(3000)`), you can now open your web browser and visit:

```
http://<EC2_PUBLIC_IP>:3000
```

🎉 It works! Your application is live on the internet!

---

## ⚠️ Why Level 1 Fails in Real Production

Try this test: **Close your terminal window or press `Ctrl + C`.**

Now try refreshing `http://<EC2_PUBLIC_IP>:3000` in your browser.  
🚨 **The page fails to load!**

### Why did it stop?
1. **Foreground Shell Execution:** When you run `npm start`, the process runs attached to your active SSH session standard output (stdout/stdin).
2. **Terminal Disconnect:** When you log out of SSH, the OS sends a `SIGHUP` (Signal Hangup) to kill all child processes running under that shell session.
3. **No Crash Recovery:** If an unhandled exception or error occurs in your code, Node crashes and stays dead.

---

## ✅ Summary Takeaways

- Level 1 proves your code can run on a remote cloud machine accessible via IP and Port.
- Running `npm start` directly in SSH is strictly for temporary testing.
- **Problem Statement:** *"If I come out of the shell, it will stop!"*
- **Solution:** We need a process manager that runs Node.js silently in the background — **Enter Level 2 (PM2)!**

---

Next: [02-Level-2-PM2-Process-Manager.md](02-Level-2-PM2-Process-Manager.md) — Keeping Node.js apps alive using PM2.
