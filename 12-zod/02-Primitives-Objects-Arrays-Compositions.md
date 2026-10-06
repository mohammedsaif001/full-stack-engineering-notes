# Primitives, Objects, Arrays & Compositions

## Part 2 of 6 — Data Types, Validation Modifiers & Schema Architecture

---

## 📌 Executive Summary

- **Primitives**: Zod models all JS primitives (`z.string()`, `z.number()`, `z.boolean()`, `z.date()`, `z.bigint()`, `z.null()`, `z.undefined()`).
- **Validation Chaining**: Method chaining allows combining multiple validation rules with custom error messages per constraint (e.g. `z.string().email("Invalid email").min(5, "Too short")`).
- **Object Manipulation**: Zod objects are composable. You can extend, merge, pick, omit, and toggle optionality using `.extend()`, `.merge()`, `.pick()`, `.omit()`, `.partial()`, and `.required()`.
- **Unknown Key Behavior**: By default, Zod **strips (`.strip()`)** unknown keys from objects during validation. You can change this behavior to throw errors (`.strict()`) or keep extra keys (`.passthrough()`).
- **Collections**: Supports arrays (`z.array()`), tuples (`z.tuple()`), records (`z.record()`), maps (`z.map()`), and sets (`z.set()`).

---

## 🧠 Core Analogies

- **Object Strip vs Strict vs Passthrough as Border Customs Control**:
  - **`.strip()` (Default)**: Customs officers allow you into the country, but confiscate unlisted items in your luggage before letting you pass (extra properties removed from output object).
  - **`.strict()`**: Customs officers halt you immediately and issue a fine if you carry *anything* not explicitly listed on your declaration manifest (throws `ZodError` for unknown keys).
  - **`.passthrough()`**: Customs officers inspect your declared items, sign off, and let you pass while keeping all unlisted items intact.

---

## 🧱 1. Primitive Validations Deep Dive

```typescript
import { z } from "zod";

// ==========================================
// 1. STRINGS
// ==========================================
const StringSchema = z.string({
  required_error: "Name is required",
  invalid_type_error: "Name must be a string",
})
  .min(2, { message: "Must be at least 2 characters" })
  .max(50, { message: "Cannot exceed 50 characters" })
  .email("Invalid email format")
  .url("Must be a valid URL")
  .uuid("Must be a valid UUID v4")
  .regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores allowed")
  .trim()          // Automatically trims leading/trailing whitespace
  .toLowerCase();  // Automatically converts string to lowercase

// ISO Datetime string validation
const ISOStringSchema = z.string().datetime({ message: "Invalid ISO 8601 datetime" });

// ==========================================
// 2. NUMBERS
// ==========================================
const PriceSchema = z.number({
  required_error: "Price is required",
})
  .gt(0, "Price must be greater than 0")
  .lte(10000, "Price cannot exceed 10,000")
  .finite("Price must be a finite number")
  .multipleOf(0.01, "Price can only have up to 2 decimal places");

const AgeSchema = z.number().int("Age must be an integer").positive("Age must be positive");

// ==========================================
// 3. BOOLEANS & DATES
// ==========================================
const TermsSchema = z.boolean().refine((val) => val === true, "You must accept terms");
const DateSchema = z.date().min(new Date("1900-01-01"), "Date is too far in past");
```

---

## 🏛️ 2. Object Schemas & Composition Methods

Zod objects provide powerful composition primitives for modular schema design.

```
                  ┌───────────────────────┐
                  │   BaseUserSchema      │
                  │   { id, name, email } │
                  └───────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   .extend({ role })    .pick({ name })      .partial()
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐
│   AdminSchema    │  │ UserProfile   │  │ UpdateUserSchema │
│ { id,name,email, │  │   { name }    │  │ { id?, name?,    │
│     role }       │  └───────────────┘  │    email? }      │
└──────────────────┘                     └──────────────────┘
```

### Composition API Cheat Sheet

