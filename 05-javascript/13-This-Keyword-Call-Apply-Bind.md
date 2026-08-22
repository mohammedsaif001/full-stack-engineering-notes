# `this`, `call`/`apply`/`bind` & Object Construction
## Part 13 of 17 — Resolving Every Deferred `this` Question

---

## 📌 Executive Summary

- **What does `this` actually point to?** Not "the function it's written in" — `this` is determined entirely by **how a function is called** (the call site), not where it's defined. The same function, called two different ways, gets two different `this` values.
- **Why did file 6's arrow-function callbacks and file 10's iterator methods both sidestep `this`, and why does file 11 say DOM handlers have "their own binding rules"?** Because all three are instances of the same small set of rules this file finally lays out in full: regular functions bind `this` fresh at every call; arrow functions never bind their own `this` at all.
- **What happens when a method is ripped off its object and called standalone** — passed as a callback, assigned to a bare variable? It becomes a **detached method** and silently loses its `this`.
- **How do `call`, `apply`, and `bind` let you force a specific `this`?** Three tools, all living on `Function.prototype`, for borrowing a function and controlling its context explicitly — each with a different calling convention.
- **What does `new` actually *do*, step by step?** Four concrete engine steps, none of which are magic once written out plainly — and file 14's `class` syntax is sugar over this exact mechanism.

---

## 🧠 Core Analogy: The Radio Handset That Only Knows Who Keyed It

Picture a shared radio handset on a job site. Anyone can key the mic and speak into it — the handset itself has no fixed owner.

- When a supervisor keys the mic and says "I approved this," the "I" refers to whoever is holding the mic **right now** — not whoever built the handset, or whoever is standing nearest it. This is `this` inside a regular function: resolved fresh, **at the moment of the call**, based on who made the call.
- If the mic is handed to someone standing alone with no radio network attached, and they say "I approved this," the message goes nowhere meaningful — there's no channel, no "I" that resolves to anyone. That's a **detached method**: the function still runs, but the object that used to answer to `this` is gone.
- A **walkie-talkie clipped permanently to one person's belt** — wired so it only ever transmits as that one person, no matter who physically presses the button — is an **arrow function**. It doesn't ask "who's holding me right now"; it was hard-wired to one identity the moment it was clipped on, and nothing later changes that.
- `call`, `apply`, and `bind` are a **dispatcher overriding the channel** — manually declaring "for this transmission, treat the speaker as Supervisor A," regardless of who is physically holding the mic.
- `new` is **issuing a brand-new radio unit**: the factory assembles an empty unit, links it to the standard equipment manual (the prototype), hands it to the constructor to configure, and gives you back the finished unit — four concrete, mechanical steps, covered in full in §8.

---

## 🌍 1. `this` in the Global Context

```js
console.log(this);   // in a browser <script>: the `window` object. In a Node.js module: an empty object {}
```

```js
function checkGlobalThis() {
  return typeof this;
}
console.log(checkGlobalThis());   // "object"
```

> **`this` at the top level of a script depends entirely on the host environment**, not on JS itself: in a **browser**, top-level `this` is the `window` object. In **Node.js**, each file is wrapped in a module-function, so top-level `this` is an **empty object `{}`** (a reference to `module.exports`), *not* Node's global object.

```js
function checkStrictThis() {
  "use strict";
  return this;
}
console.log(checkStrictThis());   // undefined
```

> **Interview question: what is `this` inside a plain function call, and does `"use strict"` change it?**
> Without strict mode, calling a regular function with no receiver (`fn()`, not `obj.fn()`) makes `this` default to the **global object** — `window` in the browser, `global` in Node (non-strict). **With `"use strict"`**, that default-to-global fallback is turned off, and `this` becomes `undefined` instead. This is a classic gotcha precisely because it depends on strict mode, the environment, *and* the call style all at once.

| Context | Top-level `this` | Plain function call `this` (non-strict) | Plain function call `this` (`"use strict"`) |
|---|---|---|---|
| Browser | `window` | `window` | `undefined` |
| Node.js (module scope) | `{}` (`module.exports`) | `global` | `undefined` |

---

## 🏠 2. `this` Inside an Object Method

```js
const conference = {
  title: "SysConf 2026",
  speaker: "the keynote speaker",
  introduce() {
    return `${this.speaker} opens ${this.title}`;
  },
};

console.log(conference.introduce());   // the keynote speaker opens SysConf 2026
```

