# DQL — Reading Data with SELECT
## Part 5 of 19 — `SELECT`, `WHERE`, Operators, `ORDER BY`, `LIMIT`, `DISTINCT`, `LIKE`, `CASE`, `NULL`

> Previous: [04-DML-Insert-Update-Delete.md](04-DML-Insert-Update-Delete.md)

---

## 📌 Executive Summary

- **DQL = Data Query Language** — just `SELECT`. It *reads* data and changes nothing on disk.
- **`SELECT col_list FROM table`** is the core. Everything else — `WHERE`, `ORDER BY`, `LIMIT`, `DISTINCT`, `GROUP BY` — narrows, orders, or reshapes what comes back.
- **`WHERE`** filters individual rows. It runs *before* `SELECT`, which is why you can't use a `SELECT` alias in `WHERE`.
- **`NULL` breaks intuition.** `NULL = NULL` is not true — it's *unknown*. Use `IS NULL` / `IS NOT NULL`. `= NULL` silently matches nothing.
- **`AND` binds tighter than `OR`.** `a AND b OR c` means `(a AND b) OR c`. Use parentheses whenever you mix them.
- **`LIKE`** is pattern matching: `%` = any run of characters, `_` = exactly one. Postgres's `LIKE` is case-*sensitive*; use **`ILIKE`** for case-insensitive.
- **`CASE`** is SQL's if/else — as a computed column, or bucketed inside an aggregate.
- **`LIMIT` / `OFFSET`** paginate. `OFFSET` gets slow as it grows — [16](16-Query-Optimization-Playbook.md) covers the fix.

---

## 🧠 Core Analogy: Asking a Question of a Spreadsheet

A `SELECT` is one precise question:

> "Give me the **name and price** columns *(the `SELECT` list)*, from the **menu** *(`FROM`)*, but only rows where **category is 'Snacks'** *(`WHERE`)*, sorted **cheapest first** *(`ORDER BY`)*, and just the **top 5** *(`LIMIT`)*."

The database reads that back-to-front from how you wrote it: it starts at `FROM`, filters with `WHERE`, then finally picks the columns you asked for and sorts them. That reading order is why a name you invent in `SELECT` isn't available yet when `WHERE` runs.

---

Dataset for this file — a small self-contained `ipl_players` table (rich enough to show every operator):

```sql
CREATE TABLE ipl_players (
    player_id            SERIAL PRIMARY KEY,
    name                 VARCHAR(100),
    team                 VARCHAR(50),
    role                 VARCHAR(50),
    runs_scored          INT,
    wickets_taken        INT,
    auction_price_crores DECIMAL(5, 2),
    nickname             VARCHAR(50)
);

INSERT INTO ipl_players (name, team, role, runs_scored, wickets_taken, auction_price_crores, nickname) VALUES
('Virat Kohli',     'RCB',            'Batsman',      973, 0,  15.00, 'King Kohli'),
('MS Dhoni',        'CSK',            'Wicketkeeper', 450, 0,  12.00, 'Thala'),
('Jasprit Bumrah',  'Mumbai Indians', 'Bowler',        15, 27, 12.00, 'Jassi'),
('Hardik Pandya',   'Mumbai Indians', 'All-Rounder',  400, 15, 15.00, 'Kung Fu Pandya'),
('Sunil Narine',    'KKR',            'All-Rounder',  350, 20,  8.50, 'Carrom King'),
('Rohit Sharma',    'Mumbai Indians', 'Batsman',      550, 0,  16.00, 'Hitman'),
('Rashid Khan',     'Gujarat Titans', 'Bowler',        50, 19, 15.00, 'The Magician'),
('Rinku Singh',     'KKR',            'Batsman',      475, 0,   0.55, 'The Spirit'),
('Arjun Tendulkar', 'Mumbai Indians', 'Bowler',        10, 3,   0.30, 'Arjun'),
('Kane Williamson', 'LSG',            'Batsman',      600, 0,  11.00, 'Kane Mama'),
('Mystery Player',  NULL,             'Batsman',        0, 0,   1.00, 'Mystery Man');  -- unsold, team is NULL
```

---

## 🔍 1. Basic `SELECT`

