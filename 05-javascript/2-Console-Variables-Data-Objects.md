# JavaScript: Console, Runtime vs Compile Time, Data Manipulation, Objects & Built-ins
## Part 2 of N — The Environment Around Your Code

---

## 📌 Executive Summary: The Big Picture

Part 1 covered *how JS executes* (engine, execution context, hoisting). Part 2 covers what surrounds that execution:

- **What is JS actually talking to when you call `console.log` or `fetch`?** → Not JS itself — the **browser** or **Node's libuv**, handing capabilities to the engine.
- **When does the engine decide something is broken — before running, or while running?** → Compile time vs runtime.
- **If `const` locks a variable, why can I still `.push()` into a const array?** → What "locked" actually means (the binding, not the data).
- **What tools does the language give you to inspect, store, and transform data?** → `console`, primitives revisited (Symbol, pointers), Object/Array/String/Math built-ins.

---

## 🧠 Core Analogy: The Restaurant, Continued

- **JS Engine** = the chef, who can only cook (compute) — no phone, no delivery bike, no oven timer built in.
- **Browser / Node runtime** = the restaurant building itself — it provides the phone (`fetch`), the delivery bike (timers), the oven with a timer that isn't the chef's own hands (`libuv`'s async I/O). The chef *uses* these, but doesn't *own* them.
- **`console`** = the chef's order-ticket printer — a diagnostic tool for watching what's happening, not part of the dish itself.
- **`const`** = a **name tag glued to a locker**, not a lock on the locker's contents. You can't put a different locker behind that name tag (`x = newValue` ❌), but you're free to rearrange what's *inside* the locker (`x.push(...)`, `x.prop = ...` ✅) — because the name tag only ever promised "always points at *this* locker," never "this locker's contents are frozen."

---

## 🛠️ 1. `console` — Your Diagnostic Toolkit

> **DevTools tip:** pasting multi-line code directly into the browser console is blocked by default as an anti-self-XSS measure. Type `allow pasting` into the console first (or click through the warning) to enable it.

`console` isn't part of the JS language spec — it's a **host object**, provided by the runtime (the browser or Node), which is why its exact method set can vary slightly between environments. But its core methods are universally available:

```js
console.log("Clue found: ", "Muddy footprint near the window");

console.warn("Warning: Fingerprint evidence detected");   // yellow, non-fatal warning
console.error("Warning: Fingerprint evidence detected");  // red, error-level — often includes a stack trace
```

| Method | Purpose |
|---|---|
| `console.log()` | General-purpose output |
| `console.warn()` | Flags something concerning but non-fatal — shows with a yellow warning icon in DevTools |
| `console.error()` | Flags a genuine error — shows in red, usually with a stack trace |
| `console.table()` | Renders array-of-objects data as an actual **table** — invaluable for scanning structured data at a glance |
| `console.group()` / `console.groupEnd()` | Visually nests a block of logs under a collapsible group header |
| `console.time()` / `console.timeEnd()` | Measures how long the code between the two calls took to run |

### `console.table` — structured data at a glance

```js
const evidenceLog = [
  { id: 1, item: "Muddy footprint", location: "Window sill" },
  { id: 2, item: "Broken glass", location: "Living room" },
  { id: 3, item: "Red fiber strand", location: "Door handle" },
];

console.table(evidenceLog);
```

Renders as an actual table in DevTools — columns `id`, `item`, `location` — far easier to scan than a wall of nested `console.log` output.

### `console.group` — nesting related logs

```js
console.group("Group starts");
console.log("My log 1");
console.log("My log 2");
console.log("My log 3");
console.groupEnd();
```

All three logs appear visually indented under a collapsible "Group starts" header in DevTools.

### `console.time` — measuring performance

```js
console.time("loop duration");

let dnaMatches = 0;
for (let i = 0; i < 1_000_000; i++) {
  dnaMatches++;
}

console.timeEnd("loop duration");   // prints: "loop duration: 4.2ms" (or similar)
```

- Both calls must use the **same label string** to pair up.
- Useful for quick, informal performance checks — not a substitute for the Performance tab's proper profiler.

### Numeric literal separators — `1_000_000`

```js
const light_speed = 299_888_999;
```

The underscore `_` is a **visual separator only** — it has zero effect on the value; `299_888_999 === 299888999`. Purely there to make large numbers human-readable in source code (like a comma in `299,888,999`), a feature JS added specifically because engineers kept miscounting zeros.

---

## ⏱️ 2. Runtime vs Compile Time

> **Compile time** is when the JS engine parses and validates your code *before* running it — checking syntax, building the AST, and doing hoisting's memory-phase setup. **Runtime** is when the engine is actually *executing* code line by line, evaluating expressions and producing real values.

| | Compile Time | Runtime |
|---|---|---|
| When | Before execution starts | While execution is happening |
| Catches | **Syntax errors** (e.g. missing `}`, invalid token) | **Logical/type errors** happening during execution (e.g. calling something that isn't a function, `undefined.property`) |
| Example error | `SyntaxError: Unexpected token` | `TypeError: x is not a function` |
| Relationship to hoisting | Memory Creation Phase (Part 1, §5) is compile-time-adjacent — the engine scans and reserves memory *before* code phase runs | Code Execution Phase — the actual line-by-line run |

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

- A syntax error anywhere in a script prevents the **entire script** from running at all — the engine can't even start, because it can't finish compiling.
- A runtime error only halts execution **from that line onward** — everything before it already ran.

> JS is not a purely "interpreted" language in the classic sense — V8 does an internal compile step (parsing to bytecode, then JIT-compiling hot code paths to machine code) before/while running. "Compile time" here means *before the specific line executes*, not "before the whole program is turned into a `.exe`" the way C would.

---

## 📍 3. Pointers, References & How `const` Data Gets Manipulated

JS doesn't expose raw memory addresses to you the way C does, but the *concept* of a pointer is exactly what's happening under the hood with non-primitive (reference) types — recall from Part 1 §3 that objects are **copied by reference**, not by value.

### Primitives: copied by value (no shared pointer)

```js
let originalHP = 100;
let cloneHP = originalHP;   // cloneHP gets its OWN copy of the number 100

cloneHP = 80;

console.log("Original HP: ", originalHP);   // 100 — untouched
console.log("Cloned HP: ", cloneHP);        // 80
```

### Objects: copied by reference (shared pointer)

```js
const originalSword = {
  name: "Flame Sword",
  damage: 75,
};

const cloneSword = originalSword;   // cloneSword points at the SAME object in memory

cloneSword.damage = 100;

console.log("Original Sword: ", originalSword.damage);   // 100 — changed too!
```

`cloneSword` was never a copy of the *data* — it's a second name tag pointing at the exact same underlying object. Mutating through either name changes the one shared object both names see.

### Why does `const arr.push(...)` work, then?

> `const` freezes the **binding** (which locker the name tag points to), not the **contents** of the locker. The variable can never be reassigned to point at a *different* object/array — but nothing stops you from reaching inside the same object/array and changing what's there.

```js
const treasureChest = { gold: 100, rubies: 50 };
treasureChest.gold = 150;          // ✅ legal — mutating the SAME object's contents
// treasureChest = { gold: 50 };   // ❌ TypeError — reassigning the binding itself

const crewRoster = ["Alok", "Abhinav"];
crewRoster.push("Vraj");           // ✅ legal — mutating the same array
crewRoster[0] = "Shubham";         // ✅ legal — same array, different content
// crewRoster = ["Someone"];       // ❌ TypeError — reassigning the binding itself
```

### Shallow copy vs deep copy — where the "shared pointer" problem resurfaces

```js
const armorOriginal = {
  name: "Iron Plate",
  defence: 80,
  buff: { fire: 10 },
};

const armorCopy = { ...armorOriginal };   // spread copies ONE LEVEL deep only
armorCopy.buff.fire = 90;

console.log(armorOriginal.buff.fire);   // 90 — changed anyway!
```

- The spread operator `{ ...obj }` makes a **shallow copy**: top-level keys get new, independent slots, but any *nested* object/array inside is still the **same shared reference** as before.
- `armorCopy.defence = 999` would **not** affect `armorOriginal` (top-level, safely copied) — but `armorCopy.buff.fire = 90` **does** (nested object, still shared).

```js
const potionOriginal = { name: "Health", effects: { heal: 40, mana: 30 } };
const potionCopy = structuredClone(potionOriginal);   // TRUE deep copy — no shared references at any depth

potionCopy.effects.heal = 999;
console.log(potionOriginal.effects.heal);   // 40 — untouched, fully independent
```

`structuredClone()` is a modern, built-in global function that performs a genuine **deep copy** — every nested object/array gets its own independent memory, no shared pointers remain anywhere in the structure.

---

## 🔤 4. Symbol — the Guaranteed-Unique Primitive

```js
const uniqueRuneId = Symbol("rune_of_fire");
const uniqueRuneId2 = Symbol("rune_of_fire");

console.log(uniqueRuneId === uniqueRuneId2);   // false — every Symbol() call makes a BRAND NEW unique value
console.log(uniqueRuneId.toString());          // "Symbol(rune_of_fire)"
console.log(typeof uniqueRuneId);              // "symbol"
```

- The string passed to `Symbol(...)` (`"rune_of_fire"`) is just a **description** for debugging — it has **no effect** on uniqueness. Two symbols with the identical description are still two completely distinct values.
- Common real use: as object property keys that are guaranteed never to collide with any other key (including keys added by other code/libraries) — useful for "private-ish" or metadata-style properties that shouldn't clash.

---

## 🌐 5. What JS Does NOT Own: Browser & Node APIs

> `console`, `setTimeout`, `fetch`, `document`, the file system, and networking are **not part of the JavaScript language itself**. The JS engine (V8) can only compute — it doesn't know how to talk to a network card or a screen. These capabilities are provided by the **host environment**: the **browser** (via Web APIs) or **Node.js** (via `libuv` and Node's built-in modules).

```
┌─────────────────────────────────────────────┐
│              Browser / Node.js                │
│                                                 │
│   ┌───────────────┐      ┌──────────────────┐ │
│   │   V8 Engine    │      │   Host APIs       │ │
│   │  (pure JS)     │◀────▶│  console, DOM,    │ │
│   │  computation    │      │  fetch, timers,   │ │
│   │  only           │      │  file system      │ │
│   └───────────────┘      └──────────────────┘ │
└─────────────────────────────────────────────┘
```

| API | Who provides it | Why it's not "just JS" |
|---|---|---|
| `console.log` | Browser DevTools / Node's stdout | The ECMAScript spec doesn't define `console` at all |
| `document.querySelector` | Browser (Web APIs / DOM) | The DOM doesn't exist outside a browser — this is why plain Node scripts have no `document` |
| `setTimeout`, `setInterval` | Browser (Web APIs) or Node (via `libuv`) | The engine alone has no concept of "wait and come back later" — a timer thread outside the engine handles that |
| `fetch` | Browser (Web APIs) or Node (built on `libuv`/`undici`) | Making a real network request needs OS-level networking, which the JS engine cannot do on its own |
| File system (`fs` module) | Node only, via `libuv` | Browsers deliberately don't expose raw file access (security) — this is Node-specific |

- **`libuv`** is the C library underlying Node.js that provides the **event loop**, async I/O, and thread pool — it's what actually performs file reads, network calls, and timers *outside* the single-threaded JS engine, then hands the result back to JS via the callback queue.
- This is *why* `setTimeout(fn, 0)` doesn't run `fn` immediately, and *why* `fetch` is asynchronous — the actual work happens outside the JS engine, on infrastructure the engine doesn't control, and JS only gets notified once that work finishes. (The full mechanics of this handoff — the event loop, call stack, macrotask/microtask queues — are covered in the upcoming Async part of this series.)

---

## 📦 6. Ways to Declare Objects & Arrays

### Objects — declaration styles

```js
// 1. Object literal — the standard, near-universal way
const hero = { name: "Luna", level: 12 };

// 2. Object constructor — rare in modern code, but valid
const hero2 = new Object();
hero2.name = "Luna";

// 3. Object.create() — creates an object with a specific prototype
const hero3 = Object.create(null);   // no prototype at all — no inherited methods like toString
hero3.name = "Luna";
```

### Arrays — declaration styles

```js
// 1. Array literal — the standard way
const carriage1 = ["Veer", "Ayush", "Ravi"];
const emptyCarriage = [];

// 2. Array constructor with a LENGTH (creates empty slots, not values!)
const threeEmptySeats = Array(3);
console.log(threeEmptySeats.length);   // 3 — but every slot is EMPTY, not `undefined` in the usual sense

// 3. Array constructor with actual VALUES (2+ arguments)
const passenger = Array("Veer", "Ayush", "Ravi");   // ["Veer", "Ayush", "Ravi"]

// 4. Array.of() — always treats arguments as VALUES, even a single number
const singlePassenger = Array.of(3);
console.log(singlePassenger);   // [3]  ← NOT an array of length 3, unlike Array(3)

// 5. Array.from() — builds an array from any ITERABLE or array-like value
const trainCode = Array.from("DUST");
console.log(trainCode);   // ['D', 'U', 'S', 'T']
```

> **`Array(3)` vs `Array.of(3)` — a classic gotcha:**
> - `Array(3)` → a single number argument is treated as a **length** → `[ <3 empty items> ]`
> - `Array.of(3)` → arguments are **always** treated as values, no special-casing → `[3]`
> `Array.of` exists specifically to give you a predictable constructor that never does the "single number = length" trick.

### Resizing an array via `.length`

```js
const tempTrain = ["A", "B", "C", "D", "E"];

tempTrain.length = 3;
console.log(tempTrain);   // ['A', 'B', 'C'] — truncates, discarding extra elements

tempTrain.length = 5;
console.log(tempTrain);   // ['A', 'B', 'C', <2 empty items>] — grows, backfilling with empty slots
```

`.length` is not just a read-only count — assigning to it directly **resizes** the array.

### Checking types

```js
console.log(typeof []);              // "object"        — arrays ARE objects
console.log(Array.isArray([]));      // true             — the correct way to detect an array
console.log(Array.isArray("Ravi"));  // false
console.log(typeof null);            // "object"          — the classic quirk (Part 1 §3)
```

> **Don't use `typeof` to detect an array.** `typeof []` always gives `"object"` — it can never tell an array apart from a plain object. `Array.isArray(value)` is the only reliable check: it returns a real boolean, `true` only for actual arrays.

---

## 🔢 7. Numbers Deep Dive

```js
const infiniteRange = Infinity;
const negativeInfiniteRange = -Infinity;
const notANumber = NaN;

console.log(1 / 0);    // Infinity  — JS doesn't throw on divide-by-zero, it returns a special value
console.log(-1 / 0);   // -Infinity

console.log(Number.MAX_SAFE_INTEGER);   // 9007199254740991 — largest integer JS can represent exactly
console.log(Number.MIN_SAFE_INTEGER);   // -9007199254740991
console.log(Number.EPSILON);            // 2.220446049250313e-16 — smallest meaningful difference between two numbers
console.log(Number.isNaN(notANumber));  // true — the RELIABLE way to check for NaN
```

> **Why `Number.isNaN`, not `isNaN` or `=== NaN`?**
> `NaN === NaN` is **always `false`** — `NaN` is the only value in JS that is never equal to itself, by IEEE-754 floating point spec. The old global `isNaN()` also coerces its argument first (`isNaN("hello")` → `true`, because `"hello"` converts to `NaN`), which causes false positives. `Number.isNaN()` does **not** coerce — it only returns `true` for an actual `NaN` value.

### Parsing strings to numbers

```js
const countDown = "007";
console.log(parseInt(countDown));       // 7 — parses leading digits, stops at non-digit

console.log(parseInt("111", 2));        // 7 — second argument is the RADIX (base) — "111" read as BINARY
```

### Math object

```js
const thrustForce = 4.567;

console.log(Math.round(thrustForce));   // 5 — nearest integer
console.log(Math.floor(thrustForce));   // 4 — always rounds DOWN
console.log(Math.ceil(thrustForce));    // 5 — always rounds UP
console.log(Math.trunc(thrustForce));   // 4 — just chops off the decimal, no rounding logic

console.log(Math.trunc(-4.567));   // -4  (chops toward zero)
console.log(Math.floor(-4.567));   // -5  (always rounds toward -Infinity — DIFFERENT from trunc on negatives!)

const temps = [-120, 43, 56, -23];
console.log(Math.min(...temps));   // -120 — NOTE: Math.min/max take individual args, need spread for an array
console.log(Math.max(...temps));   // 56

console.log(Math.abs(-15));    // 15 — absolute value
console.log(Math.pow(2, 10));  // 1024 — same as 2 ** 10
console.log(Math.sqrt(64));    // 8
console.log(Math.random());    // a float between 0 (inclusive) and 1 (exclusive)
```

| Method | Purpose |
|---|---|
| `Math.round(x)` | Nearest integer |
| `Math.floor(x)` | Round toward -Infinity |
| `Math.ceil(x)` | Round toward +Infinity |
| `Math.trunc(x)` | Chop the decimal, round toward 0 |
| `Math.abs(x)` | Absolute value |
| `Math.min(...)` / `Math.max(...)` | Smallest / largest of the given arguments |
| `Math.pow(base, exp)` | Exponentiation (same as `base ** exp`) |
| `Math.sqrt(x)` | Square root |
| `Math.random()` | Random float in `[0, 1)` |

### Floating-point precision — the famous `0.1 + 0.2` problem

```js
console.log(0.1 + 0.2);              // 0.30000000000000004  (!)
console.log(0.1 + 0.2 === 0.3);      // false

function almostEqual(a, b) {
  return Math.abs(a - b) < Number.EPSILON;
}
console.log(almostEqual(0.1 + 0.2, 0.3));   // true
```

- This isn't a JS bug — it's how **all** languages using IEEE-754 double-precision floats work (binary can't represent most decimal fractions exactly, the same way `1/3` can't be written exactly in decimal).
- **Never compare floats with `===`.** Compare `Math.abs(a - b) < Number.EPSILON` (or a small tolerance) instead.

---

## 🔡 8. Strings Deep Dive

```js
const codeName = "Shadow Fox";
const backupName = String("Night Owl");        // String() as a function converts/creates a string
const templateName = `Agent ${codeName}`;      // template literal — interpolation (Part 1 §7)
```

### Strings are immutable

```js
let intercepted = "HELLO";
intercepted[0] = "J";              // silent fail — no error, but nothing happens
console.log(intercepted);          // "HELLO" — unchanged
```

Unlike arrays, you **cannot** mutate a string in place via index assignment — strings are immutable primitives. To "change" a string you must build and assign an entirely new one (`intercepted = "J" + intercepted.slice(1)`).

### Reading characters

```js
const secretCode = "OMEGA-7";

console.log(secretCode.length);        // 7
console.log(secretCode.charAt(99));    // "" — out of bounds returns an empty string, NOT an error
console.log(secretCode[99]);           // undefined — out of bounds via bracket access returns undefined
console.log(secretCode.at(-1));        // "7" — .at() supports NEGATIVE indices (from the end) — charAt/[] do not
```

### Common string methods

```js
const rawTransmission = "ThE EaGLE has LandeD";
console.log(rawTransmission.toLowerCase());   // "the eagle has landed"
console.log(rawTransmission.toUpperCase());   // "THE EAGLE HAS LANDED"

const message = "The drop point is at Dock 7. Repeat: Dock 7";
console.log(message.indexOf("Dock"));         // 25 — position of FIRST match, -1 if not found
console.log(message.includes("Dock"));        // true

console.log(message.slice(0, 12));            // "The drop po" — copies a section, does not mutate

const orders = "    move-north|hold-position|extract-vip";
console.log(orders.trim());                    // removes leading/trailing whitespace
console.log(orders.split("|"));                 // ["    move-north", "hold-position", "extract-vip"]

const missionNumber = "42";
console.log(missionNumber.padStart(6, "0"));   // "000042" — pad to a fixed length
console.log(missionNumber.padEnd(6, "0"));     // "420000"

console.log("  hi  ".trimStart());   // "hi  "
console.log("  hi  ".trimEnd());     // "  hi"

console.log("SOS".split(""));         // ["S", "O", "S"] — splitting on "" breaks into individual characters
```

| Method | Purpose | Mutates original? |
|---|---|---|
| `.length` | Character count | — |
| `.charAt(i)` / `[i]` / `.at(i)` | Read a character (`.at` supports negative index) | No |
| `.slice(start, end)` | Extract a substring | No |
| `.indexOf(sub)` / `.includes(sub)` | Search | No |
| `.toLowerCase()` / `.toUpperCase()` | Case conversion | No |
| `.trim()` / `.trimStart()` / `.trimEnd()` | Remove whitespace | No |
| `.split(sep)` | String → array | No |
| `.padStart(len, ch)` / `.padEnd(len, ch)` | Pad to a fixed length | No |

**All string methods return a new string (or array) — never mutate the original**, because strings are immutable.

### `void` operator

```js
console.log(void "hitesh");   // undefined
```

`void` evaluates its operand but always discards the result, evaluating to `undefined`. Rare in modern code (a historical relic from `javascript:void(0)` links), but occasionally used to explicitly signal "I'm intentionally discarding this value's result."

---

## 📦 9. Arrays Deep Dive — Mutating vs Non-Mutating Methods

> The most important array mental model: every method either **mutates the original array in place** or **returns a brand-new array, leaving the original untouched**. Mixing these up silently is one of the most common sources of bugs (especially in frameworks like React, which rely on detecting a *new* array reference to know something changed).

### Mutating methods (change the original array)

```js
const crewRoster = ["Alok", "Abhinav"];

crewRoster.push("Vraj");        // add to END        → ["Alok", "Abhinav", "Vraj"]
crewRoster.pop();               // remove from END    → ["Alok", "Abhinav"]
crewRoster.unshift("Zero");     // add to START        → ["Zero", "Alok", "Abhinav"]
crewRoster.shift();             // remove from START   → ["Alok", "Abhinav"]

crewRoster.splice(1, 0, "New");     // insert "New" at index 1, remove 0 elements
crewRoster.splice(0, 1);            // remove 1 element starting at index 0

crewRoster.sort();              // sorts IN PLACE (and mutates!)
crewRoster.reverse();           // reverses IN PLACE
```

### Non-mutating methods (return a new array/value)

```js
const ticketNumbers = [100, 25, 3, 42, 8];

const sorted = [...ticketNumbers].sort((a, b) => a - b);   // spread FIRST to avoid mutating the original
console.log(ticketNumbers);   // untouched: [100, 25, 3, 42, 8]
console.log(sorted);          // [3, 8, 25, 42, 100]

const nested = [1, 2, [3, 4, [5, 6]]];
console.log(nested.flat());     // [1, 2, 3, 4, [5, 6]]  — flattens ONE level by default
console.log(nested.flat(2));    // [1, 2, 3, 4, 5, 6]     — pass a depth to flatten further
console.log(nested.flat(Infinity));   // fully flattens, any depth

const a = [1, 2];
const b = [3, 4];
console.log(a.concat(b));       // [1, 2, 3, 4] — merges, returns new array (spread [...a, ...b] does the same)

const copy = ticketNumbers.slice();       // full shallow copy
const middle = ticketNumbers.slice(1, 3); // [25, 3]
```

> **`.sort()` is mutating AND easy to misuse** — it also sorts **lexicographically (as strings) by default**, not numerically:
> ```js
> [100, 25, 3].sort();                  // [100, 25, 3] — sorted as STRINGS ("100" < "25" < "3" alphabetically)
> [100, 25, 3].sort((a, b) => a - b);   // [3, 25, 100] — ALWAYS pass a comparator for numbers
> ```
> Newer non-mutating siblings exist too: `.toSorted()`, `.toReversed()`, `.toSpliced()` — same behavior as their mutating counterparts, but return a new array instead of mutating.

### `forEach` — the 3rd callback parameter, and its interview gotcha

```js
const orders = [
  { dish: "Pasta", qty: 2 },
  { dish: "Ramen", qty: 1 },
];

orders.forEach((order, index, array) => {
  console.log(`#${index + 1}: ${order.qty}x ${order.dish}`);
  // `array` is the ORIGINAL array being iterated — rarely needed, but always available
});
```

> **Interview question: does `forEach` work with `async`/`await`?**
> `forEach` expects a **synchronous** callback — it does **not** wait for promises returned from the callback, so `await` inside a `forEach` callback does not pause the loop between iterations (all callbacks fire off near-instantly, and any async work inside them resolves independently, out of order). **There is also no way to `break`/`continue`/early-`return` out of a `forEach` loop** — the only way to stop it partway is to `throw` an exception, which is a hard crash (unless caught), not a controlled stop. Use a plain `for`/`for...of` loop instead when you need either sequential `await`s or early exit.

### Searching

```js
const inventory = ["Flame Sword", "Health Potion", "Shield"];

