# DML & DQL — INSERT / UPDATE / DELETE / SELECT
## Writing and Reading Row-Level Data

> Previous: [02-DDL-Data-Definition-Constraints.md](02-DDL-Data-Definition-Constraints.md)

---

## ✍️ 1. DML — Data Manipulation Language (INSERT / UPDATE / DELETE)

**DML = Data Manipulation Language.** It edits row-level *data* inside a table — the "CRUD" write operations, without touching the table's structure.

```sql
CREATE TABLE canteen_menu (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100),
    category VARCHAR(50),
    price INT,
    is_available BOOLEAN DEFAULT TRUE
);
```

### INSERT — the 'C' in CRUD
```sql
-- Single row (no need to specify item_id — SERIAL/PRIMARY KEY handles that automatically)
INSERT INTO canteen_menu (item_name, category, price)
VALUES ('Vada Pav', 'Snacks', 15);

-- Multiple rows in one statement
INSERT INTO canteen_menu (item_name, category, price) VALUES
('Masala Chai', 'Beverages', 10),
('Samosa', 'Snacks', 12),
('Rajma Chawal', 'Meals', 60);
```

### UPDATE — the 'U' in CRUD
```sql
-- CRITICAL: always use WHERE, or you will overwrite every row in the table.
UPDATE canteen_menu
SET price = 20
WHERE item_name = 'Vada Pav';

-- Bulk update: reduce every Beverage's price by 5
UPDATE canteen_menu
SET price = price - 5
WHERE category = 'Beverages';

-- Multiple columns at once
UPDATE canteen_menu
SET is_available = FALSE, price = 10
WHERE item_name = 'Samosa';
```
This is called **mutation** — you can target a row by any column, not just the primary key (e.g., `WHERE item_id = 2` also works).

### DELETE — the 'D' in CRUD
```sql
-- CRITICAL: always use WHERE.
DELETE FROM canteen_menu WHERE item_name = 'Cold Coffee';

-- The DANGER ZONE — no WHERE clause wipes the entire table:
-- DELETE FROM canteen_menu;
```
- **`DELETE` vs `TRUNCATE`**: both empty out rows and *neither* affects the table's structure. `DELETE` supports a `WHERE` clause (partial deletes) and can be rolled back inside a transaction; `TRUNCATE` removes *all* rows at once and is faster for wiping an entire table, but has no row-level filtering.
- **Best practice: dry-run before you mutate.** Before running an `UPDATE`/`DELETE`, run the equivalent `SELECT ... WHERE ...` first, to verify exactly which rows will be affected:
  ```sql
  -- Dry run first:
  SELECT * FROM canteen_menu WHERE item_name = 'Samosa';
  -- Then the real mutation, once you've confirmed the WHERE clause is correct:
  UPDATE canteen_menu SET is_available = FALSE WHERE item_name = 'Samosa';
  ```

