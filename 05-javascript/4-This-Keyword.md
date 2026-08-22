# JavaScript: The `this` Keyword, `call`/`bind`/`apply`, and `new`
## Part 4 of N — Context, Borrowed Functions, and Object Construction

---

## 📌 Executive Summary: The Big Picture

- **What does `this` actually point to?** → Not "the function it's written in" — `this` is determined entirely by **how a function is called**, not where it's defined. Same function, called differently, gets a different `this`.
- **Why does `this` become `undefined` inside a callback passed to `.forEach`, but work fine in the method that called `.forEach`?** → Regular functions get their own `this` binding; arrow functions never do — they inherit `this` from the enclosing scope. This single rule explains almost every `this`-related bug.
- **What happens when you rip a method off its object and call it standalone?** → A "detached method" — and it silently loses its `this`.
- **How do `call`, `bind`, and `apply` let you *force* a specific `this`?** → Three tools for borrowing a function and controlling its context explicitly, each with a different calling convention.
- **What does `new` actually *do*, step by step?** → Four concrete steps the engine performs, none of which are magic once you see them written out.

---

## 🧠 Core Analogy: The Phone That Rings Differently Depending on Who Picks Up

- `this` is like a **pronoun ("I")** inside a function — its meaning depends entirely on who's *speaking* (who called the function), not on where the sentence was written.
- Calling a function as `obj.method()` is like the object picking up its own phone and saying "I did this" — `this` = the object.
- Calling the *same* function detached, as a bare `fn()`, is like an anonymous stranger picking up a disconnected phone — there's no "I" to refer to, so `this` comes back empty (`undefined` in strict mode, or the global object otherwise).
- `call`/`apply`/`bind` are like **handing someone a script and telling them exactly whose voice to use** when they read it — you're explicitly assigning the "I" instead of letting the call-site decide.

---

## 🌍 1. `this` in the Global Context

```js
console.log(this);   // in a browser <script>: the `window` object. In a Node.js module: an empty object {}
```

```js
function ranveerOnGlobalStage() {
  return typeof this;
}
console.log(ranveerOnGlobalStage());   // "object"
```

> **`this` at the top level of a script depends entirely on the host environment**, not on JS itself: in a **browser**, top-level `this` is the `window` object. In **Node.js**, each file is wrapped in a module function, so top-level `this` is an **empty object `{}`** (a reference to `module.exports`), *not* Node's global object.

```js
function ranveerWithNoScript() {
  "use strict";
  return this;
}
console.log(ranveerWithNoScript());   // undefined
```

> **Interview question: what is `this` inside a plain function call, and does `"use strict"` change it?**
> Without strict mode, calling a regular function with no receiver (`fn()`, not `obj.fn()`) makes `this` default to the **global object** — `window` in the browser, `global` in Node (non-strict). **With `"use strict"`**, that default-to-global behavior is turned off, and `this` becomes `undefined` instead. This is one of the most commonly cited "gotchas" precisely because it depends on strict mode, the environment, *and* the call style all at once.

| Context | Top-level `this` | Plain function call `this` (non-strict) | Plain function call `this` (`"use strict"`) |
|---|---|---|---|
| Browser | `window` | `window` | `undefined` |
| Node.js (module scope) | `{}` (module.exports) | `global` | `undefined` |

---

## 🏠 2. `this` Inside an Object Method

```js
const bollywoodFilm = {
  name: "Bajirao Mastani",
  lead: "Ranveer",
  introduce() {
    return `${this.lead} performs in ${this.name}`;
  },
};

console.log(bollywoodFilm.introduce());   // Ranveer performs in Bajirao Mastani
```

> **`this` inside a regular method is bound to whatever object is on the left of the dot at call time.** `bollywoodFilm.introduce()` — `this` is `bollywoodFilm`, because that's what's calling it.

```js
const bollywoodFilm2 = { name: "Dhurandhar", lead: "Ranveer", introduce() { return `${this.lead} performs in ${this.name}`; } };
console.log(bollywoodFilm2.introduce());   // Ranveer performs in Dhurandhar
```

The *exact same method code* produces a different answer depending on which object called it — proof that `this` is resolved **at call time**, not at definition time.

### `this` with array methods inside a method — where it gets subtle

