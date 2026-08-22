# JS Engine, Runtime & Developer Tools
## Part 1 of 17 — How JavaScript Actually Runs

---

## 📌 Executive Summary

- JavaScript is just a language specification (ECMAScript) — it needs a **JS engine** (V8, SpiderMonkey, JavaScriptCore) to parse, compile, and actually execute it.
- A **runtime** is bigger than the engine: it's the engine plus a set of extra capabilities (DOM, `fetch`, timers, file system) that the engine alone doesn't provide.
- **Node.js** takes the V8 engine out of the browser and bundles it with a different set of capabilities (file system, networking), letting JavaScript run on servers, in CLIs, and in scripts.
- JavaScript is **dynamically and loosely typed** — a variable's type isn't fixed, and types are checked while the code runs, not before.
- Code can be added to a page inline or via an external file, and **browser DevTools** (Elements, Console, Sources, Network, Performance) are the primary window into what that code is actually doing — starting with `console.log` and its more specialized siblings.
- Every line of JS runs inside an **Execution Context**, and the **Call Stack** is what tracks which context is currently active as functions call other functions.

---

## 🧠 Core Analogy: The Restaurant Kitchen

- **JS Engine** = the kitchen itself. It takes an order (your code) and turns it into a finished dish (a running program) — nothing happens in the restaurant without it.
- **Runtime** = the entire restaurant building, not just the kitchen. The kitchen (engine) can only cook — it has no phone to take delivery calls, no delivery bike, no dining room. The *restaurant* (runtime) supplies those extra capabilities around the kitchen.
- **Call Stack** = the head chef's to-do pile. Whatever order sits on top gets worked on right now; once it's finished it's taken off the pile, and the chef moves to whatever's underneath.
- **DevTools** = the security camera and order-ticket system installed throughout the restaurant — you don't need to guess what's happening in the kitchen; you can watch it directly.

---

## 🏗️ 1. What Is a JS Engine? (Parsing, Compiling, Executing)

Every programming language needs something that turns human-readable source code into instructions a CPU can actually run. Compiled languages have a dedicated compiler for the job: `C`/`C++` code goes through a C++ compiler, `Java` goes through a Java compiler. JavaScript's equivalent is the **JS engine**.

A JS engine is a program that takes your `.js` source code and works through three broad stages to make it run:

1. **Parsing** — the engine reads your source code character by character and converts it into a structured tree representation (an Abstract Syntax Tree, or AST), while also checking for syntax errors.
2. **Compiling** — the AST is translated into a lower-level form the machine can work with. Modern engines like V8 use **Just-In-Time (JIT) compilation** — they compile code to machine code on the fly, and continuously re-optimize "hot" code paths (code that runs often) while the program is still executing.
3. **Executing** — the compiled instructions actually run on the CPU, producing the program's real behavior and output.

This is worth calling out explicitly because JavaScript is often loosely described as an "interpreted language," which suggests the engine reads and runs code line by line with no compilation step at all. That description is outdated for modern engines: V8 (and its peers) genuinely compile JavaScript — they just do it just-in-time, mixed in with execution, rather than as a separate step you run beforehand like `gcc` on a C file.

| Engine | Ships inside | Written in |
|---|---|---|
| **V8** | Chrome, Node.js, Edge | C++ |
| **SpiderMonkey** | Firefox | C++ |
| **JavaScriptCore (Nitro)** | Safari (WebKit) | C++ |

Without an engine present, a browser cannot run JavaScript at all — the `<script>` tag would be inert. Browsers natively understand exactly three things: HTML, CSS, and JS. The engine is what makes the third one possible, turning JS source into machine code the CPU can execute:

```
┌────────────────────────────┐
│   Chrome (V8 Engine)       │
│                             │
│   JS  ──────────────▶ machine code
└────────────────────────────┘
```

---

## 🌐 2. Engine vs Runtime — Two Different Things

It's easy to use "JS engine" and "JavaScript runtime" interchangeably, but they are not the same thing, and the distinction matters the moment you ask "why can JS in the browser touch the DOM, but plain JS itself has no idea what a `<div>` is?"

