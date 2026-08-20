# JavaScript Basics: Engine, Execution, Hoisting, Data Structures & Functions
## Part 1 of N — Foundations & Core Mechanism

---

## 📌 Executive Summary: The Big Picture

Before you can reason about *any* JS bug, you need a mental model of three things:

- **What runs your code?** → The JS Engine (V8, SpiderMonkey, JavaScriptCore) inside a runtime (browser or Node.js)
- **How does the engine read your code before running it?** → Memory Phase vs Code Phase → Hoisting → TDZ
- **Where does a variable "live" and who can see it?** → Execution Context, Call Stack, Scope

Everything else — `var`/`let`/`const` quirks, why arrow functions behave differently, why loops need closures — falls out of these three ideas.

This doc — **Part 1** — is a complete pass over the fundamentals: the engine, execution context, data types, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, every loop type (`for`, `while`, `do...while`, `for...in`, `for...of`, `forEach`, `map`, `filter`, `reduce`), HOF/callbacks, and the core data structures (Array, Object, Map, Set) with their real methods, plus DOM selection/manipulation/events. Later parts go deeper into closures, `this`, async/event loop, and prototypes/OOP.

---

## 🧠 Core Analogy: The Restaurant Kitchen

- **JS Engine (V8)** = the kitchen itself — takes orders (code) and produces dishes (output).
- **Call Stack** = the head chef's to-do pile — whatever's on top gets worked on right now; finish it, pop it off, move to the next.
- **Memory (Global/Function scope)** = the pantry — every function gets its own private shelf (**local execution context**) plus access to the shared pantry (**global context**).
- **Memory Phase vs Code Phase** = the chef first skims the entire recipe card, sets out empty containers for every ingredient it can see (`undefined` for `var`, "locked" for `let`/`const`), *then* starts cooking line by line.

---

## 🏗️ 1. The JS Engine & Runtime

JavaScript itself is just a language spec (ECMAScript). It needs an **engine** to actually execute it, and a **runtime** to give it capabilities beyond raw computation (DOM, `fetch`, timers, file system).

| Engine | Browser / Runtime | Written In |
|---|---|---|
| **V8** | Chrome, Node.js, Edge | C++ |
| **SpiderMonkey** | Firefox | C++ |
| **JavaScriptCore (Nitro)** | Safari (WebKit) | C++ |

- Without an engine, a browser **cannot** run JS at all.
- Compiled languages need a matching compiler: `C`/`C++` → C++ compiler, `Java` → Java compiler, `JavaScript` → a **JS engine** (which itself compiles/interprets JS under the hood — V8 does JIT compilation, not pure interpretation, despite the "interpreted language" label you often hear).

**Browsers only understand three things**: HTML, CSS, and JS. JS gets parsed by the engine (e.g. V8 inside Chrome) and turned into machine code the CPU can run.

```
┌────────────────────────────┐
│   Chrome (V8 Engine)       │
│                             │
│   JS  ──────────────▶ machine code
└────────────────────────────┘
```

### Node.js

- Creator: **Ryan Dahl**.
- Node is **not** a framework and **not** a library — it's a **runtime environment** for JS.
- It lets JS run **outside the browser** (servers, CLIs, scripts) by embedding the V8 engine plus extra APIs (file system, networking) that a browser wouldn't expose.

### JS is dynamically & loosely typed

- **Loosely typed**: a variable's type isn't fixed — `let x = 5; x = "hello";` is legal.
- **Dynamically typed**: types are checked at *runtime*, not compile time.
- **TypeScript** is a strongly/statically typed **superset** of JS — browsers can't run `.ts` directly, so it's compiled ("transpiled") down to plain JS first. Think of it as "JS with a type-checker bolted on before shipping."

---

## 🛠️ 2. Adding JS to a Page & DevTools

Two ways to include JavaScript in an HTML file:

```html
<!-- Internal: inline inside the HTML file -->
<script>
  console.log("hello");
</script>

<!-- External: linked from a separate file -->
<script src="./app.js"></script>
```

**Chrome DevTools panels you'll live in:**