```js
const filmDirector = {
  name: "Sanjay Leela Bhansali",
  cast: ["Ranveer", "Deepika", "Priyanka"],
  announceCast() {
    this.cast.forEach((actor) => {
      console.log(`${this.name} introduces ${actor}`);
    });
  },
};

filmDirector.announceCast();
// Sanjay Leela Bhansali introduces Ranveer
// Sanjay Leela Bhansali introduces Deepika
// Sanjay Leela Bhansali introduces Priyanka
```

`announceCast` is a regular method, so `this` = `filmDirector`. The callback passed to `.forEach` is an **arrow function** — and arrow functions don't get their own `this`, they inherit it from their enclosing scope (§4 below) — so `this` inside the arrow *is still* `filmDirector`. If that callback had been a regular `function(actor) {...}` instead, `this` inside it would be `undefined`/global, **not** `filmDirector` — this exact substitution is a favorite interview trap.

---

## 🌳 3. `this` Inside Regular Nested Functions — It Does NOT Inherit

```js
const filmSet = {
  crew: "Spot boys",
  prepareProps() {
    console.log(`Outer this.crew: ${this.crew}`);   // Outer this.crew: Spot boys

    function arrangeChairs() {
      console.log(`Inner this.crew: ${this.crew}`);   // Inner this.crew: undefined
    }
    arrangeChairs();
  },
};

filmSet.prepareProps();
```

**Output:**
```
Outer this.crew: Spot boys
Inner this.crew: undefined
```

> **A regular function nested inside another function does NOT inherit `this` from its enclosing function.** `arrangeChairs()` is called as a bare function call (no object before the dot), so its own `this` resolves independently — to `undefined` (strict mode default in a class/module) or the global object, completely disconnected from `filmSet`. This trips up almost everyone the first time: "but it's defined *inside* the method that has the right `this`!" — definition location is irrelevant; **only the call site matters.**

---

## 🏹 4. Arrow Functions and `this` — The One Real Exception

```js
const filmSet2 = {
  crew: "Spot boys",
  prepareProps() {
    console.log(`Outer this.crew: ${this.crew}`);

    const arrangeLights = () => {
      console.log(`Arrow this.crew: ${this.crew}`);   // Arrow this.crew: Spot boys
    };
    arrangeLights();
  },
};

filmSet2.prepareProps();
// Outer this.crew: Spot boys
// Arrow this.crew: Spot boys
```

> **Arrow functions have no `this` of their own.** They don't bind `this` at all — instead, they permanently capture (close over) whatever `this` was in their **enclosing lexical scope** at the moment they were *defined*, and that never changes no matter how or where the arrow function is later called.

| | Regular nested function | Arrow function |
|---|---|---|
| Has its own `this` binding? | ✅ Yes — resolved fresh at every call site | ❌ No — inherits `this` from where it was *written* |
| `this` inside, when nested in a method | `undefined` / global (does **not** inherit) | Same `this` as the enclosing method (**does** inherit) |
| Can `call`/`bind`/`apply` change its `this`? | ✅ Yes | ❌ No — arrow function `this` is permanently fixed at creation |

> **Interview question: why do arrow functions "not have their own `this`"?**
> Because arrow functions were specifically designed to solve the "need to preserve outer `this` inside a callback" problem (previously solved with `const self = this;` or `.bind(this)`). An arrow function's `this` is not a separate binding at all — it is literally a reference straight through to the surrounding scope's `this`, exactly like how it doesn't have its own `arguments` object either (Part 2 §11).

---

## 🔌 5. Detached Methods

> A **detached method** happens when you extract a method off its object — assigning it to a plain variable, or passing it as a callback — and call it *without* the object attached anymore. The function itself is unchanged, but it has lost the "object before the dot" that used to supply its `this`.

```js
const actor = {
  name: "Ranveer",
  bow() {
    return `${this.name} takes a bow`;
  },
};

console.log(actor.bow());        // "Ranveer takes a bow" — called WITH context

const detachedBow = actor.bow;   // just a function reference now — no object attached
console.log(detachedBow());      // "undefined takes a bow" — this.name fails, this is undefined/global
```

This is exactly why passing `obj.method` directly as a callback (`element.addEventListener("click", obj.method)`, `array.map(obj.method)`) is a classic source of bugs — the method arrives at its destination *detached*, and `this` inside it is no longer `obj`.

