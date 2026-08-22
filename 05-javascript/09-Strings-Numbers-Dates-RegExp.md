# Strings, Numbers, Dates & RegExp
## Part 9 of 17 — Number Parsing & the Math Object, Floating-Point Precision, String Immutability & Methods, the `Date` Object, and Regular Expression Basics

---

## 📌 Executive Summary

- Numbers in JS are all IEEE-754 doubles, which is why `0.1 + 0.2 !== 0.3` — this isn't a bug, it's how binary floating point represents decimal fractions, and the fix is a tolerance comparison, never `===`.
- Strings are **immutable primitives** — `str[0] = "x"` silently does nothing; every string method returns a brand-new string instead of changing the original.
- `Date` wraps a single number — milliseconds since January 1, 1970 (the Unix epoch) — and every getter, setter, and arithmetic trick ultimately reads or writes that one timestamp.
- A regex literal (`/pattern/flags`) is a compact pattern-matching engine baked into the language; `.test()` asks yes/no, `.match()` extracts, and `.replace()` substitutes — all three take either a string or a regex, but only a regex unlocks flags, groups, and wildcards.
- These four topics — numbers, strings, dates, regex — are the everyday "small data" toolkit: almost every form validation, log parser, and report formatter in real applications leans on this file's contents.

---

## 🧠 Core Analogy: The Front Desk of a Records Office

Picture a records office that has to handle four very different kinds of paperwork all day:

- **Numbers** are the office's **calculator and ledger** — fast, precise-looking, but built on a rounding system (binary fractions) that occasionally produces a total that's off by a hair. A good clerk knows never to trust a ledger comparison down to the exact last digit — they check "close enough," not "identical."
- **Strings** are **printed forms** — once a form is printed, you cannot scratch out a single letter and expect the original sheet to change. To "correct" a form, the clerk photocopies it with the fix already applied and staples a fresh copy on top; the original printed sheet never gets touched.
- **`Date`** is the office's **wall clock connected to a single master counter** — internally it's just counting milliseconds since one fixed moment in the past (1 Jan 1970), and every "what day is it," "what hour is it," or "add 3 days" operation is really just reading or nudging that one counter.
- **Regular expressions** are the office's **rubber stamp with a custom-cut template** — instead of a clerk manually scanning every form for "does this look like an email," they press a pre-cut stamp shape (the pattern) against the text; it either fits (`.test()`), highlights the matching part (`.match()`), or gets used to black out and replace the matching part (`.replace()`).

---

## 🔢 1. Number Parsing — `parseInt`, `parseFloat`, `Number()`

Raw input from the outside world — form fields, URL params, file contents — arrives as strings. Turning that text into an actual `number` is one of the most common conversions in everyday code.

```js
const rawAge = "28";
const rawPrice = "19.99";
const rawBadge = "007";
const rawScore = "42 points";
const rawGarbage = "abc";

console.log(Number(rawAge));       // 28
console.log(Number(rawPrice));     // 19.99
console.log(Number(rawScore));     // NaN — Number() requires the ENTIRE string to be numeric
console.log(Number(""));           // 0 — an empty string converts to 0, a common surprise

console.log(parseInt(rawBadge));   // 7 — parses leading digits, stops at the first non-digit
console.log(parseInt(rawScore));   // 42 — reads as far as it can, then stops at the space
console.log(parseInt(rawGarbage)); // NaN — no leading digits to parse at all

console.log(parseFloat(rawPrice)); // 19.99 — like parseInt, but understands a decimal point
console.log(parseFloat("3.14 kg")); // 3.14
```

| Function | Behavior | Use when |
|---|---|---|
| `Number(str)` | Converts the **whole** string, or `NaN` if any part isn't numeric | You expect a clean numeric string and want to reject anything messy |
| `parseInt(str, radix)` | Reads leading digits only, ignores trailing junk, stops at the first invalid character | Extracting a number from "42px" or user input that may have trailing text |
| `parseFloat(str)` | Same as `parseInt` but understands one decimal point | Same as above, but the value may have a fractional part |

### The radix argument — always pass it

```js
console.log(parseInt("111", 2));    // 7   — "111" read as BINARY (base 2)
console.log(parseInt("0x1F"));      // 31  — auto-detects hex from the "0x" prefix
console.log(parseInt("08"));        // 8   — modern engines default to base 10
console.log(parseInt("08", 10));    // 8   — explicit is safer and self-documenting
```

