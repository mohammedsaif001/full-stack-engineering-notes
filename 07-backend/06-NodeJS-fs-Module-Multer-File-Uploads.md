# Node.js `fs` Module & File Uploads with Multer
## Comprehensive Guide to Sync/Async/Promise/Stream Filesystem APIs, Multipart Parsing, Buffers, MIME Types, Storage Engines & Per-Field Upload Rules

---

## 📌 Executive Summary

- **The `fs` Module — Four Flavors**:
  - **Sync** (`readFileSync`, `writeFileSync`, `mkdirSync`, ...): Blocks the entire event loop until the disk operation finishes. Acceptable only at startup or in one-off CLI scripts.
  - **Async / Callback** (`fs.readFile(path, cb)`): Non-blocking, uses the **error-first callback** convention `(err, data) => {}`. Nesting these produces "callback hell" (the pyramid of doom).
  - **Promises** (`import fs from "node:fs/promises"` + `await`): Same non-blocking behavior, flat control flow, `try/catch` error handling.
  - **Streams** (`fs.createReadStream` / `createWriteStream` + `.pipe()`): Processes a file chunk-by-chunk with backpressure. The reason large uploads never load fully into RAM.
- **Multer**:
  - A **middleware** that parses `multipart/form-data` request bodies and populates **`req.file`** (single) / **`req.files`** (multiple). Text fields land in **`req.body`**.
  - `express.json()` and `express.urlencoded()` **cannot** parse file uploads — the request must be `enctype="multipart/form-data"`.
  - Modes: `.single(field)`, `.array(field, max)`, `.fields([{name, maxCount}, ...])`, `.none()`.
- **File vs Buffer**:
  - A **file** is a named, ordered collection of **binary data (bytes)** on a storage medium.
  - A **Buffer** is Node's fixed-length raw-byte container living **outside V8's heap**. An in-flight upload is a Buffer.
- **MIME Type**: Format is **`type/subtype`** — `category/exact-format` (e.g. `image/png`, `application/json`). Multer exposes it as `file.mimetype`, read from the part's `Content-Type` header — **client-declared and therefore spoofable**.
- **Storage Engines**:
  - `multer.memoryStorage()` — keeps the file in RAM as **`file.buffer`**. Fast; ideal for "process then forward to S3/Cloudinary/DB". Risk: large files exhaust memory.
  - `multer.diskStorage({destination, filename})` — streams the file straight to disk; sets **`file.path`**, no `file.buffer`.
  - You can **re-implement diskStorage by hand** from a memoryStorage buffer using only `fs` + `path`.
- **Per-Field Rules** (`avatar` = PNG ≤ 2 MB, `gallery` = GIF ≤ 10 MB):
  - `limits.fileSize` is a **single global number** — it cannot differ per field.
  - **Approach A (recommended)**: two separate `multer()` instances, one per field/route.
  - **Approach B**: one `.fields()` endpoint — global limit set to the max, `fileFilter` switches on `file.fieldname`, plus a **manual post-upload size check** for the tighter cap.

---

## 🧠 Core Analogies

- **Sync vs Async vs Promises vs Streams as a Coffee Shop**:
  - **Sync**: One barista serves one customer from order to handoff, ignoring the queue. Everyone else stands frozen (event loop blocked).
  - **Async (callback)**: The barista takes your order, shouts "next!", and later calls your name (`(err, coffee) => {}`). Five nested orders = five people crowding the pickup counter shouting over each other (callback hell).
  - **Promises**: You get a numbered ticket you `await`. Clean, linear, one line per step.
  - **Streams**: Instead of waiting for a full 2-litre jug to be brewed, coffee flows cup-by-cup through a tap; if your cup is full the tap slows down (backpressure).
- **Multer as Airport Baggage Handling**:
  - The client's `multipart/form-data` request is a cargo plane packed with mixed freight (text fields + files), separated by tape strips (boundaries).
  - Multer is the ground crew: it unloads the plane, reads each bag's tag (`Content-Disposition`, `filename`, `Content-Type`), and places files on the carousel (`req.file` / `req.files`) and paperwork on the desk (`req.body`).
