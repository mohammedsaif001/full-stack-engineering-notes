# CDN & Caching: What It Is, and How to Clear It (React / WordPress)
## Part 3 — After DNS Resolves and TCP/HTTP Delivers, Why Doesn't My Change Show Up?

---

## 📌 Executive Summary

You deploy a change. You refresh the page. **Nothing changed.** This is almost always a **caching** problem, and a CDN is usually one of the layers doing the caching.

> **CDN, in one sentence:** "A network of servers spread around the world that store *copies* of your site's files close to your visitors, so they don't have to fetch everything from your one original server every time."

The catch: because a CDN **stores a copy**, that copy can go **stale** — it still has yesterday's version after you've shipped today's fix. Clearing/purging the cache is how you tell the CDN "throw away your copy, go get the new one."

This doc covers: what a CDN actually is, why caching exists at multiple layers (not just the CDN), and the concrete steps to clear cache for a **React app** and for **WordPress**.

---

## 🧠 Core Analogy: The Library Branch System

Imagine one central library (your **origin server**) with every book ever printed. Every reader in the world requesting a book from that single building would create massive queues, and readers far away would wait days for shipping.

A **CDN** is like opening **branch libraries** in every city, each holding **copies of the most popular books**. When you walk into your local branch:

- If they have the book (a **cache hit**) → you get it instantly.
- If they don't (a **cache miss**) → the branch borrows it from the central library, gives it to you, **and keeps a copy** for the next person who asks.

The problem: if the central library **publishes a new edition** of a book, your local branch doesn't automatically know. It keeps handing out the old edition until someone tells it to update its copy — that's **cache purging**.

---

## 🏗️ What a CDN Actually Is

**CDN = Content Delivery Network** (sometimes "Content Distribution Network").

- A geographically distributed set of servers, called **edge servers** or **PoPs (Points of Presence)**.
- Each edge server keeps **cached copies** of your static files: HTML, CSS, JS bundles, images, fonts, videos.
- When a visitor requests your site, DNS/the CDN routes them to the **nearest edge server**, not your actual origin server.

```
                         ┌─────────────┐
                         │   Origin     │
                         │   Server     │  (your actual app/host — Vercel, AWS, WP hosting)
                         └──────┬──────┘
                                │  (CDN fetches once, then caches)
              ┌─────────────────┼─────────────────┐
        ┌─────▼─────┐    ┌─────▼─────┐     ┌─────▼─────┐
        │ Edge (US)  │    │ Edge (EU) │     │ Edge (IN) │
        │  cached     │    │  cached   │     │  cached   │
        │  copy       │    │  copy     │     │  copy     │
        └─────┬─────┘    └─────┬─────┘     └─────┬─────┘
              │                  │                   │
          Visitor A          Visitor B           Visitor C
        (New York)           (Berlin)            (Mumbai)
```

**Why CDNs exist (the actual engineering reasons):**

| Benefit | Explanation |
|---|---|
| **Latency** | A visitor in Mumbai hitting an edge server in Mumbai is far faster than a round-trip to a server in Virginia — this is the same "closest physical copy" idea covered in [DNS Anycast routing](../01/1-CN_The%20Secret_Life_of_Domain_Names.md) |
| **Origin load reduction** | Your actual server only serves each file *once per edge location* until it expires, instead of once per visitor — this is what lets a single small server survive a traffic spike |
| **DDoS/traffic absorption** | CDNs like Cloudflare absorb huge traffic spikes/attacks at the edge before it ever reaches your real server |
| **Reliability** | If your origin server briefly goes down, edge servers can often still serve cached copies |

**Common CDN providers:** Cloudflare, Vercel's Edge Network, AWS CloudFront, Fastly, Akamai, jsDelivr (for npm packages), WP Rocket / Jetpack Boost (WordPress-specific).

---

## 🗂️ Caching Isn't Just "The CDN" — The Full Cache Stack

This is the part that trips people up: when a page "isn't updating," there are actually **several separate caches** it could be stuck in, each cleared differently.

