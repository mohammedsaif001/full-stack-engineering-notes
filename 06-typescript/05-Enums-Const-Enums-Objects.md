# TypeScript Enums: Numeric, String, Const Enums & Modern Alternatives
## Part 5 of 8 — Discrete Constants, Reverse Mapping & the `as const` Pattern

---

## 📌 Executive Summary

- **What is an Enum?**: A TypeScript feature allowing developers to define a set of named constants (e.g., status codes, user roles, directions).
- **Numeric Enums**: Default behavior where members auto-increment starting from `0` (or a custom initial integer). Features bidirectional **Reverse Mapping**.
- **String Enums**: Each member is explicitly initialized with a string literal; deterministic, readable at runtime, but does not generate reverse mapping.
- **`const enum`**: Fully inlined at compile-time by replacing usages directly with literal values; generates zero runtime JavaScript object code.
- **The Modern Alternative (`as const` Objects)**: Many modern TypeScript codebases prefer plain `const` objects paired with `as const` and `typeof / keyof` over enums for better tree-shaking and runtime compatibility.

---

## 🧠 Core Analogies

- **Enum as a Traffic Light Controller**:
  - Instead of telling your code "stop when state is `0`" or "slow down when state is `1`" (magic numbers), you declare `TrafficLight.RED` and `TrafficLight.YELLOW`. The code reads like natural human language, eliminating arbitrary number bugs.
- **Regular Enum vs `const enum` as Physical Stamps vs Digital Print**:
  - **Regular Enum**: Carves a wooden rubber stamp object into the JavaScript runtime memory.
  - **`const enum`**: Directly prints the ink text (value) into each line of code and throws away the stamp before shipping.

---

## 🔢 1. Numeric Enums & Reverse Mapping

By default, enums assign numbers starting at index `0`:

```typescript
enum Direction {
  UP,    // 0
  DOWN,  // 1
  LEFT,  // 2
  RIGHT, // 3
}

const move: Direction = Direction.UP;
console.log(move); // Output: 0

// Custom Starting Index
enum StatusCode {
  OK = 200,
  CREATED,   // 201 (Auto-incremented)
  BAD_REQUEST = 400,
  UNAUTHORIZED, // 401
}
```

### Reverse Mapping (Numeric Enums ONLY)
TypeScript generates a dual-lookup JavaScript object for numeric enums:

```typescript
enum Status {
  PENDING = 1,
  SUCCESS = 2,
}

// 1. Forward Lookup: Name -> Value
console.log(Status.PENDING); // Output: 1

// 2. Reverse Lookup: Value -> Name
console.log(Status[1]);      // Output: "PENDING"
```

```javascript
// Generated JavaScript compiled code:
var Status;
(function (Status) {
    Status[Status["PENDING"] = 1] = "PENDING";
    Status[Status["SUCCESS"] = 2] = "SUCCESS";
})(Status || (Status = {}));
```

---

## 🔤 2. String Enums

In string enums, every member must be explicitly initialized with a string literal:

```typescript
enum UserRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

function assignRole(role: UserRole) {
  console.log(`Assigned role: ${role}`);
}

assignRole(UserRole.ADMIN); // ✅ Valid
// assignRole("ADMIN");     // ❌ Compile Error: Argument of type '"ADMIN"' is not assignable to parameter of type 'UserRole'
```

> [!NOTE]
> String enums are significantly easier to debug in logs and database payloads than numeric enums because the actual serialized value is a readable string (`"ADMIN"`) rather than a magic integer (`0`).

---

## ⚡ 3. `const enum` (Zero Runtime Overhead)

Regular enums create real JavaScript objects at runtime. To eliminate this runtime overhead, declare enums as `const enum`:

```typescript
const enum HttpMethod {
  GET = "GET",
  POST = "POST",
}

const currentMethod = HttpMethod.GET;
```

```javascript
// Compiled JavaScript output:
// Notice: No object is generated; the value is inlined directly!
const currentMethod = "GET" /* HttpMethod.GET */;
```

---

## 💎 4. The Modern Pattern: `as const` Objects + Key Queries

Modern TypeScript standards (and the TypeScript team themselves) often recommend using plain `as const` objects over `enum` because they tree-shake better and are native JavaScript:

```typescript
// 1. Declare runtime object frozen with `as const`
export const AppRoles = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

// 2. Derive TypeScript type automatically
export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];
// Equivalent to: type AppRole = "ADMIN" | "EDITOR" | "VIEWER"

// 3. Usage
function authorize(role: AppRole) {
  console.log("Authorized for:", role);
}

authorize(AppRoles.ADMIN); // ✅ Valid
authorize("ADMIN");        // ✅ Valid (Direct string literals are accepted!)
```

### Enums vs `as const` Object Comparison
| Dimension | TypeScript `enum` | `const Object as const` |
|---|---|---|
| **Runtime JS Output** | Generates IIFE object wrapper | Standard plain JS object |
| **Direct String Acceptance** | ❌ Rejects plain string literal | ✅ Accepts matching string literals |
| **Tree-Shaking Efficiency** | ⚠️ Can be difficult for bundlers | ✅ Flawlessly tree-shaken |
| **Reverse Mapping** | ✅ Available for numeric enums | ❌ Not available (rarely needed) |

---

## 🎯 5. Summary & Quick Revision Checklist

- [ ] **Numeric Enums**: Auto-increment starting at 0; supports bidirectional reverse mapping (`Enum[0] === "NAME"`).
- [ ] **String Enums**: Readable, explicit, but no reverse mapping.
- [ ] **`const enum`**: Inlined at compile-time to save memory and bundle size.
- [ ] **`as const` Pattern**: The industry standard alternative to enums for modern, bundler-friendly TypeScript projects.