- **MIME Type as a Shipping Label**: `type/subtype` = `general category / exact format`. `image/png` is "it's a picture, specifically a PNG." The label is stuck on by the sender, so a liar can mislabel a box — you must open it to be sure (magic-number check).
- **Buffer as a Sealed Box of Raw Bytes**:
  - **Memory storage** = the box sits open on your desk (RAM) — instant access, but your desk overflows if boxes are huge.
  - **Disk storage** = the box goes straight to the warehouse (disk) on arrival — slower to fetch, but the desk stays clear.

---

## 🗂️ 1. The `fs` Module — Four Flavors

`fs` ("file system") is Node's built-in module for reading, writing, and managing files and directories. Import it two ways:

```javascript
import fs from "node:fs";            // sync + callback + stream APIs
import fsp from "node:fs/promises";  // promise-based APIs (await)
```

> The `node:` prefix is the modern, explicit way to import built-ins. `import fs from "fs"` also works but `node:fs` can't be shadowed by an npm package of the same name.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THE FOUR FLAVORS OF fs                               │
├──────────────┬──────────────────┬───────────────┬───────────────────────────┤
│ Flavor       │ Example          │ Blocks Loop?  │ Error Handling            │
├──────────────┼──────────────────┼───────────────┼───────────────────────────┤
│ Sync         │ readFileSync()   │ ❌ YES         │ try / catch (throws)     │
│ Callback     │ readFile(p, cb)  │ ✅ No          │ error-first cb (err, data)│
│ Promises     │ await fsp.read.. │ ✅ No          │ try / catch (rejects)    │
│ Streams      │ createReadStream │ ✅ No          │ .on('error', cb) events  │
└──────────────┴──────────────────┴───────────────┴───────────────────────────┘
```

### 1.1 Sync API — Blocking

Every `*Sync` call **halts the whole process** until the disk responds. No other request, timer, or callback runs in the meantime.

```javascript
import fs from "node:fs";

// 1. WRITE — creates or overwrites the file
fs.writeFileSync("test.txt", "kya haal chal");

// 2. READ — second arg "utf-8" returns a string; omit it to get a Buffer
const data = fs.readFileSync("test.txt", "utf-8");
console.log(data);

// 3. APPEND — adds to the end, creates the file if missing
fs.appendFileSync("test.txt", "\nHello from append");

// 4. MAKE DIRECTORY — { recursive: true } creates every missing parent, no error if it exists
fs.mkdirSync("myFolder/innerFolder", { recursive: true });

// 5. DELETE A FILE
fs.unlinkSync("test.txt");

// 6. RENAME / MOVE
fs.renameSync("test.txt", "test1.txt");

// 7. COPY
fs.cpSync("test1.txt", "finalTest.txt");

// 8. DELETE A DIRECTORY
// fs.rmdirSync("myFolder");                        // ⚠️ deprecated for recursive use
fs.rmSync("myFolder", { recursive: true, force: true }); // ✅ modern replacement
```

**When sync is fine**: reading a config file once at boot, a build script, a CLI tool that does one job and exits. **Never** inside an Express request handler — one slow disk read freezes every concurrent user.

### 1.2 Async / Callback API — Non-Blocking, Error-First

The call returns immediately; Node hands the work to the **libuv thread pool** (see note 03) and invokes your callback later. The **first parameter is always the error** (`null` on success) — the *error-first callback* convention.

```javascript
import fs from "node:fs";

fs.readFile("async.txt", "utf-8", (err, data) => {
  if (err) {
    console.error(err);   // always handle the error branch first
    return;
  }
  console.log("READ:", data);
});
```

**Callback hell** — when each step depends on the previous, callbacks nest into a rightward "pyramid of doom":

```javascript
fs.readFile("a.txt", "utf-8", (error, data) => {
  fs.writeFile("b.txt", data, (err) => {
    fs.appendFile("b.txt", "\nDone", (err) => {
      fs.unlink("a.txt", (err) => {
        console.log("a.txt deleted");
      });
    });
  });
});
// Problems: no shared error handling, hard to read, hard to add a step in the middle.
```

### 1.3 Promises API — Flat & Awaitable

Same non-blocking behavior, but each operation returns a Promise. The pyramid above collapses into a straight line with **one** `try/catch`:

```javascript
import fs from "node:fs/promises";

// Simple read
const data = await fs.readFile("promise.txt", "utf-8");
console.log(data);

