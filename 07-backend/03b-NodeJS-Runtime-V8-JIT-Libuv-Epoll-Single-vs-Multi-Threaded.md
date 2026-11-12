# Node.js Runtime: Mermaid Diagrams & Deep-Dive Extras

> **How the three Node.js runtime notes fit together**
> - [03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md): **the main study note.** Concepts, whiteboard diagrams, thread pool size, workers and interview Q&A.
> - **This file (03b):** Mermaid versions of the diagrams, plus the extra details that are not in 03a (full 6-phase loop, poll-phase decision flow, epoll internals, thread-pool routing, process-level threads).
> - [03-NodeJS-Internals-Event-Loop-Libuv-Threadpool.md](03-NodeJS-Internals-Event-Loop-Libuv-Threadpool.md): practical use cases, hands-on labs and graceful shutdown.

---

## 1. Big Picture: V8 + libuv + OS

Explained in [03a, Part 1](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#part-1-nodejs-javascript-libuv-and-jit) and [Part 2](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#part-2-v8--libuv-the-event-loop-and-the-callback-queue).

```mermaid
flowchart LR
    subgraph NODE["Node.js"]
        direction LR
        subgraph V8["V8 JS Engine (single thread)"]
            CS["Call Stack<br/>(GEC at the bottom)"]
            HEAP["Memory Heap"]
            GC["Garbage Collector"]
            HEAP <--> GC
        end
        subgraph LIBUV["libuv (C library)"]
            EL["Event Loop"]
            CQ["Callback Queues"]
            TP["Thread Pool<br/>4 threads by default"]
        end
        V8 -- "offloads async work" --> LIBUV
    end
    subgraph OS["Operating System"]
        F["File system"]
        N["Network / sockets"]
        T["Timers"]
        M["... more"]
    end
    LIBUV <--> OS
```

> ⚠️ libuv doesn't execute the callbacks in the queue. It only *delivers* them. The JS callback itself always runs on V8's single thread.

---

## 2. V8 Pipeline: Parsing → AST → Ignition → Turbofan

Explained in [03a, 1.5–1.6](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#15-how-v8-runs-code-interpreted-compiled-or-both-jit).

```mermaid
flowchart TD
    CODE["📄 JS source code"] --> LEX
    subgraph PARSE["A. PARSING"]
        LEX["1. Lexical analysis (tokenization)<br/>code → tokens"] --> SYN["2. Syntax analysis (parsing)<br/>tokens → AST"]
    end
    SYN --> AST["🌳 AST (Abstract Syntax Tree)"]
    AST --> IGN["Ignition (Interpreter)"]
    IGN --> BC["Bytecode"]
    BC --> EXEC(["⚙️ EXECUTION"])
    IGN -- "HOT code<br/>(called again and again)" --> TF["Turbofan (Optimising compiler)<br/>makes assumptions"]
    TF --> OPT["Optimised machine code"]
    OPT --> EXEC
    OPT -. "assumption broken → de-optimise" .-> IGN
```

- 💡 **Practical takeaway:** keep function argument types consistent so V8 can optimise and keep the optimised code.
- Turbofan takes the **hot bytecode plus the type feedback** that Ignition collected.
- Modern V8 has a middle tier called **Sparkplug** (a quick baseline compiler) between Ignition and Turbofan.

---

## 3. The Event Loop

Explained in [03a, Part 3](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#part-3-the-event-loop-phases), including the worked example.

### 3.1 All six phases, in order

```mermaid
flowchart TD
    START(["Top-level code finished<br/>Call stack empty"]) --> MT0
    MT0["Inner circle:<br/>1. process.nextTick()<br/>2. Promise callbacks"] --> TIMERS
    TIMERS["1. TIMERS<br/>setTimeout / setInterval"] --> PEND
    PEND["2. PENDING CALLBACKS<br/>deferred I/O callbacks<br/>(retries, some system errors)"] --> IDLE
    IDLE["3. IDLE / PREPARE<br/>libuv internal housekeeping"] --> POLL
    POLL["4. POLL<br/>I/O callbacks: incoming connections,<br/>data, fs, crypto, http.get"] --> CHECK
    CHECK["5. CHECK<br/>setImmediate"] --> CLOSE
    CLOSE["6. CLOSE CALLBACKS<br/>socket.on('close')"] --> TIMERS
```

Between **every** phase (and in modern Node, after **every callback**) the inner circle is drained: `process.nextTick()` first, then Promise callbacks.

### 3.2 What the loop does inside the poll phase

```mermaid
flowchart TD
    P["Enter POLL phase"] --> Q{"Any I/O callbacks<br/>ready in the queue?"}
    Q -- "Yes" --> RUN["Run them (until queue empty or system limit)"] --> Q
    Q -- "No" --> I{"Is setImmediate()<br/>scheduled?"}
    I -- "Yes" --> CHK["Do NOT wait → move to CHECK phase"]
    I -- "No" --> T{"Any timers<br/>pending?"}
    T -- "Yes" --> W["WAIT in poll until the NEAREST timer is due<br/>(or until the OS reports new I/O)"] --> TIM["Loop back to TIMERS"]
    T -- "No" --> W2["WAIT for I/O indefinitely<br/>(or exit if there is no work left at all)"]
```

When nothing is left to do, the loop does **not** spin the CPU. It parks in poll and lets the OS (epoll/kqueue) wake it up.

### 3.3 Ordering caveat for the worked example

The order of **`Timer expired` vs `setImmediate` at top level** is **not guaranteed**. It depends on whether 1 ms has elapsed when the loop starts, so it can flip between runs. **Inside an I/O callback**, `setImmediate` always runs before `setTimeout(…, 0)`, because CHECK comes right after POLL while TIMERS is the next iteration. The exact timing of `File Reading CB` also depends on how fast the disk read finishes.

---

## 4. libuv ↔ OS: epoll, kqueue, IOCP

Explained in [03a, 4.1](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#41-libuv-talks-to-the-os-through-epoll--kqueue).

```mermaid
flowchart LR
    L["libuv (written in C)"] <-- "register fds / get ready events" --> OSN
    subgraph OSN["OS: scalable I/O event notification mechanism"]
        E["epoll → Linux"]
        K["kqueue → macOS / BSD"]
        W["IOCP → Windows"]
    end
```

- libuv hides the three mechanisms behind one API.
- **fds (file/socket descriptors):** to the OS, every open socket or file is just an integer handle. libuv says *"tell me when **these** descriptors become readable/writable"*, so **one thread can watch thousands of connections** without a thread per connection.
- **What data structure is behind epoll?** Inside the Linux kernel an epoll instance keeps:
  - an **interest list**: a **red-black tree** of every fd being watched (fast add/remove/lookup), and
  - a **ready list**: a **linked list** of fds that have events right now. `epoll_wait()` just hands you this list, so it doesn't scan every connection each time.
- **Related topics:** EventEmitter → [13-NodeJS-EventEmitter-Architecture-Event-Driven-Design.md](13-NodeJS-EventEmitter-Architecture-Event-Driven-Design.md) · Streams & Buffers → [14-NodeJS-Buffer-Architecture-Binary-Data-Encoding.md](14-NodeJS-Buffer-Architecture-Binary-Data-Encoding.md)

---

## 5. Who Gets the Thread Pool and Who Doesn't

Pool size and behaviour are in [03a, 4.2](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#42-the-thread-pool).

```mermaid
flowchart TD
    JS["Your JS (main thread)"] --> LU["libuv"]
    LU --> D{"What kind of work?"}
    D -- "File system (fs)<br/>Crypto (pbkdf2, scrypt, bcrypt)<br/>zlib compression<br/>dns.lookup" --> TPOOL
    D -- "Network sockets / HTTP / TCP<br/>(incoming connections, data)" --> KERNEL["OS kernel via epoll / kqueue / IOCP<br/>(no thread pool)"]
    D -- "Timers" --> HEAP["libuv timer min-heap<br/>(no thread pool)"]
    subgraph TPOOL["Thread Pool (4 threads)"]
        T1["Thread 1"]
        T2["Thread 2"]
        T3["Thread 3"]
        T4["Thread 4"]
    end
    TPOOL --> CB["Result → callback queue"]
    KERNEL --> CB
    HEAP --> CB
    CB --> EL["Event loop → main thread runs callback"]
```

> ⚠️ Only **fs, crypto, zlib and `dns.lookup`** use the pool. **Network I/O does not**; it uses epoll/kqueue/IOCP. Timers don't use it either. That is why one Node process can serve thousands of connections with only 4 pool threads.

---

## 6. Single-Threaded or Multi-Threaded? The Process-Level View

Short answer in [03a, 4.3](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#43-is-nodejs-single-threaded-or-multi-threaded) and [Part 5, Q1](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#q1-is-nodejs-single-threaded).

| Context | Answer | Why |
| :--- | :--- | :--- |
| **Running your JavaScript** (sync code on the call stack) | **Single-threaded** | One V8 call stack. Only one line of JS runs at a time. |
| **Doing async work** (fs, crypto, zlib, dns) | **Multi-threaded** | libuv's thread pool has 4 threads working in the background. |
| **The Node process as a whole** | **Multi-threaded** | Main thread + libuv pool + V8's own helper threads (GC, compilation). |

```mermaid
flowchart LR
    subgraph PROC["One Node.js process"]
        MAIN["Main thread<br/>V8 + event loop<br/>(all your JS runs here)"]
        subgraph POOLX["libuv thread pool"]
            A["T1"]
            B["T2"]
            C["T3"]
            D["T4"]
        end
        V8H["V8 helper threads<br/>(GC, JIT compilation)"]
    end
    MAIN -- "offload fs / crypto / zlib / dns" --> POOLX
    POOLX -- "callback queued" --> MAIN
```

---

## 7. Worker Threads: One V8 Isolate + Event Loop per Thread

Explained in [03a, 4.5](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#45-if-v8-is-single-threaded-where-do-worker-threads-come-from). Code and communication details are in [03a, Part 5](03a-NodeJS-Runtime-Core-Concepts-With-Whiteboards.md#part-5-interview-questions-threads-concurrency-and-workers).

```mermaid
flowchart TD
    subgraph PROC["One Node.js process"]
        subgraph M["Main thread"]
            V1["V8 isolate #1<br/>call stack + heap"] --- E1["Event loop #1"]
        end
        subgraph W1["Worker thread 1"]
            V2["V8 isolate #2<br/>call stack + heap"] --- E2["Event loop #2"]
        end
        subgraph W2["Worker thread 2"]
            V3["V8 isolate #3<br/>call stack + heap"] --- E3["Event loop #3"]
        end
        POOL["libuv thread pool (4 threads)<br/>shared: fs / crypto / zlib / dns"]
    end
    M -- "postMessage (copied)" --> W1
    M -- "postMessage (copied)" --> W2
    M -.-> POOL
    W1 -.-> POOL
    W2 -.-> POOL
```

---

## 8. Quick Revision Cheat-Sheet

| Topic | Remember |
| :--- | :--- |
| Node.js | Event-driven, asynchronous I/O runtime |
| Formula | **Node = V8 + libuv + C++ bindings** |
| JavaScript | Synchronous, single-threaded. No built-in timers/files/HTTP. |
| Browser equivalent of libuv | Web APIs |
| V8 pipeline | Source → tokens → **AST** → **Ignition** (bytecode) → hot → **Turbofan** (machine code) ⟲ de-optimise |
| JS execution model | **JIT** = interpreter + compiler |
| Libuv contains | Event loop, callback queues, thread pool (4), OS interface |
| OS mechanisms | epoll (Linux), kqueue (macOS), IOCP (Windows) |
| 1 event loop cycle | = 1 **tick** |
| Phase order | Timers → Pending callbacks → Idle/Prepare → **Poll** → **Check** → Close |
| Inner queues | `process.nextTick()` **then** promise callbacks, between phases |
| Idle behaviour | Loop parks in **poll**; if `setImmediate` is queued → **check** next; else waits for the **nearest** timer |
| Thread pool | 4 threads by default (`UV_THREADPOOL_SIZE`, max 1024); fs, crypto, zlib, dns.lookup only |
| Network I/O | Not on the thread pool; OS notifies via epoll/kqueue |
| Single vs multi | JS = single thread · Node process = multi-threaded |
| More JS parallelism | `worker_threads` (CPU-heavy JS) · `cluster` (all cores) · `child_process` (other programs) |
