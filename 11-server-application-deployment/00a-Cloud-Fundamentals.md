# Cloud Fundamentals — Machines, Instances, SSH, Security Groups
## Part 0a — Before You Deploy Anything

> Next: [00b-Load-Balancing-And-CDN.md](00b-Load-Balancing-And-CDN.md)

---

## 📌 Executive Summary

- A **server** is just a computer that's always on and reachable over the network. **EC2** (Elastic Compute Cloud) is AWS's product for renting one of these computers by the hour/second.
- An **instance** is one running copy of a virtual machine — think of EC2 as the vending machine and an instance as the can you pressed the button for. You can spin up many instances from the same "recipe."
- That recipe is an **AMI** (Amazon Machine Image) — a snapshot of an OS + preinstalled software. Launching an instance = booting a fresh machine from that snapshot.
- A **container** (Docker) is a lighter-weight alternative to a full VM — it shares the host's OS kernel instead of virtualizing an entire OS, so it starts in milliseconds and is far smaller. Covered in depth in [10-docker](../10-docker/00-What-Is-Docker-Why-We-Need-It.md); here we only place it relative to a "machine."
- **SSH** (Secure Shell) is how you log into that remote instance's terminal, authenticated by an asymmetric key pair (private + public key) instead of a password.
- **Security groups** are the instance's firewall — they decide which ports are open to which IP ranges (**CIDR blocks**). Get this wrong and either nobody can reach your app, or *everybody* can reach your SSH port.

---

## 🧠 Core Analogy: Renting an Apartment

- **EC2** = the property management company.
- **AMI** = the floor plan / furniture package you pick before move-in (Ubuntu + Node preinstalled, say).
- **Instance** = the actual apartment unit you get the keys to. Ask for three units from the same floor plan → three identical apartments (three instances from one AMI).
- **SSH key pair** = your apartment key. You keep the physical key (**private key**); the building's lock mechanism (**server**) only stores a description of what the correct key's teeth look like (**public key**). Nobody can forge a key just by looking at the lock.
- **Security group** = the building's front-desk policy: "deliveries (port 80/443) can come from anyone off the street; but only *residents* (your home IP) can use the residents' entrance (port 22, SSH)."

---

## 🖥️ 1. What "a machine" Actually Means

Every option below is "a computer with a CPU, RAM, disk, and a network card," just packaged differently:

| Term | What it is |
|---|---|
| **Physical server / bare metal** | An actual computer sitting in a data center. |
| **Virtual Machine (VM)** | Software that pretends to be a full computer, several of which share one physical server. EC2 instances are VMs. |
| **Instance** (AWS term) | One running VM you provisioned via EC2. |
| **Container** | Not a VM at all — a process (or group of processes) isolated from the rest of the OS using kernel features (namespaces, cgroups), sharing the host kernel. Much lighter than a VM. Multiple containers run **inside** one instance. |

So the nesting, top to bottom, in a real deployment: **AWS region → EC2 instance (a VM) → Docker containers running inside it** (from [Level 3](03-Level-3-Dockerfile-And-Containers.md) onward).

---

## 🔑 2. SSH — Logging Into Your Instance

**SSH (Secure Shell)** is a network protocol that lets you securely open a terminal session on a remote machine. Security comes from **asymmetric encryption**: a mathematically linked pair of keys.

- **Private key** — stays only on your laptop. Never share it, never commit it to git.
- **Public key** — placed on the server (AWS does this for you when you pick/create a "key pair" during instance launch, dropping it into `~/.ssh/authorized_keys` on the instance).

To connect, your SSH client proves it holds the private key matching the public key on the server — the server never sees your private key itself, only proof you have it.

### Generating a key pair locally

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

This produces two files, by default:

```
~/.ssh/id_ed25519       # PRIVATE key — never share
~/.ssh/id_ed25519.pub   # PUBLIC key — this goes on the server
```

Check what you have:

```bash
ls ~/.ssh | grep id_
```

### Connecting

```bash
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@<EC2_PUBLIC_IP>
```

- `-i` — path to the private key to use for this connection.
- `ubuntu` — the default login user for Ubuntu AMIs (`ec2-user` for Amazon Linux).
- `<EC2_PUBLIC_IP>` — the instance's public IPv4 address (found on the EC2 console).

> **If you close the terminal / SSH session, anything you started in the foreground stops too** — this is exactly the problem [Level 2 (PM2)](02-Level-2-PM2-Process-Manager.md) solves.

---

## 🔥 3. Security Groups & CIDR

A **security group** is a virtual firewall attached to your instance. It's a list of **inbound** and **outbound** rules, each rule being: *protocol + port + source/destination*.

The "source" is expressed as a **CIDR block** (Classless Inter-Domain Routing) — a compact way to describe a range of IP addresses.

| CIDR | Meaning |
|---|---|
| `0.0.0.0/0` | **Every IPv4 address on the internet.** Fully open. |
| `203.0.113.4/32` | Exactly **one** IP address (the `/32` = no range, a single host). |
| `203.0.113.0/24` | The 256 addresses `203.0.113.0`–`203.0.113.255` — e.g., "anyone on this specific ISP/office network." |

The `/n` is how many leading bits of the address are fixed; smaller `/n` = bigger range, `/32` = one exact IP.

### The rule of thumb

| Port | Purpose | Recommended source |
|---|---|---|
| 22 (SSH) | Admin login to the box | **Your own IP only** (`your.ip.address/32`), never `0.0.0.0/0` |
| 80 (HTTP) | Public web traffic | `0.0.0.0/0` — anyone should reach your app |
| 443 (HTTPS) | Public secure web traffic | `0.0.0.0/0` |
| Custom app port (e.g. 3000, 4000) | Direct access before a reverse proxy is set up | Your IP while testing; close it once Caddy/Traefik fronts it on 80/443 |

**Why the asymmetry:** your application is *meant* to be public — that's the whole point of deploying it. SSH is an administrative back door into the box itself; leaving `22/0.0.0.0/0` open invites every bot on the internet to brute-force your server's login. Scope SSH to your own IP (or your office/VPN CIDR).

> Find "your own IP" quickly with `curl ifconfig.me` from your laptop, then use `<that-ip>/32` as the source when editing the security group's inbound rule for port 22.

---

## ✅ Takeaways

- **EC2** rents VMs called **instances**, booted from a saved OS+software snapshot called an **AMI**. **Containers** are a lighter unit that run *inside* an instance, sharing its kernel.
- **SSH** authenticates with a public/private key pair — generate with `ssh-keygen`, keep the private key secret, the public key lives on the server.
- A closed terminal kills any foreground process on the server — that's why you'll need PM2 or Docker's detached mode.
- **Security groups** are per-instance firewalls; rules are `protocol + port + CIDR source`.
- `0.0.0.0/0` = the whole internet. Use it for 80/443 (your app). Use your own `/32` CIDR for port 22 (SSH) — never leave admin access open to the world.

Next: [00b-Load-Balancing-And-CDN.md](00b-Load-Balancing-And-CDN.md) — target groups, load balancers, S3, and CloudFront.
