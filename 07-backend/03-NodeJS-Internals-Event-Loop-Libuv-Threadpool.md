# Node.js Internals: Event Loop, Libuv, Threadpool & Asynchronous Architecture
## Comprehensive Technical Guide to Node.js Concurrency, Execution Lifecycle & Performance Tuning

---

## 📌 Executive Summary

- **The Node.js Formula**: $\text{Node.js} = \text{Google V8 Engine (C++)} + \text{C/C++ Core Bindings} + \text{Libuv (Event Loop \& Threadpool)}$.
- **Core JavaScript vs Host Environments**: Pure JavaScript (ECMAScript) provides syntax, data structures, and arithmetic. It has no native concept of timers (`setTimeout`), network sockets (`fetch`, `http`), or disk files (`fs`). Browsers supply these via **Web APIs**, while Node.js supplies them via **OS-level C++ Bindings & Libuv**.
- **Process Execution Lifecycle**: Every `node script.js` command initializes a process and executes in strict sequential stages:
  1. **Module Resolution & Static Imports**: Hoisted and linked into module memory before code execution.
  2. **Top-Level Synchronous Code**: Executes sequentially on the single-threaded **Main Call Stack**.
  3. **Event Callback Registration**: Timers, I/O callbacks, and signal listeners are registered.
  4. **Event Loop Launch**: If active handles or async requests exist, the event loop begins cycling through its phases until all work is resolved.
- **Simplified Event Loop Model**:
  - 🕒 **1. Timers**: Runs expired `setTimeout()` and `setInterval()` callbacks.
  - 📥 **2. I/O & Polling**: Waits for and handles file system reads, network responses, and database queries.
  - ⚡ **3. Check (`setImmediate`)**: Executes callbacks immediately after I/O polling completes.
  - 🚪 **4. Close Callbacks**: Handles teardown events (e.g., `socket.on('close')`).
  - 🚀 **Microtasks (`process.nextTick` & Promises)**: Fast-track VIP queues that execute *immediately* the instant the current JavaScript operation finishes.
- **Libuv Worker Thread Pool**: Heavy synchronous/blocking operations (Cryptography, File I/O, Compression, DNS lookups) are automatically offloaded to a pool of background worker threads (default: **4 threads**, configurable via `UV_THREADPOOL_SIZE`).

---

## 🧠 Core Analogies

- **Node.js Concurrency as a High-Speed Bank Branch**:
  - **Main Thread (The Event Loop)**: A single, ultra-fast bank teller at the front counter. The teller accepts customer requests, stamps paperwork, hands back receipts, and never sits idle waiting.
  - **Libuv Worker Thread Pool**: A team of 4 back-office clerks inside the records vault. When a customer needs a heavy property deed verified or gold purity tested (heavy crypto/file I/O), the teller hands the file to a back-office clerk and immediately assists the next customer in line. When the clerk finishes, the teller delivers the final result.
- **Microtasks vs Macro-tasks as Airline Boarding**:
  - **`process.nextTick()`**: A passenger with an emergency medical VIP escort who boards *immediately* before any other group moves.
  - **`Promise.then()`**: First-class priority boarding called immediately after VIPs.
  - **`setImmediate()`**: Standard boarding for the very next open gate right after baggage drop-off (Poll Phase).
  - **`setTimeout(fn, 0)`**: Scheduled departure boarding called once the countdown clock strikes zero (Timers Phase).

---

## 🏛️ 1. Node.js Architectural Anatomy

Node.js executes JavaScript on a single thread while delegating asynchronous, I/O-intensive, and CPU-heavy operations to the underlying operating system kernel or background C threads.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NODE.JS ARCHITECTURE                          │
├────────────────────────────────────────────────────────────────────────┤
│                       JavaScript Application Code                      │
│                  (index.js, Controllers, Modules)                      │
├────────────────────────────────────────────────────────────────────────┤
│                    Node.js Core Standard Library                       │
│              (node:fs, node:crypto, node:http, node:net)               │
├────────────────────────────────────────────────────────────────────────┤
│                       C / C++ Bindings Layer                           │
│                   (Node-API, V8 Wrapper Bridges)                       │
├───────────────────────────────────┬────────────────────────────────────┤
│         GOOGLE V8 ENGINE          │               LIBUV                │
│  • Compiles JS to Machine Code    │  • Event Loop (Single Thread)      │
│  • Call Stack Execution           │  • Worker Thread Pool (4 Threads)  │
│  • Memory Heap & GC Management    │  • Non-blocking Async OS I/O       │
│  • Microtask Queue Handling       │  • Cross-Platform Event Notifiers  │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 🔄 2. Simplified Event Loop: The 4-Phase Mental Model