```sql
SELECT * FROM ipl_players;                     -- every column, every row — avoid on big tables
SELECT name, nickname, team FROM ipl_players;  -- only the columns you need
```
```text
       name       |    nickname    |      team
------------------+----------------+----------------
 Virat Kohli      | King Kohli     | RCB
 MS Dhoni         | Thala          | CSK
 ...
 Mystery Player   | Mystery Man    |               ← blank cell = NULL, not empty string
(11 rows)
```
> `SELECT *` is fine for exploring. In application code, list the columns — it's less data over the wire, and it won't silently break an [Index Only Scan](14-Indexing-Query-Performance.md).

---

## 🎯 2. `WHERE` — filtering rows

```sql
SELECT name, team FROM ipl_players WHERE team = 'Mumbai Indians';        -- exact match
SELECT name, auction_price_crores FROM ipl_players WHERE auction_price_crores > 10.0;  -- comparison
SELECT name FROM ipl_players WHERE role = 'All-Rounder' AND wickets_taken > 10;         -- AND
SELECT name FROM ipl_players WHERE team = 'CSK' OR team = 'RCB';                        -- OR
```

### Operator precedence trap — `AND` binds tighter than `OR`

```sql
-- CORRECT: Batsmen who play for RCB or CSK
SELECT name, role, team FROM ipl_players
WHERE role = 'Batsman' AND (team = 'RCB' OR team = 'CSK');
```
```text
    name     |  role   | team
-------------+---------+------
 Virat Kohli | Batsman | RCB
(1 row)
```

```sql
-- WRONG: no parentheses
SELECT name, role, team FROM ipl_players
WHERE role = 'Batsman' AND team = 'RCB' OR team = 'CSK';
```
```text
    name     |    role      | team
-------------+--------------+------
 Virat Kohli | Batsman      | RCB
 MS Dhoni    | Wicketkeeper | CSK      ← leaked in! Dhoni isn't even a Batsman
(2 rows)
```
> Without parens this parses as `(role = 'Batsman' AND team = 'RCB') OR (team = 'CSK')` — the second half has no role filter, so every CSK player slips through. **Mix `AND` and `OR` → always parenthesise.**

---

## 🧮 3. Every comparison & logical operator

| Operator | Meaning | Example |
|---|---|---|
| `=` | Equal | `WHERE team = 'CSK'` |
| `<>` or `!=` | Not equal | `WHERE team <> 'CSK'` |
| `>` `<` `>=` `<=` | Greater / less (or equal) | `WHERE runs_scored >= 500` |
| `BETWEEN a AND b` | Inclusive range (`a ≤ x ≤ b`) | `WHERE auction_price_crores BETWEEN 10 AND 15` |
| `IN (list)` | Matches any value in a list | `WHERE team IN ('CSK', 'RCB', 'KKR')` |
| `NOT IN (list)` | Matches none of a list | `WHERE team NOT IN ('CSK', 'RCB')` |
| `LIKE` / `ILIKE` | Pattern match (case-sensitive / insensitive) | `WHERE name LIKE 'R%'` |
| `IS NULL` / `IS NOT NULL` | Absence check — never `= NULL` | `WHERE team IS NULL` |
| `AND` `OR` `NOT` | Logical combinators | `WHERE a AND (b OR NOT c)` |
| `EXISTS` / `NOT EXISTS` | True if a subquery returns any row | see [08](08-Subqueries.md) |
| `ANY` / `ALL` | Compare against every value a subquery returns | see [08](08-Subqueries.md) |

---

## 🕳️ 4. `NULL` — the value that isn't a value

`NULL` means "unknown / absent." It is **not** `0`, `''`, or `FALSE`.

```sql
SELECT name, team FROM ipl_players WHERE team IS NULL;
```
```text
      name      | team
----------------+------
 Mystery Player |
(1 row)
```

- `WHERE team = NULL` returns **zero rows** — `=` can never match `NULL`, because "is unknown equal to unknown?" is itself unknown, not true. Same for `<>`, `>`, etc.
- **`NOT IN` with a `NULL` in the mix is a classic bug:**

