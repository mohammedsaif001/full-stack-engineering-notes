# Prototypes, Inheritance, Proxy & Reflect
## Part 12 of 17 — The Mechanism Under Every Object

---

## 📌 Executive Summary

- **Everything in JS is an object at the end of the day**, and every object is linked to another object called its **prototype** — this single link, followed repeatedly, is how `[1,2,3].map(...)` works even though you never wrote a `map` method on your array.
- **`.prototype` and `.__proto__` are not the same thing.** One is a blueprint property that lives only on constructor functions; the other is the live internal link every individual object carries. Confusing them is one of the most common JS interview stumbles.
- **`Object.create()`** builds inheritance by hand — no constructor function, no `class`, just a direct wire from a new object to the object it should inherit from.
- **A polyfill re-implements a native method yourself**, attached to the same prototype the native version would use — this file builds full working versions of `map`, `filter`, `reduce`, and `forEach` from scratch.
- **`Proxy` lets you intercept fundamental operations** (reading a property, writing a property) on an object before they happen, and **`Reflect`** is its natural partner — the standard way to perform that same operation's *default* behavior from inside a trap.

---

## 🧠 Core Analogy: The Corporate Office — Chain of Command and the Front-Desk Gatekeeper

Picture a company with a strict reporting structure and a front desk that screens every visitor.

- When a new employee doesn't know how to answer a question, they don't invent an answer — they **escalate to their manager**. If the manager doesn't know either, the manager escalates further up the chain, until someone in the reporting line knows the answer, or the escalation reaches the top of the company (with no one left to ask), at which point the answer is simply "not available." This escalation path is the **prototype chain**.
- **`.prototype`** is the **onboarding template** HR hands to every new hire of a given role — it defines what every person in that role will know how to do by default. **`.__proto__`** is that specific employee's **actual reporting line** — who they personally escalate to. Every employee has one; only the role template (the constructor) has an onboarding document.
- **`Object.create()`** is hiring someone and wiring their reporting line directly to a specific person, bypassing the standard onboarding template entirely — a fully manual, explicit assignment.
- A **`Proxy`** is a **front-desk receptionist** standing between a visitor and the person they actually want to reach. Every request — "I'd like to read this employee's file" (a `get`), "I'd like to update this employee's record" (a `set`) — passes through the receptionist first. The receptionist can log the request, reject it outright, or wave it through.
- **`Reflect`** is the receptionist's **standard procedure manual** — the exact, correct way to actually carry out a request once it's been allowed through, used instead of the receptionist improvising their own version of "just go get the file."

---

## 🔗 1. The Prototype Chain — Every Object's Internal Link

> **Every object in JavaScript has an internal link to another object, called its prototype.** When you access a property or method on an object and it isn't found directly on that object, the engine automatically walks up this internal link — checking the prototype, then the prototype's prototype, and so on — until it either finds the property or reaches the end of the chain (`null`), at which point it returns `undefined`.

This mechanism is called **prototypal inheritance**, and it's how JS gives every array a `.map()`, every object a `.hasOwnProperty()`, without those methods being copied onto each individual value you create.

```js
const arr = [1, 2, 3];
console.log(arr.map);                     // [Function: map] — arr doesn't own this directly...
console.log(arr.hasOwnProperty("map"));   // false — ...it's inherited from further up the chain
```

`map` isn't a property of `arr` itself — it lives on `Array.prototype`, and `arr`'s internal link points there:

```
arr → Array.prototype → Object.prototype → null
```

- `arr.push(...)` — found on `Array.prototype` (1 link up).
- `arr.toString()` — arrays actually override this on `Array.prototype`, but if they didn't, the chain would continue to `Object.prototype` (2 links up), where the *default* `toString` lives.
- `arr.nonsense` — walks the entire chain, finds nothing, returns `undefined`.

---

## 🆚 2. `prototype` vs `__proto__` — The Classic Confusion

> **`.prototype`** is a property that exists **only on constructor functions** (regular functions used with `new`, and classes) — it's the blueprint object that becomes the `__proto__` of every instance created from that constructor.
>
> **`.__proto__`** (or, properly, accessed via `Object.getPrototypeOf()`) is the **actual internal link** every individual object carries, pointing to the object it inherits from. It exists on **every object**, not just constructors.

```js
function Vehicle(id, model) {
  this.id = id;
  this.model = model;
  this.fuelLevel = 100;
}

Vehicle.prototype.status = function () {
  return `${this.model} #${this.id} | Fuel: ${this.fuelLevel}`;
};
```

> A quick note on `this` here: inside a method attached to a prototype, `this` refers to *whatever object the method was actually called on* — not to the prototype itself. `vehicle1.status()` and `vehicle2.status()` share the exact same function, but each call gets its own `this`, bound to the object on the left of the dot. File 13 covers `this` in full depth; this is just enough to follow the example below.

```js
const vehicle1 = new Vehicle("A-101", "Compact");
const vehicle2 = new Vehicle("B-202", "SUV");

