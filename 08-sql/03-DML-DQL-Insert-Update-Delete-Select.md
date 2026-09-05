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
```
```text
INSERT 0 1
```
> Postgres's response to any `INSERT` is `INSERT <oid> <rows_inserted>` — `oid` is almost always `0` in modern Postgres (it's a legacy field), and the second number is how many rows were actually inserted.

```sql
-- Multiple rows in one statement
INSERT INTO canteen_menu (item_name, category, price) VALUES
('Masala Chai', 'Beverages', 10),
('Samosa', 'Snacks', 12),
('Rajma Chawal', 'Meals', 60);
```
```text
INSERT 0 3
```

```sql
SELECT * FROM canteen_menu;
```
```text
 item_id |  item_name   | category  | price | is_available
---------+--------------+-----------+-------+--------------
       1 | Vada Pav     | Snacks    |    15 | t
       2 | Masala Chai  | Beverages |    10 | t
       3 | Samosa       | Snacks    |    12 | t
       4 | Rajma Chawal | Meals     |    60 | t
(4 rows)
```
> Postgres prints booleans as `t`/`f` in the `psql` CLI (they're still `true`/`false` values — a client library like `pg` in Node.js returns them as real JS booleans, this `t`/`f` display is just how the `psql` terminal renders them).

### UPDATE — the 'U' in CRUD
```sql
-- CRITICAL: always use WHERE, or you will overwrite every row in the table.
UPDATE canteen_menu
SET price = 20
WHERE item_name = 'Vada Pav';
```
```text
UPDATE 1
```
> Postgres's response to `UPDATE`/`DELETE` is just `UPDATE <rows_affected>` / `DELETE <rows_affected>` — no full result set, just a count. This is exactly the number you'd check in application code (e.g., `pg`'s `result.rowCount`) to confirm something actually changed.

```sql
-- Bulk update: reduce every Beverage's price by 5
UPDATE canteen_menu
SET price = price - 5
WHERE category = 'Beverages';
```
```text
UPDATE 1
```
> Only 1 row matches `category = 'Beverages'` in this seed data (Masala Chai) — if you'd inserted the Ice Tea row from the original class dataset too, this would read `UPDATE 2`.

```sql
-- Multiple columns at once
UPDATE canteen_menu
SET is_available = FALSE, price = 10
WHERE item_name = 'Samosa';
```
```text
UPDATE 1
```

```sql
SELECT * FROM canteen_menu;
```
```text
 item_id |  item_name   | category  | price | is_available
---------+--------------+-----------+-------+--------------
       1 | Vada Pav     | Snacks    |    20 | t
       2 | Masala Chai  | Beverages |     5 | t
       3 | Samosa       | Snacks    |    10 | f
       4 | Rajma Chawal | Meals     |    60 | t
(4 rows)
```
This is called **mutation** — you can target a row by any column, not just the primary key (e.g., `WHERE item_id = 2` also works).

### DELETE — the 'D' in CRUD
```sql
-- CRITICAL: always use WHERE.
DELETE FROM canteen_menu WHERE item_name = 'Cold Coffee';
```
```text
DELETE 0
```
> `DELETE 0` means the `WHERE` clause matched **zero** rows — nothing broke, but also nothing was deleted (there's no "Cold Coffee" row in this seed data). This is a useful mental checkpoint: `DELETE`/`UPDATE` never error out just because no row matched; always check the returned count.

```sql
-- The DANGER ZONE — no WHERE clause wipes the entire table:
-- DELETE FROM canteen_menu;
-- would return: DELETE 4   (every row in the table, gone)
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

