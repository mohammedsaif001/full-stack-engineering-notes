# Arrays & Objects Mastery
## Part 8 of 17 — Declaration Styles, Mutating vs Non-Mutating Methods, Chaining, Object Introspection & JSON

---

## 📌 Executive Summary

- Every array method splits into exactly two camps — **mutating** (changes the original array in place) or **non-mutating** (returns a brand-new array/value, original untouched) — and confusing the two is one of the most common sources of real-world bugs, especially in frameworks that detect changes by comparing array *references*.
- File 5 introduced `forEach`/`map`/`filter`/`reduce` as loop constructs using `function` keyword syntax and explicitly deferred their depth to this file; this file delivers that depth using arrow function syntax throughout, now that file 6 has introduced it.
- `filter` → `map` → `reduce` chained together is the idiomatic pipeline for turning a raw list of records into a transformed, summarized result — each link in the chain returns a fresh value and never touches the source array.
- Objects have their own introspection toolkit — `in` vs `.hasOwnProperty()`, `Object.keys`/`values`/`entries`/`fromEntries`, and fine-grained locks (`Object.freeze`, `Object.seal`, `Object.defineProperty`) — that go well beyond dot/bracket access.
- **JSON** (JavaScript Object Notation) is the plain-text format used to move data between JavaScript and the outside world (APIs, files, `localStorage`); `JSON.stringify`/`JSON.parse` convert between it and live JS values, with specific things — functions, `undefined`, circular references — that silently don't survive the trip.

---

## 🧠 Core Analogy: A Warehouse Inventory System

Picture a warehouse that tracks stock in two kinds of records:

- **Arrays** are the **numbered shelving racks** — items sit in a strict left-to-right order, referenced by position ("the item in slot 4"), and the whole rack can grow or shrink.
- **Objects** are the **labeled filing cabinets** — a folder for "name," a folder for "status," a folder for "priority," accessed by the label on the drawer, not by position.
- **Mutating array methods** are warehouse workers who walk up to the *actual rack* and physically rearrange it — pull an item off the end, shove one onto the front, re-sort the shelf. Anyone else holding a reference to that same rack sees the change immediately, because it's still the same physical rack.
- **Non-mutating array methods** are workers who instead **photocopy the whole rack**, make their changes on the photocopy, and hand you the copy — the original rack is never touched, and anyone still looking at the original sees it exactly as it was.
- **`Object.freeze`** is a supervisor bolting a filing cabinet shut entirely — no drawer can be added, removed, or even have its contents swapped out. **`Object.seal`** is a supervisor welding the cabinet's *frame* shut — no drawers can be added or removed, but the contents of existing drawers can still be updated.
- **JSON** is the standardized paper shipping manifest the warehouse hands to an outside trucking company — it can only describe *data* (quantities, labels, nested lists of contents), never *procedures* ("how to load the truck" — a function), and if a shelf's manifest tries to reference itself as one of its own contents, the paper form has no way to represent that at all.

---

## 📥 1. Declaring Arrays & Objects — The Full Set of Styles

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
> `Array.of` exists specifically to give a predictable constructor that never does the "single number = length" trick.

---

## 📏 2. Resizing Arrays & Checking Types

### Resizing an array via `.length`

```js
const tempTrain = ["A", "B", "C", "D", "E"];

tempTrain.length = 3;
console.log(tempTrain);   // ['A', 'B', 'C'] — truncates, discarding extra elements

tempTrain.length = 5;
console.log(tempTrain);   // ['A', 'B', 'C', <2 empty items>] — grows, backfilling with empty slots
```

`.length` is not just a read-only count — assigning to it directly **resizes** the array, either truncating or growing it.

### Checking types

```js
console.log(typeof []);              // "object"        — arrays ARE objects
console.log(Array.isArray([]));      // true             — the correct way to detect an array
console.log(Array.isArray("Ravi"));  // false
console.log(typeof null);            // "object"          — the classic quirk (file 3)
```

> **Don't use `typeof` to detect an array.** `typeof []` always gives `"object"` — it can never tell an array apart from a plain object. `Array.isArray(value)` is the only reliable check: a real boolean, `true` only for actual arrays.

---

## 🔧 3. Mutating vs Non-Mutating Array Methods — The Most Important Mental Model

