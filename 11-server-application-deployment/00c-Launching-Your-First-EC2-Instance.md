# 🚀 Launching Your First EC2 Instance & Setting Up Domain Mapping
## Part 0c — Hands-on Setup Guide

> Previous: [00b-Load-Balancing-And-CDN.md](00b-Load-Balancing-And-CDN.md)  
> Next: [01-Level-1-Git-Pull-And-Run.md](01-Level-1-Git-Pull-And-Run.md)

---

## 📌 Executive Summary

- Ready to get real hardware in the cloud? This guide walks you through launching an AWS EC2 instance step-by-step.
- You will learn how to obtain an **Elastic/Public IP address**, configure your **Security Group**, select your **SSH Key Pair**, and map a custom domain (e.g. `yourname.com`) to your instance's IP address.

---

## 📋 Step-by-Step: Launching an EC2 Instance on AWS

### 1️⃣ Step 1: Open EC2 Console & Click "Launch Instance"
Log into the AWS Management Console, navigate to **EC2 Services**, and click the big orange **Launch Instance** button.

### 2️⃣ Step 2: Choose Name & Operating System (AMI)
- **Name:** Give your server a name (e.g., `my-first-web-server`).
- **OS Image (AMI):** Select **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS** (Free tier eligible).

### 3️⃣ Step 3: Select Instance Type
- Choose **`t2.micro`** or **`t3.micro`** (1 vCPU, 1 GB RAM — Free tier eligible).

### 4️⃣ Step 4: Configure Key Pair (SSH Access)
- Select **Create new key pair**.
- **Name:** `my-ec2-key`
- **Key Pair Type:** `ED25519` or `RSA`
- **Private Key File Format:** `.pem` (for OpenSSH/Mac/Linux/Windows PowerShell) or `.ppk` (for PuTTY).
- Download the `.pem` file and save it securely in your local computer's `~/.ssh/` folder!

### 5️⃣ Step 5: Configure Network & Security Group Firewall
Check the boxes for:
- ✅ **Allow SSH traffic from:** Select **My IP** (This auto-detects your internal CIDR IP `/32`).
- ✅ **Allow HTTP traffic from the internet** (`0.0.0.0/0`).
- ✅ **Allow HTTPS traffic from the internet** (`0.0.0.0/0`).

### 6️⃣ Step 6: Launch & Copy Public IP Address
Click **Launch Instance**. Once the status changes to `Running`, click on the instance ID and copy its **Public IPv4 Address** (e.g., `54.210.45.12`).

---

## 🌐 Domain Purchase & IP Address Mapping Guide

Having to visit `http://54.210.45.12:3000` is hard to remember. We need a domain (e.g., `mycoolapp.com`).

```
┌────────────────────────┐      DNS A-Record Mapping      ┌─────────────────────────┐
│ Domain Registrar       │ ─────────────────────────────▶ │ AWS EC2 Public IPv4     │
│ (Namecheap / GoDaddy)  │   yourdomain.com -> 54.210...  │ (e.g. 54.210.45.12)     │
└────────────────────────┘                                └─────────────────────────┘
```

### How to Map Your Domain to Your Server IP:

1. **Buy a Domain:** Purchase a domain from any domain registrar (Namecheap, GoDaddy, Cloudflare, AWS Route53).
2. **Open DNS Management:** Navigate to the DNS Records setting panel for your domain.
3. **Add an 'A' Record:**
   - **Type:** `A`
   - **Host / Name:** `@` (or `api` for a subdomain)
   - **Value / Target IP:** Paste your EC2 Public IP address (`54.210.45.12`)
   - **TTL:** Automatic or 300 seconds.
4. **Add a CNAME / WWW Record (Optional):**
   - **Type:** `CNAME`
   - **Host:** `www`
   - **Value:** `yourdomain.com`

*DNS propagation takes anywhere from 2 to 15 minutes. Once updated, typing `yourdomain.com` will point directly to your EC2 server IP address!*

---

## 🧠 Deep-Dive: How Local Hostnames work (`localhost` & `/etc/hosts`)

Have you ever wondered **why** typing `localhost:3000` opens your local server?

### 1️⃣ The Operating System's Internal DNS
Every operating system (Linux, macOS, Windows) has an internal, offline DNS lookup file:
- **Linux & macOS:** `/etc/hosts`
- **Windows:** `C:\Windows\System32\drivers\etc\hosts`

To see your system's internal DNS rules, open terminal and type:
```bash
cat /etc/hosts
```

You will see default system entries like:
```hosts
127.0.0.1   localhost
::1         localhost
```

### 2️⃣ Order of DNS Resolution
When you type any web address into your browser, the operating system follows this exact sequence:
1. **Check Local OS File:** Look inside `/etc/hosts`. If the domain name exists there, use the mapped IP immediately!
2. **Check Public Internet DNS:** Only if the domain is *not* found in `/etc/hosts`, your machine queries external DNS servers (like `8.8.8.8` or your ISP).

### 3️⃣ Local Custom Domain Tricks (`saif.ai` -> `127.0.0.1`)
Because `/etc/hosts` takes top priority, you can trick your machine into opening your local servers using custom domain names!

If you edit `/etc/hosts` (`sudo nano /etc/hosts`) and add:
```hosts
127.0.0.1   saif.ai
127.0.0.1   mycoolapp.local
```

Now, instead of typing `http://localhost:3000`, typing `http://saif.ai:3000` in your browser will intercept `saif.ai`, resolve it locally to `127.0.0.1`, and load your local development server! 🚀

---

## 🔌 Verification: Connect via SSH

Open your terminal or Windows CMD and connect to your fresh instance:

```bash
# Make sure key permissions are private (Mac/Linux only)
chmod 400 ~/.ssh/my-ec2-key.pem

# SSH into your server
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@54.210.45.12
```

Congratulations! You are now inside your cloud machine terminal! 🎉

---

Next: [01-Level-1-Git-Pull-And-Run.md](01-Level-1-Git-Pull-And-Run.md) — Step 1 (Novice Level): Deploying code directly on EC2.
