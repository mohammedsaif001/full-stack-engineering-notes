# Setting Up PostgreSQL — Docker, psql & VS Code
## Part 0 of 19 — Get a Working Database Before Writing a Single Query

---

## 📌 Executive Summary

- You need three things to practice SQL: **a running Postgres server**, **a way to type queries at it**, and **sample data to query**. This file gets all three in place.
- The fastest, cleanest way to run Postgres on any OS is **Docker** — one command gives you a throwaway database that you can delete and recreate in seconds, with nothing installed system-wide.
- **`psql`** is the official command-line client that ships with Postgres. It's how you run queries, and it has its own set of backslash commands (`\l`, `\c`, `\dt`, `\d`) that are *not* SQL — they're psql shortcuts for inspecting the database.
- **VS Code** with the **SQLTools** extension + its **PostgreSQL driver** gives you a GUI-ish experience: write queries in a `.sql` file, press a key, see results in a panel — no terminal needed.
- A **server** can hold **many databases**; a **database** holds **many tables**. `CREATE DATABASE` makes a new one; you connect *to* one at a time.
- Two practice datasets are defined at the end of this file (`company` and `campus`). Later files reference them by name instead of re-creating tables every time.

---

## 🧠 Core Analogy: The Office Building

- **The Postgres server** = an office building. It's running, it has an address (`localhost:5432`), and it can house many independent departments.
- **A database** = one department inside that building (`company_db`, `campus_db`). Departments don't share desks — data in one database can't directly see data in another.
- **A table** = one filing cabinet inside a department (`employees`, `students`).
- **`psql` / SQLTools** = you, walking into the building with a clipboard, telling a specific department what you need.
- **Docker** = a prefab, self-contained office building you drop onto an empty lot in 30 seconds — and can haul away just as fast, leaving no trace.

---

## 🐳 1. Run Postgres with Docker (recommended)

**Why Docker first:** no system-wide install, no "it works on my machine" version drift, and you can destroy a broken database and start fresh with two commands. If you don't have Docker, install **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux) first — that's the only prerequisite.

### Start a container

```bash
docker run --name pg-practice \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:16
```

Line by line:

| Flag | Meaning |
|---|---|
| `--name pg-practice` | A friendly name so you can `docker stop pg-practice` later instead of copying a container ID |
| `-e POSTGRES_PASSWORD=postgres` | **Required.** The password for the default `postgres` superuser. The image refuses to start without it |
| `-e POSTGRES_USER=postgres` | The superuser's name (defaults to `postgres` anyway — shown here for clarity) |
| `-e POSTGRES_DB=postgres` | A database created automatically on first boot |
| `-p 5432:5432` | Maps **your machine's** port 5432 → the **container's** port 5432. `host:container`. If 5432 is already taken on your machine, use `-p 5433:5432` and connect to `5433` instead |
| `-d` | "Detached" — run in the background and give you your terminal back |
| `postgres:16` | The image name and version tag. Always pin a version; `postgres:latest` can silently jump major versions |

### Everyday container commands

```bash
docker ps                    # is it running? (shows running containers)
docker stop pg-practice      # stop it (data is kept)
docker start pg-practice     # start it back up
docker rm -f pg-practice     # delete the container entirely (data is GONE unless you used a volume)
docker logs pg-practice      # see the server's startup / error output
```

> **Data persistence note:** without a volume, everything you insert lives *inside the container* and is destroyed by `docker rm`. For throwaway practice that's fine — even desirable. If you want data to survive a `docker rm`, add `-v pg-practice-data:/var/lib/postgresql/data` to the `docker run` command; that stores the files in a named Docker volume instead.

### Open a psql shell inside the container

```bash
docker exec -it pg-practice psql -U postgres
```

- `exec -it` = run a command inside the already-running container, interactively.
- `psql -U postgres` = launch psql as the `postgres` user.
- Your prompt changes to `postgres=#` — you're now talking to the database. Type `\q` to quit back to your normal shell.

