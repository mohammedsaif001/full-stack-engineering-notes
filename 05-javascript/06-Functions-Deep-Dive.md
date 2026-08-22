# Functions Deep Dive
## Part 6 of 17 — Declarations, Expressions, Arrow Functions & Higher-Order Functions

---

## 📌 Executive Summary

- JavaScript offers **three ways to define a function** — declaration, function expression, and arrow function — and they are not interchangeable: they differ in hoisting behavior (building directly on file 2) and in whether they get their own `arguments` object.
- **Arrow functions**, introduced formally in this file after being deliberately withheld in file 5, offer a shorter syntax (`(params) => expression`) with implicit returns for single-expression bodies, but they have no `arguments` object of their own.
- The **`arguments` object** is an automatic, array-*like* local available inside every regular function (declaration or expression) — arrow functions never get one.
- A **Higher-Order Function (HOF)** takes another function as a parameter and/or returns one; the function passed in is a **callback** — this is the exact mechanism behind `forEach`, `map`, `filter`, and `reduce` from file 5.
- **Pure functions** only compute from their own inputs and produce no side effects; **impure functions** read or mutate state outside themselves — both have their place, but pure functions are easier to test and reason about.

---

## 🧠 Core Analogy: The Vending Machine vs. the Bank Teller

- A **pure function** is a **vending machine**: insert the same combination of coins and button press, and it dispenses the exact same snack, every single time, with nothing else in the store affected by the transaction. No matter how many times you repeat the exact same input, the outside world (the store's shelves, other machines) is untouched and the result never varies.
- An **impure function** is a **bank teller**: hand over the same withdrawal slip twice, and the second time the answer might be different — because the teller consults and updates an account balance that lives *outside* the interaction itself. The teller's answer depends on, and changes, shared external state.
- A **Higher-Order Function** is the **shift manager** who doesn't personally handle every customer — instead, they hand the task to whichever specialist (a callback) is appropriate for the moment: "process this transaction using *this* procedure," where the procedure itself is swappable. The manager's job (loop through customers, call the handed-in procedure for each) stays identical no matter which specialist procedure gets plugged in.
- **Function declarations vs. expressions vs. arrow functions** are three different **hiring paperwork formats** for that specialist: a declaration is a permanently posted job listing on the office wall before the shift even starts (usable the moment the shift begins — hoisted with its full body); a function expression is a specialist hired mid-shift and handed to you via a name tag (`const`/`let`/`var`) — not available until that hiring moment actually happens; an arrow function is the same mid-shift hire, just wearing a shorter uniform and carrying no personal ID badge of their own (no own `arguments`) — they simply use whatever badge the surrounding office already issued.

---

## 🏗️ 1. Function Declarations — The Classic, Fully-Hoisted Form

```js
function addNumbers(num1, num2) {
  const result = num1 + num2;
  return result;
}

addNumbers(2, 3);   // 5
```

- `num1`, `num2` are **parameters** — placeholders in the definition.
- `2`, `3` at the call site are **arguments** — the actual values handed in.
- `return` immediately exits the function the instant it runs; any code written after it inside that same function never executes.

As file 2 established, a function **declaration** is hoisted with its **entire body** during the memory creation phase — not just a placeholder like `var` gets. That means it's fully callable *before* its textual position in the source:

```js
sayHello();   // ✅ works — the whole function is already in memory

function sayHello() {
  console.log("Hello");
}
```

### Functions as values — returning a function, not calling it

A function can return anything — a string, a number, an object, or even **another function**:

```js
function outer() {
  function inner() {
    return "produced by inner";
  }
  return inner;   // returning the FUNCTION ITSELF, not calling it (no parentheses)
}

const grabbed = outer();   // grabbed is now a function
const result = grabbed();  // calling it produces the value
console.log(result);       // "produced by inner"
console.log(typeof grabbed);   // "function"
```

The distinction between `return inner` and `return inner()` matters: the first hands back the function *itself*, ready to be called later; the second calls it immediately and hands back whatever it produced.

---

## ✍️ 2. Function Expressions — Defined as a Value

A **function expression** assigns an (often anonymous) function to a variable, rather than declaring it with a standalone name:

```js
const brew = function () {
  console.log("Brewing");
};
brew();   // "Brewing"
```

The function itself has no name of its own here — you call it entirely through the variable it was assigned to.

### The hoisting difference — declaration vs. expression

This is the one behavioral difference that matters most in practice, and it's a direct callback to file 2's memory-phase/code-phase model:

```js
sayHi();   // ✅ works — declarations are hoisted with their full body

function sayHi() {
  console.log("Hi");
}

greet();   // ❌ TypeError: greet is not a function

var greet = function () {
  console.log("Greetings");
};
```

Walking through why, using file 2's two-phase model directly:

- `sayHi` is a **declaration** — the memory phase hoists it fully, body and all. It's callable from line 1.
- `greet` is a **`var` variable holding a function expression**. The memory phase hoists the *variable* `greet` and initializes it to `undefined` — exactly like any other `var` — but the *function value* isn't attached to it until the assignment line actually runs in the code phase. Calling `greet()` before that line executes is really calling `undefined()`, which throws `TypeError: greet is not a function`.
- Had `greet` been declared with `let`/`const` instead of `var`, the result would be even more explicit: a `ReferenceError` from the Temporal Dead Zone (file 2, §3), because `let`/`const` are hoisted but locked until their declaration line runs.

This is the practical payoff of file 2's hoisting deep dive: "is this a function declaration or a function expression?" is precisely the question that determines whether a function is safely callable before its line of code, or not.

---

## 🏹 3. Arrow Functions — New Syntax, Introduced Here

File 5 deliberately wrote every `forEach`/`map`/`filter`/`reduce` callback using the `function` keyword and explicitly promised that **arrow function syntax arrives in this file**. Here it is, for the first time in this series.

An arrow function is a third way to write a function — shorter syntax, and (as covered in §4 below) different behavior around `arguments`:

```js
// name                    param     implicit return
const isAllowedToVote = (age) => age >= 18;

console.log(isAllowedToVote(23));   // true
```

```js
const isEligibleForAccount = (age, minBalance) => {
  return age >= 18 && minBalance >= 5000;
};

console.log(isEligibleForAccount(23, 6000));   // true
```

### Arrow function syntax rules

| Situation | Rule |
|---|---|
| Exactly one parameter | Parentheses are **optional**: `age => age >= 18` is valid |
| Zero, or two-or-more parameters | Parentheses are **required**: `() => ...` or `(age, minBalance) => ...` |
| Body is a single expression | No braces, no `return` keyword — the expression's value is **implicitly returned** |
| Body has multiple statements | Braces `{ }` are **required**, and `return` becomes **explicit** again — it's no longer implicit once braces appear |

A common mistake worth flagging explicitly: adding braces around a single-expression body without adding `return` silently produces `undefined`, because braces switch the arrow function into "multiple statement" mode where nothing is returned automatically:

```js
const double = (n) => { n * 2 };     // ❌ returns undefined — braces without `return`
const doubleFixed = (n) => n * 2;    // ✅ implicit return, no braces
const doubleExplicit = (n) => { return n * 2; };   // ✅ braces WITH explicit return
```

### Rewriting file 5's loop callbacks with arrow functions

Since file 5 introduced `forEach`/`map`/`filter`/`reduce` with `function`-keyword callbacks, here they are again with the syntax this file just introduced — same behavior, shorter form:

```js
const nums = [1, 2, 3, 4, 5, 6];

const doubled = nums.map((n) => n * 2);
const evens = nums.filter((n) => n % 2 === 0);
const total = nums.reduce((acc, n) => acc + n, 0);

console.log(doubled);   // [2, 4, 6, 8, 10, 12]
console.log(evens);     // [2, 4, 6]
console.log(total);     // 21
```

Arrow functions did not replace `function`-keyword syntax — both remain in everyday use. Arrow functions are especially favored for short, inline callbacks like these; named declarations and expressions remain common for larger, standalone function bodies. (Arrow functions also handle the `this` keyword differently from regular functions — that distinction is covered in depth in file 13; it doesn't affect anything in this file's examples.)

---

## 🎛️ 4. Parameters — Defaults and Destructured Parameters

A parameter can be given a **default value**, used only when the corresponding argument is `undefined` (not passed at all, or explicitly passed as `undefined`):

```js
function greet(name = "Guest") {
  console.log(`Hello, ${name}`);
}

greet("Morgan");   // "Hello, Morgan"
greet();            // "Hello, Guest" — no argument, default kicks in
greet(undefined);   // "Hello, Guest" — explicitly undefined, default still kicks in
greet(null);        // "Hello, null" — null is NOT undefined, so the default does NOT apply
```

That last line is worth internalizing: default parameters only fire on `undefined`, exactly like the destructuring defaults covered in file 4 — `null` is a deliberate, present value, so it passes straight through untouched.

Parameters can also be **destructured** directly in the function signature, unpacking an object or array argument into named locals in one step — this is the exact same destructuring syntax from [file 4](./04-Operators-Modern-Syntax.md), just applied at the point where a function receives its arguments:

```js
function createUser({ name, age, city = "Unknown" }) {
  console.log(`${name}, ${age}, from ${city}`);
}

createUser({ name: "Jordan", age: 29 });   // "Jordan, 29, from Unknown"
```

```js
function firstTwo([a, b]) {
  return `${a} and ${b}`;
}

console.log(firstTwo(["Sage", "Rosemary", "Thyme"]));   // "Sage and Rosemary"
```

Destructured parameters combine naturally with defaults, exactly as shown above with `city = "Unknown"` — this reads a `city` property out of the passed-in object and falls back to `"Unknown"` only if that property is `undefined`.

---

## 📦 5. The `arguments` Object

> The **`arguments` object** is an automatic, array-*like* local variable available inside every **regular** function (declarations and function expressions) — **never** inside an arrow function — that holds every value passed to that particular call, regardless of how many parameters were formally declared.

```js
function logArgs() {
  console.log(typeof arguments);            // "object"
  console.log(Array.isArray(arguments));    // false — array-LIKE, not a real array
  const argsArray = Array.from(arguments);  // convert to a real array to use array methods
  console.log(argsArray);
}

logArgs("Sage", "Rosemary");
// object
// false
// ['Sage', 'Rosemary']
```

```js
function logFirstTwo() {
  console.log(arguments[0]);   // "Sage"
  console.log(arguments[1]);   // "Rosemary"
}
```

`arguments` looks array-like — it has a `.length` and supports index access — but it is **not** a real array: methods like `.map`, `.filter`, and `.reduce` are missing from it directly. Convert it first with `Array.from(arguments)` or `[...arguments]` to use those.

### Arrow functions have no `arguments` of their own

```js
const arrowLog = () => {
  try {
    console.log(arguments);
  } catch (e) {
    console.log(e.message);   // "arguments is not defined"
  }
};
arrowLog();
```

Referencing `arguments` inside an arrow function either throws a `ReferenceError` (in a standalone script or module context, as above), or — if the arrow function is nested inside a *regular* function — silently resolves to that **enclosing** regular function's `arguments`, which is rarely the intended behavior and a genuine source of subtle bugs:

```js
function outer(a, b) {
  const arrow = () => {
    console.log(arguments); // NOT the arrow function's own arguments — arrow functions don't have one
  };
  arrow();
}

outer(1, 2); // Arguments(2) [1, 2] — this is outer's arguments, leaked through the arrow function
```

This is one of the concrete, practical reasons arrow functions and regular functions are not interchangeable: any function that genuinely needs to inspect however many arguments it was called with must be a regular function, or use **rest parameters** instead (`function f(...args) { }`, covered in file 4) — which work identically inside arrow functions, since rest parameters produce a real array, not the `arguments` object:

```js
const sumAll = (...args) => args.reduce((acc, n) => acc + n, 0);
console.log(sumAll(1, 2, 3, 4));   // 10 — works fine in an arrow function
```

---

## 🥇 6. Higher-Order Functions & Callbacks

> A **Higher-Order Function (HOF)** is a function that **takes another function as a parameter**, **returns a function**, or both.
>
> The function passed in as an argument is called a **callback function**.

```js
function runWithBonus(producerFn) {
  return producerFn() + 40;
}

function baseValue() {
  return 10;
}

console.log(runWithBonus(baseValue));   // 10 + 40 = 50
```

```js
function anotherValue() {
  return 100;
}

console.log(runWithBonus(anotherValue));   // 100 + 40 = 140
```

`runWithBonus` doesn't know or care *which* function it receives — it just calls whatever was handed to it and adds 40 to the result. Swapping `baseValue` for `anotherValue` changes the outcome without changing `runWithBonus` itself at all — that's the entire power of the pattern: the *behavior* becomes a parameter, not just the data.

### `forEach`, `map`, `filter`, `reduce` are all built-in HOFs

File 5 introduced these as loop constructs; they are now recognizable as concrete, everyday HOFs — each one takes a callback and calls it, once per element, exactly as `runWithBonus` called `baseValue` above:

```js
const prices = [10, 25, 40];

const withTax = prices.map((price) => price * 1.08);        // map is a HOF; the arrow fn is the callback
const affordable = prices.filter((price) => price < 30);    // filter is a HOF
const total = prices.reduce((acc, price) => acc + price, 0); // reduce is a HOF
```

### A HOF that returns a function

The other half of the HOF definition — *returning* a function — is what makes configurable, reusable function factories possible:

```js
function makeMultiplier(factor) {
  return function (n) {
    return n * factor;
  };
}

const triple = makeMultiplier(3);
console.log(triple(5));   // 15
```

`makeMultiplier` is a HOF because it returns a function. The returned function still "remembers" `factor` after `makeMultiplier` itself has finished running — this is a first, informal glimpse of a **closure**, the mechanism that makes that memory possible. Closures are covered in full mechanical depth in the next file; for now, it's enough to recognize that returning a function from a function is a normal, common pattern, and that HOFs are the concrete application of "functions as values" from §1.

---

## 🧪 7. Pure vs. Impure Functions

> A function is **pure** if it computes and returns a value using only its own parameters and local variables, **never reading or modifying anything outside its own scope**. A function is **impure** if it has a **side effect** — it reads or mutates state that exists outside itself: a variable in an outer scope, an object passed by reference, the console, the DOM, a file.

### Worked example — an impure function

```js
let orderCount = 0;

function placeOrder(item) {
  orderCount++;                          // mutates a variable OUTSIDE this function's own scope
  console.log(`Order placed: ${item}`);  // side effect: writes to the console
  return orderCount;
}

placeOrder("Coffee");   // logs "Order placed: Coffee", returns 1
placeOrder("Coffee");   // logs "Order placed: Coffee", returns 2 — SAME input, DIFFERENT output
```

`placeOrder` is **impure** on two counts: it reads and mutates `orderCount`, a piece of state that lives outside the function entirely, and it produces a console side effect. Calling it twice with the identical argument `"Coffee"` produces two different return values (`1`, then `2`) — proof that its output depends on more than just its own input.

### Worked example — the pure equivalent

```js
function calculateOrderNumber(previousCount) {
  return previousCount + 1;   // touches only its own parameter, returns a value, nothing else
}

console.log(calculateOrderNumber(0));   // 1
console.log(calculateOrderNumber(0));   // 1 — SAME input, SAME output, every time
```

`calculateOrderNumber` is **pure**: it reads no outside variable, mutates nothing, produces no side effect, and given the same input it always produces the same output — regardless of how many times, or in what order, it's called. Whatever "current count" a caller needs tracked, they now own the responsibility of holding and updating it themselves (e.g. `orderCount = calculateOrderNumber(orderCount)`), rather than the function silently doing it behind their back.

### A second impure example — mutating a passed-in object

```js
function addDiscount(cart) {
  cart.total = cart.total * 0.9;   // mutates the CALLER's object directly — a side effect
  return cart.total;
}

const cart = { total: 100 };
addDiscount(cart);
console.log(cart.total);   // 90 — the original object changed, even though it was never reassigned
```

Because objects are passed by reference (file 3), `addDiscount` doesn't need to touch a global variable to be impure — mutating any object it was merely *handed* is still a side effect, since the caller's own copy of `cart` is now permanently changed.

### Comparison

| | Pure | Impure |
|---|---|---|
| Uses only its own params/locals | ✅ | ❌ (reads/mutates outside state) |
| Same input → same output, always | ✅ | Not guaranteed |
| Changes anything outside itself | ❌ Never | ✅ (the side effect) |
| Easy to test/reason about in isolation | ✅ | Harder — depends on external state |

Pure functions are preferred wherever the logic allows it — they're predictable, trivially testable, and safe to run in any order. But side effects (writing to a database, updating the DOM, logging, sending a network request) are also the entire *point* of most real programs — an application made of nothing but pure functions would never do anything observable. The practical goal isn't "eliminate impure functions," it's "keep the logic-heavy core of a program pure, and push side effects to clearly identified, deliberate edges."

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| Function declaration | `function name() {}` — hoisted with full body, callable before its line |
| Function expression | `const name = function () {}` — variable is hoisted (if `var`) but stays `undefined`/TDZ-locked until assignment runs |
| Arrow function | `const name = (params) => expr` — shortest syntax, no own `arguments` |
| One-param arrow | Parens optional: `x => x * 2` |
| Multi-statement arrow | Braces + explicit `return` required: `x => { return x * 2; }` |
| Default parameter | `function f(x = 10) {}` — fires only when the argument is `undefined` |
| Destructured parameter | `function f({ a, b }) {}` — unpacks an object argument directly in the signature |
| `arguments` object | Array-like, all call arguments, regular functions only — not real array, not in arrow functions |
| Rest parameters | `function f(...args) {}` — real array, works in arrow functions too |
| Higher-Order Function | Takes a function as a parameter, returns one, or both |
| Callback | The function handed in as an argument to a HOF |
| Pure function | Same input → same output, no side effects |
| Impure function | Reads/mutates state outside its own scope — has a side effect |

---

## 🎯 Key Takeaways

- Three ways to define a function — declaration, function expression, arrow function — are not interchangeable: declarations are hoisted with their full body (callable before their line), while function expressions only become callable once their assignment line actually runs, exactly following file 2's memory-phase/code-phase model.
- Arrow functions (`(params) => expr`), formally introduced in this file after file 5 withheld them, offer shorter syntax with implicit returns for single-expression bodies — but multi-statement bodies need braces *and* an explicit `return`.
- Every regular function gets an automatic `arguments` array-like object holding all call-time arguments; arrow functions never get their own — use rest parameters (`...args`) instead when an arrow function needs to inspect a variable number of arguments.
- A Higher-Order Function takes a function as an argument, returns one, or both — `forEach`/`map`/`filter`/`reduce` from file 5 are the concrete, everyday application of this pattern, with the passed-in function called a callback.
- A pure function computes only from its own inputs and produces no side effects, always returning the same output for the same input; an impure function reads or mutates state outside itself (a global, a referenced object, the console) — both are necessary in real programs, but pure logic is easier to test and reason about.

---

## 📚 Related Concepts to Explore Next

This file went deep on the three function-definition syntaxes introduced only briefly back in [05-Control-Flow-Loops.md](./05-Control-Flow-Loops.md) (which deliberately used `function`-keyword callbacks throughout and promised arrow functions here), and it leaned on the hoisting model from `02-Variables-Scope-Hoisting.md` to explain the declaration-vs-expression difference. The next file, [07-Closures-Currying-Real-World-Patterns.md](./07-Closures-Currying-Real-World-Patterns.md), picks up the informal closure glimpse from §6 (`makeMultiplier`) and covers the mechanism in full depth, along with currying, partial application, composition, debounce/throttle, memoization, and the IIFE/module pattern.

---

## 🔗 Resources

- [MDN — Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN — Arrow function expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN — The `arguments` object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)
- [MDN — Default parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)
