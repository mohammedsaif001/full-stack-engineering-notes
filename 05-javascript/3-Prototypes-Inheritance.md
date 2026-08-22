# JavaScript: Prototypes & Prototypal Inheritance
## Part 3 of N — Everything Is an Object

---

## 📌 Executive Summary: The Big Picture

- **"Everything in JS is an object at the end of the day."** Arrays, functions, even the methods you call on primitives — all of it is built on one mechanism: objects linked to other objects.
- **How does `[1,2,3].map(...)` work when you never wrote a `map` method on your array?** → Every array has an internal link to `Array.prototype`, which is where `map`, `filter`, `push`, etc. actually live.
- **What's the difference between `.prototype` and `.__proto__`?** → One is a blueprint property on constructor functions; the other is the actual live link an object uses to look things up. They are not the same thing, and mixing them up is one of the most common points of confusion in JS.
- **How do you build inheritance without `class` syntax at all?** → `Object.create()`, and understanding the **prototype chain** it wires up.
- **What's a polyfill, and how would you actually write one for `map`, `filter`, `reduce`, `forEach`?** → Full worked implementations below.

---

## 🧠 Core Analogy: The Family Recipe Book

- Every object is a person in a family tree.
- If you ask a person "how do you cook this dish?" and *they* don't personally know it, they don't shrug — they ask their **parent**. If the parent doesn't know either, the parent asks *their* parent. This chain of "ask your parent if you don't know it yourself" continues until someone in the family line knows the answer, or you reach the very first ancestor (who has no parent to ask) — at which point you get `undefined`.
- **`__proto__`** = the actual, live phone number a person uses to call their parent.
- **`.prototype`** = a blueprint/instruction sheet that a *constructor* (a "person-making machine") hands to every new person it creates, telling them whose phone number to save as `__proto__`.

---

## 🔗 1. Every Object Has an Internal Link — The Prototype Chain

> **Every object in JavaScript has an internal link to another object, called its prototype.** When you access a property or method on an object and it isn't found directly on that object, the engine automatically walks up this internal link — checking the prototype, then the prototype's prototype, and so on — until it either finds the property or reaches the end of the chain (`null`), at which point it returns `undefined`.

This single mechanism is called **prototypal inheritance**, and it's how JS gives you methods like `.map()`, `.hasOwnProperty()`, `.toString()` without ever putting them directly on every object you create.

```js
const arr = [1, 2, 3];
console.log(arr.map);         // [Function: map] — arr doesn't own this directly...
console.log(arr.hasOwnProperty("map"));   // false — ...it's inherited
```

`map` isn't a property of `arr` itself — it lives on `Array.prototype`, and `arr`'s internal link points there.

```
arr → Array.prototype → Object.prototype → null
```

- `arr.push(...)` — found on `Array.prototype` (2nd link).
- `arr.toString()` — not on `Array.prototype`? It actually is (arrays override it), but if it weren't, the chain would continue to `Object.prototype` (3rd link), where the *default* `toString` lives.
- `arr.nonsense` — walks the entire chain, finds nothing, returns `undefined`.

---

## 🆚 2. `prototype` vs `__proto__` — The Classic Confusion

> **`.prototype`** is a property that exists **only on constructor functions** (regular functions and classes) — it's the blueprint object that will become the `__proto__` of every instance created with `new`.
>
> **`.__proto__`** (or, properly, accessed via `Object.getPrototypeOf()`) is the **actual internal link** every individual object carries, pointing to the object it inherits from. It exists on **every object**, not just constructors.

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

console.log(car1.__proto__ === TataCar.prototype);   // true — this IS the link
console.log(TataCar.prototype.__proto__ === Object.prototype);   // true — chain continues
```

| | `TataCar.prototype` | `car1.__proto__` |
|---|---|---|
| Exists on | Only the **constructor function** `TataCar` | **Every** object, including `car1` |
| What it is | The blueprint object `new` will link every instance to | The actual internal link `car1` uses when looking things up |
| Relationship | `car1.__proto__ === TataCar.prototype` — same object, two different names/access points |

> **The one-line mental model:** `.prototype` is the *blueprint on the factory*; `.__proto__` is the *actual wire connecting one specific product back to that blueprint*. Every `TataCar` instance shares the *same* `TataCar.prototype` object — that's why `status()` is defined *once* and every instance can call it, instead of every instance carrying its own private copy of the method (memory-efficient sharing, not duplication).

`__proto__` is technically a legacy accessor (a getter/setter exposed on `Object.prototype`) — the standard, modern way to read or set it is `Object.getPrototypeOf(obj)` / `Object.setPrototypeOf(obj, proto)`, though `__proto__` still works everywhere and is what you'll see in interviews and most real code.

---

## 🏗️ 3. `Object.create()` — Building Inheritance by Hand

> **`Object.create(proto)`** creates a **brand-new empty object** whose `__proto__` is set directly to the object you pass in. It's the most explicit, "no magic" way to wire up prototypal inheritance — no `class`, no `new`, no constructor function required.

```js
const prithviraj = {
  name: "Prithviraj",
  generation: "grandfather",
  cookTraditionalDish() {
    return `${this.name} cooks an ancient family recipe`;
  },
};