```js
class Debutant {
  constructor(name) {
    this.name = name;
    this.walkOut = () => `${this.name} walks out to bat for the first time`;
  }
}

const debutant1 = new Debutant("Shubman");
const somethingFromLastClass = debutant1.walkOut;   // detached...

console.log(somethingFromLastClass());   // "Shubman walks out to bat for the first time" — STILL WORKS!
```

> **Fixing detached methods with an arrow function.** Defining `walkOut` as an **arrow function assigned inside the constructor** permanently binds `this` to that specific instance at creation time — because arrow functions capture `this` lexically, detaching the method later changes nothing; the captured `this` travels with it. This is the standard fix for "losing `this`" in callback-heavy code (event handlers, `setTimeout`, array callbacks).
>
> The tradeoff: because this pattern creates a **new function per instance** (not shared via the prototype), `debutant1.walkOut === debutant2.walkOut` is **`false`** — unlike a regular prototype method, which is created once and shared by every instance.

---

## 📞 6. `call()`, `apply()`, `bind()` — Explicitly Controlling `this`

> All three methods exist on **every function** (they live on `Function.prototype`) and let you invoke a function with a `this` value **you choose**, instead of letting the call-site decide it. This is called "borrowing" a function — using a method that belongs to one object, but running it with a *different* object as `this`.

```js
function cookDish(ingredient, style) {
  return `${this.name} prepares ${ingredient} in ${style} style!`;
}

const sharmaKitchen = { name: "Sharma jis Kitchen" };
const guptaKitchen = { name: "Gupta jis Kitchen" };

console.log(cookDish.call(sharmaKitchen, "Paneer and spices", "Mughlai"));
// Sharma jis Kitchen prepares Paneer and spices in Mughlai style!
```

`cookDish` was never a method *of* `sharmaKitchen` — `.call()` "lends" it to `sharmaKitchen`, setting `this` to that object for just this one invocation.

### `call()` — invoke immediately, arguments as a comma-separated list

```js
function reportDelivery(location, status) {
  return `${this.name} at ${location}: ${status}`;
}
const deliveryBoy = { name: "Ranveer" };

console.log(reportDelivery.call(deliveryBoy, "Lyari", "Ordered"));
// Ranveer at Lyari: Ordered
```

### `apply()` — invoke immediately, arguments as a single array

```js
const guptaOrder = ["Chole kulche", "Punjabi Dhaba"];
console.log(cookDish.apply(guptaKitchen, guptaOrder));
// Gupta jis Kitchen prepares Chole kulche in Punjabi Dhaba style!

console.log(reportDelivery.apply(deliveryBoy, ["Mars", "Pick up"]));
// Ranveer at Mars: Pick up
```

> **Real-world use of `apply`:** before the spread operator (`...`) existed, `apply` was the standard way to pass an *array* of values into a function expecting individual arguments — e.g. `Math.max.apply(null, [100, 30, 45, 50])` finds the max of an array, something `Math.max(...)` can't do directly since it only accepts individual numbers.
> ```js
> const bills = [100, 30, 45, 50];
> console.log(Math.max.apply(null, bills));   // 100
> console.log(Math.max(...bills));            // 100 — modern equivalent using spread
> ```
> `null` is passed as the `this` argument here because `Math.max` doesn't use `this` at all — passing `null`/`undefined` is a common convention when you only care about the arguments, not the context.

### `bind()` — does NOT invoke; returns a new, permanently-bound function

```js
const bindReport = reportDelivery.bind(deliveryBoy, "Haridwar", "WHAT");
console.log(bindReport());   // Ranveer at Haridwar: WHAT — called LATER, this is already locked in

// Partial application — bind SOME arguments now, supply the rest later
const bindReport2 = reportDelivery.bind(deliveryBoy);
console.log(bindReport2("Haridwar", "WHAT"));   // same result, arguments supplied at call time instead
```

> ⚠️ **Common mistake:** `reportDelivery.bind(deliveryBoy, "Haridwar", "WHAT")` does **not** run the function — it returns a *new function* with `this` and (optionally) some arguments pre-filled. `console.log(reportDelivery.bind(...))` alone will print `[Function: bound reportDelivery]`, not the result — you must call the returned function separately, or immediately invoke it: `reportDelivery.bind(deliveryBoy, "Haridwar", "WHAT")()`.

### The three, side by side

