# Collections & Iteration Protocol
## Part 10 of 17 — Map, Set, WeakMap, WeakSet, Symbol, `Symbol.iterator`, and Generators

---

## 📌 Executive Summary

- `Map` and `Set` are purpose-built collection types — `Map` for key-value pairs with **any** key type and guaranteed order, `Set` for a collection of **unique** values — solving problems plain objects and arrays handle only awkwardly.
- `WeakMap` and `WeakSet` are the "leak-proof" versions of `Map`/`Set`: their keys don't prevent garbage collection, which makes them the right tool for attaching metadata to an object without keeping that object alive forever.
- `Symbol` is a primitive type that produces a guaranteed-unique value on every call, most commonly used as a collision-proof object property key.
- The **iteration protocol** — an object exposing a `Symbol.iterator` method that returns a `{ next() }` object — is the exact mechanism that makes `for...of` work on arrays, strings, `Map`, and `Set`, and it's the same mechanism you can implement by hand on a custom object.
- **Generators** (`function*` / `yield`) are a syntax shortcut for writing that same iteration protocol without manually tracking `next()`/`done` state yourself — the engine pauses and resumes the function body for you.

---

## 🧠 Core Analogy: The Library Circulation Desk

Picture a library's circulation system, which has to solve four related but distinct problems:

- **`Map`** is the library's **card catalog** — every entry is a key (a call number, which can be any format, not just a plain string) mapped to a value (the book's details), stored and retrieved in the exact order the cards were filed.
- **`Set`** is the **"currently on the shelf" list** — a librarian scanning returned books never lets a duplicate barcode appear twice on that list; a second scan of the same book is simply a no-op.
- **`WeakMap`** is a **sticky note attached to a physical book** — the note (metadata: "reserved for renovation," "damaged spine") only exists as long as the book itself exists on the shelf. The moment the book is permanently withdrawn and destroyed, its sticky note is thrown away automatically too — nobody has to remember to peel it off separately, and the note never keeps a withdrawn book from being disposed of.
- **The iteration protocol** is the library's **standardized checkout procedure** — any collection that implements "hand me the next item, and tell me when you're out" can be walked through by the same front-desk process (`for...of`), whether it's the shelf, the reading room queue, or a custom reserve list. A `function*` **generator** is a librarian who can pause mid-task and resume exactly where they left off each time you ask for "the next one," instead of you having to write out the entire state machine for "what's next" yourself.

---

## 🗂️ 1. `Map` — Key-Value Pairs, Any Key Type

A `Map` is a key-value collection, similar to an object, but keys can be **any type** — not just strings/symbols — and it **guarantees insertion order**.

```js
const scores = new Map();

scores.set('alice', 90);            // add / update
scores.set('bob', 75);
scores.set(42, 'numeric key too');  // keys can be ANY type, unlike object keys

console.log(scores.get('alice'));   // 90
console.log(scores.has('bob'));     // true
console.log(scores.size);           // 3

scores.delete('bob');
console.log(scores.size);           // 2

for (const [key, value] of scores) {
  console.log(key, value);
}
// alice 90
// 42 numeric key too
```

**Map vs Object — when to reach for which:**

| | Object | Map |
|---|---|---|
| Key types | String/Symbol only | **Any** value, including objects |
| Order | Not guaranteed for all key types (mostly insertion in practice) | **Always** insertion order |
| Size check | `Object.keys(obj).length` | `.size` (built-in) |
| Iterable directly with `for...of`? | No (needs `Object.entries()` first) | Yes, natively |
| Best for | Fixed, labeled records (JSON-like data) | Frequently added/removed key-value data, non-string keys |

---

## 🔷 2. `Set` — Unique Values Only

A `Set` is a collection of **unique values only** — adding a duplicate is silently ignored.

```js
const ids = new Set();

ids.add(1);
ids.add(2);
ids.add(2);   // duplicate — ignored, Set still has only one `2`

console.log(ids);         // Set(2) {1, 2}
console.log(ids.has(2));  // true
console.log(ids.size);    // 2

ids.delete(1);
console.log(ids);         // Set(1) {2}
```