| Tab | Purpose |
|---|---|
| **Elements** | Inspect/edit live HTML & CSS |
| **Console** | Your JS output — like a terminal for the page |
| **Sources** | See the actual loaded source files (what's loading from where) |
| **Network** | See every external request the browser makes (APIs, assets) |
| **Performance** | Profiling — where time is actually being spent |

---

## 🔢 3. Data Types — Primitive vs Non-Primitive

Every value in JS is either **primitive** (copied by value) or **non-primitive/reference** (copied by reference). This distinction quietly drives a lot of "why did my object change when I didn't touch it?" bugs.

### Primitive types (7 total)

| Type | Example | Notes |
|---|---|---|
| `string` | `"hello"`, `'hi'`, `` `hey` `` | Text |
| `number` | `5`, `3.14`, `-2` | JS has **one** numeric type — no separate int/float |
| `boolean` | `true`, `false` | |
| `undefined` | `let x;` | A variable declared but not yet assigned |
| `null` | `let x = null;` | An **intentional** "no value" — set by the developer, not the engine |
| `bigint` | `10n` | For integers too large for `number` to represent safely |
| `symbol` | `Symbol('id')` | A guaranteed-unique value, often used as object keys |

Primitives are **immutable** and **copied by value** — assigning one variable to another copies the actual value, so the two are fully independent afterward:

```js
let a = 5;
let b = a;   // b gets a COPY of 5
b = 10;
console.log(a, b);   // 5 10 — a is untouched
```

### Non-primitive type: `Object` (everything else)

Arrays, plain objects, functions, `Map`, `Set`, `Date` — **all** of these are technically `Object` under the hood (`typeof [] === 'object'`, `typeof function(){} === 'function'` as a special case).

Non-primitives are **copied by reference** — assigning one variable to another copies the **address**, not the data, so both variables point at the *same* underlying object:

```js
let obj1 = { age: 24 };
let obj2 = obj1;      // obj2 points to the SAME object as obj1
obj2.age = 30;
console.log(obj1.age);   // 30 — obj1 "changed" too, because they're the same object
```

### `undefined` vs `null`

- `undefined` = the engine's default when a variable exists but has no value yet (what `var` hoisting produces, what a missing function argument becomes).
- `null` = a value **you** explicitly assign to mean "empty on purpose."
- `typeof undefined === 'undefined'`, but `typeof null === 'object'` — a famous, long-standing JS quirk (a bug from JS's original implementation, kept for backward compatibility).

### `typeof` — checking a value's type at runtime

```js
typeof "hi"        // "string"
typeof 5            // "number"
typeof true          // "boolean"
typeof undefined     // "undefined"
typeof null          // "object"   (the quirk above)
typeof {}            // "object"
typeof []            // "object"   (arrays are objects — use Array.isArray() to detect arrays specifically)
typeof function(){}  // "function"
```

---

## ⚙️ 4. Execution Context — The Engine's Workspace

Every time JS runs *any* code, it does so inside an **Execution Context (EC)** — a container holding "what variables exist" and "what code is currently running."

### Global Execution Context (GEC)

- Created **once**, automatically, the moment the JS engine starts running your script.
- **Global context** = the default environment the whole program lives in — anything not inside a function belongs here.

### Function Execution Context (FEC)

> A **local execution context**, more formally the **Function Execution Context**, is a private environment created by the JS engine every time a function is *called* (not defined — called).

Every execution context (global or function) is really made of **two parts**:

| Part | Analogy | Holds |
|---|---|---|
| **Memory Component** (Variable Environment) | The pantry / board | Variables & function declarations, as key–value pairs |
| **Code Component** (Thread of Execution) | The chef actually cooking | Executes code **one line at a time** |

```
Const number = 5;
function addTwo(num) {
  return num + 2;
}
Const valueOne = addTwo(number);
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

> **Every execution context — global OR function — is structured identically.** The Global EC is not special: it's just the *first* context, created automatically. The moment ANY function is called, JS builds it a brand-new context with the exact same two-part shape (memory phase then code phase) as the global one, and stacks it on top. A function calling another function just means a third context, with its own memory + code phase, stacked on top of that one — and so on.

### The Call Stack

- The call stack is the **manager** — it tracks which execution context is currently running, as a literal **stack of contexts** (last in, first out).
- **Main thread**: checks code from **top to bottom**, like an interpreter, executing line by line.
- The **bottom** frame is always the Global EC — it's created first and only removed when the whole program finishes. Every function call adds a **new frame on top**; returning removes (pops) that frame.

```
function addTwo(num) {
  return num + 2;
}
function addTwoThenDouble(num) {
  const added = addTwo(num);      // calls addTwo → pushes a 3rd frame
  return added * 2;
}
const result = addTwoThenDouble(5);
```

```
   ┌───────────────────────────────────┐
 3 │  addTwo FEC                        │  ← top of stack: running right now
   │  memory: num = 5                   │     each frame runs its OWN
   │  code:   return num + 2            │     memory phase then code phase
   ├───────────────────────────────────┤
 2 │  addTwoThenDouble FEC              │  ← paused, waiting on addTwo to return
   │  memory: num = 5, added = undefined│
   │  code:   const added = addTwo(num) │
   ├───────────────────────────────────┤
 1 │  Global Execution Context (GEC)    │  ← bottom of stack, created first
   │  memory: addTwo=<fn>,              │     removed last (program end)
   │          addTwoThenDouble=<fn>,    │
   │          result = undefined        │
   └───────────────────────────────────┘
```

- Flow for the simpler single-call example above (`addTwo(number)`):
  1. `valueOne` calls `addTwo(number)`.
  2. A **new FEC for `addTwo`** is pushed onto the call stack, *with its own fresh memory phase and code phase* — completely separate memory from the GEC's.
  3. Memory provides the parameter (`num = 5`) to that new context.
  4. The execution thread runs `addTwo`'s code line by line.
  5. `addTwo` returns → its context **pops off** the stack → control goes back to the Global EC, which resumes exactly where it left off.
- Nothing about this is unique to `addTwo` — **every** function call, no matter how deeply nested, repeats the same "push a context with memory+code phases, run it, pop it" cycle. That's why a stack overflow (e.g. infinite recursion) is called a *stack* overflow — each unreturned call keeps piling a new context on top with nothing ever popping off.

> **Programming, at its core, is just:**
> - **Data** — storing things (strings, numbers, booleans, functions)
> - **Processing** — doing things with that data (loops, functions, variables)

---

## 🧩 5. Hoisting — Memory Phase vs Code Phase

> **Hoisting** is a JavaScript mechanism where variable, function, and class declarations are conceptually moved to the top of their containing scope (script or function) during the **compilation phase**, before code execution.
>
> This allows functions to be used before they're defined, and allows variables to be accessed without throwing an error — though `var` variables return `undefined` until their actual assignment line runs.

Every execution context is created in **two phases**:

1. **Memory Creation Phase** (a.k.a. Memory Phase) — the engine scans the *entire* script/function first, before running a single line, and:
   - Allocates memory for every `var` variable, setting it to `undefined`.
   - Allocates memory for every function *declaration*, storing the **entire function** (not just a placeholder).
   - Allocates memory for `let`/`const` too, but leaves them **uninitialized** (see TDZ below) — this is why "is `let` hoisted?" is a trick question.
2. **Code Execution Phase** (a.k.a. Code Phase) — the engine now runs the code **line by line**, top to bottom, using/overwriting what memory phase set up.

### Worked example — `var` hoisting

```js
console.log('Age is', age);   // ① runs BEFORE the var line, in source order
var age = 32;
console.log('Age is', age);   // ③
```

**Memory phase (before any line runs):**

| Identifier | Value |
|---|---|
| `age` (variable) | `undefined` |

**Code phase (line by line):**

```
① console.log('Age is', age)   →  "Age is undefined"   (age is still undefined here)
② var age = 32;                →  memory updates: age = 32
③ console.log('Age is', age)   →  "Age is 32"
```

**Output:**
```
Age is undefined
Age is 32
```

`age` is **not an error** on line ① because memory phase already reserved space for it (as `undefined`) before code phase started — this *is* hoisting.

### Worked example — function + var together

```js
age = 45;
console.log('Age is', age);
var age = 32;

hello();
console.log('Age is', age);

function hello() {
  console.log('This is hello');
}
```

Because **function declarations are hoisted with their full body** (unlike `var`, which is hoisted as `undefined`), `hello()` works even though it's called before its textual definition.

**Output:**
```
Age is 45
This is hello
Age is 32
```

### A second dry-run, with a function that reads a not-yet-assigned outer variable

```js
console.log('value of age is', age);
var age = 45;
console.log('Adding 5 to 10', addFive(10));
console.log('value of age is', age);

function addFive(number) {
  var result = number + 5;
  return result;
}
```

**Memory phase:**

| Global memory | |
|---|---|
| `age` | `undefined` (later `45`) |
| `addFive` | `<function>` (full body hoisted) |

When `addFive(10)` is called, a **new Function Execution Context** is pushed, with its own memory phase:

| addFive's memory | |
|---|---|
| `number` | `10` (parameter) |
| `result` | `undefined` → `15` |

**Output:**
```
value of age is undefined
Adding 5 to 10 15
value of age is 45
```

---

## 🔒 6. `var`, `let`, `const` — and the Temporal Dead Zone (TDZ)

| Keyword | Status | Re-declarable | Re-assignable | Hoisting behavior |
|---|---|---|---|---|
| `var` | **Deprecated** — avoid using it | ✅ | ✅ | Hoisted **and initialized** to `undefined` |
| `let` | ✅ Use this | ❌ | ✅ | Hoisted but **not initialized** → TDZ |
| `const` | ✅ Use this (default choice) | ❌ | ❌ (one-time assignment only) | Hoisted but **not initialized** → TDZ |

> **Interview question: "Is `let` hoisted?"**
> **Yes — with an explanation.** `let` declarations ARE hoisted (memory is reserved for them in the memory phase), but unlike `var` they are **not initialized**. Accessing them before their declaration line throws a `ReferenceError` because of the **Temporal Dead Zone**.

### Temporal Dead Zone (TDZ)

> A **Temporal Dead Zone** is the period from the start of a block scope (`{ }`) until a `let` or `const` variable is actually declared and initialized, during which the variable **exists but is inaccessible**, causing a `ReferenceError` if accessed. Unlike `var` variables, which are hoisted but `undefined`, `let`/`const` variables are hoisted but **locked**.

```js
console.log(age);   // ❌ ReferenceError — age is in the TDZ here
let age = 24;
console.log(age);   // ✅ 24

age = 45;
console.log(age);   // ✅ 45
```

**Memory phase view:**

| Identifier | State |
|---|---|
| `age` | `undefined` internally, but **locked** — any read/write before its `let` line throws `ReferenceError` |

> If you use `let`/`const` where `var` would silently give `undefined`, you get a **thrown error** instead — this is considered *safer*, since silent `undefined` bugs are hard to trace.

### `const` specifics

```js
const age = 24;
// age = 30;   ❌ TypeError: Assignment to constant variable.
```

- You can only **assign once** — re-assignment throws.
- It has the **same TDZ behavior** as `let`.
- (Note: `const` prevents *re-assignment* of the binding, not mutation — `const arr = []; arr.push(1);` is legal, because the array object itself is mutable even though `arr` always points to that same object.)

---

## 🔁 7. Functions

> A **function** is a reusable, single source of instructions you can call again and again instead of repeating code.

### Function Declaration (classic syntax)

```js
function functionName() {
  // code starts here
}

function addNumbers(num1, num2) {
  var result = num1 * num2;
  console.log('Result is', result);
}

addNumbers(2, 3);
```

- `num1`, `num2` here are **parameters** (the placeholders in the definition).
- `2`, `3` at the call site are **arguments** (the actual values passed in).

### Parameters, template literals, and `return`

```js
function greetUser(x) {
  console.log(`Hey ${x}`);
}
greetUser('Piyush');   // Hey Piyush
```

```js
function greetUser(x, y, z) {
  console.log(`hey, ${x} and ${y}${z}`);
}
greetUser('Dipali', 'Sharma', '.');
```

- Backticks `` ` ` `` enable **string interpolation** — `${variable}` embeds a variable's value directly in a string, instead of `'hey ' + x + ' and ' + y`.

```js
function add(num1, num2) {
  const result = num1 + num2;
  return result;   // `return` is the LAST statement the function executes
}
const r = add(2, 5);
```

Once `return` runs, the function exits immediately — any code after it inside that function never runs.

### Functions inside functions, and functions as values

```js
function cartoon() {
  function cartoonInsideCartoon() {
    return 'Naruto';
  }
  return cartoonInsideCartoon;   // returning the FUNCTION itself, not calling it
}

const anime = cartoon();     // anime is now a function
const r = anime();           // calling it assigns the value
console.log(r);              // Naruto
```

- A function can **return anything** — a string, number, object, or even another function.
- `typeof anime` here is `"function"`.

### Function Expression (alternate way to define a function)

```js
let cartoon = function () {
  console.log('Anime');
};
cartoon();
```

Here the function has no name of its own — it's assigned to a variable, and you call it through that variable.

### Arrow Functions (`=>`)

Arrow functions let you skip the `function` keyword, and — for single-expression bodies — the `return` keyword and curly braces too.

```js
//        name                    param     implicit return
const isAllowedToVote = (age) => age >= 18;

console.log(isAllowedToVote(23));   // true
```

```js
const isUserAllowedToOpenBankAccount = (age, minBalance) => {
  return age >= 18 && minBalance >= 5000;
};

console.log(isUserAllowedToOpenBankAccount(23, 6000));   // true
```

**Arrow function rules:**
- **One parameter** → parentheses are optional: `age => age >= 18` works.
- **Two or more parameters** → parentheses are **required**: `(age, minBalance) => ...`.
- **One expression, implicit return** → no braces, no `return` keyword needed.
- **Multiple statements** → you **must** use `{ }`, and then you **must** use `return` explicitly too (it's no longer implicit).

### `var` vs `let`/`const` inside functions — TDZ still applies

```js
age = 45;
console.log('Value of age is', age, 'Is Allowed?', isAllowedToVote(age));

var age = 24;
function isAllowedToVote(age) {
  return age >= 18;
}
```
Works fine with `var` (hoisted as `undefined`, function hoisted fully) → output: `Value of age is 45. Is Allowed? True`.

But swap `var age` for `let age` or `const age`, and the very first line throws a **`ReferenceError` (TDZ)** instead — because `age` is locked until its declaration line executes. Also: you cannot call a function through a variable while that variable is still `undefined`/uninitialized (e.g. calling `isAllowedToVote` via a `var` function-expression before its assignment line runs) — it isn't a callable value yet.

---

## 🌐 8. Scope — Where Variables Live

- **Global scope**: declared outside any function — accessible everywhere.
- **Local/Function scope**: declared inside a function — accessible only within that function (and nested functions inside it, via closures — covered in a later part).
- **Block scope** (`let`/`const` only): anything inside `{ }` — an `if` block, a `for` loop — is its own scope. `var` **ignores block scope** and leaks out to the nearest function/global scope, which is one of the big reasons `var` is deprecated in favor of `let`/`const`.

---

## 🔂 9. Loops

> **Loops** = doing something again and again ("gol-gol" — going in circles) until a condition stops matching.

| Loop | Best used when |
|---|---|
| `for` | You know **exactly** how many times to repeat |
| `while` | You know the **condition** to stop, but not how many iterations it'll take |
| `do...while` | Like `while`, but guarantees the body runs **at least once** |
| `for...in` | Iterating over an object's **keys** (or array indices) |
| `for...of` | Iterating over an **iterable's values** (arrays, strings, Maps, Sets) |
| `.forEach()` | Array iteration, built-in, no index management needed |
| `.map()` | Transform each element into a **new array** |
| `.filter()` | Keep only elements matching a condition, into a **new array** |
| `.reduce()` | Collapse an array down into a **single value** |

### `for` loop

```js
for (initializer; condition; increment) {
  // code to repeat
}

for (var x = 1; x <= 10; x = x + 1) {
  console.log('Value of x', x);
}
```

- **Condition must always evaluate to a boolean.**
- **Increment** means "add to the counter for the *next* iteration," applied *after* each loop body run.

**Dry run:**

| x | condition `x <= 10` | `x = x + 1` | console output |
|---|---|---|---|
| 1 | `1<=10` true | | 1 |
| 2 | `2<=10` true | | 2 |
| 3 | `3<=10` true | | 3 |
| … | … | | … |
| 10 | `10<=10` true | | 10 |
| 11 | `11<=10` **false** | | *(loop exits)* |

> The loop **checks** the condition an 11th time, but only **runs the body** 10 times — the check that fails never executes the body.

Use `for` when you **exactly know** how many times the code needs to run.

### `while` loop

```js
var fileSize = 1024;
var currentFileDownloaded = 0;

while (currentFileDownloaded < fileSize) {
  console.log('File ko download karte jao');
  currentFileDownloaded = currentFileDownloaded + 512;
}
```

**Analogy**: downloading a file — you don't know exactly how many chunks it'll take, but you know the *goal* (get the whole file). You only know the **stopping condition**, not the iteration count.

### `do...while` loop

```js
var fileSize = 1024;
var currentFileDownloaded = 0;

do {
  console.log('File ko download karo jao');
  currentFileDownloaded = currentFileDownloaded + 512;
} while (currentFileDownloaded < fileSize);
```

- Same as a `while` loop, **except** the body runs once **before** the condition is ever checked.
- Guarantees the code runs **at least once**, even if the condition is false from the start.

### `forEach` — built-in array iteration

```js
const fruits = ['apple', 'cheeku', true, 'aadu', 1, '🍎', 'santra', 'kela'];

fruits.forEach((x, y, z) => console.log(`--> ${x} ${y} ${z}`));
```

- Calls the given function once **for every element** in the array — no manual index/counter bookkeeping.

Hand-rolled version, to see what `forEach` does internally:

```js
function forEach(batao_kya_karna_hai) {
  for (let i = 0; i < fruits.length; i++) {
    batao_kya_karna_hai(fruits[i]);
  }
}
```

### `map` — transform into a new array

```js
const nums = [1, 2, 3, 4, 5, 6];
const result = nums.map((e) => e * 2);
console.log(result);   // [2, 4, 6, 8, 10, 12]
```

`map` **always returns a new array** of the same length — one output per input element.

Hand-rolled version:

```js
function map(arr, fn) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const currentElement = arr[i];
    const num = fn(currentElement);
    result.push(num);
  }
  return result;
}

