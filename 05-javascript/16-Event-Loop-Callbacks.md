# The Event Loop & Callbacks
## Part 16 of 17 — How Single-Threaded JS Handles "Waiting"

---

## 📌 Executive Summary

- **JavaScript runs on a single thread — one call stack, one thing happening at a time.** So how does it "wait" for a network request without freezing the whole page? → It doesn't wait at all. It **hands the waiting off** to the host environment (file 11's Browser/Node APIs) and gets notified later.
- **A callback is just a function** passed to another function with the instruction "call this once you're done" — the original mechanism for handling "later," before Promises existed (file 17).
- Chaining several async steps with callbacks nests each one inside the previous one's callback — the deeper the chain, the harder it is to read. This is **callback hell**, and it's the exact pain Promises were built to solve.
- **`fetch` and `setTimeout` are not JS language features** — file 11 already established that distinction for the DOM; here it applies to timers and networking too. The JS engine hands the work to the host, keeps executing other code, and only runs a callback once the host reports back.
- When a `setTimeout` callback and a resolved-Promise callback are both ready to run, the **microtask queue always empties completely before the next macrotask runs** — a strict priority order that explains most "why did my async code run in this order" confusion.

---

## 🧠 Core Analogy: The Solo Barista

Picture a small coffee shop with exactly one barista on shift. That barista is the **JavaScript engine's single thread** — one set of hands, one drink at a time, working strictly in the order tickets come in.

- Anything the barista can do personally — steaming milk, pulling a shot, ringing up a sale — happens **immediately and synchronously**: one step finishes completely before the next one starts.
- Some jobs can't be done by standing at the counter — waiting for a delivery truck, waiting for a batch of beans to roast off-site. The barista doesn't stand around doing nothing; they **hand that job off** to an outside service (a courier, a roasting partner) and keep serving the next customer in line. This outside service is the **host environment** — the browser's Web APIs or Node's `libuv`, exactly as introduced in file 11.
- When the outsourced job finishes, the courier doesn't barge behind the counter and interrupt whatever drink the barista is currently making. The finished order gets placed on a **pickup shelf** and waits its turn.
- The **shop manager** does nothing but constantly glance at the counter: *"Are the barista's hands free right now? If yes, is anything waiting on the pickup shelf? Bring it over."* That manager, tirelessly repeating this one check, is the **event loop**.
- Critically, the shop keeps **two** pickup shelves with different priority: a **fast-lane shelf** for orders that must be handed over the instant the barista is free (the microtask queue), and a **regular shelf** for everything else (the macrotask queue). The manager always clears the fast-lane shelf completely before glancing at the regular one.

---

## 🧵 1. JavaScript Is Single-Threaded — and Has Its Own "Outsourcing"

> **JavaScript is a single-threaded language** — it has exactly one call stack and executes one instruction at a time, line by line. Everything that runs directly on that thread is **synchronous**: each operation fully completes before the next one begins.

```js
console.log("Order received");
console.log("Order confirmed");
// Order received
// Order confirmed
// — nothing here can "jump the queue"; it's strict line-by-line order
```

But JS clearly *does* handle things that take unpredictable amounts of time — network requests, timers, file reads — without freezing the page. It does this by **outsourcing** the waiting to something outside its own single thread: the **Web APIs** (browser) or **`libuv`** (Node.js) — the same host-provided capabilities file 11 introduced for the DOM and `fetch`. JS hands the task off, keeps running other code, and gets notified through a **callback** once the outsourced work is done.

> A callback is nothing exotic — it's the same first-class function value from file 6, just handed to something else with the instruction "call this when you're finished."

---

## 📞 2. Callbacks — The Original Way to Handle "Later"

> A **callback** is a function passed into another function, to be invoked once that other function's (often asynchronous) work completes. It was the original mechanism for async JS, before Promises existed.

```js
function boilWater(cb) {
  setTimeout(() => {
    cb(); // "call back" once the outsourced timer work is done
  }, 2000);
}

boilWater(() => console.log("Water boiled!"));
```

### Chaining callbacks — and the problem it creates

```js
function prepareOrder(item, cb) {
  setTimeout(() => cb(null, { item, status: "prepared" }), 100);
}
function packOrder(order, cb) {
  setTimeout(() => cb(null, { ...order, status: "packed" }), 100);
}
function shipOrder(order, cb) {
  setTimeout(() => cb(null, { ...order, status: "shipped" }), 100);
}

prepareOrder("Desk Lamp", (err, order) => {
  if (err) return console.log(err);
  packOrder(order, (err, order) => {
    if (err) return console.log(err);
    shipOrder(order, (err, order) => {
      if (err) return console.log(err);
      console.log(`${order.item}: ${order.status}`); // Desk Lamp: shipped
    });
  });
});
```

