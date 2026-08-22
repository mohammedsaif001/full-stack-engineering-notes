# JavaScript: Error Handling
## Part 6 of N — try/catch/finally, Error Objects, Custom Errors

---

## 📌 Executive Summary: The Big Picture

- **Getting an error is not a bad thing — it's information.** The real problem is an error the program never handles, which crashes everything downstream. `try`/`catch` exists to convert "program crashes" into "program responds sensibly."
- **What does an `Error` object actually give you** that a raw thrown string doesn't? → `.message`, `.name`, `.stack` — the three properties every logging/monitoring tool expects.
- **Does `finally` always run, even after a `return` inside `try` or `catch`?** → Yes, always — this is one of `finally`'s defining, easy-to-forget behaviors.
- **Why is JS's error handling especially important given it's single-threaded?** → One unhandled error can, in some contexts, take down the entire running process — there's no separate thread quietly absorbing the crash.

---

## 🧠 Core Analogy: The Airport Security Checkpoint

- **`try`** = the checkpoint itself — you attempt to pass through with your bags (your risky operation).
- **`throw`** = the alarm going off — something about your bags doesn't check out.
- **`catch`** = the security officer who steps in *specifically because* the alarm went off — they don't stop the whole airport, they handle *this one* problem and let everyone else keep moving.
- **`finally`** = the metal detector resetting itself for the next passenger — this happens **no matter what** happened with the previous passenger: cleared, flagged, or even if the officer had to escort them out early (a `return` inside `try`/`catch`) — the machine still resets.
- **A custom `Error` subclass** = a security officer's *incident report form* with extra fields specific to the type of alarm (a `ValidationError` report has a "field" box; a `NetworkError` report has a "status code" box) — more useful downstream than a bare "something happened" note.

---

## 🎯 1. The Philosophy: Errors Are Fine, Unhandled Crashes Are the Problem

> **An error occurring is not inherently bad — it's just information that something didn't go as expected.** The actual problem is letting that error propagate **unhandled**, which crashes the surrounding code (and in Node.js, can crash the entire process). `try`/`catch` exists precisely so you can catch an error at a point where you can still respond sensibly — log it, retry, fall back to a default, show the user a message — instead of the whole program grinding to a halt.

```js
// agar aap ne database connection ke liye request bheji, database connection nahi ho paya
// to wahan system ko crash thodi na kar denge — ek error message throw kar denge apni taraf se,
// ki nahi ho paaya, ji database connect tha, usi ko hi error handling kehte hai
```

**Real-world framing:** if your code requests a database connection and the connection fails, you don't want the entire system to crash — you want to throw a clear error message from your own side saying "the database connection didn't succeed." Catching and responding to that failure gracefully **is** error handling.

---

## 🛠️ 2. `try` / `catch` / `finally` — The Full Shape

```js
function bootNavigation(mapLoaded) {
  try {
    console.log(`Is Navigation loaded: ${mapLoaded}`);
    if (!mapLoaded) {
      throw new Error("Map was not passed in this function");
    }
    return "NAV_OK";
  } catch (error) {
    console.log(error);
    console.log(`Navigation Failed: ${error.message}`);
  } finally {
    console.log("Navigation sequence completed");
  }
}

const status1 = bootNavigation(false);
console.log(`Result: ${status1}`);
```

**Output:**
```
Is Navigation loaded: false
Error: Map was not passed in this function
    at bootNavigation (...)
Navigation Failed: Map was not passed in this function
Navigation sequence completed
Result: undefined
```

```js
const status2 = bootNavigation(true);
console.log(`Result: ${status2}`);
```

**Output:**
```
Is Navigation loaded: true
Navigation sequence completed
Result: NAV_OK
```

| Block | Runs when | Purpose |
|---|---|---|
| `try` | Always attempted first | Contains the risky operation |
| `catch (error)` | Only if something inside `try` threw | Handle the failure — log it, recover, fall back |
| `finally` | **Always** — whether `try` succeeded, `catch` ran, or either block even `return`ed early | Cleanup that must happen regardless of outcome |