const result = map(nums, (e) => e * 3);
console.log(result);   // [3, 6, 9, 12, 15, 18]
```

### `filter` — keep only what matches

```js
const nums = [1, 2, 3, 4, 5, 6];
const evens = nums.filter((e) => e % 2 === 0);
console.log(evens);   // [2, 4, 6]
```

- The callback must return a **boolean**. Elements where it returns `true` are kept; `false` are dropped.
- Like `map`, it **always returns a new array** — but that array can be shorter (or empty) instead of the same length.

### `reduce` — collapse into a single value

```js
const nums = [1, 2, 3, 4, 5, 6];
const total = nums.reduce((accumulator, currentElement) => accumulator + currentElement, 0);
console.log(total);   // 21
```

- `accumulator` carries the running result forward between iterations.
- The second argument to `.reduce()` (`0` here) is the **initial value** of the accumulator.
- `reduce` is the most general of the array HOFs — `map` and `filter` can both be written in terms of `reduce`, because "produce one output value from a list" covers transformation and filtering as special cases.

```js
// map, rebuilt using reduce
const doubled = nums.reduce((acc, e) => {
  acc.push(e * 2);
  return acc;
}, []);
console.log(doubled);   // [2, 4, 6, 8, 10, 12]
```

### `for...of` — iterate over VALUES

```js
const fruits = ['apple', 'cheeku', 'aadu'];

