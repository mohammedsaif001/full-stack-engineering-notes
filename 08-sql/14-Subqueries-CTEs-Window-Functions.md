# Advanced Queries — Subqueries, CTEs & Window Functions

> Previous: [13-Interview-Quick-Reference-Whats-Next.md](13-Interview-Quick-Reference-Whats-Next.md)

This is the **overview / index** for the three "advanced query" tools. Each gets its own deep-dive file, and they all run against one shared dataset.

---

## The three tools at a glance

| Tool | One-line intuition | Reach for it when… | Deep dive |
|---|---|---|---|
| **Subquery** | A query nested *inside* another query | You need a single value or a small list to filter/compare against, used once | [14b — Subqueries](14b-Subqueries.md) |
| **CTE** (`WITH`) | A named, temporary result you define once and reuse below | The same sub-result is needed 2+ times, or the query has become hard to read | [14c — CTEs](14c-CTEs-Common-Table-Expressions.md) |
| **Window function** | A calculation *across a set of rows* that still returns **every row** | You need ranking, running totals, "compare each row to its group" — without collapsing rows | [14d — Window Functions](14d-Window-Functions.md) |

## Read in this order

1. **[14a — Shared Dataset](14a-Shared-Dataset.md)** — create the tables (`students`, `exam_scores`, `projects`, `bank_transactions`) once. Every example below depends on it.
2. **[14b — Subqueries](14b-Subqueries.md)** — scalar `WHERE`, `IN` lists, `FROM` derived tables, `INSERT … SELECT`.
3. **[14c — CTEs](14c-CTEs-Common-Table-Expressions.md)** — the `WITH` blueprint, single & multiple CTEs, `CROSS JOIN`, `DISTINCT`, recursive CTEs. Rewrites 14b's examples so you can compare.
4. **[14d — Window Functions](14d-Window-Functions.md)** — `OVER()`, `PARTITION BY` (vs `ORDER BY`, vs `GROUP BY`), running totals, `ROW_NUMBER` / `RANK` / `DENSE_RANK`.

## 🎥 Video references

| Topic | Video |
|---|---|
| Subqueries | https://www.youtube.com/watch?v=6-Dsfgui0sE |
| CTEs | https://www.youtube.com/watch?v=3OGrCtdnSFA |
| Window functions | https://www.youtube.com/watch?v=Wh9yXS9sgio |

---

## Which one should I use?

All three produce an "intermediate" result, but they solve different shapes of problem.

| Situation | Best tool | Why |
|---|---|---|
| One value to compare against, used once (`> AVG`, `IN (…)`) | **Subquery** | Shortest; no ceremony |
| The same sub-result needed 2+ times, or 3+ levels of nesting | **CTE** | Name it once, reuse; reads top-to-bottom |
| Multi-step pipeline (filter → aggregate → join → filter again) | **CTE** (chained) | Each step is a named, testable block |
| Need per-row output *plus* a group calculation (running total, rank, "% of group") | **Window function** | Only tool that keeps every row *and* adds the group answer |
| "Nth highest / top-N per group" | **Window function inside a CTE** | `DENSE_RANK() OVER (PARTITION BY …)` in a CTE, then `WHERE rnk = N` outside |
| Result reused across *many separate queries* | none of these — use a **`VIEW`** | CTEs/subqueries live for one statement only |

### The same question, three ways

"Which exam scores are above the class average?"

```sql
-- Subquery: compact, the number is used and discarded
SELECT * FROM exam_scores
WHERE score > (SELECT AVG(score) FROM exam_scores);

-- CTE: the average gets a name and shows in the output
WITH cls_avg AS (SELECT AVG(score) AS a FROM exam_scores)
SELECT es.*, cls_avg.a
FROM exam_scores es CROSS JOIN cls_avg
WHERE es.score > cls_avg.a;

-- Window function: every row kept, each tagged with the average and its gap
SELECT *,
       AVG(score) OVER ()                    AS class_avg,
       score - AVG(score) OVER ()            AS diff_from_avg
FROM exam_scores;
```

> Same underlying idea; the right choice depends on whether you want to **filter** (subquery), **name and reuse** (CTE), or **annotate every row** (window function).

---

**Start here:** [14a — Shared Dataset](14a-Shared-Dataset.md) → [14b — Subqueries](14b-Subqueries.md)
**Next up:** back to [13-Interview-Quick-Reference-Whats-Next.md](13-Interview-Quick-Reference-Whats-Next.md) for the condensed Q&A.
