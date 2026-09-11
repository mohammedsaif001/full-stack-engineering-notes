# JWT, Signing Keys, OIDC & OAuth 2.0 — Auth Across Microservices

## Comprehensive Guide to: What a JWT Actually Is, Symmetric vs Asymmetric Signing, Why Microservices Need a Public-Key Route, and How OIDC/OAuth2/SAML Standardize It

---

## 📌 Executive Summary

- **A JWT (JSON Web Token)** is a self-contained, signed string that proves "this data came from the auth server and hasn't been tampered with." It is **not encrypted by default** — anyone can read its contents, but only the holder of the correct key can have *signed* it. It has three parts, `header.payload.signature`, each base64url-encoded and joined by dots.
- **Symmetric JWT signing (HMAC, e.g. HS256)**: one secret key both signs and verifies. Every service that needs to verify a token needs the *exact same secret*. Fine for a monolith (one process, one secret). Painful for microservices — the secret must be copied to every service, and rotating it means updating it everywhere at once, or every service temporarily rejects valid tokens.
- **Asymmetric JWT signing (RSA/EC, e.g. RS256/ES256)**: a **private key signs**, a **public key verifies**. The private key never leaves the auth service. Every other service only needs the *public* key — which is safe to share widely, because a public key can verify a signature but cannot forge one. This removes the "reshare a secret everywhere" problem: rotating keys only requires the auth service to publish a new public key, not distribute a new secret to N services.
- **Why not just call the auth service on every request?** You could add a network hop — "hey auth service, is this token valid?" — but that means the auth service is hit on *every single API call across every service*, becomes a single point of failure/bottleneck, and adds latency to every request. Asymmetric signing lets each service verify tokens **locally**, in-memory, with zero network calls per request.
- **Public keys are fetched via a well-known endpoint (JWKS)**, not hardcoded — each service fetches it once at boot (or on a schedule / on cache-miss) and caches it in memory, re-fetching only when the key rotates.
- **OIDC (OpenID Connect)** is a thin **identity layer built on top of OAuth 2.0**. OAuth 2.0 alone only standardizes *authorization* (granting access/tokens); it says nothing about *who the user is*. OIDC adds a standard discovery document (`/.well-known/openid-configuration`), a standard ID token shape (JWT with `sub`, `email`, `aud`, etc.), a `userinfo` endpoint, and a `jwks_uri` for public keys — so every provider (Google, your own auth service, Auth0) exposes identity the same way instead of inventing its own `/public-key`, `/pubkey.txt`, `/get-key` variants.
- **OAuth 2.0** is the underlying **authorization framework**: it defines the redirect-to-login, short-lived authorization `code`, and the code-for-token exchange. OIDC *rides on* this flow to also hand back identity, not just an access token.
- **SAML** is the older, XML-based alternative to OIDC, still common in enterprise SSO (banks, universities, corporate IdPs).

---

## 🧠 Core Analogies

- **Symmetric key = one physical house key copied for every roommate.** If one copy is lost or a roommate moves out, you must re-key the lock **and hand out new copies to everyone** — expensive to coordinate as the household (microservices) grows.
- **Asymmetric key = a padlock and its key.** The auth service holds the *only key* that can lock (sign) the padlock. It hands out **copies of the padlock** (public key) to everyone else. Anyone can check "is this padlock actually locked shut correctly" (verify), but nobody except the key-holder can lock a new one (sign a new token). Losing a padlock copy is harmless — it's not the key.
- **JWKS route = a vending machine for padlocks**, always at the same known address (`/.well-known/openid-configuration` → `jwks_uri`), instead of every company inventing its own place to leave spare padlocks (`/pk`, `/public-key`, `/authpublic`, one returning JSON, one returning plain text...).
- **Authorization code = a coat-check ticket, not the coat itself.** The browser only ever sees a short-lived, single-use ticket number. Only your backend — which also holds the `client_secret` — can exchange that ticket for the actual coat (the token). If the ticket is intercepted in a URL/browser history, it's useless without the secret.
- **OIDC on top of OAuth2 = a delivery service (OAuth2) that now also hands you a signed ID card (OIDC) along with the package**, instead of just proving you're allowed to receive *a* package.

---

## 🗺️ 1. What Exactly Is a JWT?

A JWT is a compact, URL-safe string with three dot-separated, base64url-encoded parts:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoiYUBiLmNvbSIsImF1ZCI6ImJvb2tpbmctYXBpIiwiZXhwIjoxNzMwMDAwMDAwfQ.SIGNATURE_BYTES
      HEADER                                    PAYLOAD (claims)                                                    SIGNATURE