```
Browser Cache  →  CDN / Edge Cache  →  Server / App Cache  →  Origin (actual latest files)
     ↑                    ↑                      ↑
 (your device)     (Cloudflare, Vercel,    (WP plugin cache,
                    CloudFront, etc.)        React build output,
                                              Nginx/Redis cache)
```

| Layer | What it stores | Who controls it |
|---|---|---|
| **Browser cache** | Files the *visitor's own browser* saved locally last visit | The visitor's browser (you can only hint via headers) |
| **CDN / edge cache** | Copies of static files at edge servers worldwide | You, via the CDN dashboard/API/plugin |
| **Server-side / app cache** | Rendered HTML pages, DB query results (common in WordPress plugins) | You, via server config or a caching plugin |
| **Build output (React specifically)** | The actual compiled JS/CSS bundle files | You, by rebuilding and redeploying |

**Why this matters:** clearing the CDN cache alone won't fix a stale page if the *visitor's browser* also cached the old file, or if a *server-side plugin cache* is still serving an old rendered HTML snapshot. You often need to clear more than one layer.

---

## ⏱️ How Caching Decides What's "Stale" — Cache-Control & ETags

Just like DNS uses **TTL** to decide when a cached answer expires (see [DNS notes](../01/1-CN_The%20Secret_Life_of_Domain_Names.md)), HTTP caching uses response **headers** to decide how long a cached file is considered valid.

```
Cache-Control: max-age=3600, public
```

| Header | Meaning |
|---|---|
| `Cache-Control: max-age=3600` | Cache this file for 3600 seconds (1 hour), then re-check with the origin |
| `Cache-Control: no-cache` | Always re-validate with the origin before using the cached copy (still may reuse it if unchanged) |
| `Cache-Control: no-store` | Never cache this at all |
| `ETag` | A fingerprint/hash of the file's content — if the ETag hasn't changed, the cached copy is still valid, even past its `max-age` |

**Why build tools fingerprint filenames** (this is the real trick modern frameworks use): instead of relying purely on cache expiry timing, React/Vite/webpack output files like:

```
main.a3f9c21b.js
styles.7e2d0f4a.css
```

The hash in the filename **changes whenever the content changes**. Since it's a *new filename*, the CDN and browser have never seen it before → automatic cache miss → the new file downloads immediately, with **zero manual cache-clearing needed** for the JS/CSS bundles themselves. Only the *HTML file* referencing these hashed filenames needs a short cache time (or no-cache), since it's the one file that must always be fresh to point at the latest hashed assets.

---

## ⚛️ Clearing Cache for a React App

### First: Diagnose Which Layer Is Stale

1. **Hard refresh the browser** first — this rules out browser cache before touching anything else:
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`
   - Or open DevTools → Network tab → check **"Disable cache"** while DevTools is open, then reload.

2. If a hard refresh doesn't fix it, the issue is likely the **CDN edge cache** still serving the previous deployment's files, or the **build itself** wasn't rebuilt.

### If You Deploy via Vercel

Vercel's CDN typically **auto-invalidates** on every new deployment — each deploy gets its own immutable URL, and `main`/production traffic is atomically switched over. If it still looks stale:

```bash
# Force a completely fresh deployment (no build cache reuse)
vercel --force
```

Or in the dashboard: **Deployments → (latest deployment) → ⋯ → Redeploy → uncheck "Use existing Build Cache"**.

### If You Deploy via Netlify

```bash
# Trigger a clean rebuild, ignoring Netlify's build cache
netlify deploy --prod --build
```

Or in the dashboard: **Deploys → Trigger deploy → Clear cache and deploy site**.

### If You Deploy via AWS S3 + CloudFront

This is the manual case — S3 doesn't auto-invalidate CloudFront's edge cache when you upload new files.

```bash
# Upload the new build
aws s3 sync ./build s3://your-bucket-name --delete

# Manually invalidate CloudFront's cached copies so edges re-fetch from S3
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

