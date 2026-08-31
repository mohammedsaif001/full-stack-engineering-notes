# Advanced TypeScript: Utility Types, Conditional Types & Type Metaprogramming
## Part 8 of 8 — Built-in Utility Types, Conditional Types, Mapped Types & Template Literals

---

## 📌 Executive Summary

- **Utility Types**: Standard global helper types provided by TypeScript to transform and manipulate existing types without manual re-declaration.
- **Object Transformation Utilities**:
  - `Partial<T>`: Makes all properties optional.
  - `Required<T>`: Makes all properties required.
  - `Readonly<T>`: Makes all properties immutable.
  - `Pick<T, K>`: Extracts a subset of properties from `T`.
  - `Omit<T, K>`: Removes a subset of properties from `T`.
  - `Record<K, T>`: Constructs an object type with keys `K` and values `T`.
- **Union & Function Utilities**:
  - `Exclude<T, U>` / `Extract<T, U>`: Filters union members.
  - `NonNullable<T>`: Strips `null` and `undefined`.
  - `ReturnType<T>` / `Parameters<T>`: Extracts function signatures.
  - `Awaited<T>`: Unwraps nested `Promise` return types.
- **Type Metaprogramming**:
  - **Conditional Types**: `T extends U ? X : Y` (Ternary logic in type space).
  - **The `infer` Keyword**: Dynamically deduces and captures types inside conditional branches.
  - **Mapped Types**: Iterates over keys (`[K in keyof T]`) to construct new types.
  - **Template Literal Types**: String pattern interpolation in type space (e.g., `event_${Action}`).

---

## 🧠 Core Analogies

- **Utility Types as Photo Editing Tools**:
  - `Partial<T>` is turning down the opacity of all layers (makes them optional).
  - `Pick<T, K>` is the crop tool (keeps only the selected subject).
  - `Omit<T, K>` is the background eraser tool (removes unwanted objects).
  - `Readonly<T>` is laminating the final printed photograph (prevents any drawing/modifications).

---

## 🧰 1. Essential Built-in Utility Types Deep Dive

### 1. Object Mutation Utilities: `Partial`, `Required`, `Readonly`
```typescript
interface UserProfile {
  id: string;
  name: string;
  age?: number;
  email: string;
}

// 1. Partial<T> - All fields optional (Ideal for PATCH updates)
type UpdateUserDto = Partial<UserProfile>;
/*
{ id?: string; name?: string; age?: number; email?: string; }
*/

// 2. Required<T> - Removes all '?' modifiers
type CompleteUserProfile = Required<UserProfile>;
/*
{ id: string; name: string; age: number; email: string; }
*/

// 3. Readonly<T> - Adds 'readonly' to all fields
type ImmutableUser = Readonly<UserProfile>;
```

---

### 2. Property Selection Utilities: `Pick`, `Omit`, `Record`
```typescript
interface Article {
  id: string;
  title: string;
  content: string;
  authorId: string;
  views: number;
  createdAt: Date;
}

// 1. Pick<T, K> - Keep only specified keys
type ArticlePreview = Pick<Article, "id" | "title" | "views">;

// 2. Omit<T, K> - Exclude specified keys (Ideal for Insert DTOs)
type CreateArticleDto = Omit<Article, "id" | "createdAt" | "views">;

// 3. Record<K, T> - Key-value map definition
type FeatureFlags = Record<"darkMode" | "betaAccess" | "analytics", boolean>;
const userFlags: FeatureFlags = {
  darkMode: true,
  betaAccess: false,
  analytics: true,
};
```

---

### 3. Union & Value Filtering: `Exclude`, `Extract`, `NonNullable`
```typescript
type Status = "draft" | "review" | "published" | "archived" | "deleted";

// 1. Exclude<T, U> - Excludes from union
type ActiveStatus = Exclude<Status, "archived" | "deleted">; // "draft" | "review" | "published"

// 2. Extract<T, U> - Extracts common members
type InactiveStatus = Extract<Status, "archived" | "deleted" | "cancelled">; // "archived" | "deleted"

// 3. NonNullable<T> - Strips null and undefined
type RawValue = string | number | null | undefined;
type CleanValue = NonNullable<RawValue>; // string | number
```

---