> For `INSERT ... ON CONFLICT` (upserts) and `RETURNING`, see [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md#insert-variants).

---

## 🔍 2. DQL — Data Query Language (SELECT and Filtering)

**DQL = Data Query Language.** Used to *retrieve/fetch* data from a database **without modifying it** — in simple words, you just read from disk.

```sql
CREATE TABLE ipl_players (
    player_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    team VARCHAR(50),
    role VARCHAR(50),
    runs_scored INT,
    wickets_taken INT,
    auction_price_crores DECIMAL(5, 2),
    nickname VARCHAR(50)
);
```

### Basic SELECT
```sql
SELECT * FROM ipl_players;                              -- avoid on huge tables
SELECT name, nickname, team FROM ipl_players;             -- select only what you need
```

### Filtering with WHERE
```sql
SELECT * FROM ipl_players WHERE team = 'Mumbai Indians';           -- exact match
SELECT * FROM ipl_players WHERE auction_price_crores > 10.0;       -- comparison operators: > < >= <=
SELECT * FROM ipl_players WHERE role = 'All-Rounder' AND wickets_taken > 10;   -- AND
SELECT * FROM ipl_players WHERE team = 'CSK' OR team = 'RCB';                  -- OR
SELECT * FROM ipl_players WHERE auction_price_crores BETWEEN 5 AND 12;        -- range
SELECT * FROM ipl_players WHERE team != 'Mumbai Indians';   -- negation
SELECT * FROM ipl_players WHERE team <> 'Mumbai Indians';   -- standard SQL alternate for !=
SELECT * FROM ipl_players WHERE team IS NULL;               -- NULL check (never use `= NULL`)
SELECT * FROM ipl_players WHERE team IS NOT NULL;
SELECT * FROM ipl_players WHERE team NOT IN ('Mumbai Indians', 'CSK', 'RCB');
SELECT * FROM ipl_players WHERE auction_price_crores NOT BETWEEN 10 AND 15;
```

**Operator precedence trap** — parentheses matter:
```sql
-- CORRECT: Batsmen who are from RCB OR CSK
SELECT * FROM ipl_players WHERE role = 'Batsman' AND (team = 'RCB' OR team = 'CSK');

-- WRONG: because AND binds tighter than OR without parens, this actually returns
-- ALL RCB players (any role) PLUS all Batsman-only-if-CSK — not what you intended.
-- SELECT * FROM ipl_players WHERE role = 'Batsman' AND team = 'RCB' OR team = 'CSK';
```

### Pattern matching with `LIKE`
- `%` matches **any sequence of characters** (including zero).
- `_` matches **exactly one character**.
```sql
SELECT * FROM ipl_players WHERE name LIKE 'R%';      -- starts with 'R'
SELECT * FROM ipl_players WHERE name LIKE '_a%';     -- 2nd letter is 'a'
SELECT * FROM ipl_players WHERE name NOT LIKE 'R%';  -- does NOT start with 'R'
```
> **Fresher gap-filler**: Postgres also has **`ILIKE`**, which is a case-*insensitive* version of `LIKE` (MySQL's `LIKE` is case-insensitive by default, but Postgres's is case-sensitive — use `ILIKE` when case shouldn't matter, e.g. searching usernames).

### Sorting — `ORDER BY`
```sql
SELECT name, runs_scored FROM ipl_players ORDER BY runs_scored DESC;   -- highest first
SELECT name, auction_price_crores FROM ipl_players ORDER BY auction_price_crores ASC;  -- lowest first

-- Multi-column sort: team A-Z, then price high-to-low within each team
SELECT team, name, auction_price_crores
FROM ipl_players
ORDER BY team ASC, auction_price_crores DESC;
```

### Pagination — `LIMIT` and `OFFSET`
```sql
-- Page 1: top 3 most expensive
SELECT name, auction_price_crores FROM ipl_players
ORDER BY auction_price_crores DESC LIMIT 3;

-- Page 2: skip the first 3, then take the next 3
SELECT name, auction_price_crores FROM ipl_players
ORDER BY auction_price_crores DESC LIMIT 3 OFFSET 3;
```
- **`LIMIT`**: how many rows to actually return, *after* sorting.
- **`OFFSET`**: how many rows to *skip* before returning results — think of it as "skip N rows, then start counting." If you don't specify `OFFSET`, it's assumed to be `0`.
- **Pagination formula**: `OFFSET = (page_number - 1) * page_size`, `LIMIT = page_size`. E.g., page 3 with 10 items per page → `LIMIT 10 OFFSET 20`.
- **Note**: `OFFSET` gets slower as it grows on large tables — see the "keyset pagination" alternative in [12-Query-Optimization-Playbook.md](12-Query-Optimization-Playbook.md).

### Transforming data at query time (aliases)
```sql
SELECT name, auction_price_crores,
       (auction_price_crores * 100) AS price_in_lakhs
FROM ipl_players;
```
- `AS` creates an **alias** — a temporary, run-time label for a computed column. This value is **never saved** to the database; it's computed fresh on every query, purely for the response.

### DISTINCT — unique values only
```sql
SELECT DISTINCT role FROM ipl_players;   -- list every unique role, no duplicates
```
> For the deeper `DISTINCT ON`, multi-column, and `COUNT(DISTINCT ...)` patterns, see [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md#distinct).

---

**Next up:** [04-Aggregation-GroupBy-Having.md](04-Aggregation-GroupBy-Having.md) — summarizing data with `GROUP BY` and aggregate functions.