console.log(inventory.includes("Shield"));      // true — existence check
console.log(inventory.indexOf("Shield"));       // 2 — position, -1 if absent

const orders = [
  { dish: "Pasta", spicy: false },
  { dish: "Ramen", spicy: true },
];

console.log(orders.find((o) => o.spicy));        // returns the FIRST matching ELEMENT (the object itself)
console.log(orders.findIndex((o) => o.spicy));   // returns the FIRST matching INDEX
console.log(orders.some((o) => o.spicy));        // true — does AT LEAST ONE match?
console.log(orders.every((o) => o.spicy));       // false — do ALL match?
```

| Method | Returns | Mutates? |
|---|---|---|
| `push` / `pop` / `shift` / `unshift` / `splice` / `sort` / `reverse` | — | ✅ Yes |
| `concat` / `slice` / `flat` / `flatMap` / `map` / `filter` | New array | ❌ No |
| `forEach` | `undefined` (always) | ❌ No — but the callback can still mutate elements it's given |
| `find` | First matching **element** | ❌ No |
| `findIndex` | First matching **index** | ❌ No |
| `includes` | `boolean` — value exists? | ❌ No |
| `some` / `every` | `boolean` — any/all match? | ❌ No |
| `reduce` | Any single value | ❌ No |

### Real-world chaining — combining `filter`, `map`, `reduce`

```js
const orders = [
  { dish: "Pasta Carbonara", price: 14, spicy: false, qty: 2 },
  { dish: "Dragon Ramen", price: 12, spicy: true, qty: 1 },
  { dish: "Caesar Salad", price: 9, spicy: false, qty: 3 },
];