> **`this` inside a regular method is bound to whatever object is on the left of the dot at call time.** `conference.introduce()` — `this` is `conference`, because that's what's calling it. This is exactly the rule file 12 §2 flagged with a one-line note ("`this` refers to whatever object the method was actually called on") when it introduced `Vehicle.prototype.status` — the rule didn't change for a prototype method versus a plain object-literal method; it's the same call-site binding either way.

```js
const conference2 = { title: "DevSummit", speaker: "a panelist", introduce() { return `${this.speaker} opens ${this.title}`; } };
console.log(conference2.introduce());   // a panelist opens DevSummit
```

The *exact same method code* produces a different answer depending on which object called it — proof that `this` is resolved **at call time**, not at definition time.

### `this` with array methods inside a method — where it gets subtle

```js
const eventOrganizer = {
  name: "the program committee",
  speakers: ["Speaker A", "Speaker B", "Speaker C"],
  announceLineup() {
    this.speakers.forEach((speaker) => {
      console.log(`${this.name} introduces ${speaker}`);
    });
  },
};

eventOrganizer.announceLineup();
// the program committee introduces Speaker A
// the program committee introduces Speaker B
// the program committee introduces Speaker C
```

`announceLineup` is a regular method, so `this` = `eventOrganizer`. The callback passed to `.forEach` is an **arrow function** — and arrow functions don't get their own `this`, they inherit it from their enclosing scope (§4 below) — so `this` inside the arrow *is still* `eventOrganizer`. Had that callback been written as a regular `function(speaker) {...}` instead, `this` inside it would be `undefined`/global, **not** `eventOrganizer` — this exact substitution is a favorite interview trap, and it is precisely the mechanism that let file 10's iteration examples reference an outer variable by name "instead of `this`" without breaking anything: whether `this` survives into a callback depends entirely on whether that callback is an arrow function or not.

---

## 🌳 3. `this` Inside Regular Nested Functions — It Does NOT Inherit

```js
const workshop = {
  crew: "the setup crew",
  prepareRoom() {
    console.log(`Outer this.crew: ${this.crew}`);   // Outer this.crew: the setup crew

    function arrangeChairs() {
      console.log(`Inner this.crew: ${this.crew}`);   // Inner this.crew: undefined
    }
    arrangeChairs();
  },
};

workshop.prepareRoom();
```

**Output:**
```
Outer this.crew: the setup crew
Inner this.crew: undefined
```

> **A regular function nested inside another function does NOT inherit `this` from its enclosing function.** `arrangeChairs()` is called as a bare function call (no object before the dot), so its own `this` resolves independently — to `undefined` (strict-mode default) or the global object, completely disconnected from `workshop`. This trips up nearly everyone the first time: "but it's defined *inside* the method that has the right `this`!" — definition location is irrelevant; **only the call site matters.** This is also the exact trap file 11 warned about with "relying on implicit binding inside handlers" — a `function`-keyword callback passed to `addEventListener` behaves like `arrangeChairs` here: its `this` is decided by how the *browser* calls it, not by the code that registered it (see §6 below for the DOM-specific answer).

---

## 🏹 4. Arrow Functions and `this` — The One Real Exception

```js
const workshop2 = {
  crew: "the setup crew",
  prepareRoom() {
    console.log(`Outer this.crew: ${this.crew}`);

    const arrangeLights = () => {
      console.log(`Arrow this.crew: ${this.crew}`);   // Arrow this.crew: the setup crew
    };
    arrangeLights();
  },
};

workshop2.prepareRoom();
// Outer this.crew: the setup crew
// Arrow this.crew: the setup crew
```

> **Arrow functions have no `this` of their own.** They don't bind `this` at all — instead, they permanently capture (close over) whatever `this` was in their **enclosing lexical scope** at the moment they were *defined*, and that never changes no matter how or where the arrow function is later called.

| | Regular nested function | Arrow function |
|---|---|---|
| Has its own `this` binding? | ✅ Yes — resolved fresh at every call site | ❌ No — inherits `this` from where it was *written* |
| `this` inside, when nested in a method | `undefined` / global (does **not** inherit) | Same `this` as the enclosing method (**does** inherit) |
| Can `call`/`bind`/`apply` change its `this`? | ✅ Yes | ❌ No — arrow function `this` is permanently fixed at creation |

