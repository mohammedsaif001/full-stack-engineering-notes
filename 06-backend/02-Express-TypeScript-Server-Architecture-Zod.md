# Modern Express & TypeScript: Server Architecture, Zod Validation & MVC
## Class 02 — Building Production-Grade Backend Services

---

## 📌 Executive Summary

- **What is a Server?**: An infinitely running software program that binds to a network port, continuously listens for incoming client requests, executes application logic, and returns formatted responses.
- **Raw Node.js HTTP vs Express.js**:
  - Raw `node:http` requires manual URL parsing, route routing via `if/else`, and explicit handling of streaming byte buffers (`req.on('data')` and `req.on('end')`).
  - **Express.js** abstracts this pipeline into declarative routing, powerful middleware chains, and automatic body parsing (`express.json()`).
- **Dependency Management & Trees**:
  - `dependencies` (production runtime) vs `devDependencies` (development & compilation tooling).
  - `package.json` declares allowed version ranges, while `package-lock.json` pins exact resolved versions and cryptographic integrity hashes.
- **TypeScript Tooling & Configuration**:
  - `tsconfig.json` manages compilation targets, module resolution (`nodenext`), output paths (`rootDir` $\to$ `outDir`), and strict type checking.
  - Automated compile-and-reload workflows via `tsc-watch` and `node dist/index.js`.
- **Runtime Schema Validation with Zod**:
  - TypeScript types disappear at runtime (erased during compilation). **Zod** provides runtime boundary validation for incoming HTTP payloads and environment variables (`process.env`), while automatically deriving static TypeScript types via `z.infer`.
- **Enterprise Modular Architecture**:
  - Decoupling systems into **Server Entry Point** (`index.ts`), **App Factory** (`app/index.ts`), **Domain Routers** (`routes.ts`), **Controllers** (`controller.ts`), and **Schemas** (`schema.ts`).

---

## 🧠 Core Analogies

- **Raw Node.js Server vs Express.js as Making Pizza**:
  - **Raw `node:http`**: Harvesting wheat from the field, milling it into flour, kneading the dough from scratch, and lighting a wood fire every single time an order comes in (manual byte chunk concatenation, manual header formatting).
  - **Express.js**: Operating a modern commercial kitchen with an automated conveyor belt, pre-prepped ingredients, and standardized cooking stations (middlewares, built-in router, automatic JSON parsing).
- **TypeScript Static Types vs Zod Runtime Validation**:
  - **TypeScript**: The bouncer checking employee badges on a private corporate intranet — fast, trusted, compile-time check.
  - **Zod**: The airport security scanner inspecting luggage from unknown passengers at the border (HTTP requests from the public internet). It verifies every byte in real-time before letting data enter your application.
- **`package.json` vs `package-lock.json`**:
  - **`package.json`**: A grocery shopping list ("Buy eggs, bread, and milk").
  - **`package-lock.json`**: The exact cashier receipt with specific brand names, batch serial numbers, timestamps, and barcodes ensuring everyone buys the exact same item.

---

## 🏗️ 1. Server Architecture & Raw Node.js HTTP Server

At the network level, a server binds to an IP address and **Port number** (e.g., `8080`, `3000`), maintaining an open TCP socket listening for HTTP request frames.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NETWORK TRANSPORT LAYER                         │
│   Client (cURL / Postman / Browser) ──── TCP Handshake ───▶ Port 8080  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     RAW NODE.JS HTTP EVENT STREAM                      │
│   1. TCP Socket receives raw stream of data chunks (Buffers)           │
│   2. req.on('data', chunk => buffer += chunk)                          │
│   3. req.on('end', () => parseJSON(buffer))                            │
│   4. res.writeHead(200, { 'Content-Type': 'application/json' })        │
│   5. res.end(JSON.stringify(payload))                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Raw Node.js HTTP Server Implementation
In standard Node.js without frameworks, we use the built-in `node:http` module. Notice the manual streaming and routing boilerplate required:

```javascript
// index.js (Raw Node.js Server)
const http = require("http");

const server = http.createServer((req, res) => {
  // 1. Manual Route & Method Matching
  if (req.method === "GET" && req.url === "/menu") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ items: ["thali", "biryani"] }));
  } 
  else if (req.method === "POST" && req.url === "/order") {
    // 2. Manual Request Body Stream Handling
    let data = "";

    // Event listener: Fired whenever a chunk of bytes arrives
    req.on("data", (chunk) => {
      data += chunk;
    });

    // Event listener: Fired when entire payload stream is finished
    req.on("end", () => {
      try {
        const order = JSON.parse(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "received",
            order,
          })
        );
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON format" }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(8080, () => {
  console.log("Raw HTTP Server listening on port 8080");
});
```

### Why Raw HTTP Becomes Unmaintainable
1. **Stream Handling**: Every single `POST`/`PUT`/`PATCH` requires attaching `'data'` and `'end'` event listeners.
2. **Brittle Routing**: Complex nested `if / else if / else` chains for URL and method checks.
3. **No Middleware Pipeline**: Adding authentication, logging, rate limiting, and error handling requires manually wrapping functions.
4. **Header & Status Verbosity**: Writing headers and serializing JSON (`JSON.stringify`) manually for every route.

---

## ⚡ 2. Transitioning to Express.js

Express.js is a minimalist, unopinionated web framework that provides a clean abstraction over `node:http`.

```javascript
// newindex.js (Express.js Equivalent)
const express = require("express");

const app = express();

// Global Middleware: Automatically parses incoming JSON byte streams into req.body
app.use(express.json());

// Declarative Route Handlers
app.get("/menu", (req, res) => {
  return res.json({
    items: ["thali", "biryani"],
  });
});

app.post("/order", (req, res) => {
  const order = req.body; // Already parsed by express.json()
  return res.status(200).json({
    status: "received",
    order,
  });
});

app.listen(8080, () => {
  console.log("Express Server listening on port 8080");
});
```

### What `express.json()` Middleware Does Behind the Scenes
When `express.json()` executes:
1. It intercepts requests where `Content-Type: application/json`.
2. It attaches internal `'data'` listeners to collect byte buffers into memory.
3. It validates that the payload does not exceed the allowed size limit (`100kb` default).
4. It calls `JSON.parse()` on the completed buffer.
5. It attaches the parsed JavaScript object to `req.body` and calls `next()` to pass execution to your controller.

---

## 📦 3. Dependency Management: `package.json` vs `package-lock.json`

```
┌─────────────────────────────────────────────────────────────┐
│                    NODE PACKAGE ECOSYSTEM                   │
├──────────────────────────────┬──────────────────────────────┤
│        dependencies          │       devDependencies        │
│  (Production Runtime)        │  (Development & Build Only)  │
│  • express                   │  • typescript                │
│  • zod                       │  • @types/express            │
│  • dotenv                    │  • @types/node               │
│  • cors                      │  • tsc-watch                 │
└──────────────────────────────┴──────────────────────────────┘
```

### 1. Dependency Categories
- **`dependencies`** (`npm i <package>`): Required for the production runtime to execute (e.g., Express, database drivers, ORMs, Zod).
- **`devDependencies`** (`npm i -D <package>`): Only used during development, testing, and compilation (e.g., TypeScript compiler, types `@types/*`, linter, watch scripts).

### 2. The Dependency Tree & Lockfiles
When you install `express`, Express has its own `package.json` listing dependencies (`body-parser`, `cookie`, `debug`, etc.), which in turn have their own dependencies. This forms a **transitive dependency tree**.

