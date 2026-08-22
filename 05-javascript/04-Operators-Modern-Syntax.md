# Operators & Modern Syntax
## Part 4 of 17 — Template Literals, Destructuring, Spread/Rest, Optional Chaining & Nullish Coalescing

---

## 📌 Executive Summary

- **Template literals** (`` `...` ``) replace manual string concatenation with embedded interpolation (`${expr}`) and native multi-line strings.
- **Destructuring** unpacks values out of arrays and objects into standalone variables in one statement, instead of one `const x = obj.x` line per property.
- **Spread (`...`)** expands a collection into individual elements (array literals, object literals, function calls); **rest (`...`)** does the opposite — it gathers multiple individual items back into a single array. Same three dots, opposite direction, and which one you're looking at depends entirely on *where* the dots sit.
- **Optional chaining (`?.`)** stops a property/method/index lookup from throwing when something along the chain is `null` or `undefined`, short-circuiting to `undefined` instead of crashing.
- **Nullish coalescing (`??`)** picks a fallback only when the left side is `null` or `undefined` — unlike `||`, it does not treat `0`, `""`, `false`, or `NaN` as reasons to fall back.

---

## 🧠 Core Analogy: The Intake Desk at a Records Office

- **Template literals** = a mail-merge letter template with blanks (`${name}`) that get filled in automatically, instead of a clerk manually cutting and taping strips of paper together.
- **Destructuring** = a clerk who, instead of opening a filing folder and copying out each field one at a time onto separate index cards by hand, uses a pre-printed form with labeled boxes — the right value lands in the right box in a single pass.
- **Spread** = tipping a folder's entire contents out onto the desk so each page becomes its own separate sheet, ready to be mixed in with other loose sheets.
- **Rest** = the opposite motion — sweeping every loose sheet remaining on the desk back into one folder, so they can be handled as a single bundle again.
- **Optional chaining** = the intake clerk checking "does this applicant even have a listed employer?" before checking "does that employer have a listed phone number?" — if any earlier box on the form was left blank, the clerk stops immediately and writes "not on file" instead of getting stuck trying to read a field on a folder that was never handed over.
- **Nullish coalescing** = the clerk's rule for filling in a blank box: only reach for the default value if the box is genuinely unfilled — the applicant writing `0` for "years at current job" is a real, meaningful answer, not a blank box, and the clerk must not overwrite it with a default.

---

## 📝 1. Template Literals