`--paths "/*"` invalidates everything — for a large site with heavy traffic, invalidating only changed paths (e.g. `/index.html`) is cheaper, since CloudFront invalidation requests have a cost/quota.

### If You Deploy via Cloudflare (in front of any host)

**Dashboard:** Cloudflare → your site → **Caching → Configuration → Purge Cache** → either "Purge Everything" or purge specific URLs.

**Or via API:**

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### The React-Specific Root Cause: Rebuild, Don't Just Restart

A very common mistake: restarting the server/container **without rebuilding**. React's `npm run build` produces static files in `/build` or `/dist` — if you deploy without re-running build, you're re-deploying the *old* hashed bundle, and no amount of cache-clearing will show new code because the new code was never actually built.

```bash
# The actual fix, in order:
npm run build          # 1. produce fresh hashed bundles
# then deploy/upload the new /build or /dist folder
# then purge CDN cache for the HTML entry point (index.html) specifically
```

---

## 🌐 Clearing Cache for WordPress

WordPress caching is layered more heavily than a static React app, because WordPress dynamically generates HTML from a database on every request by default — caching plugins exist specifically to avoid that expensive regeneration.

### The WordPress Cache Stack

```
Browser Cache → CDN (Cloudflare/etc.) → Caching Plugin (page cache) → PHP/Object Cache → MySQL Database
```

### 1. Clear the Caching Plugin (Most Common Fix)

Depending on which plugin is installed, look for a **"Clear Cache" / "Purge Cache"** button:

| Plugin | Where to clear |
|---|---|
| **WP Super Cache** | Settings → WP Super Cache → **Delete Cache** |
| **W3 Total Cache** | Performance → Dashboard → **Empty All Caches** |
| **WP Rocket** | Settings → WP Rocket → **Clear Cache** (top toolbar button also available site-wide) |
| **LiteSpeed Cache** | LiteSpeed Cache → Toolbox → **Purge All** |
| **WP Fastest Cache** | WP Fastest Cache → **Delete Cache** |

Most of these plugins also add a **"Clear Cache" button directly in the WordPress admin toolbar** (top bar, visible on every page) once activated — the fastest way to purge without digging into settings.

### 2. Clear the Host's Server-Level Cache

Many managed WordPress hosts run their **own** caching layer *in addition to* any plugin — clearing the plugin cache alone won't touch this:

| Host | Where to clear |
|---|---|
| **WP Engine** | WP Engine dashboard → **Purge Caches** (also purges CDN automatically) |
| **Kinsta** | MyKinsta → Sites → your site → **Clear Cache** |
| **SiteGround** | Site Tools → Speed → Caching → **Flush Cache** |
| **Bluehost / GoDaddy (shared hosting)** | Usually via a "Caching" or "Performance" tab in cPanel/hPanel |

### 3. Clear the CDN Layer

If Cloudflare (or another CDN) sits in front of WordPress:

- **Cloudflare Dashboard:** Caching → Configuration → **Purge Everything**
- Many hosts (WP Engine, Kinsta) **integrate Cloudflare purging into their own "Clear Cache" button** — check if their built-in purge already covers this before doing it twice.

### 4. Clear Object Cache (Redis/Memcached — if configured)

Larger WordPress sites often add an **object cache** (caches database query results, separate from full-page HTML caching):

```bash
# If WP-CLI is available on the server:
wp cache flush
```

Or via the caching plugin's settings if it manages Redis/Memcached (W3 Total Cache and WP Rocket both expose this).

### 5. Browser Cache (Same as React)

Same hard-refresh steps apply: `Ctrl+Shift+R` / `Cmd+Shift+R`, or test in an incognito/private window to rule out the browser entirely.

### WordPress Troubleshooting Order (Practical Checklist)