---

## 💻 2. Native install (alternative to Docker)

If you'd rather install Postgres directly:

- **Windows**: download the installer from [enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads). It bundles the server, `psql`, and **pgAdmin** (a full GUI). During install, set a password for the `postgres` user and **remember it**. The installer usually offers to add `psql` to your `PATH` — accept that, or add `C:\Program Files\PostgreSQL\16\bin` to `PATH` manually so `psql` works from any terminal.
- **macOS**: `brew install postgresql@16`, then `brew services start postgresql@16`.
- **Linux (Debian/Ubuntu)**: `sudo apt install postgresql`, then `sudo -u postgres psql`.

The rest of this series works identically whether Postgres came from Docker or a native install — only *how you launch psql* differs.

---

## ⌨️ 3. psql basics — SQL vs backslash commands

Once you're at the `postgres=#` prompt, there are **two kinds of things you can type**:

1. **SQL statements** — end with a semicolon `;`. `SELECT 1 + 1;`
2. **psql meta-commands** — start with a backslash `\`, **no semicolon**. These are psql features, not SQL, and won't work in SQLTools or application code.

| Meta-command | What it does |
|---|---|
| `\l` | **L**ist all databases on this server |
| `\c dbname` | **C**onnect to a different database (`\c company_db`) |
| `\dt` | **D**isplay **t**ables in the current database |
| `\d tablename` | **D**escribe one table — its columns, types, indexes, constraints |
| `\dn` | List schemas |
| `\du` | List roles/users |
| `\x` | Toggle "expanded" display — each row shown as a vertical block (great for wide tables) |
| `\?` | Help for meta-commands |
| `\h SELECT` | SQL syntax help for a specific statement |
| `\q` | **Q**uit psql |

```text
postgres=# SELECT 2 + 2 AS answer;
 answer
--------
      4
(1 row)

postgres=# \l
                              List of databases
   Name    |  Owner   | Encoding |  Collate   |   Ctype    | Access privileges
-----------+----------+----------+------------+------------+-------------------
 postgres  | postgres | UTF8     | en_US.utf8 | en_US.utf8 |
 template0 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | ...
 template1 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | ...
(3 rows)
```

> `template0` and `template1` are Postgres's internal skeletons that new databases are cloned from — leave them alone. You'll only ever work in databases you create yourself.

---

## 🏗️ 4. Creating and dropping databases

`CREATE DATABASE` and `DROP DATABASE` are **DDL** (Data Definition Language — see [01](01-Why-Databases-Exist-SQL-vs-NoSQL.md)), but they operate one level *above* tables: they manage whole databases, not the contents of one.

```sql
-- Run these while connected to the default `postgres` database
CREATE DATABASE company_db;
```
```text
CREATE DATABASE
```

```sql
CREATE DATABASE campus_db;
```
```text
CREATE DATABASE
```

Now switch into one:

```text
postgres=# \c company_db
You are now connected to database "company_db" as user "postgres".
company_db=#
```

> Notice the prompt changed from `postgres=#` to `company_db=#`. Every table you create now lives **inside `company_db`** and is invisible from `campus_db`. You can only be connected to one database at a time in a single psql session.

Removing a database:

```sql
DROP DATABASE IF EXISTS campus_db;
```
```text
DROP DATABASE
```

- **`IF EXISTS`** prevents an error if the database was never created — the same safety pattern you'll use everywhere (`DROP TABLE IF EXISTS`, `DROP INDEX IF EXISTS`).
- **You cannot drop a database you're currently connected to.** Postgres throws `cannot drop the currently open database`. Switch to `postgres` first with `\c postgres`, *then* drop.
- `DROP DATABASE` is **instant and irreversible** — every table, every row, gone. There is no transaction wrapper, no `ROLLBACK`. Treat it with the same fear as `rm -rf`.

Other database-level DDL you'll occasionally need:

```sql
ALTER DATABASE company_db RENAME TO company_prod_db;   -- rename (no active connections allowed)
```

---

## 🧩 5. VS Code setup — SQLTools + PostgreSQL driver

A terminal is fine, but most day-to-day query writing happens in an editor. VS Code's **SQLTools** extension turns a `.sql` file into an interactive query runner.

### Install the two extensions

1. Open the **Extensions** panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search **`SQLTools`** by *Matheus Teixeira* → **Install**. This is the core extension (connection manager, results grid, query runner).
3. Search **`SQLTools PostgreSQL/Cockroach Driver`** → **Install**. SQLTools itself speaks no database dialect; each database family needs its own driver plugin. Without this one, SQLTools can't connect to Postgres.

> The same pattern applies to other databases — there's a separate SQLTools driver for MySQL, SQLite, MSSQL, etc. You only install the driver(s) you actually use.

### Create a connection

1. Click the **SQLTools** icon in the Activity Bar (left sidebar) → **Add New Connection** → choose **PostgreSQL**.
2. Fill in the form:

   | Field | Value (matches the Docker command above) |
   |---|---|
   | Connection name | `Local Postgres — company_db` |
   | Server / Host | `localhost` |
   | Port | `5432` (or `5433` if you remapped it) |
   | Database | `company_db` |
   | Username | `postgres` |
   | Password | `postgres` — choose "Save as plaintext in settings" for local practice, or "Ask on connect" |

3. Click **Test Connection** → it should say *"Successfully connected!"* → **Save Connection**.

### Run queries

- Create a file, e.g. `scratch.sql`, and write SQL in it.
- Put the cursor inside a statement and press **`Ctrl+E Ctrl+E`** (run the statement under the cursor) or **`Ctrl+E Ctrl+A`** (run the whole file). Results open in a grid panel.
- The connection you're running against is shown in the status bar; click it to switch connections (e.g. between `company_db` and `campus_db`).

> **When to use which:** psql for quick one-offs, database administration, and anything scripted. SQLTools (or pgAdmin, or a JetBrains IDE) for iterating on a query you're actively building — the results grid and query history are worth it.

---

## 🌱 6. The practice datasets (used by the rest of this series)

Rather than every later file spinning up its own tables, the series standardises on **two** small datasets. Create each one *once*, in its own database, and later files will say "uses the `company` dataset" or "uses the `campus` dataset."

### Dataset A — `company` (used by aggregation, joins, window functions, interview patterns)

Connect to `company_db` (`\c company_db`), then:

```sql
DROP TABLE IF EXISTS employees;

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    department  VARCHAR(50),
    city        VARCHAR(50),
    salary      NUMERIC(10, 2),
    manager_id  INT REFERENCES employees(employee_id),   -- self-reference: an employee's manager is another employee
    hired_on    DATE
);

INSERT INTO employees (name, department, city, salary, manager_id, hired_on) VALUES
('Aditi',  'Engineering', 'Bangalore', 95000, NULL, '2019-03-01'),
('Rahul',  'Engineering', 'Bangalore', 88000, 1,    '2020-06-15'),
('Sneha',  'Engineering', 'Pune',      88000, 1,    '2020-07-01'),   -- tied salary with Rahul
('Kabir',  'Engineering', 'Bangalore', 72000, 1,    '2021-01-20'),
('Meera',  'Engineering', 'Pune',      65000, 2,    '2022-02-10'),
('Vikram', 'Sales',       'Mumbai',    78000, NULL, '2018-11-05'),
('Pooja',  'Sales',       'Mumbai',    78000, 6,    '2021-09-12'),   -- tied salary with Vikram
('Arjun',  'Sales',       'Delhi',     61000, 6,    '2022-05-30'),
('Farah',  'Marketing',   'Delhi',     70000, NULL, '2020-04-18'),
('Dev',    'Marketing',   'Delhi',     52000, 9,    '2023-01-09');
```
```text
INSERT 0 10
```