`parseInt`'s second argument is the **radix** (numeral base) to interpret the string in. Old JS engines had inconsistent auto-detection rules for strings starting with `0`, so the long-standing best practice is: **always pass `10` explicitly** unless you specifically want a different base.

---

## 📐 2. The `Math` Object

`Math` is a built-in object — not a constructor, never called with `new` — that bundles constants and pure functions for arithmetic beyond `+ - * /`.

```js
const rawReading = 4.567;

console.log(Math.round(rawReading));   // 5   — nearest integer
console.log(Math.floor(rawReading));   // 4   — always rounds DOWN (toward -Infinity)
console.log(Math.ceil(rawReading));    // 5   — always rounds UP (toward +Infinity)
console.log(Math.trunc(rawReading));   // 4   — chops off the decimal, no rounding logic

console.log(Math.trunc(-4.567));   // -4  (chops toward zero)
console.log(Math.floor(-4.567));   // -5  (rounds toward -Infinity — DIFFERENT from trunc on negatives!)

const readings = [-120, 43, 56, -23];
console.log(Math.min(...readings));   // -120 — Math.min/max take individual args, spread an array into them
console.log(Math.max(...readings));   // 56

console.log(Math.abs(-15));    // 15   — absolute value
console.log(Math.pow(2, 10));  // 1024 — same as 2 ** 10
console.log(Math.sqrt(64));    // 8
console.log(Math.random());    // a float in [0, 1) — 0 inclusive, 1 exclusive
```

| Method | Purpose |
|---|---|
| `Math.round(x)` | Nearest integer |
| `Math.floor(x)` | Round toward `-Infinity` |
| `Math.ceil(x)` | Round toward `+Infinity` |
| `Math.trunc(x)` | Chop the decimal, round toward `0` |
| `Math.abs(x)` | Absolute value |
| `Math.min(...)` / `Math.max(...)` | Smallest / largest of the given arguments |
| `Math.pow(base, exp)` | Exponentiation (same as `base ** exp`) |
| `Math.sqrt(x)` | Square root |
| `Math.random()` | Random float in `[0, 1)` |

### A common recipe: random integer in a range

```js
function randomInt(min, max) {
  // Math.random() gives [0, 1) — scale it to the range, floor it, then shift by min
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
console.log(randomInt(1, 6));   // simulates a die roll: an integer from 1 to 6
```

---

## ⚠️ 3. Floating-Point Precision — the `0.1 + 0.2` Problem

```js
console.log(0.1 + 0.2);              // 0.30000000000000004  (!)
console.log(0.1 + 0.2 === 0.3);      // false

console.log(Number.MAX_SAFE_INTEGER);   // 9007199254740991 — largest integer JS can represent exactly
console.log(Number.MIN_SAFE_INTEGER);   // -9007199254740991
console.log(Number.EPSILON);            // 2.220446049250313e-16 — smallest meaningful gap between two doubles
console.log(Number.isNaN(0 / 0));       // true — the RELIABLE way to check for NaN
```

**Why this happens:** JavaScript numbers are IEEE-754 double-precision floats, and binary can't represent most decimal fractions exactly — the same way `1/3` can't be written exactly as a finite decimal. `0.1` and `0.2` are each stored as the *closest possible* binary approximation, and adding those two approximations produces a result that's off by a tiny amount. This isn't a JS quirk; it's how every mainstream language built on IEEE-754 behaves (Python, Java, C all show the same result).

**The fix — never compare floats with `===`. Compare within a tolerance instead:**

```js
function almostEqual(a, b) {
  return Math.abs(a - b) < Number.EPSILON;
}
console.log(almostEqual(0.1 + 0.2, 0.3));   // true
```

For money or anything requiring exact decimal accuracy, an even safer pattern is to avoid floats entirely — work in integer cents/paise and convert only for display:

```js
const priceInCents = 1999;             // $19.99, stored as an integer
const displayPrice = (priceInCents / 100).toFixed(2);   // "19.99" — string, safe for display only
```

### Why `Number.isNaN`, not `isNaN` or `=== NaN`

`NaN === NaN` is **always `false`** — `NaN` is the only JS value that is never equal to itself, per the IEEE-754 spec. The legacy global `isNaN()` also coerces its argument first (`isNaN("hello")` → `true`, because `"hello"` converts to `NaN`), causing false positives. `Number.isNaN()` does **not** coerce — it only returns `true` for an actual `NaN` value.