const totalRevenue = orders.reduce((sum, order) => sum + order.qty * order.price, 0);
console.log(totalRevenue);   // 14*2 + 12*1 + 9*3 = 67

const grouped = orders.reduce(
  (acc, order) => {
    const category = order.spicy ? "spicy" : "mild";
    acc[category].push(order.dish);
    return acc;
  },
  { spicy: [], mild: [] },
);
console.log(grouped);   // { spicy: ['Dragon Ramen'], mild: ['Pasta Carbonara', 'Caesar Salad'] }

const mildReport = orders
  .filter((order) => !order.spicy)
  .map((order) => ({ dish: order.dish, total: order.price * order.qty }));
console.log(mildReport);
```

Chaining `.filter().map().reduce()` is the standard idiomatic pipeline for transforming a list of records — filter down to what you want, reshape each item, then collapse to a summary — each step returning a fresh array/value, never mutating the source.

---

## 🗃️ 10. Objects Deep Dive

### `in` operator vs `.hasOwnProperty()`

```js
const ranger = {
  name: "Lakshya the Swift",
  agility: 80,
  stealth: undefined,
};

console.log("name" in ranger);       // true
console.log("stealth" in ranger);    // true — key EXISTS even though its value is undefined
console.log("toString" in ranger);   // true — !! inherited from Object.prototype, NOT ranger's own key