const raj = Object.create(prithviraj);   // raj's __proto__ is now prithviraj
raj.name = "raj";
raj.generation = "father";
raj.runBusiness = function () {
  return `${this.name} runs the family business`;
};

const ranbir = Object.create(raj);       // ranbir's __proto__ is now raj
ranbir.name = "ranbir";
ranbir.generation = "son";
ranbir.makeFilm = function () {
  return `${this.name} directs blockbuster movies`;
};

console.log(ranbir.makeFilm());            // ranbir directs blockbuster movies       — own method
console.log(ranbir.runBusiness());         // ranbir runs the family business         — inherited from raj
console.log(ranbir.cookTraditionalDish()); // ranbir cooks an ancient family recipe   — inherited from prithviraj (2 links up!)
```

**The chain built here:**

```
ranbir → raj → prithviraj → Object.prototype → null
```

`ranbir` doesn't have `runBusiness` or `cookTraditionalDish` as its own properties — it walks up the chain to find them, and crucially, `this` inside those inherited methods still refers to `ranbir` (the object that actually made the call), not `raj` or `prithviraj` — which is *why* `cookTraditionalDish()` prints `ranbir cooks...` and not `Prithviraj cooks...`. **`this` is determined by who calls the method, not where the method is defined** — this is the same rule the This-Keyword doc covers in full.

`Object.create(null)` is a special case worth knowing: it creates an object with **no prototype at all** — not even `Object.prototype` — so it has zero inherited methods (`toString`, `hasOwnProperty`, etc. are all gone). Used for building a "pure" dictionary/map object with no inherited baggage.

---

## 🧩 4. Extending Built-in Prototypes

Because `Array.prototype`, `String.prototype`, etc. are just regular objects sitting at the top of every array's/string's chain, you can add your own methods directly onto them — and every array/string, everywhere in your program, instantly gets that method.

```js
Array.prototype.last = function () {
  return this[this.length - 1];
};

console.log([1, 2, 3].last());                       // 3
console.log(["Kaka", "Muka", "Dipali"].last());       // Dipali
```

```js
Array.prototype.hitesh = "hitesh";
console.log([1, 2, 3].hitesh);   // "hitesh" — even a plain VALUE (not just a function) is inherited
```

> ⚠️ **Never do this in real production code.** Modifying built-in prototypes ("monkey-patching") is a classic anti-pattern — if two libraries both add a method called `.last`, one silently overwrites the other, and future JS spec additions could collide with your custom name too. It's shown here purely to demonstrate *how* the prototype chain works, not as a recommended technique.

---

## 🧪 5. Polyfills — Writing Your Own `map`, `filter`, `reduce`, `forEach`

> A **polyfill** is a piece of code that provides modern functionality on older environments that don't natively support it — you're essentially rebuilding a built-in method yourself, attached to the same prototype, so that code calling `.map()` still works even where the native version is missing.

```js
Array.prototype.me = "me";
console.log([1, 2, 3].me);   // "me" — proves the mechanism: adding to Array.prototype affects every array
```

This is *exactly* how a real polyfill works: check if the method already exists, and if not, define your own version on the prototype.

### Polyfill for `Array.prototype.map`

```js
if (!Array.prototype.myMap) {
  Array.prototype.myMap = function (callback) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
      result.push(callback(this[i], i, this));   // (element, index, full array) — same signature as native map
    }
    return result;
  };
}

console.log([1, 2, 3].myMap((n) => n * 2));   // [2, 4, 6]
```

### Polyfill for `Array.prototype.filter`

```js
if (!Array.prototype.myFilter) {
  Array.prototype.myFilter = function (callback) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
      if (callback(this[i], i, this)) {
        result.push(this[i]);
      }
    }
    return result;
  };
}