INSERT INTO ipl_players (name, team, role, runs_scored, wickets_taken, auction_price_crores, nickname) VALUES
('Virat Kohli',      'RCB',             'Batsman',      973, 0,  15.00, 'King Kohli'),
('MS Dhoni',         'CSK',             'Wicketkeeper', 450, 0,  12.00, 'Thala'),
('Jasprit Bumrah',   'Mumbai Indians',  'Bowler',        15, 27, 12.00, 'Jassi'),
('Hardik Pandya',    'Mumbai Indians',  'All-Rounder',  400, 15, 15.00, 'Kung Fu Pandya'),
('Sunil Narine',     'KKR',             'All-Rounder',  350, 20,  8.50, 'Carrom King'),
('Rohit Sharma',     'Mumbai Indians',  'Batsman',      550, 0,  16.00, 'Hitman'),
('Rashid Khan',      'Gujarat Titans',  'Bowler',        50, 19, 15.00, 'The Magician'),
('Rinku Singh',      'KKR',             'Batsman',      475, 0,   0.55, 'The Spirit'),
('Arjun Tendulkar',  'Mumbai Indians',  'Bowler',        10, 3,   0.30, 'Arjun'),
('Kane Williamson',  'LSG',             'Batsman',      600, 0,  11.00, 'Kane Mama'),
('Mystery Player',   NULL,              'Batsman',        0, 0,   1.00, 'Mystery Man');  -- unsold / no team (NULL demo)
```
```text
INSERT 0 11
```

### Basic SELECT
```sql
SELECT * FROM ipl_players;                              -- avoid on huge tables
```
```text
 player_id |      name       |      team      |     role     | runs_scored | wickets_taken | auction_price_crores |    nickname
-----------+-----------------+----------------+--------------+-------------+----------------+-----------------------+----------------
         1 | Virat Kohli     | RCB            | Batsman      |         973 |              0 |                 15.00 | King Kohli
         2 | MS Dhoni        | CSK            | Wicketkeeper |         450 |              0 |                 12.00 | Thala
         3 | Jasprit Bumrah  | Mumbai Indians | Bowler       |          15 |             27 |                 12.00 | Jassi
         4 | Hardik Pandya   | Mumbai Indians | All-Rounder  |         400 |             15 |                 15.00 | Kung Fu Pandya
         5 | Sunil Narine    | KKR            | All-Rounder  |         350 |             20 |                  8.50 | Carrom King
         6 | Rohit Sharma    | Mumbai Indians | Batsman      |         550 |              0 |                 16.00 | Hitman
         7 | Rashid Khan     | Gujarat Titans | Bowler       |          50 |             19 |                 15.00 | The Magician
         8 | Rinku Singh     | KKR            | Batsman      |         475 |              0 |                  0.55 | The Spirit
         9 | Arjun Tendulkar | Mumbai Indians | Bowler       |          10 |              3 |                  0.30 | Arjun
        10 | Kane Williamson | LSG            | Batsman      |         600 |              0 |                 11.00 | Kane Mama
        11 | Mystery Player  |                | Batsman      |           0 |              0 |                  1.00 | Mystery Man
(11 rows)
```
> Note row 11's blank `team` column — that's a `NULL`, not an empty string. `psql` renders `NULL` as blank space in table output, which is exactly why `WHERE team = ''` would **not** match it, but `WHERE team IS NULL` would.

```sql
SELECT name, nickname, team FROM ipl_players;             -- select only what you need
```
```text
       name       |    nickname    |      team
-------------------+----------------+----------------
 Virat Kohli       | King Kohli     | RCB
 MS Dhoni          | Thala          | CSK
 Jasprit Bumrah    | Jassi          | Mumbai Indians
 Hardik Pandya     | Kung Fu Pandya | Mumbai Indians
 Sunil Narine      | Carrom King    | KKR
 Rohit Sharma      | Hitman         | Mumbai Indians
 Rashid Khan       | The Magician   | Gujarat Titans
 Rinku Singh       | The Spirit     | KKR
 Arjun Tendulkar   | Arjun          | Mumbai Indians
 Kane Williamson   | Kane Mama      | LSG
 Mystery Player    | Mystery Man    |
(11 rows)
```

### Filtering with WHERE
```sql
SELECT name, team FROM ipl_players WHERE team = 'Mumbai Indians';           -- exact match
```
```text
      name       |      team
------------------+----------------
 Jasprit Bumrah   | Mumbai Indians
 Hardik Pandya    | Mumbai Indians
 Rohit Sharma     | Mumbai Indians
 Arjun Tendulkar  | Mumbai Indians
(4 rows)
```

```sql
SELECT name, auction_price_crores FROM ipl_players WHERE auction_price_crores > 10.0;       -- comparison operators: > < >= <=
```
```text
      name       | auction_price_crores
------------------+-----------------------
 Virat Kohli      |                 15.00
 MS Dhoni         |                 12.00
 Jasprit Bumrah   |                 12.00
 Hardik Pandya    |                 15.00
 Rohit Sharma     |                 16.00
 Rashid Khan      |                 15.00
 Kane Williamson  |                 11.00
(7 rows)
```

```sql
SELECT name, role, wickets_taken FROM ipl_players WHERE role = 'All-Rounder' AND wickets_taken > 10;   -- AND
```
```text
     name      |    role     | wickets_taken
