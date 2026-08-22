# JavaScript: Promises, async/await & Modules
## Part 17 of 17 — Formalizing "Later," and Packaging Code for Reuse

---

## 📌 Executive Summary

- **A Promise is a formal, single-object upgrade over the raw callback pattern from file 16** — instead of nesting callbacks inside callbacks, you chain `.then()` calls and get one unified error path via `.catch()`.
- **A Promise has exactly three states — pending, fulfilled, rejected — and once it settles (fulfilled or rejected), that outcome is locked forever.** It can never flip from one settled state to another.
- **`Promise.all` vs `allSettled` vs `race` vs `any`** are four different answers to the same question: "I have several promises in flight at once — when do I care, and about what?"
- **`async`/`await` is not a new async mechanism** — it is syntax sugar sitting directly on top of Promises, letting asynchronous code *read* top-to-bottom like synchronous code, while still resolving through the exact microtask queue file 16 traced.
- **ES Modules (`import`/`export`) and CommonJS (`require`/`module.exports`) are two different systems for splitting code across files** — the modern standard versus the system still common in older Node.js codebases — and knowing both is a practical necessity, not a historical footnote.

---

## 🧠 Core Analogy: The Package Tracking Number

Ordering something online gives you a tracking number the instant you check out — long before the package arrives. That tracking number *is* a Promise.

- **Pending** = "In transit" — the package hasn't arrived and hasn't been declared lost. The outcome isn't known yet, but the tracking number is real and usable right now.
- **Fulfilled (resolved)** = "Delivered" — the package arrived, and the tracking page shows exactly what you ordered.
- **Rejected** = "Delivery failed / returned to sender" — something went wrong, and the tracking page tells you why.
- **`.then(...)`** = "text me the moment it's delivered, and tell me what's in the box."
- **`.catch(...)`** = "text me instead if it's declared undeliverable."
- **`.finally(...)`** = "either way, close out this order in my account — delivered or returned, the case is closed."
- Once a package is marked **delivered**, it cannot later become **undeliverable**, and vice versa — the outcome is permanent the moment it's recorded. That's exactly how a settled Promise behaves.

---

## 🎭 1. The Three States of a Promise

> **A Promise has exactly three possible states: `pending`, `fulfilled` (resolved), and `rejected`.** A Promise is created with `new Promise(...)`, starts `pending` the instant it's constructed, and moves to `fulfilled` or `rejected` **exactly once** — after that, it is permanently "settled" and can never change state again.

```js
function boilWater(ms) {
  return new Promise((resolve, reject) => {
    console.log("Starting to boil water");   // runs IMMEDIATELY, synchronously, the moment the Promise is constructed
    if (typeof ms !== "number" || ms < 0) {
      reject(new Error("ms must be a non-negative number"));
      return;
    }
    setTimeout(() => {
      resolve("Water is boiling");   // fulfilled once the timer completes
    }, ms);
  });
}

boilWater(200)
  .then((msg) => console.log("Resolved:", msg))     // runs if resolve() was called
  .catch((err) => console.log("Rejected:", err.message));  // runs if reject() was called
```

> **The executor function `(resolve, reject) => {...}` passed to `new Promise(...)` runs synchronously and immediately** the instant the Promise is constructed — it does not wait for anything. Only the *asynchronous* work inside it (the `setTimeout` here) defers calling `resolve`/`reject`. This trips people up: `"Starting to boil water"` prints **before** `boilWater(200)` even finishes returning, not "later."

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error("Request timed out"));
  }, 2000);
});

