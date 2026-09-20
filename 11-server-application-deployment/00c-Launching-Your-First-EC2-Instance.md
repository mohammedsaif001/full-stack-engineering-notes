# Launching Your First EC2 Instance — Step by Step
## Part 0c — Hands-On, Before Level 1

> Previous: [00b-Load-Balancing-And-CDN.md](00b-Load-Balancing-And-CDN.md)
> Next: [01-Level-1-Git-Pull-And-Run.md](01-Level-1-Git-Pull-And-Run.md)

---

## 📌 Executive Summary

- [00a](00a-Cloud-Fundamentals.md) and [00b](00b-Load-Balancing-And-CDN.md) explained the *concepts* (instance, AMI, security group, CIDR). This file is the actual **click-by-click walkthrough** to get a real, SSH-able Ubuntu machine running on AWS, plus the equivalent **AWS CLI** commands for each step.
- End state: one running EC2 instance, a `.pem` key file on your laptop, a security group open on 22 (your IP only)/80/443 (everyone), and a public IP you can SSH into.
- This is the machine every other file in this series (Level 1 onward) assumes already exists.

---

## 🖱️ Method A — AWS Console (Click-by-Click)

### Step 1 — Open the EC2 Launch Wizard

1. Log into the [AWS Console](https://console.aws.amazon.com/).
2. Search for **EC2** in the top search bar → open the EC2 dashboard.
3. Click **Launch instance** (orange button, top right).

### Step 2 — Name and Choose an AMI

1. **Name and tags** → give it a name, e.g. `my-first-server`.
2. **Application and OS Images (AMI)** → choose **Ubuntu** → select **Ubuntu Server 22.04 LTS** (Free tier eligible is marked).
   - Recall from [00a](00a-Cloud-Fundamentals.md): the AMI is the "recipe" — OS + any preinstalled software baked into this snapshot.

### Step 3 — Choose an Instance Type

1. Under **Instance type**, pick **t2.micro** or **t3.micro** (both are in the AWS Free Tier for a new account, first 12 months).
   - This defines the CPU/RAM the "apartment" (instance) has — `t2.micro` = 1 vCPU, 1 GB RAM, enough for a small Node app.

### Step 4 — Key Pair (Login)

1. Under **Key pair (login)** → click **Create new key pair**.
2. Name it, e.g. `my-ec2-key`. Key type: **RSA** (or ED25519). Format: **.pem** (for OpenSSH / Mac / Linux / modern Windows) or **.ppk** (only if you specifically use PuTTY).
3. Click **Create key pair** — this **immediately downloads the `.pem` file to your laptop**. This is your **private key** from [00a §2](00a-Cloud-Fundamentals.md). AWS keeps only the matching public key, embedded into the instance on boot.

> ⚠️ **This file downloads exactly once.** If you lose it, you cannot recover it — you'd have to create a new key pair and a new instance (or swap the key via advanced recovery steps). Move it immediately to `~/.ssh/` and don't lose it.

### Step 5 — Network Settings (Security Group)

This is where [00a §3](00a-Cloud-Fundamentals.md)'s security-group theory becomes real clicks:

1. Under **Network settings**, click **Edit**.
2. You'll see **Firewall (security groups)** → choose **Create security group**.
3. It auto-adds one rule: **SSH, port 22, source: 0.0.0.0/0** — **change this immediately**:
   - Click the source dropdown → select **My IP** (AWS auto-fills your current public IP as a `/32` CIDR).
4. Click **Add security group rule** twice more to add:
   - **Type: HTTP**, port 80, source: **Anywhere (0.0.0.0/0)**
   - **Type: HTTPS**, port 443, source: **Anywhere (0.0.0.0/0)**
5. *(Optional, temporary, for [Level 1](01-Level-1-Git-Pull-And-Run.md) testing before a reverse proxy exists)* Add a **Custom TCP** rule, port **3000** (or whatever your app uses), source: **My IP** — tighten or remove this once Caddy/Traefik front the app on 80/443.

Final rule table you should see:

| Type | Protocol | Port | Source |
|---|---|---|---|
| SSH | TCP | 22 | Your IP (`x.x.x.x/32`) |
| HTTP | TCP | 80 | `0.0.0.0/0` |
| HTTPS | TCP | 443 | `0.0.0.0/0` |
| Custom TCP *(temporary)* | TCP | 3000 | Your IP |

### Step 6 — Storage

1. Leave the default **8 GiB gp3** root volume for a small test server — plenty for Node + Docker + a small app.

### Step 7 — Launch

1. Review the **Summary** panel on the right.
2. Click **Launch instance**.
3. Click **View all instances** → wait ~30–60 seconds for **Instance state** to become **Running** and **Status check** to become **2/2 checks passed**.

### Step 8 — Get the Public IP and Connect

1. Select your instance in the list → the **Details** tab shows **Public IPv4 address**.
2. From your laptop terminal:

```bash
# lock down permissions on the downloaded key (required on Mac/Linux/WSL — SSH refuses keys that are too open)
chmod 400 ~/.ssh/my-ec2-key.pem

ssh -i ~/.ssh/my-ec2-key.pem ubuntu@<PUBLIC_IPV4_ADDRESS>
```

If it connects and you land at an `ubuntu@ip-xxx-xx-xx-xx:~$` prompt, the instance is live and ready for [Level 1](01-Level-1-Git-Pull-And-Run.md).

---

## ⌨️ Method B — AWS CLI (Same Steps, Scriptable)

Install and configure the CLI once:

```bash
aws configure
# prompts for Access Key ID, Secret Access Key, region (e.g. ap-south-1), output format
```

### 1. Create the key pair (equivalent of Step 4)

```bash
aws ec2 create-key-pair \
  --key-name my-ec2-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/my-ec2-key.pem

chmod 400 ~/.ssh/my-ec2-key.pem
```

### 2. Create the security group and rules (equivalent of Step 5)

```bash
# create the group
aws ec2 create-security-group \
  --group-name my-app-sg \
  --description "SSH from my IP, HTTP/HTTPS from anywhere"

# find your own public IP for the SSH rule
MY_IP=$(curl -s ifconfig.me)

# SSH — only your IP
aws ec2 authorize-security-group-ingress \
  --group-name my-app-sg \
  --protocol tcp --port 22 --cidr "${MY_IP}/32"

# HTTP — everyone
aws ec2 authorize-security-group-ingress \
  --group-name my-app-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# HTTPS — everyone
aws ec2 authorize-security-group-ingress \
  --group-name my-app-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 3. Find an Ubuntu AMI ID for your region (equivalent of Step 2)

AMI IDs are region-specific and change over time, so look one up rather than hardcoding it:

```bash
aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
            "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text
```

(`099720109477` is Canonical's official AWS account ID, the publisher of official Ubuntu AMIs.)

### 4. Launch the instance (equivalent of Steps 3, 6, 7)

```bash
aws ec2 run-instances \
  --image-id <AMI_ID_FROM_STEP_3> \
  --instance-type t2.micro \
  --key-name my-ec2-key \
  --security-groups my-app-sg \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":8,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=my-first-server}]' \
  --count 1
```

### 5. Get the public IP and connect (equivalent of Step 8)

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=my-first-server" \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text

ssh -i ~/.ssh/my-ec2-key.pem ubuntu@<PUBLIC_IP_FROM_ABOVE>
```

---

## 🧹 Cleaning Up (Avoid Surprise Charges)

Free-tier `t2.micro`/`t3.micro` hours are generous but not infinite. When you're done experimenting:

**Console:** select the instance → **Instance state** → **Terminate instance**.

**CLI:**

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=my-first-server" \
  --query 'Reservations[].Instances[].InstanceId' --output text

aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
```

Terminating (not just "stopping") releases the instance so it stops counting against free-tier hours.

---

## ✅ Takeaways

- Console path: **Launch instance → pick AMI (Ubuntu) → pick instance type (t2/t3.micro) → create & download key pair → configure security group (22 from My IP, 80/443 from anywhere) → Launch → grab Public IPv4 → SSH in.**
- CLI path does the exact same five things (`create-key-pair`, `create-security-group` + `authorize-security-group-ingress`, `describe-images`, `run-instances`, `describe-instances`) — useful once you want this scripted or added to a CI/CD pipeline ([06](06-CICD-GitHub-Actions.md)).
- The `.pem` file downloads **once** — save it to `~/.ssh/` immediately and `chmod 400` it.
- **Terminate** (not stop) instances you're done with, to avoid burning free-tier hours or incurring charges.
- With a running, SSH-able instance in hand, you're ready for [Level 1](01-Level-1-Git-Pull-And-Run.md).