> **Interview question: why do arrow functions "not have their own `this`"?**
> Because arrow functions were specifically designed to solve the "need to preserve outer `this` inside a callback" problem (previously solved with `const self = this;` or `.bind(this)`). An arrow function's `this` is not a separate binding at all — it is a reference straight through to the surrounding scope's `this`, exactly like how it doesn't have its own `arguments` object either (file 6's arrow-function section). This is the answer file 6 explicitly deferred: "arrow functions also handle the `this` keyword differently from regular functions — that distinction is covered in depth in file 13."

---

## 🔌 5. Detached Methods

> A **detached method** happens when a method is extracted off its object — assigned to a plain variable, or passed as a callback — and called *without* the object attached anymore. The function itself is unchanged, but it has lost the "object before the dot" that used to supply its `this`.

```js
const account = {
  owner: "the account holder",
  describe() {
    return `${this.owner} owns this account`;
  },
};

console.log(account.describe());        // "the account holder owns this account" — called WITH context

const detachedDescribe = account.describe;   // just a function reference now — no object attached
console.log(detachedDescribe());             // "undefined owns this account" — this.owner fails, this is undefined/global
```

This is exactly why passing `obj.method` directly as a callback (`element.addEventListener("click", obj.method)`, `array.map(obj.method)`) is a classic source of bugs — the method arrives at its destination *detached*, and `this` inside it is no longer `obj`.

```js
function Presenter(name) {
  this.name = name;
  this.announce = () => `${this.name} takes the stage`;
}

const presenter1 = new Presenter("the first presenter");
const detachedAnnounce = presenter1.announce;   // detached...

console.log(detachedAnnounce());   // "the first presenter takes the stage" — STILL WORKS!
```

> **Fixing detached methods with an arrow function.** Defining `announce` as an **arrow function assigned inside the constructor** permanently binds `this` to that specific instance at creation time — because arrow functions capture `this` lexically, detaching the method later changes nothing; the captured `this` travels with it. This is the standard fix for "losing `this`" in callback-heavy code (event handlers, `setTimeout`, array callbacks) — and it is the concrete technique behind the pattern React class components used before class fields existed (`this.handleClick = this.handleClick.bind(this)` in the constructor achieves the same result via `bind` instead of an arrow function).
>
> The tradeoff: because this pattern creates a **new function per instance** (not shared via the prototype), `presenter1.announce === presenter2.announce` is **`false`** — unlike a regular prototype method, which is created once and shared by every instance (file 12 §1–2).

---

## 🖱️ 6. `this` Inside a DOM Event Handler — Answering File 11's Deferral

File 11 deliberately avoided teaching `this` inside `addEventListener` callbacks, promising the rule would arrive "once the mechanics are in place." Now they are:

```js
const button = document.querySelector("#save-button");

button.addEventListener("click", function () {
  console.log(this);   // the <button> element itself — the element the listener is attached to
});

button.addEventListener("click", () => {
  console.log(this);   // whatever `this` was in the surrounding scope where this arrow was DEFINED — NOT the button
});
```

> **When the browser calls a `function`-keyword event handler, it calls it as a method of the element the listener was attached to** — equivalent to `element.onclickHandler()` — so `this` inside that handler is the DOM element (matching `event.currentTarget`). This is a special case of the ordinary "call-site" rule from §2: the browser's dispatch mechanism *is* the call site, and it always calls the handler as if it were a method of the listening element.
>
> An **arrow function** handler ignores this entirely, because arrow functions never bind their own `this` (§4) — they use whatever `this` was already in scope where the arrow was written, which is almost never the element. This is exactly why file 11 recommended `event.target`/`event.currentTarget` as the reliable way to reference the element regardless of which function form is used — they don't depend on `this` at all.

---

## 📞 7. `call()`, `apply()`, `bind()` — Explicitly Controlling `this`

> All three methods exist on **every function** (they live on `Function.prototype`) and let you invoke a function with a `this` value **you choose**, instead of letting the call site decide it. This is called "borrowing" a function — using logic defined once, but running it with a *different* object as `this`.

```js
function announceMeal(dish, style) {
  return `${this.name} prepares ${dish} in ${style} style`;
}

const kitchenA = { name: "Kitchen A" };
const kitchenB = { name: "Kitchen B" };

console.log(announceMeal.call(kitchenA, "a tasting menu", "seasonal"));
// Kitchen A prepares a tasting menu in seasonal style
```