// The callback-hell chain, rewritten
async function processFile() {
  try {
    const content = await fs.readFile("a.txt", "utf-8");
    await fs.writeFile("b.txt", content);
    await fs.appendFile("b.txt", "\nDone");
    await fs.unlink("a.txt");
    console.log("a.txt deleted");
  } catch (err) {
    console.error("Pipeline failed:", err); // one place catches every step
  }
}
```

> `import fs from "node:fs/promises"` and `import fs from "node:fs"` are **different modules**. A file can import both under different names (e.g. `fs` and `fsp`).

### 1.4 Streams — Chunk-by-Chunk with Backpressure

Reading a 2 GB file with `readFile` allocates 2 GB of RAM. A **stream** reads it in ~64 KB chunks, letting you process (or write) each chunk and discard it.

```javascript
import fs from "node:fs";

const readStream = fs.createReadStream("huge-input.mp4");
const writeStream = fs.createWriteStream("huge-copy.mp4");

// .pipe() wires them together AND handles backpressure:
// if the disk can't write fast enough, the read stream pauses automatically.
readStream.pipe(writeStream);

readStream.on("error", (err) => console.error("read failed", err));
writeStream.on("error", (err) => console.error("write failed", err));
writeStream.on("finish", () => console.log("copy complete"));
```

**Why this matters for uploads**: `multer.diskStorage()` pipes the incoming HTTP request stream straight into a `createWriteStream`. The file never exists fully in memory — that's why disk storage is memory-safe for large files and memory storage is not.

```
CLIENT ──HTTP request stream──▶ multer ──▶ createWriteStream ──▶ disk
              (64 KB chunks, backpressure applied end-to-end)
```

---

## 📮 2. What is Multer

**Multer** is Express middleware for handling `multipart/form-data` — the only content type browsers use to upload files. It:

1. Parses the multipart request body.
2. Puts uploaded files on **`req.file`** (`.single()`) or **`req.files`** (`.array()`, `.fields()`).
3. Puts non-file text fields on **`req.body`**.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       MULTER REQUEST PIPELINE                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  <form enctype="multipart/form-data">                                      │
│         │                                                                  │
│         ▼                                                                  │
│  ┌──────────────────┐   raw multipart body (boundary-delimited parts)      │
│  │  HTTP Request    │───────────────────────────────────────────┐          │
│  └──────────────────┘                                           │          │
│         │                                                       ▼          │
│         ▼                                          ┌──────────────────────┐ │
│  app.post("/upload", upload.single("file"), ...)   │   MULTER MIDDLEWARE  │ │
│                                                    │  parse + storage     │ │
│                                                    └──────────┬───────────┘ │
│                                                               │             │
│                    ┌──────────────────────────────────────────┼───────────┐ │
│                    ▼                                           ▼           │ │
│              req.file / req.files                          req.body        │ │
│              (the uploaded file(s))                    (text form fields)  │ │
│                    │                                           │           │ │
│                    └──────────────────▶  your controller  ◀────┘           │ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Why `express.json()` Can't Do This

`express.json()` parses `application/json`; `express.urlencoded()` parses `application/x-www-form-urlencoded`. Neither understands binary file parts. A file upload **must** set `enctype="multipart/form-data"` on the form (or `Content-Type: multipart/form-data` on the request), and only a multipart parser like multer can split it.

### 2.2 The Four Modes

```javascript
import multer from "multer";
const upload = multer(); // basic: memory storage, no limits

// A. SINGLE file, field name "file"  → req.file
app.post("/upload", upload.single("file"), (req, res) => {
  console.log(req.file);   // one file object
  console.log(req.body);   // any text fields
});

// B. ARRAY of files, same field name, max 12  → req.files (array)
app.post("/upload-multiple", upload.array("file", 12), (req, res) => {
  console.log(req.files);  // [ {…}, {…} ]
});

// C. FIELDS — different field names, each with its own maxCount  → req.files (object)
app.post(
  "/upload-different-fields",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "gallery", maxCount: 8 },
  ]),
  (req, res) => {
    console.log(req.files.avatar);   // [ {…} ]        ← always arrays
    console.log(req.files.gallery);  // [ {…}, {…} ]
  }
);

// D. NONE — multipart form with NO files, just text  → req.body only
app.post("/text-only", upload.none(), (req, res) => {
  console.log(req.body);
});
```

### 2.3 The `multipart/form-data` Wire Format

Understanding the raw body demystifies what multer parses and where `file.originalname` / `file.mimetype` come from:

```
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----X7cabc123

------X7cabc123
Content-Disposition: form-data; name="username"