A common real-world use: **de-duplicating an array** in one line.

```js
const nums = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(nums)];
console.log(unique);   // [1, 2, 3]
```

---

## 🔤 3. `Symbol` — the Guaranteed-Unique Primitive

```js
const uniqueId = Symbol("session_token");
const uniqueId2 = Symbol("session_token");

console.log(uniqueId === uniqueId2);   // false — every Symbol() call makes a BRAND NEW unique value
console.log(uniqueId.toString());      // "Symbol(session_token)"
console.log(typeof uniqueId);          // "symbol"
```

- The string passed to `Symbol(...)` (`"session_token"`) is just a **description** for debugging — it has **no effect** on uniqueness. Two symbols with the identical description are still two completely distinct values.
- Common real use: as object property keys guaranteed never to collide with any other key (including keys added by other code/libraries) — useful for "private-ish" or metadata-style properties that shouldn't clash.

```js
const id = Symbol("id");
const user = {
  name: "front-desk-user",
  [id]: 8842,   // a symbol-keyed property, invisible to normal enumeration
};

console.log(Object.keys(user));          // ["name"] — symbol keys are skipped
console.log(JSON.stringify(user));       // '{"name":"front-desk-user"}' — also skipped
console.log(user[id]);                   // 8842 — still fully accessible if you hold the symbol
```

---

## 🕸️ 4. `WeakMap` and `WeakSet` — Why They Exist

`WeakMap` and `WeakSet` look almost identical to `Map` and `Set`, with one crucial difference: their keys (in `WeakMap`) or values (in `WeakSet`) must be objects, and those references are held **weakly** — they do not prevent the garbage collector from reclaiming that object's memory.

### The memory-leak scenario a regular `Map` creates

Imagine a UI library that needs to track extra metadata for each DOM element it renders — say, a click counter — without modifying the element itself.

```js
const clickCounts = new Map();

function trackElement(el) {
  clickCounts.set(el, 0);   // el is now a KEY in this Map
}

function recordClick(el) {
  clickCounts.set(el, clickCounts.get(el) + 1);
}
```

If the page later removes that element from the DOM (say, a modal is closed and its container is discarded), the *only* remaining reference keeping that element's memory alive is the entry inside `clickCounts` — a regular `Map` holds its keys **strongly**. Every closed modal, every removed list item, silently keeps its metadata (and the element itself) resident in memory forever, because nothing ever calls `clickCounts.delete(el)`. Over a long-running single-page app, this is a genuine, gradually-growing memory leak.

### The fix — `WeakMap`

```js
const clickCounts = new WeakMap();

function trackElement(el) {
  clickCounts.set(el, 0);
}

function recordClick(el) {
  clickCounts.set(el, clickCounts.get(el) + 1);
}

// ... later, the element is removed from the DOM and no other code references it ...
// The garbage collector is now free to reclaim `el` — and its entry in `clickCounts`
// is automatically removed along with it. No manual cleanup, no leak.
```

Because `WeakMap` holds its keys weakly, once nothing *else* in the program references that element, the garbage collector can reclaim it — and its metadata entry disappears with it, with zero manual bookkeeping.

### The trade-off: no iteration

```js
const cache = new WeakMap();
const obj = {};
cache.set(obj, "cached value");

console.log(cache.get(obj));   // "cached value"
// cache.size        // undefined — WeakMap has no .size
// for (const x of cache) {}   // TypeError — WeakMap is not iterable
```

This is not an oversight — it's the whole point. If `WeakMap` were iterable or exposed a `.size`, that would require the engine to guarantee a stable list of "currently held" entries at any instant, which is fundamentally incompatible with entries silently vanishing whenever garbage collection runs. `WeakSet` works the same way, but as a set of unique object references rather than key-value pairs — useful for, say, tracking "has this object already been processed" without keeping the object alive.

