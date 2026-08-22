# JavaScript Notes Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 8 files in `05-javascript/` with a strict 17-file, basics-to-advanced learning path, per `docs/superpowers/specs/2026-08-22-javascript-notes-restructure-design.md`.

**Architecture:** Each task produces exactly one new Markdown file in `05-javascript/`, written from scratch in professional English, following the 8-section template (Executive Summary, Core Analogy, numbered deep-dive sections, Cheat Sheet, Key Takeaways, Related Concepts to Explore Next, Resources). Content is sourced by relocating and de-duplicating material from the 8 old files (mapped per task below) plus newly written content for gap topics. The old files are deleted in the final task, once all 17 replacements exist.

**Tech Stack:** Markdown only. No code execution required — "verification" for each task means confirming the new file's structure and content coverage, not running tests.

**Source files (read-only reference throughout, do not edit until Task 18):**
- `05-javascript/1-Basics.md` (984 lines)
- `05-javascript/2-Console-Variables-Data-Objects.md` (940 lines)
- `05-javascript/3-Prototypes-Inheritance.md` (288 lines)
- `05-javascript/4-This-Keyword.md` (428 lines)
- `05-javascript/5-Classes-OOP.md` (309 lines)
- `05-javascript/6-Error-Handling.md` (232 lines)
- `05-javascript/7-Event-Loop-Callbacks.md` (250 lines)
- `05-javascript/8-Promises-Async.md` (448 lines)

**Style references (read before Task 1, keep open throughout):**
- `02-github/Github.md`
- `01-networking/03/3-CDN_Caching.md`

---

## Shared Instructions For Every Content Task (1-17)

Each task below tells you exactly which old-file line ranges to pull source material from, and which new topics (not in any old file) must be written from scratch. In every task:

1. Read the cited old-file line ranges first.
2. Write the new file using the 8-section template:
   - `# Title` + `## Part N of 17 — <short description>`
   - `## Executive Summary` (3-5 bullets)
   - `## Core Analogy: <name>` — must be a universally-relatable, professional real-life scenario (restaurant kitchen, library, postal system, airport security, delivery service, etc.) — never a named person, never Hindi/Hinglish words (no "tiffin box", no character names)
   - Numbered `## N. <Topic>` deep-dive sections, using the source material cited, rewritten in plain professional English (not copy-pasted Hinglish phrasing)
   - `## Cheat Sheet: Quick Reference`
   - `## Key Takeaways`
   - `## Related Concepts to Explore Next` — link only to adjacent files in the 17-file series (file N-1 and file N+1 by name; additional files only if directly relevant)
   - `## Resources` — 2-4 MDN (or equivalent authoritative) links
3. Keep interview-deep density: retain/rewrite worked dry-run traces and hand-written polyfills from the source material; do not shorten them.
4. Strip all code comments except ones explaining non-obvious *why* (never comments that restate the code).
5. Verify the file has all 8 required `##`-level section markers before moving on (see Step "Verify structure" in each task).
6. Commit.

---

### Task 1: JS Engine, Runtime & Developer Tools

**Files:**
- Create: `05-javascript/01-JS-Engine-Runtime-DevTools.md`
- Source: `05-javascript/1-Basics.md:29-91` (JS Engine & Runtime, Node.js, dynamic typing, adding JS to a page & DevTools), `05-javascript/1-Basics.md:151-242` (Execution Context, Call Stack), `05-javascript/2-Console-Variables-Data-Objects.md:26-99` (console methods: table, group, time, numeric literal separators)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 29-91 and 151-242, and `05-javascript/2-Console-Variables-Data-Objects.md` lines 26-99.

- [ ] **Step 2: Write the new file**

Cover, in this order: what a JS engine is and does (parsing, compiling, executing), the difference between a runtime and the engine itself, Node.js as a runtime, dynamic + loose typing, how to add JS to an HTML page (`<script>` placement, `defer`/`async`), an overview of browser DevTools, then `console.log` and its lesser-known siblings (`console.table`, `console.group`, `console.time`, numeric literal separators as a DevTools-adjacent convenience), then Execution Context (Global vs Function) and the Call Stack with a worked dry-run trace of at least 3 nested function calls.