> **"Callback Hell" / the Pyramid of Doom.** Every callback here takes `(err, result)` as its first two parameters — the "error-first" convention, the standard Node.js pattern for handling failure without `try`/`catch` (you can't wrap `try`/`catch` around work that hasn't finished yet — see file 15). Each step must nest *inside* the previous step's callback to run in sequence, and every level needs its own `if (err) return ...` check. Real chains of five or more async steps become deeply nested, hard-to-read "pyramids" — this exact pain point is what **Promises** (file 17) fix, by letting steps chain with `.then()` instead of nesting.
>
> Rule of thumb: don't use a callback purely to hold or return a reference to data — that's a job a `Promise` does properly (file 17). Callbacks are best reserved for "run this when the async work finishes," not as a general data-passing mechanism.

---

## 🌐 3. What `fetch`/`setTimeout` Actually Are, and Who Does the Work

```
const pendingResult = fetch(url)     ← this line returns a REFERENCE immediately, not the result

┌─────────────┐        ┌──────────────────┐
│  fetch()    │───────▶│  Object = {       │
│  (JS side)  │        │   state: pending  │
└─────────────┘        │   ...callbacks    │
                        │   waiting for the │
                        │   outcome         │
                        └──────────────────┘
                               ▲
                               │ eventually filled in by...
                        ┌──────────────┐
                        │  OS → Network │
                        │      call     │
                        └──────────────┘
```

- `fetch()` **immediately returns a reference** — an object that starts out in a pending state and is only filled in later, once the network work finishes. It does **not** wait for the response before the next line of code runs.
- **`fetch` is not part of the JavaScript language itself** — neither is `setTimeout`, `console`, or the DOM (file 11, section 1). JS *cannot* make a network call on its own; that capability is supplied entirely by the **host environment**: `fetch` is a **Web API** in the browser, or built on Node's `undici`/`libuv` in Node.
- The actual network request is carried out by the **operating system**, which hands the result back once it arrives. The runtime then updates the pending object's state and schedules the waiting callback to run.

| Tool | Provided by | Job |
|---|---|---|
| `fetch` | Browser (Web API) / Node (`undici`) | Kicks off a network request, returns immediately |
| `setTimeout` | Browser (Web API) / Node (`libuv`) | Starts a timer, returns immediately, calls back after the delay |
| `console` | Browser DevTools / Node stdout | Output — not part of the JS language spec at all |

> The object `fetch` returns is a **Promise** — file 17 covers exactly how it resolves and how `.then()` registers callbacks on it. For this file, the only thing that matters is: once that Promise settles, its waiting callback doesn't run immediately — it goes through the queue system covered next, specifically the **microtask queue**.

---

## 🔁 4. The Event Loop, Callback Queue, and Microtask Queue

```
                       ┌─────────────┐
   (single thread)     │  Event Loop │
   ┌──────────┐        │  (constant  │
   │  Call    │◀───────│   checker)  │
   │  Stack   │        └──────┬──────┘
   └──────────┘               │
        ▲                     │ "is the stack empty? bring the
        │                     │  next finished item over"
        │              ┌──────▼──────┐
        └──────────────│   Queues     │
                        │ (see below)  │
                        └─────────────┘
```

> **The event loop's entire job: constantly check whether the call stack is empty, and if it is, pull the next completed task from a queue and push it onto the stack to run.** It moves finished background work back onto the single thread only once that thread is actually free.

- Code you write directly (on the **call stack**) always executes **immediately** — whatever lands on the stack runs to completion before the stack empties again.
- Once an outsourced task (a timer, a network call) finishes, it doesn't interrupt whatever is currently running — it waits in a **queue** until the call stack is completely empty, and only then does the event loop move it over.

### Two separate queues, with a strict priority order

| Queue | Holds | Priority |
|---|---|---|
| **Microtask queue** | Promise callbacks (`.then`, `.catch`, `.finally`, code after `await`) | **Checked first** — and fully drained before the next macrotask runs |
| **Macrotask queue** (a.k.a. callback queue) | `setTimeout`/`setInterval` callbacks, I/O | Checked only **after** the microtask queue is completely empty |

> **The rule:** first, all synchronous code runs to completion. Then the **entire** microtask queue is drained — every pending microtask runs, including any *new* ones added while draining is in progress. **Only once the microtask queue is completely empty** does the event loop check the macrotask queue and pull the single next macrotask.

### Worked example 1 — sync always wins

```js
console.log("First line");

Promise.resolve("resolved value").then((v) => {
  console.log("Microtask:", v);   // registered second, but runs after ALL sync code
});

console.log("Third line");
```

**Output:**
```
First line
Third line
Microtask: resolved value
```

Even though the `.then()` callback was registered *before* `console.log("Third line")` ran, it still executes **after** all synchronous code — microtasks never preempt currently-running synchronous code; they only run once the call stack is empty.

### Worked example 2 — microtask beats macrotask, even at `0ms`

```js
console.log("Start");

setTimeout(() => console.log("Timeout (macrotask)"), 0);

Promise.resolve().then(() => console.log("Promise (microtask)"));

console.log("End");
```

**Output:**
```
Start
End
Promise (microtask)
Timeout (macrotask)
```