```

| Part | Contents | Purpose |
|---|---|---|
| **Header** | `{ "alg": "RS256", "typ": "JWT" }` | Which algorithm signed it (HS256 = symmetric, RS256/ES256 = asymmetric). |
| **Payload (claims)** | `{ "sub", "email", "aud", "iss", "exp", "iat", ... }` | The actual data. `sub` = subject (user id), `iss` = issuer, `aud` = audience (intended recipient service), `exp` = expiry timestamp. **This is readable by anyone** — never put secrets/passwords here. |
| **Signature** | `sign(base64(header) + "." + base64(payload), key)` | Proves the header+payload haven't been altered since signing, and that whoever signed it had the correct key. |

**Key point your notes got right, worth restating precisely:** a JWT is **signed, not encrypted**. Base64 is *encoding*, not encryption — anyone can decode the payload and read it (paste any JWT into jwt.io and see for yourself). The signature is what you actually trust; it's what verification checks.

---

## 🔑 2. Symmetric vs Asymmetric JWT Signing

Your notes call these "symmetric authentication" and "asymmetric authentication" — the more precise term is **symmetric vs asymmetric *signing algorithm***, since JWTs themselves are one building block used inside authentication, not authentication itself.

### 2.1 Symmetric signing (HMAC — HS256)

One secret key (`JWT_SECRET`) both **signs** and **verifies**:

```javascript
// signing (auth service)
const token = jwt.sign(payload, process.env.JWT_SECRET, { algorithm: "HS256" });

// verifying (ANY service that checks the token) — needs the SAME secret
jwt.verify(token, process.env.JWT_SECRET);
```

- **Works fine in a monolith**: one process, one `.env`, one secret. There's only one "copy" of the app running the auth logic, even if you run multiple *instances* of that same monolith behind a load balancer (vertical/horizontal scaling of the *same* codebase) — you just make sure every instance has the same `JWT_SECRET` env var.
- **Breaks down across independently-deployed services**: if `auth-service`, `booking-service`, and `upload-service` are separate codebases/deployments, they all need the identical secret. Rotating it for security means updating it **everywhere at once** — miss one service and it either rejects valid tokens (secret changed there but not elsewhere) or accepts tokens it shouldn't (old secret still active somewhere).

### 2.2 Asymmetric signing (RSA/EC — RS256/ES256)

A **key pair**: private key signs, public key verifies. They are mathematically related but distinct — the public key **cannot** be used to derive the private key or to forge a new valid signature.

```javascript
// signing — ONLY the auth service holds privateKey
const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

// verifying — booking-service, upload-service etc. only need publicKey
jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

| | Symmetric (HS256) | Asymmetric (RS256/ES256) |
|---|---|---|
| Sign | secret key | private key |
| Verify | **same** secret key | **public** key (different from private) |
| Who can sign | anyone holding the secret | only the holder of the private key |
| Who can verify | anyone holding the secret (so they *could* also sign — bad for microservices) | anyone holding the public key (and they **cannot** sign with it) |
| Distributing verification ability | means distributing signing ability too (risk) | safe — public key is meant to be public |
| Rotation pain | must update every service simultaneously | only the auth service rotates the private key; others just fetch the new public key |

This is *the* reason microservice architectures default to asymmetric signing: **verification and signing privilege are separated.** Only the auth service can *mint* tokens; every other service can *check* tokens without ever being able to mint its own.

---

## 🏗️ 3. Monolith vs Microservices — Why This Matters

**Monolith**: all APIs (`auth`, `booking`, `file-upload`, ...) live in one codebase, deployed as one unit (possibly scaled horizontally — several identical copies behind a load balancer). A bug in booking logic requires redeploying the whole app; every copy is identical. Since it's one codebase, one shared symmetric secret is simple and safe enough.

**Microservices**: each domain is its own independently deployable service — `auth-service`, `booking-service`, `upload-service` — scaled and released independently. A bug in booking only requires fixing/redeploying `booking-service`.

The problem: **every service now needs to know "is this request from a logged-in user?"** Two bad options:

1. **Duplicate the entire auth/login system into every service.** Massive duplication, drifts out of sync, multiplies the attack surface.
2. **Have each service call the auth service on every incoming request** to ask "is this token valid, and who is it?" This works, but:
   - Adds a network hop (latency) to **every single API call**, in every service.
   - Makes the auth service a **hot path for all traffic**, not just login — a bottleneck and single point of failure.

