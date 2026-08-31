# TypeScript Generics: Constraints, Default Types & Reusable Components
## Part 7 of 8 — Parametric Polymorphism, Generic Data Structures & Key Constraints

---

## 📌 Executive Summary

- **What are Generics?**: The ability to write functions, classes, and interfaces that work over a **variety of types** rather than a single concrete type, while maintaining complete compile-time type safety.
- **The Core Value**: Avoids code duplication and avoids resorting to `any`.
- **Type Parameters**: Declared inside angle brackets (`<T>`, `<K, V>`).
- **Generic Constraints (`extends`)**: Restricting the allowable types for a generic parameter (e.g., `<T extends { id: string }>`).
- **`keyof` Constraints**: Ensuring a generic key exists on a generic object (`<T, K extends keyof T>`).
- **Default Generic Types**: Providing a fallback type if one is not explicitly specified (`<T = string>`).

---

## 🧠 Core Analogies

- **Generics as Universal Shipping Containers**:
  - A standardized shipping container can transport cars, electronics, or grain without redesigning the cargo ship. The ship (generic class/function) handles transport mechanics, while the contents (generic parameter `T`) remain distinct and typed.
- **Generic Constraints (`extends`) as Container Weight Limits**:
  - The container can hold any goods (`T`), as long as the goods have a valid customs barcode label (`T extends BarcodedItem`).

---

## ⚙️ 1. Generic Functions

```typescript
// 1. Without Generics: Loses type information with 'any'
function badIdentity(arg: any): any {
  return arg;
}

// 2. With Generics: Preserves exact input type
function identity<T>(arg: T): T {
  return arg;
}

const strOutput = identity("Hello World"); // Type inferred as: string
const numOutput = identity(42);            // Type inferred as: number

// 3. Multi-Parameter Generics
function makePair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const pair = makePair("User", 101); // Inferred as: [string, number]
```

---

## 📦 2. Generic Interfaces & Type Aliases

Generics are the industry standard for modeling API responses, pagination wrappers, and result monads:

```typescript
// Standard API Envelope Interface
interface ApiResponse<TData> {
  statusCode: number;
  success: boolean;
  message: string;
  data: TData;
}

// User Domain Model
interface User {
  id: string;
  name: string;
}

// Product Domain Model
interface Product {
  sku: string;
  price: number;
}

// Concrete Usage
const userResponse: ApiResponse<User> = {
  statusCode: 200,
  success: true,
  message: "User fetched",
  data: { id: "1", name: "Saif" },
};

const productResponse: ApiResponse<Product[]> = {
  statusCode: 200,
  success: true,
  message: "Products fetched",
  data: [{ sku: "SKU-99", price: 49.99 }],
};
```

---

## 🗄️ 3. Generic Classes

```typescript
class InMemoryCache<TKey, TValue> {
  private _store = new Map<TKey, TValue>();

  public set(key: TKey, value: TValue): void {
    this._store.set(key, value);
  }

  public get(key: TKey): TValue | undefined {
    return this._store.get(key);
  }

  public has(key: TKey): boolean {
    return this._store.has(key);
  }
}

// Instantiating with specific types
const sessionCache = new InMemoryCache<string, { token: string; expiresAt: number }>();
sessionCache.set("sess_1", { token: "abc", expiresAt: 1700000000 });
```

---

## 🔒 4. Generic Constraints (`extends`)

Sometimes you need to guarantee that a generic parameter possesses certain properties (e.g., has a `.length` property or an `.id` field):

```typescript
interface HasLength {
  length: number;
}

// Restrict T to types that have a .length property
function logLength<T extends HasLength>(item: T): T {
  console.log(`Length is: ${item.length}`);
  return item;
}

logLength("Hello String");   // ✅ Valid (strings have .length)
logLength([1, 2, 3, 4]);     // ✅ Valid (arrays have .length)
logLength({ length: 10 });   // ✅ Valid
// logLength(42);            // ❌ Compile Error: 'number' does not satisfy constraint 'HasLength'
```

---

## 🔑 5. The `keyof` Generic Constraint Pattern

A crucial pattern in backend libraries is ensuring that property lookups are 100% type-safe:

```typescript
// K is strictly constrained to the keys of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const developer = {
  name: "Saif",
  age: 26,
  role: "Backend Engineer",
};

const devName = getProperty(developer, "name"); // Type: string
const devAge = getProperty(developer, "age");   // Type: number
// getProperty(developer, "salary");            // ❌ Compile Error: Argument of type '"salary"' is not assignable to parameter of type '"name" | "age" | "role"'
```

---

## 🎨 6. Default Generic Types

You can provide fallback types for generic parameters:

```typescript
// Default TData to unknown if not specified
interface RequestOptions<TData = unknown> {
  headers?: Record<string, string>;
  body?: TData;
}

const defaultOptions: RequestOptions = {
  headers: { "Content-Type": "application/json" },
  // body is typed as 'unknown'
};

const typedOptions: RequestOptions<{ search: string }> = {
  body: { search: "TypeScript Generics" }, // body is typed as { search: string }
};
```

---

## 🎯 7. Summary & Quick Revision Checklist

- [ ] **Generics (`<T>`)**: Create type-safe reusable logic without sacrificing strict compiler validation.
- [ ] **Generic Interfaces**: Standardize domain envelopes (e.g. `ApiResponse<T>`).
- [ ] **Generic Constraints (`<T extends Constraint>`)**: Enforce that a generic type adheres to minimum required shape properties.
- [ ] **Keyof Constraints (`<T, K extends keyof T>`)**: Build type-safe object accessor utilities.
- [ ] **Default Generics (`<T = Fallback>`)**: Provide sensible defaults for optional generic arguments.
