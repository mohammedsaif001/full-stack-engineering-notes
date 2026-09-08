# Writing a Dockerfile
## Part 4 of 8 — Packaging Your Own Express/TypeScript App into an Image

> Previous: [03-Volumes-Data-Persistence.md](03-Volumes-Data-Persistence.md)
> Next: [05-Docker-Compose-Explained.md](05-Docker-Compose-Explained.md)

---

## 📌 Executive Summary

- So far you've *used* prebuilt images (`postgres:17`, `mongo:8.0`). A **Dockerfile** is how you build **your own** image — one that contains your Express API, its dependencies, and the command to start it.
- **Why bother:** the same reasons you Dockerize the database. Your API then runs identically on any machine and in production, with no "install Node 22, run npm ci, set these env vars" instructions to drift.
- A Dockerfile is a **list of instructions**, top to bottom. Each instruction produces a **layer**, and layers are **cached**. Order them cheap-and-stable first, expensive-and-changing last, so a code edit doesn't force a full `npm install`.
- **`.dockerignore`** keeps junk (`node_modules`, `.env`, `dist`, `.git`) out of the build — smaller, faster, safer images.
- A **multi-stage build** compiles TypeScript in a fat "builder" stage (dev dependencies, `tsc`) and copies only the compiled `dist/` + production dependencies into a slim final image. Result: a much smaller, attack-surface-reduced image.
- Build with `docker build -t my-api .`; run with `docker run -p 4000:4000 --env-file .env my-api`; or, more usually, let **Compose build it** via `build: .` ([05](05-Docker-Compose-Explained.md)).

---

## 🧠 Core Analogy: A Recipe Card

A Dockerfile is a recipe:

- **`FROM`** = "start from a boxed cake mix" (a base image — someone already put an OS + Node in the box).
- Each following line = one prep step. The kitchen (Docker) **photographs the bowl after every step** (a layer) and keeps the photos.
- Next time you cook, if steps 1–4 are byte-for-byte identical, the kitchen just grabs the photo of the bowl after step 4 and carries on from step 5. That's **layer caching**.
- Change an early step and every photo after it is thrown away — you re-cook from there. That's why you put "crack the eggs that change every time" (your source code) **near the end**.

---

## 📄 1. A First, Naive Dockerfile

For a TypeScript Express app like `07-backend/setups/03-prisma-express-ts` (compiles `src/` → `dist/`, starts with `node dist/index.js`):

```dockerfile
# --- naive version: works, but rebuilds too much ---
FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

Line by line:

| Instruction | What it does |
|---|---|
| `FROM node:22-alpine` | Base image: Alpine Linux + Node 22. `-alpine` = tiny (~5 MB base OS) vs the default Debian-based `node:22` (~350 MB). |
| `WORKDIR /app` | Create `/app` and `cd` into it. All later paths are relative to here. |
| `COPY . .` | Copy the build context (your project folder) into `/app`. |
| `RUN npm install` | Install dependencies **inside the image**, at build time. |
| `RUN npm run build` | Run `tsc` → produces `/app/dist`. |
| `EXPOSE 4000` | Documentation + a hint to tooling that the app listens on 4000. Does **not** publish the port — `-p` / `ports:` still does that. |
| `CMD ["node", "dist/index.js"]` | The default command when a container starts from this image. Exec form (JSON array) — no shell, signals reach Node directly. |

**Why it's naive:** `COPY . .` is line 4. Any change to *any* file — even a comment in one route — invalidates that layer and every layer after it, so `npm install` re-runs on every code change. Slow.

---

## ⚡ 2. Order Instructions for Layer Caching

Dependencies change rarely; source code changes constantly. Copy and install dependencies **before** copying the rest of the code:

```dockerfile
FROM node:22-alpine
WORKDIR /app

# 1. Only the files that determine dependencies
COPY package.json package-lock.json ./

# 2. Install — this layer is cached until package*.json changes
RUN npm ci

# 3. Now the source
COPY . .