console.log(promise);   // Promise { <pending> } — logged IMMEDIATELY, before the timer ever fires
```

| State | Meaning | Can it change after this? |
|---|---|---|
| `pending` | Initial state — outcome not yet known | ✅ Can move to fulfilled or rejected |
| `fulfilled` (resolved) | `resolve(value)` was called | ❌ Locked forever — the Promise is "settled" |
| `rejected` | `reject(error)` was called | ❌ Locked forever — the Promise is "settled" |

> **Interview question: can a Promise resolve and then later reject (or vice versa)?**
> No. Once `resolve()` or `reject()` is called, the Promise is **settled** — any further calls to either inside the executor are silently ignored. This is a deliberate guarantee: code consuming a Promise never has to worry about its outcome flip-flopping after the fact.

---

## 🔗 2. `.then()`, `.catch()`, `.finally()`, and Chaining

> **`.then(onFulfilled, onRejected)` registers callbacks to run once a Promise settles.** With one argument, it handles the success case; a rarely-used second argument can handle rejection directly. **`.catch(onRejected)`** is the standard, modern way to handle rejections — cleaner and more readable than `.then()`'s second argument. **`.finally()`** runs regardless of outcome, exactly like the `finally` block in `try`/`catch` (file 15 §2).

```js
const promise = new Promise((resolve) => {
  setTimeout(() => resolve("chai"), 2000);
});

promise.then((value) => {
  console.log(value);   // "chai" — the value passed to resolve() arrives as the callback's argument
});

// equivalent shorthand — pass the function reference directly
promise.then(console.log);
```

```js
// two-argument .then() — success handler, failure handler
promise.then(
  (data) => console.log(data),
  (error) => console.log(error),
);

// the cleaner, modern convention:
promise
  .then((data) => console.log(data))
  .catch((error) => console.log(error));
```

### Chaining `.then()` — each one passes its return value to the next

```js
promise
  .then((data) => {
    const upper = data.toUpperCase();
    return upper;                        // becomes the VALUE the next .then() receives
  })
  .then((data) => data + ".dev")
  .then(console.log)                     // "CHAI.dev"
  .catch((error) => {
    console.log(error);
    return "fallback value";             // .catch() can ALSO return a value, continuing the chain
  })
  .then(console.log);
```

> **If data arrives successfully, `.then()` hands you the resolved value; if it doesn't, `.catch()` hands you the error instead.** Critically, **`.catch()` can also `return` a value**, which continues the `.then()` chain afterward — this is how you recover from an error and keep going, rather than letting the failure propagate all the way to the end unhandled.

```js
prepareLeaves()
  .then((leaves) => steepTea(leaves, 200))
  .then((tea) => console.log(addSugar(tea, 2)))
  .catch((err) => console.log("Something went wrong:", err.message));
```

> **`.catch()`'s modern placement is a deliberate convention — put it at the END of the chain.** A single `.catch()` at the tail catches a rejection from **any** step earlier in the chain, so you don't need to `.catch()` after every individual `.then()`. This is one of Promises' biggest advantages over raw nested callbacks (file 16 §2): **one unified error path**, instead of an `if (err) return ...` check duplicated at every nesting level.

---

## 🎁 3. `Promise.resolve()` / `Promise.reject()` — Instantly Settled Promises

```js
const instant = Promise.resolve("done immediately");
console.log(instant);   // Promise { 'done immediately' } — already fulfilled, no waiting

function prepareLeaves() {
  return Promise.resolve("leaves ready");   // a synchronous value, wrapped as an already-resolved Promise
}
```

Useful when a function *might* sometimes be asynchronous and sometimes not — wrapping a plain value in `Promise.resolve()` guarantees callers can always chain `.then()` on the return value, regardless of whether real async work happened underneath.

```js
function failFast() {
  return Promise.reject(new Error("invalid configuration"));
}