**Asymmetric JWTs solve this without either downside.** The auth service is the only one that *signs* tokens (still centralizing identity issuance). But every other service can *verify* a token entirely **locally** — no network call — because it only needs the public key, which rarely changes and can be cached in memory.

```
token + public key  →  (cryptographic check, no network call)  →  trusted user info (claims)
```

---

## 🔐 4. Distributing the Public Key: From Ad-Hoc Route to JWKS Standard

### 4.1 The naive approach

```javascript
// auth-service
app.get("/public-key", (req, res) => {
  res.json({ key: process.env.PUBLIC_KEY });
});
```

Each dependent service calls this **once at startup** and caches the key in memory (re-fetching every request would reintroduce the exact latency/hot-path problem asymmetric signing was meant to avoid). Re-fetch on a schedule (e.g. every 10 minutes, once a day) or when verification fails with an "unknown key id" error (a sign the key rotated).

### 4.2 Why this doesn't scale across companies/providers

Nothing stops every team from inventing their own route and response shape:

| Company | Route | Format |
|---|---|---|
| A | `/public-key` | JSON |
| B | `/pk` | plain text |
| C | `/authpublic` | a downloadable `.pem` file |

Every consumer now needs custom code per provider. There's no way to write one generic "OIDC client" library if every issuer does it differently. **This is exactly the problem OIDC standardizes away.**

### 4.3 The standardized answer: JWKS behind `.well-known`

Every OIDC-compliant auth service must expose:

```
GET /.well-known/openid-configuration
```

returning a fixed JSON shape — regardless of which company or library implements it — including a `jwks_uri` field pointing to where the public key(s) live, in a standard JSON Web Key Set format. Any OIDC-aware library can consume any OIDC-compliant provider without custom per-provider code.

---

## 🌐 5. OIDC (OpenID Connect) — Standardizing Identity on Top of OAuth 2.0

**Correction to a common mix-up**: OAuth 2.0 and OIDC are not two independent, equal standards that "help each other." **OAuth 2.0 came first and defines the authorization mechanics** — redirecting a user to log in, issuing a short-lived code, exchanging that code for a token. **OIDC is a thin identity layer specified on top of OAuth 2.0** — it reuses OAuth2's entire flow and adds a standard way to also get *who the user is* (an ID token) rather than only *an access token for some resource*.

### 5.1 The discovery document

```
GET https://chaiauth.com/.well-known/openid-configuration
```

Response (shape is standardized, values are provider-specific):

```json
{
  "issuer": "https://chaiauth.com",
  "authorization_endpoint": "https://chaiauth.com/login",
  "token_endpoint": "https://chaiauth.com/oauth/token",
  "userinfo_endpoint": "https://chaiauth.com/userinfo",
  "jwks_uri": "https://chaiauth.com/.well-known/jwks.json"
}
```

| Field | Meaning |
|---|---|
| `issuer` | The base identity of the auth server — every token it issues carries this as its `iss` claim, so a verifier can confirm the token came from the expected issuer. |
| `authorization_endpoint` | Where the user's browser is sent to actually log in / grant consent and come back with a code. |
| `token_endpoint` | Server-to-server endpoint where the authorization code is exchanged for the real tokens. |
| `userinfo_endpoint` | Given a valid access token, returns profile info about the logged-in user. |
| `jwks_uri` | Where to fetch the current public key(s) to verify tokens' signatures. |

### 5.2 The ID token's standardized claims

OIDC doesn't just standardize the discovery *routes* — it also standardizes the **shape of the identity token itself**, so `sub`, `email`, `aud`, `iss`, `exp` mean the same thing across every OIDC provider:

- `sub` — subject, the stable unique user id.
- `email` — the user's email (if requested/scoped).
- `aud` — audience: which client/service this token was issued for.
- `iss` / `exp` — issuer and expiry, as above.

---

## 🔁 6. OAuth 2.0 — The Authorization Flow Underneath

### 6.1 Registering your app (getting trusted)

If you're building an app that lets users "Sign in with Google," you can't just call Google's login endpoint anonymously and expect it to hand you a token for an arbitrary app. **Anyone technically *can* hit the authorization endpoint** — the point of registering in Google's developer console isn't that external callers are "blocked" and only internal ones allowed. It's that Google needs to know:

- **who is asking** (via a `client_id` issued to your registered app),
- **where it's allowed to send the user back to** (a `redirect_uri` allowlist, so a token/code can't be redirected to an attacker's domain),
- and it shows the user a **consent screen naming your specific app** ("MyBookingApp wants access to your email"), so the user — not just Google — decides whether to trust you.

You fill out the developer console: app name, why you need the data, terms/privacy URL, redirect URI. Google then issues you a **`client_id`** (public, sent in URLs, identifies your app) and a **`client_secret`** (private, server-side only, proves *you* are that registered app and not an impersonator).

### 6.2 Why OAuth2 doesn't hand back the token directly

If the login redirect could return the actual access token straight in the URL (`?token=xyz`), that token would sit in browser history, server logs, the `Referer` header of any subsequent request — trivially leakable. Instead:

1. Browser is redirected to `authorization_endpoint` with your `client_id` and `redirect_uri`.
2. User logs in / consents.
3. Google redirects back to your `redirect_uri` with a **short-lived, single-use authorization `code`**: `https://yourapp.com/callback?code=abc123`.
4. Your **backend** (never the browser) sends `code + client_id + client_secret` to the `token_endpoint`.
5. Google verifies the code was issued to that exact `client_id`/`client_secret` pair and hasn't been used or expired, then returns the real **access token** (and, for OIDC, an **ID token**) directly to your backend — never exposed in a URL.

This is why the `client_secret` matters: even if someone intercepts the authorization `code` from a browser redirect, they can't exchange it for a token without also knowing your server-only secret.

### 6.3 SSO (Single Sign-On)

Because the identity provider (Google, or your own `auth-service`) remembers the user's session after the first login, subsequent logins to *other* apps using the same provider don't require re-entering credentials — the user is redirected, is already recognized as logged-in at the provider, and just consents (or not even that, if already approved). That's SSO: log in once, reuse that session across multiple relying applications.

---

## 📄 7. SAML — The Older Alternative

**SAML (Security Assertion Markup Language)** predates OIDC, is **XML-based** (vs OIDC's JSON), and is still common in enterprise/legacy SSO setups (corporate identity providers, universities, banks). It has the same conceptual shape as OIDC:

| Endpoint | Role |
|---|---|
| **Authorization/SSO endpoint** | Where the user actually logs in. |
| **Token/Assertion endpoint** | Server-to-server exchange, analogous to OAuth2's `token_endpoint`. |

OIDC has largely displaced SAML for new web/mobile apps because JSON + REST is simpler to work with than SOAP/XML, but SAML remains relevant when integrating with older enterprise identity systems.

---

## ✅ 8. Putting It All Together

| Concept | One-line definition |
|---|---|
| **JWT** | A signed (not encrypted), self-contained token: `header.payload.signature`. |
| **Symmetric signing (HS256)** | One shared secret signs and verifies. Simple in a monolith, painful to rotate/share across microservices. |
| **Asymmetric signing (RS256/ES256)** | Private key signs (stays only in auth-service), public key verifies (safely distributed everywhere else). |
| **JWKS / `.well-known`** | The standardized route where public keys are published, so services fetch and cache them instead of hardcoding or calling auth on every request. |
| **OAuth 2.0** | The authorization framework: redirect → consent → short-lived code → backend exchanges code (+ client_secret) for a token. |
| **OIDC** | An identity layer on top of OAuth 2.0: standardizes discovery (`/.well-known/openid-configuration`), the ID token's claims (`sub`, `email`, `aud`...), `userinfo_endpoint`, and `jwks_uri`. |
| **SAML** | XML-based predecessor/alternative to OIDC, still common in enterprise SSO. |
| **SSO** | Logging in once at the identity provider grants access across multiple relying applications without re-authenticating each time. |

**Practical takeaway for a microservices project**: put an OIDC-compliant `auth-service` at the center. It signs tokens with a private key and exposes `.well-known/openid-configuration` + a `jwks_uri`. Every other service (`booking`, `upload`, ...) fetches and caches the public key once, then verifies incoming JWTs **locally**, with zero per-request calls back to auth — getting both **centralized identity issuance** and **decentralized, low-latency verification**.

### Suggested hands-on assignment
Build a minimal version of this yourself before reaching for Auth0/Clerk/Better-Auth in production: an `auth-service` that signs RS256 JWTs, exposes `/.well-known/openid-configuration` and a JWKS route, and a second toy service that fetches the public key once and verifies tokens against it. This is the same shape those hosted providers implement for you.