- The **engine** is purely a computation machine. It understands JavaScript syntax and semantics — variables, functions, loops, objects — and nothing more. It has no built-in concept of a webpage, a network request, or a file on disk.
- The **runtime** is the engine *plus* a host environment that bolts on extra capabilities the engine doesn't natively have: the DOM API, `fetch`, `setTimeout`, `localStorage` (in a browser), or the file system and networking modules (in Node.js).

So `fetch(...)` or `document.querySelector(...)` are not part of the JavaScript language itself — they are APIs the **runtime** hands to the engine. Drop the same `.js` file into a context with no runtime capabilities around it, and calls like those would simply not exist.

This is why "browser JavaScript" and "Node.js JavaScript" can feel like slightly different languages even though they share the exact same engine (V8) and the exact same core language rules — the *runtime* wrapped around that engine is different in each case, exposing different extra APIs.

---

## 🟢 3. Node.js: JavaScript Outside the Browser

- Created by **Ryan Dahl**.
- Node.js is **not** a framework and **not** a library — it is a **runtime environment** for JavaScript, in the same sense described above.
- It embeds the V8 engine (the same engine Chrome uses) and wraps it with a different set of runtime capabilities suited to servers, command-line tools, and scripts: file system access, networking, process management — none of which a browser exposes, because a browser has no business reading arbitrary files off your hard drive.

The practical result: the same JavaScript language you write for a webpage can also run a backend server, a build tool, or a CLI script, because the *engine* doing the computation is portable — only the *runtime* around it changes.

---

## 🔀 4. JavaScript Is Dynamically & Loosely Typed

Two related but distinct properties describe how JavaScript handles types:

- **Loosely typed**: a variable's type is not fixed once assigned. The same variable can hold a number, then later hold a string, with no error:

  ```js
  let x = 5;
  x = "hello";   // perfectly legal — no type error
  ```

- **Dynamically typed**: types are checked at **runtime** — while the code is executing — rather than ahead of time, before the program ever runs.

This is a deliberate design tradeoff: it makes JavaScript flexible and fast to write, but it also means a whole category of bugs (calling a function on the wrong type of value) only surfaces when that exact line actually executes, not before.

**TypeScript** exists largely to address this. It's a strongly/statically typed **superset** of JavaScript — you write extra type annotations, and a separate step checks those types *before* the code ever runs. Since browsers can't execute `.ts` files directly, TypeScript is compiled ("transpiled") down to plain JavaScript first. It's best understood as "JavaScript, with a type-checker bolted on before shipping" — the JS engine itself never sees or enforces the type annotations at all.

---

## 🛠️ 5. Adding JavaScript to a Page

There are two ways to attach JavaScript to an HTML document:

```html
<!-- Internal: written directly inside the HTML file -->
<script>
  console.log("hello");
</script>

<!-- External: linked from a separate .js file -->
<script src="./app.js"></script>
```

Where that `<script>` tag sits — and which loading attribute it uses — changes *when* the script runs relative to the page's HTML being parsed:

| Placement / attribute | Behavior |
|---|---|
| `<script>` in `<head>`, no attribute | Blocks HTML parsing immediately: the browser stops building the page, fetches and runs the script right there, then resumes parsing. Can make a page feel slow to appear if the script is large. |
| `<script>` right before `</body>` | The classic workaround — by the time the browser reaches this tag, the rest of the HTML has already been parsed and the DOM exists, so the script can safely query/manipulate elements without race conditions. |
| `<script defer src="...">` | Downloads the script **in parallel** with HTML parsing, but delays *running* it until parsing is completely finished — and multiple `defer` scripts run in the order they appear in the document. Generally the best default for scripts that need the full DOM. |
| `<script async src="...">` | Downloads in parallel too, but runs the script **the instant it finishes downloading**, potentially interrupting HTML parsing to do so — and gives no guarantee about execution order relative to other scripts. Best suited to independent scripts (e.g. analytics) that don't touch the DOM and don't depend on other scripts. |