| | Invokes immediately? | Arguments | Returns |
|---|---|---|---|
| `.call(thisArg, a, b, c)` | ✅ Yes | Individually, comma-separated | The function's return value |
| `.apply(thisArg, [a, b, c])` | ✅ Yes | As a **single array** | The function's return value |
| `.bind(thisArg, a, b)` | ❌ No | Individually (pre-filled; more can be added at call time) | A **new function**, to call later |

> **Rule of thumb from class notes:** use `.call()` when you already have your arguments as separate values; always use `.apply()` when your arguments already live in an array.

### Real-life use cases

- **`call`/`apply`** — borrowing a utility method: `Array.prototype.slice.call(arguments)` (pre-ES6 way to convert `arguments` into a real array), or invoking a shared "formatter" function with different config objects as context.
- **`bind`** — the most common real-world use is **preserving `this` for event handlers and callbacks in classes** (`this.handleClick = this.handleClick.bind(this)` in a React class component constructor, before arrow-function class fields existed), and **partial application** — pre-filling some arguments of a generic function to create a specialized, reusable version of it (`const double = multiply.bind(null, 2)`).

### Polyfills — writing `call`, `apply`, and `bind` yourself

```js
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg || globalThis;
  const fnSymbol = Symbol("fn");           // unique key so we never overwrite an existing property
  thisArg[fnSymbol] = this;                // `this` here is the ORIGINAL function myCall was invoked on
  const result = thisArg[fnSymbol](...args);   // calling it AS a method of thisArg sets its `this` correctly
  delete thisArg[fnSymbol];                // clean up — don't leave the temp property behind
  return result;
};

console.log(cookDish.myCall(sharmaKitchen, "Paneer", "Mughlai"));
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

console.log(cookDish.myApply(guptaKitchen, ["Chole kulche", "Punjabi Dhaba"]));
```

```js
Function.prototype.myBind = function (thisArg, ...boundArgs) {
  const originalFn = this;   // the function myBind was called on
  return function (...laterArgs) {
    return originalFn.apply(thisArg, [...boundArgs, ...laterArgs]);
  };
};

const myBoundReport = reportDelivery.myBind(deliveryBoy, "Haridwar");
console.log(myBoundReport("WHAT"));   // Ranveer at Haridwar: WHAT
```

> **Interview question: how would you polyfill `bind`?**
> `bind` doesn't call the function — it must **return a new function** that, when eventually called, invokes the original using `.apply()` with the saved `thisArg` and the *combination* of arguments bound early (via `bind`) and arguments supplied later (at the actual call). The key insight is that `bind`'s implementation is naturally built **on top of** `apply` — you don't need raw tricks for it once `call`/`apply` exist.

---

## 🏭 7. Function Constructors

> A **function constructor** is a regular function, called with `new`, that's used to create and initialize objects with specific properties and methods — the pre-`class` way of doing OOP in JS. By convention, constructor function names are **capitalized** (`TataCar`, not `tataCar`) to visually flag "call this with `new`."

```js
function TataCar(chassisNumber, modelName) {
  this.chassisNumber = chassisNumber;
  this.modelName = modelName;
  this.fuelLevel = 100;
}

TataCar.prototype.status = function () {
  return `Tata ${this.modelName} #${this.chassisNumber} | Fuel: ${this.fuelLevel}`;
};

const car1 = new TataCar("MH-101", "Nexon");
const car2 = new TataCar("DL-202", "Harrier");

console.log(car1.modelName);   // Nexon
console.log(car2.modelName);   // Harrier
console.log(car1.status());    // Tata Nexon #MH-101 | Fuel: 100
console.log(car2.status());    // Tata Harrier #DL-202 | Fuel: 100
```

Methods are put on `TataCar.prototype` (not directly inside the constructor function body) specifically so that **every instance shares the same one copy** of `status`, instead of each `new TataCar(...)` call creating its own separate copy of the function in memory — this is the "prototype chain" mechanism from the Prototypes doc (§2–3), applied to a hand-written constructor instead of `Object.create`.

---

## 🆕 8. What Does the `new` Keyword Actually Do?

> **`new` is used to create an instance of an object that has a constructor function.** Calling `new SomeFn(...)` performs four concrete steps, in order:

```
1st — A brand-new EMPTY object {} is created.
2nd — That empty object's prototype is linked to the constructor function's `.prototype` property.
3rd — The constructor function is called/activated with `this` bound to that new object —
      whatever the constructor does with `this.x = ...` writes onto the new object.
