# Zod Foundations: Parsing vs SafeParsing

## Part 1 of 6 — Execution Methods, Type Safety & Parsing Mechanics

---

## 📌 Executive Summary

- **What is Zod?**: A TypeScript-first schema validation library that allows you to define a single schema and automatically derive both runtime validation logic and static TypeScript types (`z.infer<typeof schema>`).
- **Core Design Goal**: Eliminate the duplication between TypeScript types (which vanish at runtime) and runtime input validation (which checks untrusted data from network requests, DB queries, or user forms).
- **The 4 Primary Parsing Methods**:
  1. `schema.parse(data)`: Validates synchronously. Returns parsed data on success; **throws a `ZodError` exception on failure**.
  2. `schema.safeParse(data)`: Validates synchronously. Returns a **discriminated union result object** (`{ success: true; data }` or `{ success: false; error }`). **Never throws!**
  3. `schema.parseAsync(data)`: Validates asynchronously (required if schema contains async `.refine()` or `.transform()` rules). Returns a Promise resolving to data or **rejects with `ZodError`**.
  4. `schema.safeParseAsync(data)`: Validates asynchronously. Returns a Promise resolving to a **discriminated union result object**. **Never rejects!**
- **Golden Rule for Backend APIs**: Prefer `safeParse` / `safeParseAsync` inside HTTP controllers and middleware to avoid uncaught exception overhead and maintain control flow without `try/catch` clutter.

---

## 🧠 Core Analogies

- **`parse` vs `safeParse` as Airport Security vs Medical Triage**:
  - **`schema.parse()` (Airport Security Alarm)**: If any illegal item is found, an alarm blares, security guards tackle the passenger, and the entire processing line halts immediately (throws an Exception). You must wrap the entire area in a crash dome (`try/catch`) to contain it.
  - **`schema.safeParse()` (Medical Triage Desk)**: The nurse inspects the patient and places a colored tag on their wrist (`success: true` green tag or `success: false` red tag detailing all ailments). Processing continues smoothly without stopping the hospital workflow; you simply inspect the tag (`result.success`).

---

## 🏛️ 1. Zod Parsing Execution Matrix

```
                      ┌─────────────────────────────────────────┐
                      │             UNTRUSTED INPUT             │
                      │  (req.body, req.query, process.env)     │
                      └────────────────────┬────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
             Sync Validation                       Async Validation
         (Standard Rules)                      (DB Lookup / API Fetch)
             │                                         │
     ┌───────┴───────┐                         ┌───────┴───────┐
     │               │                         │               │
  Throwing      Non-Throwing                Throwing      Non-Throwing
┌────┴────┐    ┌─────┴─────┐             ┌────┴────┐    ┌─────┴─────┐
│  parse  │    │ safeParse │             │parseAsync│   │safeParseAsync│
└─────────┘    └───────────┘             └─────────┘    └───────────┘
Throws Error   Returns Result            Rejects Error  Returns Result
```

| Method | Execution | On Success | On Failure | Best Used In |
|---|---|---|---|---|
| `parse(data)` | Synchronous | Returns validated data `T` | **Throws `ZodError`** | Internal utility functions, script initialization, config assertions |
| `safeParse(data)` | Synchronous | `{ success: true, data: T }` | `{ success: false, error: ZodError }` | Express controllers, form handlers, API response guards |
| `parseAsync(data)` | Asynchronous (Promise) | Resolves with data `T` | **Rejects Promise with `ZodError`** | Async pipelines where exceptions are handled at outer boundary |
| `safeParseAsync(data)` | Asynchronous (Promise) | Resolves `{ success: true, data: T }` | Resolves `{ success: false, error: ZodError }` | Express controllers checking DB uniqueness, external API lookups |

---

## 💻 2. Deep Dive: `parse` vs `safeParse` Code Mechanics

### A. Using `schema.parse(data)` (Throwing Approach)