> Every array method falls into exactly one of two camps: it either **mutates the original array in place**, or it **returns a brand-new array/value and leaves the original untouched**. Mixing these up silently is one of the most common sources of bugs — especially in frameworks like React, which detect that something changed by comparing array *references*, not contents.

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
console.log(nested.flat());           // [1, 2, 3, 4, [5, 6]]  — flattens ONE level by default
console.log(nested.flat(2));          // [1, 2, 3, 4, 5, 6]     — pass a depth to flatten further
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

### The full picture

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

---

## 🧱 4. `forEach` — the 3rd Callback Parameter, and Its Interview Gotcha

File 5 already covered `forEach`'s basic mechanics — running a function per element, returning `undefined`. Here's the rest of it, now with arrow function syntax:

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
> `forEach` expects a **synchronous** callback — it does **not** wait for promises returned from the callback, so `await` inside a `forEach` callback does not pause the loop between iterations (all callbacks fire off near-instantly, and any async work inside them resolves independently, out of order). **There is also no way to `break`/`continue`/early-`return` out of a `forEach` loop** — the only way to stop it partway is to `throw` an exception, which is a hard crash (unless caught), not a controlled stop. Use a plain `for`/`for...of` loop instead when sequential `await`s or early exit are needed.

---

## 🔍 5. Searching Arrays

```js
const inventory = ["Flame Sword", "Health Potion", "Shield"];

console.log(inventory.includes("Shield"));      // true — existence check
console.log(inventory.indexOf("Shield"));       // 2 — position, -1 if absent

const menu = [
  { dish: "Pasta", spicy: false },
  { dish: "Ramen", spicy: true },
];

console.log(menu.find((item) => item.spicy));        // returns the FIRST matching ELEMENT (the object itself)
console.log(menu.findIndex((item) => item.spicy));   // returns the FIRST matching INDEX
console.log(menu.some((item) => item.spicy));        // true — does AT LEAST ONE match?
console.log(menu.every((item) => item.spicy));       // false — do ALL match?
```

`includes`/`indexOf` compare against a known value directly; `find`/`findIndex`/`some`/`every` take a predicate callback for anything more complex than equality — searching by a property, a computed condition, or multiple criteria.

---

## 🔗 6. Real-World Chaining — `filter` → `map` → `reduce`

This is the pattern file 5 promised to return to: chaining `filter`, `map`, and `reduce` together is the standard idiomatic pipeline for transforming a list of records — filter down to what's relevant, reshape each surviving item, then collapse to a summary. Every step returns a fresh array or value; the source array is never touched.

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
// [
//   { dish: 'Pasta Carbonara', total: 28 },
//   { dish: 'Caesar Salad', total: 27 }
// ]
```

Reading the chain top to bottom: `.filter((order) => !order.spicy)` keeps only the mild dishes and returns a new (possibly shorter) array; `.map((order) => ({ ... }))` then reshapes each surviving order into a `{ dish, total }` summary object, returning another new array of the same length as the filtered one. Nothing about `orders` itself ever changes — `orders.length` and every original object inside it are exactly what they were before the chain ran.

---

## 🗃️ 7. `in` vs `.hasOwnProperty()`

```js
const ranger = {
  name: "Lakshya the Swift",
  agility: 80,
  stealth: undefined,
};

console.log("name" in ranger);       // true
console.log("stealth" in ranger);    // true — key EXISTS even though its value is undefined
console.log("toString" in ranger);   // true — inherited from Object.prototype, NOT ranger's own key

console.log(ranger.hasOwnProperty("toString"));   // false — hasOwnProperty ignores inherited properties
```

> **`in` checks the entire prototype chain** (own keys + everything inherited, like `toString`, `hasOwnProperty` itself, etc). **`.hasOwnProperty()`** checks **only the object's own keys**, ignoring anything inherited. Every plain object automatically inherits from `Object.prototype`, which is where methods like `toString` and `hasOwnProperty` themselves actually live — prototypes get a full, dedicated treatment later in this series.

---

## 📋 8. `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries`

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

`Object.entries()` is what makes an object loopable with `for...of` — plain objects aren't iterable on their own (unlike arrays), so converting to an array of `[key, value]` pairs first is what unlocks that.

### `Object.fromEntries` — the reverse direction

```js
const priceList = [
  ["Obsidian Crown", 50000],
  ["Ruby Pendant", 30000],
];