console.log(ranger.hasOwnProperty("toString"));   // false — hasOwnProperty ignores inherited properties
```

> **`in` checks the entire prototype chain** (own keys + everything inherited, like `toString`, `hasOwnProperty` itself, etc). **`.hasOwnProperty()`** checks **only the object's own keys**, ignoring anything inherited. This is "prototype chaining" — every plain object automatically inherits from `Object.prototype`, which is where methods like `toString` and `hasOwnProperty` themselves actually live. (Prototypes get a full treatment in a later, dedicated OOP part.)

### `Object.keys`, `Object.values`, `Object.entries`

```js
const artifact = {
  name: "Obsidian Crown",
  era: "Ancient",
  value: 50000,
  material: "volcanic glass",
};

console.log(Object.keys(artifact));     // ['name', 'era', 'value', 'material']
console.log(Object.values(artifact));   // ['Obsidian Crown', 'Ancient', 50000, 'volcanic glass']
console.log(Object.entries(artifact));  // [['name','Obsidian Crown'], ['era','Ancient'], ...]

for (const [key, value] of Object.entries(artifact)) {
  console.log(`${key}: ${value}`);
}
```

`Object.entries()` is what makes an object loopable with `for...of` — plain objects aren't iterable on their own (unlike arrays), so you convert to an array of `[key, value]` pairs first.

### `Object.fromEntries` — the reverse direction

```js
const priceList = [
  ["Obsidian Crown", 50000],
  ["Ruby Pendant", 30000],
];