`announceMeal` was never a method *of* `kitchenA` — `.call()` "lends" it to `kitchenA`, setting `this` to that object for just this one invocation.

### `call()` — invoke immediately, arguments as a comma-separated list

```js
function reportStatus(location, status) {
  return `${this.name} at ${location}: ${status}`;
}
const courier = { name: "Courier 12" };

console.log(reportStatus.call(courier, "Warehouse 4", "delivered"));
// Courier 12 at Warehouse 4: delivered
```

### `apply()` — invoke immediately, arguments as a single array

```js
const orderB = ["a set menu", "banquet"];
console.log(announceMeal.apply(kitchenB, orderB));
// Kitchen B prepares a set menu in banquet style

console.log(reportStatus.apply(courier, ["Depot 2", "in transit"]));
// Courier 12 at Depot 2: in transit
```

> **Real-world use of `apply`:** before the spread operator (`...`) existed, `apply` was the standard way to pass an *array* of values into a function expecting individual arguments — e.g. `Math.max.apply(null, [100, 30, 45, 50])` finds the max of an array, something `Math.max(...)` can't do directly since it only accepts individual numbers.
> ```js
> const bills = [100, 30, 45, 50];
> console.log(Math.max.apply(null, bills));   // 100
> console.log(Math.max(...bills));            // 100 — modern equivalent using spread
> ```
> `null` is passed as the `this` argument here because `Math.max` doesn't use `this` at all — passing `null`/`undefined` is a common convention when only the arguments matter, not the context.

### `bind()` — does NOT invoke; returns a new, permanently-bound function

```js
const boundReport = reportStatus.bind(courier, "Depot 5", "delayed");
console.log(boundReport());   // Courier 12 at Depot 5: delayed — called LATER, this is already locked in

// Partial application — bind SOME arguments now, supply the rest later
const boundReport2 = reportStatus.bind(courier);
console.log(boundReport2("Depot 5", "delayed"));   // same result, arguments supplied at call time instead
```

> ⚠️ **Common mistake:** `reportStatus.bind(courier, "Depot 5", "delayed")` does **not** run the function — it returns a *new function* with `this` and (optionally) some arguments pre-filled. `console.log(reportStatus.bind(...))` alone prints `[Function: bound reportStatus]`, not the result — the returned function must be called separately, or invoked immediately: `reportStatus.bind(courier, "Depot 5", "delayed")()`.

### The three, side by side

| | Invokes immediately? | Arguments | Returns |
|---|---|---|---|
| `.call(thisArg, a, b, c)` | ✅ Yes | Individually, comma-separated | The function's return value |
| `.apply(thisArg, [a, b, c])` | ✅ Yes | As a **single array** | The function's return value |
| `.bind(thisArg, a, b)` | ❌ No | Individually (pre-filled; more can be added at call time) | A **new function**, to call later |

> **Rule of thumb:** use `.call()` when the arguments already exist as separate values; use `.apply()` when the arguments already live in an array.

### Real-life use cases

- **`call`/`apply`** — borrowing a utility method: `Array.prototype.slice.call(arguments)` (pre-ES6 way to convert `arguments` into a real array), or invoking a shared "formatter" function with different config objects as context.
- **`bind`** — the most common real-world use is **preserving `this` for event handlers and callbacks in classes** (`this.handleClick = this.handleClick.bind(this)` in a constructor, an alternative to the arrow-function-class-field fix from §5), and **partial application** — pre-filling some arguments of a generic function to create a specialized, reusable version of it (`const double = multiply.bind(null, 2)`).

### Polyfills — writing `call`, `apply`, and `bind` yourself

```js
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg || globalThis;
  const fnSymbol = Symbol("fn");           // unique key so an existing property is never overwritten
  thisArg[fnSymbol] = this;                // `this` here is the ORIGINAL function myCall was invoked on
  const result = thisArg[fnSymbol](...args);   // calling it AS a method of thisArg sets its `this` correctly
  delete thisArg[fnSymbol];                // clean up — don't leave the temp property behind
  return result;
};

console.log(announceMeal.myCall(kitchenA, "a tasting menu", "seasonal"));
```