| File | Purpose | Contains | When Committed to Git? |
|---|---|---|---|
| **`package.json`** | Declares project metadata, scripts, and version ranges using caret (`^`) or tilde (`~`). | Semantic version ranges (e.g., `"^5.2.1"` allows any `5.x.x` patch/minor update). | ✅ Always |
| **`package-lock.json`** | Records exact snapshot of the resolved dependency tree across all nested packages. | Exact version numbers, direct download URLs, and cryptographic SHA-512 integrity hashes. | ✅ Always |

> [!IMPORTANT]
> Always commit `package-lock.json` to source control. It ensures that every developer on your team and your CI/CD production deployment install the exact same byte-for-byte packages.

---

## ⚙️ 4. TypeScript Configuration & Compilation Workflow

To run TypeScript in a modern Node.js backend, we configure the compiler to read from `src/` and output compiled JavaScript into `dist/`.

### Initializing TypeScript Configuration
```bash
# Generate tsconfig.json with default recommended flags
npx tsc --init
```

### Production `tsconfig.json` Configuration
```json
{
  "compilerOptions": {
    /* File Layout */
    "rootDir": "./src",
    "outDir": "./dist",

    /* Module Resolution & Target */
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "esnext",

    /* Emit Outputs */
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    /* Strict Type Checking */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### Compilation & Execution Tools
1. **Manual Compilation**:
   ```bash
   # Compiles project using tsconfig.json in current directory (-p = project)
   npx tsc -p .
   ```
2. **Automated Live Watcher (`tsc-watch`)**:
   `tsc-watch` monitors `.ts` files in `src/`, compiles them into `dist/`, and automatically restarts the Node server upon successful compilation.

   ```json
   // package.json scripts
   "scripts": {
     "dev": "tsc-watch --onSuccess \"node dist/index.js\""
   }
   ```

3. **Install Core Dependencies**:
   ```bash
   # Production runtime dependencies
   npm i express zod

   # Development tooling & TypeScript type definitions
   npm i -D typescript tsc-watch @types/node @types/express
   ```

---

## 🛡️ 5. Runtime Validation with Zod

### The Gap Between TypeScript and Runtime
- **TypeScript types only exist at compile time**. Once compiled to JavaScript, all type annotations are stripped away.
- When an external client makes an HTTP request with a JSON body, TypeScript cannot guarantee the shape of that data.
- **Zod** bridges this gap by validating data at runtime and generating static TypeScript types automatically.

```
Incoming HTTP JSON Payload ──▶ Zod Schema (`safeParseAsync`) ──▶ Validated & Typed Object ──▶ Controller Logic
                                     │
                             (Validation Error)
                                     │
                                     ▼
                            HTTP 400 Bad Request
```

### Environment Variable Validation (`src/env.ts`)
Environment variables (`process.env`) are always `string | undefined`. Validating them on server startup ensures the server crashes immediately if critical environment settings are missing or invalid (Fail-Fast Principle):

```typescript
// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function createEnv(environment: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(environment);
  
  if (!safeParseResult.success) {
    console.error("❌ Invalid environment variables:", safeParseResult.error.format());
    throw new Error("Invalid Environment Configuration");
  }
  
  return safeParseResult.data;
}

export const env = createEnv(process.env);
```

---

## 🏛️ 6. Enterprise Layered Architecture (MVC / Modular Design)

A production backend decouples responsibilities into distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ENTRY POINT (`src/index.ts`)                             │
│    • Initializes HTTP Server listener & port binding        │
│    • Loads validated environment variables                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. APPLICATION FACTORY (`src/app/index.ts`)                 │
│    • Creates Express instance                               │
│    • Registers global middleware (CORS, JSON Parser, etc.)  │
│    • Mounts domain route modules (/todos, /users, etc.)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ROUTER LAYER (`src/app/todo/routes.ts`)                  │
│    • Defines endpoints (GET /, POST /, PUT /:id)            │
│    • Maps HTTP verbs to specific controller methods         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CONTROLLER LAYER (`src/app/todo/controller.ts`)          │
│    • Reads req.body / req.params / req.query                │
│    • Executes Zod validation against schemas                │
│    • Interacts with database / service layer                │
│    • Returns HTTP status codes & JSON payloads              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SCHEMA & VALIDATION LAYER (`src/validation/todo.schema.ts│
│    • Defines Zod validation rules                           │
│    • Exports inferred TypeScript types (z.infer)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 7. Complete Hands-on Codebase Implementation