for (const fruit of fruits) {
  console.log(fruit);
}
// apple
// cheeku
// aadu
```

- Works on any **iterable**: arrays, strings, `Map`, `Set`.
- Gives you the **value** directly each iteration — no manual indexing needed.

### `for...in` — iterate over KEYS

```js
const user = { name: 'Piyush', age: 24, city: 'Delhi' };

for (const key in user) {
  console.log(key, '=', user[key]);
}
// name = Piyush
// age = 24
// city = Delhi
```

- Iterates over an object's **enumerable keys** (property names).
- Works on arrays too, but gives you **indices as strings** (`'0'`, `'1'`, …) — for arrays, prefer `for...of` or `.forEach` instead, since `for...in` can also pick up inherited/non-index properties unexpectedly.

| | Iterates over | Typical use |
|---|---|---|
| `for...of` | **values** | Arrays, strings, Maps, Sets |
| `for...in` | **keys** | Plain objects |

---

## 🥇 10. Higher-Order Functions (HOF) & Callbacks

> A **Higher-Order Function** is a function that **takes another function as a parameter** (and/or returns a function).
>
> The function passed in as an argument is commonly called a **callback function**.

```js
function meraPyaraFunction(udharKaFunction) {
  return udharKaFunction() + 40;
}

function cartoon() {
  return 10;
}