Instead of getting bogged down in low-level OS internals, the Node.js Event Loop can be mastered using a straightforward **4-Phase Cycle** plus the **Microtask Fast-Track**:

```
                              ┌───────────────────────────┐
                              │    JavaScript Call Stack  │
                              │   (Top-Level Code / Sync) │
                              └─────────────┬─────────────┘
                                            │
                                            ▼
                             ┌─────────────────────────────┐
                    ┌───────▶│    MICROTASK FAST-TRACK     │
                    │        │  1. process.nextTick()      │
                    │        │  2. Promise.then() / await  │
                    │        └──────────────┬──────────────┘
                    │                       │
                    │                       ▼
                    │        ┌─────────────────────────────┐
                    │        │   PHASE 1: TIMERS           │
                    │        │   setTimeout, setInterval   │
                    │        └──────────────┬──────────────┘
                    │                       │
                    │                       ▼
                    │        ┌─────────────────────────────┐
                    │        │   PHASE 2: I/O & POLLING    │
                    │        │   fs.readFile, HTTP, DB     │
                    │        └──────────────┬──────────────┘
                    │                       │
                    │                       ▼
                    │        ┌─────────────────────────────┐
                    │        │   PHASE 3: CHECK            │
                    │        │   setImmediate() callbacks  │
                    │        └──────────────┬──────────────┘
                    │                       │
                    │                       ▼
                    │        ┌─────────────────────────────┐
                    │        │   PHASE 4: CLOSE CALLBACKS  │
                    │        │   socket.on('close', ...)   │
                    │        └──────────────┬──────────────┘
                    │                       │
                    └───────────────────────┘
                                 (Repeat if active handles remain)
```

### The 4 Core Phases Explained:

1. 🕒 **Phase 1: Timers (`setTimeout`, `setInterval`)**:
   - The loop checks its internal timer min-heap.
   - If the clock has passed the threshold for a timer, its callback function is moved to the call stack and executed.
2. 📥 **Phase 2: I/O & Polling (`fs`, network sockets, database queries)**:
   - Node checks if any background I/O operations (file reading, incoming HTTP request, TCP payload) have finished.
   - If events are ready, their callbacks execute.
   - If no callbacks are waiting and no `setImmediate` is scheduled, Node can safely pause (block) here and wait for the OS to signal incoming network traffic or timer expirations.
3. ⚡ **Phase 3: Check (`setImmediate`)**:
   - Runs callbacks scheduled with `setImmediate()`.
   - **Crucial Rule**: Because this phase sits immediately after Phase 2 (I/O), any `setImmediate()` scheduled inside an I/O callback is **guaranteed to run before any new timers on the next tick**.
4. 🚪 **Phase 4: Close Callbacks (`socket.on('close')`, `server.close()`)**:
   - Executes teardown and cleanup logic when sockets or file handles terminate abruptly.

---

## 🚀 3. Microtasks: The VIP Fast-Track

Microtasks are **not** part of the Libuv phases. They are managed directly by Node.js/V8 and run **immediately whenever the current JavaScript operation finishes, before moving to the next phase**.

```
┌─────────────────────────────────────────────────────────────┐
│                   EXECUTION ORDER PRIORITY                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Current Synchronous Call Stack (Active function)         │
│ 2. `process.nextTick()` Queue (Highest priority async)      │
│ 3. `Promise.then()` / `queueMicrotask()` Queue              │
│ 4. Current / Next Event Loop Phase (Timers, Poll, Check)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 💼 4. Practical Real-World Use Cases

Here is when and why senior backend engineers choose specific asynchronous primitives, the thread pool, and process controls:

---

### 1. Practical Use Cases for `process.nextTick()`

`process.nextTick()` schedules a callback to run **immediately after the current synchronous code completes**, before the Event Loop proceeds to any other phase or handles any I/O.

#### Use Case A: Emitting Events Safely in Constructors
When creating an `EventEmitter` subclass, you cannot emit events synchronously in the constructor because the calling code has not had a chance to attach `.on('event')` listeners yet!

```typescript
import { EventEmitter } from 'node:events';

