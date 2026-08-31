# TypeScript Foundations: Primitives, Type System & Core Mechanics
## Part 1 of 8 — Language Primitives, Special Types & Type Inference

---

## 📌 Executive Summary

- **What is TypeScript?**: A strongly typed, statically analyzed superset of JavaScript developed by Microsoft that compiles ("transpiles") into pure, standard JavaScript.
- **The Core Problem Solved**: JavaScript is dynamically and loosely typed; type errors and unexpected coercions (e.g., `[] + {}`, `null.property`) only crash at runtime. TypeScript identifies errors at compile-time directly in the editor.
- **Static vs Dynamic Typing**: In TypeScript, types are checked *before* code execution (`tsc`). In JavaScript, types are evaluated dynamically while executing on the CPU.
- **Primitives**: `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`.
- **Special System Types**:
  - `any`: Disables all type checking (unsafe escape hatch).
  - `unknown`: Type-safe counterpart to `any`; requires type narrowing or assertions before use.
  - `never`: Represents values that never occur (e.g., functions that always throw or infinite loops; exhaustive checks).
  - `void`: Represents the absence of a return value in functions.
- **Type Inference**: TypeScript automatically deduces types when variables are initialized without explicit annotations.

---

## 🧠 Core Analogies

- **JavaScript vs TypeScript as Electrician Work**:
  - **JavaScript**: Working on live electrical wires in the dark without a circuit breaker or multimeter. If a wire is crossed, you only find out when sparks fly and the power cuts out (runtime crash).
  - **TypeScript**: Working from a detailed, color-coded schematic blueprint with an automated circuit tester before turning on the main power supply. If you attempt to connect a high-voltage wire to a ground slot, the tester beeps and halts installation immediately (compile-time error).
- **`any` vs `unknown` as Packages at Security**:
  - **`any`**: A package marked "VIP - Bypass Inspection". Security lets it pass without opening it, even if it contains dangerous explosives.
  - **`unknown`**: An unmarked mystery package. Security accepts it at the loading dock, but forbids anyone from opening or using its contents until it is thoroughly X-rayed and verified (type narrowing).

---

## 🏛️ 1. JavaScript vs TypeScript Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                       TYPESCRIPT (.ts)                      │
│   • Static Type System & Annotations                        │
│   • Interfaces, Generics, Enums, Type Aliases               │
│   • IDE Autocomplete, Inline Docs, Refactoring              │
│   • Compile-Time Validation (`tsc`)                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼  Transpilation (Strips Types)
┌─────────────────────────────────────────────────────────────┐
│                        JAVASCRIPT (.js)                     │
│   • Dynamic & Loose Typing (Evaluated on CPU)               │
│   • Runs on Browsers, Node.js, Bun, Deno                    │
└─────────────────────────────────────────────────────────────┘
```

| Feature | JavaScript (Vanilla) | TypeScript |
|---|---|---|
| **Type Checking** | Dynamic (Runtime only) | Static (Compile-time) |
| **Typing Discipline** | Loose (Automatic coercion) | Strong & Explicit |
| **Error Detection** | When that line executes in production | Instantly inside IDE / build step |
| **Tooling & DX** | Basic autocomplete | Deep intellisense, auto-imports, refactoring |
| **Runtime Overhead** | Zero | **Zero** (All types erased after build) |

---

## 🧱 2. Primitive Data Types

TypeScript provides explicit type annotations for all standard JavaScript primitives.

```typescript
// 1. String
const username: string = "Mohammed Saif";
const greeting: string = `Hello, ${username}!`;

// 2. Number (Handles integers, floats, binary, hex, NaN, Infinity)
const count: number = 42;
const price: number = 99.99;
const hex: number = 0xff;
const binary: number = 0b1010;

// 3. Boolean
const isActive: boolean = true;
const hasPermission: boolean = false;

// 4. Null & Undefined
const emptyValue: null = null;
const notAssigned: undefined = undefined;

// 5. Symbol (Unique and immutable primitive)
const uniqueId: symbol = Symbol("user_id");

// 6. BigInt (Large integers beyond 2^53 - 1)
const largeNumber: bigint = 9007199254740991n;
```

---

## ⚠️ 3. The Special Types: `any`, `unknown`, `never`, and `void`

Understanding the hierarchy of TypeScript's special types is essential for building robust applications.

```
                  ┌───────────────┐
                  │    unknown    │  (Top Type - Safe)
                  └───────┬───────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
    ┌───────────┐                   ┌───────────┐
    │  string   │   ... primitives  │  number   │
    └─────┬─────┘                   └─────┬─────┘
          │                               │
          └───────────────┬───────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │     never     │  (Bottom Type - Empty)
                  └───────────────┘

    ┌───────────────────────────────────────────┐
    │  any (Bypasses the entire type hierarchy) │
    └───────────────────────────────────────────┘
```

### 1. `any` — The Unsafe Escape Hatch
Disables all type-checking rules. Assigning to or from `any` treats the value as if TypeScript does not exist.

```typescript
let riskyValue: any = "Hello";
riskyValue = 42;             // Allowed
riskyValue.nonExistent();    // Compiles without error, but CRASHES at runtime!
```
> [!CAUTION]
> Avoid `any` in production codebases. It defeats the entire purpose of TypeScript.

### 2. `unknown` — The Type-Safe `any`
`unknown` represents a value whose type is not yet known (e.g., external API payload). You **cannot** access properties, call methods, or assign `unknown` to other typed variables without first verifying its type via **Type Narrowing**.

```typescript
let userInput: unknown = "Hello World";