failFast().catch((err) => console.log(err.message));   // "invalid configuration"
```

---

## 🏁 4. Combining Multiple Promises — `all`, `allSettled`, `race`, `any`

> These four static methods all take an **array (or other iterable) of Promises** and return a single new Promise representing some combination of their outcomes. Each answers a different question about "what do I do when several things are happening at once."

| Method | Resolves when | Rejects when | Result shape |
|---|---|---|---|
| **`Promise.all()`** | **ALL** promises fulfill | **ANY ONE** promise rejects — immediately, without waiting for the rest | Array of resolved values, in original order |
| **`Promise.allSettled()`** | **ALL** promises settle (fulfilled OR rejected) — never short-circuits | Never rejects itself | Array of `{status, value}` or `{status, reason}` objects — inspect each individually |
| **`Promise.race()`** | The **FIRST** promise to settle, however it settles | Same trigger — first one wins, whether it fulfilled or rejected | The single winning value (or the rejection reason) |
| **`Promise.any()`** | **ANY ONE** promise fulfills | Only if **ALL** promises reject (throws an `AggregateError`) | The first *fulfilled* value — ignores individual rejections unless everything fails |

```js
// Promise.all — "I need EVERY result, and I want to fail fast if even one fails"
Promise.all([
  fetchUser(),
  fetchOrders(),
  fetchSettings(),
])
  .then(([user, orders, settings]) => { /* all three succeeded */ })
  .catch((err) => { /* at least one failed — the others' results are discarded */ });

// Promise.allSettled — "tell me what happened to EVERY promise, success or failure, no exceptions"
Promise.allSettled([
  fetchUser(),
  fetchFromUnreliableService(),
]).then((results) => {
  results.forEach((r) => {
    if (r.status === "fulfilled") console.log("Got:", r.value);
    else console.log("Failed:", r.reason);
  });
});

// Promise.race — "give me whichever settles first, I don't care which"
Promise.race([
  fetchData(),
  new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
]);   // classic pattern: race a real request against a timeout promise

// Promise.any — "I just need ONE success, from any of several fallbacks"
Promise.any([
  fetchFromMirror("mirror1"),
  fetchFromMirror("mirror2"),
]);   // resolves as soon as ANY mirror responds successfully; rejects only if BOTH fail
```

> **Interview question: when would you use `Promise.all` vs `Promise.allSettled`?**
> Use `Promise.all` when every operation is **required** to succeed for your logic to proceed — e.g. you need a user, their orders, and their settings *all* loaded before rendering a dashboard; if any fails, there's no meaningful partial state to show. Use `Promise.allSettled` when operations are **independent** and partial success is meaningful — e.g. sending notifications to five users, where one failure shouldn't stop you from knowing the other four succeeded.

> **Interview question: how is `Promise.any` different from `Promise.race`?**
> `Promise.race` settles on whichever promise finishes **first, period** — even if that first one is a rejection. `Promise.any` specifically waits for the first **success**, actively skipping over rejections, and only itself rejects (with an `AggregateError`) if every single promise fails. `race` cares about speed; `any` cares about getting one working result from several attempts.

---

## ⏳ 5. `async` / `await` — Syntax Sugar Over Promises

> **`await` can only be used inside a function marked `async`.** Marking a function `async` means it always returns a Promise, even if you `return` a plain value — it gets auto-wrapped in `Promise.resolve(...)`. Inside an `async` function, `await somePromise` **pauses that function's execution** until the awaited Promise settles, then unwraps the resolved value directly — no `.then()` callback needed.

```js
const orderPromise = new Promise((resolve) => {
  setTimeout(() => resolve("Order #4521"), 3000);
});

async function trackOrder() {
  const result = await orderPromise;   // execution PAUSES here for ~3s, then resumes with the resolved value
  console.log(result);                 // "Order #4521"
}

trackOrder();
```

> `async`/`await` is **not a separate async mechanism** — it's syntax sugar sitting directly on top of Promises. `await orderPromise` is functionally equivalent to `orderPromise.then(result => {...rest of the function...})`, just written to *look* like ordinary top-to-bottom synchronous code. That's why it becomes so much easier to read than long `.then()` chains once you have more than two or three sequential async steps — and file 16's rule still applies underneath: the code after `await` resumes as a **microtask**, queued the same way a `.then()` callback is.

---

## 🛡️ 6. Error Handling with `async`/`await` — Back to `try`/`catch`

```js
const orderPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Payment declined")), 3000);
});