---

## 🔡 4. Strings Are Immutable

```js
let ticket = "GOLD";
ticket[0] = "B";              // silent fail — no error, but nothing happens
console.log(ticket);          // "GOLD" — unchanged
```

Unlike arrays, you **cannot** mutate a string in place via index assignment — strings are immutable primitives. To "change" a string you build and assign an entirely new one: `ticket = "B" + ticket.slice(1)`.

### Reading characters

```js
const code = "OMEGA-7";

console.log(code.length);        // 7
console.log(code.charAt(99));    // "" — out of bounds returns an empty string, NOT an error
console.log(code[99]);           // undefined — out of bounds via bracket access returns undefined
console.log(code.at(-1));        // "7" — .at() supports NEGATIVE indices (from the end); charAt/[] do not
```

### Common string methods

```js
const rawInput = "ThE StAtUs is ReadY";
console.log(rawInput.toLowerCase());   // "the status is ready"
console.log(rawInput.toUpperCase());   // "THE STATUS IS READY"

const message = "The pickup point is Dock 7. Repeat: Dock 7";
console.log(message.indexOf("Dock"));   // 20 — position of FIRST match, -1 if not found
console.log(message.includes("Dock")); // true

console.log(message.slice(0, 14));      // "The pickup po" — copies a section, does not mutate

const orders = "    move-north|hold-position|extract";
console.log(orders.trim());              // removes leading/trailing whitespace
console.log(orders.split("|"));          // ["    move-north", "hold-position", "extract"]

const ticketNumber = "42";
console.log(ticketNumber.padStart(6, "0"));   // "000042" — pad to a fixed length
console.log(ticketNumber.padEnd(6, "0"));     // "420000"

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
| `.split(sep)` | String → array (see file 8's array-return note) | No |
| `.padStart(len, ch)` / `.padEnd(len, ch)` | Pad to a fixed length | No |

**All string methods return a new string (or array) — never mutate the original**, because strings are immutable.

### The `void` operator

```js
console.log(void "anything");   // undefined
```

`void` evaluates its operand but always discards the result, evaluating to `undefined`. Rare in modern code (a historical relic from `javascript:void(0)` links), but occasionally used to explicitly signal "I'm intentionally discarding this value's result."

---

## 📅 5. The `Date` Object — Construction

`Date` represents a single instant in time, internally stored as a millisecond count from the **Unix epoch** — midnight, January 1, 1970 (UTC).

```js
const now = new Date();                          // current date and time
const specific = new Date(2026, 7, 22);           // year, MONTH (0-indexed!), day → Aug 22, 2026
const withTime = new Date(2026, 7, 22, 14, 30, 0); // ...+ hours, minutes, seconds
const fromISO = new Date("2026-08-22T14:30:00Z"); // from an ISO 8601 string — the safest string format to parse
const fromTimestamp = new Date(0);                // from a millisecond timestamp — epoch itself: Jan 1, 1970

console.log(specific.getMonth());   // 7 — NOT 8! Months are 0-indexed (0 = January, 11 = December)
```

> **The #1 `Date` gotcha:** `getMonth()` and the month argument to the constructor are **zero-indexed** — January is `0`, December is `11`. Days of the month, by contrast, are normal 1-indexed. This mismatch trips up almost everyone at least once.

### Getters and setters

```js
const launch = new Date(2026, 7, 22, 14, 30, 0);

console.log(launch.getFullYear());   // 2026
console.log(launch.getMonth());      // 7  (August, 0-indexed)
console.log(launch.getDate());       // 22 (day of month, 1-indexed)
console.log(launch.getDay());        // 0-6 — day of WEEK (0 = Sunday)
console.log(launch.getHours());      // 14
console.log(launch.getMinutes());    // 30
console.log(launch.getTime());       // milliseconds since epoch — the raw internal counter

launch.setFullYear(2027);            // mutates the SAME Date object in place
launch.setMonth(0);                  // now January
console.log(launch.getFullYear());   // 2027
```

Every `getX` has a matching `setX` (`setFullYear`, `setMonth`, `setDate`, `setHours`, and so on). Unlike strings, `Date` objects **are mutable** — setters change the object in place rather than returning a new one.

### Formatting basics

```js
const event = new Date(2026, 7, 22, 14, 30, 0);

