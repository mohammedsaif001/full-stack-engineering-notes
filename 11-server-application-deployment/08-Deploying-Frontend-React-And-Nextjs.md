# 🎨 Deploying Frontend Applications — React (Vite/SPA) vs. Next.js (SSR)
## Modern Strategies for Deploying Client & Hybrid Web Applications

> Previous: [07-Observability-OTel-Signoz.md](07-Observability-OTel-Signoz.md)  
> Home: [README.md](README.md)

---

## 📌 Executive Summary

- Frontend deployment strategies depend fundamentally on whether your app is a **Static Single Page Application (SPA)** like React (Vite/CRA) or a **Server-Side Rendered (SSR)** framework like Next.js.
- **React SPAs (Vite / Create-React-App):** Compile into static HTML, JS, and CSS files (`dist` folder). They **do NOT require a running Node.js server in production**. They are served via static web servers (Nginx/Caddy) or AWS S3 + CloudFront CDN.
- **Next.js Applications (SSR / Server Actions / Hybrid):** Require a running Node.js server runtime in production (`next start`). They are deployed using Docker containers behind a reverse proxy (Caddy/Traefik) or managed platforms (Vercel).

---

## 🧠 Architecture Comparison: React SPA vs Next.js

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ REACT SPA (Vite / Create-React-App)                                                     │
│                                                                                        │
│  Developer Build ──▶ `npm run build` ──▶ Static Files (`index.html`, `.js`, `.css`)   │
│                                                   │                                    │
│                                                   ▼                                    │
│                             Served by Nginx / Caddy / AWS S3 + CloudFront              │
│                             (No Node.js runtime needed on server!)                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NEXT.JS (SSR / Server Actions / API Routes)                                            │
│                                                                                        │
│  Developer Build ──▶ `npm run build` ──▶ Built Server Bundle                           │
│                                                   │                                    │
│                                                   ▼                                    │
│                             Runs `next start` on Node.js Server Container              │
│                             Fronted by Caddy / Traefik Reverse Proxy (Port 443)        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚛️ 1. Deploying a React (Vite / SPA) Application

Because React SPAs execute 100% inside the user's browser, you only need to host the static compiled files output by `npm run build`.

### 🛠️ Strategy A: Multi-Stage Dockerfile with Nginx / Caddy (Self-Hosted on EC2)

Create a `Dockerfile` in your React project root:

```dockerfile
# ── Stage 1: Build the static bundle ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # Produces static files inside /app/dist

# ── Stage 2: Serve static files via ultra-fast Nginx web server ──
FROM nginx:alpine
# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy static React build from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 📄 Custom Nginx SPA Routing File (`nginx.conf`)
React uses client-side routing (`react-router-dom`). If a user reloads `https://yourdomain.com/dashboard`, Nginx must fall back to `index.html` so React Router can handle the route:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # 🔑 Critical for SPA Routing: fallback to index.html if file not found
        try_files $uri $uri/ /index.html;
    }
}
```

---

### ☁️ Strategy B: AWS S3 + CloudFront CDN (AWS Cloud Production Best Practice)

For maximum performance and zero server maintenance:

```
Developer Push ──▶ GitHub Actions ──▶ `npm run build` ──▶ Upload `dist/` to AWS S3 Bucket
                                                                    │
                                                                    ▼
Users (Global) ◀── CloudFront Edge Locations (Cached instantly) ────┘
```

1. **Build Static Bundle:** Run `npm run build` (generates `dist/` folder).
2. **Upload to S3 Bucket:** Sync files to an AWS S3 bucket configured for static web hosting.
3. **Attach CloudFront CDN:** Place CloudFront in front of S3 for global edge caching and free HTTPS certificates.

---

## 🔺 2. Deploying a Next.js (SSR / Hybrid) Application

Next.js features Server-Side Rendering (SSR), API routes, and Server Actions. It **requires a running Node.js server runtime**.

### 🛠️ Strategy A: Multi-Stage Dockerfile for Next.js (Self-Hosted on EC2)

Next.js provides an optimized **Standalone Output** feature that reduces Docker image sizes from ~1GB down to ~100MB.

#### Step 1: Enable Standalone Output in `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 👈 Enables lightweight standalone production build
};

module.exports = nextConfig;
```

#### Step 2: Create Next.js Multi-Stage `Dockerfile`
```dockerfile
# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Build Next.js application ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# ── Stage 3: Lightweight Production Runner ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# Copy standalone build and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

#### Step 3: Run Next.js with Docker Compose behind Caddy / Traefik
```yaml
version: '3.8'

services:
  nextjs-app:
    image: yourusername/my-nextjs-app:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

Front this Next.js container with **Caddy** or **Traefik** on Port 80/443 for automatic SSL termination!

---

## 🔐 3. Environment Variables in Frontend Apps (`VITE_` vs `NEXT_PUBLIC_`)

Handling environment variables in frontend apps differs between build-time and server runtime:

| Framework | Public Client Variable Prefix | Private Server Variable | How It Works |
|---|---|---|---|
| **React (Vite)** | `VITE_API_URL` | N/A (Everything is compiled into static JS!) | Replaced into plain strings **at build time** (`npm run build`). |
| **Next.js** | `NEXT_PUBLIC_API_URL` | `DATABASE_URL` (Server-only) | Public vars embedded at build; Server vars read dynamically at **runtime**. |

> ⚠️ **Security Warning:** Any variable prefixed with `VITE_` or `NEXT_PUBLIC_` is baked directly into JavaScript sent to user browsers! Never put secret API keys, private passwords, or database connections in public frontend env variables!

---

## ✅ Summary Takeaways

1. **React SPAs (Vite):** Build static assets (`dist`), serve via Nginx/Caddy container (`try_files $uri /index.html`) or deploy to AWS S3 + CloudFront CDN.
2. **Next.js Apps:** Require a Node.js runtime (`output: 'standalone'`). Build Docker container and run `node server.js` behind Caddy/Traefik reverse proxy on Port 443.
3. **Environment Security:** `VITE_` and `NEXT_PUBLIC_` variables are public in browser bundles. Keep backend database keys strictly on backend servers!

---

Next: Back to index [README.md](README.md)
