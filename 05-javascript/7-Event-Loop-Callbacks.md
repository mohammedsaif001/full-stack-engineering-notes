# JavaScript: The Event Loop, Callbacks & Async Foundations
## Part 7 of N — How Single-Threaded JS Handles "Waiting"

---

## 📌 Executive Summary: The Big Picture

- **JavaScript runs on a single thread — one call stack, one thing happening at a time.** So how does it "wait" for a network request without freezing the whole page? → It doesn't wait at all. It **hands the waiting off** to something outside the engine, and gets notified later.
- **What is a callback, really?** → Just a function — a "call back to me when you're done" instruction handed off along with the outsourced work.
- **When a `setTimeout` and a resolved `Promise` are both waiting to run, which goes first — and why does that matter?** → The event loop enforces a strict priority order (microtasks before macrotasks) that explains a huge share of "why did my async code run in this weird order" confusion.
- **What are `fetch`, `setTimeout`, and the DOM, really?** → Not part of the JS language itself — they're Web APIs / Node APIs, handed to the engine by the browser or Node runtime (first introduced in Part 2 §5).

---

## 🧠 Core Analogy: Abhinav's Restaurant Kitchen

- **Abhinav** = the JS engine's single thread — one chef, one set of hands, cooking one dish at a time.
- Abhinav personally does the things that need his direct attention right now: **chopping, masala, frying, gravy, plating.**
- Anything Abhinav *can't* or *shouldn't* handle himself — waiting for a delivery, waiting for water to boil, waiting for a network call to some other kitchen — he **hands off to outsourcing**: someone else (the browser's Web APIs, Node's `libuv`) takes care of it in the background while Abhinav keeps cooking other dishes.
- When the outsourced task finishes, it doesn't just barge back into the kitchen and interrupt Abhinav mid-chop — it gets in **line at the pass** (the callback queue) and waits its turn.
- **The event loop is the kitchen manager** whose only job is: constantly check — *"is Abhinav's hands free right now (is the call stack empty)? If yes, is there a finished order waiting in line? Bring it to him."*

---

## 🧵 1. JavaScript Is Single-Threaded — and Has Its Own "Outsourcing"

> **JavaScript is a single-threaded language** — it has exactly one call stack, and can only execute one piece of code at a time, line by line. Everything that runs directly on that one thread is **synchronous**: each operation must fully complete before the next one begins.

```js
console.log("Swastik");
console.log("Avishek");
// Swastik
// Avishek
// — nothing here can "jump the queue"; it's strict line-by-line order
```

But JS clearly *does* handle things that take unpredictable amounts of time — network requests, timers, file reads — without freezing. It does this by **outsourcing** the waiting part to something outside its own single thread: the **Web APIs** (in a browser) or **`libuv`** (in Node.js) — the same host-provided capabilities introduced in Part 2 §5. JS hands the task off, keeps running other code, and gets notified via a **callback** once the outsourced work is done.

> **Note: function, method, callback, resolve — these are all fundamentally "just a function."** A callback is nothing exotic — it's the same first-class function value from Part 1, just handed to something else with the instruction "call this when you're finished."

---

## 📞 2. Callbacks — The Original Way to Handle "Later"

> A **callback** is a function passed into another function, to be invoked once that other function's (often asynchronous) work is complete. It was the original mechanism for async JS, before Promises existed.

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
function prepareOrderCB(dish, cb) {
  setTimeout(() => cb(null, { dish, status: "prepared" }), 100);
}
function pickupOrderCB(order, cb) {
  setTimeout(() => cb(null, { ...order, status: "picked-up" }), 100);
}
function deliverOrderCB(order, cb) {
  setTimeout(() => cb(null, { ...order, status: "delivered" }), 100);
}