### 4. Function & Promise Reflection: `ReturnType`, `Parameters`, `Awaited`
```typescript
async function fetchUserById(id: string, includeRoles: boolean) {
  return { id, name: "Saif", roles: ["admin", "editor"] };
}

// 1. Parameters<T> - Extracts parameters as a tuple
type FetchUserParams = Parameters<typeof fetchUserById>; // [id: string, includeRoles: boolean]

// 2. ReturnType<T> - Extracts the raw return type
type FetchUserRawReturn = ReturnType<typeof fetchUserById>; // Promise<{ id: string; name: string; roles: string[]; }>

// 3. Awaited<T> - Unwraps Promise to get resolved type
type FetchedUser = Awaited<ReturnType<typeof fetchUserById>>; // { id: string; name: string; roles: string[]; }
```

---

## 🔀 2. Conditional Types & The `infer` Keyword

Conditional types express type relationships using ternary expressions (`T extends U ? X : Y`):

```typescript
// IsTypeString<T> evaluates to boolean literal true or false
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<100>;     // false

// Flatten Array Type: Unwraps arrays or leaves single values alone
type Flatten<T> = T extends any[] ? T[number] : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number>;   // number
```

### Type Inference with `infer`
The `infer` keyword allows you to deduce and capture an inner type dynamically:

```typescript
// Custom UnpackPromise implementation using infer
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;

type ResolvedString = UnpackPromise<Promise<string>>; // string
type RegularNumber = UnpackPromise<number>;           // number

// Extract First Element of a Tuple
type FirstElement<T> = T extends [infer First, ...any[]] ? First : never;
type Item = FirstElement<[string, number, boolean]>; // string
```

---

## 🗺️ 3. Mapped Types & Key Remapping

Mapped types allow you to create new types by transforming each property in an existing type:

```typescript
interface SensorData {
  temperature: number;
  pressure: number;
  humidity: number;
}

// 1. Basic Mapped Type: Make all fields boolean flags
type SensorStatus = {
  [K in keyof SensorData]: boolean;
};
/*
{ temperature: boolean; pressure: boolean; humidity: boolean; }
*/

// 2. Key Remapping using 'as' & Template Literals (Getter generation)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type SensorGetters = Getters<SensorData>;
/*
{
  getTemperature: () => number;
  getPressure: () => number;
  getHumidity: () => number;
}
*/
```

---

## 🔤 4. Template Literal Types

Template literal types bring JavaScript template string interpolation into the type system:

```typescript
type HttpProtocol = "http" | "https";
type Environment = "dev" | "staging" | "prod";

// Generates all combinations: "http://dev.api" | "https://dev.api" | ...
type ApiUrl = `${HttpProtocol}://${Environment}.api.domain.com`;

// Event Handler Naming
type UIEvent = "click" | "hover" | "focus";
type EventHandlerName = `on${Capitalize<UIEvent>}`; // "onClick" | "onHover" | "onFocus"
```

---

## 🛡️ 5. Discriminated Unions & Exhaustiveness Checking

The gold standard for type-safe state machines and API results:

```typescript
interface LoadingState {
  status: "loading";
}

interface SuccessState {
  status: "success";
  data: string[];
}

interface ErrorState {
  status: "error";
  error: Error;
}

type QueryState = LoadingState | SuccessState | ErrorState;

function renderUI(state: QueryState) {
  switch (state.status) {
    case "loading":
      return "Loading spinner...";
    case "success":
      return `Loaded ${state.data.length} items`;
    case "error":
      return `Error: ${state.error.message}`;
    default:
      // Exhaustiveness check guarantees no unhandled state
      const _exhaustive: never = state;
      return _exhaustive;
  }
}
```

---

## 🎯 6. Summary & Quick Revision Checklist

- [ ] **Object Utilities**: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`.
- [ ] **Union Utilities**: `Exclude`, `Extract`, `NonNullable`.
- [ ] **Function Utilities**: `ReturnType`, `Parameters`, `Awaited`.
- [ ] **Conditional Types**: Use `T extends U ? X : Y` for type-level branching.
- [ ] **`infer` Keyword**: Extract inner types (e.g., unwrapping Promises or Array element types).
- [ ] **Mapped Types & Key Remapping**: Transform property keys with `[K in keyof T as NewKey]`.
- [ ] **Discriminated Unions**: Combine common literal discriminator tags with `never` for 100% bug-proof state machines.
