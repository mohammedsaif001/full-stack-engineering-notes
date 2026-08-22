# Closures, Currying & Real-World Patterns
## Part 7 of 17 — Closures Deep Dive, IIFE/Module Pattern, Currying, Composition, Debounce & Throttle

---

## 📌 Executive Summary

- A **closure** is not a special syntax or an opt-in feature — it's what automatically happens every time a function is defined inside another function: the inner function keeps a **live reference** to the scope it was born in, even after the outer function has finished running and its execution context has popped off the call stack.
- File 6 gave a first, informal glimpse of this with `makeMultiplier` — this file names the mechanism, explains *why* it works (lexical scoping — a function resolves outer variables based on **where it is written**, not who calls it or from where), and puts it to real use.
- An **IIFE** (Immediately Invoked Function Expression) runs once, immediately, and — combined with closures — is the classic technique for **privacy/encapsulation** in JavaScript: the **module pattern**.
- Three genuine production patterns run entirely on closures: **rate limiting**, **memoization/caching**, and **independent private state per instance** (call the same factory twice, get two fully isolated closures).
- New this file: **currying** (turning a multi-argument function into a chain of single-argument functions), **partial application** (pre-filling some arguments without full currying), **function composition** (`compose`/`pipe`), and **debounce/throttle** — both built directly as closures that hold private timer state between calls.

---

## 🧠 Core Analogy: The Employee Who Keeps a Copy of Their Onboarding Instructions

- Picture an employee who, on their first day, is handed a folder of instructions specific to the department they were hired into — a particular price list, a particular set of rules, a particular reference number. The employee keeps a personal copy of that folder in their desk.
- Years later, that original department might be **reorganized or shut down entirely** — but the employee still has their personal copy of the folder, and still works from it exactly as before. Nobody else in the company can read or edit that folder; it's theirs alone, tied to the moment they were hired.
- This is a **closure**: a function (the employee) permanently keeps access to the variables (the folder's contents) that existed in the scope where it was **defined** (the department at hiring time) — regardless of whether that outer scope (the department, i.e., the outer function's execution context) still exists by the time the function is actually used.
- Hire **two** employees into the same role at different times, each handed their own folder with their own values filled in (a different price, a different starting counter) — each employee's folder is **completely independent** of the other's, even though both were produced by hiring through the exact same job posting (the exact same outer function). This is the "independent closure instances" pattern covered in §4 below.

---

## 🔒 1. Closures — The Mechanism, Named and Explained

File 6 ended its Higher-Order Functions section with `makeMultiplier`, and explicitly deferred the mechanical explanation to this file:

```js
function makeMultiplier(factor) {
  return function (n) {
    return n * factor;
  };
}

const triple = makeMultiplier(3);
console.log(triple(5));   // 15
```

Here's the naming and the mechanism in full:

> A **closure** is the combination of a function **bundled together with references to its surrounding (lexical) state** — the variables that were in scope where the function was *defined*. A closure gives an inner function continued access to its outer function's variables, **even after the outer function has finished executing and its execution context has been popped off the call stack** (file 1, §4).

Walking through `makeMultiplier` with that definition in hand:

- `makeMultiplier(3)` runs, creates a Function Execution Context with `factor = 3`, defines the inner anonymous function, and **returns it**. `makeMultiplier`'s own execution context is then popped off the call stack — normally, that would mean `factor` is gone.
- It isn't gone. The returned function (now held in `triple`) keeps a **live reference** to the scope it was created in — including `factor`. Calling `triple(5)` still resolves `factor` to `3`, because that reference was captured at the moment the inner function was **defined**, not at the moment it's **called**.
- This is not something you opt into with special syntax — **every** nested function automatically closes over its outer scope. `triple` is a closure. So is every callback you've written since file 5. Most closures simply go unnoticed because the outer scope's variables aren't interesting enough to think about; `makeMultiplier` makes the mechanism visible because the whole point of the function is to produce a customized inner function.

