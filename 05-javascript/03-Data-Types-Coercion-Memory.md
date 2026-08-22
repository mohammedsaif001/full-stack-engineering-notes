# Data Types, Coercion & Memory
## Part 3 of 17 — What a Value Actually Is, and How JS Compares Two of Them

---

## 📌 Executive Summary

- Every value in JavaScript is either one of **7 primitive types**, or the **single non-primitive type — `Object`** (arrays, functions, dates, maps, sets, plain objects are all `Object` under the hood).
- `undefined` is the engine's own "no value assigned yet"; `null` is a value a developer assigns **on purpose** to mean "empty." `typeof null === "object"` is a decades-old bug kept for backward compatibility, not a design choice.
- **Primitives are copied by value** — assigning one variable to another duplicates the actual data, giving two fully independent values.
- **Objects are copied by reference** — assigning one variable to another copies a pointer to the *same* underlying object in memory, so both names see any mutation made through either one.
- This is exactly why `const arr = []; arr.push(1);` is legal: `const` locks the variable's **binding** (which object it points to), not the object's **contents** — a promise this series made in file 2 and now delivers on in full.
- A **shallow copy** (`{ ...obj }`, `Object.assign`) only duplicates the top level — any nested object inside is still a shared reference. A **deep copy** (`structuredClone`) duplicates every level, leaving no shared references anywhere.
- `==` compares after **coercing** operands to a common type first; `===` never coerces and compares type *and* value — which is exactly why `===` is the professional default.

---

## 🧠 Core Analogy: The Locker Room vs. The Photocopier

- **Primitives (copied by value)** = handing someone a **photocopy** of a document. They can scribble all over their copy — yours stays exactly as it was. Two fully independent pieces of paper.
- **Objects (copied by reference)** = handing someone a **locker key**, not the locker's contents. If you make a second key and hand it over, you both now open the *same* locker. Whoever opens it and rearranges the contents, both key-holders see the new arrangement — because there's only ever been one locker.
- **`const`** = a locker key that's been **welded** to one specific locker. You can never point that key at a *different* locker (no reassignment) — but nothing stops you from opening the locker it already points to and rearranging what's inside.
- **Shallow copy** = duplicating the *outer* locker but leaving a **smaller nested locker inside it** untouched — both the original outer locker and its copy still share that one inner locker and whatever's inside it.
- **`==` vs `===`** = a bouncer who either lets you in after *converting* your foreign currency to local currency first (`==`), or a bouncer who flatly refuses unless you already hold the *exact* currency and *exact* amount, no conversion offered (`===`).

---

## 🔢 1. The 7 Primitive Types

A **primitive** is a value that is not an object and has no methods or properties of its own — JS temporarily "boxes" a primitive into a wrapper object only when you call a method on it (e.g. `"hi".toUpperCase()`), then discards the wrapper immediately.

| Type | Example | Notes |
|---|---|---|
| `string` | `"hello"`, `'hi'`, `` `hey` `` | Text |
| `number` | `5`, `3.14`, `-2` | JS has **one** numeric type — no separate int/float |
| `boolean` | `true`, `false` | |
| `undefined` | `let x;` | A variable declared but not yet assigned |
| `null` | `let x = null;` | An **intentional** "no value," set by the developer |
| `bigint` | `10n` | For integers too large for `number` to represent safely |
| `symbol` | `Symbol("id")` | A guaranteed-unique value, often used as object keys |

Primitives are **immutable**: you can't change a string or number "in place" — any operation that looks like a mutation actually produces a brand-new primitive value.

```js
let name = "alex";
name.toUpperCase();      // returns a NEW string "ALEX" — doesn't touch `name` at all
console.log(name);       // still "alex"

name = name.toUpperCase();  // reassignment is required to actually change what `name` holds
console.log(name);          // "ALEX"
```

---

## 📦 2. The One Non-Primitive Type: `Object`

Everything that is **not** one of the 7 primitives above is, technically, an `Object`. This is a much shorter list than it first appears — there is exactly one non-primitive type, and a huge number of familiar things fall under it:

| Looks like | Actually is |
|---|---|
| `{}`, `{ name: "x" }` | Plain object |
| `[]`, `[1, 2, 3]` | Array (an object with numeric keys and extra array methods) |
| `function () {}` | Function (an object that can also be *called* — `typeof` reports it specially, see below) |
| `new Date()` | Date object |
| `new Map()`, `new Set()` | Map / Set objects |

```js
typeof {}                // "object"
typeof []                // "object"  — arrays are objects; use Array.isArray() to detect arrays specifically
typeof function () {}    // "function" — the one carve-out `typeof` makes, even though functions are objects
typeof new Date()        // "object"
```

