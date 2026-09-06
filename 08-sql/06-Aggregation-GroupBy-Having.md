# Aggregation — GROUP BY, HAVING & Clause Execution Order
## Part 6 of 19 — Turning Many Rows Into One Summary Number

> Previous: [05-DQL-Select-Where-Filtering.md](05-DQL-Select-Where-Filtering.md)

---

## 📌 Executive Summary

- **Aggregation** collapses many rows into one summary value: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. It never changes stored data — it's computed at query time.
- **`GROUP BY col`** splits rows into groups sharing the same `col` value, then produces **one summary row per group**. The individual rows are gone from the result.
- **The rule that trips up everyone:** every column in the `SELECT` list must either be *inside an aggregate* or *listed in `GROUP BY`*. Otherwise Postgres doesn't know which row's value to show.
- **`WHERE` filters rows *before* grouping; `HAVING` filters groups *after*.** `WHERE SUM(...) > 10` is an error; `HAVING SUM(...) > 10` is correct.
- **Clauses are written in one order but execute in another.** Execution: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. This single fact explains why `WHERE` can't see aggregates and why a `SELECT` alias can't be used in `WHERE`.
- **`COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values of `col`; `COUNT(DISTINCT col)` counts unique non-NULL values.**

---

## 🧠 Core Analogy: The Pivot Table

A spreadsheet **pivot table** takes 10,000 sales rows and shows you "total revenue per region" — 5 rows. You picked a field to group by (region), a field to summarise (revenue), and a function (sum). The 10,000 detail rows are folded away; you see only the 5 summaries.

`GROUP BY region` + `SUM(revenue)` is exactly that pivot table, expressed as a query. And just as a pivot table can't show you an individual salesperson's name next to a region total (which salesperson?), a `GROUP BY` query can't `SELECT` a column that isn't grouped or aggregated.

---

Uses a small self-contained `smart_watch_sales` table:

```sql
CREATE TABLE smart_watch_sales (
    sale_id        SERIAL PRIMARY KEY,
    brand          VARCHAR(50),
    model          VARCHAR(100),
    city           VARCHAR(50),
    units_sold     INT,
    price_per_unit DECIMAL(10, 2),
    sale_date      DATE
);

INSERT INTO smart_watch_sales (brand, model, city, units_sold, price_per_unit, sale_date) VALUES
('Boat',    'Storm Call',     'Mumbai',    10,  1500.00, '2023-10-01'),
('Boat',    'Storm Call',     'Delhi',     15,  1500.00, '2023-10-02'),
('Noise',   'ColorFit',       'Bangalore', 20,  2000.00, '2023-10-01'),
('Noise',   'ColorFit',       'Mumbai',     5,  2000.00, '2023-10-03'),
('Apple',   'Watch Series 9', 'Mumbai',     2, 45000.00, '2023-10-01'),
('Apple',   'Watch Series 9', 'Bangalore',  8, 45000.00, '2023-10-02'),
('Samsung', 'Galaxy Watch',   'Delhi',      3, 25000.00, '2023-10-01'),
('Boat',    'Xtend',          'Pune',      25,  1200.00, '2023-10-04'),
('Noise',   'Pro 4',          'Delhi',     12,  2500.00, '2023-10-05');
```

---

## 🔢 1. Aggregate functions (no `GROUP BY` yet — the whole table is one group)

```sql
SELECT COUNT(*) AS total_transactions FROM smart_watch_sales;                 -- 9
SELECT SUM(units_sold * price_per_unit) AS total_revenue FROM smart_watch_sales;  -- 1105000.00
SELECT AVG(price_per_unit) AS avg_price FROM smart_watch_sales;               -- 9577.777...
SELECT MIN(price_per_unit) AS cheapest, MAX(price_per_unit) AS costliest FROM smart_watch_sales;
```

| Function | Counts / computes | `NULL` handling |
|---|---|---|
| `COUNT(*)` | Number of rows | Counts every row |
| `COUNT(col)` | Number of **non-NULL** values in `col` | Skips `NULL` |
| `COUNT(DISTINCT col)` | Number of **unique non-NULL** values | Skips `NULL` |
| `SUM(col)` / `AVG(col)` | Total / mean of non-NULL values | Skips `NULL` (so `AVG` divides by the non-NULL count) |
| `MIN(col)` / `MAX(col)` | Smallest / largest non-NULL value | Skips `NULL` |

> `AVG()` on a `NUMERIC` column returns a long, unrounded decimal. Wrap it: `ROUND(AVG(price_per_unit), 2)` → `9577.78`.

---

## 📊 2. `GROUP BY` — one summary row per group

```sql
SELECT brand, SUM(units_sold) AS total_units
FROM smart_watch_sales
GROUP BY brand
ORDER BY total_units DESC;
```
```text
  brand  | total_units
---------+-------------
 Boat    |          50
 Noise   |          37
 Apple   |          10
 Samsung |           3
