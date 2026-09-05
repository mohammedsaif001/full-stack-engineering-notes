# Complete PostgreSQL Data Types Reference
## What Exists, What It Costs, and When to Use Each

> Previous: [10-Classic-Interview-Query-Patterns.md](10-Classic-Interview-Query-Patterns.md)

---

Postgres has far more types than the handful used in the earlier examples. This is the practical catalogue — grouped by category, with the "when to use this one" reasoning a fresher actually needs.

## Numeric types
| Type | Storage | Range / Precision | When to use |
|---|---|---|---|
| `SMALLINT` | 2 bytes | ±32,767 | Small bounded counters (e.g., a rating 1–5, age) where you want to save space |
| `INTEGER` / `INT` | 4 bytes | ±2.1 billion (2³¹) | The default choice for whole numbers — IDs, counts, quantities |
| `BIGINT` | 8 bytes | ±9.2 quintillion (2⁶³) | Very large counters (view counts, IDs on tables expected to exceed 2 billion rows) |
| `SERIAL` | 4 bytes (backed by `INT` + a sequence) | same as `INT` | Auto-incrementing primary keys |
| `BIGSERIAL` | 8 bytes (backed by `BIGINT` + a sequence) | same as `BIGINT` | Auto-incrementing PK on tables expected to grow past 2 billion rows |
| `DECIMAL(p, s)` / `NUMERIC(p, s)` | variable | exact, user-defined precision `p` and scale `s` | **Money, prices, anything requiring exact decimal math** — never use floating point for currency |
| `REAL` | 4 bytes | ~6 decimal digits, approximate | Scientific/measurement data where tiny rounding errors are acceptable |
| `DOUBLE PRECISION` | 8 bytes | ~15 decimal digits, approximate | Higher-precision approximate math (still never for money) |

**The single most important numeric rule**: `NUMERIC(10, 2)` means "10 total digits, 2 after the decimal point" — this is *exact*, so `0.1 + 0.2` always equals exactly `0.30`. `REAL`/`DOUBLE PRECISION` are binary floating-point, so `0.1 + 0.2` can come out as `0.30000000000000004` — **never use them for prices, balances, or anything financial.**

## Character/string types
| Type | Behavior | When to use |
|---|---|---|
| `VARCHAR(n)` | Variable-length, capped at `n` characters, no padding | The default for almost all text with a known reasonable max length (names, emails, titles) |
| `CHAR(n)` | Fixed-length, space-padded to exactly `n` | Rare — only for genuinely fixed-width codes (e.g., a 2-letter country code) |
| `TEXT` | Variable-length, **no length limit** | Long free-form content: bios, captions, comments, blog posts. In Postgres, `TEXT` and unbounded `VARCHAR` perform identically — `TEXT` is simply clearer intent when there's no natural max length |

**Practical rule of thumb**: if you can name a sensible max length (email ≤ 255, username ≤ 50), use `VARCHAR(n)` as self-documenting validation. If the content is genuinely open-ended (a post caption, a comment), use `TEXT`.

## Date & time types
| Type | Stores | When to use |
|---|---|---|
| `DATE` | Just a calendar date (no time) | Birthdates, enrollment dates, due dates |
| `TIME` | Just a time of day (no date) | Opening hours, a recurring daily schedule |
| `TIMESTAMP` | Date + time, **no timezone awareness** | Rarely ideal for production — ambiguous across timezones |
| `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`) | Date + time, stored internally as UTC | **The correct default for `created_at`/`updated_at` in any real app** — avoids timezone bugs entirely |
| `INTERVAL` | A span of time (e.g., `'3 days'`, `'2 hours'`) | Date arithmetic: `enrollment_date + INTERVAL '30 days'` |

> **Fresher gap-filler**: prefer `TIMESTAMPTZ` over plain `TIMESTAMP` for any `created_at`/`updated_at` column. Postgres always stores it as UTC internally and converts to the client's timezone on display — this sidesteps an entire category of "why is this timestamp 5 hours off" bugs later.

## Boolean
| Type | Values | When to use |
|---|---|---|
| `BOOLEAN` | `TRUE`, `FALSE`, or `NULL` (unknown) | Any true/false flag: `is_active`, `has_joined_masterji`, `is_available` |

## Structured / semi-structured types (Postgres-specific strengths)
| Type | What it is | When to use |
|---|---|---|
| `JSON` | Stores JSON text as-is (validated, but not optimized for querying) | Rarely — mostly superseded by `JSONB` |
| `JSONB` | Stores JSON in a parsed, indexable **binary** format | Storing flexible/variable-shaped data (e.g., user preferences, a webhook payload) inside an otherwise relational table — the best of both SQL and NoSQL |
| `ARRAY` (e.g., `INT[]`, `TEXT[]`) | A native array column | Small, simple lists that don't need their own table (e.g., a `tags TEXT[]` column) — for anything queried/joined heavily, a proper junction table is usually still better |
| `UUID` | A 128-bit universally unique identifier | Primary keys in distributed systems, or whenever IDs must be **unguessable** and generated without a central counter (unlike `SERIAL`, which is predictable and sequential) |
| `ENUM` (user-defined, e.g. `CREATE TYPE status AS ENUM (...)`) | A fixed, named set of allowed string values, stored efficiently | A closed set of states (`'pending'`, `'active'`, `'closed'`) where you want stricter validation than a `VARCHAR` + `CHECK` — note: **not every database supports ENUM** (Postgres and MySQL do; many others don't), which is why some teams prefer `VARCHAR` + `CHECK` for portability |

## Other useful types
| Type | Purpose |
|---|---|
| `BYTEA` | Raw binary data (rare — usually you store a file in blob storage and keep just the URL, as `image_url TEXT`, instead) |
| `CIDR` / `INET` | IP addresses and network ranges — useful for access-log or security-related tables |
| `MONEY` | A currency type — **generally avoid**; `NUMERIC(p,2)` is the more portable, predictable choice |

## Choosing a type — quick decision guide
| You're storing... | Use |
|---|---|
| A whole-number ID | `SERIAL` / `BIGSERIAL` (or `UUID` if IDs must be unguessable/distributed) |
| A price, balance, or any money value | `NUMERIC(p, s)` — never `REAL`/`FLOAT`/`MONEY` |
| A short label with a known max length | `VARCHAR(n)` |
| Long free-form text | `TEXT` |
| A phone number | `VARCHAR(15)` — never a numeric type (see [02-DDL-Data-Definition-Constraints.md](02-DDL-Data-Definition-Constraints.md)) |
| A true/false flag | `BOOLEAN` |
| A timestamp | `TIMESTAMPTZ` |
| A fixed set of allowed string states | `VARCHAR` + `CHECK (... IN (...))`, or `ENUM` if portability across databases doesn't matter |
| Flexible/variable-shaped data | `JSONB` |
| A simple small list on one row | `ARRAY` type (e.g. `TEXT[]`) |

---

**Next up:** [12-Query-Optimization-Playbook.md](12-Query-Optimization-Playbook.md) — a step-by-step guide to speeding up a slow query.
