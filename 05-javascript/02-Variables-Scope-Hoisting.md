# Variables, Scope & Hoisting
## Part 2 of 17 — What's Really Happening Inside an Execution Context

---

## 📌 Executive Summary

- Every execution context runs in **two phases**: a **memory (creation) phase** that scans the whole script/function up front, followed by a **code (execution) phase** that runs line by line — this two-phase model is why "compile time" and "runtime" are different moments in JS, and it's the entire mechanism behind hoisting.
- **Hoisting** means declarations are set up in memory *before* any line of code actually runs — `var` variables are hoisted and initialized to `undefined`; function declarations are hoisted with their **entire body**; `let`/`const` are hoisted but left **uninitialized**.
- `var`, `let`, and `const` differ in re-declaration, re-assignment, and — critically — in what happens when you touch them before their declaration line runs.
- The **Temporal Dead Zone (TDZ)** is the stretch between a scope starting and a `let`/`const` variable's declaration line actually executing — touch it in that window and JS throws a `ReferenceError` instead of silently handing back `undefined`.
- **Scope** — global, function, and block — determines *where* a variable is visible at all, independently of when it becomes usable.

---

## 🧠 Core Analogy: The Building Under Construction

Picture a building project that happens in two distinct passes, not one:

- **Pass 1 — the blueprint survey.** Before a single brick is laid, a surveyor walks the entire site and stakes out every room that will exist: kitchen, bedrooms, garage. Each staked plot gets a marker, but most rooms are empty shells at this point — nothing is built inside them yet. This is the **memory phase**.
- **Pass 2 — actual construction.** Now the crew works through the site room by room, in order, actually building out what goes in each staked plot. This is the **code phase**.

A `var` room gets staked out *and* immediately filled with a folding chair (`undefined`) during the survey pass — so if you wander in during construction before the crew reaches that room, you'll find *something* there, just not the finished furniture yet.

A function declaration is different: the surveyor doesn't just stake the plot, they build the **entire room, fully furnished**, right there during the survey pass. That's why you can walk into a function's "room" and use it before construction crews ever reach that part of the blueprint in sequence.

A `let`/`const` room gets staked out too — the plot is reserved — but it's roped off with **caution tape** and legally inaccessible until the construction crew physically arrives at that plot during Pass 2. Try to enter early and security stops you cold. That roped-off period is the **Temporal Dead Zone**.

And **scope** is simply which rooms you're allowed to walk into from where you're standing — a room built inside a private office (a function) isn't reachable from the public lobby (global scope), while the lobby itself is reachable from anywhere.

---

## ⏱️ 1. Runtime vs Compile Time

As covered in file 1, every line of JS executes inside an execution context, and the engine builds that context before running anything in it. That construction step splits into two genuinely different moments:

> **Compile time** is when the engine parses and validates code *before* running it — checking syntax, building the AST, and performing hoisting's memory-phase setup. **Runtime** is when the engine is actually *executing* code line by line, evaluating expressions and producing real values.