> **`finally` always runs — even after a `return` inside `try` or `catch`.** In the example above, `try` executes `return "NAV_OK"` on the success path, but `finally`'s `console.log("Navigation sequence completed")` **still runs** before that return value actually leaves the function. This is a common interview gotcha: people expect `return` to exit immediately, but `finally` is guaranteed to run first no matter how the `try`/`catch` block is exited (return, throw, or falling through normally).

> **Class-notes shorthand for how the three blocks relate to a Promise's outcome (a useful mental bridge into the Promises doc):**
> - `.then()` ≈ code succeeded — do something with the result.
> - `.catch()` ≈ an error occurred — do something about it.
> - `.finally()` ≈ fulfillment either way — this always runs at the end, regardless.

---

## 📦 3. The `Error` Object — `.message`, `.name`, `.stack`

```js
const err = new Error("Something broke");

console.log(err.message);   // "Something broke" — the human-readable description you provided
console.log(err.name);      // "Error" — the error TYPE; overridden to something specific in custom errors
console.log(err.stack);     // a full multi-line string: message + the call chain of WHERE it was thrown
console.log(err instanceof Error);   // true
```

| Property | What it holds | Typical use |
|---|---|---|
| `.message` | The string you passed to `new Error(...)` | Human-readable description, shown in logs/UI |
| `.name` | The error's "type" as a string (`"Error"`, `"TypeError"`, `"ValidationError"`, ...) | Quick categorization without needing `instanceof` |
| `.stack` | A string containing the message **plus** the full call stack at the moment of throw — which function called which, down to line numbers | Debugging — tracing exactly *where* and *how* the error happened |

> **`.stack` is genuinely one of the most useful debugging tools you have** — it tells you not just *that* something failed, but the entire chain of function calls that led to the failure, in order, with file/line references. Error tracking tools (Sentry, error-monitoring dashboards) are built almost entirely around parsing and grouping errors by their `.stack`.

### Built-in error types

JS ships several built-in `Error` subtypes, each thrown automatically by the engine in specific situations — all inherit from `Error`, so `instanceof Error` is `true` for every one of them:

| Type | Thrown automatically when |
|---|---|
| `TypeError` | An operation is performed on a value of the wrong type (`null.property`, calling a non-function) |
| `ReferenceError` | Referencing a variable that doesn't exist, or accessing a `let`/`const` in its TDZ (Part 1 §6) |
| `SyntaxError` | Invalid code structure — usually caught at compile time (Part 2 §2), occasionally at runtime (`JSON.parse` on bad JSON) |
| `RangeError` | A value is outside its allowed range (`new Array(-1)`, exceeding max call stack) |

```js
try {
  null.someProperty;
} catch (e) {
  console.log(e.name);       // "TypeError"
  console.log(e instanceof TypeError);   // true
  console.log(e instanceof Error);       // true — TypeError IS-A Error, via inheritance
}
```

---

## ⚠️ 4. `throw` — What You Throw Determines What You Get Back

> **`throw` accepts any value at all** — but only throwing an `Error` (or a subclass of it) gives you `.message`, `.name`, and `.stack` on the other end. This section mirrors the Classes & OOP doc §6 in more depth, since error *handling* and error *design* are two sides of the same coin.

```js
// ❌ throwing a raw value — legal, but you lose everything useful
try {
  throw "Something broke";
} catch (e) {
  console.log(e);            // "Something broke"
  console.log(e.message);    // undefined — strings don't have this property
  console.log(e.stack);      // undefined — no trace at all
}
```

```js
// ✅ throwing `new Error(...)` — the standard, correct baseline
try {
  throw new Error("Something broke");
} catch (e) {
  console.log(e.message);    // "Something broke"
  console.log(e.stack);      // full trace
}
```

