# 🐳 Level 3 — Dockerfile, Docker Compose & Detached Containers
## Step 3 of 5 — Multi-Service Environments & Containerization

> Previous: [02-Level-2-PM2-Process-Manager.md](02-Level-2-PM2-Process-Manager.md)  
> Next: [04-Level-4-Reverse-Proxy-Caddy-SSL.md](04-Level-4-Reverse-Proxy-Caddy-SSL.md)

---

## 📌 Executive Summary

- **Level 3 Goal:** Eliminate the environment mismatch problem ("Works on my local machine, but fails on the server!") and simplify running complex multi-service stacks (Kafka, Redis, MongoDB, PostgreSQL, API).
- **The Docker Advantage:** Instead of manually installing Redis, MongoDB, and Node on the server OS, we package our app into a **Dockerfile**, build a **Docker Image**, publish to **Docker Hub**, and launch everything with `docker compose up -d`.
- 🚨 **CRITICAL CONCEPT — WHY PM2 IS NOT NEEDED HERE:** When deploying with Docker, **you do NOT need PM2!** Docker runs containers in **Detached Mode (`-d`)** and manages container lifecycle via native restart policies (`restart: unless-stopped`). Docker handles background running, crash recovery, and reboot survival automatically!

---

## 🧠 Core Analogy: Shipping Container vs. Unpacked Furniture

- **Level 2 (PM2):** Shipping raw loose furniture to a new apartment. You have to assemble every table, wire every light bulb, and install the stove manually on site (installing Node, Redis, Mongo by hand on EC2).
- **Level 3 (Docker):** Shipping a fully assembled, sealed room inside a standard ISO shipping container. Whether you land it in Mumbai, Virginia, or your laptop backyard, you just plug in main power (`docker compose up -d`) and the entire pre-built room turns on instantly!

---

## 🏗️ 1. Why Docker? Environmental Consistency

When your backend application grows to require multiple dependencies:
- **Node.js API Server**
- **Redis** (In-memory Cache)
- **PostgreSQL / MongoDB** (Database)
- **Apache Kafka** (Message Queue)

Installing all these on the EC2 operating system directly is a huge overhead. If you update Redis locally but forget to install it on the server, your deployment crashes. 

With Docker:
1. Define a `Dockerfile` for your custom code.
2. Build an **Image** and push it to **Docker Hub**.
3. Pull and run pre-built Docker containers on the server with zero manual installation required!

---

## 📄 2. Writing a Dockerfile for the Application

Create a file named `Dockerfile` in the root of your project:

```dockerfile
# 1. Base image with Node.js pre-installed
FROM node:22-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package definitions and install dependencies
COPY package*.json ./
RUN npm ci

# 4. Copy rest of application source code
COPY . .

# 5. Build application (if TypeScript)
RUN npm run build

# 6. Expose application port
EXPOSE 3000

# 7. Start command
CMD ["node", "dist/index.js"]
```

### 📦 Building & Publishing to Docker Hub

```bash
# Build the Docker image locally
docker build -t yourdockerhubusername/my-node-api:v1 .

# Push image to Docker Hub registry
docker push yourdockerhubusername/my-node-api:v1
```

---

## 🧩 3. Docker Compose for Multi-Service Stacks

Instead of running separate long commands for each service, we use `docker-compose.yml` to define our entire stack:

```yaml
version: '3.8'

services:
  api:
    image: yourdockerhubusername/my-node-api:v1
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - MONGO_URI=mongodb://mongo:27017/mydb
    restart: unless-stopped
    depends_on:
      - redis
      - mongo

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  mongo:
    image: mongo:8.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

### 🚀 Running in Detached Mode

On your EC2 cloud server, simply run:

```bash
docker compose up -d
```

- `-d` = **Detached Mode**: Launches all containers in the background, freeing your SSH terminal!

---

## 🔐 4. Managing Environment Variables (`.env`) in Cloud Deploys

### ❓ The Problem: "I don't push my `.env` file to GitHub! So how does the server get my secrets?"

You should **NEVER** push `.env` files containing secrets, database credentials, or API keys to GitHub (`.gitignore` must contain `.env`).

So how do secret environment variables get to your cloud server?

### 💡 The 3 Production Approaches:

#### Approach 1: Create `.env` Manually on the Server (Simplest & Direct)
On your EC2 server, manually create a `.env` file in your application directory using `nano` or `vim`:

```bash
cd ~/my-app
nano .env
```

Paste your server-specific production variables:
```env
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb://mongo:27017/prod_db
REDIS_HOST=redis
JWT_SECRET=super_secret_production_key_9876
```

In your `docker-compose.yml`, instruct Docker to read this local `.env` file automatically:

```yaml
services:
  api:
    image: yourusername/my-node-api:latest
    env_file:
      - .env            # 👈 Automatically passes all variables into the container!
    restart: unless-stopped
```

#### Approach 2: Inject `.env` via GitHub Actions Secrets (Automated CI/CD)
When deploying automatically with GitHub Actions:
1. Store all your secret values in **GitHub Settings ──▶ Secrets and variables ──▶ Actions** (e.g. `PROD_ENV_FILE`).
2. In your `.github/workflows/deploy.yml` pipeline, add a step to generate the `.env` file on the server during deploy:

```yaml
- name: Create .env file on EC2
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ubuntu
    key: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
    script: |
      cat << 'EOF' > ~/my-app/.env
      PORT=3000
      MONGO_URI=${{ secrets.MONGO_URI }}
      JWT_SECRET=${{ secrets.JWT_SECRET }}
      EOF
```

#### Approach 3: Cloud Parameter Store / Secrets Manager (Enterprise Level)
For enterprise apps, services like **AWS Secrets Manager** or **HashiCorp Vault** store secrets centrally. When the Docker container boots up, it fetches secrets securely via API at startup.

---

## ❓ Why You DO NOT Need PM2 When Using Docker

Many developers ask: *"Should I install PM2 inside my Docker container or run PM2 on the server?"*  
👉 **Answer: NO! PM2 is completely redundant when using Docker.**

| Duty / Feature | PM2 Approach | Docker Native Approach |
|---|---|---|
| **Background Execution** | `pm2 start index.js` | `docker compose up -d` (Detached Mode) |
| **Crash Auto-Restart** | Managed by PM2 process daemon | `restart: unless-stopped` in Compose |
| **Server Reboot Survival** | `pm2 startup` & `pm2 save` | Docker daemon starts containers automatically on boot |
| **Log Management** | `pm2 logs` | `docker compose logs -f` |

**Rule of Thumb:** Docker replaces PM2. Let Docker handle background execution and restart policies!

---

## 🌐 The Port Problem Remaining in Level 3

Right now, your application stack is running cleanly in detached mode. However:
- Users still have to visit `http://abc.com:3000` (raw port binding).
- Traffic is unencrypted HTTP (no HTTPS / SSL certificate).
- There is no reverse proxy or load balancer managing incoming domain requests.

👉 **Enter Level 4: Reverse Proxy with Caddy & Automatic SSL!**

---

## ✅ Summary Takeaways

1. Docker eliminates environment drift by bundling code, OS dependencies, and services into container images.
2. `docker compose up -d` runs multi-service stacks (API + Redis + Mongo + Kafka) in background detached mode.
3. **PM2 is NOT needed** when using Docker — Docker's native `restart: unless-stopped` handles keep-alive and crash recovery.

---

Next: [04-Level-4-Reverse-Proxy-Caddy-SSL.md](04-Level-4-Reverse-Proxy-Caddy-SSL.md) — Setting up Caddy Reverse Proxy, Port 80/443 mapping, and Automatic SSL Termination.