async function trackOrder() {
  try {
    const result = await orderPromise;
    console.log(result);
  } catch (error) {
    console.log("Order failed:", error.message);   // "Order failed: Payment declined"
  }
}

trackOrder();
```

> **`await` cannot handle a rejection on its own** — a rejected awaited Promise **throws** inside the `async` function, exactly like a synchronous `throw`. This is *why* you wrap `await` calls in ordinary `try`/`catch` (file 15 §2) rather than chaining `.catch()`: it's the same error-handling tool covered there, applied to async code that now *reads* synchronously. Everything file 15 established still holds — `finally` still always runs, a `catch` block can still re-throw, and a raw thrown value versus a real `Error` instance still determines what the `catch` block can actually do with it.

```js
async function placeOrder(cart) {
  try {
    const order = await submitOrder(cart);
    return order;
  } catch (error) {
    if (error instanceof NetworkError) {
      console.log("Retrying due to network issue...");
      return await submitOrder(cart);   // one retry attempt
    }
    throw error;   // re-throw anything we don't specifically know how to recover from
  } finally {
    console.log("Order attempt finished");   // always runs — success, handled failure, or re-thrown failure
  }
}
```

---

## 🐢 7. Sequential vs Concurrent `await` — A Common Performance Trap

```js
function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fetchUser()     { return delay(700, "user data"); }
function fetchOrders()   { return delay(700, "orders data"); }
function fetchSettings() { return delay(700, "settings data"); }
```

```js
// ❌ Sequential — each await BLOCKS the next call from even STARTING.
async function slowVersion() {
  console.time("slow");
  const user = await fetchUser();          // starts at 0ms, resolves at ~700ms
  const orders = await fetchOrders();      // does NOT start until fetchUser() resolves — starts at ~700ms, resolves at ~1400ms
  const settings = await fetchSettings();  // starts at ~1400ms, resolves at ~2100ms
  console.timeEnd("slow");                 // slow: ~2100ms — the SUM of all three delays
  return { user, orders, settings };
}
```

```js
// ✅ Concurrent — all three requests START immediately, THEN we wait for all to finish.
async function fastVersion() {
  console.time("fast");
  const [user, orders, settings] = await Promise.all([
    fetchUser(),      // all three start at ~0ms, running in parallel
    fetchOrders(),
    fetchSettings(),
  ]);
  console.timeEnd("fast");   // fast: ~700ms — the SLOWEST single delay, not the sum
  return { user, orders, settings };
}
```

> **Interview question: what's wrong with awaiting three independent API calls one after another?**
> Each `await` pauses the function until that specific Promise resolves *before the next line even starts running* — so three independent, unrelated requests end up executing **sequentially** instead of in parallel, needlessly multiplying total wait time (here, ~2100ms instead of ~700ms). If the calls don't depend on each other's results, kick them all off first — so all three are in flight simultaneously — then `await Promise.all([...])` once to wait for everyone together. If one of the three legitimately depends on a previous one's result (e.g. `fetchOrders(user.id)` needs `user` first), sequential `await` is correct and unavoidable for that specific pair — the trap is only awaiting *independent* work one at a time out of habit.

---

## 📦 8. ES Modules vs CommonJS

Every file so far has assumed all your code lives in one file (or one `<script>` tag). Real projects split code across many files — a **module system** is the mechanism for one file to expose values (`export`) and another file to consume them (`import`/`require`). JavaScript has two competing systems in active use.

### ES Modules (ESM) — the modern, language-native standard

```js
// mathUtils.js
export function add(a, b) {
  return a + b;
}

export const PI = 3.14159;

export default function multiply(a, b) {   // a file can have at most ONE default export
  return a * b;
}
```

```js
// app.js
import multiply, { add, PI } from "./mathUtils.js";   // default import (any name) + named imports (must match)

