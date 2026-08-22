# Control Flow & Loops
## Part 5 of 17 — if/else, switch, and the Full Set of Loop Constructs

---

## 📌 Executive Summary

- **`if`/`else`** branches execution based on a condition; **`switch`** branches on matching a single value against multiple candidates — and both ultimately boil down to "run this block, or don't."
- `switch` cases **fall through** by default once a match is found — execution keeps running into the next case unless a `break` stops it, which is a classic source of bugs.
- `for`, `while`, and `do...while` are the three general-purpose loops, chosen by what you know up front: an exact iteration count (`for`), a stopping condition with an unknown iteration count (`while`), or a stopping condition that must still run the body at least once (`do...while`).
- `forEach`, `map`, `filter`, and `reduce` are array-specific looping methods that remove manual index bookkeeping; they get their first introduction here as loop constructs, and file 8 (Arrays & Objects Mastery) returns to them in depth — mutation behavior, chaining, and the rest of the array method surface.
- `for...of` iterates an iterable's **values**; `for...in` iterates an object's **enumerable keys** — using `for...in` on an array works but is a mistake in practice, because it yields string indices and can pick up unexpected inherited properties.

---

## 🧠 Core Analogy: A Warehouse Fulfillment Line

Picture a warehouse floor running a shift:

- **`if`/`else`** is the inspector at the start of the line checking a single package: "Is this fragile? Route it to the padded-box station. Otherwise, route it to the standard station." One decision, one fork.
- **`switch`** is the sorting inspector standing in front of a package sorter with several labeled chutes ("Electronics," "Perishables," "Documents," "Other"). The inspector reads the label once and drops the package down the matching chute — and if nobody nails the chute shut behind it, the package keeps sliding into every chute below it too, getting stamped by each one it passes through. That's fall-through: a match starts execution, and without an explicit stop, it doesn't end there.
- **`for`** is a supervisor who says "process exactly 50 boxes on this pallet, then stop" — the count is known in advance.
- **`while`** is a supervisor who says "keep processing boxes until the truck is empty" — nobody knows exactly how many boxes that will take, only the condition that ends the shift.
- **`do...while`** is the same truck-emptying supervisor, except the crew is required to unload at least one box first before anyone even checks whether the truck has anything in it — useful when "check first" would be checking an empty truck that hasn't even arrived yet.
- **`forEach`/`map`/`filter`/`reduce`** are specialized conveyor-belt attachments bolted onto the line specifically for processing boxes: one just runs a task on every box as it passes (`forEach`), one relabels every box and sends the relabeled set down a new belt (`map`), one only lets certain boxes continue past a checkpoint (`filter`), and one collapses the entire pallet down into a single summary tally at the end (`reduce`).
- **`for...of` vs `for...in`** is the difference between a worker who walks down the conveyor belt reading the *contents* of each box (`for...of` — values) versus a clerk who walks down a shelf reading the *label tags* on each bin (`for...in` — keys). Reading label tags off a conveyor belt built for boxes, not labeled shelf bins, gets you index numbers instead of anything useful — which is exactly what happens when `for...in` is pointed at an array.

---

## 🔀 1. `if` / `else` — Branching on a Condition

`if` runs a block only when its condition evaluates to `true` (or something truthy). `else` provides the block to run when it doesn't.

```js
const orderTotal = 45;

if (orderTotal >= 50) {
  console.log("Free shipping applied.");
} else {
  console.log("Standard shipping rate applies.");
}
// Standard shipping rate applies.
```

Chaining `else if` checks additional conditions in order, stopping at the first one that matches:

```js
const score = 72;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 75) {
  console.log("Grade: B");
} else if (score >= 60) {
  console.log("Grade: C");
} else {
  console.log("Grade: F");
}
// Grade: C
```

Only the first matching branch runs — once `score >= 60` matches, the remaining `else if`/`else` branches are never even evaluated.

---

## 🔢 2. `switch` — Branching on a Single Value

`switch` evaluates one expression once, then compares it against each `case` using strict equality (`===`).

```js
const day = "Tuesday";

switch (day) {
  case "Monday":
    console.log("Start of the work week.");
    break;
  case "Tuesday":
    console.log("Second day in.");
    break;
  case "Saturday":
  case "Sunday":
    console.log("Weekend.");
    break;
  default:
    console.log("Midweek.");
}
// Second day in.
```

