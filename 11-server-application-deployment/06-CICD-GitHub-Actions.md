# CI/CD With GitHub Actions
## Bonus — Automating Every Level Above

> Previous: [05-Level-5-Traefik-Multi-Project-Single-Machine.md](05-Level-5-Traefik-Multi-Project-Single-Machine.md)
> Next: [07-Observability-OTel-Signoz.md](07-Observability-OTel-Signoz.md)

---

## 📌 Executive Summary

- Everything in Levels 1–5 was done by **manually SSHing into the server**. **CI/CD** automates that: every `git push` can automatically test, build, and deploy your code with zero manual steps.
- **CI** (Continuous Integration) = automatically build/test code on every change. **CD** (Continuous Deployment/Delivery) = automatically ship that change to the server.
- Common CI/CD providers: **GitHub Actions**, **Jenkins**, **AWS CodeBuild/CodePipeline**, **CircleCI**, **GCP Cloud Build**. This file focuses on GitHub Actions since it's built into GitHub itself.
- Every CI/CD config, regardless of provider, boils down to the same three ingredients: **source** (what triggers it, e.g. a repo/branch), **event** (when — push, PR, tag), and **steps** (what to actually run).
- In GitHub Actions specifically, this lives at `.github/workflows/<name>.yml`.

---

## 🧠 Core Analogy

Levels 1–5 were you personally walking into the building every time something changed, to manually update the office. CI/CD is hiring an **automatic courier/inspector**: the moment new instructions (a `git push`) arrive at head office (GitHub), the courier automatically checks them (**CI** — run tests/build), and if they pass, walks them straight to the office and puts them in place (**CD** — deploy) — no human needed in the loop.

---

## 🧩 1. The Three Ingredients of Any CI/CD Config

Regardless of provider (GitHub Actions, Jenkins, CircleCI, AWS CodeBuild, GCP Cloud Build), a pipeline definition always answers three questions:

| Ingredient | Question it answers | GitHub Actions example |
|---|---|---|
| **Source** | Which repo/branch does this watch? | The repo the workflow file lives in |
| **Event** | What triggers a run? | `push` to `main`, a pull request, a tag |
| **Steps** | What actually happens? | checkout → install → test → build image → deploy |

---

## 📁 2. Where the Config Lives (GitHub Actions)

```
.github/
└── workflows/
    └── deploy.yml
```

GitHub automatically picks up any `.yml` file under `.github/workflows/` in your repo — no separate registration step.

---

## 📄 3. A Minimal Workflow: Test on Every Push

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
```

Reading it against the three ingredients:

- **Source** — implicitly this repo.
- **Event** — `on: push`/`pull_request` to `main`.
- **Steps** — `checkout` the code, set up Node, install deps, run tests.

---

## 🐳 4. Building and Publishing a Docker Image

Extend it to build the image from your [Level 3 Dockerfile](03-Level-3-Dockerfile-And-Containers.md) and push it to Docker Hub:

```yaml
# .github/workflows/build-and-push.yml
name: Build and Push Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/my-api:latest
```

`secrets.*` are values stored in **GitHub repo settings → Secrets and variables → Actions** — never hardcode credentials in the workflow file itself.

---

## 🚀 5. Deploying to the Server (SSH + Pull + Restart)

The final step SSHes into your EC2 instance and redeploys, replacing the manual loop from [Level 2](02-Level-2-PM2-Process-Manager.md)/[Level 3](03-Level-3-Dockerfile-And-Containers.md):

```yaml
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
          script: |
            cd ~/my-repo
            git pull origin main
            docker compose pull
            docker compose up -d --build
```

This single job now does, automatically, on every push to `main`, exactly what you were doing by hand across Levels 1–3: pull the latest code, rebuild/pull the image, and bring the stack back up in detached mode.

> **`EC2_SSH_PRIVATE_KEY`** here is your SSH private key from [00a](00a-Cloud-Fundamentals.md), stored as a GitHub secret — this is the one place it's acceptable to store it off your laptop, because GitHub secrets are encrypted and never printed in logs.

---

## ✅ Takeaways

- **CI** = automated test/build on every change; **CD** = automated deployment of that change. Providers: GitHub Actions, Jenkins, CircleCI, AWS CodeBuild, GCP Cloud Build — all configured around the same **source / event / steps** shape.
- GitHub Actions config lives at `.github/workflows/<name>.yml`.
- A typical pipeline: checkout → install/test → build & push Docker image → SSH into the server → `git pull` + `docker compose up -d --build`.
- Store credentials (SSH keys, registry tokens) as **GitHub Secrets**, never in the workflow file.
- This is what turns every level before it (1 through 5) from "a manual SSH ritual" into "just `git push`."

Next: [07-Observability-OTel-Signoz.md](07-Observability-OTel-Signoz.md) — seeing what your deployed app is actually doing.
