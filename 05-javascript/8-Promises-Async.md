# JavaScript: Promises, async/await & Closures in the Real World
## Part 8 of N — Formalizing "Later," and Where Closures Actually Get Used

---

## 📌 Executive Summary: The Big Picture

- **A Promise is a formal upgrade over the raw callback pattern from Part 7** — instead of nesting callbacks, you chain `.then()` calls, and get built-in, unified error propagation via `.catch()`.
- **What are the three states a Promise can be in, and can it ever change state twice?** → Pending → Fulfilled *or* Rejected, and once settled, a Promise's outcome is locked forever.
- **`Promise.all` vs `allSettled` vs `race` vas `any`** — four different answers to "I have multiple promises running at once; when do I care, and about what?"
- **`async`/`await` is not a new async mechanism** — it's syntax sugar over Promises, making asynchronous code *read* like synchronous code.
- **Where do closures actually show up in real production code?** → Rate limiting, memoization/caching, and factory functions that hand back configured functions — this doc closes the loop from Part 2's introduction of closures to concrete Express/API use.

---

## 🧠 Core Analogy: The Promise as a Trust Contract

- A **Promise** is exactly what the word says: *"I promise I'll tell you the result later — trust me, when the data arrives (or fails to), I'll let you know."*
- **Pending** = the promise hasn't been kept or broken yet — still waiting.
- **Fulfilled (resolved)** = the promise was kept — here's your data.
- **Rejected** = the promise was broken — here's why.
- **`.then()`** = "call this function once you keep your promise."
- **`.catch()`** = "call this function if you break your promise instead."
- **`.finally()`** = "do this regardless of whether you kept it or broke it — the deal is settled either way."

---

## 🎭 1. The Three States of a Promise

> **A Promise has exactly three possible states: `pending`, `fulfilled` (done/resolved), and `rejected` (nope/not).** A Promise is created with `new Promise(...)`, is `pending` by default the instant it's created, and moves to `fulfilled` or `rejected` **exactly once** — after that, its outcome is permanently locked ("settled") and can never change again.

```js
function boilWater(time) {
  return new Promise((res, rej) => {
    console.log("Krte h ji boil water");   // runs IMMEDIATELY, synchronously, the moment the Promise is constructed
    if (typeof time !== "number" || time < 0) {
      rej(new Error("ms must be in number and greater than zero"));
    }
    setTimeout(() => {
      res("Ubal gya");   // "resolve" — fulfilled after the timer completes
    }, time);
  });
}

boilWater(200)
  .then((msg) => console.log("Resolved: ", msg))    // runs if resolve() was called
  .catch((err) => console.log("Rejected: ", err.message));  // runs if reject() was called
```

> **The executor function `(resolve, reject) => {...}` passed to `new Promise(...)` runs synchronously and immediately**, the instant the Promise is constructed — it does NOT wait for anything. It's only the *asynchronous* work you put inside it (like the `setTimeout`) that defers calling `resolve`/`reject`. This surprises people: `console.log("Krte h ji boil water")` prints **before** `boilWater(200)` even finishes being called, not "later."

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error("No chaicode"));
  }, 2000);
});

console.log(promise);   // Promise { <pending> } — logged IMMEDIATELY, before the timer fires
```

| State | Meaning | Can it change after this? |
|---|---|---|
| `pending` | Initial state — outcome not yet known | ✅ Can move to fulfilled or rejected |
| `fulfilled` (resolved) | `resolve(value)` was called | ❌ Locked forever — this Promise is "settled" |
| `rejected` | `reject(error)` was called | ❌ Locked forever — this Promise is "settled" |

> **Interview question: can a Promise resolve and then later reject (or vice versa)?**
> No. Once `resolve()` or `reject()` is called, the Promise is **settled** — any further calls to `resolve`/`reject` inside the executor are silently ignored. This is a deliberate design guarantee: code consuming a Promise never has to worry about its outcome flip-flopping after the fact.

---

## 🔗 2. `.then()`, `.catch()`, `.finally()`

> **`.then(onFulfilled, onRejected)` registers callbacks to run once the Promise settles.** Called with one argument, it handles the success case; a second argument (rarely used in modern code) can handle the failure case directly. **`.catch(onRejected)`** is the standard, modern way to handle rejections — cleaner than `.then()`'s second argument. **`.finally()`** runs regardless of outcome, exactly like the `finally` block in try/catch (Error-Handling doc §2).

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve("Chaicode");
    // reject(new Error("No chaicode"));
  }, 2000);
});

promise.then((value) => {
  console.log(value);   // "Chaicode" — the value passed to resolve() arrives here as the callback's argument
});

// equivalent shorthand — just pass the function reference directly
promise.then(console.log);
```