### Dataset B — `campus` (used by subqueries, CTEs, and some window-function examples)

Connect to `campus_db` (`\c campus_db`), then:

```sql
DROP TABLE IF EXISTS high_scorers_report, projects, exam_scores, students;

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

-- Populated later by an INSERT ... SELECT in file 08
CREATE TABLE high_scorers_report (
    student_id   INT,
    student_name VARCHAR(100),
    subject      VARCHAR(50),
    score        INT
);

INSERT INTO students (name, branch) VALUES
('Rahul', 'CSE'),   -- id 1
('Sneha', 'IT'),    -- id 2
('Amit',  'ECE'),   -- id 3
('Priya', 'CSE'),   -- id 4
('Rohan', 'ME');    -- id 5

INSERT INTO exam_scores (student_id, subject, score) VALUES
(1, 'DBMS',  95),
(1, 'Maths', 88),
(2, 'DBMS',  72),
(2, 'Maths', 60),
(3, 'DBMS',  91),
(3, 'Maths', 45),
(4, 'DBMS',  98),
(4, 'Maths', 93),
(5, 'DBMS',  55);   -- Rohan sat only one exam

INSERT INTO projects (student_id, title, marks) VALUES
(1, 'Chat App',       87),
(3, 'Compiler',       90),
(4, 'ML Model',       95),
(2, 'Portfolio Site', 70);   -- Rohan has no project; Sneha's marks are low
```

### Numbers worth memorising (dataset B)

```text
AVG(score) across all 9 exam_scores rows
  = (95+88+72+60+91+45+98+93+55) / 9
  = 697 / 9  ≈  77.44

Per-subject totals:      DBMS  = 95+72+91+98+55 = 411
                         Maths = 88+60+45+93    = 286

Per-student total score:  Rahul 183 | Sneha 132 | Amit 136 | Priya 191 | Rohan 55
```

- **Class average ≈ 77.44.** Rows above it: Rahul/DBMS (95), Rahul/Maths (88), Amit/DBMS (91), Priya/DBMS (98), Priya/Maths (93). Everything else is below.

### Extra table — `bank_transactions` (used only by the running-balance window example)

```sql
CREATE TABLE bank_transactions (
    txn_id           SERIAL PRIMARY KEY,
    account_holder   VARCHAR(50),
    transaction_date DATE,
    transaction_type VARCHAR(20),
    amount           NUMERIC(10, 2)
);

INSERT INTO bank_transactions (account_holder, transaction_date, transaction_type, amount) VALUES
('Shubham', '2026-01-01', 'DEPOSIT',  1000),
('Shubham', '2026-01-03', 'WITHDRAW', -200),
('Shubham', '2026-01-05', 'DEPOSIT',   500),
('Shubham', '2026-01-07', 'WITHDRAW', -100),
('Rahul',   '2026-01-01', 'DEPOSIT',  2000),
('Rahul',   '2026-01-04', 'WITHDRAW', -300),
('Rahul',   '2026-01-06', 'DEPOSIT',   400);
```

> Some individual files (indexing, schema design, transactions) still create their own small purpose-built tables inline, because the scenario needs a very specific shape (a million random rows, an Instagram-style schema, a bank-accounts table). Those are self-contained and clearly marked.

---

## ✅ Checklist before moving on

- [ ] `docker ps` shows `pg-practice` running (or a native Postgres service is running)
- [ ] `docker exec -it pg-practice psql -U postgres` drops you at a `postgres=#` prompt
- [ ] `\l` lists `company_db` and `campus_db`
- [ ] `\c company_db` then `\dt` shows the `employees` table
- [ ] VS Code SQLTools connects and runs `SELECT * FROM employees;` against `company_db`

---

**Next up:** [01-Why-Databases-Exist-SQL-vs-NoSQL.md](01-Why-Databases-Exist-SQL-vs-NoSQL.md) — the mental model of what a database actually is, before any query.
