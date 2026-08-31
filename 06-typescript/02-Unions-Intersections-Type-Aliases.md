# TypeScript Type Composition: Unions, Intersections & Type Aliases
## Part 2 of 8 — Advanced Type Modeling, Narrowing & Type Queries

---

## 📌 Executive Summary

- **Union Types (`|`)**: Represent a value that can be **one of several types** (Logical OR). E.g., `string | number`.
- **Intersection Types (`&`)**: Combine **multiple types into one** containing all properties of all constituents (Logical AND). E.g., `User & AdminPrivileges`.
- **Type Aliases (`type`)**: Create a custom, reusable name for any type signature (objects, unions, primitives, tuples, functions).
- **Literal Types**: Restrict a variable to exact discrete values (e.g., `"GET" | "POST" | "DELETE"`).
- **Type Narrowing**: Refining a broad union type into a specific concrete type using runtime checks (`typeof`, `instanceof`, `in`, equality).
- **Type Queries**:
  - `keyof`: Generates a union of an object's keys (`"id" | "name" | "email"`).
  - `typeof`: Extracts the TypeScript type of an existing runtime JavaScript variable or object.
  - Indexed Access Types (`T[K]`): Looks up the type of a specific property from another type.

---

## 🧠 Core Analogies

- **Union (`|`) vs Intersection (`&`) as Job Descriptions**:
  - **Union (`Doctor | Pilot`)**: A person who is *either* a certified Doctor *or* a certified Pilot. When interacting with them, you can only assume skills common to both human beings (shared properties).
  - **Intersection (`Doctor & Pilot`)**: A superhuman individual who is *both* a fully qualified Doctor *and* a licensed commercial Pilot. They possess every single medical skill and every single aviation skill combined.
- **`keyof` as a Restaurant Menu Index**:
  - If the restaurant menu object is `{ pizza: "$12", burger: "$8", pasta: "$14" }`, then `keyof Menu` is the printed list of available item names: `"pizza" | "burger" | "pasta"`.

---

## 🔀 1. Union Types (`A | B`)

A Union type represents a value that can be **any one** of the specified member types.

```typescript
// 1. Primitive Unions
type ID = string | number;

function printId(id: ID) {
  console.log(`Resource ID: ${id}`);
}

printId(101);          // ✅ Valid
printId("usr_98a7c");  // ✅ Valid
// printId(true);      // ❌ Compile Error: Type 'boolean' is not assignable to type 'string | number'

// 2. Union of Complex Objects
interface EmailNotification {
  type: "email";
  address: string;
  subject: string;
}

interface SMSNotification {
  type: "sms";
  phoneNumber: string;
}

type NotificationChannel = EmailNotification | SMSNotification;
```

---

## 🧩 2. Intersection Types (`A & B`)

An Intersection type combines multiple type definitions into a single unified type containing **all** fields from every member.

```typescript
interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// Combines UserProfile + Timestamps
type PersistedUser = UserProfile & Timestamps;

const activeUser: PersistedUser = {
  id: "usr_100",
  name: "Saif",
  email: "saif@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Intersection Conflicts
If two intersected types have identical property keys with incompatible types, the resulting property type becomes `never`:

```typescript
type Conflicted = { id: string } & { id: number };
// Conflicted.id is of type 'string & number' => which evaluates to 'never'
```

---

## 🏷️ 3. Literal Types & Domain Modeling

Literal types allow you to specify exact discrete values rather than broad primitive categories.

```typescript
// 1. String Literal Unions (Restricts values to allowed API verbs)
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function makeRequest(url: string, method: HttpMethod) {
  console.log(`Sending ${method} request to ${url}`);
}

makeRequest("/api/users", "POST"); // ✅ Valid
// makeRequest("/api/users", "OPTIONS"); // ❌ Compile Error: Argument of type '"OPTIONS"' is not assignable to parameter of type 'HttpMethod'

// 2. Numeric Literal Types
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