| | Compile Time | Runtime |
|---|---|---|
| When | Before execution starts | While execution is happening |
| Catches | **Syntax errors** (e.g. missing `}`, invalid token) | **Logical/type errors** that surface during execution (e.g. calling something that isn't a function) |
| Example error | `SyntaxError: Unexpected token` | `TypeError: x is not a function` |
| Relationship to hoisting | The memory creation phase (below) is compile-time-adjacent — the engine scans and reserves memory *before* code phase runs | The code execution phase — the actual line-by-line run |

```js
// SyntaxError — caught at compile time, before ANYTHING runs (even a console.log above it won't fire)
function broken( {
  console.log("never reached");
}
```

```js
// TypeError — the engine only discovers this while RUNNING the line
const x = 5;
x();   // TypeError: x is not a function
```

Two consequences follow directly from this split:

- A syntax error anywhere in a script prevents the **entire script** from running at all — the engine can't even start, because it never finishes compiling.
- A runtime error only halts execution **from that line onward** — everything before it already ran successfully.

> JS is not a purely "interpreted" language in the classic line-by-line sense — as file 1 covered, the engine compiles (and JIT-recompiles) internally before and while running. "Compile time" here means *before the specific line executes*, not "before the whole program is turned into a standalone executable" the way a C compiler works.

This compile-time/runtime split is the mental model that everything else in this file depends on — hoisting is nothing more than "what the engine does during the compile-time-adjacent portion of building an execution context."

---

## 🧩 2. Hoisting — Memory Phase vs Code Phase

> **Hoisting** is a JavaScript mechanism where variable, function, and class declarations are conceptually set up in their containing scope during the **memory creation phase**, before code execution begins.
>
> This allows functions to be called before their textual definition, and allows `var` variables to be referenced without throwing an error — though they return `undefined` until their actual assignment line runs.

Building directly on file 1's Execution Context model: every execution context — global or function — is created in **two phases**:

1. **Memory Creation Phase** — the engine scans the *entire* script or function first, before running a single line, and:
   - Allocates memory for every `var` variable, setting it to `undefined`.
   - Allocates memory for every function *declaration*, storing the **entire function** (not just a placeholder).
   - Allocates memory for `let`/`const` too, but leaves them **uninitialized** (this is the seed of the TDZ, covered in §3) — which is why "is `let` hoisted?" is a trick question.
2. **Code Execution Phase** — the engine now runs the code **line by line**, top to bottom, using and overwriting whatever memory phase set up.

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

`age` is **not an error** on line ① because memory phase already reserved space for it (as `undefined`) before code phase started — this *is* hoisting in action.

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

Trace it the same way:

- **Memory phase** scans the whole script first: `age` is reserved as `undefined`; `hello` is reserved with its **entire function body** already attached (not just a name).
- **Code phase**, line by line:
  1. `age = 45;` → memory updates: `age = 45`.
  2. `console.log('Age is', age);` → prints `"Age is 45"` (the assignment on line 1 already ran).
  3. `var age = 32;` → this line is really just `var age` (already handled in memory phase) plus `age = 32`, so memory updates: `age = 32`.
  4. `hello();` → works even though it's called *before* its textual definition, because memory phase already stored the full function — output `"This is hello"`.
  5. `console.log('Age is', age);` → prints `"Age is 32"`.

**Output:**
```
Age is 45
This is hello
Age is 32
```

The key contrast this example exposes: `var` is hoisted as an empty placeholder (`undefined`), but a function **declaration** is hoisted fully built and immediately callable — that asymmetry is the whole reason "functions can be called before they're defined" is true for declarations.

### A third dry-run — a function reading a not-yet-assigned outer variable

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

**Memory phase (global):**

| Global memory | |
|---|---|
| `age` | `undefined` (later `45`) |
| `addFive` | `<function>` (full body hoisted) |

**Code phase, line by line:**

1. `console.log('value of age is', age);` → `age` was reserved as `undefined` in memory phase, and its assignment line hasn't run yet → prints `"value of age is undefined"`.
2. `var age = 45;` → memory updates: `age = 45`.
3. `console.log('Adding 5 to 10', addFive(10));` → calling `addFive(10)` **pushes a brand-new Function Execution Context** on top of the call stack (exactly the mechanism from file 1), with its own private memory phase:

   | `addFive`'s memory | |
   |---|---|
   | `number` | `10` (parameter, filled in at call time) |
   | `result` | `undefined` → later `15` |

   Inside that new context: `result` starts hoisted as `undefined`, then `var result = number + 5;` runs and sets it to `15`, and `return result;` sends `15` back and pops the `addFive` frame off the stack. Back in the global context, the log prints `"Adding 5 to 10 15"`.
4. `console.log('value of age is', age);` → `age` is now `45` (its assignment already ran in step 2) → prints `"value of age is 45"`.

**Output:**
```
value of age is undefined
Adding 5 to 10 15
value of age is 45
```

Notice this trace leans directly on file 1's Call Stack model: `addFive(10)` doesn't just "run some code" — it pushes an entirely separate execution context with its own two-phase memory/code cycle, nested inside the global context's own two-phase cycle. Hoisting isn't a one-time global event; it happens fresh, every single time *any* execution context — global or function — is created.

---

## 🔒 3. `var`, `let`, `const` — and the Temporal Dead Zone (TDZ)

| Keyword | Status | Re-declarable | Re-assignable | Hoisting behavior |
|---|---|---|---|---|
| `var` | **Legacy** — discouraged in modern code | ✅ | ✅ | Hoisted **and initialized** to `undefined` |
| `let` | ✅ Use this | ❌ | ✅ | Hoisted but **not initialized** → TDZ |
| `const` | ✅ Use this (default choice) | ❌ | ❌ (one-time assignment only) | Hoisted but **not initialized** → TDZ |

> **Interview question: "Is `let` hoisted?"**
> **Yes — with an explanation.** `let` declarations ARE hoisted (memory is reserved for them in the memory phase), but unlike `var` they are **not initialized**. Accessing them before their declaration line throws a `ReferenceError` because of the Temporal Dead Zone.

### Temporal Dead Zone (TDZ)

> The **Temporal Dead Zone** is the period from the start of a scope until a `let` or `const` variable is actually declared and initialized, during which the variable **exists in memory but is inaccessible**, throwing a `ReferenceError` if touched. Unlike `var` variables, which are hoisted but readable as `undefined`, `let`/`const` variables are hoisted but **locked**.

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
| `age` | Reserved internally, but **locked** — any read/write before its `let` line throws `ReferenceError` |

> Where `var` would silently hand back `undefined`, `let`/`const` throw a **loud error** instead — this is considered *safer* in practice, since a silent `undefined` is much harder to trace back to its cause than an immediate, specific error at the exact line that misused the variable.

The same TDZ rule applies just as strictly inside a function. Swap `var age` for `let age` (or `const age`) in code that reads `age` before its declaration line, and the very first read throws `ReferenceError: Cannot access 'age' before initialization` — even though the exact same code with `var` would have run and simply printed `undefined`.

### `const` specifics

```js
const age = 24;
// age = 30;   ❌ TypeError: Assignment to constant variable.
```

- You can only **assign once** — any re-assignment throws a `TypeError`.
- It has the **same TDZ behavior** as `let` — hoisted, but locked until its declaration line runs.
- **Important nuance:** `const` locks the *binding* (the name-to-value link), not the *value* itself. `const arr = []; arr.push(1);` is completely legal — the array object itself is still mutable, `arr` just always has to keep pointing at that same object. What `const` actually protects, and how object mutation works under the hood, is covered in depth in file 3 (`03-Data-Types-Coercion-Memory.md`).

---

## 🌐 4. Scope — Where Variables Live

**Scope** answers a different question than hoisting does. Hoisting is about *when* a variable becomes usable inside its own execution context; scope is about *where* — which parts of the code can even see a given variable at all.

- **Global scope**: declared outside any function — visible and accessible from anywhere in the program, including inside every function.
- **Function (local) scope**: declared inside a function using `var`, `let`, or `const` — accessible only within that function itself (and, as covered in a later file on closures, within functions nested inside it).
- **Block scope** (`let`/`const` only): anything inside a pair of curly braces `{ }` — an `if` block, a `for` loop, or even a bare `{ }` — creates its own scope for `let`/`const`. `var` has **no concept of block scope** at all: it ignores the block entirely and leaks out to the nearest enclosing function scope (or global scope, if there is no enclosing function). This is one of the core reasons `var` is considered deprecated in modern code.

```js
if (true) {
  var leaked = "I escape the block";
  let contained = "I stay inside the block";
}

console.log(leaked);      // "I escape the block" — var ignored the block
console.log(contained);   // ❌ ReferenceError — contained never existed out here
```

Scope and hoisting work together, not against each other: hoisting determines what happens *within* whatever scope a declaration belongs to, and scope determines which execution contexts even get a copy of that declaration's memory slot in the first place.

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| **Compile time** | Before a line runs — syntax checked, memory phase happens here |
| **Runtime** | While a line is actually executing — evaluates expressions, produces values |
| **Memory phase** | Engine scans the whole scope first, reserving space for every declaration |
| **Code phase** | Engine runs the scope's code line by line, using what memory phase set up |
| **Hoisting** | Declarations are set up in memory before any code in that scope runs |
| `var` hoisting | Hoisted **and initialized** to `undefined` |
| Function declaration hoisting | Hoisted with its **entire body** — callable before its textual position |
| `let` / `const` hoisting | Hoisted but left **uninitialized** — locked until their declaration line runs |
| **TDZ** | The locked window between scope start and a `let`/`const`'s declaration line actually running |
| `const` | Locks the **binding**, not the value — re-assignment throws, but object contents can still change |
| **Global scope** | Declared outside any function — visible everywhere |
| **Function scope** | Declared inside a function — visible only inside that function |
| **Block scope** | `{ }` creates a new scope for `let`/`const` only — `var` ignores it and leaks out |

---

## 🎯 Key Takeaways

- Every execution context — global or function — is built in two phases: memory phase reserves space for every declaration first, and code phase then runs the actual lines top to bottom. Hoisting is simply the visible effect of that memory phase running before code phase starts.
- `var` is hoisted and pre-filled with `undefined`; function declarations are hoisted with their full body attached and are immediately callable; `let`/`const` are hoisted but left locked in the Temporal Dead Zone until their own declaration line executes.
- The TDZ trades a silent `undefined` bug (with `var`) for a loud, immediate `ReferenceError` (with `let`/`const`) — which is exactly why `let`/`const` are considered safer defaults.
- `const` only prevents re-assigning the variable's binding — it says nothing about whether the value it points to can be mutated internally; that distinction matters once objects and arrays enter the picture.
- Scope (global, function, block) and hoisting are separate but cooperating concepts: scope decides *where* a declaration is visible at all; hoisting decides *when*, within that scope, it becomes safely usable.

---

## 📚 Related Concepts to Explore Next

This file dug into what happens *inside* an execution context's two phases — building directly on the Execution Context and Call Stack model from file 1, [`01-JS-Engine-Runtime-DevTools.md`](./01-JS-Engine-Runtime-DevTools.md). The next file, [`03-Data-Types-Coercion-Memory.md`](./03-Data-Types-Coercion-Memory.md), picks up the `const`-mutability thread left open in §3 — it covers primitives vs reference types, how objects are actually stored and copied in memory, and how JavaScript coerces values between types.

---

## 🔗 Resources

- [MDN — Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- [MDN — `let`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN — `const`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- [MDN — Scope (Glossary)](https://developer.mozilla.org/en-US/docs/Glossary/Scope)