console.log(event.toISOString());     // always UTC, e.g. "2026-08-22T09:00:00.000Z" if run in UTC+5:30 — the exact clock time shown shifts with the runtime's timezone, since 14:30 local gets converted to UTC first
console.log(event.toDateString());    // "Sat Aug 22 2026" — quick human-readable date
console.log(event.toLocaleDateString());   // "8/22/2026" (format depends on the runtime's locale)
console.log(event.toLocaleTimeString());   // "2:30:00 PM" (locale-dependent)

// Locale-aware formatting with explicit options — the most control without a library
console.log(
  event.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
);   // "August 22, 2026"
```

`toISOString()` is the go-to for storing or transmitting dates (APIs, databases) because it's unambiguous and timezone-explicit. The `toLocaleDateString`/`toLocaleTimeString` family is the go-to for displaying dates to a human, since it respects the user's locale conventions automatically.

### Timestamp arithmetic

```js
const start = new Date(2026, 7, 22);
const end = new Date(2026, 8, 5);

const diffMs = end - start;                        // subtracting Dates coerces both to their timestamp (number)
const diffDays = diffMs / (1000 * 60 * 60 * 24);    // ms → seconds → minutes → hours → days
console.log(diffDays);   // 14

// Adding days to a date: work through the timestamp, not the calendar
function addDays(date, days) {
  const result = new Date(date);                     // copy — avoid mutating the original
  result.setDate(result.getDate() + days);            // setDate handles month/year rollover automatically
  return result;
}
console.log(addDays(start, 10).toDateString());   // "Tue Sep 01 2026" — rolled over into September correctly

console.log(Date.now());   // current timestamp (ms since epoch) — a static method, no `new` needed
```

`Date - Date` subtraction works because JS coerces each `Date` to its numeric timestamp (`.getTime()`) during arithmetic — the same numeric coercion rules from file 3 apply here. Prefer `setDate(getDate() + n)` over manual millisecond math for calendar arithmetic, since it correctly handles month/year boundaries (JS normalizes an out-of-range day automatically).

---

## 🔎 6. Regular Expressions — Basics

A regular expression (regex) is a pattern used to match, extract, or replace text. In JS it's a first-class value, most often written as a **literal**: `/pattern/flags`.

```js
const digitsOnly = /^\d+$/;         // literal syntax — a regex between slashes
const digitsOnlyAlt = new RegExp("^\\d+$");   // constructor form — needed when the pattern is built from a variable
```

### Flags

```js
const caseInsensitive = /error/i;    // "i" — ignore case: matches "Error", "ERROR", "error"
const global = /a/g;                 // "g" — find ALL matches, not just the first

console.log(caseInsensitive.test("System ERROR detected"));   // true
console.log("banana".match(/a/g));    // ["a", "a", "a"] — all 3, thanks to the "g" flag
console.log("banana".match(/a/));     // ["a", index: 1, ...] — only the FIRST match, without "g"
```

| Flag | Meaning |
|---|---|
| `g` | Global — find all matches, not just the first |
| `i` | Case-insensitive matching |
| `m` | Multiline — `^`/`$` match the start/end of each line, not just the whole string |

### `.test()` vs `.match()` vs `.replace()`

```js
const pattern = /\d{3}-\d{4}/;   // three digits, a hyphen, four digits — e.g. a phone extension shape
const text = "Call the front desk at ext. 555-0173 for assistance.";

console.log(pattern.test(text));      // true — a yes/no check, called ON the regex
console.log(text.match(pattern));     // ["555-0173", index: 29, ...] — called ON the string, extracts the match
console.log(text.replace(pattern, "REDACTED"));   // "...at ext. REDACTED for assistance." — called ON the string
```

- **`.test()`** — regex method, returns a `boolean`. Use when you only need a yes/no answer ("does this look valid?").
- **`.match()`** — string method, returns an array of matches (or `null` if none). Use when you need the matched text itself.
- **`.replace()`** — string method, substitutes matches with a replacement string **or a callback function** (same callback vocabulary as `.map`/`.filter` from file 8 — it receives the match and returns the replacement text).

```js
const messyPhone = "call me at 555.0173 or 555-0199";
// replace with a function: normalize the separator to a hyphen
console.log(messyPhone.replace(/\d{3}[.-]\d{4}/g, (match) => match.replace(/[.-]/, "-")));
// "call me at 555-0173 or 555-0199" — normalizes both separators to a hyphen
```

### Common real-world patterns

```js
// 1. Basic email SHAPE check (not full RFC validation — good enough for a form UX hint)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
console.log(emailPattern.test("team@example.com"));   // true
console.log(emailPattern.test("not an email"));        // false
// ^[^\s@]+  → one or more chars that are NOT whitespace or "@" (the local part)
// @         → a literal "@"
// [^\s@]+   → the domain, same "no whitespace/@" rule
// \.[^\s@]+$ → a literal dot, then the TLD, anchored to the end

