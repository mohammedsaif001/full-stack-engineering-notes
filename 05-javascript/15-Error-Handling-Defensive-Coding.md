# Error Handling & Defensive Coding
## Part 15 of 17 — `try`/`catch`/`finally` in Full, the `Error` Object, and Designing What You Throw

---

## 📌 Executive Summary

- **An error is not a bad outcome — it's information.** The real failure mode is an error that propagates **unhandled**, crashing the surrounding code (and in Node.js, potentially the entire process). `try`/`catch` exists to turn "the program crashes" into "the program responds sensibly."
- **`finally` always runs** — after a successful `try`, after a caught error, and even after a `return` inside `try` or `catch`. This is one of the most commonly misunderstood behaviors in the language and a recurring interview question.
- **What does a real `Error` object give you** that a raw thrown string doesn't? → `.message`, `.name`, and `.stack` — the three properties every logging tool, monitoring dashboard, and debugger expects to exist.
- **JS ships built-in error subtypes** (`TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, ...) that the engine throws automatically in well-defined situations — all inherit from `Error`.
- **What you `throw` determines what the `catch` block can actually do with it.** A raw string gives you nothing to work with; a custom class extending `Error` (file 14 §6) lets calling code branch on `instanceof` and act differently per failure category — this file completes the mechanics that file 14 deliberately left for here.

---

## 🧠 Core Analogy: The Building's Fire Alarm System

- **`try`** = the monitored zone — the area where something risky is being attempted (cooking, wiring work, a chemistry demo).
- **`throw`** = the alarm triggering — smoke detected, something didn't go as expected.
- **`catch`** = the response team assigned to that specific alarm — they don't evacuate the entire building for every beep; they investigate *this* alarm, decide what it means, and act accordingly.
- **`finally`** = the all-clear procedure that runs at the end of *every* incident, no exceptions — whether the room was fine, the alarm was handled, or the response team had to call it in early (a `return` inside `try`/`catch`), the all-clear checklist still executes before anyone leaves.
- **The alarm's report slip** = the `Error` object — a bare "alarm went off" slip (`.message`) is useful, but a slip that also records *which zone*, *what kind of alarm* (`.name`), and *the exact sequence of rooms the alert passed through* (`.stack`) is what actually lets a response team act fast.
- **A raw thrown string** = someone shouting "fire!" with no location, no alarm type, and no trail — technically an alert, but nearly useless to whoever has to respond.
- **A custom error class** = a *specialized* alarm type — a "gas leak" alarm report carries a concentration reading; a "structural" alarm report carries a location and severity rating — extra fields specific to that category, so the response team can route the right specialists without opening every report and guessing.

---

## 🎯 1. The Philosophy: Errors Are Fine, Unhandled Crashes Are the Problem

> **An error occurring is not inherently bad — it's information that something didn't go as expected.** The actual problem is letting that error propagate **unhandled**, which crashes the surrounding code and, in a single-threaded environment like JavaScript, can take down far more than just the operation that failed. `try`/`catch` exists precisely so you can intercept an error at a point where you can still respond sensibly: log it, retry, fall back to a default, or show the user a clear message — instead of the whole program grinding to a halt.

**Real-world framing:** if your code requests a database connection and the connection fails, you don't want the entire application to crash. You want to catch that failure, log a clear message ("database connection failed"), and decide what happens next — retry, fall back to a cache, or surface a friendly error to the user. Catching and responding to a failure gracefully **is** error handling; the failure itself was never the problem.

**Why this matters more in JavaScript specifically:** JS is single-threaded — there is no separate worker thread quietly absorbing a crash while the rest of the program keeps running. An unhandled error inside a synchronous call chain can unwind all the way up and stop execution of everything after it. Defensive coding — anticipating what *can* go wrong and handling it explicitly — is not paranoia; it's what keeps one bad input from becoming a total outage.

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
Navigation Failed: Map was not passed in this function
Navigation sequence completed
Result: undefined
```

*(`catch` never `return`s anything explicitly, so the function's overall result is `undefined`.)*

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
| `finally` | **Always** — whether `try` succeeded, `catch` ran, or either block `return`ed early | Cleanup that must happen regardless of outcome |

### `finally` always runs — even after a `return`

> In the example above, the success path executes `return "NAV_OK"` inside `try`. But `finally`'s `console.log("Navigation sequence completed")` **still runs** before that return value actually leaves the function. `finally` is guaranteed to execute no matter how `try`/`catch` is exited — a normal fall-through, an early `return`, or a `throw` — because it represents cleanup that must happen unconditionally (closing a file handle, releasing a lock, hiding a loading spinner).

### Edge case: `finally` running when `catch` re-throws

A `catch` block can itself `throw` (deciding it can't actually recover) — `finally` still runs before that new error propagates further:

```js
function processOrder(order) {
  try {
    if (!order.sku) throw new Error("Missing SKU");
    return "PROCESSED";
  } catch (error) {
    console.log(`Cannot recover: ${error.message}`);
    throw error;   // re-throw — let it propagate up
  } finally {
    console.log("Releasing order lock");   // still runs before the re-throw completes
  }
}

try {
  processOrder({});
} catch (e) {
  console.log(`Caller received: ${e.message}`);
}
```

**Output:**
```
Cannot recover: Missing SKU
Releasing order lock
Caller received: Missing SKU
```

### Edge case: a `return` inside `finally` overrides everything

This is the sharpest edge case in the whole mechanism — if `finally` itself contains a `return` (or a `throw`), it **silently discards** any pending return value or pending exception from `try`/`catch`:

```js
function riskyValue() {
  try {
    return "FROM_TRY";
  } finally {
    return "FROM_FINALLY";   // this WINS — overrides the pending "FROM_TRY"
  }
}

console.log(riskyValue());   // "FROM_FINALLY"
```

```js
function swallowedError() {
  try {
    throw new Error("This error gets lost");
  } finally {
    return "NO_ERROR_HERE";   // this suppresses the pending exception entirely — no error reaches the caller!
  }
}

console.log(swallowedError());   // "NO_ERROR_HERE" — the thrown Error never propagates
```

> **This is why a `return` (or `throw`) inside `finally` is almost always a mistake.** It silently overrides whatever `try`/`catch` was about to produce — including swallowing a real error with no trace of it. Treat `finally` as cleanup-only: logging, closing connections, releasing locks — never as a place to compute or return a result.

### Nesting and scope

`catch`'s parameter is scoped to the `catch` block only — it doesn't leak into `try` or `finally`, and different `try`/`catch` pairs can reuse the same parameter name without conflict. `try`/`catch` blocks can also be nested, with an inner `catch` optionally re-throwing to an outer one:

```js
try {
  try {
    throw new Error("Inner failure");
  } catch (error) {
    console.log(`Inner handler saw: ${error.message}`);
    throw new Error("Wrapped: " + error.message);   // re-throw a NEW error, adding context
  }
} catch (error) {
  console.log(`Outer handler saw: ${error.message}`);
}
```

**Output:**
```
Inner handler saw: Inner failure
Outer handler saw: Wrapped: Inner failure
```

---

## 📦 3. The `Error` Object — `.message`, `.name`, `.stack`

```js
const err = new Error("Something broke");

console.log(err.message);            // "Something broke" — the human-readable description you provided
console.log(err.name);               // "Error" — the error TYPE; overridden in custom errors
console.log(typeof err.stack);       // "string" — a multi-line trace: message + the call chain of WHERE it was thrown
console.log(err instanceof Error);   // true
```

| Property | What it holds | Typical use |
|---|---|---|
| `.message` | The string passed to `new Error(...)` | Human-readable description, shown in logs/UI |
| `.name` | The error's "type" as a string (`"Error"`, `"TypeError"`, `"ValidationError"`, ...) | Quick categorization without needing `instanceof` |
| `.stack` | The message plus the full call stack at the moment of `throw` — which function called which, down to line numbers | Debugging — tracing exactly *where* and *how* the failure happened |

> **`.stack` is one of the most useful debugging tools available.** It doesn't just say *that* something failed — it shows the entire chain of function calls that led there, in order, with file/line references. Error-tracking tools (crash dashboards, log aggregators) are built largely around parsing and grouping errors by their `.stack`.

### Built-in error types

JS ships several built-in `Error` subtypes, thrown automatically by the engine in specific situations. All inherit from `Error`, so `instanceof Error` is `true` for every one of them:

| Type | Thrown automatically when |
|---|---|
| `TypeError` | An operation is performed on a value of the wrong type (`null.property`, calling a non-function) |
| `ReferenceError` | Referencing a variable that doesn't exist, or accessing a `let`/`const` while it's still in its temporal dead zone |
| `SyntaxError` | Invalid code structure — usually caught before the code ever runs, occasionally at runtime (e.g., `JSON.parse` on malformed JSON) |
| `RangeError` | A value falls outside its allowed range (`new Array(-1)`, exceeding the maximum call stack size) |

```js
try {
  null.someProperty;
} catch (e) {
  console.log(e.name);                   // "TypeError"
  console.log(e instanceof TypeError);   // true
  console.log(e instanceof Error);       // true — TypeError IS-A Error, via inheritance
}

try {
  JSON.parse("{ not valid json");
} catch (e) {
  console.log(e.name);   // "SyntaxError"
}
```

**Why this matters defensively:** recognizing which built-in type a failure produces lets you write targeted `catch` logic (`if (e instanceof TypeError)`) instead of guessing from a message string, and it tells you immediately whether a bug is a logic error in *your* code (most `TypeError`s) versus a legitimately bad input you need to validate against ahead of time.

---

## ⚠️ 4. `throw` — What You Throw Determines What You Get Back

> `throw` accepts *any* value — a string, a number, a plain object, or (the correct, standard practice) an `Error` instance or subclass. What you throw determines exactly what a downstream `catch` block receives and what it can reliably do with it.

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
  console.log(e.message);   // "Something broke"
  console.log(e.stack);     // full trace, string starting with "Error: Something broke"
}
```

```js
// ✅✅ throwing a CUSTOM error class — real Error behavior PLUS your own structured data
// (class syntax and `extends`/`super` mechanics: file 14 §1-4)
class ValidationError extends Error {
  constructor(message, field) {
    super(message);            // sets up .message via Error's own constructor
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

> **This is the entire point of custom error classes:** letting calling code branch on `instanceof` to handle *different failure categories* differently, instead of parsing fragile message strings or treating every failure identically. A single generic `catch` block can inspect `instanceof` and route validation failures, network failures, and permission failures to completely different recovery logic — this is precisely what file 14 §6 deferred to this file: the full mechanics of *catching* what a custom `Error` subclass produces.

| What you `throw` | `.message` | `.stack` | `instanceof Error` | Branchable by type via `instanceof`? |
|---|---|---|---|---|
| `throw "string"` | ❌ | ❌ | ❌ | ❌ |
| `throw new Error("msg")` | ✅ | ✅ | ✅ | Only generically |
| `throw new CustomError("msg", ...)` | ✅ | ✅ | ✅ (+ own subclass) | ✅ via `instanceof CustomError` |

> **Interview question: what's the difference between `throw new Error("x")`, `throw new TypeError("x")`, and `throw new MyCustomClass("x")` where `MyCustomClass extends Error`?**
> All three are real `Error` instances (`instanceof Error` is `true` for all of them) with working `.message`/`.stack`. The difference is **specificity**. A plain `Error` signals "something went wrong, generically." A built-in subtype (`TypeError`, `RangeError`, ...) signals a specific, well-known category of JS-level mistake, recognized instantly by other engineers and tooling. A custom class lets *you* define an application-specific category — complete with whatever extra fields make sense (`field`, `statusCode`, `retryable`) — so downstream `catch` blocks can make informed, type-specific decisions instead of guessing from a message string.

### A note on asynchronous code

Everything above — `try`/`catch`/`finally`, the `Error` object, `throw` semantics — applies directly to **synchronous** code. Asynchronous code (a failed `fetch`, a rejected `Promise`, a callback that errors) doesn't propagate through a surrounding `try`/`catch` the same way, because the error surfaces after the synchronous call stack has already finished. That requires its own handling patterns (`.catch()`, `async`/`await` with `try`/`catch`), covered in file 17.

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| Philosophy | An error is information; an *unhandled* error is the actual problem |
| `try` | Wraps the risky operation |
| `catch (error)` | Runs only if `try` threw; handle or re-throw |
| `finally` | **Always** runs — success, catch, early `return`, or re-throw |
| `return` inside `try`/`catch` | Still waits for `finally` to finish before actually returning |
| `return`/`throw` inside `finally` | **Overrides** any pending return value or exception — avoid this |
| `.message` | Human-readable description |
| `.name` | Error type as a string (`"Error"`, `"TypeError"`, custom name) |
| `.stack` | Message + full call trace — primary debugging tool |
| `TypeError` | Wrong-type operation (`null.prop`, calling a non-function) |
| `RangeError` | Value outside allowed range |
| `ReferenceError` | Undeclared variable, or TDZ access |
| `SyntaxError` | Invalid structure — usually pre-runtime, sometimes `JSON.parse` |
| `throw "string"` | No `.message`, no `.stack`, no `instanceof Error` |
| `throw new Error(msg)` | Full `Error` behavior, but generic |
| `throw new CustomError(msg)` (`extends Error`) | Full `Error` behavior + `instanceof CustomError` branching + custom fields |
| Async errors | Need `.catch()` / `async`-`await` `try`/`catch` — file 17 |

---

## 🎯 Key Takeaways

- Errors are normal and expected; the failure mode to design against is an error that goes **unhandled** and crashes the surrounding code.
- `finally` always executes — including after a `return` in `try`/`catch` and after a re-thrown error — but a `return`/`throw` *inside* `finally` silently overrides whatever `try`/`catch` was about to produce, so keep `finally` to cleanup only.
- A real `Error` object provides `.message`, `.name`, and `.stack` — properties every logging and monitoring tool depends on; a raw thrown string provides none of them.
- Built-in error subtypes (`TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`) are thrown automatically by the engine in specific, recognizable situations, and all satisfy `instanceof Error`.
- Custom error classes (`class CustomError extends Error`, file 14 §6) are the standard way to design errors that carry structured, application-specific data and let calling code branch on `instanceof` instead of parsing message strings.

---

## 📚 Related Concepts to Explore Next

This file delivers on the deferral made in [14-Classes-OOP-Design-Patterns.md](./14-Classes-OOP-Design-Patterns.md) §6 — the full `try`/`catch`/`finally` mechanics, `.message`/`.stack`/`.name` in depth, and the custom-error-class branching pattern that file only introduced in shallow form. For how errors surface in asynchronous code — rejected Promises, `.catch()`, and `try`/`catch` around `await` — continue to [16-Event-Loop-Callbacks.md](./16-Event-Loop-Callbacks.md), which lays the event-loop groundwork that async error handling in file 17 builds on.

---

## 🔗 Resources

- [MDN — try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
- [MDN — Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [MDN — throw](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/throw)
- [MDN — Error.prototype.stack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack)
