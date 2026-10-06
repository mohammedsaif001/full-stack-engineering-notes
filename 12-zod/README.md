# 12 — Zod Schema Validation & Type Safety

A comprehensive, production-grade guide to schema validation, type inference, error formatting, and Express/Node.js integration using Zod.

Every file in this module follows the standardized cohort note structure: a **📌 Executive Summary**, **🧠 Core Analogies**, numbered deep-dive sections with runnable TypeScript code blocks, **🚨 Common Pitfalls**, and **✅ Key Takeaways**.

---

## 🗺️ Module Path

| # | File | Core Topics Covered |
|---|---|---|
| 01 | [Zod Foundations: Parsing vs SafeParsing](01-Zod-Foundations-Parsing-Vs-SafeParsing.md) | `parse` vs `safeParse` vs `parseAsync` vs `safeParseAsync`, `SafeParseSuccess` vs `SafeParseError`, throwing vs non-throwing validation, async validation strategies |
| 02 | [Primitives, Objects, Arrays & Compositions](02-Primitives-Objects-Arrays-Compositions.md) | String rules (email, url, uuid, regex), Number rules, Booleans, Dates, Object shape manipulation (`extend`, `merge`, `pick`, `omit`, `partial`, `strict`, `passthrough`), Arrays, Tuples, Records |
| 03 | [Advanced Types: Unions, Enums & Discriminated Unions](03-Advanced-Types-Unions-Enums-DiscriminatedUnions.md) | Zod enums vs Native JS/TS enums, Unions (`z.union`), Discriminated Unions (`z.discriminatedUnion`), Literals, Nullable vs Optional vs Nullish, Default & Catch values |
| 04 | [Transforms, Refinements, Coercion & Pipelining](04-Transforms-Refinements-Coercion-Pipelining.md) | Type Coercion (`z.coerce`), `.transform()`, `.refine()`, `.superRefine()` (multi-field validation, conditional logic, `addIssue`), `.pipe()`, `z.preprocess()` |
| 05 | [Error Handling, Formatting & Custom Error Maps](05-Error-Handling-Formatting-Custom-Error-Maps.md) | `ZodError` object inspection, `.flatten()` vs `.format()`, custom issue maps, global `z.setErrorMap()`, custom inline `errorMap`, mapping Zod errors to standardized REST API JSON responses |
| 06 | [Express Integration & Production Patterns](06-Express-Integration-Middleware-Production-Patterns.md) | Express validation middleware (`req.body`, `req.query`, `req.params`), TypeScript type inference (`z.infer<typeof schema>`), strict environment variable validation (`env.ts`), production DTO schemas |

---

## ❓ Frequently Asked Study Questions Answered

| Question | File Reference |
|---|---|
| When should I use `safeParse` instead of `parse`? | [01 §2](01-Zod-Foundations-Parsing-Vs-SafeParsing.md) |
| How do I run async validations like checking if an email exists in MongoDB? | [01 §4](01-Zod-Foundations-Parsing-Vs-SafeParsing.md) |
| What is the difference between `.partial()`, `.passthrough()`, and `.strict()`? | [02 §3](02-Primitives-Objects-Arrays-Compositions.md) |
| Why are Discriminated Unions faster and safer than standard Unions? | [03 §3](03-Advanced-Types-Unions-Enums-DiscriminatedUnions.md) |
| How does `.refine()` differ from `.superRefine()`? | [04 §3–4](04-Transforms-Refinements-Coercion-Pipelining.md) |
| How do I transform query string integers like `"page=1"` into numbers? | [04 §1](04-Transforms-Refinements-Coercion-Pipelining.md) |
| How do I format Zod error output into `{ field: "error message" }` for frontend forms? | [05 §2](05-Error-Handling-Formatting-Custom-Error-Maps.md) |
| How do I write a clean Express request validation middleware without repeating code? | [06 §2](06-Express-Integration-Middleware-Production-Patterns.md) |

---

## ⚡ 30-Minute Fast Track

1. Read **01 §2 & §3** for `parse` vs `safeParse`.
2. Read **04 §1, §3 & §4** for coercion, `refine`, and `superRefine`.
3. Read **05 §2 & §3** for error formatting (`.flatten()` and custom error maps).
4. Read **06 §2** for production Express request validation.