const priceObject = Object.fromEntries(priceList);
console.log(priceObject);   // { 'Obsidian Crown': 50000, 'Ruby Pendant': 30000 }
```

`Object.fromEntries` turns an array of `[key, value]` pairs back into an object — the exact inverse of `Object.entries()`. Combined with the chaining from §6, this lets an object be filtered/transformed by first converting to entries, running array methods, then converting back:

```js
const filtered = Object.fromEntries(
  Object.entries(artifact).filter(([key]) => key !== "era"),
);
console.log(filtered);   // { name: 'Obsidian Crown', value: 50000, material: 'volcanic glass' }
```

---

## 🔒 9. `Object.freeze()` vs `Object.seal()` — the Interview-Favorite Distinction

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

**`freeze` = total lockdown. `seal` = "you can't add or remove keys, but you can still edit what's already there."** Both fail **silently** (no error thrown) in non-strict mode — a classic source of "why didn't my change take effect?" bugs.

---

## 🎛️ 10. `Object.defineProperty()` & `Object.getOwnPropertyDescriptor()`

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

> **Key insight:** properties created via plain object-literal syntax (`{ name: "x" }`) default to `writable: true, enumerable: true, configurable: true` automatically. `Object.defineProperty()` is the only way to get **fine-grained control** over these three flags individually — this is genuinely how libraries implement things like read-only or hidden metadata properties.

### Inspecting those flags

```js
const desc = Object.getOwnPropertyDescriptor(secureArtifacts, "catalogId");
console.log(desc);
// { value: 'SEC-999', writable: false, enumerable: false, configurable: false }
```

`Object.getOwnPropertyDescriptor()` is the read side of `Object.defineProperty()` — it hands back the exact descriptor object (`value`, `writable`, `enumerable`, `configurable`) currently set on a given property, own-properties only.

---

## 🧾 11. JSON — Serializing Data for the Outside World

> **JSON** (JavaScript Object Notation) is a plain-text data format — not a JavaScript feature itself — used to represent structured data as a string. It's the near-universal format APIs respond with, the format `localStorage` stores strings in, and the format config files are often written in. JSON syntax looks like a JS object/array literal, but it's stricter: keys must be double-quoted strings, and only a fixed set of value types are allowed (strings, numbers, booleans, `null`, arrays, and nested objects).

### `JSON.stringify` — JS value → JSON string

```js
const user = { name: "Priya", age: 29, roles: ["admin", "editor"] };

const json = JSON.stringify(user);
console.log(json);          // '{"name":"Priya","age":29,"roles":["admin","editor"]}'
console.log(typeof json);   // "string" — it's now plain text, not a live object

const pretty = JSON.stringify(user, null, 2);   // 3rd arg: indentation for readability
console.log(pretty);
// {
//   "name": "Priya",
//   "age": 29,
//   "roles": [
//     "admin",
//     "editor"
//   ]
// }
```

### `JSON.parse` — JSON string → JS value

```js
const raw = '{"name":"Priya","age":29,"roles":["admin","editor"]}';

const parsed = JSON.parse(raw);
console.log(parsed);         // { name: 'Priya', age: 29, roles: ['admin', 'editor'] }
console.log(typeof parsed);  // "object" — a live, usable JS value again
console.log(parsed.roles[0]);   // "admin"
```

`JSON.parse` on malformed JSON (a trailing comma, single quotes, an unquoted key) throws a `SyntaxError` — it does not fail silently, unlike most of the object-locking methods above.

### The three classic gotchas

`JSON.stringify` can only represent **data**, never **behavior** or **cycles** — three specific things silently don't survive:

```js
// 1. Functions are DROPPED entirely
const withFn = { name: "Priya", greet: () => "hi" };
console.log(JSON.stringify(withFn));   // '{"name":"Priya"}' — `greet` is just gone, no error

// 2. undefined values are DROPPED (as object properties); become null inside arrays
const withUndefined = { name: "Priya", nickname: undefined };
console.log(JSON.stringify(withUndefined));   // '{"name":"Priya"}' — `nickname` key vanishes entirely

console.log(JSON.stringify([1, undefined, 3]));   // '[1,null,3]' — inside an array it becomes null, not dropped

// 3. Circular references THROW, they don't just get dropped
const node = { label: "root" };
node.self = node;   // node now references itself