Template literals use backticks (`` ` ``) instead of single or double quotes, and unlock two things regular strings can't do: interpolation and native multi-line text.

### Interpolation — no more `+` concatenation

```js
const user = "morgan";
const role = "admin";

// Old way — manual concatenation
console.log('User ' + user + ' has role ' + role + '.');

// Template literal — embed the expression directly with ${...}
console.log(`User ${user} has role ${role}.`);
// User morgan has role admin.
```

`${...}` isn't limited to plain variables — it accepts any JavaScript expression, including function calls and arithmetic:

```js
const price = 40;
const qty = 3;

console.log(`Total: $${price * qty}`);           // Total: $120
console.log(`Name: ${user.toUpperCase()}`);       // Name: MORGAN
```

### Multi-line strings

Regular strings can't span multiple lines without an explicit `\n` on every break. Template literals preserve line breaks exactly as typed:

```js
// Old way
const oldMsg = "Line one\nLine two\nLine three";

// Template literal — line breaks are literal, no \n needed
const newMsg = `Line one
Line two
Line three`;
```

This is especially useful for building multi-line output like emails or formatted logs without a chain of `+` operators and `\n` characters.

---

## 📦 2. Array Destructuring

Array destructuring unpacks values **by position** into individual variables in one line.

```js
const scores = [95, 82, 71];

// Old way
const first = scores[0];
const second = scores[1];

// Destructuring — same result, one line
const [first2, second2, third2] = scores;
console.log(first2, second2, third2);   // 95 82 71
```

### Skipping elements

Leave a slot empty (just a comma) to skip a position you don't need:

```js
const [, , third] = scores;
console.log(third);   // 71 — first two positions skipped entirely
```

### Default values

If a position is `undefined` (missing, or the array is shorter than the pattern), a default kicks in:

```js
const [a, b, c = 100] = [10, 20];
console.log(a, b, c);   // 10 20 100 — c had nothing at index 2, so the default applied
```

A default only applies when the value at that position is `undefined` — not for any other falsy value:

```js
const [x = 100] = [0];
console.log(x);   // 0 — 0 is a real value, not "missing", so the default is never used
```

### Swapping two variables in one line

Destructuring makes a classic swap possible without a temporary variable:

```js
let p = "left";
let q = "right";

[p, q] = [q, p];
console.log(p, q);   // right left
```

The right-hand side `[q, p]` builds a brand-new array from the current values first; the left-hand side then destructures that array back into `p` and `q` in swapped order — all in a single statement, no third variable needed.

---

## 🗂️ 3. Object Destructuring

Object destructuring unpacks values **by property name**, not position — order in the pattern doesn't matter, the names have to match.

```js
const user = { name: "morgan", age: 29, city: "Austin" };

// Old way
const name = user.name;
const age = user.age;

// Destructuring
const { name: n, age: userAge, city } = user;
```

### Renaming

Use `existingKey: newVariableName` to bind a property to a different local variable name — useful when the property name is generic or would collide with a variable already in scope:

```js
const config = { theme: "dark" };
const { theme: currentTheme } = config;

console.log(currentTheme);   // "dark"
// console.log(theme);       // ReferenceError — the variable is called currentTheme, not theme
```

### Defaults

Same rule as arrays: a default applies only when the property is `undefined` (missing entirely, or explicitly set to `undefined`):

```js
const settings = { volume: 50 };
const { volume = 70, brightness = 80 } = settings;

console.log(volume, brightness);   // 50 80 — volume existed, so its own value won; brightness was missing, so the default filled in
```

Defaults and renaming combine in one pattern:

```js
const { brightness: level = 80 } = settings;
console.log(level);   // 80
```

### Nested destructuring

Object destructuring can reach into nested objects directly, mirroring the shape of the data:

```js
const order = {
  id: "ORD-001",
  customer: {
    name: "morgan",
    address: { city: "Austin", zip: "73301" },
  },
};

const {
  customer: {
    name: customerName,
    address: { city },
  },
} = order;

console.log(customerName, city);   // morgan Austin
```

Note that `customer` and `address` themselves are **not** created as variables here — only the leaf names (`customerName`, `city`) actually bind. The nested pattern is a path *through* the object, not a request to also extract every level along the way.

---

## 🌊 4. Spread — Expanding a Collection

Spread (`...`) takes an iterable (array, string) or an object and expands its contents into individual elements, wherever it's used.

### Spreading arrays

```js
const nums1 = [1, 2, 3];
const nums2 = [4, 5, 6];

const combined = [...nums1, ...nums2];
console.log(combined);   // [1, 2, 3, 4, 5, 6]

const copy = [...nums1];   // shallow copy — a new array, same top-level values
```

### Spreading objects

```js
const base = { theme: "dark", fontSize: 14 };
const overrides = { fontSize: 18 };

const merged = { ...base, ...overrides };
console.log(merged);   // { theme: "dark", fontSize: 18 } — later spread wins on key collisions
```

This is the same shallow-copy mechanism introduced in [file 3](./03-Data-Types-Coercion-Memory.md) §6 — spread only duplicates the top level; nested objects inside are still shared references.

### Spreading into function calls

Spread can expand an array into individual arguments at a call site:

```js
function sum3(a, b, c) {
  return a + b + c;
}

const args = [10, 20, 30];
console.log(sum3(...args));   // 60 — equivalent to sum3(10, 20, 30)
```

---

## 🧺 5. Rest — Gathering Values Together

Rest uses the identical `...` syntax, but in the opposite direction: instead of expanding a collection out, it **collects** multiple remaining values back into one array. Whether a given `...` is spread or rest depends entirely on where it appears:

| | Spread | Rest |
|---|---|---|
| **Direction** | Expands one collection into many values | Gathers many values into one collection |
| **Where it appears** | Inside an array/object literal, or at a function *call* site | In a function *parameter* list, or on the left side of a destructuring pattern |
| **Example** | `fn(...args)`, `[...arr1, ...arr2]` | `function fn(...args) {}`, `const [a, ...rest] = arr` |

### Rest in function parameters

```js
function sumAll(...numbers) {
  // numbers is a real array here, gathered from every argument passed in
  console.log(Array.isArray(numbers), numbers.length, numbers);
}

sumAll(1, 2, 3, 4);   // true 4 [1, 2, 3, 4]
```

`...numbers` collects *every* argument the function was called with into one array, however many there are. It must be the last parameter — there's nothing left to gather once it starts sweeping up the rest.

### Rest in destructuring

```js
const [first, ...remaining] = [10, 20, 30, 40];
console.log(first, remaining);   // 10 [20, 30, 40]

const { id, ...otherFields } = { id: 1, name: "morgan", age: 29 };
console.log(id, otherFields);    // 1 { name: "morgan", age: 29 }
```

The core distinction to hold onto: **spread explodes a collection outward at the point it's used; rest implodes loose values inward at the point they're declared.** Same three dots, opposite job, determined entirely by context.

---

## ❔ 6. Optional Chaining (`?.`)

Without optional chaining, reaching into a nested structure that might not fully exist throws immediately:

```js
const user = { profile: null };

console.log(user.profile.bio);   // TypeError: Cannot read properties of null (reading 'bio')
```

`?.` checks the value immediately to its left: if that value is `null` or `undefined`, the entire expression short-circuits to `undefined` right there, without evaluating anything further to the right — no exception thrown.

```js
console.log(user.profile?.bio);   // undefined — short-circuited safely, no crash
```

### `?.()` — optional function calls

Use `?.()` when the thing you're calling might not exist as a function at all:

```js
const settings = {};

settings.onSave?.();   // does nothing, silently — onSave was never defined
// settings.onSave();   // would throw: settings.onSave is not a function
```

### `?.[]` — optional computed access

Use `?.[...]` for bracket-style access (dynamic keys, array indices) under the same uncertainty:

```js
const data = null;
const key = "score";

console.log(data?.[key]);   // undefined — data itself was null, short-circuits before the lookup
```

### Chaining multiple links

Optional chaining can be stacked across an entire path, and the short-circuit propagates through every remaining link the moment one is hit:

```js
const response = { data: { user: null } };

console.log(response.data?.user?.profile?.bio);   // undefined — stops cleanly at `user`, never touches `.profile`
```

`?.` only guards against `null`/`undefined` specifically — it does not swallow other kinds of errors (e.g., calling something that exists but genuinely isn't a function still throws).

---

## 🎚️ 7. Nullish Coalescing (`??`) vs. `||`

Both `??` and `||` pick a right-hand fallback when the left-hand value is "no good" — but they disagree sharply on what counts as "no good."

- **`||`** falls through on **any falsy value**: `false`, `0`, `""`, `null`, `undefined`, `NaN`.
- **`??`** falls through **only** on `null` or `undefined` — every other falsy value (`0`, `""`, `false`, `NaN`) is treated as a perfectly valid, intentional value and is kept as-is.

### Worked example: where `||` gives the wrong answer

```js
function getDiscount(userDiscount) {
  return userDiscount || 10;   // "fallback to a 10% default discount if none given"
}

console.log(getDiscount(0));    // 10  ❌ WRONG — the user explicitly set a 0% discount, not "no discount configured"
console.log(getDiscount());     // 10  ✅ correct — undefined really does mean "nothing was passed"
```

Trace `getDiscount(0)` step by step:

1. `userDiscount` is `0`.
2. `||` evaluates `0` for truthiness. `0` is falsy.
3. Because the left side is falsy, `||` moves on to the right side and returns `10`.
4. The function returns `10` — even though the caller deliberately asked for a `0%` discount.

The bug: `||` cannot tell the difference between "the caller explicitly passed a meaningful `0`" and "the caller passed nothing at all." Both look identically falsy to `||`.

Now the same case with `??`:

```js
function getDiscountSafe(userDiscount) {
  return userDiscount ?? 10;
}

console.log(getDiscountSafe(0));    // 0   ✅ correct — 0 is a real, intentional value, kept as-is
console.log(getDiscountSafe());     // 10  ✅ correct — undefined genuinely means "nothing was passed"
```

`??` only checks "is the left side `null` or `undefined`?" — `0` passes that check as "a real value" and is returned untouched. The same failure mode applies to `""` (a deliberately empty string, e.g. "no middle name") and `false` (a deliberately unchecked checkbox) — anywhere a falsy-but-meaningful value can legitimately occur, `??` is the correct operator, not `||`.

| Left-hand value | `value || fallback` | `value ?? fallback` |
|---|---|---|
| `0` | fallback (likely wrong) | `0` (kept) |
| `""` | fallback (likely wrong) | `""` (kept) |
| `false` | fallback (likely wrong) | `false` (kept) |
| `null` | fallback | fallback |
| `undefined` | fallback | fallback |
| `"hello"` | `"hello"` | `"hello"` |

The rule of thumb: reach for `??` whenever falsy-but-valid data (a `0` count, an empty string, an unchecked `false`) is a realistic possibility in the value being checked, and reserve `||` for cases where *any* falsy value genuinely should be treated the same as "missing."

---

## 💡 Cheat Sheet: Quick Reference

| Feature | Syntax | Purpose |
|---|---|---|
| Template literal | `` `Hi ${name}` `` | Interpolation + native multi-line strings |
| Array destructuring | `const [a, b] = arr` | Unpack by position |
| Skip element | `const [, b] = arr` | Ignore a position |
| Destructuring default | `const [a = 1] = arr` | Fallback only if `undefined` |
| Swap variables | `[a, b] = [b, a]` | No temp variable needed |
| Object destructuring | `const { key } = obj` | Unpack by property name |
| Rename | `const { key: newName } = obj` | Bind to a different local name |
| Nested destructuring | `const { a: { b } } = obj` | Reach into nested shape directly |
| Spread (array) | `[...arr1, ...arr2]` | Expand into new array |
| Spread (object) | `{ ...obj1, ...obj2 }` | Shallow-merge into new object |
| Spread (call) | `fn(...args)` | Expand array into arguments |
| Rest (params) | `function f(...args) {}` | Gather arguments into an array |
| Rest (destructuring) | `const [a, ...rest] = arr` | Gather remaining items into an array |
| Optional chaining | `obj?.prop` | `undefined` instead of throwing on `null`/`undefined` |
| Optional call | `fn?.()` | Skip the call if `fn` doesn't exist |
| Optional computed | `obj?.[key]` | Safe bracket access |
| Nullish coalescing | `value ?? fallback` | Fallback only on `null`/`undefined` |
| `||` vs `??` | falsy vs. nullish | `||` catches `0`/`""`/`false` too; `??` doesn't |

---

## 🎯 Key Takeaways

- Template literals (`` `...` ``) replace `+` concatenation with `${expr}` interpolation and support real multi-line strings.
- Destructuring unpacks arrays by position and objects by property name, both supporting defaults (only triggered by `undefined`, not any falsy value) and, for objects, renaming and nested patterns.
- Spread and rest share identical `...` syntax but move in opposite directions: spread expands a collection outward at its point of use (literals, function calls); rest gathers loose values inward at its point of declaration (function params, destructuring patterns).
- Optional chaining (`?.`, `?.()`, `?.[]`) short-circuits to `undefined` the instant a `null`/`undefined` is hit along a chain, instead of throwing.
- `??` and `||` both supply fallbacks, but only `??` distinguishes "genuinely missing" (`null`/`undefined`) from "falsy but intentional" (`0`, `""`, `false`) — which matters anywhere a valid value can legitimately be falsy.

---

## 📚 Related Concepts to Explore Next

This file builds directly on the value-vs-reference model from [file 3](./03-Data-Types-Coercion-Memory.md) — spread's shallow-copy behavior here is the same mechanism as `{ ...obj }` in that file's §6, now taught as a syntax feature in its own right. The next file, [05-Control-Flow-Loops.md](./05-Control-Flow-Loops.md), moves on to `if`/`else`/`switch` and the full set of loop constructs (`for`, `while`, `do-while`, `for-of`, `for-in`), several of which pair naturally with the destructuring patterns introduced here (e.g. destructuring inside a `for-of` loop over an array of pairs).

---

## 🔗 Resources

- [MDN — Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- [MDN — Destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
- [MDN — Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [MDN — Rest parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)
- [MDN — Optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [MDN — Nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