Use `05-javascript/01-JS-Engine-Runtime-DevTools.md` as the target path.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/01-JS-Engine-Runtime-DevTools.md"`
Expected: 8 or more (Executive Summary, Core Analogy, N deep-dive sections, Cheat Sheet, Key Takeaways, Related Concepts, Resources)

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/01-JS-Engine-Runtime-DevTools.md
git commit -m "docs(js): add file 1 - JS engine, runtime & devtools"
```

---

### Task 2: Variables, Scope & Hoisting

**Files:**
- Create: `05-javascript/02-Variables-Scope-Hoisting.md`
- Source: `05-javascript/1-Basics.md:243-392` (Hoisting deep dive, worked examples, var/let/const, TDZ), `05-javascript/1-Basics.md:514-521` (Scope), `05-javascript/2-Console-Variables-Data-Objects.md:100-130` (Runtime vs Compile Time)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 243-521 and `05-javascript/2-Console-Variables-Data-Objects.md` lines 100-130.

- [ ] **Step 2: Write the new file**

Cover: Runtime vs Compile Time (the two-phase mental model that hoisting depends on), Hoisting (memory phase vs code phase) with the `var`-hoisting worked example, the function+var worked example, and the third dry-run example reading a not-yet-assigned outer variable — keep all three traces. Then `var` vs `let` vs `const`, the Temporal Dead Zone, `const` specifics (binding immutability, not value immutability — cross-reference forward to file 3 for object mutation). Close with Scope (global, function, block).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/02-Variables-Scope-Hoisting.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/02-Variables-Scope-Hoisting.md
git commit -m "docs(js): add file 2 - variables, scope & hoisting"
```

---

### Task 3: Data Types, Coercion & Memory

**Files:**
- Create: `05-javascript/03-Data-Types-Coercion-Memory.md`
- Source: `05-javascript/1-Basics.md:92-150` (Primitive vs Non-Primitive, undefined vs null, typeof), `05-javascript/2-Console-Variables-Data-Objects.md:131-224` (Pointers/References, primitives copied by value, objects copied by reference, why `const arr.push` works, shallow vs deep copy)
- New topic (not in old files): `==` vs `===` and full coercion rules (write from scratch)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 92-150 and `05-javascript/2-Console-Variables-Data-Objects.md` lines 131-224.

- [ ] **Step 2: Write the new file**

Cover: the 7 primitive types, the single non-primitive type (Object) and everything that falls under it (arrays, functions, dates, etc. are all objects), `undefined` vs `null`, `typeof` (including its well-known quirk `typeof null === "object"`). Then pointers/references: primitives copied by value, objects copied by reference, why `const arr.push(...)` is legal, shallow copy vs deep copy with a worked example showing where shallow copy breaks on nested objects. Close with a new section: `==` vs `===`, the coercion table for common cases (`"" == 0`, `null == undefined`, `[] == false`, etc.), and why `===` is the professional default.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/03-Data-Types-Coercion-Memory.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/03-Data-Types-Coercion-Memory.md
git commit -m "docs(js): add file 3 - data types, coercion & memory"
```

---

### Task 4: Operators & Modern Syntax

**Files:**
- Create: `05-javascript/04-Operators-Modern-Syntax.md`
- Source: `05-javascript/1-Basics.md:415-442` (template literals, mentioned inline with functions — pull just the template literal material)
- New topics (not in old files, write from scratch): destructuring (array + object, with defaults and renaming), spread operator, rest parameters, optional chaining (`?.`), nullish coalescing (`??`)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 415-442 for existing template literal coverage.

- [ ] **Step 2: Write the new file**

Cover: template literals (multi-line strings, interpolation), array destructuring (including skipping elements, defaults, swapping two variables in one line), object destructuring (renaming, defaults, nested destructuring), the spread operator (arrays, objects, function calls) vs rest parameters (function params, destructuring) — make the spread-vs-rest distinction explicit since it's a common point of confusion, optional chaining `?.` (including `?.()` for optional function calls and `?.[]` for optional computed access), nullish coalescing `??` vs `||` (the key difference: `??` only falls through on `null`/`undefined`, `||` falls through on any falsy value — worked example with `0` and `""` showing where `||` gives the wrong answer).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/04-Operators-Modern-Syntax.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/04-Operators-Modern-Syntax.md
git commit -m "docs(js): add file 4 - operators & modern syntax"
```