// ❌ Compile Error: 'userInput' is of type 'unknown'
// console.log(userInput.toUpperCase());

// ✅ Safe: Narrow type first using typeof
if (typeof userInput === "string") {
  console.log(userInput.toUpperCase()); // TypeScript knows it's a string here!
}
```

### 3. `never` — The Bottom Type (Impossible State)
Represents values that will **never occur**. Common in functions that never return (always throw errors or have infinite loops) and in **exhaustive type checks**.

```typescript
// 1. Function that never returns normally
function throwFatalError(message: string): never {
  throw new Error(`Fatal Crash: ${message}`);
}

// 2. Exhaustive Type Checking in switch statements
type Role = "ADMIN" | "USER";

function getPermissions(role: Role) {
  switch (role) {
    case "ADMIN":
      return ["read", "write", "delete"];
    case "USER":
      return ["read"];
    default:
      // If a new role (e.g., 'MODERATOR') is added to Role,
      // TypeScript will raise a compile error here!
      const _exhaustiveCheck: never = role;
      return _exhaustiveCheck;
  }
}
```

### 4. `void` — Absence of a Return Value
Used as the return type of functions that do not return a value (or return `undefined`).

```typescript
function logSystemEvent(event: string): void {
  console.log(`[EVENT]: ${event}`);
  // No return statement
}
```

---

## 🎯 4. Type Inference vs Explicit Type Annotations

TypeScript is smart. If you initialize a variable with a value, TypeScript automatically infers its type.

```typescript
// Explicit Annotation (Clear intent, useful when uninitialized)
let userAge: number;
userAge = 28;

// Type Inference (Cleaner, idiomatic code)
let website = "https://example.com"; // Inferred as 'string'
// website = 123; // ❌ Compile Error: Type 'number' is not assignable to type 'string'
```

### `const` vs `let` Type Inference (Literal Widening)
```typescript
let channel = "YouTube"; // Inferred type: string (can change to any other string)
const platform = "Node"; // Inferred type: "Node" (Literal type: can NEVER change!)
```

---

## 🗃️ 5. Arrays and Tuples

### 1. Typed Arrays
```typescript
// Syntax 1: Type[] (Preferred & idiomatic)
const scores: number[] = [95, 88, 100, 74];
const techStack: string[] = ["TypeScript", "Node.js", "PostgreSQL"];

// Syntax 2: Array<Type> (Generic syntax)
const userIds: Array<string> = ["usr_1", "usr_2", "usr_3"];

// Readonly Arrays (Immutable list)
const immutableRoles: readonly string[] = ["viewer", "editor", "admin"];
// immutableRoles.push("owner"); // ❌ Compile Error: Property 'push' does not exist on readonly array
```

### 2. Tuples (Fixed-Length & Fixed-Type Arrays)
A Tuple is an array with a predefined number of elements where each position has a specific type.

```typescript
// Format: [status_code, status_message]
let httpStatus: [number, string] = [200, "OK"];

httpStatus = [404, "Not Found"]; // ✅ Valid
// httpStatus = ["Not Found", 404]; // ❌ Compile Error: Type order mismatch
// httpStatus = [200, "OK", true];  // ❌ Compile Error: Source has 3 elements, target allows 2

// Named Tuples (Enhances code documentation & readability)
type Coordinate = [latitude: number, longitude: number];
const officeLocation: Coordinate = [12.9716, 77.5946];
```

---

## 🔀 6. Type Assertions & Non-Null Assertions

### 1. Type Assertions (`as Type`)
When you know more specific type information than TypeScript can infer (e.g., DOM elements, parsed payloads).

```typescript
// Tells TypeScript: "Trust me, this element is an HTMLInputElement"
const inputElement = document.getElementById("email-input") as HTMLInputElement;
console.log(inputElement.value);
```

> [!WARNING]
> Type assertions do **not** perform runtime casting or data conversion. They purely tell the compiler to assume a specific type.

### 2. Non-Null Assertion Operator (`!`)
Asserts that an expression is neither `null` nor `undefined`.

```typescript
function findUser(id: string): string | undefined {
  return id === "1" ? "Alice" : undefined;
}

// The '!' tells compiler: "I guarantee this will not be undefined"
const activeUser = findUser("1")!;
console.log(activeUser.toUpperCase());
```

---

## 🎯 7. Summary & Quick Revision Checklist

- [ ] **Static vs Dynamic**: TypeScript catches bugs at compile-time; types are erased during compilation to JavaScript.
- [ ] **Primitives**: `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`.
- [ ] **`any` vs `unknown`**: Never use `any` when `unknown` with type narrowing (`typeof`, `instanceof`) provides full type safety.
- [ ] **`never`**: Use `never` for exhaustive `switch` checks and functions that always throw.
- [ ] **Tuples**: Use fixed-length tuples `[number, string]` for structured pair/triplet returns.
- [ ] **Type Assertions**: Use `as SpecificType` only when domain knowledge exceeds compiler inference.
