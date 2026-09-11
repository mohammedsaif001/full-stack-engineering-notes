# JWT, OIDC & OAuth 2.0 — Authentication Across Microservices

---

## 1. What is a JWT?

**JWT (JSON Web Token)** is a compact, signed string used to prove "this user is who they say they are" without the server having to look anything up in a database on every request.

A JWT looks like this:

```
eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoiYUBiLmNvbSJ9.SIGNATURE
        HEADER                        PAYLOAD                        SIGNATURE
```

Three parts, separated by dots, each base64url-encoded:

| Part | What's inside | Purpose |
|---|---|---|
| **Header** | `{ "alg": "HS256" }` or `{ "alg": "RS256" }` | Which algorithm was used to sign it. |
| **Payload (claims/data)** | `{ "sub": "user_123", "email": "a@b.com", "aud": "booking-api", "exp": 1234567 }` | The actual user info: `sub` = user id, `email`, `aud` = which service this token is meant for, `exp` = expiry time. |
| **Signature** | cryptographic signature over header + payload | Proves the token wasn't tampered with, and that it was issued by someone holding the correct key. |

**Important:** a JWT is **signed, not encrypted**. Base64 is just encoding — anyone can decode the payload and read it. Never put passwords or secrets inside a JWT payload. What you're trusting is the **signature**, not secrecy of the contents.

Now, the sequential flow — from a simple monolith all the way to a standardized microservices auth system:

---

## 2. Symmetric Authentication — One Shared Secret

JWTs can be signed using **one single secret key**. That same key is used both to create the token and to verify it. This is called **symmetric signing**.

- In **vertical scaling**, you have multiple copies of the same server, so that same JWT secret has to be shared with all of them.
- If that key ever needs to change (say, for security reasons after a leak), you have to change it **everywhere it's deployed**, at the same time — miss one server and it starts rejecting valid tokens or accepting old ones.

This is manageable in a **monolith**: all your APIs live under one codebase, just copied across multiple instances for scaling. One secret, distributed to all copies, works fine.

- If a bug shows up, you fix it in one codebase, and it takes effect across every copy of the deployment.

---

## 3. Monolith vs Microservices

In a **monolith**, everything (auth, booking, uploads, etc.) is one application, just copies for scale.

In **microservices**, each responsibility becomes its own independently running service:

- one server for **auth**
- one server for **booking**
- one server for **file upload**
- and so on

Now here's the problem: **every one of these services needs to check if the user is authenticated.**

### Option A: Give every service its own auth logic
Bad — duplicated, inconsistent, hard to maintain.

### Option B: Have one central auth service (OIDC — one point of auth)
Better. But now booking-service and upload-service need to check with auth-service on every request.

The straightforward way to do that is: **add another network hop** — booking-service calls auth-service to ask "is this token valid?" on every single incoming request.

The problem with this: it adds latency to every API call, **and** the auth service becomes hot (gets hit) on literally every request across every other service — a bottleneck and a single point of failure.

---

## 4. Asymmetric Authentication Solves This

Instead of one shared secret, use a **private key + public key pair**.

- The **private key** — used to *generate* (sign) the token — stays **only with the auth service**.
- **Every other service** only gets the **public key**, used to *verify* the token.

```
token + public key  =  user info (verified, no network call needed)
```

This is called **asymmetric** because the key used to sign (private) is different from the key used to verify (public) — unlike symmetric, where it's the same key for both.

Now each service can verify a token completely on its own, locally, without calling the auth service every single time.

---

## 5. Distributing the Public Key

The public key can be shared with every service. But this creates a smaller version of the same old problem: if that public key ever changes, you again have to reshare it across every service.

### Naive fix: a public-key route

```javascript
app.get("/public-key", (req, res) => {
  res.json({ key: process.env.PUBLIC_KEY });
});
```

Now, instead of a network hop on **every** request, each service can call this route **once when it starts up**, and keep the key in memory. It can also be refreshed on a schedule — every 10 minutes, once a month, or whenever it's about to expire — instead of on every network hop.

This looks good... until you scale it across companies. Every company could invent its own version:

- one uses `/pk`
- another uses `/public-key`
- another uses `/authpublic`
- one returns JSON, another plain text, another a downloadable file

There's no consistency. **This is why standardization was needed — OIDC.**

---

## 6. OIDC — Standardizing How Services Exchange User Info

To standardize how multiple microservices in a system exchange user identity information, two things exist:

1. **OIDC (OpenID Connect)**
2. **SAML**

This lesson focuses on OIDC.

OIDC should live on the **auth service**. That auth service should have **service discovery** — meaning it can have any kind of routes it wants internally (`/login`, `/signin`, whatever) — but it must expose **one common, standardized route**:

```
GET /.well-known/openid-configuration
```

This always returns a JSON response with (at minimum) these keys:

| Key | Meaning |
|---|---|
| `issuer` | The base endpoint / identity of the auth server. |
| `authorization_endpoint` | The login URL — where the user goes to authenticate and get a token for themselves. |
| `userinfo_endpoint` | Where you pass a token and get back user info. |
| `jwks_uri` | Where you fetch the public key to verify tokens. |

Whatever the actual login URL is, it lives inside `authorization_endpoint` in this JSON. It could be anything, as long as it's declared there — every OIDC-compliant provider follows this exact shape, so any client can consume any provider without custom code per company.

---

## 7. Why Not Just Build Your Own Auth Every Time?

If you create a new application that needs users to be authenticated, you *could* build the entire authentication system yourself — but it's complicated, and it's easy to miss something (token expiry handling, secure storage, refresh flow, etc.).