Here is the complete modular code implementation of the TypeScript Express Todo Service.

### 1. Schema & Validation Layer (`src/validation/todo.schema.ts`)
```typescript
import { z } from "zod";

export const todoValidationSchema = z.object({
  id: z.string().describe("Unique identifier for the todo"),
  title: z.string().min(1, "Title cannot be empty").describe("Title of the todo"),
  description: z.string().optional().describe("Optional description for the todo"),
  isCompleted: z.boolean().default(false).describe("Completion status of the todo item"),
});

// Automatically infer static TypeScript type from runtime schema
export type Todo = z.infer<typeof todoValidationSchema>;
```

### 2. Controller Layer (`src/app/todo/controller.ts`)
```typescript
import type { Request, Response } from "express";
import { todoValidationSchema, type Todo } from "../../validation/todo.schema.js";

class TodoController {
  // Encapsulated in-memory database store
  private _db: Todo[];

  constructor() {
    this._db = [];
  }

  /**
   * GET /todos - Returns all stored todo items
   */
  public handleGetAllTodos(req: Request, res: Response) {
    const todos = this._db;
    return res.status(200).json({ todos });
  }

  /**
   * POST /todos - Validates payload and stores a new todo item
   */
  public async handleInsertTodo(req: Request, res: Response) {
    try {
      const unvalidatedPayload = req.body;
      
      // Execute Zod async validation
      const validationResult = await todoValidationSchema.parseAsync(unvalidatedPayload);
      
      // Save validated entity to database
      this._db.push(validationResult);
      
      return res.status(201).json({ todo: validationResult });
    } catch (error) {
      return res.status(400).json({ 
        message: "Validation failed", 
        error 
      });
    }
  }
}

export default TodoController;
```

### 3. Router Layer (`src/app/todo/routes.ts`)
```typescript
import { Router } from "express";
import TodoController from "./controller.js";

const router = Router();
const controller = new TodoController();

// Map HTTP routes to controller methods
// Use .bind(controller) to preserve the class instance context for 'this'
router.get("/", controller.handleGetAllTodos.bind(controller));
router.post("/", controller.handleInsertTodo.bind(controller));

export default router;
```

> [!NOTE]
> **Why `.bind(controller)`?** In JavaScript, when a class method is passed as a callback into Express routing (e.g. `router.get('/', controller.handleGetAllTodos)`), the method loses its `this` execution context when called by Express. Binding the instance (`.bind(controller)`) ensures `this._db` remains accessible inside the controller.

### 4. Application Factory (`src/app/index.ts`)
```typescript
import express from "express";
import type { Application } from "express";
import todoRouter from "./todo/routes.js";

export function createServerApplication(): Application {
  const app = express();

  // Core global middleware
  app.use(express.json());

  // Mount domain sub-routers
  app.use("/todos", todoRouter);

  return app;
}
```

### 5. Server Entry Point (`src/index.ts`)
```typescript
import http from "node:http";
import { env } from "./env.js";
import { createServerApplication } from "./app/index.js";

async function main() {
  try {
    // Wrap Express application inside Node HTTP server
    const server = http.createServer(createServerApplication());
    const PORT: number = env.PORT ? +env.PORT : 8080;

    server.listen(PORT, () => {
      console.log(`🚀 Server is running smoothly on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