```js
Function.prototype.myApply = function (thisArg, argsArray) {
  thisArg = thisArg || globalThis;
  const fnSymbol = Symbol("fn");
  thisArg[fnSymbol] = this;
  const result = thisArg[fnSymbol](...(argsArray || []));
  delete thisArg[fnSymbol];
  return result;
};

console.log(announceMeal.myApply(kitchenB, ["a set menu", "banquet"]));
```

```js
Function.prototype.myBind = function (thisArg, ...boundArgs) {
  const originalFn = this;   // the function myBind was called on
  return function (...laterArgs) {
    return originalFn.apply(thisArg, [...boundArgs, ...laterArgs]);
  };
};

const myBoundReport = reportStatus.myBind(courier, "Depot 5");
console.log(myBoundReport("delayed"));   // Courier 12 at Depot 5: delayed
```

> **Interview question: how would you polyfill `bind`?**
> `bind` doesn't call the function — it must **return a new function** that, when eventually called, invokes the original using `.apply()` with the saved `thisArg` and the *combination* of arguments bound early (via `bind`) and arguments supplied later (at the actual call). The key insight is that `bind`'s implementation is naturally built **on top of** `apply` — no raw tricks are needed for it once `call`/`apply` exist.

---

## 🏭 8. Function Constructors

> A **function constructor** is a regular function, called with `new`, used to create and initialize objects with specific properties and methods — the pre-`class` way of doing OOP in JS. By convention, constructor function names are **capitalized** (`Vehicle`, not `vehicle`) to visually flag "call this with `new`."

```js
function Vehicle(id, model) {
  this.id = id;
  this.model = model;
  this.fuelLevel = 100;
}

Vehicle.prototype.status = function () {
  return `${this.model} #${this.id} | Fuel: ${this.fuelLevel}`;
};

const car1 = new Vehicle("MH-101", "Model X");
const car2 = new Vehicle("DL-202", "Model Y");

console.log(car1.model);     // Model X
console.log(car2.model);     // Model Y
console.log(car1.status());  // Model X #MH-101 | Fuel: 100
console.log(car2.status());  // Model Y #DL-202 | Fuel: 100
```

Methods are put on `Vehicle.prototype` (not directly inside the constructor function body) specifically so that **every instance shares the same one copy** of `status`, instead of each `new Vehicle(...)` call creating its own separate copy of the function in memory — this is the prototype-chain mechanism from file 12 §1–2, applied to a hand-written constructor.

---

## 🆕 9. What Does the `new` Keyword Actually Do?

> **`new` is used to create an instance of an object that has a constructor function.** Calling `new SomeFn(...)` performs four concrete steps, in order:

```
1st — A brand-new EMPTY object {} is created.
2nd — That empty object's internal prototype link is set to the constructor function's `.prototype` property
      (this is the exact `__proto__`/`.prototype` relationship covered in file 12 §1–2).
3rd — The constructor function is called/activated with `this` bound to that new object —
      whatever the constructor does with `this.x = ...` writes onto the new object.
4th — If the constructor does NOT explicitly return its own object, `new` automatically
      returns the object that was built in steps 1–3.
```

```js
function Vehicle(id, model) {
  // step 1 already happened — `this` is already the fresh empty object
  this.id = id;          // step 3 — writing onto the new object
  this.model = model;
  this.fuelLevel = 100;
  // step 4 — nothing explicitly returned, so the built object comes back automatically
}
```

> **`function` declarations and `class` declarations both use `new` the exact same way** — under the hood, `class` (file 14) is syntactic sugar over this same constructor-function + prototype mechanism. Calling `new` on either one creates a fresh instance following the same four steps; `this` inside a class method resolves by the identical call-site rule taught in §2 — bound to whatever instance is on the left of the dot when the method is called.

### `new` vs a factory function — they are NOT the same thing

```js
// this is NOT the same as the Vehicle example above
function createTask(id, owner) {
  return {
    id,
    owner,
    describe() {
      return `Task ${this.id} assigned to ${this.owner}`;
    },
  };
}

const task1 = createTask("T-1", "Team A");
const task2 = createTask("T-2", "Team B");