const priceObject = Object.fromEntries(priceList);
console.log(priceObject);   // { 'Obsidian Crown': 50000, 'Ruby Pendant': 30000 }
```

Turns an array of `[key, value]` pairs back into an object — the exact inverse of `Object.entries()`.

### `Object.freeze()` vs `Object.seal()` — the interview-favorite distinction

```js
const displayCase = { artifact: "Obsidian", location: "Hall A", locked: true };

Object.freeze(displayCase);
delete displayCase.locked;        // silently fails
displayCase.newProp = "test";     // silently fails
displayCase.location = "Hall B";  // silently fails — freeze blocks edits too
console.log(displayCase);         // unchanged — fully locked
```

```js
const catalogEntry = { id: "ART-001", verified: true };

Object.seal(catalogEntry);
catalogEntry.id = "ART-002";      // ✅ WORKS — seal still allows editing EXISTING properties
delete catalogEntry.id;           // ❌ fails — seal blocks add/delete
catalogEntry.newProp = "test";    // ❌ fails — seal blocks add/delete
```

| | `Object.freeze()` | `Object.seal()` |
|---|---|---|
| Edit existing property values | ❌ Blocked | ✅ Allowed |
| Add new properties | ❌ Blocked | ❌ Blocked |
| Delete properties | ❌ Blocked | ❌ Blocked |
| Structural changes (add/remove keys) | ❌ Blocked | ❌ Blocked |

**`freeze` = total lockdown. `seal` = "you can't add or remove keys, but you can still edit what's already there."** Both fail **silently** (no error thrown) in non-strict mode — this is a classic source of "why didn't my change take effect?" bugs.

### `Object.defineProperty()` — fine-grained property control

```js
const secureArtifacts = { name: "Ruby Pendant" };