mohammed                                  ◀── a text field → req.body.username
------X7cabc123
Content-Disposition: form-data; name="avatar"; filename="me.png"
Content-Type: image/png                    ◀── this header becomes file.mimetype

‰PNG␍␊␚␊... <raw binary bytes> ...         ◀── the file payload → file.buffer / file.path
------X7cabc123--                          ◀── closing boundary (note trailing --)
```

- `filename="me.png"` → `file.originalname` (**attacker-controlled string** — never use it as a path).
- `Content-Type: image/png` → `file.mimetype` (**attacker-controlled** — a `.exe` can claim `image/png`).
- The boundary strings separate parts; multer splits on them.

### 2.4 The `file` Object — Full Reference

Multer attaches one of these per uploaded file:

```
┌──────────────┬──────────────────────────────────────────────┬────────────────────┐
│ Property     │ Meaning                                       │ Available in       │
├──────────────┼──────────────────────────────────────────────┼────────────────────┤
│ fieldname    │ Form field name ("avatar", "gallery")         │ both               │
│ originalname │ Filename on the user's device ("me.png")      │ both  ⚠️ untrusted │
│ encoding     │ Transfer encoding ("7bit")                    │ both               │
│ mimetype     │ Declared MIME type ("image/png")              │ both  ⚠️ untrusted │
│ size         │ File size in bytes                            │ both               │
│ buffer       │ Raw file contents as a Buffer                 │ memoryStorage only │
│ destination  │ Folder the file was saved to                  │ diskStorage only   │
│ filename     │ Name of the file within `destination`         │ diskStorage only   │
│ path         │ Full path to the saved file                   │ diskStorage only   │
│ stream       │ Readable stream of the file (custom engines)  │ custom engines     │
└──────────────┴──────────────────────────────────────────────┴────────────────────┘
```

---

## 📄 3. What is a File / What is a Buffer

### 3.1 File

A **file** is a **named, ordered collection of binary data** (a sequence of bytes) stored on a medium (disk, SSD, network volume). The operating system tracks its name, size, permissions, and location; the contents themselves are just bytes. "Text files" are simply files whose bytes happen to be valid character encodings (UTF-8, ASCII).

### 3.2 Buffer

A **Buffer** is Node's built-in type for a **fixed-length chunk of raw bytes**, allocated **outside the V8 JavaScript heap** (so large buffers don't pressure the garbage collector). It's how Node represents binary data that isn't a string: file contents, network packets, image bytes, crypto output.

```javascript
const buf = Buffer.from("Hi");     // <Buffer 48 69>  — 2 bytes: 'H'=0x48, 'i'=0x69
buf.length;                        // 2  (bytes, not characters)
buf.toString("utf-8");             // "Hi"
buf.toString("hex");               // "4869"
```

When a file is uploaded, its bytes travel over the socket and, with `memoryStorage`, are assembled into a single `Buffer` at `file.buffer`. With `diskStorage`, those same bytes are streamed to disk and never fully held as one Buffer.

---

## 🏷️ 4. MIME Types

A **MIME type** (a.k.a. *media type*) labels the format of a payload. Structure:

```
        type   /   subtype
      ┌──────┐   ┌────────┐
        image  /   png            →  "a picture, specifically PNG"
     application / json           →  "structured data, specifically JSON"
        text   /   csv            →  "text, specifically comma-separated values"
      multipart / form-data       →  "a compound body of multiple parts"
```

- **type** = the broad category: `image`, `text`, `audio`, `video`, `application`, `multipart`, `font`, `model`.
- **subtype** = the exact format within that category.

```
┌───────────────────────────┬──────────────────────────────────────────────┐
│ MIME type                 │ Used for                                     │
├───────────────────────────┼──────────────────────────────────────────────┤
│ image/png                 │ PNG images                                   │
│ image/jpeg                │ JPG / JPEG images                            │
│ image/gif                 │ GIF images (incl. animated)                  │
│ image/webp                │ WebP images                                  │
│ application/json          │ JSON API bodies                             │
│ application/pdf           │ PDF documents                               │
│ application/octet-stream  │ "unknown binary" — generic fallback         │
│ text/plain                │ Plain text                                  │
│ text/csv                  │ CSV files                                   │
│ multipart/form-data       │ Browser file-upload form submissions        │
│ application/x-www-form-…  │ Standard (non-file) form submissions         │
└───────────────────────────┴──────────────────────────────────────────────┘
```

### 4.1 Where Multer Gets `file.mimetype` — and Why You Can't Trust It

`file.mimetype` is copied verbatim from the part's `Content-Type` header (see §2.3). The **client sets that header**. Renaming `virus.exe` to `photo.png` and uploading it makes `file.mimetype === "image/png"`. A `fileFilter` that checks only `file.mimetype` is a **soft gate**, not real validation.

**Real validation = inspect the bytes** (magic numbers / file signatures):

```javascript
// The first bytes of a file identify its true format:
//   PNG  → 89 50 4E 47 0D 0A 1A 0A
//   GIF  → 47 49 46 38 (37|39) 61      ("GIF87a" / "GIF89a")
//   JPEG → FF D8 FF
//   PDF  → 25 50 44 46                 ("%PDF")