1. Hard refresh / test in incognito → rules out **browser cache**.
2. Clear the **caching plugin's** cache (WP Rocket, W3TC, etc.) → rules out **page cache**.
3. Clear the **host's** server-level cache (if managed hosting) → rules out **infrastructure cache**.
4. Purge the **CDN** (Cloudflare, etc.) → rules out **edge cache**.
5. If still stale, check whether the change was actually saved on the **origin** (a genuine save/publish failure looks identical to a caching issue).

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line definition |
|---|---|
| **CDN** | Distributed edge servers caching copies of your site near visitors, to cut latency and origin load |
| **Edge server / PoP** | One physical CDN location holding cached copies |
| **Origin server** | Your actual server — the source of truth the CDN copies from |
| **Cache hit** | Requested file found in cache — served instantly, origin never contacted |
| **Cache miss** | File not cached (or expired) — origin is contacted, response then gets cached |
| **Purge / invalidate** | Manually force a cache to discard its copy so the next request re-fetches fresh |
| **Cache-Control / max-age** | HTTP header telling caches how long a file is valid before re-checking |
| **ETag** | A content fingerprint used to check "has this actually changed?" even after `max-age` expires |
| **Cache busting (filename hashing)** | Changing a file's name when its content changes, so it's treated as brand-new and never served stale |
| **Object cache** | Server-side cache of database query results (Redis/Memcached), separate from full-page HTML cache |

### Quick Purge Commands

```bash
# CloudFront
aws cloudfront create-invalidation --distribution-id ID --paths "/*"

# Cloudflare (API)
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# WordPress via WP-CLI (page cache, if plugin supports it, + object cache)
wp cache flush

# Browser hard refresh
Ctrl+Shift+R   (Windows/Linux)
Cmd+Shift+R    (Mac)
```

---

## 🎯 Key Takeaways

1. **A CDN is a network of servers holding cached copies of your files close to visitors** — it exists to cut latency and reduce load on your real (origin) server, the same "closest physical copy" idea behind DNS Anycast.
2. **Caching happens at multiple independent layers** — browser, CDN/edge, server/plugin, and the actual build output. A stale page can be stuck at any one (or several) of these, and each needs its own clearing step.
3. **Modern build tools (React/Vite/webpack) solve most of this automatically** via filename hashing — a changed file gets a new filename, making manual cache-busting unnecessary for JS/CSS bundles. Only the HTML entry point needs a short/no cache.
4. **The most common React "stale deploy" cause isn't caching at all** — it's deploying without re-running `npm run build`, so there's no new code to even serve.
5. **WordPress has more cache layers than React by default** — plugin page cache, host-level server cache, object cache, and CDN can all be stacked, so clearing "the cache" often means clearing three or four separate things in sequence.
6. **Cache-Control and ETag headers are what caches actually obey** — understanding `max-age` explains *why* a page updates on its own after some time even without manually purging anything.
7. **Always rule out the browser first** (hard refresh / incognito) before assuming it's a CDN or server issue — it's the fastest check and eliminates an entire layer immediately.

---

## 📚 Related Concepts to Explore Next

- **Cache-Control directives in depth** — `stale-while-revalidate`, `must-revalidate`, `private` vs `public`
- **Service Workers & the Cache API** — how PWAs implement their own offline-first caching layer in the browser
- **HTTP/2 Server Push vs. modern preloading** — alternate ways CDNs speed up delivery beyond plain caching
- **Reverse proxy caching (Varnish, Nginx `proxy_cache`)** — server-side caching outside of CDN/plugin layers
- **Incremental Static Regeneration (Next.js)** — a React-ecosystem framework feature for rebuilding just one stale page instead of purging everything

---

## 🔗 Resources

- **MDN: HTTP Caching:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- **Cloudflare Learning Center — CDN:** https://www.cloudflare.com/learning/cdn/what-is-a-cdn/
- **AWS CloudFront Invalidation Docs:** https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html
- **WP Rocket Cache Docs:** https://docs.wp-rocket.me/

---

**Last updated:** 2026-08-19
**Author:** Mohammed Saif
**LinkedIn:** linkedin.com/in/mohammedsaif001/
**Series:** Part 3 of Computer Networks Deep Dive (Part 1: DNS, Part 2: TCP/UDP)