// 2. Collapsing repeated whitespace down to a single space
const messy = "This   has    irregular     spacing";
console.log(messy.replace(/\s+/g, " "));   // "This has irregular spacing"
// \s+ → one or more whitespace characters (space, tab, newline), replaced with a single " "

// 3. Extracting all digits from a mixed string
const invoiceLine = "Invoice #A-2049, due in 30 days, total $119.50";
console.log(invoiceLine.match(/\d+/g));   // ["2049", "30", "119", "50"]
// \d+ → one or more digit characters, "g" → every run of digits, not just the first

// 4. Checking a value is a simple slug (lowercase letters, digits, hyphens only)
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
console.log(slugPattern.test("summer-sale-2026"));   // true
console.log(slugPattern.test("Summer Sale"));         // false — spaces and uppercase not allowed
// ^[a-z0-9]+       → the string starts with one or more lowercase letters/digits
// (-[a-z0-9]+)*    → then zero or more "-word" groups
// $                → anchored to the end, so nothing extra is allowed after
```

---

## 💡 Cheat Sheet: Quick Reference

```js
// Numbers
Number("19.99")        // 19.99 — whole string must be numeric
parseInt("007")        // 7 — leading digits only
parseFloat("3.14 kg")  // 3.14
Math.floor(4.9)        // 4     Math.ceil(4.1)   // 5
Math.round(4.5)        // 5     Math.trunc(-4.7) // -4 (toward zero)
Math.abs(a - b) < Number.EPSILON   // safe float comparison

// Strings (all return NEW values — strings are immutable)
str.at(-1)              // last character, negative index supported
str.slice(0, 5)         // substring
str.trim()               // remove outer whitespace
str.padStart(6, "0")    // pad to fixed length
str.split(",")           // → array

// Date
new Date(2026, 7, 22)    // year, MONTH (0-indexed!), day
date.getFullYear() / .getMonth() / .getDate() / .getDay()
date.toISOString()       // machine-readable, always UTC
date.toLocaleDateString()// human-readable, locale-aware
end - start               // ms difference (Dates coerce to timestamp numbers)
Date.now()                // current timestamp

// RegExp
/pattern/gi               // literal + flags (g = all matches, i = ignore case)
regex.test(str)           // boolean
str.match(regex)          // array of matches, or null
str.replace(regex, "x")   // substitute (string or callback replacement)
```

---

## 🎯 Key Takeaways

- `Number()` demands the whole string be numeric; `parseInt`/`parseFloat` read as far as they can and stop — pick based on whether trailing junk should be an error or ignored.
- `0.1 + 0.2 !== 0.3` because of IEEE-754 binary float representation — always compare floats with a tolerance (`Number.EPSILON`), never `===`.
- Strings are immutable: index assignment silently fails, and every string method returns a new string rather than modifying the original.
- `Date` is a mutable wrapper around one millisecond-since-epoch number; months are 0-indexed, but days, hours, minutes are not — a frequent source of off-by-one bugs.
- `Date` subtraction (`end - start`) coerces both operands to their numeric timestamp, giving a millisecond difference you can convert to any unit.
- Regex `.test()` (boolean), `.match()` (extract), and `.replace()` (substitute, string or callback) cover the vast majority of real-world text validation and cleanup needs.

---

## 📚 Related Concepts to Explore Next

This file rounds out JavaScript's everyday "small data" primitives, building on the immutability and coercion rules from [03-Data-Types-Coercion-Memory.md](./03-Data-Types-Coercion-Memory.md) and the mutating-vs-non-mutating distinction [08-Arrays-Objects-Mastery.md](./08-Arrays-Objects-Mastery.md) established for arrays. The next file, [10-Collections-Iteration-Protocol.md](./10-Collections-Iteration-Protocol.md), moves beyond arrays and plain objects into `Map`, `Set`, `Symbol`, and the iteration protocol that powers `for...of` under the hood.

---

## 🔗 Resources

- [MDN — Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)
- [MDN — String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
- [MDN — Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [MDN — Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)