A quick way to keep `defer` and `async` straight: `defer` says "wait until the page is ready, and keep script order intact"; `async` says "run me the moment I'm downloaded, order be damned."

---

## 🔍 6. Browser DevTools: A Tour

Every modern browser ships a set of developer tools built directly into it — in Chrome, opened with `F12` or `Ctrl+Shift+I` (`Cmd+Option+I` on macOS). The panels you'll live in day to day:

| Tab | Purpose |
|---|---|
| **Elements** | Inspect and live-edit the page's HTML and CSS as it's actually rendered right now (not just the original source file) |
| **Console** | Your JavaScript output and a place to run JS interactively — functions like a terminal scoped to the current page |
| **Sources** | Shows the actual loaded source files — what's loading from where, and lets you set breakpoints to pause execution and step through code |
| **Network** | Lists every external request the browser makes — API calls, images, stylesheets, scripts — with timing and status for each |
| **Performance** | A profiler — records what the page is doing over time so you can see exactly where time is being spent |

> **DevTools tip:** pasting multi-line code directly into the Console is blocked by default, as an anti-self-XSS measure (it stops attackers from tricking users into pasting malicious code). Type `allow pasting` into the console first, or click through the warning, to enable it.

The Console panel is the one you'll use constantly while learning and debugging, which makes `console` itself worth knowing well.

---

## 🖨️ 7. `console.log` and Its Lesser-Known Siblings

`console` is not part of the JavaScript language specification at all — it's a **host object**, supplied by the runtime (the browser or Node), which is why its exact method set can vary slightly between environments. Its core methods, however, are effectively universal:

```js
console.log("Clue found: ", "Muddy footprint near the window");

console.warn("Fingerprint evidence detected");   // yellow, non-fatal warning icon
console.error("Fingerprint evidence detected");  // red, error-level — usually includes a stack trace
```

| Method | Purpose |
|---|---|
| `console.log()` | General-purpose output — the one you'll use most |
| `console.warn()` | Flags something concerning but non-fatal |
| `console.error()` | Flags a genuine error, usually with a stack trace attached |
| `console.table()` | Renders array-of-objects data as an actual table |
| `console.group()` / `console.groupEnd()` | Visually nests a block of logs under a collapsible header |
| `console.time()` / `console.timeEnd()` | Measures how long the code between the two calls took to run |

### `console.table` — structured data at a glance

```js
const evidenceLog = [
  { id: 1, item: "Muddy footprint", location: "Window sill" },
  { id: 2, item: "Broken glass", location: "Living room" },
  { id: 3, item: "Red fiber strand", location: "Door handle" },
];

console.table(evidenceLog);
```

This renders as an actual table in DevTools, with columns `id`, `item`, and `location` — far easier to scan at a glance than a wall of individual `console.log` calls.

### `console.group` — nesting related logs

```js
console.group("Group starts");
console.log("My log 1");
console.log("My log 2");
console.log("My log 3");
console.groupEnd();
```

All three logs appear visually indented under a collapsible "Group starts" header, which is useful when a single operation produces several related log lines you want to keep visually together.

### `console.time` — measuring performance informally

```js
console.time("loop duration");

let matches = 0;
for (let i = 0; i < 1_000_000; i++) {
  matches++;
}

console.timeEnd("loop duration");   // prints: "loop duration: 4.2ms" (or similar)
```

Both calls must share the exact same label string to pair up correctly. This is useful for quick, informal performance checks — it is not a substitute for the Performance tab's proper profiler when you need real, reliable measurements.

### Numeric literal separators — `1_000_000`

```js
const lightSpeedMetersPerSecond = 299_792_458;
```

The underscore `_` inside a number literal is a **visual separator only** — it has zero effect on the value: `299_792_458 === 299792458` evaluates to `true`. It exists purely to make large numbers human-readable directly in source code, similar to a comma in `299,792,458` — a feature added specifically because engineers kept miscounting digits in long numeric literals. It's a small convenience, but one you'll see constantly once you notice it, especially in DevTools console experiments with large loop counts or byte sizes.