```js
// ✅✅ throwing a CUSTOM error class — real Error behavior PLUS your own structured data
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

class NetworkError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "NetworkError";
    this.statusCode = statusCode;
  }
}

function handleFailure(err) {
  if (err instanceof ValidationError) {
    console.log(`Fix your input — field "${err.field}" is invalid: ${err.message}`);
  } else if (err instanceof NetworkError) {
    console.log(`Request failed with status ${err.statusCode}: ${err.message}`);
  } else {
    console.log(`Unexpected error: ${err.message}`);
  }
}

try {
  throw new ValidationError("Age cannot be negative", "age");
} catch (err) {
  handleFailure(err);   // Fix your input — field "age" is invalid: Age cannot be negative
}

try {
  throw new NetworkError("Request timed out", 504);
} catch (err) {
  handleFailure(err);   // Request failed with status 504: Request timed out
}
```

> **This is the entire point of custom error classes: letting calling code branch on `instanceof` to handle *different failure categories* differently**, instead of parsing error message strings (fragile) or treating every failure identically (unhelpful). A single generic `catch` block can inspect `instanceof` and route validation failures, network failures, and permission failures to completely different recovery logic.

| What you `throw` | `.message` | `.stack` | `instanceof Error` | Branchable by type? |
|---|---|---|---|---|
| `throw "string"` | ❌ | ❌ | ❌ | ❌ |
| `throw new Error("msg")` | ✅ | ✅ | ✅ | Only generically |
| `throw new CustomError("msg", ...)` | ✅ | ✅ | ✅ (+ own subclass) | ✅ via `instanceof CustomError` |

> **Interview question: what's the difference between `throw new Error("x")`, `throw new SomeBuiltInError("x")` (e.g. `TypeError`), and `throw new MyCustomClass("x")` where `MyCustomClass extends Error`?**
> All three are real `Error` instances (`instanceof Error` is true for all of them) with working `.message`/`.stack`. The difference is **specificity**: a plain `Error` signals "something went wrong, generically." A built-in subtype (`TypeError`, `RangeError`, ...) signals a *specific, well-known category* of JS-level mistake, recognized by tooling and other engineers instantly. A custom class (`extends Error`) lets *you* define an application-specific category — complete with whatever extra fields make sense (`field`, `statusCode`, `retryable`) — so downstream `catch` blocks can make informed, type-specific decisions instead of guessing from a message string.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references, `Symbol` intro, Numbers & `Math`, String methods, Array mutating vs non-mutating, Object methods, `arguments` object, pure vs impure functions, IIFE, closures |
| **3. Prototypes & Prototypal Inheritance** | Everything-is-an-object, the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills |
| **4. `this` Keyword** | `this` in every context, browser vs Node, detached methods, `call`/`bind`/`apply` + their polyfills, function constructors, `new` |
| **5. Classes & OOP** | `class` as syntactic sugar, `constructor`, `static` members, `extends`/`super`, public vs private (`#`) fields, `throw` vs `throw new Error` |
| **6. Error Handling** (this doc) | The philosophy of error handling, `try`/`catch`/`finally` mechanics, the `Error` object (`.message`/`.name`/`.stack`), built-in error types, custom error classes and branching by `instanceof` |
| **7. Event Loop & Callbacks** *(planned)* | Call stack, callback queue, microtask queue, `setTimeout`, callback hell |
| **8. Promises & Async** *(planned)* | Promise states, `.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`/`race`, `async`/`await`, closures in real-world rate limiting |

*(Notes sourced from the Feb 22 2026 handwritten class notes (§18 Error Handling), plus the `js-basics` code-along file `17-error-handling.js`. Built-in error type table and full custom-error/`instanceof`-branching example added as standing-syllabus supplementary material. See [5-Classes-OOP.md](5-Classes-OOP.md) §6 for where the `throw new Error` vs custom-class distinction was first introduced.)*