console.log(task1.describe());   // Task T-1 assigned to Team A
console.log(task2.describe());   // Task T-2 assigned to Team B
```

> A **factory function** is any function that creates and returns a new object **without using `new`** — it just builds a plain object literal and returns it explicitly. Each call returns its own independent object, but because the object (and its `describe` method) is built fresh inside the function body every call, **methods are not shared via a prototype** the way `Vehicle.prototype.status` is — every instance carries its own separate copy of `describe`, which is less memory-efficient at scale than a real constructor + prototype pair, but avoids `new`/`this` pitfalls entirely (no risk of forgetting `new` and corrupting the global object). File 12's method-sharing comparison table made the same point about factory functions in passing; this is the full explanation behind that line.

| | Constructor function + `new` | Factory function |
|---|---|---|
| Uses `new`? | ✅ Required | ❌ Never |
| Methods shared across instances? | ✅ Yes, via `.prototype` | ❌ No — each instance gets its own copy |
| Risk if something is forgotten | Forgetting `new` silently breaks `this` (non-strict: pollutes the global object) | No `new`-related risk at all |
| `this` involved? | ✅ Yes, bound automatically by `new` | Not required — the object can be built with plain literals |

> **Interview question: what happens if a constructor function is called *without* `new`?**
> In non-strict mode, `this` inside the function falls back to the global object (§1) — so `this.id = ...` doesn't build a new object at all, it accidentally creates/overwrites a **global variable** `id`, and the function returns `undefined` (no object was ever constructed). This is exactly why capitalizing constructor names by convention matters, and why modern JS added a runtime guard: `new.target` inside a function is `undefined` when called without `new`, letting a constructor detect and throw on misuse.

---

## 💡 Cheat Sheet: Quick Reference

| Call form | `this` inside |
|---|---|
| `fn()` (non-strict) | Global object (`window`/`global`) |
| `fn()` (`"use strict"`) | `undefined` |
| `obj.method()` | `obj` (whatever is left of the dot) |
| Regular function nested in a method, called bare | `undefined`/global — does **not** inherit |
| Arrow function nested in a method | Same `this` as the enclosing scope — **does** inherit, fixed at definition time |
| Detached method (`const f = obj.method; f()`) | `undefined`/global — lost its receiver |
| `fn.call(thisArg, a, b)` | `thisArg`, forced explicitly |
| `fn.apply(thisArg, [a, b])` | `thisArg`, forced explicitly |
| `fn.bind(thisArg)()` | `thisArg`, permanently locked, arrow-immune to further rebinding |
| DOM handler (`function` keyword) | The element the listener is attached to |
| DOM handler (arrow function) | Whatever `this` was in the defining scope — not the element |
| `new Fn()` | The freshly created object |

---

## 🎯 Key Takeaways

- `this` is resolved **at call time based on the call site**, never at the point where a function is defined — the same function body can produce a different `this` on every call, depending only on how it was invoked.
- Regular (`function`-keyword) functions get their own `this` binding, resolved fresh at every call; arrow functions never bind their own `this` — they permanently inherit it from the enclosing lexical scope at creation time. This single distinction is the answer files 6, 10, and 11 all deferred to this file.
- A method loses its `this` the moment it's detached from its object (assigned to a variable, passed as a plain callback) — the fix is either `bind()`, an arrow-function class field, or care at the call site.
- `call`, `apply`, and `bind` all force an explicit `this` onto a function call; `call`/`apply` invoke immediately (arguments as a list vs. an array), while `bind` returns a new function for later use and supports partial application.
- `new` performs four concrete steps — create an empty object, link its prototype, run the constructor with `this` bound to that object, return it — and `class` (file 14) is sugar over this exact mechanism; a factory function builds and returns a plain object with no `new`/`this`/shared-prototype involvement at all.

---

## 📚 Related Concepts to Explore Next

This file resolves the `this`-binding notes [12-Prototypes-Inheritance-Proxy-Reflect.md](./12-Prototypes-Inheritance-Proxy-Reflect.md) deliberately left thin ("`this` refers to whatever object the method was actually called on... File 13 covers `this` in full depth") and builds the `new`/constructor-function mechanics directly on that file's prototype-chain explanation. The next file, [14-Classes-OOP-Design-Patterns.md](./14-Classes-OOP-Design-Patterns.md), introduces `class` syntax itself — constructors, inheritance via `extends`/`super`, and private fields — all of which compile down to the constructor-function-plus-prototype mechanism and the call-site `this` rules covered here.

---

## 🔗 Resources

- [MDN — this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [MDN — Function.prototype.call()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)
- [MDN — Function.prototype.bind()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
- [MDN — new operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new)
