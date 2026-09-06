# Shared Dataset — Subqueries / CTEs / Window Functions

> Part of the [14 — Advanced Queries](14-Subqueries-CTEs-Window-Functions.md) series.
> Every example in [14b](14b-Subqueries.md), [14c](14c-CTEs-Common-Table-Expressions.md) and [14d](14d-Window-Functions.md) runs against these tables. Create them once, then follow along.

---

## Schema

```sql
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name       VARCHAR(100),
    branch     VARCHAR(50)
);

CREATE TABLE exam_scores (
    exam_id    SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    subject    VARCHAR(50),
    score      INT
);

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    title      VARCHAR(100),
    marks      INT
);

-- Filled later by an INSERT ... SELECT in 14b §4
CREATE TABLE high_scorers_report (
    student_id   INT,
    student_name VARCHAR(100),
    subject      VARCHAR(50),
    score        INT
);
```

## Seed data

```sql
INSERT INTO students (name, branch) VALUES
('Rahul', 'CSE'),   -- id 1
('Sneha', 'IT'),    -- id 2
('Amit',  'ECE'),   -- id 3
('Priya', 'CSE'),   -- id 4
('Rohan', 'ME');    -- id 5

INSERT INTO exam_scores (student_id, subject, score) VALUES
(1, 'DBMS',    95),
(1, 'Maths',   88),
(2, 'DBMS',    72),
(2, 'Maths',   60),
(3, 'DBMS',    91),
(3, 'Maths',   45),
(4, 'DBMS',    98),
(4, 'Maths',   93),
(5, 'DBMS',    55);   -- Rohan has only one exam

INSERT INTO projects (student_id, title, marks) VALUES
(1, 'Chat App',        87),
(3, 'Compiler',        90),
(4, 'ML Model',        95),
(2, 'Portfolio Site',  70);   -- Rohan has no project; Sneha's marks are low
```

## Numbers worth memorising

```text
 student_id | name  | branch      AVG(score) across ALL 9 exam_scores rows
------------+-------+--------      = (95+88+72+60+91+45+98+93+55) / 9
          1 | Rahul | CSE         = 697 / 9  ≈  77.44
          2 | Sneha | IT
          3 | Amit  | ECE         Per-subject totals:
          4 | Priya | CSE           DBMS  = 95+72+91+98+55 = 411
          5 | Rohan | ME            Maths = 88+60+45+93    = 286
```

- **Class average score ≈ 77.44.** Rows above it: Rahul/DBMS (95), Rahul/Maths (88), Amit/DBMS (91), Priya/DBMS (98), Priya/Maths (93). Everything else is below.
- **Per-student total score:** Rahul 183, Sneha 132, Amit 136, Priya 191, Rohan 55.

---

## Extra table — `bank_transactions`

Used only by [14d §4 (running balance)](14d-Window-Functions.md#4-partition-by--order-by--a-running-balance). Unrelated to students, so it's optional until you get there.

```sql
CREATE TABLE bank_transactions (
    txn_id           SERIAL PRIMARY KEY,
    account_holder   VARCHAR(50),
    transaction_date DATE,
    transaction_type VARCHAR(20),
    amount           NUMERIC(10,2)
);

INSERT INTO bank_transactions
    (account_holder, transaction_date, transaction_type, amount) VALUES
('Shubham', '2026-01-01', 'DEPOSIT',   1000),
('Shubham', '2026-01-03', 'WITHDRAW',  -200),
('Shubham', '2026-01-05', 'DEPOSIT',    500),
('Shubham', '2026-01-07', 'WITHDRAW',  -100),
('Rahul',   '2026-01-01', 'DEPOSIT',   2000),
('Rahul',   '2026-01-04', 'WITHDRAW',  -300),
('Rahul',   '2026-01-06', 'DEPOSIT',    400);
```

---

**Back to:** [14 — Advanced Queries overview](14-Subqueries-CTEs-Window-Functions.md)