| | `Map` / `Set` | `WeakMap` / `WeakSet` |
|---|---|---|
| Key/value types | Any | Objects only (as keys/values) |
| Prevents garbage collection? | Yes (strong reference) | No (weak reference) |
| Iterable / `.size`? | Yes | No |
| Best for | General-purpose collections you enumerate | Metadata tied to an object's lifetime |

---

## 🔁 5. The Iteration Protocol — What Makes `for...of` Work

`for...of` doesn't have special-case knowledge of arrays, strings, `Map`, and `Set`. Instead, all four of those types implement a shared **iterable protocol**: they each have a method keyed by the well-known symbol `Symbol.iterator`, which returns an **iterator** — an object with a `next()` method that returns `{ value, done }`.

```js
const arr = ["a", "b"];
const iterator = arr[Symbol.iterator]();   // arrays expose this method already

console.log(iterator.next());   // { value: "a", done: false }
console.log(iterator.next());   // { value: "b", done: false }
console.log(iterator.next());   // { value: undefined, done: true }
```

`for...of` is essentially sugar for calling this repeatedly until `done` is `true`. **Plain objects do not implement `Symbol.iterator`**, which is exactly why `for...of` throws on a plain object while `for...in` (which walks enumerable keys, not values) does not:

```js
const plainObj = { a: 1, b: 2 };
// for (const x of plainObj) {}   // TypeError: plainObj is not iterable

for (const key in plainObj) {
  console.log(key);   // "a", then "b" — for...in works, for...of does not
}
```

---

## ⏸️ 6. Generators — `function*` and `yield`

Writing an iterator by hand (as above) means manually tracking index/state between calls. A **generator function** — declared with `function*` — lets the engine do that bookkeeping for you. Calling a generator function doesn't run its body; it returns a generator object (itself an iterator) that runs the body only up to the next `yield`, then pauses.

```js
function* countUp(max) {
  console.log("generator started");
  for (let i = 1; i <= max; i++) {
    yield i;
  }
  console.log("generator finished");
}

const counter = countUp(3);

console.log(counter.next());
// logs: "generator started"
// returns: { value: 1, done: false }

console.log(counter.next());   // { value: 2, done: false } — resumes right after the previous yield
console.log(counter.next());   // { value: 3, done: false }

console.log(counter.next());
// logs: "generator finished"
// returns: { value: undefined, done: true }

console.log(counter.next());   // { value: undefined, done: true } — calling next() again after done stays done
```

Each `.next()` call resumes execution exactly where the previous `yield` paused it, runs until the next `yield` (or the function ends), and returns `{ value, done }` — the same shape the manual iterator above produced. Because a generator object already implements `Symbol.iterator` (returning itself), it works directly with `for...of`:

```js
for (const n of countUp(3)) {
  console.log(n);
}
// logs "generator started", then 1, 2, 3, then "generator finished"
```

Generators are especially useful for representing sequences that are expensive or infinite to compute all at once — values are produced lazily, one at a time, only when asked for:

```js
function* idGenerator() {
  let id = 1;
  while (true) {         // an infinite sequence — safe only because values are pulled lazily
    yield id++;
  }
}

const ids = idGenerator();
console.log(ids.next().value);   // 1
console.log(ids.next().value);   // 2
console.log(ids.next().value);   // 3
// the loop never actually runs to completion — each yield hands back exactly one value and pauses again
```

---

## 🛠️ 7. Building a Custom Iterable with `Symbol.iterator`

Any plain object can be made iterable — and therefore usable with `for...of` and the spread operator — by implementing `[Symbol.iterator]` by hand.

```js
const queryBook = {
  queries: ["Infra budget", "Water supply", "Road repair status", "Park maintenance"],
  [Symbol.iterator]() {
    let index = 0;
    const queries = this.queries;
    return {
      next() {
        if (index < queries.length) {
          return { value: queries[index++], done: false };
        }
        return { value: undefined, done: true };
      },
    };
  },
};

for (const query of queryBook) {
  console.log(`Filing request: ${query}`);
}
// Filing request: Infra budget
// Filing request: Water supply
// Filing request: Road repair status
// Filing request: Park maintenance

console.log([...queryBook]);
// ["Infra budget", "Water supply", "Road repair status", "Park maintenance"] — spread also uses Symbol.iterator
```