console.log(vehicle1.model);        // Compact
console.log(vehicle2.model);        // SUV
console.log(vehicle1.status());     // Compact #A-101 | Fuel: 100
console.log(vehicle2.status());     // SUV #B-202 | Fuel: 100

console.log(vehicle1.__proto__ === Vehicle.prototype);                  // true — this IS the link
console.log(Vehicle.prototype.__proto__ === Object.prototype);          // true — chain continues
```

| | `Vehicle.prototype` | `vehicle1.__proto__` |
|---|---|---|
| Exists on | Only the **constructor function** `Vehicle` | **Every** object, including `vehicle1` |
| What it is | The blueprint object `new` will link every instance to | The actual internal link `vehicle1` uses when looking things up |
| Relationship | `vehicle1.__proto__ === Vehicle.prototype` | Same object, two different names/access points |

> **The one-line mental model:** `.prototype` is the *blueprint on the factory*; `.__proto__` is the *actual wire connecting one specific product back to that blueprint*. Every `Vehicle` instance shares the *same* `Vehicle.prototype` object — that's why `status()` is defined **once** and every instance can call it, instead of every instance carrying its own private copy of the method (memory-efficient sharing, not duplication).

`__proto__` is technically a legacy accessor (a getter/setter exposed on `Object.prototype`) — the standard, modern way to read or set it is `Object.getPrototypeOf(obj)` / `Object.setPrototypeOf(obj, proto)`, though `__proto__` still works everywhere and shows up constantly in interviews and existing code.

---

## 🏗️ 3. `Object.create()` — Building Inheritance by Hand

> **`Object.create(proto)`** creates a **brand-new empty object** whose `__proto__` is set directly to the object you pass in. It's the most explicit, "no magic" way to wire up prototypal inheritance — no `class`, no `new`, no constructor function required.

```js
const seniorManager = {
  title: "Senior Manager",
  department: "Operations",
  approveBudget() {
    return `${this.title} approves the department budget`;
  },
};

const teamLead = Object.create(seniorManager);   // teamLead's __proto__ is now seniorManager
teamLead.title = "Team Lead";
teamLead.assignTasks = function () {
  return `${this.title} assigns tasks to the team`;
};

const associate = Object.create(teamLead);       // associate's __proto__ is now teamLead
associate.title = "Associate";
associate.fileReport = function () {
  return `${this.title} files the weekly report`;
};

console.log(associate.fileReport());     // Associate files the weekly report        — own method
console.log(associate.assignTasks());    // Associate assigns tasks to the team      — inherited from teamLead
console.log(associate.approveBudget());  // Associate approves the department budget — inherited from seniorManager (2 links up!)
```

**The chain built here:**

```
associate → teamLead → seniorManager → Object.prototype → null
```

`associate` doesn't have `assignTasks` or `approveBudget` as its own properties — it walks up the chain to find them, and crucially, `this` inside those inherited methods still refers to `associate` (the object that actually made the call), not `teamLead` or `seniorManager` — which is *why* `approveBudget()` prints `Associate approves...` and not `Senior Manager approves...`. **`this` is determined by who calls the method, not where the method is defined** — again, the full rules for this land in file 13.

`Object.create(null)` is a special case worth knowing: it creates an object with **no prototype at all** — not even `Object.prototype` — so it has zero inherited methods (`toString`, `hasOwnProperty`, etc. are all gone). Used for building a "pure" dictionary/map object with no inherited baggage that could accidentally collide with a data key.

---

## 🧩 4. Extending Built-in Prototypes

Because `Array.prototype`, `String.prototype`, etc. are just regular objects sitting at the top of every array's/string's chain, you can add your own methods directly onto them — and every array/string, everywhere in your program, instantly gets that method.

```js
Array.prototype.last = function () {
  return this[this.length - 1];
};

console.log([1, 2, 3].last());                    // 3
console.log(["Draft", "Review", "Published"].last());   // Published
```

```js
Array.prototype.customFlag = "demo-value";
console.log([1, 2, 3].customFlag);   // "demo-value" — even a plain VALUE (not just a function) is inherited
```

> ⚠️ **Never do this in real production code.** Modifying built-in prototypes ("monkey-patching") is a classic anti-pattern — if two libraries both add a method called `.last`, one silently overwrites the other, and future JS spec additions could collide with your custom name too (a real historical example: code that added `Array.prototype.flatten` before the spec later added the native `Array.prototype.flat`). It's shown here purely to demonstrate *how* the prototype chain works, not as a recommended technique.

---

## 🧪 5. Polyfills — Writing Your Own `map`, `filter`, `reduce`, `forEach`

> A **polyfill** is a piece of code that provides modern functionality on older environments that don't natively support it — you're essentially rebuilding a built-in method yourself, attached to the same prototype, so that code calling `.map()` still works even where the native version is missing.

```js
if (!Array.prototype.myMap) {
  console.log("polyfill would install myMap here");   // proves the guard pattern: only define if missing
}
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