prepareOrderCB("Biryani", (err, order) => {
  if (err) return console.log(err);
  pickupOrderCB(order, (err, order) => {
    if (err) return console.log(err);
    deliverOrderCB(order, (err, order) => {
      if (err) return console.log(err);
      console.log(`${order.dish}: ${order.status}`);   // Biryani: delivered
    });
  });
});
```

> **"Callback Hell" / the Pyramid of Doom.** Notice the convention: every callback here takes `(err, result)` as its first two parameters — "error-first" callbacks, the standard Node.js pattern for handling failure without `try`/`catch` (since you can't `try`/`catch` around an operation that hasn't finished yet). Each step must nest *inside* the previous step's callback to run in sequence, and every single level needs its own `if (err) return ...` check. Real-world chains of 5+ async steps become deeply nested, hard-to-read "pyramids" — this exact pain point is what **Promises** (next section, and the Promises & Async doc) were designed to fix, by letting you `.then()`-chain steps instead of nesting them.
>
> **Rule of thumb from class notes:** don't use a callback purely to hold/return a reference to data — that's what a `Promise` exists to do properly (see the next doc). Callbacks are best reserved for "run this when the async work finishes," not as a general data-passing mechanism.

---

## 🌐 3. What `fetch`/`setTimeout` Actually Are, and Who Does the Work

```
Const data = fetch(url)     ← this line just returns a REFERENCE (a Promise) immediately

┌─────────────┐        ┌──────────────────┐
│  fetch()    │───────▶│  Object = {       │
│  (JS side)  │        │   state: pending  │
└─────────────┘        │   thenArray: [fn] │
                        │   catchArray:[fn] │
                        │  }                │
                        └──────────────────┘
                               ▲
                               │ eventually filled in by...
                        ┌──────────────┐
                        │  OS → Network │
                        │      call     │
                        └──────────────┘
```

- `fetch()` **immediately returns a reference** (a Promise object) — it does **not** wait for the network response. That Promise object internally holds a `state` (`pending`/`resolved`/`rejected`), plus arrays of callback functions waiting to be told the outcome (`thenArray`, `catchArray` — the notebook's informal name for what `.then()`/`.catch()` register internally).
- **`fetch()` is not part of the JavaScript language itself.** Neither is `setTimeout`, `console`, or the DOM. JS *cannot* make a web/network call on its own — this capability is provided entirely by the **host environment**: `fetch` is a **Web API** in the browser (or built on Node's `undici`/`libuv` in Node). This is the exact same distinction Part 2 §5 draws between "pure JS" and "what the runtime hands JS."
- The actual network request is carried out by the **operating system**, which hands the result back once it arrives; the runtime then updates the Promise's internal state and schedules the waiting callbacks to run.

| Tool | Provided by | Job |
|---|---|---|
| `fetch` | Browser (Web API) / Node (`undici`) | Kicks off a network request, returns a Promise immediately |
| `setTimeout` | Browser (Web API) / Node (`libuv`) | Starts a timer, returns immediately, calls back after the delay |
| `console` | Browser DevTools / Node stdout | Output — not JS language spec at all |
| `DOM` | Browser only | Live tree representation of the page |

---

## 🔁 4. The Event Loop, Callback Queue, and Microtask Queue

```
                       ┌─────────────┐
   (Abhinav)           │  Event Loop │        outsourcing ka kaam
   ┌──────────┐        │  (manager)  │        JS "queue" bolta hai
   │  Call    │◀───────│             │
   │  Stack   │        └──────┬──────┘
   └──────────┘               │
        ▲                     │ "is the stack empty? bring the
        │                     │  next finished item over"
        │              ┌──────▼──────┐
        └──────────────│   Callback   │
                        │    Queue     │
                        └─────────────┘
```

> **The event loop's entire job: constantly check whether the call stack is empty, and if it is, pull the next completed task from the queue and push it onto the stack to run.** It "keeps in mind" what the callback needs to do next, and reads through your code file, moving finished background work back onto the single thread only when that thread is actually free.

- Work you write directly (**`callStack`**) always executes **immediately** — whatever lands on the stack runs to completion before the stack empties again.
- Once something is outsourced (a timer, a network call) and finishes, it doesn't interrupt what's currently running — it waits in a **queue** until the call stack is completely empty, and the event loop moves it over.

### Two separate queues, with a strict priority order

```
Sync (Abhinav ji)  →  runs FIRST, always — synchronous code, top to bottom

                    Macro Task Queue  ←──  Timers (setTimeout, setInterval)