console.log(add(2, 3));       // 5
console.log(multiply(2, 3));  // 6
console.log(PI);              // 3.14159
```

- **Named exports** (`export function add`, `export const PI`) — a file can have as many as it needs; the importer must use the exact same names (optionally renamed with `as`: `import { add as sum }`).
- **Default export** (`export default ...`) — at most one per file; the importer picks any local name for it.
- ES Modules are **static** — `import`/`export` statements are analyzed before any code runs, which is what lets bundlers (Webpack, Vite, Rollup) perform *tree-shaking*: dropping exports that are never imported anywhere, out of the final bundle.
- This is the syntax used natively in the browser (`<script type="module">`), in modern bundlers, and in Node.js projects that opt in via `"type": "module"` in `package.json` or a `.mjs` file extension.

### CommonJS (CJS) — Node.js's original, still-common system

```js
// mathUtils.js
function add(a, b) {
  return a + b;
}

const PI = 3.14159;

module.exports = { add, PI };   // one object, attached however you like
```

```js
// app.js
const { add, PI } = require("./mathUtils.js");

console.log(add(2, 3));   // 5
console.log(PI);          // 3.14159
```

- `require()` is a regular **function call** — it can be called conditionally, inside an `if`, or with a dynamically-built path, because it runs at actual execution time rather than being statically analyzed beforehand.
- `module.exports` is a single object (or value) a file hands back — there's no built-in named-vs-default distinction; whatever you attach to it is what the importer gets.
- CommonJS is still the default in a large share of existing Node.js packages and older backend codebases — you'll encounter it constantly when working with legacy Node services or older `npm` packages, even though ESM is now the recommended standard for new projects.

### When you'd see each

| | ES Modules | CommonJS |
|---|---|---|
| Syntax | `export` / `import` | `module.exports` / `require` |
| Where it runs natively | Browsers, modern bundlers, Node with `"type": "module"` | Node.js (default, unless opted out) |
| Analysis timing | Static — resolved before code runs (enables tree-shaking) | Dynamic — `require()` is a real function call at runtime |
| You'll encounter it when | Writing new frontend code, modern Node projects, most current tutorials/libraries | Working in an older or unconfigured Node.js codebase, many still-popular npm packages |

---

## 💡 Cheat Sheet: Quick Reference

```js
// Three states: pending → fulfilled | rejected (settled exactly once, forever)

new Promise((resolve, reject) => { /* executor runs SYNCHRONOUSLY, immediately */ });

promise
  .then(onFulfilled)
  .catch(onRejected)     // catches a rejection from ANY earlier step in the chain
  .finally(cleanup);     // always runs, regardless of outcome

Promise.resolve(value);  // already-fulfilled Promise
Promise.reject(error);   // already-rejected Promise

Promise.all([...]);         // ALL must fulfill; rejects fast on first rejection
Promise.allSettled([...]);  // waits for ALL to settle; never rejects itself
Promise.race([...]);        // first to SETTLE wins, fulfilled or rejected
Promise.any([...]);         // first to FULFILL wins; rejects only if ALL reject

async function f() {
  try {
    const value = await somePromise;   // pauses; throws on rejection
  } catch (err) {
    // handle it exactly like a synchronous throw
  } finally {
    // always runs
  }
}

// Sequential (slow, only correct when each step needs the previous result):
const a = await stepA(); const b = await stepB(a);

// Concurrent (fast, correct when steps are independent):
const [a, b] = await Promise.all([stepA(), stepB()]);