```js
// two-argument .then() — success handler, failure handler
promise.then(
  (data) => console.log(data),
  (error) => console.log(error),
);
// OR, the cleaner modern convention:
promise
  .then((data) => console.log(data))
  .catch((error) => console.log(error));
```

### Chaining `.then()` — each one passes its return value to the next

```js
promise
  .then((data) => {
    const newData = data.toUpperCase();
    return newData;                      // becomes the VALUE the next .then() receives
  })
  .then((data) => {
    return data + ".com";
  })
  .then(console.log)                     // "CHAICODE.com"
  .catch((error) => {
    console.log(error);
    return "Chai";                       // .catch() can ALSO return a value, continuing the chain
  })
  .then(console.log);
```

> **Business-logic framing from class notes:** *"data aaya to `.then()` se resolve ki value dena, nahi to `.catch()` se error"* — if the data arrives successfully, `.then()` hands you the resolved value; if it doesn't, `.catch()` hands you the error instead. And critically: **`.catch()` can also `return` a value**, which continues the `.then()` chain afterward — this is how you recover from an error and keep the chain going, rather than letting the failure propagate all the way to the end.

```js
grindLeaves()
  .then((val) => steepTea(200))
  .then((val) => console.log(addSugar(2)))
  .catch((err) => console.log("Something went wrong:", err.message));
```

> **Note: `.catch()`'s modern placement is a deliberate convention — put it at the END of the chain ("closest of closest").** A single `.catch()` at the tail catches a rejection from **any** step earlier in the chain — you don't need to `.catch()` after every individual `.then()`. This is one of Promises' biggest advantages over raw nested callbacks (Part 7 §2): **one unified error path**, instead of an `if (err) return ...` check duplicated at every nesting level.

---

## 🎁 3. `Promise.resolve()` / `Promise.reject()` — Instantly Settled Promises

```js
const turant = Promise.resolve("Turant");
console.log(turant);   // Promise { 'Turant' } — already fulfilled, no waiting needed

function grindLeaves() {
  return Promise.resolve("Leaves grounded");   // a synchronous value, wrapped as an already-resolved Promise
}
```

Useful when a function *might* sometimes be async and sometimes not — wrapping a plain value in `Promise.resolve()` guarantees callers can always treat the return value uniformly as a Promise (always chain `.then()` on it, regardless of whether real async work happened).

---

## 🏁 4. Combining Multiple Promises — `all`, `allSettled`, `race`, `any`

> These four static methods all take an **array (or other iterable) of Promises** and return a single new Promise representing some combination of their outcomes — each answers a different question about "what do I do when several things are happening at once."

```js
const allPromise = Promise.allSettled([
  Promise.resolve("Chai"),
  Promise.resolve("Code"),
  Promise.reject("Error"),
]);
```