class DatabaseConnector extends EventEmitter {
  constructor() {
    super();
    // Schedule emission for the next tick after constructor finishes
    process.nextTick(() => {
      this.emit('connected', { host: 'localhost', port: 5432 });
    });
  }
}

// Consumer code:
const db = new DatabaseConnector();

// This listener is attached AFTER the constructor runs,
// but BEFORE the nextTick fires — so it NEVER misses the event!
db.on('connected', (info) => {
  console.log('✅ Connected successfully to:', info.host);
});
```

#### Use Case B: Ensuring Synchronous Functions Always Behave Asynchronously (Defending Against Zalgo)
If a function returns a cached result synchronously in some cases and asynchronously in others, it causes unpredictable race conditions. `process.nextTick()` guarantees a consistent asynchronous contract:

```typescript
function getUserData(userId: string, callback: (data: string) => void) {
  if (cache.has(userId)) {
    // ❌ BAD: callback(cache.get(userId)); // Synchronous unpredictable execution!
    // ✅ GOOD: Guarantees async execution even for cache hits
    process.nextTick(() => callback(cache.get(userId)!));
    return;
  }
  db.fetch(userId, callback);
}
```

---

### 2. Practical Use Cases for `setImmediate()`

`setImmediate()` schedules a callback to run in the **Check Phase** of the Event Loop, immediately after I/O events are polled.

#### Use Case A: Breaking Up Heavy CPU Computations (Preventing Loop Starvation)
If you have a CPU-intensive loop (e.g., parsing 500,000 records), running it in a single synchronous loop freezes the server and blocks all incoming HTTP requests. Using `setImmediate()` yields control back to the event loop between batches:

```typescript
function processLargeDataset(items: string[], index = 0) {
  const BATCH_SIZE = 1000;
  const end = Math.min(index + BATCH_SIZE, items.length);

  for (let i = index; i < end; i++) {
    // Process single record
  }

  if (end < items.length) {
    // Yield control back to event loop to handle incoming HTTP requests, then resume!
    setImmediate(() => processLargeDataset(items, end));
  } else {
    console.log('🎉 Processing Complete!');
  }
}
```

#### Use Case B: Running Logic Post-I/O with Guaranteed Order
When reading multiple files or handling socket payloads, `setImmediate()` guarantees execution right after the I/O completes, before any new timers fire.

---

### 3. Practical Use Cases for `setTimeout()`

#### Use Case A: Request Timeouts & SLA Deadlines
Enforce strict SLA deadlines on slow database queries or upstream microservice calls using `AbortController` and `setTimeout`:

```typescript
async function fetchWithTimeout(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer); // Clean up timer if fetch completes in time
  }
}
```

#### Use Case B: Exponential Backoff & Retry Mechanisms
When an upstream service fails (HTTP 503), delay the retry attempt with increasing intervals to avoid overwhelming the server:

```typescript
async function retryOperation(fn: () => Promise<any>, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryOperation(fn, retries - 1, delay * 2);
  }
}
```

---

### 4. Practical Use Cases for the Libuv Thread Pool

The **Worker Thread Pool** executes blocking OS tasks without stalling the main JavaScript Event Loop.

```
┌─────────────────────────────────────────────────────────────┐
│                LIBUV THREAD POOL WORKLOADS                  │
├──────────────────────┬──────────────────────────────────────┤
│ Workload Category    │ Node.js Built-in APIs                │
├──────────────────────┼──────────────────────────────────────┤
│ 1. Cryptography      │ `crypto.pbkdf2`, `crypto.scrypt`,    │
│                      │ `crypto.randomBytes`, `bcrypt`       │
├──────────────────────┼──────────────────────────────────────┤
│ 2. File System I/O   │ `fs.readFile`, `fs.writeFile`,       │
│                      │ `fs.stat`, `fs.readdir`              │
├──────────────────────┼──────────────────────────────────────┤
│ 3. Data Compression  │ `zlib.gzip`, `zlib.deflate`,         │
│                      │ `zlib.brotliCompress`                │
├──────────────────────┼──────────────────────────────────────┤
│ 4. DNS Resolution    │ `dns.lookup` (POSIX getaddrinfo)     │
└──────────────────────┴──────────────────────────────────────┘
```

#### Production Tuning: `UV_THREADPOOL_SIZE`
By default, Libuv allocates **4 worker threads**. On a high-traffic server handling thousands of password hashes or image compressions per second, the default 4 threads will saturate, causing massive queue latency.

```bash
# Set thread pool size in production environment (e.g. 16-core CPU server)
UV_THREADPOOL_SIZE=16 node dist/index.js
```

---

### 5. Practical Use Cases for `process.exit()`

`process.exit([code])` explicitly terminates the Node.js runtime process.

```
┌──────────────────────────────────────────────────────────────┐
│                    PROCESS EXIT CODES                        │
├──────────────┬──────────┬────────────────────────────────────┤
│ Exit Code    │ Status   │ Standard Meaning                   │
├──────────────┼──────────┼────────────────────────────────────┤
│ `exit(0)`    │ Success  │ Process completed without errors   │
│ `exit(1)`    │ Failure  │ Uncaught fatal error or validation │
│ `exit(130)`  │ Termined │ Process terminated via SIGINT      │
└──────────────┴──────────┴────────────────────────────────────┘
```

#### Use Case A: Fail-Fast on Startup Configuration Errors (`exit(1)`)
If database credentials or required environment variables are missing, terminate immediately rather than running in an invalid, vulnerable state:

```typescript
import { env } from './env.js';