---

### Task 5: Control Flow & Loops

**Files:**
- Create: `05-javascript/05-Control-Flow-Loops.md`
- Source: `05-javascript/1-Basics.md:522-714` (for, while, do-while, forEach, map, filter, reduce, for...of, for...in)
- New topic: if/else and switch (brief — likely assumed knowledge, but include for completeness since this is meant to be readable start-to-finish for a fresher)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 522-714.

- [ ] **Step 2: Write the new file**

Cover: if/else and switch (brief, with the switch fall-through gotcha), then all loop types: `for`, `while`, `do...while`, `forEach`, `map`, `filter`, `reduce`, `for...of` (values) vs `for...in` (keys) with the explicit warning about using `for...in` on arrays. Note: `map`/`filter`/`reduce`/`forEach` get a first pass here as loop constructs; file 8 (Arrays & Objects Mastery) will go deeper into mutating-vs-non-mutating array methods and chaining — say so explicitly in this file so it reads as forward reference, not duplication.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/05-Control-Flow-Loops.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/05-Control-Flow-Loops.md
git commit -m "docs(js): add file 5 - control flow & loops"
```

---

**CHECK-IN POINT:** After Task 5, pause and confirm with the user that tone, depth, and format match expectations before continuing to Tasks 6-17.

---

### Task 6: Functions Deep Dive

**Files:**
- Create: `05-javascript/06-Functions-Deep-Dive.md`
- Source: `05-javascript/1-Basics.md:393-514` (Function Declaration, parameters/template literals/return, functions inside functions, Function Expression, Arrow Functions, var vs let/const inside functions), `05-javascript/1-Basics.md:715-748` (Higher-Order Functions & Callbacks), `05-javascript/2-Console-Variables-Data-Objects.md:734-838` (Function expressions revisited, the `arguments` object, Pure vs Impure functions)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 393-514 and 715-748, and `05-javascript/2-Console-Variables-Data-Objects.md` lines 734-838.

- [ ] **Step 2: Write the new file**

Cover: function declarations vs function expressions vs arrow functions (including the hoisting difference between declarations and expressions — cross-reference file 2), parameters (defaults, and note destructured parameters as a forward-reference to file 4), the `arguments` object (and how arrow functions don't have their own), Higher-Order Functions (functions that take/return functions) and callbacks as the concrete application, Pure vs Impure functions with a worked example of each.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/06-Functions-Deep-Dive.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/06-Functions-Deep-Dive.md
git commit -m "docs(js): add file 6 - functions deep dive"
```

---

### Task 7: Closures, Currying & Real-World Patterns