| Method | Resolves when | Rejects when | Result shape |
|---|---|---|---|
| **`Promise.all()`** | **ALL** promises fulfill | **ANY** one promise rejects (immediately — doesn't wait for the rest) | Array of resolved values, in order |
| **`Promise.allSettled()`** | **ALL** promises settle (fulfilled OR rejected) — never short-circuits | Never rejects itself | Array of `{status, value}` or `{status, reason}` objects — you inspect each individually |
| **`Promise.race()`** | The **FIRST** promise to settle, however it settles | Same — first one wins, whether fulfilled or rejected | The single winning value (or the rejection reason) |
| **`Promise.any()`** | **ANY ONE** promise fulfills | Only if **ALL** promises reject | The first *fulfilled* value — ignores rejections unless everything fails |

```js
// Promise.all — "I need EVERY result, and I want to fail fast if even one fails"
Promise.all([
  fetch("/api/user"),
  fetch("/api/orders"),
  fetch("/api/settings"),
])
  .then(([user, orders, settings]) => { /* all three succeeded */ })
  .catch((err) => { /* at least one failed — the others' results are discarded */ });

// Promise.allSettled — "I want to know what happened to EVERY promise, success or failure, no exceptions"
Promise.allSettled([
  fetch("/api/user"),
  fetch("/api/maybe-down-service"),
]).then((results) => {
  results.forEach((r) => {
    if (r.status === "fulfilled") console.log("Got:", r.value);
    else console.log("Failed:", r.reason);
  });
});

// Promise.race — "give me whichever finishes first, I don't care which"
Promise.race([
  fetch("/api/data"),
  new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
]);   // classic pattern: race a real request against a timeout promise

// Promise.any — "I just need ONE success, from any of several mirrors/fallbacks"
Promise.any([
  fetch("https://mirror1.example.com/data"),
  fetch("https://mirror2.example.com/data"),
]);   // resolves as soon as ANY mirror responds successfully
```

> **Interview question: when would you use `Promise.all` vs `Promise.allSettled`?**
> Use `Promise.all` when every operation is **required** to succeed for your logic to proceed — e.g. you need the user, their orders, and their settings *all* loaded before rendering a dashboard; if any fails, there's no meaningful partial state to show. Use `Promise.allSettled` when operations are **independent** and partial success is meaningful — e.g. sending notifications to 5 users, where one failing shouldn't stop you from knowing the other 4 succeeded.

---

## ⏳ 5. `async` / `await`

> **`await` can only be used inside a function marked `async`.** Marking a function `async` means it always returns a Promise (even if you `return` a plain value — it gets auto-wrapped). Inside it, `await somePromise` **pauses that function's execution** until the awaited Promise settles, then unwraps the resolved value directly — without needing a `.then()` callback at all.

```js
const hPromise = new Promise((res, rej) => {
  setTimeout(() => {
    res("Masterji");
  }, 3000);
});

async function nice() {
  const result = await hPromise;   // execution PAUSES here for ~3sec, then resumes with the resolved value
  console.log(result);             // "Masterji"
}

nice();
```

> `async`/`await` is **not a separate async mechanism** — it's syntax sugar sitting directly on top of Promises. `await hPromise` is functionally equivalent to `hPromise.then(result => {...rest of the function...})`, just written to *look* like ordinary synchronous, top-to-bottom code — which is precisely why it's so much easier to read than long `.then()` chains once you have more than 2-3 sequential async steps.

### Error handling with `async`/`await` — back to `try`/`catch`

```js
const hPromise = new Promise((res, rej) => {
  setTimeout(() => {
    rej(new Error("Masterji"));
  }, 3000);
});

async function nice() {
  try {
    const result = await hPromise;
    console.log(result);
  } catch (error) {
    console.log("Error aa gya ji", error.message);   // "Error aa gya ji Masterji"
  }
}
nice();
```

> **`await` cannot handle a rejection on its own** — a rejected awaited Promise **throws** inside the `async` function, exactly like a synchronous `throw`. This is *why* you wrap `await` calls in ordinary `try`/`catch` (Error-Handling doc §2) rather than chaining `.catch()` — it's the same error-handling tool you already know, applied to async code that now *reads* synchronously.

### Sequential vs concurrent `await` — a common performance trap

```js
// ❌ Sequential — each await BLOCKS the next one from starting. Total time: sum of all three.
async function slowVersion() {
  const user = await fetchUser();       // waits fully...
  const orders = await fetchOrders();   // ...before this even STARTS
  const settings = await fetchSettings();
  return { user, orders, settings };
}

// ✅ Concurrent — all three requests START immediately, THEN we wait for all to finish. Total time: the slowest one.
async function fastVersion() {
  const [user, orders, settings] = await Promise.all([
    fetchUser(),
    fetchOrders(),
    fetchSettings(),
  ]);
  return { user, orders, settings };
}
```

> **Interview question: what's wrong with awaiting three independent API calls one after another?**
> Each `await` pauses the function until that specific Promise resolves *before the next line even starts running* — so three independent, unrelated requests end up executing **sequentially** instead of in parallel, needlessly multiplying total wait time. If the calls don't depend on each other's results, kick them all off first (so all three requests are in flight simultaneously), then `await Promise.all([...])` once to wait for everyone together.

---

## 🍱 6. Closures, Revisited — Where This Actually Shows Up in Real Code

Part 2 §13 introduced closures conceptually ("a function bundled with references to its surrounding state"). This section is the deeper dive class notes gave it, plus concrete production use cases.

### The mental model: a function is a "tiffin box" carrying its birth-scope with it

```js
function makeFunc() {
  let name = "Mozilla";
  function displayName() {
    console.log(name);
  }
  return displayName;
}

const myFunc = makeFunc();
myFunc();   // "Mozilla" — displayName still has access to `name`, even though makeFunc() already finished running
```

> **"In JavaScript, closures are created every time a function is created, at function-creation time."** It's not a special, opt-in feature — it's the automatic, default behavior of every nested function. `displayName` isn't just returning a value; it's carrying a **live reference** to the entire scope it was defined in — its "lexical environment" — packed into a private "tiffin box" only that function can open.
>
> **Why "lexical"?** Because JS is a **lexically-scoped** language: a function looks for a variable it doesn't have locally by walking *outward*, through the chain of scopes exactly as they're **written** in the source code — not based on who called the function, or from where. `displayName` looks up `name` in `makeFunc`'s scope because that's *literally where it sits in the code*, regardless of who eventually calls `displayName()` or from where.

```js
function startCompany() {
  function ca(name) {
    return `Name of your company is ${name}`;
  }
  return ca;   // returns the FUNCTION's reference — does not call/execute it
}

const getMeACompany = startCompany();       // startCompany() runs once; `ca`'s closure is now held by getMeACompany
const myCompanyName = getMeACompany("Zomato");
console.log(myCompanyName);   // "Name of your company is Zomato"
```

`startCompany` is a **Higher-Order Function** (Part 1 §10) that also happens to rely on a closure — `getMeACompany` keeps `ca`'s reference alive and usable long after `startCompany()` itself has finished executing and its own execution context has popped off the call stack.

> **Every function you create gets its own closure, tied to it, automatically** — `makeFunc` gets one, `ca` gets one, every nested function gets one. The closure is memory held specifically for that one function, referencing whatever scope it was born inside — this is why closures are sometimes described as "each function carrying its own private tiffin box back to the kitchen it was made in."

### Real-world use #1: API rate limiting

```js
function createRateLimiter(maxRequestsPerWindow, windowMs) {
  let requestCount = 0;   // PRIVATE state — only accessible via the closure, invisible/unreachable from outside

  setInterval(() => {
    requestCount = 0;     // reset the window periodically
  }, windowMs);

  return function rateLimitedRequest(fn) {
    if (requestCount >= maxRequestsPerWindow) {
      throw new Error("Rate limit exceeded — try again later");
    }
    requestCount++;
    return fn();
  };
}

const limitedApiCall = createRateLimiter(3, 10000);   // max 3 calls per 10 seconds

limitedApiCall(() => console.log("Request 1"));   // OK
limitedApiCall(() => console.log("Request 2"));   // OK
limitedApiCall(() => console.log("Request 3"));   // OK
limitedApiCall(() => console.log("Request 4"));   // throws "Rate limit exceeded"
```

`requestCount` lives entirely inside `createRateLimiter`'s closure — no code outside `rateLimitedRequest` can read or tamper with it directly, exactly like the `#privateField` pattern in the Classes doc, but achieved purely through closures (the technique that predates `#private` fields by years, and still underlies how most rate limiters, counters, and caches are actually implemented).

### Real-world use #2: rate-limiting middleware in Express

```js
function createExpressRateLimiter(maxRequests, windowMs) {
  const requestCounts = new Map();   // closure state, shared across every request this middleware handles

  return function rateLimiterMiddleware(req, res, next) {
    const key = req.ip;   // rate-limit per client IP
    const currentCount = requestCounts.get(key) || 0;

    if (currentCount >= maxRequests) {
      return res.status(429).json({ error: "Too many requests" });
    }

    requestCounts.set(key, currentCount + 1);
    setTimeout(() => requestCounts.set(key, requestCounts.get(key) - 1), windowMs);

    next();   // pass control to the next Express handler
  };
}

// route.ts / app.ts
app.use("/api/", createExpressRateLimiter(100, 60000));   // 100 requests per IP per 60 seconds
```

`createExpressRateLimiter` is called **once**, when the server starts, and its `requestCounts` Map lives in that one closure for the **entire lifetime of the server process** — every incoming request runs `rateLimiterMiddleware`, and all of them share access to the exact same closed-over `Map`, letting the count persist correctly across every request without needing a global variable or a database round-trip.

### Real-world use #3: memoization / caching (the `useMemo` connection)

```js
function memoize(expensiveFn) {
  const cache = new Map();   // closure-held cache — private to this one memoized function

  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);   // cache hit — skip re-computation entirely
    }
    const result = expensiveFn(...args);
    cache.set(key, result);
    return result;
  };
}

const slowSquare = (n) => { for (let i = 0; i < 1e8; i++) {}; return n * n; };
const fastSquare = memoize(slowSquare);

fastSquare(5);   // slow — computes and caches
fastSquare(5);   // instant — pulled from the closure's cache
```

> **This is the exact same underlying idea as React's `useMemo` hook** — from class notes: *"React ka `useMemo()` hook, agar aapke function me kuchh change nahi hua hai, to us function ko reference me hold karke rakhta hai, optimisation ke liye."* If a function's inputs haven't changed, hold onto its previous result via a closure instead of recomputing it — trading a little memory for a lot of saved computation. The **cache/Redis analogy from class notes** makes the same point at the infrastructure level: a database read is comparatively expensive, so a fast in-memory cache (Redis, or here, a closure-held `Map`) sits in front of it so repeated identical requests never have to hit the slow path again.

### The "independent tiffin boxes" pattern — why each closure instance is isolated

```js
function eternal(guest) {
  const guestName = guest;
  let count = 0;

  function zomato() {
    console.log(`Hi ${guestName}, from zomato`);
  }
  function blinkit() {
    if (count === 1) return;   // one-time-only guard, held in THIS closure's own `count`
    console.log(`Hi ${guestName}, from blinkit`);
    count++;
  }

  return { zomato, blinkit };
}

const hitesh = eternal("hitesh");
const piyush = eternal("piyush");

hitesh.blinkit();   // Hi hitesh, from blinkit
hitesh.blinkit();   // (nothing — count is now 1, guard blocks it)
hitesh.blinkit();   // (nothing — still blocked)

piyush.blinkit();   // Hi piyush, from blinkit — INDEPENDENT of hitesh's count! separate closure, separate `count`
```

> **`hitesh.blinkit` and `piyush.blinkit` are two entirely separate closures**, each with its **own private `count`**, because `eternal(...)` was called twice, creating two independent execution contexts, each with its own "tiffin box" of `guestName` + `count`. This is precisely the mechanism a per-user rate limiter or per-session cache relies on: call the same factory function once per user/session, and each caller gets fully isolated private state, with zero risk of one user's counter leaking into another's.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references, `Symbol` intro, Numbers & `Math`, String methods, Array mutating vs non-mutating, Object methods, `arguments` object, pure vs impure functions, IIFE, closures (intro) |
| **3. Prototypes & Prototypal Inheritance** | Everything-is-an-object, the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills |
| **4. `this` Keyword** | `this` in every context, browser vs Node, detached methods, `call`/`bind`/`apply` + their polyfills, function constructors, `new` |
| **5. Classes & OOP** | `class` as syntactic sugar, `constructor`, `static` members, `extends`/`super`, public vs private (`#`) fields, `throw` vs `throw new Error` |
| **6. Error Handling** | The philosophy of error handling, `try`/`catch`/`finally` mechanics, the `Error` object, built-in error types, custom error classes |
| **7. Event Loop & Callbacks** | Single-threaded JS + outsourcing, callbacks & callback hell, what `fetch`/`setTimeout` actually are, the event loop, callback queue vs microtask queue |
| **8. Promises & Async** (this doc) | Promise states, `.then`/`.catch`/`.finally` chaining, `Promise.resolve/reject`, `Promise.all`/`allSettled`/`race`/`any`, `async`/`await`, sequential vs concurrent awaiting, closures deep-dive with real-world rate-limiting, Express middleware, and memoization examples |

*(Notes sourced from the Feb 28 2026 and March 1 2026 handwritten class notes (Promises, async/await, closures deep-dive), plus the `js-basics` code-along files `19-promises.js`, `20-promises.js`, `21-closure.js`. `Promise.any()`, the sequential-vs-concurrent await comparison, and the Express rate-limiter/memoization examples were extended beyond the raw notes as standing-syllabus supplementary material, directly building on the class's own rate-limiting and caching analogies. See [7-Event-Loop-Callbacks.md](7-Event-Loop-Callbacks.md) for the event loop mechanics Promises are built on top of.)*