function sniffPng(buffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.subarray(0, 8).equals(sig);
}
// In production use the `file-type` npm package, which knows hundreds of signatures.
```

---

## 💾 5. Storage Engines: Memory vs Disk

Multer's `storage` option decides **where the incoming bytes go**. If you pass nothing, multer uses **memory storage** by default.

### 5.1 `multer.memoryStorage()` — Buffer in RAM

```javascript
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  console.log(req.file.buffer);        // <Buffer ...> — the whole file in RAM
  console.log(req.file.buffer.length); // size in bytes
  // Typical next step: pipe this buffer to S3 / Cloudinary / a DB BLOB column
  res.send("ok");
});
```

- ✅ Fast, no disk I/O, nothing to clean up, easy to forward elsewhere.
- ❌ Every concurrent upload sits in memory. 20 users × 100 MB = 2 GB RAM. A `limits.fileSize` cap is mandatory.

### 5.2 `multer.diskStorage({ destination, filename })` — Streamed to Disk

```javascript
import multer from "multer";
import crypto from "crypto";
import path from "node:path";

const storage = multer.diskStorage({
  // WHERE to save — call cb(null, folder). The folder must already exist.
  destination: function (req, file, cb) {
    cb(null, "public/my-uploads");
  },
  // WHAT to name it — never reuse file.originalname directly (collisions + traversal).
  filename: function (req, file, cb) {
    crypto.randomBytes(16, function (err, raw) {
      if (err) return cb(err);
      const ext = path.extname(file.originalname);          // ".png"
      cb(null, file.fieldname + "-" + raw.toString("hex") + ext);
      // → "avatar-9f2a...e1.png"
    });
  },
});

const upload = multer({
  storage,
  limits: {
    fieldNameSize: 100,          // max length of a field name
    fileSize: 1024 * 1024 * 5,   // 5 MB per file (GLOBAL — see §7)
    files: 10,                   // max number of files
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);            // accept
    } else {
      cb(new Error("File type not supported"), false); // reject
    }
  },
});

app.post("/upload", upload.single("file"), (req, res) => {
  console.log(req.file.path);    // "public/my-uploads/avatar-9f2a...e1.png"
  res.send("ok");
});
```

- ✅ Constant memory use regardless of file size (streamed).
- ❌ You must create the folder, generate safe names, and delete files yourself on error / on record deletion.

### 5.3 Comparison

```
┌────────────────────┬───────────────────────────┬───────────────────────────┐
│                    │ memoryStorage()           │ diskStorage()             │
├────────────────────┼───────────────────────────┼───────────────────────────┤
│ Where bytes go     │ RAM                       │ Disk (streamed)           │
│ Property exposed   │ file.buffer               │ file.path / file.filename │
│ Memory per upload  │ = file size  ⚠️           │ ~64 KB (chunk)            │
│ Cleanup needed     │ No (GC frees it)          │ Yes (unlink files)        │
│ Best for           │ Forward to S3/DB, resize  │ Persist locally, large    │
│                    │ in memory, small files    │ files, static serving     │
│ Default?           │ ✅ Yes                     │ No                        │
└────────────────────┴───────────────────────────┴───────────────────────────┘
```

---

## 🔧 6. Manually Writing a `memoryStorage` Buffer to Disk (only `fs` + `path`)

This re-implements what `diskStorage` does — useful when you need to **inspect or transform** the buffer first (validate magic numbers, resize an image, virus-scan) and only then decide to persist it.

The pattern: use `memoryStorage` to get `file.buffer`, then in the handler generate a safe name, build a path, ensure the directory, and `fs.writeFile` the raw bytes.

```javascript
import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "node:path";
import fs from "node:fs/promises";     // promise API for await
import ApiResponse from "./common/utils/api-response.js";