(4 rows)
```
> `Boat` = 10 (Mumbai) + 15 (Delhi) + 25 (Pune). `GROUP BY brand` folded all three Boat rows into one.

### Grouping by multiple columns → one row per unique combination

```sql
SELECT city, brand, SUM(units_sold) AS units
FROM smart_watch_sales
GROUP BY city, brand
ORDER BY city, units DESC;
```
```text
    city    |  brand  | units
------------+---------+-------
 Bangalore  | Noise   |    20
 Bangalore  | Apple   |     8
 Delhi      | Boat    |    15
 Delhi      | Noise   |    12
 Delhi      | Samsung |     3
 Mumbai     | Boat    |    10
 ...
(9 rows)
```

### The rule: non-aggregated `SELECT` columns must be in `GROUP BY`

```sql
-- ERROR: model is neither grouped nor aggregated
SELECT brand, model, SUM(units_sold) FROM smart_watch_sales GROUP BY brand;
```
```text
ERROR:  column "smart_watch_sales.model" must appear in the GROUP BY clause
        or be used in an aggregate function
```
> Postgres can't pick "the model" for a brand group — Boat has three different models. Either group by `model` too, or aggregate it (`MAX(model)`, `STRING_AGG(model, ', ')`), or drop it from the `SELECT`.

---

## 🚪 3. `WHERE` vs `HAVING`

```sql
-- Brands that sold more than 20 units total
SELECT brand, SUM(units_sold) AS total_units
FROM smart_watch_sales
GROUP BY brand
HAVING SUM(units_sold) > 20;
```
```text
 brand | total_units
-------+-------------
 Boat  |          50
 Noise |          37
(2 rows)
```

```sql
-- The same condition in WHERE is an error
SELECT brand, SUM(units_sold) FROM smart_watch_sales
GROUP BY brand
WHERE SUM(units_sold) > 20;
```
```text
ERROR:  aggregate functions are not allowed in WHERE
```

| Clause | Filters | Runs |
|---|---|---|
| `WHERE` | Individual **rows** | *Before* grouping — no aggregates allowed |
| `HAVING` | Whole **groups** | *After* grouping — aggregates allowed |

You often use **both** — `WHERE` to discard rows before they're grouped (cheaper), `HAVING` to discard resulting groups:

```sql
SELECT brand, SUM(units_sold) AS total_units
FROM smart_watch_sales
WHERE sale_date >= '2023-10-02'      -- drop early sales BEFORE grouping
GROUP BY brand
HAVING SUM(units_sold) > 10;         -- keep only big-selling brands AFTER grouping
```

---

## ⚙️ 4. Clause execution order — the key mental model

You **write** clauses in this order:

```sql
SELECT   [DISTINCT] column_list
FROM     table
JOIN     other_table ON ...
WHERE    row_condition
GROUP BY column_list
HAVING   group_condition
ORDER BY column_list
LIMIT    n OFFSET m;
```

Postgres **executes** them in this order:

```text
1. FROM / JOIN     → assemble the working set of rows
2. WHERE           → filter rows (no aggregates, no SELECT aliases yet)
3. GROUP BY        → bucket rows into groups
4. HAVING          → filter groups (aggregates allowed)
5. SELECT          → compute the output columns & aliases  ← aliases are BORN here
6. DISTINCT        → drop duplicate output rows
7. ORDER BY        → sort (CAN use SELECT aliases)
8. LIMIT / OFFSET  → slice
```

This one ordering explains three things freshers keep hitting:

| "Why can't I…" | Because… |
|---|---|
| …use `SUM(x)` in `WHERE`? | `WHERE` (step 2) runs before `GROUP BY` (step 3) — there are no groups to sum yet. Use `HAVING`. |
| …use a `SELECT` alias in `WHERE`? | The alias is created in `SELECT` (step 5), long after `WHERE` (step 2). Repeat the full expression, or wrap the query. |
| …use a `SELECT` alias in `ORDER BY`? | You **can** — `ORDER BY` (step 7) runs *after* `SELECT` (step 5). |

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| `COUNT(*)` vs `COUNT(col)`? | `COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values of that column |
| `WHERE` vs `HAVING`? | `WHERE` filters rows before grouping; `HAVING` filters groups after — only `HAVING` can reference aggregates |
| Why must non-aggregated `SELECT` columns be in `GROUP BY`? | Otherwise the database can't decide which row's value to show for that column within a group |
| What's the real clause execution order? | `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT` |
| Can `ORDER BY` use a `SELECT` alias? Can `WHERE`? | `ORDER BY` yes (runs after `SELECT`); `WHERE` no (runs before) |
| Does `AVG` include `NULL`s in its divisor? | No — it sums non-NULL values and divides by the non-NULL count |

---

**Next up:** [07-Joins-Combining-Tables.md](07-Joins-Combining-Tables.md) — pulling columns from multiple tables in one query: INNER, LEFT, RIGHT, FULL, SELF, CROSS, and set operations.