main();
```

---

### 💡 Deep Dive: Why Wrap Express in `http.createServer(app)` vs `app.listen()`?

A common question is: *“Can't we just call `app.listen(8080)` directly on the Express app?”*

**Yes, you can!** Under the hood, Express's `app.listen()` is literally just a shortcut for `http.createServer(this).listen()`:
```javascript
// Inside Express internal source code:
app.listen = function() {
  const server = http.createServer(this);
  return server.listen.apply(server, arguments);
};
```

However, in **production and enterprise architectures**, explicitly separating the Express app from the Node HTTP server wrapper provides **5 critical advantages**:

1. **🔌 WebSocket & Socket.io Integration**:
   WebSockets require access to the underlying raw HTTP server instance to handle HTTP connection upgrade handshakes (`const io = new Server(server)`). If you only have `app`, attaching WebSocket servers is much messier.
2. **🔒 Seamless HTTPS & HTTP/2 Support**:
   Switching from HTTP to HTTPS or HTTP/2 is a single-line change using `https.createServer({ key, cert }, app)` without altering any Express routing or middleware logic.
3. **🧪 Fast Integration Testing (`supertest`)**:
   `createServerApplication()` in `src/app/index.ts` creates the pure Express application without binding to any physical network port. Test suites (`supertest(app)`) can make virtual HTTP requests in memory without port collisions.
4. **🛑 Production Graceful Shutdowns**:
   In containerized production environments (Docker / Kubernetes), the OS sends a `SIGTERM` signal. Having direct access to `server` allows graceful connection draining (`server.close()`) so inflight requests finish before the container terminates.
5. **🧱 Strict Separation of Concerns**:
   - `src/app/index.ts` focuses strictly on routing, middlewares, and business logic.
   - `src/index.ts` focuses strictly on network infrastructure, port listening, and environment configuration.

| Approach | Syntax | Ideal Use Case |
|---|---|---|
| **Direct Express** | `app.listen(8080)` | Quick scripts, tutorials, and simple standalone REST APIs. |
| **Node.js HTTP Wrapper** | `http.createServer(app).listen(8080)` | **Production backends**, WebSockets (`socket.io`), HTTPS/HTTP2, clean test suites (`supertest`), and graceful shutdown handling. |

---

## 🛠️ 8. Developer Tooling & VS Code Snippets

Creating custom VS Code snippets speeds up backend development and standardizes code structure across team members.

### Custom Region Snippet (`.vscode/typescriptreact.code-snippets`)
```json
{
  "Region": {
    "prefix": "reg",
    "scope": "javascript, typescript, javascriptreact, typescriptreact",
    "body": [
      "//#region  //*=========== ${1:Section Name} ===========",
      "${TM_SELECTED_TEXT}$0",
      "//#endregion  //*======== ${1:Section Name} ==========="
    ],
    "description": "Create a collapsible code region block"
  }
}
```

### Generating `.gitignore` for Node.js
```bash
# Generate comprehensive Node.js .gitignore via npx
npx gitignore node
```
This automatically prevents committing heavy artifacts:
- `node_modules/`
- `dist/`
- `.env` / `.env.local`
- `npm-debug.log*`

---

## 🎯 9. Summary & Class 02 Revision Checklist

- [ ] **Raw Server vs Express**: Understand stream chunking (`req.on('data')`) vs Express middleware automation (`express.json()`).
- [ ] **Package Management**: Master `dependencies` vs `devDependencies` and the purpose of `package-lock.json`.
- [ ] **TypeScript Setup**: Understand `rootDir` (`src`), `outDir` (`dist`), `module: nodenext`, and `tsc-watch`.
- [ ] **Runtime Validation**: Use Zod to validate `process.env` and incoming HTTP request payloads, leveraging `z.infer<typeof schema>`.
- [ ] **Modular Separation**: Decouple `index.ts` (listener), `app/index.ts` (factory), `routes.ts` (paths), `controller.ts` (logic), and `schema.ts` (types & validation).
- [ ] **Method Binding**: Remember `.bind(controller)` when passing class methods to Express routers.