> **Interview question: why doesn't `setTimeout(fn, 0)` run immediately, and why does a microtask beat it even with a `0ms` delay?**
> Two reasons stack together. First, `setTimeout` always hands its callback to the host's timer facility, which only re-queues it onto the macrotask queue once the call stack is empty — `0ms` means "as soon as possible," not "synchronously now." Second, even once the call stack is empty, the event loop's rule is to **fully drain the microtask queue before touching the macrotask queue at all** — so a pending Promise callback, regardless of when it was scheduled, always runs before the next macrotask.

### Worked example 3 — microtasks scheduled *during* draining still run before the macrotask

```js
console.log("A");

setTimeout(() => console.log("D — macrotask"), 0);

Promise.resolve().then(() => {
  console.log("B — microtask 1");
  Promise.resolve().then(() => console.log("C — microtask 2 (queued during draining)"));
});

console.log("E");
```

**Output:**
```
A
E
B — microtask 1
C — microtask 2 (queued during draining)
D — macrotask
```

Trace it step by step:
1. **Synchronous pass:** `"A"` logs, `setTimeout` hands its callback to the host and returns immediately (nothing logs yet), `Promise.resolve().then(...)` registers a microtask (nothing logs yet), `"E"` logs. Call stack is now empty.
2. **Drain the microtask queue:** the first (and only, so far) microtask runs — it logs `"B"`, and while running, it registers a *new* microtask (the inner `.then`). Because the rule is "drain the queue completely, including anything added during draining," the event loop does not move on yet.
3. The newly-added microtask runs next — it logs `"C"`. The microtask queue is now genuinely empty.
4. **Only now** does the event loop check the macrotask queue, find the timer callback, and run it — logging `"D"`.

This is the exact mechanism that trips people up in interviews: a microtask chain of any depth always finishes completely before the *next single* macrotask is allowed to run.

---

## 💡 Cheat Sheet: Quick Reference

```js
// Synchronous code always runs first, top to bottom, without interruption.

// A callback: "call this when you're done"
function doWork(cb) {
  setTimeout(() => cb(null, "result"), 100);
}

// fetch/setTimeout are host APIs (file 11), not JS language features —
// the actual work happens outside the engine; JS just gets notified later.

// Priority order, every single time:
// 1. Run all synchronous code to completion.
// 2. Drain the ENTIRE microtask queue (Promise callbacks) — including
//    microtasks added while draining is still in progress.
// 3. Run exactly ONE macrotask (setTimeout/setInterval/I/O callback).
// 4. Go back to step 2. Repeat.
```

| Term | What it means |
|---|---|
| Call stack | Where synchronous code runs, one frame at a time |
| Host environment | Browser / Node — provides `fetch`, `setTimeout`, timers, networking (file 11) |
| Callback | A function handed off to run later, once async work finishes |
| Macrotask / callback queue | Holds `setTimeout`/`setInterval`/I/O callbacks |
| Microtask queue | Holds Promise callbacks — always drained first, and fully |
| Event loop | Constantly checks: is the call stack empty? If so, pull from a queue |

---

## 🎯 Key Takeaways

- JavaScript has one call stack and runs synchronous code top-to-bottom without interruption — it has no built-in way to "wait" for anything.
- Async behavior comes from **outsourcing**: JS hands timers/networking off to the host environment (file 11's Web APIs / `libuv`) and receives a callback once that outsourced work completes.
- A **callback** is just a function passed to be invoked later; chaining many of them nested inside each other produces **callback hell**, the problem Promises (file 17) exist to solve.
- `fetch` and `setTimeout` are host APIs, not language features — the JS engine only computes; the OS and runtime do the actual networking/timing work.
- The **event loop** repeatedly checks whether the call stack is empty and, if so, pulls the next task from a queue. The **microtask queue** (Promise callbacks) is always fully drained — including anything newly added during that draining — before the **macrotask queue** (timers, I/O) is even checked.

---

## 📚 Related Concepts to Explore Next

This file builds directly on [15-Error-Handling-Defensive-Coding.md](./15-Error-Handling-Defensive-Coding.md)'s point that `try`/`catch` can't wrap work that hasn't finished yet — that's exactly why error-first callbacks exist — and on file 11's ["What JS Does NOT Own"](./11-DOM-Browser-Events.md#-1-what-js-does-not-own-browser--node-apis) section, which first drew the ECMAScript-vs-host-API line this file applies to timers and networking. The next file, [17-Promises-Async-Await-Modules.md](./17-Promises-Async-Await-Modules.md), builds directly on top of everything here: it formalizes the pending/resolved/rejected object `fetch` returns, replaces nested callbacks with `.then()` chains and `async`/`await`, and explains exactly why Promise callbacks land on the microtask queue this file just traced.

---

## 🔗 Resources

- [MDN — The Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#the_event_loop)
- [MDN — Microtask guide](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [MDN — setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- [MDN — Using promises (callbacks vs. promises)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