```sql
SELECT name, team FROM ipl_players
WHERE team NOT IN ('Mumbai Indians', 'CSK', 'RCB');
```
`Mystery Player` (team `NULL`) does **not** appear — even though `NULL` is arguably "not in" that list. `NOT IN` with any `NULL` involved evaluates to `NULL` (not `TRUE`), and `WHERE` treats `NULL` as "exclude." If a `NULL` could be in your list or column, prefer `NOT EXISTS`.
- To substitute a fallback for `NULL` in output, use **`COALESCE`** (§8).

---

## 🔤 5. `LIKE` / `ILIKE` — pattern matching

- `%` — any run of characters, including zero.
- `_` — exactly one character.

```sql
SELECT name FROM ipl_players WHERE name LIKE 'R%';       -- starts with R  → Rohit, Rashid, Rinku
SELECT name FROM ipl_players WHERE name LIKE '_a%';      -- any single 1st char, then 'a' as the 2nd → "Rashid Khan", "Kane Williamson"
SELECT name FROM ipl_players WHERE name LIKE '%singh';   -- ends with 'singh' (case-sensitive → matches nothing here)
SELECT name FROM ipl_players WHERE name ILIKE '%singh';  -- case-INsensitive → Rinku Singh
SELECT name FROM ipl_players WHERE name NOT LIKE 'R%';   -- does not start with R
```

> Postgres's `LIKE` is **case-sensitive** (unlike MySQL's, which is case-insensitive by default). Use **`ILIKE`** whenever case shouldn't matter — searching usernames, emails, names.
>
> A **leading** wildcard (`LIKE '%singh'`) can't use a normal index — it forces a full scan. A **trailing** wildcard (`LIKE 'R%'`) can. See [16 §4](16-Query-Optimization-Playbook.md).

---

## ↕️ 6. `ORDER BY` — sorting

```sql
SELECT name, runs_scored FROM ipl_players ORDER BY runs_scored DESC;    -- highest first
SELECT team, name, auction_price_crores
FROM ipl_players
ORDER BY team ASC, auction_price_crores DESC;                           -- team A–Z, then price high→low within team
```

- `ASC` (ascending) is the default; `DESC` reverses.
- **`NULL` sorts first in `ASC`** in Postgres — the `NULL`-team row floats to the top. Override with `ORDER BY team ASC NULLS LAST`.
- `ORDER BY` runs *after* `SELECT`, so it **can** use a `SELECT` alias: `ORDER BY price_in_lakhs`.

---

## 📄 7. `LIMIT` and `OFFSET` — pagination

```sql
-- Page 1: 3 most expensive
SELECT name, auction_price_crores FROM ipl_players
ORDER BY auction_price_crores DESC
LIMIT 3;

-- Page 2: skip 3, take the next 3
SELECT name, auction_price_crores FROM ipl_players
ORDER BY auction_price_crores DESC
LIMIT 3 OFFSET 3;
```

- **`LIMIT n`** — return at most `n` rows, *after* sorting.
- **`OFFSET m`** — skip the first `m` rows first. Defaults to `0`.
- **Pagination formula:** `OFFSET = (page - 1) * page_size`, `LIMIT = page_size`. Page 3 at 10/page → `LIMIT 10 OFFSET 20`.
- Always pair `LIMIT`/`OFFSET` with `ORDER BY` — without a defined order, "page 2" isn't a stable concept.
- **`OFFSET` degrades on large tables** — Postgres still has to walk past every skipped row. Keyset pagination is the fix ([16 §7](16-Query-Optimization-Playbook.md)).

---

## 🧾 8. Computed columns, aliases, `COALESCE`, `NULLIF`

```sql
SELECT name,
       auction_price_crores,
       auction_price_crores * 100 AS price_in_lakhs        -- computed at query time; never stored
FROM ipl_players
WHERE name = 'Virat Kohli';
```
```text
    name     | auction_price_crores | price_in_lakhs
-------------+----------------------+----------------
 Virat Kohli |                15.00 |        1500.00
(1 row)
```

- **`AS`** gives a computed column a temporary name (an **alias**). It exists only in this query's output — nothing is written to disk.
- **`COALESCE(a, b, c, …)`** returns the first non-`NULL` argument — the standard way to show a fallback instead of a blank:

```sql
SELECT name, COALESCE(nickname, name) AS display_name FROM ipl_players;
SELECT name, COALESCE(team, 'Unsold')  AS team         FROM ipl_players;
```

- **`NULLIF(a, b)`** returns `NULL` if `a = b`, else `a` — mainly to dodge divide-by-zero: `total / NULLIF(count, 0)`.

---

## 🔀 9. `CASE` — SQL's if/else

### As a computed column

```sql
SELECT name, auction_price_crores,
  CASE
    WHEN auction_price_crores >= 15 THEN 'Marquee'
    WHEN auction_price_crores >= 8  THEN 'Mid-tier'
    ELSE 'Budget'
  END AS price_tier
FROM ipl_players
ORDER BY auction_price_crores DESC;
```
```text
       name       | auction_price_crores | price_tier
------------------+----------------------+------------
 Rohit Sharma     |                16.00 | Marquee
 Virat Kohli      |                15.00 | Marquee
 ...
 Arjun Tendulkar  |                 0.30 | Budget
(11 rows)
```

`WHEN` clauses are checked top to bottom; the first match wins. `ELSE` is optional (missing `ELSE` → `NULL`).

### Bucketed inside an aggregate ("conditional count" / poor man's pivot)

```sql
SELECT
  COUNT(CASE WHEN role = 'Batsman' THEN 1 END) AS batsmen,
  COUNT(CASE WHEN role = 'Bowler'  THEN 1 END) AS bowlers
FROM ipl_players;
```
```text
 batsmen | bowlers
---------+---------
       5 |       3
(1 row)
```
> The trick: when the `CASE` condition is false and there's no `ELSE`, it yields `NULL`, and **`COUNT()` never counts `NULL`s** — so each `COUNT(CASE …)` counts only its matching rows. Several conditional counts, one pass over the table. Full pivot pattern in [17](17-Interview-Query-Patterns.md).

---

## 🎲 10. `DISTINCT`

```sql
SELECT DISTINCT role FROM ipl_players;         -- unique roles only
```
```text
     role
--------------
 Batsman
 Wicketkeeper
 Bowler
 All-Rounder
(4 rows)
```

- `DISTINCT` on **multiple columns** dedupes the *combination*, not each column separately:

```sql
SELECT DISTINCT team, role FROM ipl_players ORDER BY team;
```
`Mumbai Indians` appears three times — once per distinct role on that team. It's unique **pairs**, not "unique teams and unique roles."

- **`COUNT(DISTINCT col)`** counts unique values (and ignores `NULL`):

```sql
SELECT COUNT(DISTINCT team) AS teams FROM ipl_players;   -- 6, not 7 — the NULL team isn't counted
```

- **`DISTINCT ON (col)`** (Postgres-only) keeps the *first* row per group given an `ORDER BY` — a quick "top-1 per group" without a window function:

```sql
SELECT DISTINCT ON (team) team, name, auction_price_crores
FROM ipl_players
ORDER BY team, auction_price_crores DESC;    -- highest-paid player per team
```

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| Why does `WHERE col = NULL` return nothing? | `=` can't match `NULL` (unknown = unknown is unknown); use `IS NULL` |
| `AND` vs `OR` precedence? | `AND` binds tighter — `a AND b OR c` = `(a AND b) OR c`; parenthesise when mixing |
| `LIKE` vs `ILIKE`? | `ILIKE` is case-insensitive; Postgres's `LIKE` is case-sensitive |
| Why can't `WHERE` use a `SELECT` alias? | `WHERE` runs before `SELECT`, so the alias doesn't exist yet |
| What does `COALESCE(a, b)` do? | Returns the first non-`NULL` argument |
| `DISTINCT a, b` — unique what? | Unique *combinations* of `(a, b)`, not each column independently |
| How do you paginate, and why is deep `OFFSET` slow? | `LIMIT n OFFSET m`; large `OFFSET` still walks past every skipped row — use keyset pagination |
| How do you do if/else in a query? | `CASE WHEN cond THEN x ELSE y END` |

---

**Next up:** [06-Aggregation-GroupBy-Having.md](06-Aggregation-GroupBy-Having.md) — turning rows into summaries with `GROUP BY`, `HAVING`, and the real clause execution order.