---

## ⚙️ 8. Execution Context: Global vs Function

Every time JavaScript runs *any* code, it does so inside an **Execution Context (EC)** — a container that holds "what variables exist right now" and "what code is currently running."

Every execution context, no matter which kind, is made of the same two parts:

| Part | Analogy | Holds |
|---|---|---|
| **Memory Component** (Variable Environment) | The pantry shelf | Variables and function declarations, stored as key–value pairs |
| **Code Component** (Thread of Execution) | The chef actually cooking | Executes the code, one line at a time |

### Global Execution Context (GEC)

- Created **once**, automatically, the instant the JS engine starts running your script.
- It's the default environment the whole program lives in — anything written outside of any function belongs here.

### Function Execution Context (FEC)

A **Function Execution Context** is a private environment the engine creates every time a function is **called** — not defined, called. Defining a function just stores it; calling it is what actually spins up a fresh context for it.

```js
const number = 5;
function addTwo(num) {
  return num + 2;
}
const valueOne = addTwo(number);
```

```
             Global Execution Context
┌─────────────────────────────────────────┐
│  memory: number = 5, addTwo = <fn>       │
└─────────────────────────────────────────┘
         │  calling addTwo(5) pushes a NEW context
         ▼
             addTwo's Function Execution Context
┌─────────────────────────────────────────┐
│  memory: num = 5                         │
│  code:   return num + 2   →  returns 7   │
└─────────────────────────────────────────┘
```

The key idea: **the Global EC is not architecturally special.** It's structured identically to every Function EC — memory component plus code component. It's just the *first* one created, automatically, before any of your code runs. The moment any function is called, JS builds it a brand-new context with that exact same two-part shape and stacks it on top of whatever context called it. A function calling another function just means a third context gets stacked on top of that one, and so on — however deep the calls go.

---

## 📚 9. The Call Stack

The **Call Stack** is the mechanism that tracks which execution context is currently running, structured as a literal **stack of contexts** — last in, first out. The engine's main thread works through code from **top to bottom**, executing line by line, and every function call temporarily hands control to a new context pushed on top of the stack.

- The **bottom** frame is always the Global Execution Context — created first, and only removed when the entire program finishes.
- Every function call pushes a **new frame on top** of whatever's currently running.
- When a function returns, its frame is **popped off**, and control resumes in the context directly beneath it, exactly where that context left off.

### Worked dry run: three nested function calls

```js
function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

function applyDiscount(price) {
  const discounted = price * 0.9;          // calls formatPrice → pushes a 3rd frame
  return formatPrice(discounted);
}

function calculateTotal(price) {
  const finalPrice = applyDiscount(price);  // calls applyDiscount → pushes a 2nd frame
  return finalPrice;
}

const receipt = calculateTotal(50);
```

Step by step:

1. `calculateTotal(50)` is called at the top level → a **new FEC for `calculateTotal`** is pushed onto the stack, with its own fresh memory (`price = 50`).
2. Inside `calculateTotal`, `applyDiscount(price)` is called → a **new FEC for `applyDiscount`** is pushed on top, with its own fresh memory (`price = 50`).
3. Inside `applyDiscount`, `discounted` is computed (`45`), then `formatPrice(discounted)` is called → a **new FEC for `formatPrice`** is pushed on top, with its own fresh memory (`amount = 45`).
4. `formatPrice` runs its one line, returns `"$45.00"`, and its frame **pops off** the stack. Control returns to `applyDiscount`, resuming exactly where it left off.
5. `applyDiscount` returns that same string. Its frame **pops off**. Control returns to `calculateTotal`.
6. `calculateTotal` returns the string as `finalPrice`. Its frame **pops off**. Control returns to the Global EC, where `receipt` is assigned the final value.