### Why "lexical"? — scope is decided by where code is *written*

JavaScript is a **lexically scoped** (a.k.a. statically scoped) language: when a function references a variable it doesn't have locally, it looks **outward through the chain of scopes exactly as they are written in the source code** — not based on who calls the function or from where.

```js
function makeGreeter(role) {
  function greet(name) {
    return `Hello ${name}, your role is ${role}`;
  }
  return greet;
}

const greetAdmin = makeGreeter("admin");
const greetGuest = makeGreeter("guest");

console.log(greetAdmin("Sam"));   // "Hello Sam, your role is admin"
console.log(greetGuest("Sam"));   // "Hello Sam, your role is guest"
```

`greet` resolves `role` by looking at where it was **textually defined** — inside `makeGreeter` — regardless of which variable (`greetAdmin` or `greetGuest`) it's eventually called through, or where in the program that call happens. This is the same outward-scope-chain lookup file 2 introduced for scope in general; a closure is simply that lookup chain **staying alive** past the point where you'd normally expect the outer scope to be discarded.

### Dry-run: what actually stays in memory

```js
function counterFactory() {
  let count = 0;          // this variable is what gets "closed over"
  return function () {
    count++;
    return count;
  };
}

const counter = counterFactory();
console.log(counter());   // 1
console.log(counter());   // 2
console.log(counter());   // 3
```

- `counterFactory()` runs once, creates `count = 0`, defines the anonymous inner function, returns it, and pops off the call stack.
- `count` is **not** re-created on every call to `counter()` — it was created exactly once, at `counterFactory()`'s single invocation, and the returned function keeps mutating that **same** captured variable across calls. This is precisely how the returned function accumulates state (`1`, then `2`, then `3`) instead of resetting every time.

> **One-line mental model:** a closure isn't something you deliberately construct — it's simply what always happens when an inner function is defined inside an outer function. The outer scope's variables stay alive in memory for as long as some inner function still references them.

---

## 🎁 2. IIFE and the Module Pattern

> An **IIFE** (Immediately Invoked Function Expression) is a function that is defined and **executed immediately**, in the same statement, instead of being defined now and called later. It runs exactly once, the moment it's parsed.

```js
(function () {
  // runs immediately — no separate call needed
})();
```

All of the following are equivalent shapes — differing only in style:

```js
(function () {})();
(function () {})();
const store = (function () {})();
```

### Why use an IIFE — encapsulation via closures

```js
const inventoryStore = (function () {
  let stockCount = 0;   // PRIVATE — no outside code can reach `stockCount` directly

  return {
    addStock() {
      stockCount++;
      return `Stock added — new count: ${stockCount}`;
    },
    getStock() {
      return stockCount;
    },
  };
})();

console.log(inventoryStore);              // { addStock: [Function], getStock: [Function] }
console.log(inventoryStore.addStock());   // "Stock added — new count: 1"
console.log(inventoryStore.stockCount);   // undefined — stockCount is NOT exposed, it's private
```

- The IIFE runs **once**, immediately, and returns an object exposing only `addStock` and `getStock`. `stockCount` itself is never returned, so nothing outside the IIFE can read or overwrite it directly — the only way to affect it is through the methods the IIFE deliberately chose to expose.
- This is the classic pre-ES-Modules technique for **encapsulation/privacy** in JavaScript, and it works entirely because of closures: `addStock` and `getStock` keep a live reference to `stockCount` even after the IIFE itself has finished running and popped off the call stack — exactly the mechanism from §1.
- A function can return **anything** — a string, a number, another function, or, as here, a whole object of functions. Returning an object of closures that all share one private variable is the essence of the **module pattern**: a single hidden state, with a controlled public surface for interacting with it.

---

## 🚦 3. Real-World Use #1: Rate Limiting

A closure-held counter, private to one factory call, is the standard way to implement a rate limiter without a global variable:

```js
function createRateLimiter(maxRequestsPerWindow, windowMs) {
  let requestCount = 0;   // PRIVATE state — only reachable through the closure, invisible from outside

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
limitedApiCall(() => console.log("Request 4"));   // throws "Rate limit exceeded — try again later"
```

`requestCount` lives entirely inside `createRateLimiter`'s closure — no code outside `rateLimitedRequest` can read or tamper with it directly. This is the same idea as a private class field, but achieved purely through closures — a technique that predates language-level private fields by years and still underlies how most rate limiters, counters, and caches are actually implemented.

### The same pattern as server middleware

```js
function createRequestLimiterMiddleware(maxRequests, windowMs) {
  const requestCounts = new Map();   // closure state, shared across every request this middleware handles

  return function limiterMiddleware(req, res, next) {
    const key = req.ip;   // rate-limit per client IP
    const currentCount = requestCounts.get(key) || 0;

    if (currentCount >= maxRequests) {
      return res.status(429).json({ error: "Too many requests" });
    }

    requestCounts.set(key, currentCount + 1);
    setTimeout(() => requestCounts.set(key, requestCounts.get(key) - 1), windowMs);

    next();   // pass control to the next handler in the chain
  };
}

// server setup, run once at startup:
app.use("/api/", createRequestLimiterMiddleware(100, 60000));   // 100 requests per IP per 60 seconds
```

`createRequestLimiterMiddleware` is called **once**, when the server starts, and its `requestCounts` Map lives inside that one closure for the **entire lifetime of the server process**. Every incoming request runs `limiterMiddleware`, and all of them share access to the exact same closed-over `Map` — letting the count persist correctly across requests without a global variable or a database round-trip.

---

## 🧮 4. Real-World Use #2: Memoization / Caching

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

function slowSquare(n) {
  for (let i = 0; i < 1e8; i++) {}   // deliberately expensive
  return n * n;
}

const fastSquare = memoize(slowSquare);

fastSquare(5);   // slow — computes and caches
fastSquare(5);   // instant — pulled straight from the closure's cache
```

If a function's inputs haven't changed, hold onto its previous result via a closure instead of recomputing it — trading a small amount of memory for a large amount of saved computation. This is the same underlying idea used by caching layers in front of an expensive data source (a database, a slow API call): a fast, closure-held (or in-memory-cache-backed) lookup sits in front of the slow path so repeated identical requests never have to hit it again.

---

## 🔁 5. Real-World Use #3: Independent Closure Instances

Every call to a closure-returning factory function produces a **fully separate** closure, with its own private copy of whatever variables that call captured — calling the same factory twice never lets one caller's state leak into another's:

```js
function createNotifier(username) {
  let notificationCount = 0;

  function push() {
    if (notificationCount === 1) return;   // one-time-only guard, held in THIS closure's own count
    notificationCount++;
    console.log(`Notification sent to ${username}`);
  }

  function getCount() {
    return notificationCount;
  }

  return { push, getCount };
}

const userA = createNotifier("userA");
const userB = createNotifier("userB");

userA.push();   // "Notification sent to userA"
userA.push();   // (nothing — notificationCount is now 1, guard blocks it)
userA.push();   // (nothing — still blocked)

userB.push();   // "Notification sent to userB" — INDEPENDENT of userA's count, separate closure
console.log(userA.getCount());   // 1
console.log(userB.getCount());   // 1
```

`userA.push` and `userB.push` are two entirely separate closures, each with its **own private `notificationCount`**, because `createNotifier(...)` was called twice — creating two independent execution contexts, each holding its own captured `username` and `notificationCount`. This is precisely the mechanism a per-user rate limiter or per-session cache relies on: call the same factory function once per user/session, and each caller gets fully isolated private state, with zero risk of one user's state leaking into another's.

---

## 🪄 6. Currying — One Argument at a Time

> **Currying** is the technique of transforming a function that takes multiple arguments into a **sequence of functions, each taking exactly one argument**, where each function returns the next function in the chain until all arguments have been supplied.

```js
// A regular multi-argument function:
function addThree(a, b, c) {
  return a + b + c;
}
console.log(addThree(1, 2, 3));   // 6