The same object is far shorter to write as a generator, since `function*` already returns something matching the iterator shape:

```js
const queryBookWithGenerator = {
  queries: ["Infra budget", "Water supply", "Road repair status", "Park maintenance"],
  *[Symbol.iterator]() {          // a generator method — note the `*` before the computed key
    for (const q of this.queries) {
      yield q;
    }
  },
};

console.log([...queryBookWithGenerator]);
// ["Infra budget", "Water supply", "Road repair status", "Park maintenance"] — identical result, far less code
```

Defining `[Symbol.iterator]` (by hand or via a generator) is the entire difference between an object that works with `for...of`/spread and one that throws `TypeError: is not iterable`. It is the exact mechanism arrays, strings, `Map`, and `Set` already have built in — which is *why* `for...of` works on them natively, and on plain objects not at all.

---

## 💡 Cheat Sheet: Quick Reference

```js
// Map
const m = new Map();
m.set(key, value); m.get(key); m.has(key); m.delete(key); m.size
for (const [k, v] of m) {}

// Set
const s = new Set();
s.add(value); s.has(value); s.delete(value); s.size
const unique = [...new Set(arr)];   // dedup an array

// Symbol
const sym = Symbol("description");   // always unique, description is debug-only
obj[sym] = value;                    // collision-proof key, skipped by Object.keys/JSON.stringify

// WeakMap / WeakSet — object keys only, not iterable, no .size, GC-friendly
const wm = new WeakMap();
wm.set(objKey, metadata);   // entry auto-removed once objKey is unreachable elsewhere

// Iteration protocol
obj[Symbol.iterator] = function() {
  return { next() { return { value, done }; } };
};

// Generator — shortcut for the same protocol
function* gen() {
  yield 1;
  yield 2;
}
const it = gen();
it.next();   // { value: 1, done: false }
```

---

## 🎯 Key Takeaways

- Reach for `Map` over a plain object when keys aren't strings, when insertion order matters, or when you need frequent add/remove with a live `.size`; reach for `Set` whenever "no duplicates" is a requirement, including the one-line array-dedup idiom.
- `Symbol()` always returns a brand-new unique value — its description string is for debugging only and never affects equality — making it ideal for collision-proof object keys that are automatically skipped by `Object.keys()` and `JSON.stringify()`.
- `WeakMap`/`WeakSet` trade away iteration and `.size` for weak references to their object keys, which is precisely what prevents metadata attached to an object from keeping that object alive after everything else has let go of it.
- `for...of` works on any object implementing `Symbol.iterator`, which must return an object with a `next()` method producing `{ value, done }` — arrays, strings, `Map`, and `Set` implement this natively; plain objects do not.
- `function*`/`yield` is syntax sugar over the same iterator shape: calling `.next()` resumes the paused function body up to the next `yield`, making it the shortest path to writing a custom iterable or a lazily-computed (even infinite) sequence.

---

## 📚 Related Concepts to Explore Next

This file moves beyond the arrays and plain objects covered in [08-Arrays-Objects-Mastery.md](./08-Arrays-Objects-Mastery.md) and the string/Date immutability patterns from [09-Strings-Numbers-Dates-RegExp.md](./09-Strings-Numbers-Dates-RegExp.md) into dedicated collection types and the iteration mechanism underneath `for...of`. The next file, [11-DOM-Browser-Events.md](./11-DOM-Browser-Events.md), puts several of these ideas to practical use — for instance, `WeakMap` is a common real-world pattern for attaching metadata to DOM elements without leaking memory as elements are added and removed from the page.

---

## 🔗 Resources

- [MDN — Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN — Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [MDN — WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- [MDN — Iterators and generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
