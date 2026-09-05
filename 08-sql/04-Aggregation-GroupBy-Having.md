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
```

## Basic aggregate functions
```sql
SELECT COUNT(*) AS total_transactions FROM smart_watch_sales;         -- row count (avoid on huge prod tables — can be slow)
SELECT SUM(units_sold * price_per_unit) AS total_revenue FROM smart_watch_sales;
SELECT AVG(price_per_unit) AS avg_watch_price FROM smart_watch_sales;
SELECT MIN(price_per_unit) AS cheapest, MAX(price_per_unit) AS costliest FROM smart_watch_sales;
```

## GROUP BY — the real power tool
```sql
-- Total units sold per brand
SELECT brand, SUM(units_sold) AS total_units_sold
FROM smart_watch_sales
GROUP BY brand
ORDER BY total_units_sold DESC;

-- Multi-column grouping: units sold per brand, within each city
SELECT city, brand, SUM(units_sold) AS units
FROM smart_watch_sales
GROUP BY city, brand
ORDER BY city ASC, units DESC;
```
**The rule that trips up beginners**: any column you `SELECT` that is *not* wrapped in an aggregate function **must** appear in the `GROUP BY` clause — otherwise Postgres throws an error, because it doesn't know which single row's value to show for a column that wasn't aggregated or grouped.

## HAVING — filtering *after* aggregation
```sql
-- Brands that sold more than 20 units total.
-- WHERE cannot filter on SUM(...) because WHERE runs BEFORE aggregation happens.
SELECT brand, SUM(units_sold) AS total_units
FROM smart_watch_sales
GROUP BY brand
HAVING SUM(units_sold) > 20;
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
