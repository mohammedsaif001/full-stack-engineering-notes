# TypeScript Interfaces: Object Shapes, Contracts & Inheritance
## Part 3 of 8 — Object Modeling, Interface Extensions & Interface vs Type

---

## 📌 Executive Summary

- **What is an Interface?**: A fundamental TypeScript construct used to define the **shape, contract, and structure** of objects, classes, and functions.
- **Key Modifiers**:
  - `readonly`: Prevents mutation of the property after initialization.
  - `?` (Optional): Indicates the property is optional (`Type | undefined`).
- **`interface` vs `type`**:
  - **`interface`**: Open for **Declaration Merging**, supports object inheritance via `extends`, and is optimized for OOP contracts and class implementations.
  - **`type`**: Closed/sealed; can represent unions (`|`), intersections (`&`), primitives, tuples, and mapped types.
- **Multiple Inheritance**: An interface can extend multiple interfaces simultaneously (`interface C extends A, B`).
- **Index Signatures**: Define dynamic key-value properties for dictionaries and maps (`[key: string]: number`).
- **Excess Property Checks**: TypeScript enforces strict checks when assigning object literals directly to interface types.

---

## 🧠 Core Analogies

- **Interface as a Legal Contract**:
  - If a company signs a standard contract (Interface), it guarantees it will provide specific deliverables (`id`, `name`, `execute()`). How the company executes those deliverables internally (class implementation) is up to them, but the output must fulfill the signed contract.
- **Declaration Merging as an Open Blueprint**:
  - An `interface` is like a shared blueprint on a construction table where any subcontractor can add an extra annotation (e.g. adding a new property to a global library interface).
  - A `type` alias is a laminated, sealed document — once created, nobody can alter its definition.

---

## 📐 1. Interface Syntax & Modifiers

```typescript
interface UserAccount {
  // 1. Readonly property (Cannot be modified after creation)
  readonly id: string;

  // 2. Standard required property
  name: string;
  email: string;

  // 3. Optional property (marked with ?)
  phoneNumber?: string;

  // 4. Method signature
  login(): boolean;
  updateEmail(newEmail: string): void;
}

const user: UserAccount = {
  id: "usr_101",
  name: "Saif",
  email: "saif@example.com",
  login() {
    return true;
  },
  updateEmail(newEmail) {
    this.email = newEmail;
  },
};

// user.id = "usr_999"; // ❌ Compile Error: Cannot assign to 'id' because it is a read-only property
user.name = "Mohammed Saif"; // ✅ Allowed
```

---

## ⚔️ 2. `interface` vs `type` (The Definitive Comparison)

Choosing between `interface` and `type` is one of the most critical decisions in TypeScript architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE vs TYPE ALIAS                  │
├──────────────────────────────┬──────────────────────────────┤
│          INTERFACE           │          TYPE ALIAS          │
├──────────────────────────────┼──────────────────────────────┤
│ ✅ Declaration Merging       │ ❌ No Declaration Merging    │
│ ✅ Clear `extends` syntax    │ ⚠️ Intersection via `&`      │
│ ✅ Best for OOP & Libraries  │ ✅ Best for Unions & Tuples  │
│ ❌ Cannot name Primitives    │ ✅ Can alias Primitives      │
│ ❌ Cannot model Unions directly│ ✅ Direct Union modeling   │
└──────────────────────────────┴──────────────────────────────┘
```

### 1. Declaration Merging (Interfaces ONLY)
When multiple interfaces with the same name are declared in the same scope, TypeScript automatically merges them into a single interface:

```typescript
// First declaration
interface Box {
  height: number;
  width: number;
}

// Second declaration (e.g., from an external plugin)
interface Box {
  depth: number;
}

// Resulting Box interface requires ALL 3 properties:
const myBox: Box = {
  height: 10,
  width: 20,
  depth: 30, // ✅ Required!
};
```
> [!NOTE]
> Declaration merging is essential when augmenting third-party library types (e.g. extending Express `Request` with `req.user`). `type` aliases will throw a `Duplicate identifier` error if repeated.

### 2. Unions & Primitives (Types ONLY)
```typescript
// ✅ Type aliases can represent unions, primitives, and tuples:
type Status = "draft" | "published" | "archived";
type PrimitiveAlias = string | number;
type Point = [x: number, y: number];

// ❌ Interfaces CANNOT represent standalone unions or primitives directly
```

---

## 🌳 3. Interface Inheritance (`extends`)

Interfaces can inherit properties from one or more parent interfaces using the `extends` keyword.

```typescript
// Base Interface
interface Identifiable {
  id: string;
}

interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

// Single Inheritance
interface Person extends Identifiable {
  name: string;
  email: string;
}

// Multiple Inheritance
interface Employee extends Person, Timestamped {
  salary: number;
  department: string;
}

const developer: Employee = {
  id: "emp_42",
  name: "Saif",
  email: "saif@company.com",
  salary: 120000,
  department: "Backend Engineering",
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

---

## 🗄️ 4. Index Signatures & Dynamic Keys

When the exact property names of an object are not known beforehand, you use an **Index Signature**:

```typescript
interface ErrorReport {
  timestamp: Date;
  // Dynamic dictionary of error messages by field name
  [fieldName: string]: string | Date;
}

const formErrors: ErrorReport = {
  timestamp: new Date(),
  email: "Invalid email format",
  password: "Password must be at least 8 characters",
  confirmPassword: "Passwords do not match",
};
```

### Index Signature vs `Record<string, T>`
```typescript
// Both achieve flexible string keys, but Record is more concise:
type StringDictionary = Record<string, string>;
```

---

## 🛡️ 5. Excess Property Checks

When assigning an object literal directly to a typed variable, TypeScript enforces **Excess Property Checks** to prevent typos:

```typescript
interface Car {
  make: string;
  model: string;
  year?: number;
}

// ❌ Compile Error: 'color' does not exist in type 'Car' (Excess property check catches typo)
const myCar: Car = {
  make: "Toyota",
  model: "Corolla",
  // color: "blue", 
};

// Workaround 1: Assigning via an intermediate variable bypasses excess property checks:
const carData = { make: "Toyota", model: "Corolla", color: "blue" };
const safeCar: Car = carData; // ✅ Allowed (structural typing compatibility)
```

---

## 🎯 6. Summary & Quick Revision Checklist

- [ ] **Interfaces**: The standard way to define object shapes and contracts in TypeScript.
- [ ] **`readonly` & `?`**: Use `readonly` for immutable fields (`id`) and `?` for optional fields.
- [ ] **`interface` vs `type`**: Use `interface` for public APIs, libraries, and class contracts; use `type` for unions, primitives, and complex computed types.
- [ ] **Declaration Merging**: Only interfaces can merge across multiple declarations.
- [ ] **Multiple Inheritance**: Use `interface C extends A, B` to compose rich domain models.
- [ ] **Index Signatures**: Use `[key: string]: Type` for dynamic key-value maps.
