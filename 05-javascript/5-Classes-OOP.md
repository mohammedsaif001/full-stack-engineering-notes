# JavaScript: Classes & Object-Oriented Programming
## Part 5 of N — Constructors, Static, Inheritance, Public & Private

---

## 📌 Executive Summary: The Big Picture

- **What is a `class`, really?** → Syntactic sugar over the constructor-function + `.prototype` pattern from the This-Keyword doc — `typeof MyClass === "function"`, always.
- **Why do two instances of the same class share methods but not data?** → Methods live once on the shared prototype; instance fields (`this.x = ...`) are copied fresh per instance.
- **How does one class extend another, and what does `super` actually do?** → `extends` wires up the prototype chain automatically; `super()` must run first inside a subclass constructor, because the subclass's own `this` doesn't exist until the parent constructor builds it.
- **What's the real difference between `throw new Error("x")` and `throw "x"` — or `throw new CustomError("x")`?** → What kind of value propagates up the call stack, and whether `.message`/`.stack`/`instanceof` checks work downstream.
- **How do you get truly private data in a class**, not just "please don't touch this" naming conventions? → The `#` private field syntax.

---

## 🧠 Core Analogy: The Cricket Academy

- A **class** is the academy's official player-registration template — the exact same form every player fills out.
- **`constructor`** is what happens the moment a player registers: name entered, stats initialized to zero, gear assigned.
- **Instance fields** (`this.name`, `this.matchesPlayed`) are things unique to *that one player* — their own private locker.
- **Methods** (`introduce()`) are the *shared coaching manual* — every player uses the exact same manual (one copy, on the prototype), they don't each get a personal photocopy.
- **`static`** members belong to the *academy itself*, not to any individual player — "total players registered so far" is a fact about the academy, not about any one athlete.
- **`extends`**/**`super`** is a *specialization program*: a "Fast Bowler" is still a "Cricketer" first (`super()` runs the base registration), then gets extra bowler-specific training bolted on.
- **`#privateField`** is a locker with a lock only the academy's own internal staff has the key to — outsiders (code outside the class) can't read or write it directly, no matter how hard they try.

---

## 🏗️ 1. Classes Are Just Functions — the Syntactic Sugar

```js
class Cricketer {
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.matchesPlayed = 0;
    this.stamina = 100;
  }

  introduce() {
    return `${this.name} the ${this.role} | matchesPlayed: ${this.matchesPlayed} | stamina: ${this.stamina}`;
  }
}

const player1 = new Cricketer("Virat", "Batsman");
const player2 = new Cricketer("Bumrah", "Bowler");

console.log(player1.hasOwnProperty("name"));   // true — instance fields ARE the object's own properties
console.log(typeof Cricketer);                 // "function" — classes are functions under the hood!
```

> **Interview "gotcha": `typeof` a class is `"function"`.** `class` is **syntactic sugar** — a cleaner way to write the exact same constructor-function-plus-`.prototype`-methods pattern from the This-Keyword doc §7–8. There is no separate "class" mechanism in the engine; `class Cricketer {}` compiles down to essentially the same thing as `function Cricketer(...) {...}` with `Cricketer.prototype.introduce = ...` attached afterward.

```js
console.log(player1.introduce());
console.log(player2.introduce());
// Virat the Batsman | matchesPlayed: 0 | stamina: 100
// Bumrah the Bowler | matchesPlayed: 0 | stamina: 100
```

> **Methods are shared via the prototype; `this` inside them is still per-call.** `player1` and `player2` each have their own **separate context** — different `this` — even though they're both calling the exact same `introduce` method (one single copy, sitting on `Cricketer.prototype`, shared by every instance). Because the method itself, when called, gets **its own `this`** passed in based on who called it, memory stays efficient (one function body) while behavior stays correct per-instance.

---

## ⚙️ 2. The `constructor` — a Special Method

> **`constructor` is a special method used to create and initialize an object instance of a class.** It runs automatically, exactly once, the moment `new ClassName(...)` is called — this is the class-syntax equivalent of the function-constructor body from the This-Keyword doc §7.
>
> **A `method`, more generally, is a function that belongs to an object or a class.**

```js
class Debutant {
  constructor(name) {
    this.name = name;
    this.walkOut = () => `${this.name} walks out to bat for the first time`;
  }
}

const debutant1 = new Debutant("Shubman");
const somethingFromLastClass = debutant1.walkOut;   // detach it...
console.log(somethingFromLastClass());              // still works! "Shubman walks out to bat for the first time"

const debutant2 = new Debutant("Yashasvi");
console.log(debutant1.walkOut === debutant2.walkOut);   // false — NOT shared, unlike a regular prototype method
```

This is the exact detached-method-fix pattern from the This-Keyword doc §5: defining `walkOut` as an **arrow function assigned inside the constructor** binds `this` to that specific instance permanently, at the cost of creating one separate copy of the function *per instance* (`debutant1.walkOut !== debutant2.walkOut`) — unlike `introduce` above, which is one shared function on the prototype.

---

## 🏛️ 3. `static` Members — Belonging to the Class, Not the Instance

> A **`static` member** (method or property) belongs to the **class itself**, not to any individual instance. You call it as `ClassName.member`, never `instance.member` — instances can't see or use static members directly.

```js
class Cricketer {
  static totalPlayersRegistered = 0;   // static field — one shared value, owned by the class

  constructor(name, role) {
    this.name = name;
    this.role = role;
    Cricketer.totalPlayersRegistered++;   // access via the CLASS name, not `this`
  }

  static compareStamina(playerA, playerB) {   // static method — a utility that belongs to the class
    return playerA.stamina - playerB.stamina;
  }
}

const virat = new Cricketer("Virat", "Batsman");
const bumrah = new Cricketer("Bumrah", "Bowler");

console.log(Cricketer.totalPlayersRegistered);       // 2 — one shared counter, not per-instance
console.log(virat.totalPlayersRegistered);           // undefined — instances cannot see static members
console.log(Cricketer.compareStamina(virat, bumrah)); // 0 — called on the CLASS, not an instance
```

**Real-world use:** utility/helper functions that logically belong to a class but don't need any particular instance's data (`Array.isArray()`, `Object.keys()`, `Math.max()` are all static methods on built-in classes/objects), and shared counters/registries/caches/config that all instances should see the same copy of.

---

## 🧬 4. Inheritance — `extends` and `super`

> **`extends`** sets up the prototype chain between two classes automatically — the child class's instances inherit everything the parent class defines, and can add or override behavior on top.
>
> **`super`** does two different jobs depending on where it's used: **`super(...)`** (called as a function, inside a subclass constructor) invokes the *parent's* constructor; **`super.method()`** calls a specific method from the parent class, useful when overriding a method but still wanting the original behavior too.

```js
class Cricketer {
  constructor(name, role) {
    this.name = name;
    this.role = role;
    this.matchesPlayed = 0;
  }

  introduce() {
    return `${this.name} the ${this.role}`;
  }
}

class FastBowler extends Cricketer {
  constructor(name, topSpeedKmh) {
    super(name, "Fast Bowler");   // MUST run first — builds the base `this` via the parent constructor
    this.topSpeedKmh = topSpeedKmh;
  }

  introduce() {
    const baseIntro = super.introduce();   // call the PARENT's version of introduce()
    return `${baseIntro}, bowling at ${this.topSpeedKmh} km/h`;
  }
}

const bumrah = new FastBowler("Bumrah", 153);
console.log(bumrah.introduce());   // Bumrah the Fast Bowler, bowling at 153 km/h
console.log(bumrah instanceof Cricketer);   // true — FastBowler IS-A Cricketer, via the prototype chain
console.log(bumrah instanceof FastBowler);  // true
```

> **Why must `super()` be called before using `this` in a subclass constructor?** In a derived class, `this` does not exist yet at the start of the constructor — it only comes into existence once the parent constructor (`super(...)`) has run and built the base object. Trying to use `this.topSpeedKmh = ...` *before* calling `super(...)` throws a `ReferenceError: Must call super constructor before accessing 'this'`. This is a direct consequence of the same 4-step `new` mechanism from the This-Keyword doc §8 — `super()` is what actually performs those steps for the parent's half of the object.

**The chain this builds:**

```
bumrah → FastBowler.prototype → Cricketer.prototype → Object.prototype → null
```

Exactly the same prototype-chain mechanism as `Object.create()` in the Prototypes doc §3 — `extends` is just automated syntax for wiring that chain up, instead of doing it by hand.

---

## 🔒 5. Public vs Private Fields

> By default, every field and method on a class is **public** — accessible from outside the class via `instance.field`. **Private fields**, prefixed with `#`, are enforced by the JS engine itself — code outside the class **cannot** read, write, or even check for their existence; attempting to access `instance.#field` from outside throws a `SyntaxError` at parse time.

```js
class BankAccount {
  #balance;              // private field — declared with #, NOT accessible outside the class
  accountHolder;         // public field

  constructor(accountHolder, initialBalance) {
    this.accountHolder = accountHolder;
    this.#balance = initialBalance;
  }

  deposit(amount) {
    this.#balance += amount;
    return this.#getFormattedBalance();   // private methods work the same way — # prefix
  }

  withdraw(amount) {
    if (amount > this.#balance) {
      throw new Error("Insufficient funds");
    }
    this.#balance -= amount;
    return this.#getFormattedBalance();
  }

  #getFormattedBalance() {   // PRIVATE method — internal helper, not part of the public API
    return `Balance: ₹${this.#balance}`;
  }
}

const acc = new BankAccount("Ranveer", 1000);
console.log(acc.deposit(500));     // "Balance: ₹1500"
console.log(acc.accountHolder);    // "Ranveer" — public, freely accessible

console.log(acc.#balance);         // ❌ SyntaxError — #balance is not accessible from outside the class
console.log(acc.balance);          // undefined — this is NOT the same as #balance, just a missing public property
```

> **This is real, enforced privacy — not a naming convention.** Before `#` private fields existed, JS developers used a leading underscore (`_balance`) purely as a *social contract* — "please don't touch this from outside," but nothing actually stopped you. `#balance` is genuinely inaccessible from outside the class body; there's no workaround via bracket notation, reflection, or otherwise. This is the actual, modern answer to "how do you do encapsulation in JS classes."

| | Public field/method | Private field/method (`#`) |
|---|---|---|
| Syntax | `fieldName` | `#fieldName` |
| Accessible outside the class? | ✅ Yes | ❌ No — enforced by the engine, `SyntaxError` if attempted |
| Accessible inside subclasses (`extends`)? | ✅ Yes | ❌ No — private fields are NOT inherited/visible to subclasses either |
| Old-school equivalent | — | `_fieldName` convention (never actually enforced) |

> ⚠️ **There is no `private`/`public` keyword in plain JavaScript.** Writing `private balance = 0;` inside a class body is a **SyntaxError** in real JS — that syntax belongs to **TypeScript**, not JavaScript. TypeScript's `private`/`public`/`protected` are compile-time-only annotations: the TS compiler checks your code against them, then **strips them out entirely** when it compiles down to plain JS, leaving a normal, fully public field behind — anyone can still reach it at runtime (`obj["balance"]`, or just by reading the compiled JS output). `#balance` is the only mechanism in either language that's actually **enforced by the engine at runtime** — even TypeScript itself recommends `#` fields over `private` when you need real, unbypassable privacy rather than just an editor/compiler warning.

---

## ⚠️ 6. `throw`, `throw new Error(...)`, and `throw new CustomClass(...)`

> **`throw` can technically throw *any* value** — a string, a number, a plain object, or (the standard, correct practice) an `Error` instance. What you throw determines what downstream `catch` blocks receive and what properties/behavior they can rely on.

```js
// ❌ Throwing a raw string — technically legal, but loses everything an Error gives you
function riskyOne() {
  throw "Something broke";
}
try {
  riskyOne();
} catch (e) {
  console.log(e);            // "Something broke"
  console.log(e.message);    // undefined — strings don't HAVE a .message property
  console.log(e.stack);      // undefined — no stack trace at all
}
```

```js
// ✅ Throwing `new Error(...)` — the standard, correct way
function riskyTwo() {
  throw new Error("Something broke");
}
try {
  riskyTwo();
} catch (e) {
  console.log(e.message);    // "Something broke"
  console.log(e.name);       // "Error"
  console.log(e.stack);      // full stack trace string — where it was thrown, the call chain
  console.log(e instanceof Error);   // true
}
```

> **Why `new Error(...)` and not just `Error(...)` without `new`?** Calling `Error("msg")` *without* `new` actually still works and returns an equivalent `Error` object (a special-case built into the language) — but `new Error("msg")` is the universally used, unambiguous convention, and matters much more once you build **custom** error classes, where skipping `new` on a `class` throws a hard `TypeError: Class constructor cannot be invoked without 'new'`.

```js
// ✅✅ Throwing a CUSTOM error class — extends the real Error, gains real Error behavior PLUS your own data
class ValidationError extends Error {
  constructor(message, field) {
    super(message);          // sets up e.message via Error's own constructor
    this.name = "ValidationError";   // overrides the default "Error" name
    this.field = field;      // your own extra data, specific to this error type
  }
}

function validateAge(age) {
  if (age < 0) {
    throw new ValidationError("Age cannot be negative", "age");
  }
}

try {
  validateAge(-5);
} catch (e) {
  console.log(e.message);        // "Age cannot be negative"
  console.log(e.name);           // "ValidationError"
  console.log(e.field);          // "age" — custom data only THIS error type carries
  console.log(e instanceof ValidationError);   // true — lets you branch on error TYPE
  console.log(e instanceof Error);             // true — still a real Error underneath (via extends)
}
```

| What you `throw` | `.message` works? | `.stack` works? | `instanceof Error`? | Can carry custom data? |
|---|---|---|---|---|
| `throw "string"` | ❌ No | ❌ No | ❌ No | ❌ No |
| `throw new Error("msg")` | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (generic) |
| `throw new CustomError("msg", ...)` (`extends Error`) | ✅ Yes | ✅ Yes | ✅ Yes (+ `instanceof CustomError`) | ✅ Yes |

> **Interview question: why should you always throw an `Error` object (or a subclass), never a raw string?**
> Because `try`/`catch` blocks, logging tools, and monitoring systems all universally expect `.message`, `.stack`, and `.name` to exist for meaningful error reporting — a thrown string breaks all of that silently. Custom error classes (`extends Error`) go one step further: they let calling code distinguish *what kind* of failure happened via `instanceof`, and attach structured extra data (like which `field` failed validation) without cramming everything into the message string. This full picture — try/catch/finally mechanics, `.message`/`.stack`/`.name` in depth — is covered in the Error-Handling doc.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references, `Symbol` intro, Numbers & `Math`, String methods, Array mutating vs non-mutating, Object methods, `arguments` object, pure vs impure functions, IIFE, closures |
| **3. Prototypes & Prototypal Inheritance** | Everything-is-an-object, the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills for `map`/`filter`/`reduce`/`forEach` |
| **4. `this` Keyword** | `this` in every context, browser vs Node, detached methods, `call`/`bind`/`apply` + their polyfills, function constructors, `new` |
| **5. Classes & OOP** (this doc) | `class` as syntactic sugar, `constructor`, `static` members, `extends`/`super`, public vs private (`#`) fields, `throw` vs `throw new Error` vs custom error classes |
| **6. Error Handling** *(planned)* | `try`/`catch`/`finally`, `error.message`/`.stack`/`.name`, custom error classes in depth |
| **7. Event Loop & Callbacks** *(planned)* | Call stack, callback queue, microtask queue, `setTimeout`, callback hell |
| **8. Promises & Async** *(planned)* | Promise states, `.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`/`race`, `async`/`await`, closures in real-world rate limiting |

*(Notes sourced from the Feb 22 2026 handwritten class notes (Object-Oriented Programming — classes, constructor, Symbol), plus the `js-basics` code-along file `15-classes.js`. `static`, `extends`/`super`, and public/private (`#`) fields were not present in the source notes and are added here as standing-syllabus supplementary material, since they're core OOP topics the notes' own trajectory was heading toward. See [4-This-Keyword.md](4-This-Keyword.md) for the constructor-function foundations classes are built on.)*