**Files:**
- Create: `05-javascript/07-Closures-Currying-Real-World-Patterns.md`
- Source: `05-javascript/2-Console-Variables-Data-Objects.md:893-930` (Closures, HOF returning a closure), `05-javascript/2-Console-Variables-Data-Objects.md:839-892` (IIFE, module pattern), `05-javascript/8-Promises-Async.md:280-435` (Closures Revisited — mental model, real-world use #1 API rate limiting, real-world use #2 rate-limiting middleware, real-world use #3 memoization/caching, independent closure instances) — rewrite the "tiffin box" analogy as a professional, neutral analogy (e.g., a sealed backpack a function carries with it) and rename "Abhinav's Restaurant Kitchen" references generically
- New topics (write from scratch): currying, partial application, function composition, debounce, throttle

- [ ] **Step 1: Read source material**

Read `05-javascript/2-Console-Variables-Data-Objects.md` lines 839-930 and `05-javascript/8-Promises-Async.md` lines 280-435.

- [ ] **Step 2: Write the new file**

Cover: closures (the core mechanism — a function retains access to its defining scope), a professional real-life analogy (e.g., an employee who keeps a copy of the exact instructions they were given when hired, even after the office that issued them has closed), IIFE and the module pattern it enables, then the three real-world use cases from the old file 8 material rewritten neutrally: rate limiting, memoization/caching, and the "independent closure instances" pattern (each call to a closure-returning function creates its own private state). Then new content: currying (transforming a multi-arg function into a chain of single-arg functions) with a worked example, partial application vs currying (the distinction), function composition (`compose`/`pipe`), debounce (worked implementation + a UI search-box scenario) and throttle (worked implementation + a scroll-handler scenario), explicitly built as closure applications.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/07-Closures-Currying-Real-World-Patterns.md"`
Expected: 8 or more

- [ ] **Step 4: Verify no Hinglish/named-character analogies survived**

Run: `grep -inE "tiffin|abhinav" "05-javascript/07-Closures-Currying-Real-World-Patterns.md"`
Expected: no matches (empty output)

- [ ] **Step 5: Commit**

```bash
git add 05-javascript/07-Closures-Currying-Real-World-Patterns.md
git commit -m "docs(js): add file 7 - closures, currying & real-world patterns"
```

---

### Task 8: Arrays & Objects Mastery

**Files:**
- Create: `05-javascript/08-Arrays-Objects-Mastery.md`
- Source: `05-javascript/1-Basics.md:749-831` (Array and Object data structure basics), `05-javascript/2-Console-Variables-Data-Objects.md:255-326` (Object/array declaration styles, resizing via `.length`, checking types), `05-javascript/2-Console-Variables-Data-Objects.md:486-734` (Mutating vs non-mutating array methods, `forEach`'s 3rd callback param, searching, real-world chaining of filter/map/reduce, `in` operator vs `.hasOwnProperty()`, `Object.keys/values/entries`, `Object.fromEntries`, `Object.freeze` vs `Object.seal`, `Object.defineProperty`, `Object.getOwnPropertyDescriptor`)
- New topic (write from scratch): JSON — `JSON.stringify`/`JSON.parse`, common gotchas (can't serialize functions/undefined/circular references)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 749-831, and `05-javascript/2-Console-Variables-Data-Objects.md` lines 255-326 and 486-734.

- [ ] **Step 2: Write the new file**

Cover: array and object declaration styles, resizing arrays via `.length`, mutating vs non-mutating array methods (with the full method lists from the source), the `forEach` 3rd-parameter gotcha, searching methods (`find`, `indexOf`, `includes`), the real-world `filter`→`map`→`reduce` chaining example, `in` vs `.hasOwnProperty()`, `Object.keys`/`values`/`entries`/`fromEntries`, `Object.freeze` vs `Object.seal` (the interview-favorite distinction), `Object.defineProperty` and `Object.getOwnPropertyDescriptor`. Close with a new JSON section: what JSON is, `JSON.stringify`/`JSON.parse`, and the gotchas (functions, `undefined`, and circular references don't survive `stringify`).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/08-Arrays-Objects-Mastery.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/08-Arrays-Objects-Mastery.md
git commit -m "docs(js): add file 8 - arrays & objects mastery"
```

---

### Task 9: Strings, Numbers, Dates & RegExp

**Files:**
- Create: `05-javascript/09-Strings-Numbers-Dates-RegExp.md`
- Source: `05-javascript/2-Console-Variables-Data-Objects.md:327-486` (Numbers deep dive: parsing, Math object, floating-point precision; Strings deep dive: immutability, reading characters, common string methods, `void` operator)
- New topics (write from scratch): the `Date` object (creating dates, getting/setting components, formatting basics, timestamp arithmetic), regular expressions basics (creating a regex literal, `.test()`, `.match()`, `.replace()` with a regex, common patterns like email/whitespace)

- [ ] **Step 1: Read source material**

Read `05-javascript/2-Console-Variables-Data-Objects.md` lines 327-486.

- [ ] **Step 2: Write the new file**

Cover: number parsing (`parseInt`, `parseFloat`, `Number()`), the `Math` object, the floating-point precision problem (`0.1 + 0.2`) with the fix pattern. Then strings: immutability, reading characters, common string methods, the `void` operator. Then new content: the `Date` object end-to-end (construction, getters/setters, common formatting approaches, doing date arithmetic via timestamps). Then regex basics: literal syntax, flags (`g`, `i`), `.test()` vs `.match()` vs `.replace()`, 3-4 common real-world patterns (email shape, trimming whitespace, extracting digits).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/09-Strings-Numbers-Dates-RegExp.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/09-Strings-Numbers-Dates-RegExp.md
git commit -m "docs(js): add file 9 - strings, numbers, dates & regexp"
```

---

### Task 10: Collections & Iteration Protocol

**Files:**
- Create: `05-javascript/10-Collections-Iteration-Protocol.md`
- Source: `05-javascript/1-Basics.md:831-891` (Map, Set), `05-javascript/2-Console-Variables-Data-Objects.md:209-224` (Symbol), `05-javascript/7-Event-Loop-Callbacks.md:203-236` (`Symbol.iterator` powering `for...of`)
- New topics (write from scratch): WeakMap, WeakSet (and why they exist — garbage collection of keys), generators (`function*`, `yield`), building a custom iterable with `Symbol.iterator`

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 831-891, `05-javascript/2-Console-Variables-Data-Objects.md` lines 209-224, and `05-javascript/7-Event-Loop-Callbacks.md` lines 203-236.

- [ ] **Step 2: Write the new file**

Cover: `Map` (vs plain objects — key types, ordering, size), `Set` (uniqueness, common dedup use case), `Symbol` (guaranteed-unique primitive, common use cases). Then new content: `WeakMap`/`WeakSet` and why they exist (keys can be garbage collected, useful for storing metadata tied to an object's lifetime without causing memory leaks). Then `Symbol.iterator` and the iteration protocol (what makes `for...of` work on arrays/strings/Maps/Sets but not plain objects), generators (`function*`/`yield`, pausable execution, a worked example of a custom generator), and building a custom iterable object by implementing `Symbol.iterator` by hand.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/10-Collections-Iteration-Protocol.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/10-Collections-Iteration-Protocol.md
git commit -m "docs(js): add file 10 - collections & iteration protocol"
```

---

### Task 11: The DOM & Browser Events

**Files:**
- Create: `05-javascript/11-DOM-Browser-Events.md`
- Source: `05-javascript/1-Basics.md:892-973` (Selecting elements, reading & changing content, styles/classes/attributes, creating & inserting elements, Events), `05-javascript/2-Console-Variables-Data-Objects.md:225-254` (What JS does NOT own: Browser & Node APIs)
- New topics (write from scratch): event bubbling and capturing (the two phases), event delegation (attaching one listener to a parent instead of many to children) with a worked real-world example (a list where items are added dynamically)

- [ ] **Step 1: Read source material**

Read `05-javascript/1-Basics.md` lines 892-973 and `05-javascript/2-Console-Variables-Data-Objects.md` lines 225-254.

- [ ] **Step 2: Write the new file**

Cover: what JS does NOT own — the distinction between the language (ECMAScript) and Browser/Node APIs (`fetch`, `setTimeout`, `document`) provided by the host environment (this sets up vocabulary file 16's event loop content depends on). Then DOM basics: selecting elements (`querySelector`, `getElementById`, etc.), reading/changing content and attributes/classes/styles, creating and inserting elements. Then events: `addEventListener`, the event object. New content: event bubbling vs capturing (the two-phase model, `stopPropagation`), and event delegation with a worked example of a dynamically-populated list handled via a single listener on the parent.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/11-DOM-Browser-Events.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/11-DOM-Browser-Events.md
git commit -m "docs(js): add file 11 - the DOM & browser events"
```

---

**CHECK-IN POINT:** After Task 11, pause and confirm with the user before continuing to Tasks 12-17 (the OOP, error handling, and async files).

---

### Task 12: Prototypes, Inheritance, Proxy & Reflect

**Files:**
- Create: `05-javascript/12-Prototypes-Inheritance-Proxy-Reflect.md`
- Source: `05-javascript/3-Prototypes-Inheritance.md` (entire file: prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes, polyfills for `map`/`filter`/`reduce`/`forEach`, `Object.create()` vs `class` vs factory functions)
- New topic (write from scratch): Proxy and Reflect basics (`new Proxy(target, handler)` with a `get`/`set` trap example, what `Reflect` is for and why it pairs with Proxy)

- [ ] **Step 1: Read source material**

Read `05-javascript/3-Prototypes-Inheritance.md` in full.

- [ ] **Step 2: Write the new file**

Cover the entire old file 3 content, rewritten to the new template: the prototype chain, `prototype` vs `__proto__`, `Object.create()`, extending built-in prototypes (and why it's generally discouraged in production code — note this caveat explicitly), the four hand-written polyfills (`map`, `filter`, `reduce`, `forEach`) keeping full implementation detail, and `Object.create()` vs `class` vs factory functions compared side by side. Then new content: Proxy (`new Proxy(target, handler)`, a worked `get`/`set` trap example — e.g., validating property writes or logging access) and Reflect (why it exists as the "default behavior" counterpart to Proxy traps).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/12-Prototypes-Inheritance-Proxy-Reflect.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/12-Prototypes-Inheritance-Proxy-Reflect.md
git commit -m "docs(js): add file 12 - prototypes, inheritance, proxy & reflect"
```

---

### Task 13: `this`, call/apply/bind & Object Construction

**Files:**
- Create: `05-javascript/13-This-Keyword-Call-Apply-Bind.md`
- Source: `05-javascript/4-This-Keyword.md` (entire file: `this` in global context, inside object methods, inside nested functions, arrow functions and `this`, detached methods, `call`/`apply`/`bind` with polyfills, function constructors, what `new` does, `new` vs factory functions)

- [ ] **Step 1: Read source material**

Read `05-javascript/4-This-Keyword.md` in full.

- [ ] **Step 2: Write the new file**

Cover the entire old file 4 content, rewritten to the new template, in the same progression: `this` in the global context, inside an object method (including the array-methods-inside-a-method subtlety), inside regular nested functions (does NOT inherit), arrow functions and `this` (the one real exception), detached methods, then `call()`/`apply()`/`bind()` side by side with real-life use cases and the three hand-written polyfills, then function constructors, what `new` actually does step by step, and `new` vs a factory function.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/13-This-Keyword-Call-Apply-Bind.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/13-This-Keyword-Call-Apply-Bind.md
git commit -m "docs(js): add file 13 - this keyword, call/apply/bind"
```

---

### Task 14: Classes, OOP & Design Patterns

**Files:**
- Create: `05-javascript/14-Classes-OOP-Design-Patterns.md`
- Source: `05-javascript/5-Classes-OOP.md` (entire file: classes as syntactic sugar, constructor, static members, inheritance via `extends`/`super`, public vs private fields, `throw` variants)
- New topic (write from scratch): singleton pattern, observer pattern, factory pattern — each with a minimal worked JS example built on classes

- [ ] **Step 1: Read source material**

Read `05-javascript/5-Classes-OOP.md` in full.

- [ ] **Step 2: Write the new file**

Cover the entire old file 5 content, rewritten to the new template: classes as syntactic sugar over prototypes (cross-reference file 12), the `constructor`, `static` members, inheritance with `extends`/`super`, public vs private fields (`#field` syntax), and the `throw`/`throw new Error(...)`/`throw new CustomClass(...)` progression (note this bridges into file 15's error handling). Then new content: three common design patterns implemented with classes — Singleton (single shared instance, worked example), Observer (subject maintains a list of subscribers it notifies, worked example), Factory (a function/class that creates other objects based on input, worked example).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/14-Classes-OOP-Design-Patterns.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/14-Classes-OOP-Design-Patterns.md
git commit -m "docs(js): add file 14 - classes, OOP & design patterns"
```

---

### Task 15: Error Handling & Defensive Coding

**Files:**
- Create: `05-javascript/15-Error-Handling-Defensive-Coding.md`
- Source: `05-javascript/6-Error-Handling.md` (entire file: philosophy of errors, try/catch/finally full shape, the Error object, built-in error types, `throw` semantics)

- [ ] **Step 1: Read source material**

Read `05-javascript/6-Error-Handling.md` in full.

- [ ] **Step 2: Write the new file**

Cover the entire old file 6 content, rewritten to the new template: the philosophy (errors are fine, unhandled crashes are the problem), `try`/`catch`/`finally`'s full shape, the `Error` object (`.message`, `.name`, `.stack`), built-in error types (`TypeError`, `RangeError`, etc.), and what you throw determines what you get back (including custom error classes, cross-referencing file 14's class syntax).

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/15-Error-Handling-Defensive-Coding.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/15-Error-Handling-Defensive-Coding.md
git commit -m "docs(js): add file 15 - error handling & defensive coding"
```

---

### Task 16: The Event Loop & Callbacks

**Files:**
- Create: `05-javascript/16-Event-Loop-Callbacks.md`
- Source: `05-javascript/7-Event-Loop-Callbacks.md:1-202` (JS is single-threaded, callbacks and chaining problems, what `fetch`/`setTimeout` actually are, the event loop / callback queue / microtask queue, the two-queue priority order, worked example) — omit the `Symbol.iterator` section (lines 203-236), which was relocated to file 10; rewrite "Abhinav's Restaurant Kitchen" analogy neutrally

- [ ] **Step 1: Read source material**

Read `05-javascript/7-Event-Loop-Callbacks.md` lines 1-202.

- [ ] **Step 2: Write the new file**

Cover: JavaScript is single-threaded, and how it "outsources" waiting to the browser/Node APIs (cross-reference file 11's "what JS does NOT own" section). Callbacks as the original way to handle "later," and the chaining problem (callback hell) it creates. What `fetch`/`setTimeout` actually are and who does the work (the host environment, not the JS engine). The event loop, callback queue, and microtask queue, with the strict priority order (microtasks drain before the next macrotask), and the worked example tracing execution order across both queues.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/16-Event-Loop-Callbacks.md"`
Expected: 8 or more

- [ ] **Step 4: Verify no named-character analogy survived**

Run: `grep -in "abhinav" "05-javascript/16-Event-Loop-Callbacks.md"`
Expected: no matches (empty output)

- [ ] **Step 5: Commit**

```bash
git add 05-javascript/16-Event-Loop-Callbacks.md
git commit -m "docs(js): add file 16 - the event loop & callbacks"
```

---

### Task 17: Promises, async/await & Modules

**Files:**
- Create: `05-javascript/17-Promises-Async-Await-Modules.md`
- Source: `05-javascript/8-Promises-Async.md:1-279` (three states of a Promise, `.then/.catch/.finally`, chaining, `Promise.resolve/reject`, `Promise.all/allSettled/race/any`, `async`/`await`, error handling with async/await, sequential vs concurrent await) — omit the Closures Revisited section (lines 280-435), which was relocated to file 7
- New topic (write from scratch): ES Modules (`export`/`import`, named vs default exports) vs CommonJS (`require`/`module.exports`), when you'd see each; a short capstone section tying the whole 17-file series together

- [ ] **Step 1: Read source material**

Read `05-javascript/8-Promises-Async.md` lines 1-279.

- [ ] **Step 2: Write the new file**

Cover: the three states of a Promise (pending/fulfilled/rejected), `.then()`/`.catch()`/`.finally()` and chaining, `Promise.resolve()`/`Promise.reject()`, combining multiple promises (`all`, `allSettled`, `race`, `any` compared side by side), `async`/`await` as syntax sugar over promises, error handling with `async`/`await` via `try`/`catch` (cross-reference file 15), and the sequential-vs-concurrent `await` performance trap with a worked before/after example. Then new content: ES Modules (`export`/`import`, named vs default exports, why they're the modern standard) vs CommonJS (`require`/`module.exports`, still common in Node.js), and when you'd encounter each. Close the file (and the series) with a short "You've completed the series" capstone section summarizing how the 17 files build on each other, from the JS engine up through async code — this is the payoff section a fresher reads last.

- [ ] **Step 3: Verify structure**

Run: `grep -c "^## " "05-javascript/17-Promises-Async-Await-Modules.md"`
Expected: 8 or more

- [ ] **Step 4: Commit**

```bash
git add 05-javascript/17-Promises-Async-Await-Modules.md
git commit -m "docs(js): add file 17 - promises, async/await & modules"
```

---

### Task 18: Remove Old Files & Final Verification

**Files:**
- Delete: `05-javascript/1-Basics.md`, `05-javascript/2-Console-Variables-Data-Objects.md`, `05-javascript/3-Prototypes-Inheritance.md`, `05-javascript/4-This-Keyword.md`, `05-javascript/5-Classes-OOP.md`, `05-javascript/6-Error-Handling.md`, `05-javascript/7-Event-Loop-Callbacks.md`, `05-javascript/8-Promises-Async.md`

- [ ] **Step 1: Confirm all 17 new files exist**

Run: `ls 05-javascript/*.md | grep -E "^05-javascript/[0-9]{2}-" | wc -l`
Expected: 17

- [ ] **Step 2: Scan the whole new folder for leftover Hinglish/named-character content**

Run: `grep -rinE "tiffin|abhinav" 05-javascript/`
Expected: no matches (empty output). If matches are found, fix them before proceeding.

- [ ] **Step 3: Delete the old files**

```bash
git rm 05-javascript/1-Basics.md 05-javascript/2-Console-Variables-Data-Objects.md 05-javascript/3-Prototypes-Inheritance.md 05-javascript/4-This-Keyword.md 05-javascript/5-Classes-OOP.md 05-javascript/6-Error-Handling.md 05-javascript/7-Event-Loop-Callbacks.md 05-javascript/8-Promises-Async.md
```

- [ ] **Step 4: Verify the folder now contains exactly the 17 new files**

Run: `ls 05-javascript/*.md`
Expected: exactly the 17 files `01-JS-Engine-Runtime-DevTools.md` through `17-Promises-Async-Await-Modules.md`, no others.

- [ ] **Step 5: Commit**

```bash
git commit -m "docs(js): remove old 05-javascript files, superseded by 17-file restructure"
```

---

## Plan Self-Review Notes

- **Spec coverage:** all 17 files from the spec's hierarchy table have a task; all "new topics to add" from the spec (destructuring/spread-rest → Task 4, Modules → Task 17, JSON → Task 8, generators/iterators → Task 10, Proxy/Reflect → Task 12, debounce/throttle → Task 7, design patterns → Task 14, memory management → covered via shallow/deep copy in Task 3 and WeakMap/WeakSet in Task 10, optional chaining/nullish coalescing → Task 4, WeakMap/WeakSet → Task 10, DOM events/delegation → Task 11) are each mapped to a task.
- **Duplication removed:** closures (old files 2 and 8) now live only in Task 7. `Symbol.iterator` (old file 7) now lives only in Task 10. Old file 8's Closures Revisited section is explicitly excluded from Task 17 to avoid re-duplicating Task 7's content.
- **Hinglish/named-analogy removal:** explicitly called out and verification-grepped in Tasks 7, 16, and again folder-wide in Task 18.
