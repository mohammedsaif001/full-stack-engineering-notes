# ☁️ Cloud Fundamentals — Machines, EC2, SSH Keys & Security Groups
## Part 0a — Setting Up Your Cloud Foundation

> Next: [00b-Load-Balancing-And-CDN.md](00b-Load-Balancing-And-CDN.md)

---

## 📌 Executive Summary

- A **Server** is simply a computer that stays powered on 24/7 and is connected to the internet. **AWS EC2** (Elastic Compute Cloud) lets you rent these computers virtually.
- An **Instance** is one running virtual machine created from an **AMI** (Amazon Machine Image — a snapshot recipe of OS + preinstalled software).
- **SSH (Secure Shell)** lets you securely log into your remote instance's command terminal using asymmetric keys: a **Private Key** (kept secret on your computer) and a **Public Key** (placed on the cloud server).
- **Security Groups** act as virtual firewalls with **Inbound Rules** (who can talk to your server) and **Outbound Rules** (who your server can talk to).
- **CIDR Blocks** define IP ranges. While public web traffic (Ports 80/443) should be accessible to everyone (`0.0.0.0/0`), SSH administrative access (Port 22) should be locked strictly to your own internal CIDR IP (e.g., your home or Jio network IP).

---

## 🧠 Core Analogy: Renting a Secure Apartment

- **EC2** = The property management company renting out apartments.
- **AMI** = The furnished floor plan you choose (e.g., Ubuntu + Node.js installed).
- **Instance** = The actual physical apartment unit you get the keys for.
- **SSH Keys** = A high-security lock system.
  - 🔑 **Private Key:** Stays in your pocket locally. Never give it to anyone!
  - 🔒 **Public Key:** Mounted on the apartment door (server). Only your private key can unlock it.
- **Security Group (Firewall)** = The building gatekeeper rules:
  - *Public Visitor Access (Port 80/443):* Anyone from the public internet can enter the lobby (`0.0.0.0/0`).
  - *Private Admin Access (Port 22 SSH/Bash):* Only YOU coming from your specific personal IP address range (your home/Jio CIDR) are allowed to use the private master elevator.

---

## 🖥️ 1. What is a "Machine" in the Cloud?

| Term | What It Is | Analogy |
|---|---|---|
| **Physical Server** | Real metal computer in an AWS data center. | A whole physical building. |
| **Virtual Machine (VM)** | Software-emulated computer running inside a physical server. | An apartment inside the building. |
| **EC2 Instance** | AWS's name for one running VM instance. | Your specific rented apartment unit. |
| **AMI** | Blueprint image used to boot an instance. | The apartment floor plan & furniture style. |
| **Container (Docker)** | Lightweight isolated process sharing the host kernel (much smaller/faster than a VM). | Portable storage boxes inside your apartment. |

---

## 🔑 2. SSH Keys — Securely Connecting to Your Cloud Server

To control your EC2 instance remotely via command line, you use **SSH (Secure Shell)**. Authentication works via asymmetric public/private encryption keys:

1. **Private Key (`id_ed25519` or `key.pem`):** Kept ONLY on your local machine. Never upload, share, or commit to Git!
2. **Public Key (`id_ed25519.pub`):** Stored inside the server's `~/.ssh/authorized_keys` file.

### 🛠️ Creating SSH Keys via Terminal / CMD

On your local machine (Windows Command Prompt, PowerShell, or Mac/Linux Terminal), run:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

This generates two key files inside your hidden `.ssh` folder.

### 🔍 Checking Your Generated Keys

To list your SSH keys on your machine:

```bash
# On Mac / Linux / Git Bash / WSL:
ls ~/.ssh | grep id_

# On Windows PowerShell:
Get-ChildItem ~/.ssh | Select-String "id_"
```

You will see:
- `id_ed25519` 🚨 **PRIVATE KEY** (Keep secret on local machine!)
- `id_ed25519.pub` 🌐 **PUBLIC KEY** (Placed inside the server)

### 🔌 SSH Connection Command

```bash
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

> ⚠️ **Important Warning:** When you SSH into a server and run `npm start`, the process runs in the *foreground*. **If you close your terminal or lose internet connection, the process will immediately STOP!** This is why we progress to process managers (PM2) and Docker containers in later levels.

---

## 🛡️ 3. Security Groups, Firewalls & CIDR Blocks Explained

A **Security Group** is a virtual firewall that filters network traffic for your EC2 instance using **Inbound Rules** and **Outbound Rules**.

```
                ┌──────────────────────────────────────────────────┐
                │          AWS EC2 Security Group Firewall         │
                ├──────────────────────────────────────────────────┤
Public User  ──▶│ Port 80 (HTTP)    │ 0.0.0.0/0 (Everyone)  │ ALLOW│
Public User  ──▶│ Port 443 (HTTPS)  │ 0.0.0.0/0 (Everyone)  │ ALLOW│
                ├──────────────────────────────────────────────────┤
Your Laptop  ──▶│ Port 22 (SSH/Bash)│ 122.172.x.x/32 (Jio)  │ ALLOW│
Unknown Bot  ──▶│ Port 22 (SSH/Bash)│ 198.51.x.x (Unknown)  │ BLOCK│
                └──────────────────────────────────────────────────┘
```

### What is CIDR (Classless Inter-Domain Routing)?

CIDR notation defines an IP address range:

- `0.0.0.0/0`: **EVERYONE on the Internet.** Completely open to the world.
- `<YOUR_IP>/32`: Exactly **ONE single IP address** (e.g., your exact laptop/connection).
- `<YOUR_IP_RANGE>/24`: A specific sub-network range (e.g., your home Wi-Fi or Jio ISP IP block).

### 💡 The Golden Rule of Security Group Access

1. **HTTP (Port 80) & HTTPS (Port 443):** Set Source to `0.0.0.0/0` so any user anywhere in the world can visit your website.
2. **SSH / Bash Access (Port 22):** NEVER leave Port 22 set to `0.0.0.0/0`! Set it specifically to your internal CIDR IP range (e.g. your home Wi-Fi or Jio IP address `/32`). This prevents malicious bots from brute-forcing your server terminal!

---

## ✅ Summary Takeaways

1. **Keep Private Keys Secret:** Keep private key local; place public key on server. Verify with `ls ~/.ssh | grep id_`.
2. **Foreground Terminal Trap:** Closing an SSH terminal stops foreground commands — we need background process management.
3. **Inbound Rule Security:** Give `0.0.0.0/0` access to public web ports (80/443), but restrict SSH (port 22) strictly to your personal internal CIDR IP range.

---

Next: [00b-Load-Balancing-And-CDN.md](00b-Load-Balancing-And-CDN.md) — Target Groups, Elastic Load Balancers, S3, and CloudFront.