// The same logic, curried — one argument per call:
function curriedAddThree(a) {
  return function (b) {
    return function (c) {
      return a + b + c;
    };
  };
}
console.log(curriedAddThree(1)(2)(3));   // 6
```

Each layer is a closure holding onto the argument(s) already supplied — `curriedAddThree(1)` returns a function that has closed over `a = 1`; calling that with `(2)` returns a function that has closed over both `a = 1` and `b = 2`; calling *that* with `(3)` finally has all three values in scope and computes the result. Currying is a direct, practical application of §1 — nothing new is happening mechanically, only the shape of the API changes.

### A generic curry helper

Rather than hand-nesting functions for every arity, a generic `curry` helper can convert any regular function into its curried form automatically:

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {          // fn.length = number of declared parameters
      return fn(...args);                     // enough arguments collected — call the original
    }
    return function (...moreArgs) {
      return curried(...args, ...moreArgs);   // keep collecting, closing over what's gathered so far
    };
  };
}

function multiplyThree(a, b, c) {
  return a * b * c;
}

const curriedMultiply = curry(multiplyThree);

console.log(curriedMultiply(2)(3)(4));       // 24
console.log(curriedMultiply(2, 3)(4));       // 24 — arguments can be grouped
console.log(curriedMultiply(2, 3, 4));       // 24 — or supplied all at once
console.log(curriedMultiply(2)(3, 4));       // 24 — any grouping works
```

`curried` is itself a closure: on every call that doesn't yet have enough arguments, it returns a new function that closes over `args` (everything collected so far) and merges in whatever comes next. `fn.length` reads the original function's declared parameter count, which is how the helper knows when to stop collecting and actually invoke `fn`.

---

## ✂️ 7. Partial Application — Pre-Filling Some Arguments

**Partial application** is related to currying but distinct: it produces a new function with **some** arguments permanently fixed, while the rest are still supplied normally, in one remaining call — there's no requirement that every subsequent call take exactly one argument.

```js
function partial(fn, ...presetArgs) {
  return function (...remainingArgs) {
    return fn(...presetArgs, ...remainingArgs);   // closure holds presetArgs between the two calls
  };
}

function sendMessage(protocol, recipient, body) {
  return `[${protocol}] to ${recipient}: ${body}`;
}

const sendEmail = partial(sendMessage, "EMAIL");   // "protocol" is now permanently fixed

console.log(sendEmail("team@example.com", "Deployment complete"));
// "[EMAIL] to team@example.com: Deployment complete"

console.log(sendEmail("ops@example.com", "Server restarted"));
// "[EMAIL] to ops@example.com: Server restarted"
```

### Currying vs. partial application — the distinction

| | Currying | Partial application |
|---|---|---|
| Shape of each call | Always exactly **one** argument per call | Any number of remaining arguments in the final call |
| Result of a partial call | Always another single-argument function | A function expecting all remaining arguments at once |
| Goal | Transform the function's calling shape entirely | Pre-fill specific arguments, leave the rest flexible |
| Example | `add(1)(2)(3)` | `sendEmail(recipient, body)` — protocol already fixed |

Both rely on the exact same mechanism — a closure holding onto arguments already supplied, across separate calls — they simply differ in how many arguments each intermediate call is willing to accept.

---

## 🧩 8. Function Composition — `compose` and `pipe`

**Function composition** builds a new function by chaining several single-input functions together, feeding each one's output into the next one's input.

```js
function double(n) {
  return n * 2;
}
function increment(n) {
  return n + 1;
}
function square(n) {
  return n * n;
}
```

