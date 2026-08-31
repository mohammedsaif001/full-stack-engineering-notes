# Introduction to Backend Engineering: HTTP, Node.js & TypeScript
## Class 01 — Foundations of Modern Backend Architecture

---

## 📌 Executive Summary

- **Backend Engineering** is about handling data persistence, business logic, security, and communication protocols between client applications and databases.
- **HTTP Methods (Verbs)** dictate client intent (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`). Choosing the proper semantic verb guarantees idempotency, caching efficiency, and security.
- **Idempotency** is a fundamental distributed systems concept: an operation is idempotent if executing it once produces the exact same side-effects as executing it $N$ times.
- **HTTP Status Codes** convey standardized response outcomes grouped across 5 classes ($1\text{xx}$ through $5\text{xx}$).
- **Node.js** is an asynchronous, event-driven JavaScript runtime built on Google's **V8 engine**, **Libuv** (C library), and **C++ bindings**.
- **Semantic Versioning (SemVer)** (`MAJOR.MINOR.PATCH`) provides predictable dependency management for packages published to `npm`.
- **TypeScript** introduces static typing and compile-time verification to JavaScript. The TS compiler pipeline processes code through **Lexer $\to$ Parser $\to$ Binder $\to$ Checker $\to$ Emitter**.
- An **In-Memory Database** implemented with TypeScript `Map`, interfaces, and utility types (`Omit`) illustrates encapsulation, memory modeling, and defensive validation.

---

## 🧠 Core Analogies

- **HTTP Verbs as Postal Orders**:
  - `GET` is like reading a public bulletin board — you can look 100 times without altering the board.
  - `POST` is like dropping a new order form into a mailbox — every form submitted creates a new physical ticket.
  - `PUT` is replacing an entire house's furniture with a brand-new set.
  - `PATCH` is swapping out only the broken lightbulb in the living room.
- **Node.js Architecture as a High-End Restaurant**:
  - **V8 Engine** = The Head Chef who rapidly turns recipes (JavaScript) into finished dishes (machine code execution).
  - **Libuv & Event Loop** = The Floor Manager & Waitstaff coordinating asynchronous orders, delegating heavy chopping/baking to the **Worker Thread Pool** while keeping the front desk responsive.
  - **C++ Bindings** = The intercom system connecting the kitchen staff directly to external suppliers and utility providers (OS System Calls).
- **TypeScript Compiler as a Strict Building Inspector**:
  - The inspector checks architectural blueprints before any brick is laid. If load-bearing walls have incorrect dimensions, construction is halted immediately (compile-time error), preventing structural collapse in production (runtime crash).

---

## 🌐 1. Client-Server Architecture & HTTP Fundamentals

Backend systems exist to service client requests, execute business logic, and interface with persistence layers (databases, caches, third-party APIs).

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  • Web Browsers (Chrome, Firefox, Safari)                        │
│  • Mobile Apps (iOS, Android, React Native)                      │
│  • CLI Tools (cURL, Wget, Custom Scripts)                        │
│  • API Clients (Postman, RequestKit, Requestly, Thunder Client)  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ HTTP Request (Verb + Path + Headers + Body)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVER                           │
│  • Routing & Request Parsing                                     │
│  • Authentication, Authorization & Security                      │
│  • Business Logic & Validation                                   │
│  • Serialization & Response Formatting (JSON / XML)              │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ Queries / TCP / Connection Pool
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE / DB                           │
│  • Relational DBs (PostgreSQL, MySQL)                            │
│  • Document / NoSQL DBs (MongoDB, DynamoDB)                      │
│  • In-Memory Caches (Redis, Memcached)                           │
└──────────────────────────────────────────────────────────────────┘
```

When a user interacts with an application, different user actions trigger distinct types of HTTP requests:
1. Navigating to a URL triggers a `GET` request.
2. Submitting a login or signup form triggers a `POST` request.
3. Clicking a "Delete Account" button triggers a `DELETE` request.

---

## 📡 2. HTTP Methods (Verbs) Deep-Dive

HTTP methods define the **action** to be performed on a target resource identified by a URI.

```
                  ┌──────────────┐
                  │ HTTP Methods │
                  │   (Verbs)    │
                  └──────┬───────┘
                         │
      ┌──────────┬───────┴───────┬──────────┬──────────┐
      ▼          ▼               ▼          ▼          ▼
   ┌─────┐    ┌──────┐       ┌───────┐  ┌───────┐  ┌────────┐
   │ GET │    │ POST │       │  PUT  │  │ PATCH │  │ DELETE │
   └─────┘    └──────┘       └───────┘  └───────┘  └────────┘
      │          │               │          │          │
      ▼          ▼               ▼          ▼          ▼
  Read Data   Create New     Full Replace   Delta    Remove
  Idempotent  Non-Idempotent  Idempotent   Partial  Idempotent
```

### 1. `GET` — Retrieve a Resource
- **Purpose**: Fetch/read representation of a resource without altering system state.
- **Side Effects**: **Zero side effects** (Safe Method).
- **Idempotency**: **IDEMPOTENT**. Calling `GET /users/1` 1 time or 10 times returns identical data and leaves the server state unchanged.
- **Caching & Prefetching**:
  - Heavily cacheable by browsers, proxies, and CDNs (Cloudflare, AWS CloudFront).
  - Modern frontend frameworks (e.g., Next.js) aggressively **prefetch** `GET` resources when a user hovers over a link, making page transitions instantaneous.

### 2. `POST` — Create a New Resource
- **Purpose**: Submit data to be processed, typically creating a new record or triggering a business process.
- **Side Effects**: Modifies state (inserts into DB, sends emails, charges payments).
- **Idempotency**: **NOT IDEMPOTENT**. Calling `POST /orders` 10 times will likely create 10 independent orders and charge the customer 10 times.
- **Payload & Responses**:
  - Sends a payload in the request body (JSON, `multipart/form-data`, URL-encoded).
  - Common status codes: `201 Created` (with `Location` header) or `200 OK`.

### 3. `PUT` — Complete Replacement / Overwrite
- **Purpose**: Completely replace an existing resource with the supplied payload, or create it if it does not exist (Upsert).
- **Behavior**: You **must send the complete object**. Any fields omitted from the payload will be overwritten with default/null values.
  - *Example*: If a user has `{ id: 1, name: "Saif", email: "saif@example.com", age: 25 }` and you only want to update the age, sending `{ age: 26 }` via `PUT` will erase `name` and `email` if not handled defensively.
- **Idempotency**: **IDEMPOTENT**. Sending the exact same full replacement payload $N$ times results in the same database state.

### 4. `PATCH` — Partial Update / Delta Modification
- **Purpose**: Apply partial modifications to a resource.
- **Behavior**: You send **ONLY the changed fields**. The backend merges the updates into the existing record.
- **Bandwidth Efficiency**: Highly efficient compared to `PUT` because only the delta is transmitted over the wire.
- **Idempotency**: Typically idempotent in key-value replacement, though non-idempotent if using append/increment operations (e.g., `PATCH { "counter": "+1" }`).

### 5. `DELETE` — Remove a Resource
- **Purpose**: Delete the specified resource.
- **Idempotency**: **IDEMPOTENT**. Calling `DELETE /users/10` once deletes the record. Calling it again returns `404 Not Found` or `204 No Content`, but the server's end state remains identical (user 10 does not exist).

### 6. Special & Rare Verbs: `HEAD` & `OPTIONS`

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPECIALIZED HTTP VERBS                          │
├────────────────────────────────────────────────────────────────────────┤
│  HEAD     │ • Identical to GET, but the server returns ONLY headers.   │
│           │ • Body is completely omitted.                              │
│           │ • Use cases: Checking if a file exists, inspecting cache   │
│           │   headers (ETag/Last-Modified), or checking Content-Length │
│           │   before initiating a multi-gigabyte download.             │
├───────────┼────────────────────────────────────────────────────────────┤
│  OPTIONS  │ • Preflight & capability interrogation.                    │
│           │ • In CORS (Cross-Origin Resource Sharing), browsers        │
│           │   automatically send an OPTIONS request before executing   │
│           │   cross-origin mutations (POST, PUT, DELETE with headers)  │
│           │   to verify server permissions.                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 3. HTTP Verbs Master Comparison Matrix

| Method | Semantic Action | Safe? | Idempotent? | Request Body Allowed? | Browser/CDN Cacheable? | Typical Status Codes |
|---|---|---|---|---|---|---|
| **`GET`** | Read / Retrieve resource | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | `200 OK` |
| **`POST`** | Create new resource / Action | ❌ No | ❌ No | ✅ Yes | ❌ No (rarely) | `201 Created`, `200 OK` |
| **`PUT`** | Full resource replacement | ❌ No | ✅ Yes | ✅ Yes (Complete entity) | ❌ No | `200 OK`, `204 No Content` |
| **`PATCH`** | Partial delta update | ❌ No | ⚠️ Contextual | ✅ Yes (Delta fields) | ❌ No | `200 OK`, `204 No Content` |
| **`DELETE`** | Remove resource | ❌ No | ✅ Yes | ❌ Discouraged | ❌ No | `200 OK`, `204 No Content`, `404` |
| **`HEAD`** | Read headers only | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | `200 OK` (No body) |
| **`OPTIONS`** | Query allowed methods / CORS | ✅ Yes | ✅ Yes | ❌ No | ❌ No | `204 No Content`, `200 OK` |

---

## 🚦 4. HTTP Response Status Codes

Status codes are 3-digit integers returned by the server indicating the outcome of the client's request:

```
┌──────────────────────────────────────────────────────────────┐
│                  HTTP STATUS CODE CLASSES                    │
├─────────┬─────────────────┬──────────────────────────────────┤
│ Range   │ Class Name      │ Core Meaning                     │
├─────────┼─────────────────┼──────────────────────────────────┤
│ 100-199 │ Informational   │ Request received, continuing...  │
│ 200-299 │ Success         │ Action understood and completed  │
│ 300-399 │ Redirection     │ Further action needed to finish  │
│ 400-499 │ Client Errors   │ Syntax error or bad request      │
│ 500-599 │ Server Errors   │ Server failed to fulfill request │
└─────────┴─────────────────┴──────────────────────────────────┘
```

### Essential Status Codes Cheat-Sheet
- `200 OK`: Standard successful response for `GET`, `PUT`, `PATCH`.
- `201 Created`: Resource successfully created (standard for `POST`).
- `204 No Content`: Action succeeded, but no content is returned in the response body (common for `DELETE`).
- `301 Moved Permanently`: Permanent redirect (SEO link equity passes to new URL).
- `304 Not Modified`: Cached version on client is still valid (saves bandwidth).
- `400 Bad Request`: Malformed syntax, invalid JSON, or failed validation.
- `401 Unauthorized`: Authentication missing or invalid (no valid token/credentials).
- `403 Forbidden`: Authenticated, but lacking permission/role to access resource.
- `404 Not Found`: Target resource does not exist at requested URL.
- `409 Conflict`: Request conflicts with current server state (e.g., duplicate email registration).
- `422 Unprocessable Entity`: Request body is syntactically valid JSON but fails business validation.
- `500 Internal Server Error`: Unhandled server exception or application crash.
- `502 Bad Gateway`: Reverse proxy received an invalid response from upstream server.
- `503 Service Unavailable`: Server overloaded or undergoing maintenance.
- `504 Gateway Timeout`: Upstream server failed to respond in time to reverse proxy.

---

## 🛠️ 5. Node.js Ecosystem, CLI & Professional Project Setup

### What is Node.js?
Node.js was created by **Ryan Dahl** in 2009. It is **not a framework** and **not a programming language** — it is a **JavaScript runtime environment** executing code outside the browser.

### Key Node CLI Flags
```bash
# Check current Node.js runtime version
node --version
node -v

# Run script with native continuous file watching & hot restart (Node 18+)
node --watch server.js
```

### Professional Project Initialization
```bash
# Interactive setup (prompts for package name, version, author, license, entry point)
npm init

# Non-interactive quick setup with default values
npm init -y
```

### Semantic Versioning (SemVer)
The versioning convention used by NPM and package ecosystems follows `MAJOR.MINOR.PATCH` (e.g., `1.4.2`):

```
       1      .      4      .      2
       │             │             │
       ▼             ▼             ▼
  MAJOR Version  MINOR Version  PATCH Version
  (Breaking API  (New Feature,  (Bug Fixes,
   Changes)      Backwards-      Backwards-
                 Compatible)     Compatible)
```

1. **`MAJOR` (Breaking Change)**:
   - Incremented when API changes are incompatible with previous versions.
   - Example: Modifying function signatures or removing endpoints (`1.0.0` $\to$ `2.0.0`).
2. **`MINOR` (New Features)**:
   - Incremented when functionality is added in a backward-compatible manner.
   - Example: Adding a new utility method or optional parameter (`1.0.0` $\to$ `1.1.0`).
3. **`PATCH` (Bug Fixes)**:
   - Incremented when backward-compatible bug fixes are applied (`1.0.0` $\to$ `1.0.1`).
4. **Pre-release & Build Identifiers**:
   - `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`, `1.0.0+build.2026`.

### `package.json` Manifest
```json
{
  "name": "backend-foundations",
  "version": "1.0.0",
  "description": "Backend Engineering fundamentals and in-memory DB",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsc --watch & node --watch dist/index.js",
    "build": "tsc"
  },
  "keywords": ["backend", "typescript", "node"],
  "author": "Mohammed Saif",
  "license": "ISC",
  "dependencies": {
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
```

---

## ⚡ 6. TypeScript: Why Types Matter in Backend Systems

JavaScript is **dynamically typed** (types resolved at runtime) and **loosely typed** (types coerce automatically):

```javascript
// JavaScript Type Coercion Pitfall
function add(a, b) {
  return a + b;
}

console.log(add(1, 2));             // 3 (Number addition)
console.log(add("Piyush", true));   // "Piyushtrue" (Silent string concatenation bug!)
```

In a large backend codebase, unexpected runtime coercion causes corrupted database records, payment computation bugs, and unhandled runtime exceptions.

### TypeScript Solution: Compile-Time Verification
TypeScript is a strongly typed superset of JavaScript that compiles down to standard JavaScript.

```typescript
function add(a: number, b: number): number {
  return a + b;
}

add(1, 2);              // ✅ Valid -> 3
add("Piyush", true);    // ❌ Compile Error: Argument of type 'string' is not assignable to parameter of type 'number'.
```

```
┌─────────────────┐        Transpilation        ┌─────────────────┐
│ TypeScript Code │ ──────────────────────────▶ │ JavaScript Code │ ──▶ Node / V8 Engine
│  (.ts files)    │   (tsc compiler checks      │  (.js files)    │
└─────────────────┘    types & strips them)     └─────────────────┘
```

---

## 🔬 7. Behind the Scenes: TypeScript Compiler Architecture

How does the TypeScript compiler (`tsc`) turn `.ts` files into safe `.js` code? It follows a 5-phase compiler pipeline:

```
┌──────────────┐
│   TS Code    │
│  (.ts file)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐      Token Stream
│    Lexer     │ ────────────────────────────────────────┐
│(Tokenization)│                                         │
└──────┬───────┘                                         ▼
       │                                       ┌──────────────────┐
       ▼                                       │       AST        │
┌──────────────┐      Constructs Tree          │ (Abstract Syntax │
│    Parser    │ ────────────────────────────▶ │      Tree)       │
└──────┬───────┘                               └─────────┬────────┘
       │                                                 │
       ▼                                                 │
┌──────────────┐      Populates Symbol Tables            │
│    Binder    │ ◀───────────────────────────────────────┘
│              │ ──▶ Symbol Tables, Parent Pointers, Flow Nodes
└──────┬───────┘
       │
       ▼
┌──────────────┐      Type Checking & Validation
│   Checker    │ ──▶ Two-pass semantic checks, syntax rules & short-circuits
└──────┬───────┘
       │
       ▼
┌──────────────┐      Code Generation
│   Emitter    │ ──▶ Outputs: .js, .d.ts, .js.map (Strips all types!)
└──────────────┘
```

### Compiler Pipeline Phase Breakdown

1. **Lexer (Tokenization)**:
   - Scans raw character stream of source code and breaks it into atomic tokens (`const`, `let`, `function`, identifiers, literal values, operators).
2. **Parser**:
   - Consumes tokens and constructs an **Abstract Syntax Tree (AST)** representing hierarchical syntactic structure.
3. **Binder**:
   - Links AST nodes with identifiers.
   - Builds **Symbol Tables** to track variable declarations, scopes, and definitions.
   - Sets **Parent Pointers** on AST nodes for bi-directional traversal.
   - Builds **Flow Nodes** (control flow graph) enabling type narrowing (`typeof`, `instanceof`, `if-else`).
4. **Checker**:
   - The largest and most complex engine module.
   - Conducts two passes over AST and Symbol Tables to enforce type compatibility, resolve generics, and verify function signatures.
   - Utilizes short-circuit optimizations when type mismatches are trivial.
5. **Emitter**:
   - Transforms verified AST into output artifacts.
   - Emits pure JavaScript (`.js`), TypeScript Declaration files (`.d.ts`), and Source Maps (`.js.map`).
   - **Strips out all type annotations, interfaces, and type aliases** so the resulting code runs natively on any JS runtime.

---

## ⚙️ 8. Node.js Internals: V8, Libuv & C++ Bindings

Node.js combines three fundamental layers to deliver high-throughput, non-blocking I/O:

```
┌─────────────────────────────────────────────────────────────┐
│                       NODE.JS RUNTIME                       │
├─────────────────────────────────────────────────────────────┤
│  JavaScript Layer: Application Code & Node Standard Modules │
│  (fs, http, path, crypto, events, stream, net)              │
├─────────────────────────────────────────────────────────────┤
│  Node.js C++ Bindings & Addons (C++ Core Wrapper Bridge)    │
├──────────────────────────────┬──────────────────────────────┤
│      GOOGLE V8 ENGINE        │            LIBUV             │
│  • JIT Compiler (Machine     │  • Event Loop                │
│    code generation)          │  • Thread Pool (4+ threads)  │
│  • Memory Heap & Allocator   │  • Non-blocking Async I/O    │
│  • Call Stack Execution      │  • DNS Lookup & File System  │
│  • Garbage Collection        │  • Cross-Platform OS Layer   │
└──────────────────────────────┴──────────────────────────────┘
```

### 1. Google V8 Engine (C++)
- Compiles JavaScript source code into optimized machine code via **JIT (Just-In-Time) compilation**.
- Manages the **Call Stack** (function execution tracking) and the **Memory Heap** (object allocation & garbage collection).
- V8 has *no knowledge* of network sockets, timers, or file systems on disk — it is purely a computation engine.

### 2. Libuv (Pure C Library)
- High-performance asynchronous I/O engine designed specifically for Node.js.
- Implements the **Event Loop** for non-blocking single-threaded execution.
- Manages a **Worker Thread Pool** (default 4 threads, configurable via `UV_THREADPOOL_SIZE`) to execute synchronous OS tasks off the main thread (file system operations via `fs`, cryptographic computations, DNS lookups).

### 3. Node.js C++ Bindings
- The glue layer connecting JavaScript method invocations (e.g., `fs.readFile()`) with underlying Libuv C system calls.
- Marshals data back and forth between JavaScript V8 data types and native C/C++ data buffers.

---

## 💻 9. Hands-on Project: In-Memory Database in TypeScript

Below is the complete implementation of a typed in-memory storage engine demonstrating domain modeling, strict typing, encapsulation, and error handling.

### Implementation Code (`in-memory-db.ts`)

```typescript
// 1. Define Atomic Types and Domain Interfaces
type UserID = string;

interface ContactInfo {
  mobile: string;
}

interface AddressInfo {
  street: number;
  pin: number;
  country: string;
}

interface User {
  id: UserID;
  fname: string;
  lname?: string; // Optional property marked with '?'
  email: string;
  contact: ContactInfo;
  address: AddressInfo;
}

// 2. Encapsulated In-Memory Database Class
class InMemoryDB {
  // Private hash map for O(1) key-value storage
  private _db: Map<UserID, User>;

  constructor() {
    this._db = new Map<UserID, User>();
  }

  /**
   * Inserts a new user record. Throws error if ID already exists.
   */
  public insertUser(data: User): UserID {
    if (this._db.has(data.id)) {
      throw new Error(`User with ID ${data.id} already exists`);
    }
    this._db.set(data.id, data);
    return data.id;
  }

  /**
   * Updates an existing user record using partial/full data omitting the ID.
   */
  public updateUser(id: UserID, updateData: Omit<User, "id">): boolean {
    if (!this._db.has(id)) {
      throw new Error(`User with ID ${id} does not exist`);
    }
    // Merge existing ID with updated payload using object spread operator
    this._db.set(id, { ...updateData, id });
    return true;
  }

  /**
   * Retrieves a user by their unique UserID.
   */
  public getUserById(id: UserID): User {
    if (!this._db.has(id)) {
      throw new Error(`User with ID ${id} does not exist`);
    }
    return this._db.get(id)!;
  }

  /**
   * Deletes a user record (Idempotent deletion).
   */
  public deleteUser(id: UserID): boolean {
    return this._db.delete(id);
  }
}

// 3. Execution & Validation
const myDb = new InMemoryDB();

// Insert record
myDb.insertUser({
  id: "user-1",
  fname: "Piyush",
  lname: "Garg",
  email: "piyush@email.com",
  contact: { mobile: "+919999999999" },
  address: {
    country: "India",
    pin: 147001,
    street: 1,
  },
});

console.log("Retrieved User:", myDb.getUserById("user-1"));

// Update record
myDb.updateUser("user-1", {
  fname: "Piyush",
  email: "piyush.updated@email.com",
  contact: { mobile: "+919999999999" },
  address: {
    country: "India",
    pin: 147001,
    street: 1,
  },
});

console.log("Updated User:", myDb.getUserById("user-1"));
```

### TypeScript Concepts Applied:
1. `type UserID = string`: Creates a semantic type alias for readable domain signatures.
2. `lname?: string`: The `?` token designates optional fields (can be `undefined`).
3. `private _db: Map<UserID, User>`: Encapsulation ensures external code cannot mutate the Map directly.
4. `Omit<User, 'id'>`: Built-in TypeScript utility type that constructs a type containing all properties of `User` except `id`, preventing consumers from changing primary keys during an update operation.
5. `{ ...updateData, id }`: Object spread syntax combines the new fields with the original invariant identifier.
6. `this._db.get(id)!`: Non-null assertion operator informing TypeScript that the value is guaranteed to exist due to prior `this._db.has(id)` checks.

---

## 🎯 10. Summary & Revision Checklist

- [ ] **HTTP Verbs**: `GET` (Read, safe, idempotent, cacheable), `POST` (Create, non-idempotent), `PUT` (Replace full entity, idempotent), `PATCH` (Delta update, bandwidth efficient), `DELETE` (Remove, idempotent), `HEAD` (Headers only), `OPTIONS` (Preflight & CORS).
- [ ] **Status Code Families**: $1\text{xx}$ (Info), $2\text{xx}$ (Success), $3\text{xx}$ (Redirection), $4\text{xx}$ (Client Error), $5\text{xx}$ (Server Error).
- [ ] **Node.js Internals**: Single-threaded JavaScript event loop backed by Google V8 (compilation & memory), Libuv (asynchronous I/O, event loop, worker thread pool), and C++ bindings bridge.
- [ ] **SemVer Rules**: `MAJOR.MINOR.PATCH` $\to$ Breaking API changes, backward-compatible features, and backward-compatible patches.
- [ ] **TypeScript Compiler**: Source code $\to$ Lexer $\to$ Parser (AST) $\to$ Binder (Symbols/Flow) $\to$ Checker $\to$ Emitter (`.js` output with types stripped).
- [ ] **In-Memory Store**: Leveraging TypeScript generics, Maps, and utility types (`Omit`) to build reliable domain services.