const app = express();

// 1. Keep every file in RAM as file.buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 9 }, // hard global cap
});

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Helper: take one multer file object, write its buffer to disk, return the saved path
async function persistBuffer(file) {
  // a) build a safe, unique filename — DO NOT trust file.originalname as-is
  const ext = path.extname(file.originalname).toLowerCase(); // ".png"
  const random = crypto.randomBytes(16).toString("hex");
  const safeName = `${file.fieldname}-${random}${ext}`;      // "avatar-9f2a…e1.png"

  // b) build the full path with path.join (normalizes separators, prevents "../" escaping the dir)
  const fullPath = path.join(UPLOAD_DIR, safeName);

  // c) ensure the directory exists (recursive = no error if it already does)
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // d) write the raw bytes — no encoding arg, because file.buffer is binary
  await fs.writeFile(fullPath, file.buffer);

  // e) hand back a web-servable path
  return `/uploads/${safeName}`;
}

app.post(
  "/upload-manual",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "gallery", maxCount: 8 },
  ]),
  async (req, res, next) => {
    try {
      const written = []; // track for cleanup on failure

      const avatarFile = req.files?.avatar?.[0];
      if (avatarFile) {
        // ── validate the BYTES, not just the mimetype ──
        const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        if (!avatarFile.buffer.subarray(0, 8).equals(pngSig)) {
          throw new Error("avatar must be a real PNG");
        }
        written.push(await persistBuffer(avatarFile));
      }

      for (const g of req.files?.gallery ?? []) {
        written.push(await persistBuffer(g));
      }

      return ApiResponse.ok(res, "Uploaded successfully", { files: written });
    } catch (err) {
      // best-effort cleanup of anything already written this request
      await Promise.allSettled(
        (req._writtenPaths ?? []).map((p) =>
          fs.unlink(path.join(process.cwd(), "public", p))
        )
      );
      next(err);
    }
  }
);
```

### 6.1 Callback (`node:fs`) Variant of the Helper

```javascript
import fs from "node:fs";