`case "Saturday":` with no code before the next `case "Sunday":` is a deliberate fall-through — both labels share the same body. That's the *safe*, intentional use of fall-through.

### The fall-through gotcha

Every `case` block keeps executing into the next one unless a `break` (or `return`, inside a function) stops it. Forgetting `break` is one of the most common `switch` bugs:

```js
const status = "shipped";

switch (status) {
  case "pending":
    console.log("Order received.");
  case "shipped":
    console.log("Order is on the way.");
  case "delivered":
    console.log("Order delivered.");
    break;
  default:
    console.log("Unknown status.");
}
// Order is on the way.
// Order delivered.
```

Trace what happened: `status` matched `"shipped"`, so execution starts there — but with no `break` after that case, it falls straight through into `"delivered"` too, logging both lines. The `"pending"` case above it was never entered (its label didn't match), but once inside a matching case, the *absence* of `break` is what let execution keep sliding downward. `default` never runs here because a case already matched earlier — `default` only catches values that matched nothing.

The fix is a `break` at the end of every case that shouldn't bleed into the next one:

```js
switch (status) {
  case "pending":
    console.log("Order received.");
    break;
  case "shipped":
    console.log("Order is on the way.");
    break;
  case "delivered":
    console.log("Order delivered.");
    break;
  default:
    console.log("Unknown status.");
}
// Order is on the way.
```

---

## 🔁 3. `for` — Fixed Iteration Count

```js
for (initializer; condition; increment) {
  // code to repeat
}

for (var x = 1; x <= 10; x = x + 1) {
  console.log("Value of x", x);
}
```

The three clauses run in a strict order every cycle: check `condition` → run the body if it's `true` → run `increment` → check `condition` again. The condition must always evaluate to a boolean; `increment` prepares the counter for the *next* iteration and always runs *after* the body.

**Dry run:**

| x | condition `x <= 10` | body runs? | `x = x + 1` |
|---|---|---|---|
| 1 | `1<=10` true | yes, logs 1 | x becomes 2 |
| 2 | `2<=10` true | yes, logs 2 | x becomes 3 |
| … | … | … | … |
| 10 | `10<=10` true | yes, logs 10 | x becomes 11 |
| 11 | `11<=10` **false** | no | *(loop exits)* |

The condition is checked an 11th time, but the body only ever runs 10 times — the check that fails never produces an iteration.

Use `for` when the number of repetitions is known (or computable) before the loop starts.

---

## ⏳ 4. `while` — Unknown Iteration Count, Known Stopping Condition

```js
var fileSize = 1024;
var currentDownloaded = 0;

while (currentDownloaded < fileSize) {
  console.log("Downloading chunk...");
  currentDownloaded = currentDownloaded + 512;
}
// Downloading chunk...
// Downloading chunk...
```

The condition is checked *before* every iteration, including the first. This models a task like a file download: you don't know in advance exactly how many chunks it will take, but you know precisely when to stop — once `currentDownloaded` reaches `fileSize`.

If the condition is `false` on the very first check, the body never runs at all — `while` makes no guarantee of even one execution.

---

## 🔂 5. `do...while` — Guaranteed At Least One Run

```js
var fileSize = 1024;
var currentDownloaded = 0;

do {
  console.log("Downloading chunk...");
  currentDownloaded = currentDownloaded + 512;
} while (currentDownloaded < fileSize);
```

Identical to `while` in every respect except one: the body runs once *before* the condition is checked for the first time. This guarantees at least one execution, which matters when the setup work in the loop body is itself what makes the condition meaningful to check (e.g. a first request must go out before there's anything to evaluate about a "retry until success" condition).

```js
var attempts = 0;

do {
  attempts = attempts + 1;
  console.log("Attempt", attempts);
} while (attempts < 0);   // false immediately, but the body already ran once
// Attempt 1
```

With a plain `while (attempts < 0)`, this body would never run at all. With `do...while`, it always runs at least once regardless of the condition.

---

## 🧱 6. `forEach` — Built-In Array Iteration

`forEach` calls a given function once for every element in an array, handling the index/counter bookkeeping internally.

> The callbacks in this section are written with the `function` keyword rather than the shorter arrow-function syntax (`fruit => ...`) you may have seen elsewhere. That's deliberate — arrow functions aren't introduced until file 6 — not a sign that this is outdated style. Once you've read file 6, feel free to write these same callbacks as arrow functions.

```js
const fruits = ["apple", "cherry", "peach"];

fruits.forEach(function (fruit, index, array) {
  console.log(`${index}: ${fruit}`);
});
// 0: apple
// 1: cherry
// 2: peach
```

The callback receives up to three arguments — the current element, its index, and the array itself — though most usages only need the first.

To see what `forEach` is doing internally, here's a hand-rolled version:

```js
function myForEach(arr, callback) {
  for (let i = 0; i < arr.length; i++) {
    callback(arr[i], i, arr);
  }
}

myForEach(fruits, function (fruit) {
  console.log("Processing:", fruit);
});
// Processing: apple
// Processing: cherry
// Processing: peach
```

`forEach` always returns `undefined` — it exists purely for running side effects (like logging) on each element, not for producing a new value. That's what `map`, `filter`, and `reduce` are for.

---

## 🔄 7. `map` — Transform Into a New Array

```js
const nums = [1, 2, 3, 4, 5, 6];

const doubled = nums.map(function (n) {
  return n * 2;
});
console.log(doubled);   // [2, 4, 6, 8, 10, 12]
```

`map` always returns a **new array of the same length** as the original — exactly one output element per input element. The original array is left untouched.

Hand-rolled version, to make the mechanism explicit:

```js
function myMap(arr, fn) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const transformed = fn(arr[i]);
    result.push(transformed);
  }
  return result;
}

console.log(myMap(nums, function (n) { return n * 3; }));
// [3, 6, 9, 12, 15, 18]
```

---

## 🧹 8. `filter` — Keep Only What Matches

```js
const nums = [1, 2, 3, 4, 5, 6];

const evens = nums.filter(function (n) {
  return n % 2 === 0;
});
console.log(evens);   // [2, 4, 6]
```

The callback must return a boolean: elements where it returns `true` are kept in the result, elements where it returns `false` are dropped. Like `map`, `filter` always returns a **new array** — but unlike `map`, that array can be shorter than the original, or even empty.

```js
function myFilter(arr, predicate) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      result.push(arr[i]);
    }
  }
  return result;
}

console.log(myFilter(nums, function (n) { return n > 3; }));
// [4, 5, 6]
```

---

## 🎯 9. `reduce` — Collapse Into a Single Value

```js
const nums = [1, 2, 3, 4, 5, 6];

const total = nums.reduce(function (accumulator, current) {
  return accumulator + current;
}, 0);
console.log(total);   // 21
```

- `accumulator` carries the running result forward from one iteration to the next.
- The second argument passed to `.reduce()` (`0` above) is the accumulator's **initial value**.
- On each call, whatever the callback returns becomes the accumulator going into the next iteration.

`reduce` is the most general of these four — `map` and `filter` can each be rebuilt using `reduce`, because "produce one output from a list, one step at a time" covers transformation and filtering as special cases of the same underlying pattern:

```js
// map, rebuilt using reduce
const doubled = nums.reduce(function (acc, n) {
  acc.push(n * 2);
  return acc;
}, []);
console.log(doubled);   // [2, 4, 6, 8, 10, 12]

// filter, rebuilt using reduce
const evens = nums.reduce(function (acc, n) {
  if (n % 2 === 0) {
    acc.push(n);
  }
  return acc;
}, []);
console.log(evens);   // [2, 4, 6]
```

---

## 🎁 10. `for...of` — Iterate Over VALUES

```js
const fruits = ["apple", "cherry", "peach"];

for (const fruit of fruits) {
  console.log(fruit);
}
// apple
// cherry
// peach
```

`for...of` works on any **iterable** — arrays, strings, `Map`, `Set` — and hands over the **value** directly on each pass, with no manual indexing required. It also combines naturally with the array destructuring from [file 4](./04-Operators-Modern-Syntax.md), e.g. `for (const [key, value] of someMap)`.

---

## 🔑 11. `for...in` — Iterate Over KEYS

```js
const user = { name: "morgan", age: 29, city: "Austin" };

for (const key in user) {
  console.log(key, "=", user[key]);
}
// name = morgan
// age = 29
// city = Austin
```

`for...in` iterates over an object's **enumerable keys** (property names). Reading a value out of the object still requires bracket access (`user[key]`) inside the loop body.

### Warning: don't use `for...in` on arrays

`for...in` technically works on arrays too, but it iterates the **indices as strings** (`"0"`, `"1"`, `"2"`, …), not the values — and it isn't limited to numeric indices, so it can also pick up any other enumerable property added to the array or inherited through its prototype chain, in an order that isn't guaranteed to match numeric order.

```js
const scores = [95, 82, 71];

for (const index in scores) {
  console.log(typeof index, index);
}
// string 0
// string 1
// string 2
```

Every `index` here is a **string**, not a number — `"0" + 1` would produce `"01"`, not `1`, which is a common source of subtle bugs when someone tries to do arithmetic with a `for...in` index straight out of an array. For arrays, prefer `for...of` (values) or `.forEach()` instead; reserve `for...in` for plain objects.

| | Iterates over | Typical use |
|---|---|---|
| `for...of` | **values** | Arrays, strings, Maps, Sets |
| `for...in` | **keys** (as strings) | Plain objects — avoid on arrays |

---

## 💡 Cheat Sheet: Quick Reference

| Construct | Syntax | Use when |
|---|---|---|
| `if`/`else` | `if (cond) {} else {}` | Branch on a condition |
| `switch` | `switch (val) { case x: ... break; }` | Branch on one value matching several candidates |
| `for` | `for (init; cond; step) {}` | Exact iteration count known |
| `while` | `while (cond) {}` | Stopping condition known, count unknown, may run zero times |
| `do...while` | `do {} while (cond)` | Same as `while`, but must run at least once |
| `forEach` | `arr.forEach(fn)` | Run a side effect on every element, no new array needed |
| `map` | `arr.map(fn)` | Transform every element into a new array, same length |
| `filter` | `arr.filter(fn)` | Keep only elements where `fn` returns `true`, new array |
| `reduce` | `arr.reduce(fn, initial)` | Collapse the array into a single value |
| `for...of` | `for (const v of iterable) {}` | Iterate values of an array/string/Map/Set |
| `for...in` | `for (const k in obj) {}` | Iterate keys of a plain object (avoid on arrays) |

---

## 🎯 Key Takeaways

- `if`/`else` branches on a condition; `switch` branches on one value against multiple candidates using strict equality, and every case falls through into the next unless a `break` stops it — the most common `switch` bug is a missing `break`.
- `for` fits a known iteration count, `while` fits a known stopping condition with an unknown count (and may run zero times), and `do...while` is the same as `while` but guarantees at least one run before the condition is ever checked.
- `forEach`, `map`, `filter`, and `reduce` are array-specific loops: `forEach` just runs a function per element and returns `undefined`, `map` transforms every element into a same-length new array, `filter` keeps only matching elements in a (possibly shorter) new array, and `reduce` collapses the whole array into a single accumulated value — general enough that `map` and `filter` can both be rewritten in terms of it.
- `for...of` yields an iterable's values; `for...in` yields an object's enumerable keys as strings — using `for...in` on an array still "works" but hands back string indices and can pick up unexpected extra properties, so `for...of` or `.forEach()` are the correct choice for arrays.
- This file deliberately used regular `function` keyword syntax for every callback (`map`, `filter`, `reduce`, `forEach`) — arrow function syntax is introduced in the next file and applies directly to all of these same callbacks.

---

## 📚 Related Concepts to Explore Next

This file assumes the value-vs-reference and destructuring foundations from [04-Operators-Modern-Syntax.md](./04-Operators-Modern-Syntax.md) — array destructuring in particular pairs naturally with `for...of` (e.g. destructuring `[key, value]` pairs while iterating a `Map`). The next file, [06-Functions-Deep-Dive.md](./06-Functions-Deep-Dive.md), covers function declarations, expressions, arrow function syntax, parameters/defaults, and higher-order functions in depth — including a proper introduction to the arrow function syntax that was deliberately withheld from every callback in this file. Array method depth (mutating vs. non-mutating, method chaining) for `map`/`filter`/`reduce`/`forEach` and the rest of the array method surface is covered later in `08-Arrays-Objects-Mastery.md`.

---

## 🔗 Resources

- [MDN — if...else](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else)
- [MDN — switch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch)
- [MDN — for...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)
- [MDN — for...in](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in)