4th — If the constructor does NOT explicitly return its own object, `new` automatically
      returns the object that was built in steps 1–3.
```

```js
function TataCar(chassisNumber, modelName) {
  // step 1 already happened — `this` is already the fresh empty object
  this.chassisNumber = chassisNumber;   // step 3 — writing onto the new object
  this.modelName = modelName;
  this.fuelLevel = 100;
  // step 4 — nothing explicitly returned, so the built object comes back automatically
}
```

> **`function` declarations and `class` declarations both use `new` the exact same way** — under the hood, `class` is just syntactic sugar over this same constructor-function + prototype mechanism (Prototypes doc §6). Calling `new` on either one creates a fresh instance following the same four steps.

### `new` vs a factory function — they are NOT the same thing

```js
// this is NOT the same as the TataCar example above
function createAutoRickshaw(id, route) {
  return {
    id,
    route,
    run() {
      return `Auto ${this.id} running on ${this.route}`;
    },
  };
}

const auto1 = createAutoRickshaw("UP-1", "Lucknow-Kanpur");
const auto2 = createAutoRickshaw("UP-2", "Agra-Mathura");

console.log(auto1.run());   // Auto UP-1 running on Lucknow-Kanpur
console.log(auto2.run());   // Auto UP-2 running on Agra-Mathura
```

> A **factory function** is any function that creates and returns a new object **without using `new`** — it just builds a plain object literal and returns it explicitly. Each call returns its own independent object, but because the object (and its `run` method) is built fresh inside the function body every single call, **methods are not shared via a prototype** the way `TataCar.prototype.status` is — every instance carries its own separate copy of `run`, which is less memory-efficient at scale than a real constructor + prototype pair, but avoids `new`/`this` pitfalls entirely (no risk of forgetting `new` and corrupting the global object).

| | Constructor function + `new` | Factory function |
|---|---|---|
| Uses `new`? | ✅ Required | ❌ Never |
| Methods shared across instances? | ✅ Yes, via `.prototype` | ❌ No — each instance gets its own copy |
| Risk if you forget something | Forgetting `new` silently breaks `this` (non-strict: pollutes global object) | No `new`-related risk at all |
| `this` involved? | ✅ Yes, bound automatically by `new` | Not required — can build the object with plain literals |

> **Interview question: what happens if you call a constructor function *without* `new`?**
> In non-strict mode, `this` inside the function falls back to the global object (§1) — so `this.chassisNumber = ...` doesn't build a new car at all, it accidentally creates/overwrites a **global variable** `chassisNumber`, and the function returns `undefined` (no object was ever constructed). This is exactly why capitalizing constructor names by convention matters, and why modern JS added a runtime guard: `new.target` inside a function is `undefined` when called without `new`, letting a constructor detect and throw on misuse.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references, `Symbol` intro, Numbers & `Math`, String methods, Array mutating vs non-mutating, Object methods, `arguments` object, pure vs impure functions, IIFE, closures |
| **3. Prototypes & Prototypal Inheritance** | Everything-is-an-object, the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills for `map`/`filter`/`reduce`/`forEach` |
| **4. `this` Keyword** (this doc) | `this` in global/method/nested-function/arrow-function contexts, browser vs Node, detached methods, `call`/`bind`/`apply` + their polyfills, function constructors, `new` |
| **5. Classes & OOP** *(planned)* | `class`, constructor, static members, inheritance (`extends`/`super`), public/private fields, `throw` vs `throw new Error` |
| **6. Error Handling** *(planned)* | `try`/`catch`/`finally`, `error.message`/`.stack`/`.name`, custom error classes |
| **7. Event Loop & Callbacks** *(planned)* | Call stack, callback queue, microtask queue, `setTimeout`, callback hell |
| **8. Promises & Async** *(planned)* | Promise states, `.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`/`race`, `async`/`await`, closures in real-world rate limiting |

*(Notes sourced from the Feb 21 2026 handwritten class notes (Object-Oriented JavaScript — `this`, call/bind/apply, `new`), plus the `js-basics` code-along files `11-this.js`, `12-call-bind-apply.js`, `13-new.js`. Polyfills for `call`/`apply`/`bind` added as standing-syllabus supplementary material. See [3-Prototypes-Inheritance.md](3-Prototypes-Inheritance.md) for the prototype chain this doc builds on.)*
