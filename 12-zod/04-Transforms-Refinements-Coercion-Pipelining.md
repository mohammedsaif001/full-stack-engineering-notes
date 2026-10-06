# Transforms, Refinements, Coercion & Pipelining

## Part 4 of 6 — Data Modification, Custom Rules & Complex Schema Pipelines

---

## 📌 Executive Summary

- **Coercion (`z.coerce`)**: Automatically converts primitives (e.g. converting string `"123"` into number `123`, or string `"true"` into boolean `true`). Crucial for Express `req.query`, `req.params`, and `FormData`!
- **Transforms (`.transform()`)**: Mutates or formats valid input into a new data structure (e.g., converting `"SAIF@GMAIL.COM"` to `"saif@gmail.com"` or hashing a password).
- **`z.input` vs `z.output`**: When using `.transform()`, the input type (`z.input<typeof Schema>`) differs from the final inferred output type (`z.output<typeof Schema>`).
- **Refinements (`.refine()`)**: Attaches custom boolean validation rules to existing schemas.
- **SuperRefinements (`.superRefine()`)**: Low-level validation primitive that accepts a context object (`ctx`). Allows reporting **multiple validation issues**, attaching errors to specific target paths, and writing conditional cross-field validation rules!
- **Pipelining (`.pipe()`)**: Chains the output of one schema directly as the input to another (e.g., parsing a JSON string and validating the resulting object against a schema).

---

## 🧠 Core Analogies

- **Transform vs Refine vs SuperRefine as Custom Car Workshop**:
  - **Coercion (`z.coerce`)**: The automatic car wash that strips off mud and reshapes incoming metal automatically.
  - **Refinement (`.refine`)**: The pass/fail safety inspection checklist. Is tread depth > 2mm? Returns true or false.
  - **Transform (`.transform`)**: The paint job and custom tuning shop. Converts raw factory engine parts into a modified race car.
  - **SuperRefine (`.superRefine`)**: Master mechanic with diagnostic computer who opens the hood, inspects 5 interconnected components simultaneously, and prints out an exact itemized defect diagnostic report pointing directly to cylinder 3 (`path: ["engine", "cylinder3"]`).

---

## 🔄 1. Type Coercion (`z.coerce`)

HTTP query parameters and multi-part form data arrive at Node.js servers entirely as strings (`req.query = { page: "1", limit: "20", active: "true" }`). Zod coercion solves this automatically!

```typescript
import { z } from "zod";

const QueryParamSchema = z.object({
  // Automatically calls Number("1") -> 1
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().max(100).default(10),

  // Automatically calls Boolean("true") -> true
  active: z.coerce.boolean(),

  // Automatically calls new Date("2026-10-06") -> Date object
  startDate: z.coerce.date(),
});

type QueryParams = z.infer<typeof QueryParamSchema>;
/*
  Inferred Type:
  {
    page: number;
    limit: number;
    active: boolean;
    startDate: Date;
  }
*/

const rawQuery = { page: "2", limit: "50", active: "true", startDate: "2026-10-06" };
const parsedQuery = QueryParamSchema.parse(rawQuery);
console.log(typeof parsedQuery.page); // "number" (Value: 2)
console.log(parsedQuery.startDate instanceof Date); // true
```

---

## 🛠️ 2. Data Transformations (`.transform`)

Transforms allow you to alter the output value after schema validation succeeds.

```typescript
import { z } from "zod";

const UserRegistrationSchema = z.object({
  // Normalize email to lowercase and trimmed
  email: z.string().email().transform((val) => val.trim().toLowerCase()),

  // Split comma-separated tags string into string array
  tags: z.string().transform((val) => val.split(",").map((t) => t.trim())),
});

const input = {
  email: "  MOHAMMED.SAIF@EXAMPLE.COM  ",
  tags: "typescript, zod, express, backend",
};

const result = UserRegistrationSchema.parse(input);
console.log(result.email); // "mohammed.saif@example.com"
console.log(result.tags);  // ["typescript", "zod", "express", "backend"]

// ⚠️ TypeScript Note: z.input vs z.output
type InputType = z.input<typeof UserRegistrationSchema>;
// { email: string; tags: string; }

type OutputType = z.output<typeof UserRegistrationSchema>; // Same as z.infer
// { email: string; tags: string[]; }
```

---

## 🔍 3. Refinements (`.refine`)

`.refine()` lets you add custom validation checks that return a boolean.

```typescript
import { z } from "zod";

// Single field refinement
const PasswordSchema = z.string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number",
  });

// Object-level multi-field refinement (Password Matching)
const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
})
.refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], // Attaches error specifically to confirmPassword field!
});
```

---

## ⚡ 4. SuperRefinement (`.superRefine`) — The Powerful Engine

Use `.superRefine()` when you need to:
1. Validate multiple dependent fields.
2. Conditionally add multiple errors.
3. Control exact issue codes, error paths, and error parameters.

```typescript
import { z } from "zod";

const TransferFundsSchema = z.object({
  transferType: z.enum(["INTERNAL", "EXTERNAL"]),
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  routingNumber: z.string().optional(),
  amount: z.number().positive(),
}).superRefine((data, ctx) => {
  // Rule 1: Cannot transfer to same account
  if (data.sourceAccountId === data.destinationAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Destination account must be different from source account",
      path: ["destinationAccountId"],
    });
  }

  // Rule 2: EXTERNAL transfers MUST provide routingNumber
  if (data.transferType === "EXTERNAL" && !data.routingNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Routing number is required for external wire transfers",
      path: ["routingNumber"],
    });
  }

  // Rule 3: Routing number must be 9 digits if provided
  if (data.routingNumber && !/^\d{9}$/.test(data.routingNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Routing number must be exactly 9 numeric digits",
      path: ["routingNumber"],
    });
  }
});
```

---

## 🔗 5. Schema Pipelining (`.pipe`)

`.pipe()` passes the parsed output of the first schema as input to the second schema. A common use case is stringified JSON parsing!

```typescript
import { z } from "zod";

const UserPayloadSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["ADMIN", "USER"]),
});

// Transform string into JS object via JSON.parse, then pipe to UserPayloadSchema
const JsonUserSchema = z.string()
  .transform((str, ctx) => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid JSON string",
      });
      return z.NEVER; // Halts execution gracefully
    }
  })
  .pipe(UserPayloadSchema);

const jsonInput = '{"userId": "123e4567-e89b-12d3-a456-426614174000", "role": "ADMIN"}';
const user = JsonUserSchema.parse(jsonInput);
console.log(user.role); // "ADMIN" (Typed as UserPayloadSchema!)
```

---

## 🚨 Common Pitfalls & Anti-Patterns

1. **Forgetting `path` in Object Refinements**:
   If you refine an object schema without passing `{ path: ["field"] }`, the error gets attached to the root object (`""` path) instead of the invalid field on your frontend form.

2. **Using `.transform()` for Validation**:
   `.transform()` should be used for data mutation, NOT validation. If you return false or throw inside `.transform()`, Zod raises untyped errors. Always use `.refine()` or `.superRefine()` for assertions, or `ctx.addIssue` with `z.NEVER` inside transform.

---

## ✅ Key Takeaways

- Use `z.coerce` to seamlessly transform query params and strings into numbers, booleans, and dates.
- Distinguish between `z.input<T>` and `z.output<T>` when schemas contain `.transform()`.
- Use `.refine()` for simple true/false assertions; use `.superRefine()` for complex, cross-field conditional logic and multi-issue reporting.
- Use `.pipe()` to chain string decoding (like JSON or Base64) with object schema validation.
