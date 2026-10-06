# Express Integration & Production Patterns

## Part 6 of 6 — Middleware Architecture, Type Inference & Env Validation

---

## 📌 Executive Summary

- **Production Middleware Pattern**: Validate incoming untrusted HTTP inputs (`req.body`, `req.query`, `req.params`) at the router edge before execution reaches controllers.
- **Type Inference (`z.infer`)**: Automatically derive TypeScript types from Zod schemas to eliminate manual interface maintenance.
- **Strict Environment Validation (`env.ts`)**: Validate `process.env` at Node.js application startup using a Zod schema so the server fails fast if critical keys (like `DATABASE_URL` or `JWT_SECRET`) are missing.
- **Request Decorator Pattern**: Safely overwrite `req.body`, `req.query`, or `req.params` with cleansed, coerced, and validated data returned from `safeParse()`.

---

## 🧠 Core Analogies

- **Zod Middleware as a Bouncer & Coat Check at a Club**:
  - **Bouncer at Door (Zod Middleware)**: Inspects incoming guests before they enter the main room. If they carry forbidden items (`req.body` missing required fields), they are stopped at the door with a clear refusal reason (400 Bad Request).
  - **Coat Check (`req.body = parsed.data`)**: Strips away extra contraband, normalizes outfit details, and hands the clean, verified user payload directly to the party host (the Controller).

---

## 🏛️ 1. Reusable Express Request Validation Middleware

Here is a flexible, production-ready higher-order Express middleware factory:

```typescript
// middleware/validate.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

interface RequestValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validateRequest = (schemas: RequestValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate Body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // 2. Validate Query Parameters (Coerces string numbers/booleans)
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // 3. Validate Route Parameters
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        res.status(400).json({
          success: false,
          error: "INVALID_REQUEST_PAYLOAD",
          details: issues,
        });
        return;
      }

      next(error);
    }
  };
};
```

---

## 💻 2. Full Express Controller & Schema Implementation

### Step 1: Define Schemas & Derive Types (`auth.schema.ts`)

```typescript
import { z } from "zod";

export const RegisterUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  age: z.coerce.number().int().min(18, "Must be at least 18 years old"),
});

export const UserParamsSchema = z.object({
  id: z.string().uuid("Invalid User ID format"),
});

// Infer TypeScript Types
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type UserParamsInput = z.infer<typeof UserParamsSchema>;
```

### Step 2: Define Express Route with Middleware (`auth.routes.ts`)

```typescript
import { Router } from "express";
import { validateRequest } from "./middleware/validate.middleware";
import { RegisterUserSchema, UserParamsSchema } from "./auth.schema";
import { registerUserController, getUserByIdController } from "./auth.controller";

const router = Router();

// Route 1: Register User (Validates req.body)
router.post(
  "/register",
  validateRequest({ body: RegisterUserSchema }),
  registerUserController
);

// Route 2: Get User by ID (Validates req.params)
router.get(
  "/users/:id",
  validateRequest({ params: UserParamsSchema }),
  getUserByIdController
);

export default router;
```

### Step 3: Type-Safe Express Controller (`auth.controller.ts`)

```typescript
import { Request, Response } from "express";
import { RegisterUserInput, UserParamsInput } from "./auth.schema";

// Strongly typed Express Controller!
export const registerUserController = async (
  req: Request<{}, {}, RegisterUserInput>, // Params, ResBody, ReqBody
  res: Response
) => {
  // req.body is now fully typed and guaranteed valid by Zod middleware!
  const { username, email, password, age } = req.body;

  console.log(`Registering user: ${username} (${email}), age ${age}`);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: { username, email },
  });
};
```

---

## ⚡ 3. Fail-Fast Environment Variable Validation (`env.ts`)

Prevent silent runtime crashes due to missing or invalid `.env` configuration by validating environment variables on startup!

```typescript
// config/env.ts
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URI"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  REDIS_HOST: z.string().default("localhost"),
});

const parseEnv = () => {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid or missing Environment Variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1); // Stop server immediately!
  }

  return result.data;
};

// Export strongly typed env config object
export const env = parseEnv();
```

```typescript
// Usage in server.ts
import { env } from "./config/env";

console.log(`Server starting in ${env.NODE_ENV} mode on port ${env.PORT}`);
// env.PORT is guaranteed to be a number!
```

---

## 🚨 Common Pitfalls & Anti-Patterns

1. **Mutating `req.body` directly without assigning `parse()` output**:
   Remember that `z.coerce` and `.trim()` output modified values. If you do not assign `req.body = parsedData`, your controllers will still receive untrimmed, uncoerced raw strings!

2. **Parsing Environment Variables on every HTTP request**:
   Parse `process.env` ONCE during app initialization in a dedicated `env.ts` module, then export the resulting typed `env` object.

---

## ✅ Key Takeaways

- Protect Express controllers by attaching a generic `validateRequest` middleware to route definitions.
- Use `z.infer<typeof Schema>` to keep TypeScript types perfectly synchronized with runtime validation rules.
- Validate `process.env` at application boot time with Zod to enforce fail-fast security in production environments.
