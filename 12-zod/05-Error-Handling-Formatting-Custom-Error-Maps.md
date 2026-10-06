# Error Handling, Formatting & Custom Error Maps

## Part 5 of 6 — ZodError Architecture, Formatting Methods & Custom Translations

---

## 📌 Executive Summary

- **`ZodError` Anatomy**: When validation fails, Zod throws (or returns inside `safeParse`) a `ZodError` object containing an array of detailed `ZodIssue` instances under `error.issues`.
- **Formatting Methods**:
  1. `error.flatten()`: Converts nested errors into a simple flat structure: `{ formErrors: string[], fieldErrors: Record<string, string[]> }`. **Best for React Hook Form and REST APIs!**
  2. `error.format()`: Formats errors into a nested tree mirroring the shape of the original input schema.
  3. `error.issues`: Direct access to raw issue array containing issue codes, path arrays, and error messages.
- **Customizing Error Messages (4 Levels)**:
  - Level 1: Inline field-level custom messages (`z.string().min(5, "Must be at least 5 chars")`).
  - Level 2: Type error parameters (`z.string({ invalid_type_error: "Must be text" })`).
  - Level 3: Per-parse override using `{ errorMap: customMap }` in `.parse()` / `.safeParse()`.
  - Level 4: Global application-wide error overrides using `z.setErrorMap()`.

---

## 🧠 Core Analogies

- **`flatten()` vs `format()` vs Raw `issues` as Navigation Maps**:
  - **Raw `error.issues` (Raw GPS Telemetry Data)**: Gives raw latitude, longitude, and elevation metrics. Complete data, but verbose and hard to render directly in a UI.
  - **`error.flatten()` (Clean City Directory)**: A simplified two-column lookup list: "Email Field -> Invalid format", "Age Field -> Must be over 18".
  - **`error.format()` (Hierarchical Blueprint Tree)**: A multi-floor building blueprint showing floor 2 -> room 4 -> cabinet B -> error message. Useful for deeply nested UI forms.

---

## 🔍 1. Inside the `ZodError` Object

```typescript
import { z } from "zod";

const Schema = z.object({
  user: z.object({
    email: z.string().email(),
    age: z.number().min(18),
  }),
});

const result = Schema.safeParse({ user: { email: "not-an-email", age: 12 } });

if (!result.success) {
  const error: z.ZodError = result.error;

  // Inspecting Raw Issues Array
  console.log(error.issues);
  /*
  [
    {
      code: 'invalid_string',
      validation: 'email',
      message: 'Invalid email',
      path: [ 'user', 'email' ]
    },
    {
      code: 'too_small',
      minimum: 18,
      type: 'number',
      inclusive: true,
      exact: false,
      message: 'Number must be greater than or equal to 18',
      path: [ 'user', 'age' ]
    }
  ]
  */
}
```

---

## 🎨 2. The 3 Standard Formatting Strategies

```
                     ┌───────────────────────────────┐
                     │          ZodError             │
                     └───────────────┬───────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
  .flatten()                     .format()                  .issues (Raw)
         │                           │                           │
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Flat Field Map   │       │ Nested Tree      │       │ Array of Issues  │
│ {                │       │ {                │       │ [                │
│   fieldErrors: { │       │   user: {        │       │   { code, path,  │
│    email:["..."] │       │    email:{       │       │     message }    │
│   }              │       │     _errors:[..] │       │ ]                │
│ }                │       │   }              │       └──────────────────┘
└──────────────────┘       └──────────────────┘
```

### Strategy A: `.flatten()` (Recommended for 90% of Backend Use Cases)

```typescript
const flattened = result.error.flatten();

console.log(flattened);
/*
{
  formErrors: [], // Root-level object / array errors
  fieldErrors: {
    "user.email": ["Invalid email"],
    "user.age": ["Number must be greater than or equal to 18"]
  }
}
*/

// Custom mapper helper for Express API responses
function formatZodFieldErrors(error: z.ZodError) {
  const { fieldErrors, formErrors } = error.flatten();
  return {
    message: "Validation failed",
    formErrors,
    fieldErrors,
  };
}
```