function persistBufferCb(file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = `${file.fieldname}-${crypto.randomBytes(16).toString("hex")}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, safeName);

  fs.mkdir(UPLOAD_DIR, { recursive: true }, (mkErr) => {
    if (mkErr) return cb(mkErr);
    fs.writeFile(fullPath, file.buffer, (wErr) => {   // Buffer → no encoding arg
      if (wErr) return cb(wErr);
      cb(null, `/uploads/${safeName}`);
    });
  });
}
```

### 6.2 `path.join` vs `path.resolve` — and the Traversal Trap

```javascript
path.join("public/uploads", "a.png");        // "public/uploads/a.png"  (relative)
path.resolve("public/uploads", "a.png");     // "C:\proj\public\uploads\a.png" (absolute)

// If you EVER build a name from user input, an attacker sends filename = "../../server.js"
path.join("public/uploads", "../../server.js"); // "server.js"  ← escaped the folder!

// Defense: use only your generated random name, or verify the result stays inside the dir:
const target = path.resolve(UPLOAD_DIR, userName);
if (!target.startsWith(UPLOAD_DIR + path.sep)) throw new Error("bad path");
```

---

## 🎯 7. Per-Field Type & Size Rules (avatar = PNG ≤ 2 MB, gallery = GIF ≤ 10 MB)

**The constraint**: `multer({ limits: { fileSize } })` is **one number for the whole upload**. There is no `limits` syntax for "2 MB on this field, 10 MB on that field." Two ways to solve it.

### Approach A (Recommended): Separate Multer Instances

One `multer()` per field, each with its own `fileFilter` and `fileSize`. Cleanest, self-documenting, no manual size math.

```javascript
import multer from "multer";

const MB = 1024 * 1024;
const storage = multer.diskStorage({ /* destination + filename as in §5.2 */ });

// ── avatar: PNG only, 2 MB ──
export const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * MB, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png") return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "avatar must be PNG"));
  },
}).single("avatar");

// ── gallery: GIF only, 10 MB, up to 8 ──
export const galleryUpload = multer({
  storage,
  limits: { fileSize: 10 * MB, files: 8 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/gif") return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "gallery must be GIF"));
  },
}).array("gallery", 8);

// Usage — either separate routes…
app.post("/me/avatar", avatarUpload, handleAvatar);
app.post("/me/gallery", galleryUpload, handleGallery);

// …or chained on ONE route (avatar parsed first, then gallery):
app.post("/me/media", avatarUpload, galleryUpload, (req, res) => {
  // req.file  = the avatar   (from .single)
  // req.files = the gallery  (from .array)
  res.send("ok");
});
```

> Chaining works because each middleware only consumes its own field name; the second reads the still-buffered request stream for its part. (For very large bodies, prefer separate routes.)

### Approach B: One `.fields()` Endpoint + Manual Size Check

When the client insists on a single request with both fields together. Set the **global** `fileSize` to the **largest** allowed (10 MB) as a hard ceiling, use `fileFilter` to enforce **type per field**, then **manually check the tighter avatar cap** after multer runs.

```javascript
import multer from "multer";
import fs from "node:fs/promises";

const MB = 1024 * 1024;
const AVATAR_MAX = 2 * MB;
const GALLERY_MAX = 10 * MB;

const upload = multer({
  storage: multer.diskStorage({ /* §5.2 */ }),
  limits: {
    fileSize: GALLERY_MAX,   // global hard ceiling = the biggest single allowance
    files: 9,                // 1 avatar + 8 gallery
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "avatar" && file.mimetype === "image/png") return cb(null, true);
    if (file.fieldname === "gallery" && file.mimetype === "image/gif") return cb(null, true);
    // reject: LIMIT_UNEXPECTED_FILE surfaces as a MulterError with this field name
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
});

const fieldsMiddleware = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "gallery", maxCount: 8 },
]);

app.post("/me/media", (req, res, next) => {
  fieldsMiddleware(req, res, async (err) => {
    // 1. multer's own errors (size ceiling, wrong field, too many files)
    if (err) return next(mapMulterError(err));

    try {
      // 2. enforce the per-field cap multer can't: avatar must also be ≤ 2 MB
      const avatar = req.files?.avatar?.[0];
      if (avatar && avatar.size > AVATAR_MAX) {
        await fs.unlink(avatar.path);                 // diskStorage: delete the oversize file
        // (memoryStorage equivalent: check avatar.buffer.length, nothing to unlink)
        return next(new Error("Avatar must be 2 MB or smaller"));
      }
      res.send("ok");
    } catch (e) {
      next(e);
    }
  });
});
```

### 7.1 Handling `MulterError` — the Real Codes

When multer rejects an upload it calls the middleware callback with a `multer.MulterError` whose `.code` tells you exactly what failed. Invoke the middleware manually (call the result of `upload.single(...)` yourself) so you can branch on `err.code`:

```javascript
import multer from "multer";

app.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {   // (req, res, cb)
    if (err instanceof multer.MulterError) {
      // a multer limit was hit — err.code says which one
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File is too large" });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({ error: "Too many files" });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: `Unexpected file on field "${err.field}"` });
      }
      return res.status(400).json({ error: `Upload error: ${err.code}` });
    }

    if (err) {
      // a non-multer error (e.g. thrown from fileFilter) — has a message, no code
      return res.status(400).json({ error: err.message });
    }

    // no error → req.file is ready
    return res.status(200).json({ message: "Uploaded successfully" });
  });
});
```

**All real `MulterError.code` values:**

```
┌────────────────────────┬──────────────────────────────────────────────┐
│ code                   │ Cause                                        │
├────────────────────────┼──────────────────────────────────────────────┤
│ LIMIT_PART_COUNT       │ Too many parts in the multipart body         │
│ LIMIT_FILE_SIZE        │ A file exceeded limits.fileSize              │
│ LIMIT_FILE_COUNT       │ More files than limits.files                 │
│ LIMIT_FIELD_KEY        │ A field name exceeded limits.fieldNameSize   │
│ LIMIT_FIELD_VALUE      │ A field value exceeded limits.fieldSize      │
│ LIMIT_FIELD_COUNT      │ More non-file fields than limits.fields      │
│ LIMIT_UNEXPECTED_FILE  │ A file arrived on a field multer wasn't      │
│                        │ told to expect (and the idiomatic code to    │
│                        │ raise from fileFilter for a wrong type)      │
└────────────────────────┴──────────────────────────────────────────────┘
```

**Same logic factored into a reusable mapper**, wired to `ApiError` so every upload route stays one line:

```javascript
import multer from "multer";
import { ApiError } from "./common/utils/api-error.js";

function mapMulterError(err) {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return ApiError.badRequest("File is too large");
      case "LIMIT_FILE_COUNT":
        return ApiError.badRequest("Too many files");
      case "LIMIT_UNEXPECTED_FILE":
        return ApiError.badRequest(`Unexpected or unsupported file on field "${err.field}"`);
      default:
        return ApiError.badRequest(`Upload error: ${err.code}`);
    }
  }
  return err; // a plain Error we threw (e.g. bad magic number) — let the global handler format it
}

app.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return next(mapMulterError(err));
    return ApiResponse.ok(res, "Uploaded successfully");
  });
});
```

---

## 🌐 8. Serving Uploaded Files & Keeping Them Out of Git

### 8.1 Static Serving

```javascript
// Anything in ./public is served from the URL root
app.use(express.static("public"));
// → file saved at  public/uploads/avatar-9f2a…e1.png
// → reachable at   GET /uploads/avatar-9f2a…e1.png
```

### 8.2 `.gitignore`

User uploads are runtime data, not source. Never commit them:

```gitignore
# .gitignore
public/uploads/
!public/uploads/.gitkeep     # keep the empty folder in the repo
```

Create `public/uploads/.gitkeep` so the directory exists on a fresh clone (otherwise `destination` points at a missing folder).

---

## ⚠️ 9. Gotchas / Interview Notes

- **Sync `fs` blocks the event loop.** One `readFileSync` in a request handler freezes every concurrent connection. Use it only at startup or in scripts.
- **Error-first callbacks**: the first callback argument is always `err`. Check it before touching `data`.
- **`node:fs` and `node:fs/promises` are different modules** — importing one doesn't give you the other.
- **`fs.rmdirSync(path, { recursive: true })` is deprecated** → use `fs.rmSync(path, { recursive: true, force: true })`.
- **Streams + `.pipe()` handle backpressure automatically** — this is why `diskStorage` is memory-safe and `memoryStorage` is not.
- **Multer only touches `multipart/form-data`.** A JSON body, or a form without `enctype="multipart/form-data"`, yields an empty `req.file`.
- **`req.body` is populated by multer, not before it.** Middleware placed *before* `upload.single()` sees no body. In the form, put text fields *before* file fields so they're parsed first.
- **`file.mimetype` and `file.originalname` are client-controlled.** `fileFilter` on mimetype is a soft gate; validate magic numbers (or use `file-type`) for real assurance. Never build a filesystem path from `originalname`.
- **`memoryStorage` OOM risk**: concurrent uploads × file size = RAM. Always set `limits.fileSize`.
- **`limits.fileSize` is global**, not per field. Per-field caps need separate `multer()` instances (Approach A) or a manual `file.size` / `buffer.length` check (Approach B).
- **`.fields()` gives arrays**: `req.files.avatar` is `[{…}]`, not `{…}` — even with `maxCount: 1`.
- **Real `MulterError` codes** are `LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`, `LIMIT_UNEXPECTED_FILE`, `LIMIT_PART_COUNT`, `LIMIT_FIELD_KEY`, `LIMIT_FIELD_VALUE`, `LIMIT_FIELD_COUNT`. `LIMIT_FILE_TYPES` does **not** exist.
- **`diskStorage` writes before your handler runs.** If a later validation fails, the file is already on disk — track written paths and `fs.unlink` them in the error branch.
- **`destination` folder must already exist** for `diskStorage` (unlike the manual `fs.mkdir({recursive:true})` approach in §6).
- **`crypto.randomBytes(16).toString("hex")`** → 32-char unique filename stub; prevents collisions and hides the original name.

---

## 🔗 Related Notes

- **`03-NodeJS-Internals-Event-Loop-Libuv-Threadpool.md`** — why async `fs` and streams don't block; the libuv thread pool that runs disk I/O.
- **`04-Express-Routing-Middleware-Rest-Auth-Architecture.md`** — middleware ordering, which governs where `upload.*` sits in the chain.
- **`05-Production-Express-Architecture-Auth-DTO-Security.md`** — `ApiResponse` / `ApiError` classes used in the error-handling examples above.