JSON.stringify(node);   // throws: TypeError: Converting circular structure to JSON
```

- **Functions** are not data — `JSON.stringify` silently omits any key whose value is a function, with no warning.
- **`undefined`** has no JSON representation — as an object property it's dropped entirely (the key disappears), but inside an array it's converted to `null` instead (arrays must keep their length/positions intact).
- **Circular references** — an object that (directly or indirectly) contains a reference back to itself — cannot be represented as a finite string at all, so `JSON.stringify` **throws** a `TypeError` rather than silently producing bad output. This is the one gotcha that's loud instead of silent.

---

## 💡 Cheat Sheet: Quick Reference

| Topic | Key fact |
|---|---|
| Object declaration | Literal `{}` (standard), `new Object()`, `Object.create(proto)` |
| Array declaration | Literal `[]`, `Array(n)` (length, empty slots), `Array.of(...)` (values, always), `Array.from(iterable)` |
| `.length =` | Assigning resizes the array — truncates or backfills with empty slots |
| Type check | `Array.isArray(x)` — never `typeof x` (always `"object"` for arrays) |
| Mutating methods | `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` |
| Non-mutating methods | `concat`, `slice`, `flat`, `flatMap`, `map`, `filter`, `toSorted`, `toReversed`, `toSpliced` |
| `forEach` gotcha | Synchronous only; no `break`/early-`return`; `await` inside doesn't pause iteration |
| Searching | `includes`/`indexOf` (by value), `find`/`findIndex`/`some`/`every` (by predicate) |
| Chaining | `.filter(predicate).map(transform).reduce(combine, initial)` — each step returns a new value |
| `in` vs `.hasOwnProperty()` | `in` checks the whole prototype chain; `.hasOwnProperty()` checks own keys only |
| `Object.keys/values/entries` | Arrays of keys / values / `[key, value]` pairs |
| `Object.fromEntries` | `[[k, v], ...]` → object — inverse of `Object.entries` |
| `Object.freeze` | Blocks add, delete, AND edit — total lockdown |
| `Object.seal` | Blocks add and delete, but allows editing existing values |
| `Object.defineProperty` | Fine-grained control over `writable`/`enumerable`/`configurable` |
| `Object.getOwnPropertyDescriptor` | Reads back those flags for one own property |
| `JSON.stringify` | JS value → JSON string; drops functions, drops `undefined` (object) / nulls it (array), throws on circular refs |
| `JSON.parse` | JSON string → JS value; throws `SyntaxError` on malformed input |

---

## 🎯 Key Takeaways

- Every array method is either mutating (changes the original) or non-mutating (returns a new array/value) — memorize the split, because framework change-detection and shared-reference bugs both hinge on it.
- `forEach` is synchronous-only with no early exit; `find`/`findIndex`/`some`/`every` cover predicate-based searching beyond simple `includes`/`indexOf` value checks.
- `.filter().map().reduce()` chained together is the standard, idiomatic way to filter, reshape, and summarize a list of records in one non-mutating pipeline — this is the depth file 5 promised and this file delivered.
- `in` checks the full prototype chain while `.hasOwnProperty()` checks only an object's own keys; `Object.freeze` blocks all changes while `Object.seal` still allows editing existing values — a distinction interviewers ask about often.
- `Object.defineProperty`/`Object.getOwnPropertyDescriptor` expose the `writable`/`enumerable`/`configurable` flags that plain object-literal syntax sets automatically and invisibly.
- JSON is a text format for data only: `JSON.stringify`/`JSON.parse` convert between it and live JS values, but functions and `undefined` (as object properties) are silently dropped, `undefined` inside arrays becomes `null`, and circular references throw rather than serialize.

---

## 📚 Related Concepts to Explore Next

This file delivered on the depth [07-Closures-Currying-Real-World-Patterns.md](./07-Closures-Currying-Real-World-Patterns.md) pointed toward — `map`, `filter`, and `reduce`, first seen as loop constructs in file 5 and used throughout file 7's closure patterns, are themselves everyday Higher-Order Functions taking closures as callbacks. The next file, [09-Strings-Numbers-Dates-RegExp.md](./09-Strings-Numbers-Dates-RegExp.md), moves to the other core data types — string methods, number formatting/precision, `Date`, and regular expressions.

---

## 🔗 Resources

- [MDN — Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [MDN — Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
- [MDN — JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [MDN — Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