// ES Modules                          // CommonJS
export function fn() {}                function fn() {}
export default fn;                     module.exports = fn;
import fn, { other } from "./f.js";    const fn = require("./f.js");
```

---

## 🎯 Key Takeaways

- A Promise has exactly three states — `pending`, `fulfilled`, `rejected` — and settles permanently exactly once.
- `.then()`/`.catch()`/`.finally()` chain together, with a single tail `.catch()` handling rejections from any earlier step — one unified error path instead of nested `if (err)` checks.
- `Promise.all` (all-or-nothing, fail-fast), `allSettled` (everyone's outcome, never rejects), `race` (first to settle, win or lose), and `any` (first success, rejects only if everyone fails) each solve a distinct "multiple promises at once" problem.
- `async`/`await` is syntax sugar over Promises — `await` pauses an `async` function until a Promise settles, and its callback still resumes through the microtask queue (file 16).
- A rejected `await` throws, so `try`/`catch`/`finally` (file 15) is the correct, and only, way to handle async errors inside `async` functions.
- Awaiting independent async calls one after another needlessly serializes them; starting them together and awaiting `Promise.all([...])` runs them concurrently instead.
- ES Modules (`export`/`import`) are the modern, static, tree-shakeable standard; CommonJS (`require`/`module.exports`) is Node's original, still-common, runtime-resolved system — both remain worth knowing.

---

## 🏁 You've Completed the Series

Seventeen files ago, file 1 opened with the JS engine parsing your very first line of code onto a single call stack. Everything since has been building the machinery that makes today's file possible:

- The **call stack and execution context** from file 1 are still exactly what's running your synchronous code right now — every `.then()` callback and every line after an `await` still has to wait its turn to land on that same single stack.
- **Hoisting and scope** (file 2) and **coercion/memory basics** (file 3) are the ground truth under every variable this file's examples declared.
- **Destructuring** (file 4) is what made `const [user, orders, settings] = await Promise.all([...])` in section 7 read as cleanly as it does — that syntax wasn't incidental, it was file 4's payoff.
- **Functions and closures** (files 6-7) are the actual mechanism behind every `.then((value) => ...)` callback and every `async` function body in this file — each one is a closure, capturing the scope it was defined in, exactly as file 7 described.
- **Arrays, objects, and collections** (files 8 and 10) are what `Promise.all`'s array of results and `allSettled`'s array of `{status, value}` objects are built from.
- **The DOM and events** (file 11) is where you'll actually trigger most real Promises — a `fetch` fired from a click handler — and file 11 is where "host API, not JS language feature" was first established for exactly the objects this file formalized.
- **Prototypes, `this`, and classes** (files 12-14) are what a custom `Error` subclass or a class-based API client relies on when it appears inside one of this file's `try`/`catch` blocks.
- **Error handling** (file 15) is not a separate skill from async code — section 6 of this file *is* file 15's `try`/`catch`/`finally`, applied to `await`, with the exact same rules about `finally` always running and re-throws still propagating.
- **The event loop and microtask queue** (file 16) is the queue every `.then()` callback and every line after `await` actually runs through — this file didn't introduce a new scheduling mechanism, it named the object (`Promise`) that file 16's microtask queue was built to serve.

If you've followed the series from file 1 through here, you should now be able to explain, without hand-waving, *why* a piece of async JavaScript logs its output in the order it does — not by memorizing the order, but by tracing it: synchronous code first, then the microtask queue, then one macrotask, on repeat — and you should be comfortable reaching for `Promise.all`, `try`/`catch` around `await`, and the right module syntax for whichever codebase you're in. That's interview-ready JavaScript.

---

## 📚 Related Concepts to Explore Next

This file's entire mechanics section rests on [16-Event-Loop-Callbacks.md](./16-Event-Loop-Callbacks.md) — read that first if `.then()`/`await` resuming through the microtask queue didn't feel intuitive above; it's the direct prerequisite for everything in sections 1-7 here.

Beyond this series, natural next steps for continued learning include:

- **TypeScript** — adds static typing on top of everything covered here, catching a large class of bugs (wrong argument types, missing null checks) before code ever runs.
- **A testing framework** (e.g. Jest, Vitest) — for writing automated tests against the functions, classes, and async code this series covered.
- **A frontend framework** (e.g. React) — builds directly on the DOM (file 11), closures (file 7), and async data-fetching (this file) to structure real user interfaces.
- **Node.js backend fundamentals** — Express routing, databases, and API design, building directly on the async patterns, error handling, and module systems covered across files 15-17.

---

## 🔗 Resources

- [MDN — Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN — `Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN — `async function`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN — JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