```typescript
import { z } from "zod";

// Base User Schema
const UserBase = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["USER", "ADMIN"]),
  createdAt: z.date(),
});

// 1. EXTEND: Add new keys to existing schema
const CreateUserDTO = UserBase.extend({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

// 2. MERGE: Combine two object schemas together
const LocationSchema = z.object({ city: z.string(), country: z.string() });
const UserWithLocation = UserBase.merge(LocationSchema);

// 3. PICK: Create new schema with ONLY selected keys
const PublicProfileSchema = UserBase.pick({
  name: true,
  role: true,
});

// 4. OMIT: Create new schema EXCLUDING specified keys
const UserWithoutId = UserBase.omit({
  id: true,
  createdAt: true,
});

// 5. PARTIAL: Make all top-level keys optional (Ideal for PATCH endpoints!)
const UpdateUserDTO = UserBase.omit({ id: true, createdAt: true }).partial();
// Result: { name?: string; email?: string; role?: "USER" | "ADMIN" }

// 6. DEEP PARTIAL: Make all nested properties optional recursively
const ComplexSchema = z.object({
  user: z.object({
    settings: z.object({ theme: z.string() })
  })
});
const DeepPartialSchema = ComplexSchema.deepPartial();

// 7. REQUIRED: Convert optional keys back to required
const StrictUpdate = UpdateUserDTO.required();
```

---

## 🔒 3. Handling Unknown Object Keys (`strip`, `strict`, `passthrough`)

```typescript
import { z } from "zod";

const Base = z.object({ name: z.string() });
const input = { name: "Saif", hackerField: "DROP TABLE users;" };

// A. Default (.strip()): Strips unknown keys from output object
const stripped = Base.strip().parse(input);
console.log(stripped); // { name: "Saif" } (hackerField removed!)

// B. Strict (.strict()): Throws ZodError if extra keys exist
try {
  Base.strict().parse(input);
} catch (err) {
  console.log("Strict validation failed: Extra keys detected!");
}

// C. Passthrough (.passthrough()): Preserves unknown keys in output object
const passed = Base.passthrough().parse(input);
console.log(passed); // { name: "Saif", hackerField: "DROP TABLE users;" }
```

---

## 📦 4. Arrays, Tuples, Records & Collections

```typescript
import { z } from "zod";

// 1. ARRAYS
const StringArray = z.array(z.string())
  .min(1, "Array cannot be empty")
  .max(5, "Maximum 5 items allowed");

// Non-empty array convenience helper
const NonEmptyArray = z.string().array().nonempty("Must contain at least 1 item");

// 2. TUPLES (Fixed length, specific type per position)
// Example: GeoCoordinate [ latitude, longitude ]
const CoordinateSchema = z.tuple([
  z.number().min(-90).max(90),   // Index 0: Latitude
  z.number().min(-180).max(180), // Index 1: Longitude
]);
type Coordinate = z.infer<typeof CoordinateSchema>; // [number, number]

// Tuple with rest element
const VariadicTuple = z.tuple([z.string(), z.number()]).rest(z.boolean());
// Accepts: ["hello", 42, true, false, true]

// 3. RECORDS (Dynamic key-value objects)
// Example: Dictionary of user permissions { "users:read": true, "users:write": false }
const PermissionsSchema = z.record(
  z.string(), // Key type
  z.boolean() // Value type
);

// 4. MAPS & SETS
const StringNumberMap = z.map(z.string(), z.number());
const UniqueTagsSet = z.set(z.string()).min(1);
```

---

## 🚨 Common Pitfalls & Anti-Patterns

1. **Confusing `.omit()` / `.pick()` syntax**:
   In Zod, you pass an object with boolean flags (`{ fieldName: true }`), NOT an array of strings (`["fieldName"]`).
   ```typescript
   // ❌ INCORRECT
   const Bad = UserSchema.pick(["name", "email"]);

   // ✅ CORRECT
   const Good = UserSchema.pick({ name: true, email: true });
   ```

2. **Expecting `z.array()` to mutate or sanitize elements**:
   Zod returns a *new* parsed array instance. If nested elements have `.trim()`, the output array contains trimmed strings. Always use the returned result of `.parse()`.

---

## ✅ Key Takeaways

- Chains primitive rules like `.min()`, `.max()`, `.email()`, `.trim()` for precise field validation.
- Use `.pick()`, `.omit()`, `.extend()`, and `.partial()` to DRY up your validation schemas across POST, PUT, and PATCH endpoints.
- `.strip()` is Zod's default security guard against unexpected payload fields; use `.strict()` when extra properties indicate client protocol errors.