// 3. Boolean Literal Types
type StrictTrue = true;
```

---

## 🔍 4. Type Narrowing Guards

When handling union types, TypeScript requires you to "narrow" the broad union into a specific subtype before accessing member-specific properties.

```
                  ┌──────────────────────────────┐
                  │    Value: string | number    │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │       typeof value === ?      │
                 └───────┬───────────────┬───────┘
                         │               │
                 "string"│               │"number"
                         ▼               ▼
                 ┌──────────────┐ ┌──────────────┐
                 │    string    │ │    number    │
                 │ value.trim() │ │ value.toFixed│
                 └──────────────┘ └──────────────┘
```

### 1. `typeof` Guard (Primitives)
```typescript
function formatPrice(price: number | string): string {
  if (typeof price === "number") {
    return `$${price.toFixed(2)}`; // TypeScript knows price is number
  }
  return `$${parseFloat(price).toFixed(2)}`; // TypeScript knows price is string
}
```

### 2. `instanceof` Guard (Class Instances & Dates)
```typescript
function formatInputDate(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString(); // TypeScript knows date is Date instance
  }
  return new Date(date).toISOString(); // TypeScript knows date is string
}
```

### 3. `in` Operator Guard (Object Property Existence)
```typescript
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function moveAnimal(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim(); // Narrowed to Fish
  } else {
    animal.fly();  // Narrowed to Bird
  }
}
```

### 4. Custom Type Predicate (`val is Type`)
```typescript
interface AdminUser {
  role: "admin";
  permissions: string[];
}

function isAdmin(user: any): user is AdminUser {
  return user && user.role === "admin" && Array.isArray(user.permissions);
}

function handleAuth(user: unknown) {
  if (isAdmin(user)) {
    console.log(user.permissions); // user is typed as AdminUser!
  }
}
```

---

## 🔑 5. Type Queries: `keyof`, `typeof`, & Indexed Access

### 1. `keyof` Operator (Key Unions)
Extracts all property keys of an object type as a string/numeric literal union.

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

// ProductKeys = "id" | "name" | "price" | "inStock"
type ProductKeys = keyof Product;

const key: ProductKeys = "price"; // ✅ Valid
// const invalidKey: ProductKeys = "discount"; // ❌ Compile Error
```

### 2. `typeof` in Type Positions
Captures the static TypeScript type of a runtime JavaScript variable or object.

```typescript
const appConfig = {
  apiEndpoint: "https://api.v2.domain.com",
  timeoutMs: 5000,
  retryCount: 3,
  debugMode: true,
};

// Generates type directly from existing configuration object
type AppConfig = typeof appConfig;
/*
Equivalent to:
type AppConfig = {
  apiEndpoint: string;
  timeoutMs: number;
  retryCount: number;
  debugMode: boolean;
}
*/
```

### 3. Indexed Access Types (`T[K]`)
Access the type of a specific property from another type.

```typescript
interface DatabaseUser {
  id: string;
  profile: {
    avatarUrl: string;
    bio: string;
  };
  auth: {
    twoFactorEnabled: boolean;
  };
}

// Extract nested types without redefining them
type UserProfileType = DatabaseUser["profile"]; // { avatarUrl: string; bio: string; }
type TwoFactorStatus = DatabaseUser["auth"]["twoFactorEnabled"]; // boolean
```

---

## 🎯 6. Summary & Quick Revision Checklist

- [ ] **Unions (`|`)**: Value can be any one member type; access only shared members without narrowing.
- [ ] **Intersections (`&`)**: Combines properties from all constituents into a unified contract.
- [ ] **Literal Types**: Restrict parameters and properties to specific discrete strings, numbers, or booleans.
- [ ] **Type Narrowing**: Refine unions using `typeof`, `instanceof`, `in`, equality, and custom type predicates (`arg is Type`).
- [ ] **`keyof`**: Extract object keys as a union of string literals.
- [ ] **`typeof`**: Extract static types from existing runtime JavaScript objects.
- [ ] **Indexed Access (`T[K]`)**: Retrieve property types from complex objects.