console.log([1, 2, 3, 4, 5, 6].myFilter((n) => n % 2 === 0));   // [2, 4, 6]
```

### Polyfill for `Array.prototype.reduce`

```js
if (!Array.prototype.myReduce) {
  Array.prototype.myReduce = function (callback, initialValue) {
    let accumulator = initialValue;
    let startIndex = 0;

    // if no initial value was given, use the first element as the starting accumulator
    if (accumulator === undefined) {
      accumulator = this[0];
      startIndex = 1;
    }

    for (let i = startIndex; i < this.length; i++) {
      accumulator = callback(accumulator, this[i], i, this);
    }
    return accumulator;
  };
}

console.log([1, 2, 3, 4, 5, 6].myReduce((sum, n) => sum + n, 0));   // 21
```

### Polyfill for `Array.prototype.forEach`

```js
if (!Array.prototype.myForEach) {
  Array.prototype.myForEach = function (callback) {
    for (let i = 0; i < this.length; i++) {
      callback(this[i], i, this);
    }
    // forEach always returns undefined — it never builds a result array
  };
}

[1, 2, 3].myForEach((n, i) => console.log(`#${i}: ${n}`));
```

| Method | What the polyfill must do | Returns |
|---|---|---|
| `map` | Build and return a **new** array, one output per input element | New array (same length) |
| `filter` | Build and return a **new** array of only elements where the callback returns truthy | New array (≤ same length) |
| `reduce` | Carry an accumulator forward across every element, return the final accumulator | Any single value |
| `forEach` | Just call the callback per element — no return value collected | `undefined` |

> **Interview question: how would you polyfill `Array.prototype.map`?**
> Attach the polyfill to `Array.prototype` under a *different* name (e.g. `myMap`) so it doesn't collide with the native one, use a plain `for` loop internally (you can't use `.map` to build `.map`!), call the user's callback with `(element, index, array)` in that order, push every result into a fresh array, and return that new array — never mutate `this`.

---

## 🥇 6. `Object.create()` vs `class` vs Factory Functions — Three Ways to Build Inheriting Objects

All three approaches ultimately produce the same shape of prototype chain — they're different syntaxes over the same underlying mechanism:

```js
// 1. Object.create() — manual, explicit prototype wiring, no constructor needed
const raj = Object.create(prithviraj);

// 2. Constructor function + new — classic pre-ES6 pattern (This-Keyword doc, §"new")
function TataCar(model) { this.model = model; }
const car = new TataCar("Nexon");

// 3. class — modern syntactic sugar over the exact same constructor-function mechanism
class Cricketer {
  constructor(name) { this.name = name; }
}
const player = new Cricketer("Virat");
```

> **`class` is not a new inheritance model** — under the hood, `typeof Cricketer === "function"`, and `class` just gives you cleaner syntax for the same constructor-function + `.prototype` pattern you'd otherwise write by hand. This is covered in full in the Classes & OOP doc — the important thing here is recognizing that **prototypal inheritance is the one mechanism underneath all three styles.**

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references, `Symbol` intro, Numbers & `Math`, String methods, Array mutating vs non-mutating, Object methods, `arguments` object, pure vs impure functions, IIFE, closures |
| **3. Prototypes & Prototypal Inheritance** (this doc) | Everything-is-an-object, the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills for `map`/`filter`/`reduce`/`forEach` |
| **4. `this` Keyword** *(planned)* | `this` in every context (global, function, method, arrow, class, event handler, browser vs Node), detached methods, `call`/`bind`/`apply` + polyfills, function constructors, `new` |
| **5. Classes & OOP** *(planned)* | `class`, constructor, static members, inheritance (`extends`/`super`), public/private fields, `throw` vs `throw new Error` |
| **6. Error Handling** *(planned)* | `try`/`catch`/`finally`, `error.message`/`.stack`/`.name`, custom error classes |
| **7. Event Loop & Callbacks** *(planned)* | Call stack, callback queue, microtask queue, `setTimeout`, callback hell |
| **8. Promises & Async** *(planned)* | Promise states, `.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`/`race`, `async`/`await`, closures in real-world rate limiting |

*(Notes sourced from the Feb 21 & Feb 22 2026 handwritten class notes (Object-Oriented JavaScript), plus the `js-basics` code-along file `14-prototype.js`. Polyfill implementations added as standing-syllabus supplementary material. This is a working series — as more class notes come in, expect these docs to get reorganized/renumbered/merged. See [1-Basics.md](1-Basics.md) and [2-Console-Variables-Data-Objects.md](2-Console-Variables-Data-Objects.md) for Parts 1–2.)*