Instead, you can reuse an existing OIDC provider — like Google's.

But here's a nuance: **Google itself doesn't authenticate "on behalf of" just anyone who calls it directly.** If you're signed into your Google account, you can move between Gmail, YouTube, Drive, etc. without logging in again (session already trusted). But if you, as a random developer, hit Google's OpenID authorization endpoint directly for your own app, it won't just let your users log in and hand you their data — because Google needs to know **who is asking**.

By default, this kind of thing is meant for controlled use: anyone building their own auth system internally can wire it up freely for their own users. But when you want to use *someone else's* identity system (like Google) as a service for *your* app's users, Google needs a way to recognize you as a legitimate, trusted caller — otherwise anyone could spin up a fake app, hit the endpoint, and harvest user data. That's what the next step (registration) solves.

---

## 8. Registering Your App — Client ID & Client Secret, OAuth 2.0, SSO

To use Google's (or any provider's) OIDC as a login system for your own app, you go to their **developer console** and fill out a form: application name, why you need the data, terms & policies, the URL where your app is hosted, and your **redirect URI**.

Once submitted, the provider gives you two things:

- a **client ID**
- a **client secret**

Now, whenever your app sends the user to the provider's authorization URL, you pass along your `client_id`, so the provider recognizes the request as coming from a trusted, registered source.

This overall registration + trust mechanism is what **OAuth 2.0** is: an authorization framework that lets external applications securely use another system's authentication, without ever handling the user's actual password.

**SSO (Single Sign-On)**: once you log in one time at the provider, you can access multiple services without logging in again and again.

---

## 9. Why the Token Isn't Handed Back Directly

Once you have a client ID and secret, the provider still can't just hand you the token directly in the redirect — because that URL could be intercepted (browser history, logs, referrer headers), and someone could steal the token and log into your app as that user.

So instead of sending the token directly, the provider sends back a **short-lived code** in the redirect:

```
xyz.com/api/redirect-uri?code=abc123
```

This code is valid for a very short time (e.g. one minute) and can only be used once.

Your backend then sends `code + client_id + client_secret` back to the provider. The provider checks whether this code actually belongs to that client ID/secret combination. If it matches, **only then** does it return the real token — directly to your backend, not through the browser.

### Recap of the flow:
1. Client (browser) is redirected to the provider's authorization endpoint to authenticate.
2. Provider redirects back to your app with a short-lived `code` in the URL.
3. Your backend sends `code + client_secret` to the provider's token endpoint.
4. Provider verifies it, and exchanges it for the real access token — delivered server-to-server, not exposed in the browser URL.

---

## 10. OAuth 2.0 vs OIDC — How They Relate

- **OAuth 2.0** is the underlying framework that defines this whole authorization flow: redirect → short-lived code → server-side exchange → token. It's about granting *access*, not proving *identity*.
- **OIDC** is built on top of OAuth 2.0, and adds the standardized identity layer: the `.well-known/openid-configuration` discovery document, a standard token shape carrying user claims (`sub`, `email`, `aud`, etc.), the `userinfo_endpoint`, and the `jwks_uri` for public keys.

In short: **OAuth 2.0 handles the secure code-for-token exchange mechanics; OIDC rides on top of that same flow to also standardize how you get back "who is this user."**

They are not two separate, equal systems — OIDC depends on OAuth 2.0's flow to do its job.

---

## 11. SAML — The Other Standard

**SAML (Security Assertion Markup Language)** is the other way (besides OIDC) that systems standardize exchanging user identity — it's XML-based and mostly used in enterprise systems.

It has two important endpoints, conceptually mirroring OIDC's:

1. **Authorization endpoint** — where the user login happens.
2. **Token endpoint** — server-to-server token exchange.

In simple terms:
- **OAuth 2.0** is an authorization framework that lets applications access resources without ever sharing the user's actual credentials.
- **OpenID (OIDC)** provides authentication by issuing ID tokens.
- **OIDC enables SSO** across multiple applications.

---

## 12. Quick Reference

| Term | One-line meaning |
|---|---|
| JWT | Signed token: header.payload.signature — readable by anyone, trustworthy because of the signature. |
| Symmetric signing | One shared secret signs and verifies. Simple, but hard to rotate/share across many servers. |
| Asymmetric signing | Private key signs (auth service only), public key verifies (everyone else) — no shared secret to leak or resync. |
| Public-key route | Lets services fetch and cache the public key instead of calling auth on every request. |
| `.well-known/openid-configuration` | The standardized discovery route every OIDC provider must expose. |
| `jwks_uri` | Where the public key(s) actually live. |
| Client ID / Client Secret | Given after registering your app with a provider, so it can trust and identify your app. |
| Authorization code | Short-lived, single-use code exchanged server-side for the real token — never the token itself sent through the browser. |
| OAuth 2.0 | The authorization framework underneath — handles the redirect/code/token exchange mechanics. |
| OIDC | Identity layer on top of OAuth 2.0 — standardizes discovery, ID token claims, userinfo, and JWKS. |
| SAML | XML-based alternative to OIDC, common in enterprise SSO. |
| SSO | Log in once, access multiple services without logging in again. |

### Suggested hands-on assignment
Build a minimal auth service yourself: sign JWTs with a private key, expose `/.well-known/openid-configuration` and a JWKS route, then build a second small service that fetches the public key once and verifies tokens locally. This is the same underlying shape that hosted providers like Auth0, Clerk, and Better-Auth implement for you.