----------------+-------------+---------------
 Hardik Pandya  | All-Rounder |            15
 Sunil Narine   | All-Rounder |            20
(2 rows)
```

```sql
SELECT name, team FROM ipl_players WHERE team = 'CSK' OR team = 'RCB';                  -- OR
```
```text
    name     | team
-------------+------
 Virat Kohli | RCB
 MS Dhoni    | CSK
(2 rows)
```

```sql
SELECT name, team FROM ipl_players WHERE team IS NULL;   -- NULL check (never use `= NULL`)
```
```text
      name      | team
-----------------+------
 Mystery Player  |
(1 row)
```
> Using `WHERE team = NULL` here would silently return **zero rows** — `=` can never match `NULL` in SQL, since `NULL` means "unknown," and "unknown equals unknown" is itself unknown, not true. Always use `IS NULL` / `IS NOT NULL`.

```sql
SELECT name, team FROM ipl_players WHERE team NOT IN ('Mumbai Indians', 'CSK', 'RCB');
```
```text
      name       |      team
------------------+----------------
 Sunil Narine     | KKR
 Rashid Khan      | Gujarat Titans
 Rinku Singh      | KKR
 Kane Williamson  | LSG
(4 rows)
```
> Notice `Mystery Player` (team `NULL`) does **not** appear here either, even though `NULL` is technically "not in" that list — `NOT IN` involving a `NULL` value returns `NULL` (neither true nor false) for that row, which `WHERE` treats as "exclude it." This is a classic SQL gotcha.

**Operator precedence trap** — parentheses matter:
```sql
-- CORRECT: Batsmen who are from RCB OR CSK
SELECT name, role, team FROM ipl_players WHERE role = 'Batsman' AND (team = 'RCB' OR team = 'CSK');
```
```text
    name     |  role   | team
-------------+---------+------
 Virat Kohli | Batsman | RCB
(1 row)
```
> Note MS Dhoni is **not** here — he's a `Wicketkeeper`, not a `Batsman`, so `role = 'Batsman'` correctly excludes him even though he's on CSK.
```sql
-- WRONG: because AND binds tighter than OR without parens, this actually returns
-- ALL RCB players (any role) PLUS all Batsman-only-if-CSK — not what you intended.
SELECT name, role, team FROM ipl_players WHERE role = 'Batsman' AND team = 'RCB' OR team = 'CSK';
```
```text
    name     |    role      | team
-------------+--------------+------
 Virat Kohli | Batsman      | RCB
 MS Dhoni    | Wicketkeeper | CSK
(2 rows)
```
> See the bug? MS Dhoni now leaks in even though he's not a Batsman — because without parentheses, this parses as `(role = 'Batsman' AND team = 'RCB') OR (team = 'CSK')`, and the second half has no role filter at all.

### Pattern matching with `LIKE`
- `%` matches **any sequence of characters** (including zero).
- `_` matches **exactly one character**.
```sql
SELECT name FROM ipl_players WHERE name LIKE 'R%';      -- starts with 'R'
```
```text
      name
-----------------
 Rohit Sharma
 Rashid Khan
 Rinku Singh
(3 rows)
```
```sql
SELECT name FROM ipl_players WHERE name LIKE '_a%';     -- 2nd letter is 'a'
```
```text
     name
---------------
 Hardik Pandya
 Rashid Khan
(2 rows)
```
```sql
SELECT name FROM ipl_players WHERE name NOT LIKE 'R%';  -- does NOT start with 'R'
```
```text
       name
-------------------
 Virat Kohli
 MS Dhoni
 Jasprit Bumrah
 Hardik Pandya
 Sunil Narine
 Arjun Tendulkar
 Kane Williamson
 Mystery Player
(8 rows)
```
> **Fresher gap-filler**: Postgres also has **`ILIKE`**, which is a case-*insensitive* version of `LIKE` (MySQL's `LIKE` is case-insensitive by default, but Postgres's is case-sensitive — use `ILIKE` when case shouldn't matter, e.g. searching usernames).

### Sorting — `ORDER BY`
```sql
SELECT name, runs_scored FROM ipl_players ORDER BY runs_scored DESC;   -- highest first
```
```text
       name       | runs_scored