Object.defineProperty(secureArtifacts, "catalogId", {
  value: "SEC-999",
  writable: false,       // can the VALUE be changed later?
  enumerable: false,     // does it show up in for...in / Object.keys / JSON.stringify?
  configurable: false,   // can the property be deleted or redefined?
});

console.log(secureArtifacts.catalogId);      // "SEC-999"
secureArtifacts.catalogId = "HACKED";        // silently fails — writable: false
console.log(secureArtifacts.catalogId);      // still "SEC-999"

for (const [key, value] of Object.entries(secureArtifacts)) {
  console.log(`${key}: ${value}`);
}
// only prints "name: Ruby Pendant" — catalogId is invisible to enumeration because enumerable: false
```

> **Key insight:** properties created via plain object-literal syntax (`{ name: "x" }`) default to `writable: true, enumerable: true, configurable: true` automatically. `Object.defineProperty()` is the only way to get **fine-grained control** over these three flags individually — this is genuinely how libraries implement things like read-only, hidden metadata properties.

### `Object.getOwnPropertyDescriptor()` — inspecting those flags

```js
const desc = Object.getOwnPropertyDescriptor(secureArtifacts, "catalogId");
console.log(desc);
// { value: 'SEC-999', writable: false, enumerable: false, configurable: false }
```

---

## 🔁 11. Functions Deep Dive — Expressions, `arguments`, Pure vs Impure

### Function expressions, revisited

```js
function brewPotion(ingredient, dose) {
  return `Brewing potion with ${ingredient} (x${dose})... Potion ready`;
}
console.log(brewPotion("Healing Herbs", 3));