> One edge case this simplified version doesn't replicate: native `Array.prototype.reduce` throws `TypeError: Reduce of empty array with no initial value` when called on an empty array with no `initialValue`. This polyfill instead silently returns `undefined` in that case — worth knowing if you ever rely on the native error as a safety check.

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
// #0: 1
// #1: 2
// #2: 3
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

## 🥇 6. `Object.create()` vs `class` vs Factory Functions

All three approaches ultimately produce the same shape of prototype chain — they're different syntaxes over the same underlying mechanism:

```js
// 1. Object.create() — manual, explicit prototype wiring, no constructor needed
const teamLead = Object.create(seniorManager);

// 2. Constructor function + new — classic pre-ES6 pattern (covered fully in file 13)
function Vehicle(model) { this.model = model; }
const car = new Vehicle("Compact");

// 3. class — modern syntactic sugar over the exact same constructor-function mechanism
class Employee {
  constructor(name) { this.name = name; }
}
const worker = new Employee("some-name");

// 4. Factory function — a plain function that builds and returns a new object directly
function createEmployee(name) {
  return {
    name,
    describe() { return `Employee: ${this.name}`; },
  };
}
const worker2 = createEmployee("another-name");
```

| Approach | Uses `new`? | Prototype wiring | When it reads best |
|---|---|---|---|
| `Object.create()` | No | Fully manual — you pick the exact parent object | One-off inheritance from a specific existing object |
| Constructor function | Yes | Automatic via `.prototype` on the function | Pre-ES6 style, still common in older/mixed codebases |
| `class` | Yes | Automatic — same mechanism as a constructor function, cleaner syntax | Most modern codebases (full syntax in file 14) |
| Factory function | No | None by default — each call returns a fresh plain object with its own copies of any methods, unless the factory itself calls `Object.create` internally | Avoiding `this`/`new` pitfalls entirely, or building objects with private state via closures |

> **`class` is not a new inheritance model** — under the hood, `typeof Employee === "function"`, and `class` just gives you cleaner syntax for the same constructor-function + `.prototype` pattern shown above. Full `class` syntax (static members, `extends`, private fields) is covered in file 14 — the important thing here is recognizing that **prototypal inheritance is the one mechanism underneath all four styles**, `class` and constructor functions included.

---

## 🕵️ 7. Proxy — Intercepting Fundamental Operations

> **`new Proxy(target, handler)`** creates a wrapper object that sits in front of a real object (the `target`). Every fundamental operation performed on the proxy — reading a property, writing a property, deleting a property, calling `in`, and more — first passes through a matching function on the `handler` object (called a **trap**), if one is defined. If a trap isn't defined for a given operation, that operation passes straight through to the target unchanged.

```js
const employeeRecord = { name: "Employee A", age: 30 };

const handler = {
  get(target, prop, receiver) {
    console.log(`[access] reading "${prop}"`);
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    if (prop === "age" && typeof value !== "number") {
      throw new TypeError("age must be a number");
    }
    console.log(`[access] writing "${prop}" = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  },
};

const guardedRecord = new Proxy(employeeRecord, handler);

console.log(guardedRecord.name);   // [access] reading "name"   → then logs: Employee A
guardedRecord.age = 31;            // [access] writing "age" = 31
console.log(employeeRecord.age);   // 31 — the underlying target was actually updated

guardedRecord.age = "thirty-two";  // throws TypeError: age must be a number
```

- The `get` trap fires on **every** property read through the proxy — here it's used for logging, but the same shape works for lazy-loading a value, returning a computed default, or masking sensitive fields.
- The `set` trap fires on every property write — here it's used for **validation**, rejecting a bad value before it ever reaches the real object. Returning `true` (which `Reflect.set` does on success) tells JS the assignment succeeded; returning `false` would cause a `TypeError` in strict mode.
- Code anywhere else in the program that only has a reference to `guardedRecord` gets these checks automatically — it doesn't need to know a `Proxy` is involved at all.

---

## 🪞 8. Reflect — The Default-Behavior Counterpart to Proxy

> **`Reflect`** is a built-in object holding methods that mirror the fundamental operations JS performs internally — `Reflect.get`, `Reflect.set`, `Reflect.has`, `Reflect.deleteProperty`, and more. Each one does exactly what the engine would have done by default if no trap existed at all.

Two reasons `Reflect` exists specifically to pair with `Proxy`:

1. **Correct forwarding, including the `receiver`.** Inside a trap, you could write `target[prop] = value` by hand instead of `Reflect.set(target, prop, value, receiver)` — but that skips the `receiver` argument, which matters when the target has its own inherited accessors (getters/setters) further up its prototype chain. `Reflect.set(target, prop, value, receiver)` correctly ensures any inherited setter runs with `this` bound to the *proxy* (or whichever object originally received the write), matching what would have happened with no proxy in the way at all. Using `target[prop] = value` directly can silently produce different, harder-to-debug behavior in that scenario.
2. **A complete, one-to-one method for every trap.** Every operation a `Proxy` can intercept (`get`, `set`, `has`, `deleteProperty`, `ownKeys`, `apply`, ...) has a matching `Reflect` method with the exact same default behavior — so inside any trap, "just do what would normally happen" is always one `Reflect.<sameName>(...)` call away, rather than something you'd have to reimplement by hand for each trap type.

```js
const target = { value: 10 };

