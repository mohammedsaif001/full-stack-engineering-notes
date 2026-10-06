# Advanced Types: Unions, Enums & Discriminated Unions

## Part 3 of 6 — Enums, Polymorphic Payloads & Nullability Mechanics

---

## 📌 Executive Summary

- **Literals & Enums**: Model fixed primitive values using `z.literal()` and enumerated options using `z.enum()` or TS native enums `z.nativeEnum()`.
- **Unions (`z.union`)**: Combine multiple possible schemas. Zod evaluates unions by attempting to parse each schema candidate sequentially from left to right.
- **Discriminated Unions (`z.discriminatedUnion`)**: Optimized unions that use a shared discriminator field (tag key like `type` or `kind`). Offers **`O(1)` validation lookup** and precise, targeted error messages!
- **Optional vs Nullable vs Nullish**:
  - `z.string().optional()` maps to `string | undefined`.
  - `z.string().nullable()` maps to `string | null`.
  - `z.string().nullish()` maps to `string | null | undefined`.
- **Default & Catch**:
  - `.default(val)` populates missing `undefined` fields with a fallback value.
  - `.catch(val)` swallows validation errors for a specific field and provides a safe fallback value.

---

## 🧠 Core Analogies

- **Standard Union vs Discriminated Union as Key Ring vs Hotel Keycard**:
  - **Standard Union (`z.union`)**: You have a keyring of 10 keys and try every single key in the keyhole one by one until one works. Slow and generates useless error messages for all failed attempts.
  - **Discriminated Union (`z.discriminatedUnion`)**: Hotel rooms have room numbers printed on the keycard (`type: "PAYMENT_INTENT"`). The lock reader checks the card tag instantly (`O(1)`) and either unlocks room 302 or rejects it immediately.

---

## 🏷️ 1. Literals, Enums & Native Enums

```typescript
import { z } from "zod";

// 1. LITERALS (Exact value match)
const MethodSchema = z.literal("POST");
const Status200 = z.literal(200);
const TrueSchema = z.literal(true);

// 2. ZOD ENUMS (Array of string literals)
const RoleEnum = z.enum(["ADMIN", "USER", "GUEST", "SUPERADMIN"]);
type Role = z.infer<typeof RoleEnum>; // "ADMIN" | "USER" | "GUEST" | "SUPERADMIN"

// Extracting enum values array for runtime iteration (e.g., UI dropdowns)
console.log(RoleEnum.options); // ["ADMIN", "USER", "GUEST", "SUPERADMIN"]
console.log(RoleEnum.enum.ADMIN); // "ADMIN"

// 3. NATIVE TS ENUMS
enum UserPermission {
  READ = "READ",
  WRITE = "WRITE",
  DELETE = "DELETE",
}
const NativePermissionSchema = z.nativeEnum(UserPermission);
```

---

## 🔀 2. Standard Unions vs Discriminated Unions

### A. Standard Union (`z.union` / `.or()`)

```typescript
import { z } from "zod";

// Shorthand using .or()
const StringOrNumber = z.string().or(z.number());

// Standard union with z.union()
const OutputSchema = z.union([
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

// ⚠️ Issue with standard unions: Zod tests schemas sequentially.
// If input fails all schemas, error message contains failures from EVERY branch.
```

### B. Discriminated Union (`z.discriminatedUnion`) — Recommended for Polymorphic Data!

A Discriminated Union requires all member schemas to be `z.object()`s containing a shared **discriminator key** with distinct `z.literal()` values.