# 4. Compile
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
```

Now the cache behaves like this:

| You changed… | `npm ci` re-runs? | `npm run build` re-runs? |
|---|---|---|
| a route file in `src/` | ❌ (cached) | ✅ |
| `package.json` (added a dep) | ✅ | ✅ |
| nothing (rebuild) | ❌ | ❌ |

> **`npm ci` vs `npm install` in a Dockerfile:** use `npm ci`. It installs **exactly** what `package-lock.json` says (reproducible), errors if `package.json` and the lockfile disagree, and is faster in CI/build contexts. `npm install` can silently update the lockfile.

---

## 🚫 3. `.dockerignore`

Sits next to the Dockerfile. Works like `.gitignore` — listed paths are excluded from the build context, so `COPY . .` never copies them.

```gitignore
node_modules
dist
npm-debug.log
.env
.env.*
.git
.gitignore
Dockerfile
docker-compose.yml
*.md
.vscode
```

Why each matters:

- **`node_modules`** — you install fresh inside the image with `npm ci`; copying the host's (possibly built for a different OS/arch) is wrong and huge.
- **`dist`** — built inside the image; a stale host copy could sneak in.
- **`.env`** — **never bake secrets into an image.** Images get pushed to registries and shared. Pass env at run time (`--env-file`, compose `environment:` / `env_file:`).
- **`.git`** — often hundreds of MB of history, useless in the image.

---

## 🏗️ 4. Multi-Stage Build (the one to actually use)

Problem with the single-stage image: it ships `typescript`, `@types/*`, `tsc-watch`, `drizzle-kit` — all **dev-only** — plus the TypeScript source. None of that is needed to *run* `node dist/index.js`. Bigger image, larger attack surface.

A multi-stage build uses **two `FROM`s**. The first stage builds; the second stage starts clean and copies only the finished artifacts.

```dockerfile
# ---------- Stage 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci                      # ALL deps, including devDependencies (need tsc)

COPY . .
RUN npm run build               # tsc → /app/dist

RUN npm prune --omit=dev        # drop devDependencies from /app/node_modules

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# copy only what's needed to RUN
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000
USER node                       # don't run as root
CMD ["node", "dist/index.js"]
```

What each part buys you:

| Line | Benefit |
|---|---|
| `AS builder` / `AS runtime` | Names the stages so `COPY --from=builder` can reach back into the first. |
| `npm prune --omit=dev` | Strips `typescript`, `drizzle-kit`, `@types/*` out of `node_modules` before it's copied forward. |
| `COPY --from=builder /app/dist` | Only compiled JS lands in the final image — no `.ts` source. |
| final image has **no** `tsc` | Smaller, fewer packages that could have a CVE. |
| `ENV NODE_ENV=production` | Express and many libs skip dev-only work; `npm` wouldn't install dev deps if it ran here. |
| `USER node` | The `node` images ship a non-root `node` user. Running as non-root limits damage if the app is compromised. |

Rough size difference for a typical TS API: single-stage ≈ 400–500 MB; multi-stage ≈ 150–200 MB.

> **Prisma note:** if you use Prisma, run `npx prisma generate` in the builder stage *after* `npm ci`, and copy `node_modules/.prisma` (or the whole `node_modules`) forward. Prisma's query engine binary must match the runtime OS — `node:22-alpine` uses musl, so ensure the right binary target. Drizzle (what `setups/03` uses) has no such native engine and needs nothing special.

---

## 🔨 5. Building and Running

```bash
# build an image named "my-api" from the Dockerfile in the current dir
docker build -t my-api .

# tag with a version too
docker build -t my-api:1.0.0 -t my-api:latest .

# build a specific stage only (e.g. for debugging the builder)
docker build --target builder -t my-api-builder .

# run it, publishing port 4000 and passing env from a file
docker run -d --name my-api -p 4000:4000 --env-file .env my-api

# see it worked
docker logs -f my-api
curl http://localhost:4000/health
```

| `docker build` flag | Meaning |
|---|---|
| `-t name[:tag]` | Name (and optionally tag) the resulting image. Repeatable. |
| `.` | The **build context** — the folder sent to the builder. `COPY` paths are relative to this. |
| `-f path/to/Dockerfile` | Use a Dockerfile that isn't `./Dockerfile`. |
| `--target <stage>` | Stop at a named stage. |
| `--no-cache` | Ignore the layer cache and rebuild everything. |
| `--build-arg KEY=value` | Pass a value to an `ARG` in the Dockerfile (build-time only, not runtime env). |

---

## 🧾 6. Instruction Reference (the ones you'll meet)

| Instruction | Purpose | Note |
|---|---|---|
| `FROM image:tag [AS name]` | Base image; starts a stage. | Multiple `FROM`s = multi-stage. |
| `WORKDIR /path` | Set the working dir (creates it). | Prefer over `RUN cd`. |
| `COPY src dest` | Copy from build context into the image. | `COPY --from=stage` copies from another stage. |
| `ADD` | Like `COPY` but also unpacks tars and fetches URLs. | Prefer `COPY`; `ADD`'s magic surprises people. |
| `RUN cmd` | Execute a command at **build** time, commit the result as a layer. | Chain with `&&` to keep layers few. |
| `ENV KEY=value` | Set an env var present at **build and run** time. | Don't put secrets here. |
| `ARG KEY[=default]` | A **build-time only** variable, set via `--build-arg`. | Not visible at runtime. |
| `EXPOSE port` | Document the listening port. | Does **not** publish it. |
| `USER name` | Run subsequent instructions / the container as this user. | Use a non-root user for the final stage. |
| `CMD ["exe","arg"]` | Default command for `docker run`. | Overridable at run time. Exec form preferred. |
| `ENTRYPOINT ["exe"]` | Fixed executable; `CMD` becomes its default args. | Used for wrapper/CLI-style images. |
| `HEALTHCHECK CMD ...` | How Docker tests the container is healthy. | Compose can wait on this. |

---

## ✅ Takeaways

- A **Dockerfile builds your own image** so your API runs the same everywhere — same payoff as Dockerizing the DB.
- Instructions become **cached layers**; put **stable/expensive** steps (`COPY package*.json` → `npm ci`) **before** volatile ones (`COPY . .`).
- Use **`npm ci`**, add a **`.dockerignore`** (at minimum `node_modules`, `dist`, `.env`, `.git`), and **never bake `.env` into the image**.
- Use a **multi-stage build**: compile TS in a `builder` stage, copy only `dist/` + prod `node_modules` into a slim `runtime` stage; set `NODE_ENV=production` and `USER node`.
- Build: `docker build -t my-api .`. Run: `docker run -p 4000:4000 --env-file .env my-api`. Usually Compose does the build for you (`build: .`) — next file.
