# Forwarding File Uploads to a CDN / Object Store (ImageKit + Multer)

## Comprehensive Guide to the "Browser → Your API → External Media Store" Pattern: SDK Config, Disk-Temp vs Memory-Buffer, DB Wiring, Cleanup & Failure Modes

---

## 📌 Executive Summary

- **The pattern**: A binary file (avatar, document, video) is uploaded from a client to *your* Express API, and your API immediately **re-uploads it to a dedicated media service** (ImageKit, Cloudinary, AWS S3, Cloudflare R2, GCS, Backblaze B2). Your server keeps only a **URL string** in its own database; the bytes live on the external store, which also serves them over a CDN.
- **Why not store bytes yourself**:
  - App servers are usually **stateless and ephemeral** (containers, autoscaling, serverless). A file written to local disk vanishes on the next deploy or scales to only one instance.
  - Serving images from your Node process wastes CPU/bandwidth and has no edge caching, no on-the-fly resize/format conversion, no signed-URL access control.
  - A media service gives you **CDN delivery, transformations, and durability** for free.
- **Two ways Multer can hand you the file**:
  - **`memoryStorage`** → `file.buffer` (raw bytes in RAM). Nothing touches disk.
  - **`diskStorage`** → `file.path` (a temp file written to your server's disk); no `file.buffer`.
- **Recommendation for pure forwarding**: when the file only **transits** your server on its way to the CDN, prefer **`memoryStorage`** and upload the buffer directly. No temp files, no `fs.unlink` cleanup, no orphaned files when the process crashes mid-request. Reach for `diskStorage` only when files are large enough that buffering many concurrent uploads would exhaust RAM, or when you need the file on disk for a second reason (virus scan CLI, ffmpeg, resumable uploads).
- **The upload call is the same shape everywhere**: `sdk.upload({ file, fileName, folder })` → `{ url, fileId, ... }`. Persist `url` (to render the image) and `fileId` (to delete it later). Swapping ImageKit for S3/Cloudinary changes the SDK import and the option names, not the flow.
- **Failure modes to handle**: the CDN upload rejects (network, bad key, quota) → surface a 5xx and **delete the temp file if you used disk**; the DB update fails *after* a successful CDN upload → you now have an **orphaned CDN file** (delete it, or accept the leak and sweep later); the old avatar is never deleted when a new one replaces it → storage grows forever.
- **Config lives in env vars**: three values for ImageKit — a **public key**, a **private key** (server-only, never shipped to the browser), and a **URL endpoint**. Same idea as an S3 access-key / secret-key / region-endpoint triple.

---

## 🧠 Core Analogies

- **Your API as a hotel bell desk**: A guest hands their luggage (the upload) to the bell desk (your Express route). The desk doesn't keep luggage behind the counter — it tags it and sends it to the **luggage room** (the CDN). The desk only writes a claim-ticket number (`url` / `fileId`) in its ledger (your database). If the desk tried to store every guest's bags behind the counter, it would overflow in an hour, and a staff shift-change (a deploy) would lose them all.
- **`memoryStorage` vs `diskStorage` as "hold it in your hands" vs "put it in a locker first"**:
  - **Memory**: you catch the parcel and immediately pass it to the courier. Fast, but if a hundred parcels arrive at once your arms (RAM) are full.
  - **Disk**: you drop each parcel in a numbered locker (temp file), then walk lockers one by one handing parcels to the courier, then **must remember to empty every locker** — including when you get called away mid-task (a crash) and the locker stays full forever (orphaned temp file).
- **The orphaned-file problem as a two-phase commit that isn't**: "upload to CDN" and "save URL to DB" are two independent writes to two systems with no shared transaction. If step 2 fails after step 1 succeeds, the CDN file exists but nothing points to it — a dangling reference in reverse.
- **`fileId` as a coat-check stub**: the `url` lets anyone *view* the coat; the `fileId` is the stub that lets *you* retrieve or destroy it later. Storing only the URL means you can display the avatar but can never clean it up.

---

## 🗺️ 1. The End-to-End Flow

```
┌──────────┐   multipart/form-data    ┌─────────────────────────────┐
│ Browser  │ ───────────────────────► │ Express route               │
│ <form>   │   field: "avatar"        │                             │
└──────────┘                          │ 1. authenticate  (who?)     │
                                      │ 2. multer .single("avatar") │
                                      │    → req.file               │
                                      │ 3. controller               │
                                      │ 4. service:                 │
                                      │      a. upload req.file  ──────────►  ┌──────────────┐
                                      │         to media SDK        │        │ Media store  │
                                      │      b. ◄─── { url, fileId }─────────  │  + CDN edge  │
                                      │      c. save url on the user │        └──────────────┘
                                      │      d. (disk only) unlink   │
                                      │         the temp file       │
                                      │ 5. respond { avatarUrl }    │
                                      └─────────────────────────────┘
```

**Layering** (this repo's feature-first convention — see note 05):

| Layer | Responsibility for uploads |
|---|---|
| **Route** | Chains middleware in order: auth → multer → controller. Declares the field name. |
| **Middleware** (`multer`) | Parses `multipart/form-data`, enforces size/type limits, produces `req.file`. |
| **Controller** | Reads `req.file`, guards "no file sent", calls the service, shapes the HTTP response. **No SDK calls here.** |
| **Service** | Talks to the media SDK, updates the DB model, cleans up. The only layer that knows the store is "ImageKit". |
| **Config** | Instantiates the SDK once from env vars, exports a singleton. |

Keeping the SDK isolated in the service + config means switching providers touches two files, not the whole module.

---

## ⚙️ 2. Configuring the Media SDK (once, from env)

A media SDK is a **stateful client**: you construct it with credentials once at boot and reuse that instance for every request. Re-constructing it per request is wasteful and, for some SDKs, leaks connections.

```javascript
// src/common/config/imagekit.js
import ImageKit from "@imagekit/nodejs";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,   // server-only secret
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT, // e.g. https://ik.imagekit.io/<your-id>
});

export default imagekit;
```

```bash
# .env.example  — real values are never committed
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=your_url_endpoint
```

**Why three values**:

| Value | Where it may appear | Purpose |
|---|---|---|
| **Public key** | Browser is OK | Identifies your account for client-side upload widgets / signed uploads. |
| **Private key** | **Server only** | Authenticates server-side API calls (upload, delete, list). Treat like a password. |
| **URL endpoint** | Browser is OK | The base URL your delivered/transformed images hang off. |

> This maps 1:1 onto other providers: S3 wants `accessKeyId` + `secretAccessKey` + `region`/`endpoint`; Cloudinary wants `cloud_name` + `api_key` + `api_secret`. Same "public id / private secret / where" triple.

**Env hygiene** (see note 05 §config): load `.env` before this module is imported (`import "dotenv/config"` at the top of your entrypoint, or `dotenv.config()` first thing). If `process.env.IMAGEKIT_PRIVATE_KEY` is `undefined` here, the SDK constructs "successfully" and every upload later fails with an auth error — consider a startup check that throws if any required var is missing.

---

## 📥 3. The Multer Middleware

Multer's job (covered fully in note 06): parse the `multipart/form-data` body, enforce limits, and populate `req.file`. For the forwarding pattern, the **only real decision is the storage engine** (§4).

### 3.1 The pieces

```javascript
// src/common/middleware/multer.middleware.js
import multer from "multer";
import path from "path";

// --- storage engine: see §4 for the memory alternative ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),  // folder MUST already exist
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + unique + path.extname(file.originalname));
  },
});

// --- soft type gate: mimetype + extension are CLIENT-CONTROLLED (note 06 §5) ---
const fileFilter = (req, file, cb) => {
  const okMime = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
  const okExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (okMime.includes(file.mimetype) || okExt.includes(ext)) cb(null, true);
  else cb(new Error("File type not supported"), false);
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB — always cap, both engines
  fileFilter,
});
```

### 3.2 Notes on the gate

- `fileFilter` on `mimetype` / extension stops honest mistakes and casual abuse. It does **not** prove the bytes are an image — a `.png` can contain anything. If you need real assurance, inspect the **magic number** (first bytes) or let the media service reject non-images. ImageKit will store whatever you send it.
- `limits.fileSize` matters **more** with `memoryStorage`: every in-flight upload sits in RAM, so `concurrent uploads × fileSize` is your memory ceiling. With `diskStorage` an over-limit file fills disk instead.
- `limits.fileSize` is a **single global number** — it cannot differ per field. Per-field caps need separate `multer()` instances or a manual post-parse size check (note 06 §7).

### 3.3 Wiring into the route (order is everything)

```javascript
// src/modules/<feature>/<feature>.routes.js
import { upload } from "../../common/middleware/multer.middleware.js";

router.post(
  "/avatar",
  authenticate,                 // 1. reject anonymous requests BEFORE parsing a body
  upload.single("avatar"),      // 2. parse the file → req.file ; text fields → req.body
  controller.uploadAvatar,      // 3. your handler, now that req.file exists
);
```

- **`authenticate` before `upload`**: no reason to spend CPU/RAM/disk parsing a multi-MB body for a request you're about to 401. It also means `req.user.id` exists inside the handler, so the service knows *whose* avatar this is.
- **`upload.single("avatar")`**: the string must match the form field name exactly. A mismatch yields `req.file === undefined` (or a `LIMIT_UNEXPECTED_FILE` error), not an obvious message — hence the explicit guard in the controller.
- Middleware placed **before** `upload.single()` sees an empty `req.body` — multer is what fills it.

---

## ⚖️ 4. The Core Decision: Disk Temp File vs Memory Buffer

This is the question in the title: **is it good practice to write the upload to a temp folder and then push it to the CDN, or to upload it straight from the buffer?**

### 4.1 What each engine gives you

| | `multer.diskStorage` | `multer.memoryStorage` |
|---|---|---|
| Where the bytes go | A **temp file** on your server's disk | A **`Buffer`** in your process's RAM |
| Field you read | `file.path` (string path) | `file.buffer` (raw bytes) |
| Cleanup you owe | **`fs.unlink(file.path)`** on every path — success *and* every error branch | None — GC frees the buffer when the request ends |
| Crash mid-request | Temp file **stays on disk forever** (orphan) | Buffer is gone with the process — nothing leaked |
| Memory cost | ~constant (streamed to disk) | `fileSize × concurrent uploads` |
| Disk cost | `fileSize × concurrent uploads` until cleaned | none |
| Needs a pre-existing folder | Yes (`destination` must exist) | No |
| Good when | Files are large; you also need the file on disk for ffmpeg / AV scan / resumable upload | The file only **passes through** your server to a CDN |

### 4.2 Recommendation

**For pure forwarding — the file's only purpose is to reach the CDN — use `memoryStorage` and upload `file.buffer` directly.** Reasons:

1. **No cleanup race.** With disk, you must `fs.unlink` the temp file on the success path *and* inside every `catch`. Miss one branch, or crash between "write temp file" and "unlink", and the file leaks. Over months, a busy endpoint fills the disk with orphans and the server falls over. Memory has nothing to clean up.
2. **Statelessness.** A temp file on instance A is invisible to instance B. Any retry/cleanup logic that assumes "the file is still at `file.path`" is wrong under autoscaling. A buffer lives entirely within one request on one instance.
3. **Fewer moving parts.** No `public/uploads` folder to create on deploy, no `.gitkeep`, no `fs` import, no `createReadStream`. The service is: `upload(buffer) → save url`.
4. **Speed.** Skipping a disk write + a disk read (to stream it back up) is a measurable latency win for small files like avatars.

**Use `diskStorage` when:**

- Files are large enough (video, big PDFs) that `fileSize × peak concurrency` would blow your memory budget. Streaming to disk keeps memory flat.
- You need the bytes on disk for a **second operation** — running `ffmpeg`, a virus-scanner CLI, image processing that expects a path, or supporting **resumable / chunked** uploads.
- Your media SDK only accepts a stream/path and buffering the whole file is genuinely wasteful.

If you do use disk, treat the temp file as a **liability from the moment it's written**: wrap the whole service in `try/finally` and unlink in the `finally`, so cleanup runs on success, on CDN failure, and on DB failure alike.

### 4.3 The memory-buffer version (recommended)

```javascript
// multer.middleware.js — swap the storage engine
const storage = multer.memoryStorage();
export const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
```

```javascript
// service — no fs, no temp file, no cleanup
const avatarUpload = async (userId, file) => {
  const uploaded = await imagekit.files.upload({
    file: file.buffer,                              // raw bytes straight from RAM
    fileName: file.originalname,
    folder: "/user-avatars",
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: uploaded.url },
    { new: true },
  );

  return { url: uploaded.url, fileId: uploaded.fileId };
};
```

### 4.4 The disk version (only when §4.2 justifies it)

```javascript
// service — temp file MUST be cleaned up on every exit path
import fs from "node:fs";

const avatarUpload = async (userId, file) => {
  try {
    const uploaded = await imagekit.files.upload({
      file: fs.createReadStream(file.path),         // stream the temp file up
      fileName: file.filename || file.originalname,
      folder: "/user-avatars",
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: uploaded.url },
      { new: true },
    );

    return { url: uploaded.url, fileId: uploaded.fileId };
  } finally {
    // runs on success, on CDN failure, and on DB failure — no orphan
    if (file?.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch { /* already gone */ }
    }
  }
};
```

> Prefer `finally` over an `unlink` call duplicated in the happy path and the `catch` — one place, always runs. `fs.unlinkSync` is acceptable here because it's a single tiny file at the tail of a request; a high-throughput path could use `await fs.promises.unlink`.

---

## 🧩 5. The Controller — Thin, Guards, Shapes the Response

```javascript
// src/modules/<feature>/<feature>.controller.js
import * as service from "./<feature>.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

const uploadAvatar = async (req, res) => {
  const file = req.file;

  // multer produced nothing: wrong field name, no file part, or filtered out
  if (!file) {
    throw ApiError.badRequest("No file uploaded — send it as field 'avatar'.");
  }

  const { url } = await service.avatarUpload(req.user.id, file);

  return ApiResponse.ok(res, "Avatar uploaded successfully", { avatarUrl: url });
};

export { uploadAvatar };
```

- **Guard `!req.file` explicitly.** It's the single most common failure and the least self-explanatory.
- **No SDK, no `fs`, no DB here.** The controller translates HTTP ⇄ service call. Everything about "how files are stored" stays in the service.
- **Let errors propagate** to your central error handler (note 05 §error handling) — `throw ApiError.badRequest(...)`, don't `try/catch` and hand-format in every handler. A local `catch` is only justified if you must do controller-level cleanup, which with `memoryStorage` you don't.
- **Use `ApiError` consistently.** A `500` for "the CDN upload failed" belongs to the service throwing (or an `ApiError.internal(...)` in the store adapter), caught by the global handler — not a `console.error` + ad-hoc JSON in the controller.

---

## 🗃️ 6. Persisting the Result on the Model

You store a **URL string**, not the file:

```javascript
// model
const userSchema = new mongoose.Schema({
  // ...
  avatar: { type: String, default: null },   // a delivery URL, or null when unset
});
```

- **`default: null`, not `default: false`.** The field holds a URL or "no avatar yet"; a boolean `false` is a type smell that leaks into API responses and template checks (`user.avatar ? <img> : <placeholder>` breaks subtly on `false`).
- **Consider storing `fileId` too** if you'll ever delete or replace avatars:
  ```javascript
  avatar:   { type: String, default: null },  // url  — to render
  avatarId: { type: String, default: null },  // fileId — to delete/replace on the CDN
  ```
  Without the `fileId`, the old file is unreachable for cleanup and lingers on the CDN (and on your bill) forever.
- **Return the fresh document** from the update (`{ new: true }` in Mongoose, or `returnDocument: "after"` on the raw driver) if the caller needs the updated user.

---

## 💥 7. Failure Modes & How to Handle Them

| # | What fails | Symptom | Handling |
|---|---|---|---|
| 1 | **CDN upload rejects** (network, bad private key, quota exceeded, oversized) | SDK call throws | Let it propagate to the global error handler → `502`/`500`. **Disk engine: the `finally` unlinks the temp file.** Memory engine: nothing to do. |
| 2 | **DB update fails *after* CDN upload succeeds** | User has no `avatar`, but a file now sits on the CDN | This file is **orphaned**. Options: (a) in the `catch`, call `imagekit.files.delete(uploaded.fileId)` to roll back; (b) accept the rare leak and run a periodic sweep comparing CDN files to DB references. |
| 3 | **Replacing an avatar** — new upload succeeds, old file never deleted | CDN storage grows every time a user changes their picture | Before/after saving the new `avatarId`, `imagekit.files.delete(oldAvatarId)`. Do it *after* the new one is safely persisted so a failure doesn't leave the user with no avatar. |
| 4 | **Crash between "write temp file" and "unlink"** (disk engine only) | Temp file stranded in `public/uploads` | The reason to prefer `memoryStorage`. If on disk, run a cron that deletes files in the temp dir older than N hours. |
| 5 | **Wrong form field name** | `req.file` is `undefined`, or `LIMIT_UNEXPECTED_FILE` | Controller's `!file` guard returns a clear `400`. Map `MulterError` codes in an error-mapping helper (note 06 §7.3). |
| 6 | **`.env` not loaded before the config module** | Every upload fails with an auth error though credentials "are set" | Load dotenv at the very top of the entrypoint; add a boot-time assertion that required vars are non-empty. |
| 7 | **`fileFilter` rejects** | Multer forwards an `Error("File type not supported")` to `next` | Catch it in the error handler and return `415 Unsupported Media Type` (or `400`). |

---

## 🔒 8. Security & Operational Notes

- **Private key is a server secret.** It authenticates *destructive* API calls (delete, list). Never send it to the browser, never put it in a client bundle, never log it. Only the **public key** and **URL endpoint** may reach client code.
- **`file.mimetype` and `file.originalname` are attacker-controlled.** `fileFilter` on mimetype is a soft gate. Never build a filesystem path or a CDN key by concatenating `originalname` — use a generated name (`crypto.randomBytes(16).toString("hex")`, a UUID, or the store's own id). Path-traversal (`../../etc/...`) and overwrite attacks come from trusting `originalname`.
- **Always set `limits.fileSize`.** Without it, `memoryStorage` is a trivial OOM DoS and `diskStorage` a disk-fill DoS.
- **Scope the upload folder per concern** (`/user-avatars`, `/listing-images`) so lifecycle rules, access policies, and cleanup sweeps can target them.
- **Rate-limit the endpoint.** Upload routes are expensive (bandwidth + CDN quota); a per-user limiter stops abuse.
- **Don't trust the returned `url` blindly in emails/SSR** without knowing it's from your configured endpoint — a compromised SDK config could point elsewhere.
- **Delete-on-replace and delete-on-account-deletion.** Orphaned media is a slow, silent cost and, for user photos, a privacy obligation (a deleted account's avatar should not stay reachable on a public CDN URL).

---

## 🗂️ 9. `.gitignore` (disk engine only)

If you use `diskStorage`, the temp dir holds transient runtime data — never commit it:

```gitignore
# .gitignore
public/uploads/
!public/uploads/.gitkeep    # keep the empty folder so `destination` exists on a fresh clone
```

With `memoryStorage` there's no such folder and nothing to ignore — another point in its favor.

---

## ⚠️ 10. Gotchas / Interview Notes

- **The two-write problem**: "upload to CDN" and "save URL to DB" are separate writes to separate systems with **no shared transaction**. Any pattern here (rollback-on-failure, sweep-later) is picking which inconsistency you tolerate.
- **`memoryStorage` → `file.buffer`; `diskStorage` → `file.path`.** They're mutually exclusive — a buffer-mode file has no `.path`, a disk-mode file has no `.buffer`. Code that reads the wrong one gets `undefined`.
- **`diskStorage` writes the file *before* your handler runs.** By the time you decide to reject the request, the temp file already exists — you must unlink it.
- **`destination` folder must pre-exist** for `diskStorage`. It does *not* `mkdir` for you (unlike a hand-rolled `fs.mkdir({recursive:true})` approach).
- **`fs.unlinkSync` in a `catch` that references the wrong error variable** is a real bug pattern — `catch (error) { console.error(err) }` logs `undefined` or throws `ReferenceError`. Name it once and use that name.
- **Prefer `try/finally` for temp-file cleanup** over duplicating `unlink` in the happy path and the `catch`.
- **`{ new: true }` (Mongoose) / `returnDocument: "after"` (raw driver)** — without it you get the *pre-update* document back and the caller sees the old avatar.
- **`avatar: { default: false }`** is a bug waiting to happen — the field is a `String | null`, so default to `null`.
- **`authenticate` goes before `upload`**, not after — don't parse a multi-MB body for a request you'll 401.
- **The field name in `upload.single("x")` must match the form exactly**, or `req.file` is `undefined` with no obvious error.
- **Store `fileId`, not just `url`**, if you ever need to delete or replace the file. The URL alone is a one-way ticket.
- **Reconstructing the SDK client per request** instead of exporting a singleton wastes resources and can leak connections.
- **The pattern is provider-agnostic**: `upload({ file, fileName, folder }) → { url, fileId }` is the same shape for S3 (`PutObjectCommand`), Cloudinary (`uploader.upload`), and ImageKit. The flow in §1 doesn't change when you switch.

---

## 🔗 Related Notes

- **`03-NodeJS-Internals-Event-Loop-Libuv-Threadpool.md`** — why streaming to disk (`createReadStream`/`createWriteStream`) doesn't block the event loop; the libuv thread pool that runs disk I/O.
- **`04-Express-Routing-Middleware-Rest-Auth-Architecture.md`** — middleware ordering, which decides where `authenticate` and `upload.*` sit in the chain.
- **`05-Production-Express-Architecture-Auth-DTO-Security.md`** — the feature-first module layout, `ApiResponse` / `ApiError` classes, central error handling, and `.env` loading used throughout the examples above.
- **`06-NodeJS-fs-Module-Multer-File-Uploads.md`** — the `fs` module in depth, how Multer parses `multipart/form-data`, `memoryStorage` vs `diskStorage` internals, buffers, MIME types, `MulterError` codes, and per-field upload rules. **Read that first** — this note assumes it.