```typescript
import { z } from "zod";

// Define polymorphic event payload schemas
const TextMessageEvent = z.object({
  type: z.literal("TEXT"), // Discriminator field
  text: z.string().min(1),
  senderId: z.string().uuid(),
});

const ImageMessageEvent = z.object({
  type: z.literal("IMAGE"), // Discriminator field
  imageUrl: z.string().url(),
  caption: z.string().optional(),
  senderId: z.string().uuid(),
});

const SystemNoticeEvent = z.object({
  type: z.literal("SYSTEM"), // Discriminator field
  code: z.number().int(),
  notice: z.string(),
});

// Create Discriminated Union bound by key "type"
const WebhookEventSchema = z.discriminatedUnion("type", [
  TextMessageEvent,
  ImageMessageEvent,
  SystemNoticeEvent,
]);

type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// Parsing example
const payload = {
  type: "IMAGE",
  imageUrl: "not-a-valid-url",
  senderId: "123e4567-e89b-12d3-a456-426614174000",
};

const result = WebhookEventSchema.safeParse(payload);
if (!result.success) {
  // Zod knows payload is type "IMAGE" instantly!
  // Output error ONLY reports failure for ImageMessageEvent.imageUrl!
  console.log(result.error.flatten());
}
```

---

## ❓ 3. Optional vs Nullable vs Nullish Matrix

| Type Syntax | Input `undefined` | Input `null` | Input `"text"` | Derived TypeScript Type |
|---|---|---|---|---|
| `z.string()` | ❌ Error | ❌ Error | ✅ Valid | `string` |
| `z.string().optional()` | ✅ Valid (`undefined`) | ❌ Error | ✅ Valid | `string \| undefined` |
| `z.string().nullable()` | ❌ Error | ✅ Valid (`null`) | ✅ Valid | `string \| null` |
| `z.string().nullish()` | ✅ Valid (`undefined`) | ✅ Valid (`null`) | ✅ Valid | `string \| null \| undefined` |

```typescript
import { z } from "zod";

const FormSchema = z.object({
  bio: z.string().optional(),       // bio is string | undefined
  avatarUrl: z.string().nullable(),  // avatarUrl is string | null
  nickname: z.string().nullish(),   // nickname is string | null | undefined
});
```

---

## 🛡️ 4. Default & Catch Values

### A. `.default(value)`

Provides a default value if the incoming input property is `undefined`.

```typescript
import { z } from "zod";

const SettingsSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  notificationsEnabled: z.boolean().default(true),
  itemsPerPage: z.number().default(() => 20), // Dynamic default factory function
});

const parsed = SettingsSchema.parse({});
console.log(parsed);
// Output: { theme: "light", notificationsEnabled: true, itemsPerPage: 20 }
```

### B. `.catch(fallbackValue)`

Swallows validation failures gracefully and replaces invalid input with a safe fallback value without throwing errors or failing `safeParse`!

```typescript
import { z } from "zod";

const ResilientConfigSchema = z.object({
  // If API sends "invalid_port" or negative number, fall back to 8080!
  port: z.number().positive().catch(8080),
  
  // If corrupt log level is sent, fall back to "info"
  logLevel: z.enum(["debug", "info", "warn", "error"]).catch("info"),
});

const badPayload = { port: -999, logLevel: "SUPER_VERBOSE" };
const safeData = ResilientConfigSchema.parse(badPayload);
console.log(safeData); // { port: 8080, logLevel: "info" }
```

---

## 🚨 Common Pitfalls & Anti-Patterns

1. **Using Standard `z.union` for Object Schemas with Tags**:
   Always prefer `z.discriminatedUnion("tagField", [...])` over `z.union([...])` when objects share a common tag field (`type`, `kind`, `event`). Standard union validation will execute each schema sequentially and produce noisy, confusing error maps.

2. **Expecting `.default()` to trigger on `null`**:
   `.default()` ONLY triggers when input is `undefined` (or missing key). If input is explicitly `null`, `.default()` will fail unless combined with `.nullable()` or `.nullish()`.

---

## ✅ Key Takeaways

- Use `z.enum()` for literal string lists to get both static types and runtime validation options.
- Use `z.discriminatedUnion()` for polymorphic API messages, webhooks, and state machine objects.
- Remember: `optional()` handles `undefined`, `nullable()` handles `null`, and `nullish()` handles both.
- Use `.catch()` for fault-tolerant analytics and config parsing where invalid items should be safely replaced rather than rejected.