Work getting done   Micro Task Queue  ←──  Promises (.then/.catch/.finally, async/await)
```

| Queue | Holds | Priority |
|---|---|---|
| **Microtask queue** | Promise callbacks (`.then`, `.catch`, `.finally`, code after `await`) | **Checked first** — and fully drained before the next macrotask runs |
| **Macrotask queue** | `setTimeout`, `setInterval` callbacks, I/O | Checked only **after** the microtask queue is completely empty |

> **The rule, from class notes:** *"Sabse pehle scan karo synchronous ko, hatado (execute karo). Phir promise microtask, tab timers macrotask."* — First, all synchronous code runs to completion. Then the **entire** microtask queue is drained (every pending Promise callback runs, even ones that get added *during* this draining). **Only after the microtask queue is completely empty** does the event loop check the macrotask queue and pull the next timer callback.

### Worked example

```js
console.log("Swastik");                          // 1. synchronous — runs immediately

Promise.resolve("resolved value").then((v) => {
  console.log("Microtask", v);                    // 3. microtask — after ALL sync code, before any macrotask
});

console.log("Avishek");                           // 2. synchronous — runs immediately
```

**Output:**
```
Swastik
Avishek
Microtask resolved value
```

Even though the `.then()` callback was registered *before* `console.log("Avishek")` finished, it still runs **after** all synchronous code — because microtasks never preempt currently-running synchronous code; they only run once the call stack is empty.

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

> **Interview question: why does a `setTimeout(fn, 0)` NOT run immediately, and why does a microtask beat it even with a 0ms delay?**
> Two separate reasons stack together here. First: `setTimeout` **always** hands its callback to the browser/Node's timer facility, which only re-queues it back onto the macrotask queue after the call stack is empty — a `0`ms delay means "as soon as possible," not "synchronously now." Second: even once the call stack is empty, the event loop's rule is to **fully drain the microtask queue before touching the macrotask queue at all** — so any pending Promise callback, regardless of when it was scheduled, always runs before the next macrotask, every single time.

---

## 🧩 5. `Symbol.iterator` — Powering `for...of` (a related "hand-off" mechanism)

While not part of the event loop itself, `Symbol.iterator` is a related "here's how to hand control back and forth" protocol worth knowing alongside async iteration patterns:

```js
const rtiQueryBook = {
  queries: ["Infra budget", "Ration Card", "Education budget", "Startup laws"],
  [Symbol.iterator]() {
    let index = 0;
    const queries = this.queries;
    return {
      next() {
        if (index < queries.length) {
          return { value: queries[index++], done: false };
        }
        return { value: undefined, done: true };
      },
    };
  },
};

for (const query of rtiQueryBook) {
  console.log(`Filing RTI: ${query}`);
}
// Filing RTI: Infra budget
// Filing RTI: Ration Card
// Filing RTI: Education budget
// Filing RTI: Startup laws
```

> Defining `[Symbol.iterator]` on a plain object is what makes it work with `for...of` at all — plain objects aren't iterable by default (Part 2 §10 notes this same limitation, solved there via `Object.entries()`). This is the exact mechanism arrays, strings, `Map`, and `Set` already have built in, which is *why* `for...of` works on them natively.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references, `Symbol` intro, Numbers & `Math`, String methods, Array mutating vs non-mutating, Object methods, `arguments` object, pure vs impure functions, IIFE, closures |
| **3. Prototypes & Prototypal Inheritance** | Everything-is-an-object, the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills |
| **4. `this` Keyword** | `this` in every context, browser vs Node, detached methods, `call`/`bind`/`apply` + their polyfills, function constructors, `new` |
| **5. Classes & OOP** | `class` as syntactic sugar, `constructor`, `static` members, `extends`/`super`, public vs private (`#`) fields, `throw` vs `throw new Error` |
| **6. Error Handling** | The philosophy of error handling, `try`/`catch`/`finally` mechanics, the `Error` object, built-in error types, custom error classes |
| **7. Event Loop & Callbacks** (this doc) | Single-threaded JS + outsourcing, callbacks & callback hell, what `fetch`/`setTimeout` actually are, the event loop, callback queue vs microtask queue and their priority order, `Symbol.iterator` |
| **8. Promises & Async** *(planned)* | Promise states, `.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`/`race`/`any`, `async`/`await`, closures in real-world rate limiting |

*(Notes sourced from the Feb 28 2026 handwritten class notes (Async JavaScript — the Abhinav kitchen/outsourcing analogy, event loop, micro/macrotask queues), plus the `js-basics` code-along file `18-promises.js` (callback-chain example) and `16-Symbol.js` (`Symbol.iterator`). See [6-Error-Handling.md](6-Error-Handling.md) for try/catch, and the next doc for how Promises formalize the callback pattern shown here.)*