### `compose` — right to left

```js
function compose(...fns) {
  return function (initialValue) {
    return fns.reduceRight((acc, fn) => fn(acc), initialValue);
  };
}

const composed = compose(square, increment, double);
// runs double FIRST, then increment, then square (right to left)

console.log(composed(3));   // double(3)=6 -> increment(6)=7 -> square(7)=49
```

### `pipe` — left to right

```js
function pipe(...fns) {
  return function (initialValue) {
    return fns.reduce((acc, fn) => fn(acc), initialValue);
  };
}

const piped = pipe(square, increment, double);
// runs square FIRST, then increment, then double (left to right)

console.log(piped(3));   // square(3)=9 -> increment(9)=10 -> double(10)=20
```

`compose` and `pipe` are each a closure over the `fns` array passed in — the returned function remembers exactly which functions to run, and in what order, every time it's later invoked with a starting value. The only difference between them is the direction `reduce` walks the array (`reduce` for left-to-right, `reduceRight` for right-to-left); the underlying mechanism — a closure holding onto a list of functions gathered at creation time — is identical to every other pattern in this file.

---

## ⏱️ 9. Debounce — Wait for Quiet Before Acting

> **Debounce** delays invoking a function until a certain amount of time has passed **without it being called again** — every new call resets the timer. It's used when only the *final* call in a rapid burst matters.

```js
function debounce(fn, delayMs) {
  let timeoutId;   // closure-held timer reference, shared across every call to the debounced function

  return function debounced(...args) {
    clearTimeout(timeoutId);          // cancel any pending call from a previous invocation
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}
```

### Scenario: a search box that shouldn't fire a request on every keystroke

```js
function fetchSearchResults(query) {
  console.log(`Fetching results for: "${query}"`);
  // in a real app: an actual network request would go here
}

const debouncedSearch = debounce(fetchSearchResults, 300);

searchInput.addEventListener("input", (event) => {
  debouncedSearch(event.target.value);
});
```

Typing "javascript" fires an `input` event per keystroke — eleven events in quick succession. Without debouncing, that's eleven network requests, ten of them wasted on partial, immediately-obsolete queries. With `debounce`, every keystroke **cancels** the previously scheduled call and schedules a new one 300ms out; only once typing actually pauses for 300ms does `fetchSearchResults` finally run — exactly once, with the final, complete query. `timeoutId` is what makes this possible: it's a single variable, closed over by `debounced`, that persists across every call and lets each new call cancel the one before it.

---

## 🎯 10. Throttle — At Most Once Per Interval

> **Throttle** guarantees a function runs **at most once** per fixed time interval, no matter how many times it's called during that interval — unlike debounce, it doesn't wait for quiet; it lets calls through on a steady schedule.

```js
function throttle(fn, intervalMs) {
  let isThrottled = false;   // closure-held flag, shared across every call to the throttled function

  return function throttled(...args) {
    if (isThrottled) return;   // inside the cooldown window — drop this call
    fn(...args);
    isThrottled = true;
    setTimeout(() => {
      isThrottled = false;     // cooldown over — the next call is allowed through
    }, intervalMs);
  };
}
```

### Scenario: a scroll handler that shouldn't run on every pixel of scroll

```js
function logScrollPosition() {
  console.log(`Scroll position: ${window.scrollY}`);
}

const throttledScrollLog = throttle(logScrollPosition, 200);

window.addEventListener("scroll", throttledScrollLog);
```

A `scroll` event can fire dozens of times per second during a fast scroll gesture. Without throttling, `logScrollPosition` runs on every single one of them — far more often than any UI update actually needs. With `throttle`, the first scroll event runs it immediately, then `isThrottled` blocks every subsequent call for the next 200ms regardless of how many scroll events arrive in that window, and the cooldown then resets, letting the next event through. `isThrottled` is the closure-held state that makes the cooldown possible across calls that are otherwise completely independent invocations of `throttledScrollLog`.