console.log(meraPyaraFunction(cartoon));   // 10 + 40 = 50
```

```js
function meraPyaraFunction(udharKaFunction) {
  return udharKaFunction() + 40;
}

function meraEkAurFunction() {
  return 100;
}

console.log(meraPyaraFunction(meraEkAurFunction));   // 100 + 40 = 140
```

`meraPyaraFunction` doesn't care *what* function it receives — it just calls whatever was passed in and adds 40 to the result. `.forEach`, `.map`, `.filter`, `.reduce` are all **built-in HOFs**: they take your callback and call it for you, once per element.

---

## 📦 11. Data Structures

> **Data Structure** = storing data in memory in a particular, organized shape.

### Array `[ ]`

> An **array** is a single object used to store an **ordered collection of multiple values** under a single variable name.

- **Dynamic** — grows/shrinks as needed.
- **Zero-indexed** — the first element is at index `0`.
- Can mix **any data type** in one array — strings, numbers, booleans, even other arrays/objects.

```js
const fruits = ['apple', 'cheeku', true, 'aadu', 1, '🍎', 'santra', 'kela'];
//                0         1        2      3     4   5      6         7

console.log(fruits[4]);    // aadu
console.log(fruits[10]);   // undefined — out-of-bounds access does NOT throw, it just returns undefined
console.log(fruits);       // prints the whole array
```

**Common array methods:**

```js
fruits.push('Kiwi');                 // add to the END
console.log(fruits.length);          // check the length
console.log(fruits.includes('aadu')); // true — check if a value exists