if (!env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL is missing. Shutting down.');
  process.exit(1); // Non-zero exit code tells Docker/Kubernetes the container crashed
}
```

#### Use Case B: Clean Database Migration Scripts (`exit(0)`)
In automated CI/CD pipelines, once database migrations finish running, exit with success code `0` so the deployment pipeline can advance:

```typescript
async function runMigrations() {
  try {
    await db.migrate.latest();
    console.log('✅ Migrations applied successfully.');
    process.exit(0); // Clean success exit
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}
```

#### Use Case C: Graceful Shutdown Finalization
After handling `SIGTERM` and draining all active HTTP connections, call `process.exit(0)` to finalize container termination.

---

## 🧪 5. Complete Hands-on Code Laboratory & Behavior Analysis

---

### 📄 Lab 1: `1-one.js` — Top-Level Code vs Timers
```javascript
// 1-one.js
import fs from 'fs';

setTimeout(() => console.log('Hello from Timer'), 0);

console.log('Hello from Top Level Code');
```

#### 🖥️ Output:
```text
Hello from Top Level Code
Hello from Timer
```

#### 🔍 Execution Flow & Lifecycle Trace:
1. **Phase 0 (Module Loading & Linking)**: Node scans `import fs from 'fs'`. The ES module loader fetches the built-in `node:fs` module, binds export references, and instantiates the module environment before any executable code runs.
2. **Phase 1 (Synchronous Top-Level Execution)**:
   - `setTimeout(..., 0)` registers a timer in Libuv's min-heap with a 0ms (clamped to 1ms) expiration.
   - `console.log('Hello from Top Level Code')` executes **synchronously on the Call Stack** $\to$ logs `'Hello from Top Level Code'`.
3. **Phase 2 (Event Loop Entry)**:
   - Call Stack is empty. Node starts the **Libuv Event Loop**.
   - **Timers Phase (Phase 1)**: Detects the expired timer and invokes the callback $\to$ logs `'Hello from Timer'`.
4. **Process Exit**: No active handles remain $\to$ process terminates.

---

### 📄 Lab 2: `2-two.js` — Timers vs `setImmediate` with Top-Level Log
```javascript
// 2-two.js
import fs from 'fs';

setTimeout(() => console.log('Hello from Timer'), 0);
setImmediate(() => console.log('Hello from Immediate'), 0);

console.log('Hello from Top Level Code');
```

#### 🖥️ Output:
```text
Hello from Top Level Code
Hello from Timer
Hello from Immediate
```

#### 🔍 Execution Flow & Lifecycle Trace:
1. **Phase 0 (Module Resolution)**: `import fs from 'fs'` is parsed, resolved, and bound.
2. **Phase 1 (Call Stack)**:
   - `setTimeout` registers callback in **Timers Queue**.
   - `setImmediate` registers callback in **Check Queue**.
   - `console.log('Hello from Top Level Code')` executes on the Main Thread Call Stack $\to$ logs `'Hello from Top Level Code'`.
3. **Phase 2 (Event Loop Entry)**:
   - The synchronous log took a fraction of a millisecond to format and write to stdout, allowing the 1ms timer threshold to elapse.
   - **Timers Phase**: Timer is already expired $\to$ logs `'Hello from Timer'`.
   - **Check Phase**: Executes `setImmediate` callback $\to$ logs `'Hello from Immediate'`.

---

### 📄 Lab 3: `3-three.js` — Adding Asynchronous File I/O (`fs.readFile`)
```javascript
// 3-three.js
import fs from 'fs';

setTimeout(() => console.log('Hello from Timer'), 0);
setImmediate(() => console.log('Hello from Immediate'), 0);

fs.readFile('sample.txt', 'utf-8', function (err, data) {
  console.log(`File Reading Complete...`);
});

console.log('Hello from Top Level Code');
```

#### 🖥️ Output:
```text
Hello from Top Level Code
Hello from Timer
Hello from Immediate
File Reading Complete...
```

#### 🔍 Execution Flow & Lifecycle Trace:
1. **Phase 0 (Module Resolution)**: `fs` module is imported and bound.
2. **Phase 1 (Call Stack)**:
   - `setTimeout` $\to$ Timers Queue.
   - `setImmediate` $\to$ Check Queue.
   - `fs.readFile` delegates file reading to a background **Libuv Worker Thread**.
   - Synchronous log executes $\to$ `'Hello from Top Level Code'`.
3. **Phase 2 (Event Loop - Tick 1)**:
   - **Timers Phase**: Runs expired timer $\to$ logs `'Hello from Timer'`.
   - **Poll Phase**: File reading is still in progress inside worker thread pool $\to$ no I/O callback ready yet.
   - **Check Phase**: Runs `setImmediate` callback $\to$ logs `'Hello from Immediate'`.
4. **Phase 3 (Event Loop - Tick 2)**:
   - Worker thread completes file read and pushes callback to Poll Queue.
   - **Poll Phase**: Invokes `fs.readFile` callback $\to$ logs `'File Reading Complete...'`.

---

### 📄 Lab 4: `4-four.js` — Nested Callbacks inside I/O Phase (Deterministic Behavior)
```javascript
// 4-four.js
import fs from 'fs';

setTimeout(() => console.log('Hello from Timer'), 0);
setImmediate(() => console.log('Hello from Immediate'), 0);

fs.readFile('sample.txt', 'utf-8', function (err, data) {
  console.log(`File Reading Complete...`);

  setTimeout(() => console.log('Time 2'), 0);
  setTimeout(() => console.log('Time 3'), 0);
  setImmediate(() => console.log('Immediate 2'), 0);
});

console.log('Hello from Top Level Code');
```

#### 🖥️ Output:
```text
Hello from Top Level Code
Hello from Timer
Hello from Immediate
File Reading Complete...
Immediate 2
Time 2
Time 3
```

#### 🔍 Why `Immediate 2` ALWAYS Runs Before `Time 2` and `Time 3`:
- Inside `fs.readFile`, we are currently executing inside the **Poll Phase**.
- When `setImmediate` and `setTimeout` are scheduled:
  - `setImmediate` queues into the **Check Phase** of the *current loop iteration*.
  - `setTimeout` queues into the **Timers Phase** of the *next loop iteration*.
- From Poll Phase, the loop immediately transitions forward to the **Check Phase**!
- Therefore, `Immediate 2` runs immediately, while `Time 2` and `Time 3` must wait for the loop to wrap around to Phase 1 on the next tick.

---

### 📄 Lab 5: `5-five.js` — Scaling Concurrency (`UV_THREADPOOL_SIZE = 8`)
```javascript
// 5-five.js
import fs from 'fs';
import crypto from 'crypto';

const start = Date.now();

// Expand thread pool to 8 worker threads
process.env.UV_THREADPOOL_SIZE = 8;

setTimeout(() => console.log('Hello from Timer'), 0);
setImmediate(() => console.log('Hello from Immediate'), 0);

fs.readFile('sample.txt', 'utf-8', function (err, data) {
  console.log(`File Reading Complete...`);

  setTimeout(() => console.log('Time 2'), 0);
  setTimeout(() => console.log('Time 3'), 0);
  setImmediate(() => console.log('Immediate 2'), 0);

  crypto.pbkdf2('password', 'salt', 100000, 1024, 'sha256', () => {
    console.log(`Password 1 is hashed...`, Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 100000, 1024, 'sha256', () => {
    console.log(`Password 2 is hashed...`, Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 100000, 1024, 'sha256', () => {
    console.log(`Password 3 is hashed...`, Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 1000000, 1024, 'sha256', () => {
    console.log(`Password 4 is hashed...`, Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 100000, 1024, 'sha256', () => {
    console.log(`Password 5 is hashed...`, Date.now() - start);
  });
});

console.log('Hello from Top Level Code');
```

#### 🖥️ Output:
```text
Hello from Top Level Code
Hello from Timer
Hello from Immediate
File Reading Complete...
Immediate 2
Time 2
Time 3
Password 1 is hashed... 420 ms
Password 2 is hashed... 435 ms
Password 3 is hashed... 440 ms
Password 5 is hashed... 455 ms
Password 4 is hashed... 1280 ms  <-- 1M iterations took longer on its dedicated thread
```

#### 🔍 Behavioral Analysis:
With 8 worker threads allocated, all 5 password hashes execute concurrently without waiting in a backlog queue.

---

### 📄 Lab 6: `6-six.js` — Threadpool Saturation & Bottleneck (`UV_THREADPOOL_SIZE = 4`)
```javascript
// 6-six.js
import fs from 'fs';
import crypto from 'crypto';

const start = Date.now();

// Default 4 threads
process.env.UV_THREADPOOL_SIZE = 4;

setTimeout(() => console.log('Hello from Timer'), 0);
setImmediate(() => console.log('Hello from Immediate'), 0);

fs.readFile('sample.txt', 'utf-8', function (err, data) {
  console.log(`File Reading Complete...`);

  setTimeout(() => console.log('Time 2'), 0);
  setTimeout(() => console.log('Time 3'), 0);
  setImmediate(() => console.log('Immediate 2'), 0);

  crypto.pbkdf2('password', 'salt', 300000, 1024, 'sha256', () => {
    console.log('Password 1 has been hashed', Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 300000, 1024, 'sha256', () => {
    console.log('Password 2 has been hashed', Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 300000, 1024, 'sha256', () => {
    console.log('Password 3 has been hashed', Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 300000, 1024, 'sha256', () => {
    console.log('Password 4 has been hashed', Date.now() - start);
  });

  crypto.pbkdf2('password', 'salt', 300000, 1024, 'sha256', () => {
    console.log('Password 5 has been hashed', Date.now() - start);
  });
});

console.log('Hello from Top Level Code');
```

#### 🖥️ Output & Thread Analysis:
```text
Hello from Top Level Code
Hello from Timer
Hello from Immediate
File Reading Complete...
Immediate 2
Time 2
Time 3
Password 3 has been hashed 902 ms   <-- Thread 3 finished
Password 2 has been hashed 1240 ms  <-- Thread 2 finished
Password 4 has been hashed 1304 ms  <-- Thread 4 finished
Password 1 has been hashed 1403 ms  <-- Thread 1 finished
Password 5 has been hashed 2310 ms  <-- ⚠️ Thread 3 picked up Task 5 after finishing Task 3!
```

#### 🔍 Why Task 5 Took Double the Time:
Tasks 1–4 immediately saturated all 4 worker threads. Task 5 waited in the Libuv work queue until Thread 3 became free at 902ms, completing at $902\text{ms} + 1408\text{ms} \approx 2310\text{ms}$.

---

### 📄 Lab 7: `7-seven.js` — The Top-Level Race Condition (Removing `console.log`)
```javascript
// 7-seven.js
import fs from 'fs';

setTimeout(() => console.log('Hello from Timer'), 0);
setImmediate(() => console.log('Hello from Immediate'), 0);

// console.log('Hello from Top Level Code'); // <-- COMMENTED OUT!
```

#### 🖥️ Output:
```text
Hello from Immediate
Hello from Timer
```

#### 🔍 Why Omitting `console.log` Reverses Execution Order:
- **With `console.log`** (Lab 2): Formatting and writing to terminal stdout takes $> 1\text{ms}$. By the time the Event Loop starts, the 1ms timer has already expired $\to$ **Timer runs first**.
- **Without `console.log`** (Lab 7): The main thread initializes and enters the Event Loop in $< 0.2\text{ms}$. The timer has **not yet expired** when the loop checks Phase 1 (Timers), so it proceeds directly to Phase 3 (Check) $\to$ **Immediate runs first**.

---

### 📄 Lab 8: `hello.js` — Blocking Call Stack & Active Timers
```javascript
// hello.js
import fs from 'fs';

console.log('Hello from NodeJS');

fs.readFile('sample.txt', 'utf-8', (err, data) => {
  console.log('File reading complete');
});

setImmediate(() => console.log('Hello'));

setTimeout(
  // 30-Second Timer
  () => console.log('Hello from SetInterval 1'),
  30 * 1000,
);

const a = 2 + 2;
console.log('a', a);
console.log('a', a);
console.log('a', a);
console.log('a', a);
console.log('a', a);
// Simulating 10 Million Lines of Code / 50 Seconds of Heavy Sync Work
```

#### 🖥️ Output:
```text
Hello from NodeJS
a 4
a 4
a 4
a 4
a 4
Hello
File reading complete
Hello from SetInterval 1   <-- Fires after 30 seconds (or immediately after sync loop if sync took >30s)
```

#### 🔍 Key Takeaway:
Single-threaded execution guarantees that synchronous CPU work **cannot be interrupted**. Even if a 30-second timer expires during heavy synchronous loops, its callback will wait in queue until the Call Stack empties completely.

---

## 🛑 6. POSIX Process Signals & Production Graceful Shutdown

```
┌──────────────────────────────────────────────────────────────┐
│                    POSIX SIGNALS IN NODE.JS                  │
├──────────┬──────────┬────────────────────────────────────────┤
│ Signal   │ Number   │ Description & Handling                 │
├──────────┼──────────┼────────────────────────────────────────┤
│ SIGHUP   │ Signal 1 │ Terminal hangup / reload config        │
│ SIGINT   │ Signal 2 │ Interrupt from keyboard (`Ctrl + C`)   │
│ SIGQUIT  │ Signal 3 │ Quit process with core dump            │
│ SIGKILL  │ Signal 4 │ Force kill (Cannot be caught / trapped)│
│ SIGTERM  │ Signal 5 │ Graceful termination request           │
│ SIGSTOP  │ Signal 6 │ Pause execution (Cannot be caught)     │
└──────────┴──────────┴────────────────────────────────────────┘
```

### Production Graceful Shutdown Pattern
```typescript
import http from "node:http";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

server.listen(8080, () => {
  console.log("Server listening on port 8080");
});

// Graceful termination handler
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);

  // 1. Stop accepting new network connections
  server.close(() => {
    console.log("HTTP server closed.");

    // 2. Clean up resources (close database connections, flush logs)
    // await db.pool.end();
    // await redisClient.quit();

    console.log("Resource pools drained. Exiting process safely.");
    process.exit(0);
  });

  // Force exit if cleanup takes longer than 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown due to timeout.");
    process.exit(1);
  }, 10000).unref(); // .unref() ensures this timer doesn't keep loop alive
}

// Listen for termination signals
process.on("SIGINT", () => handleShutdown("SIGINT"));   // Ctrl + C
process.on("SIGTERM", () => handleShutdown("SIGTERM")); // Kubernetes / Docker stop
```

---

## 🎯 7. Summary & Quick Revision Checklist

- [ ] **Simplified Event Loop**: Timers $\to$ I/O & Polling $\to$ Check (`setImmediate`) $\to$ Close Callbacks.
- [ ] **Microtasks Fast-Track**: `process.nextTick()` and `Promise.then()` run immediately after the current operation finishes, before next loop phases.
- [ ] **`process.nextTick()` Use Cases**: Safe event emission in constructors and defending against Zalgo.
- [ ] **`setImmediate()` Use Cases**: Breaking up large CPU loops across ticks without timer delays.
- [ ] **`setTimeout()` Use Cases**: Request timeouts (`AbortController`), retry intervals, and debouncing.
- [ ] **Thread Pool Workloads**: Offloading `crypto`, `fs`, `zlib`, and `dns.lookup` to background workers.
- [ ] **Thread Pool Sizing**: Tuning `UV_THREADPOOL_SIZE` for high-concurrency production workloads.
- [ ] **`process.exit()` Guidelines**: `exit(0)` for clean success/shutdown, `exit(1)` for fatal startup failures.
- [ ] **Phase 0 Module Imports**: Static `import` statements are hoisted, resolved, and bound before synchronous code execution begins.