const loggingHandler = {
  has(target, prop) {
    console.log(`[access] checking "in" for "${prop}"`);
    return Reflect.has(target, prop);   // same result as the default `prop in target` check
  },
};

const proxy = new Proxy(target, loggingHandler);
console.log("value" in proxy);   // [access] checking "in" for "value"   → then logs: true
```

Without `Reflect`, this `has` trap would have to fall back to `prop in target` — which works for this simple case, but `Reflect.has` is the guaranteed, spec-consistent equivalent for *every* trap, not just the ones simple enough to hand-write safely.

---

## 💡 Cheat Sheet: Quick Reference

```js
// Prototype chain
obj.__proto__               // legacy accessor — the live link
Object.getPrototypeOf(obj)  // standard way to read it
Object.setPrototypeOf(obj, proto)   // standard way to set it
Constructor.prototype       // blueprint property, only on constructor functions

// Object.create
const child = Object.create(parentObj);   // child.__proto__ === parentObj
const bare = Object.create(null);         // no inherited methods at all

// Polyfill guard pattern
if (!Array.prototype.myMethod) {
  Array.prototype.myMethod = function (callback) { /* ... */ };
}

// Object.create vs class vs factory
Object.create(proto);              // manual wiring, no constructor
new Constructor();                 // constructor function + .prototype
new ClassName();                   // class — sugar over the same mechanism
function factory() { return {...}; }  // plain function, returns a fresh object

// Proxy
const p = new Proxy(target, {
  get(target, prop, receiver) { return Reflect.get(target, prop, receiver); },
  set(target, prop, value, receiver) { return Reflect.set(target, prop, value, receiver); },
});

// Reflect — mirrors every trap's default behavior
Reflect.get(target, prop, receiver);
Reflect.set(target, prop, value, receiver);
Reflect.has(target, prop);
Reflect.deleteProperty(target, prop);
```

---

## 🎯 Key Takeaways

- Every object carries an internal link to another object (its prototype); property lookups walk this chain automatically until a match is found or the chain ends at `null`.
- `.prototype` lives only on constructor functions as a blueprint; `.__proto__` (or `Object.getPrototypeOf()`) is the live link every object carries — `instance.__proto__ === Constructor.prototype` is the relationship connecting them.
- `Object.create(proto)` wires prototypal inheritance by hand, with no constructor or `class` involved; `Object.create(null)` produces an object with zero inherited methods.
- Extending built-in prototypes (`Array.prototype.last = ...`) demonstrates the mechanism clearly but is a production anti-pattern — it risks silent collisions between libraries and future language additions.
- `Object.create()`, constructor functions, `class`, and factory functions are four different syntaxes that all ultimately rely on the same prototype-chain mechanism (except plain factory functions, which by default skip shared-prototype method reuse entirely).
- `Proxy` intercepts fundamental operations (`get`, `set`, and others) via handler traps before they reach the real object; `Reflect` provides the exact default-behavior implementation for each of those operations, which is why trap bodies almost always end in a matching `Reflect.*` call rather than hand-rolled logic.

---

## 📚 Related Concepts to Explore Next

This file explains the mechanism — the prototype chain — behind something [11-DOM-Browser-Events.md](./11-DOM-Browser-Events.md) used without naming it: every DOM element you select with `querySelector` inherits methods like `addEventListener` from its own prototype chain, the same lookup process demonstrated here with arrays and plain objects. The next file, [13-This-Keyword-Call-Apply-Bind.md](./13-This-Keyword-Call-Apply-Bind.md), picks up exactly where the `this` notes in this file left off, covering `this` in every context (global, function, method, arrow, event handler), `call`/`apply`/`bind`, and what `new` actually does step by step — all of which depend on the prototype mechanics covered here.

---

## 🔗 Resources

- [MDN — Object prototypes](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Object_prototypes)
- [MDN — Object.create()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
- [MDN — Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [MDN — Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect)