The practical takeaway: whenever you hear "reference type," "object," or "non-primitive," they all point at this same single category — and everything in §4 below (copied by reference, shallow vs. deep copy) applies uniformly to arrays, functions, dates, and plain objects alike, because underneath they're all the same kind of thing.

---

## ❓ 3. `undefined` vs. `null`

These two are easy to conflate because both represent "nothing is here," but they arise from different sources and mean different things:

| | `undefined` | `null` |
|---|---|---|
| Who sets it | The **engine**, automatically | The **developer**, explicitly |
| Meaning | "No value has been assigned yet" | "This is intentionally empty" |
| Typical source | `var` hoisting's initial value, a declared-but-unassigned variable, a missing function argument, a missing object property | `let x = null;` — a deliberate choice in your own code |
| `typeof` | `"undefined"` | `"object"` (see below) |

```js
let x;
console.log(x);         // undefined — the engine's default, nobody assigned anything yet

let y = null;
console.log(y);         // null — a developer explicitly chose "empty" here
```

### `typeof null === "object"` — a known quirk, not a rule to reason from

```js
typeof null   // "object"
```

This has been part of JavaScript since its first implementation in 1995: values were internally tagged with a type identifier, and `null` was represented as the all-zero pointer — which happened to share its tag with objects. It's a bug, but fixing it now would break an unknown amount of existing code across the web, so it was never corrected. The practical consequence: **never use `typeof x === "object"` alone to check "is this actually an object?"** — it will pass for `null` too. Check `x !== null && typeof x === "object"` instead, when it matters.

---

## 🔍 4. `typeof` — Checking a Value's Type at Runtime