```typescript
import { z } from "zod";

// Define Schema
const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(20),
  age: z.number().int().min(18),
});

// Deriving TypeScript Type
type User = z.infer<typeof UserSchema>;

const rawInput = {
  id: "invalid-uuid-123",
  username: "al",
  age: 15,
};

try {
  // Throws ZodError immediately on failure
  const validUser: User = UserSchema.parse(rawInput);
  console.log("Valid User:", validUser);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation failed with issues:", error.issues);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### B. Using `schema.safeParse(data)` (Type-Safe Non-Throwing Approach)

`safeParse` returns a **SafeParseReturnType**, which is TypeScript discriminated union:

```typescript
type SafeParseReturnType<Output> =
  | { success: true; data: Output }
  | { success: false; error: ZodError };
```

Because it uses a discriminated union tagged by `success`, TypeScript's type checker narrows `result.data` and `result.error` automatically!

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(20),
  age: z.number().int().min(18),
});

const rawInput = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  username: "saif_dev",
  age: 24,
};

const result = UserSchema.safeParse(rawInput);

if (result.success) {
  // TypeScript knows result.data exists and is typed as User!
  console.log("User Name:", result.data.username);
  console.log("User Age:", result.data.age);
} else {
  // TypeScript knows result.error exists and is a ZodError!
  console.error("Validation errors:", result.error.flatten());
}
```

---

## ⚡ 3. Asynchronous Parsing: `parseAsync` vs `safeParseAsync`

When a schema includes **async refinements** (e.g. checking database for unique email address or verifying token with external API), synchronous `.parse()` and `.safeParse()` will throw an explicit Zod error warning you to use async parsing!

```typescript
import { z } from "zod";

// Simulated Database Check
async function checkEmailExistsInDB(email: string): Promise<boolean> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  const existingEmails = ["taken@example.com", "admin@domain.com"];
  return existingEmails.includes(email);
}

// Schema with Async Refinement
const RegistrationSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().refine(async (email) => {
    const isTaken = await checkEmailExistsInDB(email);
    return !isTaken; // Must return boolean (true = valid)
  }, {
    message: "Email address is already registered",
  }),
});

// ❌ INCORRECT: Calling safeParse on an async schema
// Calling safeParse on async refinement throws runtime error:
// "You have an async refinement, use parseAsync or safeParseAsync instead"

// ✅ CORRECT: Calling safeParseAsync
async function handleRegistration(body: unknown) {
  const result = await RegistrationSchema.safeParseAsync(body);

  if (!result.success) {
    return { status: 400, errors: result.error.flatten().fieldErrors };
  }

  // Save to DB...
  return { status: 201, user: result.data };
}
```

---

## 🚨 Common Pitfalls & Anti-Patterns

1. **Forgetting `await` on `safeParseAsync`**:
   `safeParseAsync` returns a Promise. If you forget `await`, `if (result.success)` will evaluate `undefined` or always evaluate true because a Promise object is truthy!
   ```typescript
   // ❌ CRITICAL BUG: result is a Promise object! Promise.success is undefined!
   const result = RegistrationSchema.safeParseAsync(req.body);
   if (result.success) { /* NEVER EXECUTES AS EXPECTED */ }

   // ✅ CORRECT
   const result = await RegistrationSchema.safeParseAsync(req.body);
   ```

2. **Using `.parse()` in Express Controllers without Catch Middleware**:
   Uncaught `ZodError` thrown by `.parse()` will result in Unhandled Promise Rejections or crash Node.js process unless handled by global error middleware.

3. **Overusing Async Refinements inside Object Schemas**:
   Keep DB checks separated where appropriate. If DB is down, `safeParseAsync` will reject if the async function throws an uncaught DB connection error inside `.refine()`. Always wrap internal DB calls inside `try/catch` within custom `.refine()` functions.

---

## ✅ Key Takeaways

- `parse()` throws `ZodError`; `safeParse()` returns `{ success, data, error }`.
- `safeParse()` leverages TypeScript discriminated unions for clean, type-safe conditional branching without try/catch blocks.
- Use `parseAsync` / `safeParseAsync` whenever your schema contains async `.refine()`, `.transform()`, or `preprocess()`.
- Always `await` async parsing calls!
