# 🔄 CI/CD Pipelines — Automating Deploys with GitHub Actions
## Automated Build, Push & Remote Deployment

> Previous: [05-Level-5-Traefik-Multi-Project-Single-Machine.md](05-Level-5-Traefik-Multi-Project-Single-Machine.md)  
> Next: [07-Observability-OTel-Signoz.md](07-Observability-OTel-Signoz.md)

---

## 📌 Executive Summary

- Manually SSHing into your EC2 server to run `git pull`, `docker build`, and `docker compose up` for every code update is tedious and error-prone.
- **CI/CD (Continuous Integration / Continuous Deployment)** automates the entire testing, building, publishing, and deployment pipeline whenever you push code to GitHub.
- Popular CI/CD providers include **GitHub Actions**, **Jenkins**, **AWS CloudBuild**, **CircleCI**, and **GCP Cloud Run / Cloud Build**.

---

## 🛠️ 1. Understanding CI/CD Core Building Blocks

Every CI/CD pipeline requires three primary configurations:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. SOURCE: Which Git repository / branch triggers the pipeline?       │
│    (e.g., main / master branch)                                        │
├────────────────────────────────────────────────────────────────────────┤
│ 2. EVENT: What trigger action starts the workflow run?                 │
│    (e.g., git push, pull_request, tag release)                         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. STEPS: What sequential commands should the automated runner execute? │
│    (Checkout -> Build Docker Image -> Push to Hub -> SSH Deploy)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Popular CI/CD Providers in the Industry:
- **GitHub Actions:** Native to GitHub repositories (Most popular & easiest to integrate).
- **Jenkins:** Open-source self-hosted automation server.
- **AWS CloudBuild:** AWS-native managed build service.
- **CircleCI:** Popular cloud-based SaaS pipeline engine.
- **GCP Cloud Run / Cloud Build:** Google Cloud native deployment pipeline.

---

## 📁 2. Setting Up GitHub Actions Folder Structure

To configure GitHub Actions in your project repository, create the following directory structure:

```
your-project-repository/
├── .github/
│   └── workflows/
│       └── deploy.yml   <── Your CI/CD pipeline workflow definition
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 📄 3. Writing the `.github/workflows/deploy.yml` Workflow

Here is a complete, production-grade GitHub Actions workflow that automatically builds your Docker image, pushes it to Docker Hub, SSHs into your EC2 server, and deploys the update:

```yaml
name: Production CI/CD Pipeline

# 1. EVENT TRIGGER
on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # Step 1: Checkout repository source code
      - name: Checkout Code
        uses: actions/checkout@v4

      # Step 2: Log in to Docker Hub
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # Step 3: Build and push Docker image
      - name: Build and Push Docker Image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/my-app:latest

      # Step 4: SSH into AWS EC2 and deploy updated container
      - name: SSH Deploy to EC2 Instance
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
          script: |
            cd ~/my-app
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
```

---

## 🔐 4. Adding Secrets in GitHub Settings

To protect sensitive keys, navigate to your GitHub Repository **Settings** ──▶ **Secrets and variables** ──▶ **Actions**:

- `DOCKERHUB_USERNAME`: Your Docker Hub username.
- `DOCKERHUB_TOKEN`: Your Docker Hub Access Token.
- `EC2_HOST`: Your EC2 server public IP address.
- `EC2_SSH_PRIVATE_KEY`: Content of your private SSH key (`~/.ssh/my-ec2-key.pem`).

---

## ✅ Summary Takeaways

1. CI/CD pipelines automate the `Git Push ──▶ Build Image ──▶ Publish to Docker Hub ──▶ Deploy on Server` cycle.
2. Every CI/CD tool requires configuring **Source**, **Event**, and **Steps**.
3. In GitHub Actions, workflows live inside `.github/workflows/<name>.yml`.

---

Next: [07-Observability-OTel-Signoz.md](07-Observability-OTel-Signoz.md) — Monitoring application health silently with OpenTelemetry & Signoz!