`typeof` is an operator (not a function, though it's usually written like one) that returns a string naming a value's type, evaluated at runtime — consistent with JS being dynamically typed (file 1, §4).

```js
typeof "hi"           // "string"
typeof 5               // "number"
typeof true            // "boolean"
typeof undefined       // "undefined"
typeof null            // "object"    — the quirk from §3
typeof {}              // "object"
typeof []              // "object"    — arrays are objects
typeof function () {}  // "function"  — the one special case
typeof Symbol("id")    // "symbol"
typeof 10n             // "bigint"
```

Because `typeof` gives the same `"object"` answer for plain objects, arrays, and (deceptively) `null`, it's not enough on its own to distinguish between them — `Array.isArray(x)` and the `null` check above exist specifically to fill that gap.

---

## 🔗 5. Pointers & References — How Values Actually Live in Memory

JS never hands you a raw memory address the way C does, but the *concept* of a pointer is exactly what governs how non-primitive values behave. This single distinction — value vs. reference — is the mechanism behind a large share of "why did my object change when I never touched it?" bugs.

### Primitives: copied by value

Assigning a primitive to a new variable copies the actual data. The two variables are, from that point on, completely independent.

```js
let originalScore = 100;
let copiedScore = originalScore;   // copiedScore gets its OWN copy of the number 100

copiedScore = 80;

console.log(originalScore);   // 100 — untouched
console.log(copiedScore);     // 80
```

### Objects: copied by reference

Assigning an object to a new variable does **not** duplicate the object — it copies a pointer to the same object sitting in memory. Both variables are now two different names for one shared thing.

```js
const originalConfig = {
  theme: "dark",
  fontSize: 14,
};

const copiedConfig = originalConfig;   // copiedConfig points at the SAME object as originalConfig

copiedConfig.fontSize = 18;

console.log(originalConfig.fontSize);   // 18 — changed too!
```

`copiedConfig` was never an independent copy of the *data* — it's a second label on the exact same underlying object. Mutating the object through either label mutates the one object both labels point to; there is only ever one object here, and two names for it.

### Why `const arr.push(...)` is legal — closing the loop from file 2

File 2 flagged this exact question and deferred the explanation here. The answer follows directly from the paragraph above: **`const` locks the binding, not the object.**

> `const` guarantees the variable name can never be **reassigned** to point at a *different* object or array. It says nothing about whether the object it already points to can be mutated internally — and mutating an object's contents is not the same operation as reassigning the variable.

```js
const settings = { volume: 50, muted: false };
settings.volume = 80;            // ✅ legal — mutating the SAME object's contents, binding unchanged
// settings = { volume: 0 };     // ❌ TypeError: Assignment to constant variable.

const queue = ["task-1", "task-2"];
queue.push("task-3");            // ✅ legal — mutating the same array object
queue[0] = "task-1-retry";       // ✅ legal — same array, different content
// queue = ["reset"];            // ❌ TypeError: Assignment to constant variable.
```

`queue.push(...)` never touches the variable `queue` itself — it calls a method that reaches into the object `queue` currently points to and appends an element there. The binding `queue → <that array>` is exactly what it was before the call. `const` was only ever a promise about the *arrow*, never about what's on the other end of it.

---

## 🪞 6. Shallow Copy vs. Deep Copy

Once you accept that objects are shared by reference, "copying" an object stops being a simple concept — it depends on *how deep* the copy actually goes. This is where the shared-reference problem resurfaces even after you've tried to make a copy.

### Shallow copy: only the top level is independent

The spread operator (`{ ...obj }`) and `Object.assign({}, obj)` both make a **shallow copy** — every top-level key gets its own independent slot, but if a top-level value is itself an object, that nested object is *not* duplicated — the copy's slot just holds a reference to the exact same nested object as the original.

```js
const userOriginal = {
  name: "morgan",
  age: 29,
  address: { city: "Austin" },   // a nested OBJECT — this is where it breaks
};

const userCopy = { ...userOriginal };   // shallow copy
```

Trace exactly what `{ ...userOriginal }` produces in memory:

- `userCopy.name` — a brand-new, independent string slot, currently `"morgan"`.
- `userCopy.age` — a brand-new, independent number slot, currently `29`.
- `userCopy.address` — **not** a new object. Spread only copies references one level deep, so this slot holds the exact same pointer as `userOriginal.address` — both point at one shared `{ city: "Austin" }` object.

```js
userCopy.age = 30;
console.log(userOriginal.age);   // 29 — untouched, age was a primitive, safely copied

userCopy.address.city = "Denver";
console.log(userOriginal.address.city);   // "Denver" — changed anyway!
```

The second mutation leaks through because `userCopy.address` and `userOriginal.address` were never two different objects — spread stopped duplicating at depth 1, and `address` lives at depth 2. Reassigning `userCopy.address = { city: "Denver" }` entirely (rather than mutating `.city` on it) would **not** affect the original, because that line replaces the pointer in `userCopy.address` rather than reaching through the shared object — but `userCopy.address.city = "Denver"` reaches *through* the still-shared pointer and mutates the one object both variables see.

### Deep copy: every level is independent

`structuredClone()` — a built-in global function — performs a genuine **deep copy**: it walks the entire structure, recursively duplicating every nested object and array, so that no shared references remain at any depth.

```js
const settingsOriginal = { theme: "dark", limits: { maxUsers: 10 } };
const settingsCopy = structuredClone(settingsOriginal);   // TRUE deep copy

settingsCopy.limits.maxUsers = 999;
console.log(settingsOriginal.limits.maxUsers);   // 10 — fully untouched
```

| | Duplicates top level | Duplicates nested objects | Typical tool |
|---|---|---|---|
| **Shallow copy** | ✅ | ❌ — still shared | `{ ...obj }`, `Object.assign({}, obj)` |
| **Deep copy** | ✅ | ✅ — fully independent | `structuredClone(obj)` |

The rule of thumb: reach for a shallow copy when an object is flat (no nested objects/arrays as values), and reach for `structuredClone` the moment any property is itself an object or array whose independence actually matters.

---

## ⚖️ 7. `==` vs. `===` and Coercion

**Coercion** is JavaScript automatically converting a value from one type to another so an operation can proceed — this is a direct consequence of JS being loosely typed (file 1, §4).

- **`===` (strict equality)**: compares type **and** value, with **no coercion**. If the types differ, the answer is immediately `false` — no conversion is even attempted.
- **`==` (loose equality)**: if the operand types differ, JS first **coerces** one or both operands to a common type, following a fixed (and famously non-obvious) set of rules, and only then compares.

```js
5 === 5        // true  — same type, same value
5 === "5"      // false — different types, === refuses to convert
5 == "5"       // true  — "5" is coerced to the number 5 first, then compared
```

### Coercion table — common cases worth memorizing

| Expression | Result | Why |
|---|---|---|
| `"" == 0` | `true` | `""` coerces to `0` in a numeric comparison |
| `"0" == 0` | `true` | `"0"` coerces to the number `0` |
| `null == undefined` | `true` | A special-cased rule: `null` and `undefined` are declared loosely equal to each other, and to **nothing else** |
| `null === undefined` | `false` | Different types, no coercion under `===` |
| `[] == false` | `true` | `[]` coerces to `""`, then `""` coerces to `0`; `false` coerces to `0`; `0 == 0` |
| `[] == ![]` | `true` | `![]` evaluates to `false` first (arrays are truthy), then reduces to the case above |
| `NaN == NaN` | `false` | `NaN` is defined to never equal anything, including itself — use `Number.isNaN(x)` to test for it |
| `"5" == 5` | `true` | String coerced to number |
| `"5" === 5` | `false` | Different types, `===` refuses to convert |
| `undefined == null` | `true` | Same special-cased rule as above, order doesn't matter |
| `0 == false` | `true` | `false` coerces to `0` |
| `0 === false` | `false` | Different types (`number` vs `boolean`), no coercion |

The `[] == false` row is a good illustration of why loose equality has a reputation for being unpredictable: it isn't one conversion, it's a *chain* of them (array → string → number, boolean → number) before the two finally land on a comparable type — and few people can recite that chain from memory under pressure.

### Why `===` is the professional default

- `===` is **predictable**: `type mismatch → false`, full stop. There's no chain of implicit conversions to trace through to explain a result.
- `==`'s coercion rules are numerous, historically inherited, and genuinely surprising even to experienced developers (the table above is a small sample — the actual specification's abstract equality algorithm has more branches still).
- Bugs caused by unwanted coercion are notoriously hard to spot in review, because the code *looks* like a normal comparison — the surprising part is invisible until you already know the rule.
- The industry-standard practice — and what linters like ESLint's `eqeqeq` rule enforce by default — is: **always use `===` and `!==`**, with exactly one common exception: `x == null` is sometimes used deliberately as a concise way to check "is this `null` OR `undefined`" in one comparison, relying specifically on the `null == undefined` special case from the table above.

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| **7 primitives** | `string`, `number`, `boolean`, `undefined`, `null`, `bigint`, `symbol` |
| **Non-primitive** | Just one type: `Object` — arrays, functions, dates, maps, sets all fall under it |
| `undefined` | Engine-assigned "no value yet" |
| `null` | Developer-assigned "intentionally empty" |
| `typeof null` | `"object"` — a long-standing bug, not a design choice |
| `typeof` quirk | Can't distinguish `null`, arrays, and plain objects from each other — all report `"object"` |
| **Primitives** | Copied **by value** — independent copies |
| **Objects** | Copied **by reference** — shared pointer, mutations visible through every reference |
| `const` + objects | Locks the **binding**, not the contents — `arr.push()` mutates, doesn't reassign |
| **Shallow copy** | `{ ...obj }` / `Object.assign` — top level independent, nested objects still shared |
| **Deep copy** | `structuredClone(obj)` — every level independent, no shared references anywhere |
| `===` | Type **and** value, no coercion — the professional default |
| `==` | Coerces operands to a common type first, then compares — unpredictable in edge cases |
| `null == undefined` | `true` — a special case; both are `false` under `===` against each other's type |
| `NaN == NaN` | `false` — always; use `Number.isNaN()` to test for `NaN` |