### Strategy B: `.format()` (Nested Tree Formatting)

```typescript
const formatted = result.error.format();

console.log(formatted);
/*
{
  _errors: [],
  user: {
    _errors: [],
    email: { _errors: [ 'Invalid email' ] },
    age: { _errors: [ 'Number must be greater than or equal to 18' ] }
  }
}
*/
```

---

## 🛠️ 3. Ways to Customize Error Messages

### Method 1: Inline Custom Messages (Field Level)

```typescript
import { z } from "zod";

const UserSchema = z.object({
  username: z.string({
    required_error: "Username cannot be omitted",
    invalid_type_error: "Username must be a valid text string",
  })
  .min(3, "Username is too short (min 3 chars)")
  .max(20, "Username is too long (max 20 chars)"),

  email: z.string().email("Please provide a valid corporate email address"),
});
```

### Method 2: Per-Parse `errorMap` Override

You can pass a custom `errorMap` function directly to `.parse()` or `.safeParse()`.

```typescript
import { z } from "zod";

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === "string") {
      return { message: `Field '${issue.path.join(".")}' must be text!` };
    }
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    return { message: `Value for '${issue.path.join(".")}' is below minimum required!` };
  }
  return { message: ctx.defaultError };
};

// Pass errorMap as parse option
const result = UserSchema.safeParse(
  { username: 123 },
  { errorMap: customErrorMap }
);
```

### Method 3: Global Application Error Map (`z.setErrorMap`)

Call `z.setErrorMap()` at application startup (e.g. inside `server.ts` or `app.ts`) to localize or standardize all validation messages across your entire microservice!

```typescript
import { z } from "zod";

// Define Global Error Map for i18n or custom branding
const globalI18nErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") {
        return { message: "Correo electrónico no válido" }; // Spanish translation example
      }
      break;
    case z.ZodIssueCode.too_small:
      return { message: `El campo debe tener al menos ${issue.minimum} caracteres` };
  }
  return { message: ctx.defaultError };
};

// Register globally
z.setErrorMap(globalI18nErrorMap);
```

---

## 🌐 4. Standardizing Express REST API Error Responses

Here is an enterprise-grade error formatting pattern for Express controllers:

```typescript
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export interface ApiValidationErrorResponse {
  success: false;
  statusCode: 400;
  error: {
    code: "VALIDATION_ERROR";
    message: string;
    issues: Array<{
      field: string;
      message: string;
    }>;
  };
}

export function handleZodValidationError(error: z.ZodError, res: Response): Response<ApiValidationErrorResponse> {
  const issues = error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));

  return res.status(400).json({
    success: false,
    statusCode: 400,
    error: {
      code: "VALIDATION_ERROR",
      message: `Invalid input data: ${issues.length} validation issues detected`,
      issues,
    },
  });
}
```

---

## 🚨 Common Pitfalls & Anti-Patterns

1. **Exposing Raw Internal Stack Traces in Production**:
   Never return raw `error.stack` or unhandled `ZodError` stack traces to HTTP clients. Always map through `.flatten()` or a custom issue mapper.

2. **Ignoring `issue.path` Arrays**:
   Remember that `issue.path` is an array of strings/numbers (e.g., `["users", 0, "email"]`). Always use `issue.path.join(".")` when building human-readable field descriptors!

---

## ✅ Key Takeaways

- `ZodError` stores raw issues under `error.issues`.
- Use `.flatten()` to generate simple `{ fieldErrors }` mappings for web forms and API error payloads.
- Use `.format()` for deeply nested object trees.
- Customize messages inline, via per-parse `errorMap`, or globally using `z.setErrorMap()`.