const firstElement = fruits.slice(2, 5);  // copies index 2 up to (not including) 5
console.log(fruits.indexOf('1'));         // find an element's index
fruits.unshift('1', '2', '3');            // add to the START
```

- `.slice(start, end)` returns a **copy** of a section — it does not mutate the original array.
- `.push` / `.unshift` **do** mutate the original array (add to end / start respectively).

### Object `{ }`

> An **object** stores data as **key–value pairs** — unordered, accessed by key **name** instead of a numeric index. Use an object when data has *labeled* fields (`name`, `age`) rather than a plain sequence.

```js
const user = {
  name: 'Piyush',
  age: 24,
  isAdmin: false,
};

console.log(user.name);       // dot notation → Piyush
console.log(user['age']);     // bracket notation → 24 (needed when the key is dynamic or not a valid identifier)

user.city = 'Delhi';          // add a new key
user.age = 25;                // update an existing key
delete user.isAdmin;          // remove a key

console.log(user);            // { name: 'Piyush', age: 25, city: 'Delhi' }
```

- **Dot notation** (`user.name`) requires the key to be a valid identifier known ahead of time.
- **Bracket notation** (`user['name']` or `user[someVariable]`) works with **dynamic** keys computed at runtime.

**Common Object methods:**

```js
console.log(Object.keys(user));     // ['name', 'age', 'city']  — array of keys
console.log(Object.values(user));   // ['Piyush', 25, 'Delhi']  — array of values
console.log(Object.entries(user));  // [['name','Piyush'], ['age',25], ['city','Delhi']] — key/value pairs