---

## 🎯 Key Takeaways

- Every value is one of 7 primitives or the single non-primitive type `Object` — arrays, functions, and dates are not separate categories, they're all objects with extra behavior layered on.
- `undefined` and `null` both mean "nothing here," but one is the engine's default and the other is a deliberate developer choice — and `typeof null === "object"` is a bug to remember, not a rule to reason from.
- Primitives are copied by value (fully independent copies); objects are copied by reference (shared pointer, mutation through any reference is visible through all of them) — this single distinction explains most "my object changed unexpectedly" bugs.
- `const` only locks the variable's binding to one object — it never freezes that object's contents, which is exactly why `const arr = []; arr.push(1);` compiles and runs without error.
- A shallow copy (`{ ...obj }`) only protects the top level; any nested object inside is still a live shared reference until you reach for a genuine deep copy (`structuredClone`).
- `===` never coerces and is the correct default; `==` coerces first, following rules specific enough to be worth memorizing but easy to get wrong under time pressure — which is exactly why teams standardize on `===`.

---

## 📚 Related Concepts to Explore Next

This file closed the loop file 2, [`02-Variables-Scope-Hoisting.md`](./02-Variables-Scope-Hoisting.md), opened around `const` and object mutation, and built out the full primitive/reference model those two files assumed but hadn't yet defined. The next file, **04-Operators-Modern-Syntax.md**, picks up directly from §7 here — it covers the broader set of JS operators beyond `==`/`===` (arithmetic, logical, ternary, nullish coalescing) and the modern syntax features (template literals in more depth, destructuring, spread/rest) that build on the value-vs-reference model established in this file.

---

## 🔗 Resources

- [MDN — JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
- [MDN — Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)
- [MDN — `typeof`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
- [MDN — `structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