### Debounce vs. throttle — the distinction

| | Debounce | Throttle |
|---|---|---|
| Fires | Once, after calls **stop** for `delayMs` | At most once per `intervalMs`, on a steady cadence |
| Best for | Search-as-you-type, resize-end, autosave-on-pause | Scroll handlers, mousemove tracking, button-spam prevention |
| Rapid burst of 20 calls | Runs the wrapped function **once**, after the burst ends | Runs the wrapped function **several times**, evenly spaced |
| Closure state held | A single pending `timeoutId` | A single `isThrottled` boolean (or a last-run timestamp) |

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| Closure | A function + a live reference to the scope it was defined in — survives after the outer function returns |
| Lexical scoping | Variable lookup follows where code is *written*, not where/how it's called |
| IIFE | `(function () { ... })()` — defined and invoked immediately, runs once |
| Module pattern | An IIFE returning an object of closures sharing one private variable |
| Rate limiting via closure | A counter/Map held in the closure, private to one factory call |
| Memoization | A closure-held `Map` cache keyed by stringified arguments |
| Independent closure instances | Each call to the factory creates fully separate, isolated private state |
| Currying | `f(a)(b)(c)` — one argument per call, each layer a closure over args-so-far |
| Partial application | Pre-fill some arguments now, supply the rest together in one later call |
| Composition (`compose`) | Chains functions right to left: `compose(f, g, h)(x)` = `f(g(h(x)))` |
| Composition (`pipe`) | Chains functions left to right: `pipe(f, g, h)(x)` = `h(g(f(x)))` |
| Debounce | Delays until calls stop for `delayMs` — fires once, at the end of a burst |
| Throttle | Fires at most once per `intervalMs` — steady cadence during a burst |

---

## 🎯 Key Takeaways

- A closure is not special syntax — it's the automatic result of defining a function inside another function; the inner function keeps a live reference to its defining scope, which is why that scope's variables survive even after the outer function's execution context has popped off the call stack. File 6's `makeMultiplier` was already an example of this before it had a name.
- Lexical scoping means a function resolves outer variables based on where it was **written** in the source, never based on who calls it or from where — this is *why* closures work.
- IIFEs, combined with closures, produce the module pattern — a way to expose a controlled public surface while keeping internal state genuinely private, predating language-level private class fields by years.
- Rate limiting, memoization, and independent per-call private state are three genuine production patterns that all run on nothing but a closure holding a piece of state between calls.
- Currying reshapes a function into a chain of single-argument calls; partial application pre-fills some arguments while leaving the rest flexible; composition (`compose`/`pipe`) chains single-input functions together — all three are closures holding onto "what's been supplied/chained so far."
- Debounce (wait for quiet, then fire once) and throttle (fire at most once per interval) are both closures holding a piece of private timer/flag state across every call to the function they wrap — the same mechanism as every other pattern in this file, applied to timing.

---

## 📚 Related Concepts to Explore Next

This file named and fully explained the closure mechanism that [06-Functions-Deep-Dive.md](./06-Functions-Deep-Dive.md) deliberately left informal in its `makeMultiplier` example, and put it to work in production patterns (rate limiting, memoization, isolated per-instance state) plus new derived techniques (currying, partial application, composition, debounce, throttle). The next file, [08-Arrays-Objects-Mastery.md](./08-Arrays-Objects-Mastery.md), moves from functions to data structures — array methods (mutating and non-mutating, chained together), object methods, and property-descriptor controls like `Object.freeze`/`Object.seal` — several of which (`map`, `filter`, `reduce`, already used as loop constructs in file 5) are themselves everyday Higher-Order Functions taking closures as callbacks.

---

## 🔗 Resources

- [MDN — Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [MDN — IIFE (Immediately Invoked Function Expression)](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)
- [MDN — Function.prototype.length](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length)
- [MDN — Array.prototype.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