console.log('name' in user);        // true — check if a key exists
console.log(user.hasOwnProperty('age'));   // true
```

**Objects nested inside arrays, and arrays nested inside objects** — this is the shape most real-world data (API responses, JSON) takes:

```js
const users = [
  { name: 'Piyush', age: 24 },
  { name: 'Dipali', age: 22 },
];

users.forEach((u) => console.log(u.name));   // Piyush, Dipali
```

### Map

> A **Map** is a key–value collection, similar to an object, but keys can be **any type** — not just strings/symbols — and it **guarantees insertion order**.

```js
const scores = new Map();

scores.set('alice', 90);        // add / update
scores.set('bob', 75);
scores.set(42, 'numeric key too');   // keys can be ANY type, unlike object keys

console.log(scores.get('alice'));    // 90
console.log(scores.has('bob'));      // true
console.log(scores.size);            // 3

scores.delete('bob');
console.log(scores.size);            // 2

for (const [key, value] of scores) {
  console.log(key, value);
}
```

**Map vs Object — when to reach for which:**

| | Object | Map |
|---|---|---|
| Key types | String/Symbol only | **Any** value, including objects |
| Order | Not guaranteed (mostly insertion in practice, but not spec-guaranteed for all key types) | **Always** insertion order |
| Size check | `Object.keys(obj).length` | `.size` (built-in) |
| Best for | Fixed, labeled records (JSON-like data) | Frequently added/removed key-value data, non-string keys |

### Set

> A **Set** is a collection of **unique values only** — adding a duplicate is silently ignored.

```js
const ids = new Set();