const mixElixir = function (ingredient) {
  return `Mixing elixir with ${ingredient}`;
};

// arrow function — same job, different syntax
const distilEssence = (ingredient) => {
  return `Mixing elixir with ${ingredient}`;
};
```

`function brewPotion(...) {}`, `const mixElixir = function(...) {}`, and `const distilEssence = (...) => {}` are three syntaxes for defining a function — a declaration, a function expression, and an arrow function expression. All three are callable the same way; what differs is hoisting behavior (Part 1 §5 — declarations are hoisted with their full body, expressions are not) and, critically, whether they get their own `arguments` object (see below).

### The `arguments` object

> The **`arguments` object** is an automatic, array-*like* local variable available inside every **regular** function (declarations and function expressions) — never inside an arrow function — that holds every value passed to that function call, regardless of how many parameters were declared.

```js
function oldBrewingLogs() {
  console.log("Type: ", typeof arguments);              // "object"
  console.log("Is Array: ", Array.isArray(arguments));   // false — array-LIKE, not a real array
  const argsArray = Array.from(arguments);                // convert to a real array to use array methods
  console.log(argsArray);
}

oldBrewingLogs("Sage", "Rosemary");
// Type: object
// Is Array: false
// ['Sage', 'Rosemary']
```

```js
function oldBrewingLogs() {
  console.log(arguments[0]);   // "Sage" — first argument
  console.log(arguments[1]);   // "Rosemary" — second argument
}
```

- `arguments` looks like an array (has a `.length`, is indexable) but is **not** a real array — it's missing `.map`, `.filter`, `.reduce`, etc. Convert it with `Array.from(arguments)` (or `[...arguments]`) to use those methods.
- **Arrow functions have NO `arguments` object of their own.** Referencing `arguments` inside an arrow function either throws a `ReferenceError` (in a plain script/module context) or — if the arrow is nested inside a regular function — silently picks up the *enclosing* regular function's `arguments`, which is rarely what you want:

```js
const arrowBrew = () => {
  try {
    console.log(arguments);
  } catch (e) {
    console.log(e.message);   // "arguments is not defined"
  }
};
arrowBrew();
```

This is one of the concrete, practical reasons arrow functions and regular functions are **not** interchangeable — if a function needs to inspect however-many arguments it was called with (old-style variadic functions), it must be a regular function, or use rest parameters (`function f(...args) {}`) instead, which arrow functions **do** support.

### Pure vs Impure functions

> A function is **pure** if it only computes and returns a value using its own parameters and local variables, **never reading or modifying anything outside its own scope**. A function is **impure** if it has a **side effect** — it reads or mutates state that lives outside itself (a global variable, an object passed by reference, the DOM, the console, a file).

```js
let globalCount = 0;

function brewAndCount(name) {
  globalCount++;   // reads AND mutates a variable OUTSIDE this function's own scope
}
```

`brewAndCount` is **impure**: calling it changes `globalCount`, a piece of state that exists independent of the function itself. Call it twice, and the *outside world* is different afterward — that's a side effect.

```js
function add(a, b) {
  return a + b;   // only touches its own parameters, returns a value, touches nothing else
}
```

`add` is **pure**: given the same inputs, it always produces the same output, and calling it changes nothing outside itself.

| | Pure | Impure |
|---|---|---|
| Uses only its own params/locals | ✅ | ❌ (reads outside state) |
| Same input → same output, always | ✅ | Not guaranteed |
| Changes anything outside itself | ❌ Never | ✅ (the side effect) |
| Easy to test/reason about | ✅ | Harder — depends on external state |

Pure functions are preferred where possible (predictable, testable, safe to run in parallel) — but side effects (writing to a database, updating the DOM, logging) are also the entire *point* of most real programs, so impure functions aren't "wrong," just something to be deliberate about and isolate.

> **On errors themselves:** getting an error is not, by itself, a bad thing — it's information. The actual problem is an **unhandled** error crashing the whole program. That's exactly what `try`/`catch` is for: catching an error where you can still respond sensibly, instead of letting it take down everything after it.
> ```js
> try {
>   riskyOperation();
> } catch (error) {
>   console.error("Handled:", error.message);   // program keeps running
> }
> ```

---

## 🎁 12. IIFE — Immediately Invoked Function Expression

> An **IIFE** is a function that is defined and **executed immediately**, in the same statement, instead of being defined now and called later. It runs exactly once, the moment it's parsed.

```js
(function () {
  // runs immediately — no separate call needed
})();
```

**Standard IIFE shape:**

```js
(function () {
  // standard code here
})();
```

All of these are equivalent — different spacing/style conventions for the same pattern:

```js
(function () {})();
(function () {})();
const potionShop = (function () {})();
```

### Why use an IIFE — the module pattern

```js
const potionShop = (function () {
  let inventory = 0;   // PRIVATE — no outside code can reach `inventory` directly

  return {
    brew() {
      inventory++;
      return `Brew potion #${inventory}`;
    },
    getStock() {
      return inventory;
    },
  };
})();

