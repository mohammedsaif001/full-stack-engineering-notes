# Aggregation — GROUP BY, HAVING, and Aggregate Functions
## Turning Rows Into Summaries

> Previous: [03-DML-DQL-Insert-Update-Delete-Select.md](03-DML-DQL-Insert-Update-Delete-Select.md)

---

Plain DQL (`getUserById`, `getUserByUsername`) is good for simple app-level lookups. But **analytics questions** — "how much did Apple sell vs Noise?", "how much revenue per city?" — need **aggregation**: grouping rows by some shared attribute and computing a single summary value per group. Crucially, aggregation **never changes stored data** — it's computed at query time, same as aliases.

```sql
CREATE TABLE smart_watch_sales (
    sale_id SERIAL PRIMARY KEY,
    brand VARCHAR(50),
    model VARCHAR(100),
    city VARCHAR(50),
    units_sold INT,
    price_per_unit DECIMAL(10, 2),
    sale_date DATE
);

INSERT INTO smart_watch_sales (brand, model, city, units_sold, price_per_unit, sale_date) VALUES
('Boat',    'Storm Call',     'Mumbai',    10, 1500.00, '2023-10-01'),
('Boat',    'Storm Call',     'Delhi',     15, 1500.00, '2023-10-02'),
('Noise',   'ColorFit',       'Bangalore', 20, 2000.00, '2023-10-01'),
('Noise',   'ColorFit',       'Mumbai',     5, 2000.00, '2023-10-03'),
('Apple',   'Watch Series 9', 'Mumbai',     2, 45000.00, '2023-10-01'),
('Apple',   'Watch Series 9', 'Bangalore',  8, 45000.00, '2023-10-02'),
('Samsung', 'Galaxy Watch',   'Delhi',      3, 25000.00, '2023-10-01'),
('Boat',    'Xtend',          'Pune',      25, 1200.00, '2023-10-04'),
('Noise',   'Pro 4',          'Delhi',     12, 2500.00, '2023-10-05');
```
```text
INSERT 0 9
```

## Basic aggregate functions
```sql
SELECT COUNT(*) AS total_transactions FROM smart_watch_sales;         -- row count (avoid on huge prod tables — can be slow)
```
```text
 total_transactions
---------------------
                   9
(1 row)
```
```sql
SELECT SUM(units_sold * price_per_unit) AS total_revenue FROM smart_watch_sales;
```
```text
 total_revenue
----------------
     1105000.00
(1 row)
```
```sql
SELECT AVG(price_per_unit) AS avg_watch_price FROM smart_watch_sales;
```
```text
   avg_watch_price
-----------------------
 9577.7777777777777778
(1 row)
```
> `AVG()` on a `DECIMAL`/`NUMERIC` column returns a high-precision decimal by default in Postgres, not a rounded value — wrap it in `ROUND(AVG(price_per_unit), 2)` if you want `9577.78` for display.
```sql
SELECT MIN(price_per_unit) AS cheapest, MAX(price_per_unit) AS costliest FROM smart_watch_sales;
```
```text
 cheapest | costliest
----------+-----------
  1200.00 |  45000.00
(1 row)
```

## GROUP BY — the real power tool
```sql
-- Total units sold per brand
SELECT brand, SUM(units_sold) AS total_units_sold
FROM smart_watch_sales
GROUP BY brand
ORDER BY total_units_sold DESC;
```
```text
  brand  | total_units_sold
---------+-------------------
 Boat    |                50
 Noise   |                37
 Apple   |                10
 Samsung |                 3
(4 rows)
```
> `Boat` = 10 (Mumbai) + 15 (Delhi) + 25 (Pune) = 50. `GROUP BY brand` merged all 3 Boat rows into one summary row.

```sql
-- Multi-column grouping: units sold per brand, within each city
SELECT city, brand, SUM(units_sold) AS units
FROM smart_watch_sales
GROUP BY city, brand
ORDER BY city ASC, units DESC;
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
 Mumbai     | Noise   |     5
 Mumbai     | Apple   |     2
 Pune       | Boat    |    25
(9 rows)
```
> Each `(city, brand)` **pair** gets its own row now — grouping by two columns produces one row per unique combination, not per city and per brand separately.

**The rule that trips up beginners**: any column you `SELECT` that is *not* wrapped in an aggregate function **must** appear in the `GROUP BY` clause — otherwise Postgres throws an error, because it doesn't know which single row's value to show for a column that wasn't aggregated or grouped.
```sql
-- BAD: model is neither aggregated nor grouped
SELECT brand, model, SUM(units_sold) FROM smart_watch_sales GROUP BY brand;
```
```text
ERROR:  column "smart_watch_sales.model" must appear in the GROUP BY clause or be used in an aggregate function
LINE 1: SELECT brand, model, SUM(units_sold) FROM smart_watch_sale...
                       ^
```

## HAVING — filtering *after* aggregation
```sql
-- Brands that sold more than 20 units total.
-- WHERE cannot filter on SUM(...) because WHERE runs BEFORE aggregation happens.
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
> `Apple` (10 units) and `Samsung` (3 units) are filtered **out** entirely — `HAVING` discards whole groups that don't satisfy the condition, whereas `WHERE` would have discarded individual rows before grouping even happened.

```sql
-- What happens if you try WHERE instead of HAVING on an aggregate:
SELECT brand, SUM(units_sold) AS total_units
FROM smart_watch_sales
GROUP BY brand
WHERE SUM(units_sold) > 20;
```
```text
ERROR:  aggregate functions are not allowed in WHERE
LINE 4: WHERE SUM(units_sold) > 20;
              ^
```
| Clause | Filters... | Runs... |
|---|---|---|
| `WHERE` | individual rows | *before* grouping/aggregation |
| `HAVING` | aggregated groups | *after* grouping/aggregation |

> For the *full* execution order of every clause in a `SELECT` statement (including how `WHERE`/`GROUP BY`/`HAVING` relate to `ORDER BY` and `LIMIT`), see [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md#clause-execution-order).
>
> For window functions (`RANK()`, `SUM() OVER (...)`) — aggregation that does *not* collapse rows the way `GROUP BY` does — see [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md#window-functions).

---

**Next up:** [05-Joins-Combining-Tables.md](05-Joins-Combining-Tables.md) — combining multiple tables in one query.