ids.add(1);
ids.add(2);
ids.add(2);   // duplicate — ignored, Set still has only one `2`

console.log(ids);        // Set(2) {1, 2}
console.log(ids.has(2)); // true
console.log(ids.size);   // 2

ids.delete(1);
console.log(ids);        // Set(1) {2}
```

A common real-world use: **de-duplicating an array** in one line —

```js
const nums = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(nums)];
console.log(unique);   // [1, 2, 3]
```

---

## 🖥️ 12. The DOM

> The **DOM (Document Object Model)** is the browser's live, in-memory **tree representation** of your HTML. It's what JS actually reads and manipulates to change what's on screen — JS has no built-in concept of `<div>` or `<button>`; the **browser** exposes the DOM as an API so JS can query and mutate the page.

```
document
 └── html
      ├── head
      │    └── title
      └── body
           ├── h1
           └── div
                └── p
```

Every HTML tag becomes a **node** in this tree. JS talks to the page by walking/editing this tree — it never edits your `.html` file directly.

### Selecting elements

```js
document.getElementById('main');            // single element, by id
document.querySelector('.card');            // first match, any CSS selector
document.querySelectorAll('.card');         // ALL matches, as a NodeList
document.getElementsByClassName('card');    // ALL matches, as a live HTMLCollection
document.getElementsByTagName('li');        // ALL matches, as a live HTMLCollection
```

- `querySelector`/`querySelectorAll` accept **any CSS selector** (`'#id'`, `'.class'`, `'div > p'`) — the most flexible, generally the default choice today.
- `getElementsBy...` methods return a **live** collection (auto-updates if the DOM changes); `querySelectorAll` returns a **static** snapshot.

### Reading & changing content

```js
const el = document.querySelector('#main');

el.textContent = 'Hello';        // sets plain text (safe — no HTML parsing)
el.innerHTML = '<b>Hello</b>';   // sets HTML markup (parses tags — be careful with user input, XSS risk)

console.log(el.textContent);     // read it back
```

### Changing styles, classes, attributes

```js
el.style.color = 'red';
el.style.backgroundColor = 'black';

el.classList.add('active');
el.classList.remove('hidden');
el.classList.toggle('open');       // add if missing, remove if present
el.classList.contains('active');   // true/false

el.setAttribute('data-id', '42');
el.getAttribute('data-id');        // '42'
```

### Creating & inserting elements

```js
const newDiv = document.createElement('div');
newDiv.textContent = 'I am new';

document.body.appendChild(newDiv);     // insert at the end
el.remove();                            // remove an element from the DOM
```

### Events

```js
const button = document.querySelector('#submit-btn');

button.addEventListener('click', function (event) {
  console.log('Button clicked!', event);
});
```

- `addEventListener` is a **Higher-Order Function** — it takes your callback and calls it every time the event fires.
- The callback receives an `event` object describing what happened (which element, mouse position, key pressed, etc).
- Prefer `addEventListener` over inline `onclick="..."` HTML attributes — it keeps JS out of markup and allows **multiple** listeners on the same element.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** (this doc) | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types incl. `map`/`filter`/`reduce`, HOF/callbacks, Array/Object/Map/Set with methods, DOM selection/manipulation/events |
| **2. Console, Environment, Data & Closures** | `console` methods, runtime vs compile time, pointers/references/shallow vs deep copy, `Symbol`, browser/Node-provided APIs vs pure JS, object/array declaration styles, Numbers & `Math`, String methods, Array mutating vs non-mutating methods, Object methods (`freeze`/`seal`/`defineProperty`), `arguments` object, pure vs impure functions, IIFE, closures |
| **3. `this`, Destructuring** *(planned)* | `this` binding rules (implicit/explicit/`new`/arrow), destructuring, spread/rest, optional chaining |
| **4. Async JavaScript** *(planned)* | Callbacks vs Promises vs `async`/`await`, the event loop, microtask vs macrotask queue, `fetch` |
| **5. Advanced/OOP** *(planned)* | Prototypes & prototype chain, classes, `bind`/`call`/`apply`, modules (`import`/`export`) |

*(Notes sourced from the Feb 7 & Feb 8 2026 handwritten class notes. This is a working series — as more class notes come in, expect these docs to get reorganized/renumbered/merged rather than staying frozen in their current split. See [2-Console-Variables-Data-Objects.md](2-Console-Variables-Data-Objects.md) for Part 2.)*