```
   ┌──────────────────────────────────────────┐
 4 │  formatPrice FEC                          │  ← top: running right now
   │  memory: amount = 45                      │
   │  code:   return `$${amount.toFixed(2)}`   │
   ├──────────────────────────────────────────┤
 3 │  applyDiscount FEC                        │  ← paused, waiting on formatPrice
   │  memory: price = 50, discounted = 45      │
   │  code:   return formatPrice(discounted)   │
   ├──────────────────────────────────────────┤
 2 │  calculateTotal FEC                       │  ← paused, waiting on applyDiscount
   │  memory: price = 50, finalPrice = undefined│
   │  code:   const finalPrice = applyDiscount(price) │
   ├──────────────────────────────────────────┤
 1 │  Global Execution Context (GEC)           │  ← bottom: created first, removed last
   │  memory: calculateTotal=<fn>,             │
   │          applyDiscount=<fn>,              │
   │          formatPrice=<fn>,                │
   │          receipt = undefined              │
   └──────────────────────────────────────────┘
```

At the deepest point (step 3 above), the stack holds **four** frames at once: Global, `calculateTotal`, `applyDiscount`, `formatPrice` — each running its own memory phase and code phase independently, with only the topmost one actually executing at any instant.

This "push a context, run it, pop it" cycle repeats identically no matter how deep the nesting goes — it's also why runaway recursion (a function that keeps calling itself with no base case to stop it) produces a **stack overflow**: each unreturned call keeps piling a new frame on top with nothing ever popping off, until the stack runs out of room.

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| **JS Engine** | Parses, compiles (JIT), and executes JS — no engine, no execution |
| **Runtime** | Engine + extra host capabilities (DOM, `fetch`, timers, file system) |
| **Node.js** | A runtime that pairs V8 with server-side capabilities instead of browser ones |
| **Dynamically typed** | Types are checked while the code runs, not beforehand |
| **Loosely typed** | A variable's type can change after it's assigned |
| `<script defer>` | Downloads in parallel, runs after HTML parsing finishes, preserves order |
| `<script async>` | Downloads in parallel, runs the instant it's ready, no order guarantee |
| `console.table()` | Prints an array of objects as a scannable table |
| `console.group()` / `groupEnd()` | Visually nests related logs under a collapsible header |
| `console.time()` / `timeEnd()` | Informal timing between two matching-label calls |
| `1_000_000` | Underscore separators in numbers — purely cosmetic, no effect on the value |
| **Execution Context** | Container of "what variables exist" + "what code is running," global or function |
| **Call Stack** | LIFO stack of execution contexts; push on call, pop on return |

---

## 🎯 Key Takeaways

- A JS engine and a JS runtime are not the same thing — the engine only computes; the runtime is what hands it DOM access, `fetch`, and timers.
- Node.js is a runtime, not a framework or library — it pairs the same V8 engine with server-oriented capabilities instead of browser ones.
- JavaScript's dynamic, loose typing trades compile-time safety for flexibility — type errors surface only when the offending line actually runs.
- Where a `<script>` tag lives, and whether it uses `defer` or `async`, directly controls whether it can safely see the full DOM and in what order it runs relative to other scripts.
- `console` offers far more than `.log()` — `.table()`, `.group()`, and `.time()` are purpose-built for scanning structured data, organizing related output, and rough performance checks.
- Every running line of JS sits inside an Execution Context, and the Call Stack is simply a LIFO record of which contexts are currently active — one new frame per function call, popped on return.

---

## 📚 Related Concepts to Explore Next

This file covered *how JS runs* at the engine/runtime level and *where a single execution context comes from*. The next file, **02-Variables-Scope-Hoisting.md**, builds directly on the Execution Context and Call Stack concepts introduced here — it covers what happens *inside* an execution context's memory phase: hoisting, the Temporal Dead Zone, and how `var`, `let`, and `const` behave differently within that same memory-phase-then-code-phase model.

---

## 🔗 Resources

- [MDN — JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [MDN — Script loading: `async` and `defer`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-async)
- [MDN — `console` API reference](https://developer.mozilla.org/en-US/docs/Web/API/console)
- [MDN — Data types and structures (typeof, dynamic typing)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