console.log(potionShop);          // { brew: [Function: brew], getStock: [Function: getStock] }
console.log(potionShop.brew());   // "Brew potion #1"
console.log(potionShop.inventory);   // undefined — inventory is NOT exposed, it's private!
```

- The IIFE runs **once**, immediately, and returns an object exposing only `brew` and `getStock` — `inventory` itself is never returned, so nothing outside the IIFE can read or overwrite it directly. The only way to affect `inventory` is through the methods the IIFE chose to expose.
- This is the classic pre-ES6-modules technique for **encapsulation/privacy** in JS — it works because of **closures** (next section): `brew` and `getStock` keep a live reference to `inventory` even after the IIFE itself has finished running and popped off the call stack.
- A function can return **anything** — a string, a number, another function, or (as here) a whole object of functions.

---

## 🔒 13. Closures

> A **closure** is the combination of a function **bundled together with references to its surrounding (lexical) state** — the variables that were in scope where the function was *defined*. A closure gives an inner function continued access to its outer function's variables, **even after the outer function has finished executing and its execution context has been popped off the call stack.**

```js
function makeFunc() {
  const name = "Mozilla";
  function displayName() {
    console.log(name);   // displayName "remembers" `name` from makeFunc's scope
  }
  return displayName;
}

const myFunc = makeFunc();   // makeFunc() runs, returns displayName, and its FEC pops off the call stack
myFunc();                    // "Mozilla" — displayName STILL has access to `name`!
```

- Normally, once `makeFunc()` returns and its Function Execution Context is popped off the call stack (Part 1 §4), you'd expect its local memory (`name`) to be gone. Closures are the reason it *isn't*: `displayName` keeps a **live reference** to the memory of the scope it was created in, so that memory survives as long as `displayName` itself is reachable.
- This is exactly the mechanism the `potionShop` IIFE above relies on: `brew` and `getStock` keep referencing the same `inventory` variable long after the surrounding IIFE has finished running.

### HOF returning a closure

```js
function anotherFunctionForClass(brewAndCount) {
  return function newBrew() {
    // this inner function "closes over" brewAndCount,
    // keeping access to it even after anotherFunctionForClass has returned
  };
}
```

A function that **returns another function** (a Higher-Order Function, Part 1 §10) almost always relies on a closure to make the returned function still useful — otherwise the returned function would have nothing meaningful to reference.

> **The one-line mental model:** a closure isn't something you deliberately "create" with special syntax — it's simply what **always** happens when an inner function is defined inside an outer function. Every nested function is automatically a closure over its outer scope; the outer scope's variables just stay alive in memory for as long as some inner function still references them.

---

## 🗺️ Series Roadmap

| Part | Covers |
|---|---|
| **1. Basics** | Engine/runtime, data types, execution context, call stack, hoisting, TDZ, `var`/`let`/`const`, all function forms, scope, all loop types incl. `map`/`filter`/`reduce`, HOF/callbacks, Array/Object/Map/Set intro, DOM |
| **2. Console, Environment, Data & Closures** (this doc) | `console` methods, runtime vs compile time, pointers/references/shallow vs deep copy, `Symbol`, browser/Node-provided APIs vs pure JS, object/array declaration styles, Numbers & `Math`, String methods, Array mutating vs non-mutating methods, Object methods (`freeze`/`seal`/`defineProperty`), `arguments` object, pure vs impure functions, IIFE, closures |
| **3. `this`, Destructuring** *(planned)* | `this` binding rules (implicit/explicit/`new`/arrow), destructuring, spread/rest, optional chaining |
| **4. Async JavaScript** *(planned)* | Callbacks vs Promises vs `async`/`await`, the event loop, microtask vs macrotask queue, `fetch` |
| **5. Advanced/OOP** *(planned)* | Prototypes & the prototype chain, classes, `bind`/`call`/`apply`, modules (`import`/`export`) |

*(Notes sourced from the Feb 14 & Feb 15 2026 handwritten class notes, plus the `js-basics` code-along files: `01-console.js` through `10-functions.js`, `conditionals.js`, `doubts.js`. This is a working series — as more class notes come in for later topics, expect these docs to get reorganized/renumbered/merged rather than staying frozen in their current split.)*