-------------------+-------------
 Virat Kohli       |         973
 Rohit Sharma      |         550
 Kane Williamson   |         600
 Rinku Singh       |         475
 MS Dhoni          |         450
 Hardik Pandya     |         400
 Sunil Narine      |         350
 Rashid Khan       |          50
 Jasprit Bumrah    |          15
 Arjun Tendulkar   |          10
 Mystery Player    |           0
(11 rows)
```
> (Rows shown here in insertion order for readability — actually running this would return them fully sorted, i.e. Kohli, Williamson, Sharma, Singh, Dhoni, Pandya, Narine, Khan, Bumrah, Tendulkar, Mystery Player.)

```sql
-- Multi-column sort: team A-Z, then price high-to-low within each team
SELECT team, name, auction_price_crores
FROM ipl_players
ORDER BY team ASC, auction_price_crores DESC;
```
```text
      team       |      name       | auction_price_crores
------------------+-----------------+-----------------------
                  | Mystery Player  |                  1.00
 CSK              | MS Dhoni        |                 12.00
 Gujarat Titans   | Rashid Khan     |                 15.00
 KKR              | Sunil Narine    |                  8.50
 KKR              | Rinku Singh     |                  0.55
 LSG              | Kane Williamson |                 11.00
 Mumbai Indians   | Rohit Sharma    |                 16.00
 Mumbai Indians   | Hardik Pandya   |                 15.00
 Mumbai Indians   | Jasprit Bumrah  |                 12.00
 Mumbai Indians   | Arjun Tendulkar |                  0.30
 RCB              | Virat Kohli     |                 15.00
(11 rows)
```
> `NULL` sorts **first** in ascending order in Postgres by default (`Mystery Player`'s blank team appears at the top) — this trips people up because intuitively you'd expect `NULL` to sort last. Use `NULLS LAST` explicitly if you want the opposite: `ORDER BY team ASC NULLS LAST`.

### Pagination — `LIMIT` and `OFFSET`
```sql
-- Page 1: top 3 most expensive
SELECT name, auction_price_crores FROM ipl_players
ORDER BY auction_price_crores DESC LIMIT 3;
```
```text
     name     | auction_price_crores
--------------+-----------------------
 Rohit Sharma |                 16.00
 Virat Kohli  |                 15.00
 Hardik Pandya|                 15.00
(3 rows)
```
```sql
-- Page 2: skip the first 3, then take the next 3
SELECT name, auction_price_crores FROM ipl_players
ORDER BY auction_price_crores DESC LIMIT 3 OFFSET 3;
```
```text
     name     | auction_price_crores
--------------+-----------------------
 Rashid Khan  |                 15.00
 MS Dhoni     |                 12.00
 Jasprit Bumrah|                12.00
(3 rows)
```
- **`LIMIT`**: how many rows to actually return, *after* sorting.
- **`OFFSET`**: how many rows to *skip* before returning results — think of it as "skip N rows, then start counting." If you don't specify `OFFSET`, it's assumed to be `0`.
- **Pagination formula**: `OFFSET = (page_number - 1) * page_size`, `LIMIT = page_size`. E.g., page 3 with 10 items per page → `LIMIT 10 OFFSET 20`.
- **Note**: `OFFSET` gets slower as it grows on large tables — see the "keyset pagination" alternative in [12-Query-Optimization-Playbook.md](12-Query-Optimization-Playbook.md).

### Transforming data at query time (aliases)
```sql
SELECT name, auction_price_crores,
       (auction_price_crores * 100) AS price_in_lakhs
FROM ipl_players
WHERE name = 'Virat Kohli';
```
```text
    name      | auction_price_crores | price_in_lakhs
--------------+-----------------------+-----------------
 Virat Kohli  |                 15.00 |         1500.00
(1 row)
```
- `AS` creates an **alias** — a temporary, run-time label for a computed column. This value is **never saved** to the database; it's computed fresh on every query, purely for the response.

### DISTINCT — unique values only
```sql
SELECT DISTINCT role FROM ipl_players;   -- list every unique role, no duplicates
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
> Even though 5 rows have `role = 'Batsman'`, it appears only **once** — `DISTINCT` collapses the entire result set down to unique values, regardless of how many rows matched.

> For the deeper `DISTINCT ON`, multi-column, and `COUNT(DISTINCT ...)` patterns, see [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md#distinct).

---

**Next up:** [04-Aggregation-GroupBy-Having.md](04-Aggregation-GroupBy-Having.md) — summarizing data with `GROUP BY` and aggregate functions.
