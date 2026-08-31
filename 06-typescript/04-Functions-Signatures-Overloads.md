# TypeScript Functions: Signatures, Overloads & Execution Context
## Part 4 of 8 — Parameter Typing, Return Types & Function Overloading

---

## 📌 Executive Summary

- **Function Annotations**: TypeScript allows strict type enforcement on parameters, return values, default parameters, and rest arguments.
- **Function Type Expressions**: Reusable type definitions for callbacks and functions (`(a: number, b: number) => number`).
- **Return Type Nuances**:
  - `void`: Function returns nothing (or returns `undefined` implicitly).
  - `never`: Function never finishes or always throws an exception.
  - `undefined`: Function explicitly returns the `undefined` primitive.
- **Function Overloading**: Declaring multiple function signatures for different argument combinations backed by a single flexible implementation.
- **`this` Parameter Typing**: Explicitly annotating the type of `this` inside functions to prevent runtime scope errors.
- **Async Functions**: Asynchronous functions always return a `Promise<T>` type.

---

## 🧠 Core Analogies

- **Function Overloading as a Multi-Function Universal Remote**:
  - The remote has distinct dedicated buttons for "TV Mode", "Audio Mode", and "Projector Mode" (Overload Signatures).
  - Inside the remote, there is only one microchip processing the infrared signals based on whichever button was pressed (Single Implementation Signature).
- **`void` vs `never` as Meeting Room Outcomes**:
  - **`void`**: The meeting ended smoothly; people left the room and walked out into the hall.
  - **`never`**: A sudden earthquake hit and the building collapsed — nobody ever leaves the room.

---

## ✍️ 1. Function Parameter & Return Annotations

```typescript
// 1. Basic Parameter and Return Types
function calculateTotal(subtotal: number, taxRate: number): number {
  return subtotal + subtotal * taxRate;
}

// 2. Optional Parameters (Must come AFTER required parameters)
function buildGreeting(name: string, title?: string): string {
  if (title) {
    return `Hello, ${title} ${name}!`;
  }
  return `Hello, ${name}!`;
}

// 3. Default Parameters
function createConnection(host: string, port: number = 5432, timeoutMs: number = 3000): string {
  return `Connected to ${host}:${port} (Timeout: ${timeoutMs}ms)`;
}

// 4. Rest Parameters (Typed as arrays)
function sumAllNumbers(...numbers: number[]): number {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}
```

---

## 📜 2. Function Type Aliases & Call Signatures

You can define reusable type signatures for functions and callbacks:

```typescript
// Function Type Expression
type MathOperation = (x: number, y: number) => number;

const add: MathOperation = (x, y) => x + y;
const multiply: MathOperation = (x, y) => x * y;

// Function Call Signature inside Interface
interface FormValidator {
  (value: string): boolean;
  validationRuleName: string; // Interface can attach static properties to the function!
}
```

---

## ⚡ 3. Function Overloading

Function overloads allow you to support different argument types and return different result types depending on what was passed.

### Rules of Function Overloads:
1. Write one or more **Overload Signatures** (visible to callers).
2. Write one **Implementation Signature** (contains actual code; not directly visible to callers).
3. The implementation signature must be compatible with all overload signatures.

```typescript
// 1. Overload Signature 1: Takes string, returns Date object
function parseDate(timestamp: string): Date;

// 2. Overload Signature 2: Takes year, month, day numbers, returns Date object
function parseDate(year: number, month: number, day: number): Date;

// 3. Implementation Signature (Handles all overloads)
function parseDate(yearOrTimestamp: string | number, month?: number, day?: number): Date {
  if (typeof yearOrTimestamp === "string") {
    return new Date(yearOrTimestamp);
  }
  if (month !== undefined && day !== undefined) {
    return new Date(yearOrTimestamp, month - 1, day);
  }
  throw new Error("Invalid arguments provided to parseDate");
}

// Caller Usage:
const d1 = parseDate("2026-08-31");    // ✅ Valid (Matched Overload 1)
const d2 = parseDate(2026, 8, 31);     // ✅ Valid (Matched Overload 2)
// const d3 = parseDate(2026, 8);      // ❌ Compile Error: No overload matches 2 arguments
```

---

## 🎯 4. Typing `this` Inside Functions

In JavaScript, `this` changes dynamically based on how a function is called. TypeScript lets you declare an explicit `this` parameter (which is stripped away at compile-time and does not affect runtime arguments).

```typescript
interface ButtonElement {
  id: string;
  onClick: (this: ButtonElement) => void;
}

const submitBtn: ButtonElement = {
  id: "btn_submit",
  onClick(this: ButtonElement) {
    console.log("Button clicked:", this.id); // TypeScript knows 'this' is ButtonElement!
  },
};
```

---

## ⏳ 5. Async Functions & Promises

Asynchronous functions always return a generic `Promise<T>`:

```typescript
interface UserData {
  id: string;
  username: string;
}

// Explicit Promise return type annotation
async function fetchUserProfile(userId: string): Promise<UserData> {
  const response = await fetch(`/api/users/${userId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user with id: ${userId}`);
  }
  
  const data: UserData = await response.json();
  return data;
}
```

---

## 🎯 6. Summary & Quick Revision Checklist

- [ ] **Parameters**: Explicitly annotate parameters; optional parameters (`?`) must follow required ones.
- [ ] **Rest Parameters**: Type rest parameters as arrays (`...args: string[]`).
- [ ] **Function Overloads**: Define discrete public overload signatures above a single generic implementation.
- [ ] **`void` vs `never`**: `void` for functions returning nothing; `never` for functions throwing errors.
- [ ] **`this` Parameter**: Place `this: Type` as the first dummy parameter to type-check `this` context.
- [ ] **Async Functions**: Always annotate async return types as `Promise<T>`.
