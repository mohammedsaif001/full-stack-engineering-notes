# DCL — Roles, GRANT & REVOKE
## Part 12 of 19 — Controlling Who Can Do What

> Previous: [11-Views.md](11-Views.md)

---

## 📌 Executive Summary

- **DCL = Data Control Language** — the permission system. Two verbs: **`GRANT`** (give a privilege) and **`REVOKE`** (take it back).
- In Postgres a **user and a group are the same thing** — both are **roles**. A role can log in (a "user"), contain other roles (a "group"), own objects, and hold privileges. `CREATE USER` is just `CREATE ROLE ... WITH LOGIN`.
- A **privilege** is a specific action on a specific object: `SELECT` on a table, `INSERT` on a table, `EXECUTE` on a function, `CONNECT` on a database, `USAGE` on a schema.
- **Default deny.** A new role can do almost nothing until privileges are granted — except that the special `PUBLIC` pseudo-role and some built-in defaults grant a few things automatically (notably `USAGE` + `CREATE` on the `public` schema in older Postgres versions).
- The **object owner** (whoever created it) and **superusers** always have full rights and can grant them to others.
- Best practice: create **group roles** for job functions (`readonly`, `app_write`), grant privileges to the group, then add login roles to the group with `GRANT group TO user`.

---

## 🧠 Core Analogy: Office Keycards

- A **role** = a person's keycard, *or* an access group programmed into many keycards ("3rd-floor access", "server room access").
- A **privilege** = one door that a card opens: "the filing room" (`SELECT` on a table), "the safe" (`INSERT`/`UPDATE`), "the building entrance" (`CONNECT` to the database).
- **`GRANT`** = programming a door onto a card. **`REVOKE`** = removing it.
- **Group roles** = instead of programming 40 individual cards, you program the "3rd-floor" group once and assign the group to 40 cards. Change the group, all 40 update.
- **The owner / superuser** = the facilities manager with a master key — always gets in, and decides who else does.

---

## 👤 1. Roles — users and groups

```sql
-- A login role (a "user")
CREATE ROLE analyst WITH LOGIN PASSWORD 's3cret';
-- identical to:  CREATE USER analyst WITH PASSWORD 's3cret';

-- A group role (no login — just a bucket of privileges)
CREATE ROLE readonly;
CREATE ROLE app_write;

-- Put a login role into a group
GRANT readonly TO analyst;     -- analyst now inherits everything granted to readonly

-- Useful role attributes
CREATE ROLE dba WITH LOGIN PASSWORD '...' CREATEDB CREATEROLE;
ALTER ROLE analyst WITH PASSWORD 'new-secret';
ALTER ROLE analyst VALID UNTIL '2027-01-01';       -- password expiry
DROP ROLE IF EXISTS analyst;
```

| Attribute | Meaning |
|---|---|
| `LOGIN` | The role can connect (makes it a "user") |
| `SUPERUSER` | Bypasses **all** permission checks — hand out very sparingly |
| `CREATEDB` | May create databases |
| `CREATEROLE` | May create/alter/drop other (non-superuser) roles |
| `INHERIT` (default) | Automatically uses privileges of roles it's a member of |
| `NOLOGIN` (default for `CREATE ROLE`) | Cannot connect — a pure group |

`\du` in psql lists all roles and their attributes.

---

## 🔑 2. `GRANT` — giving privileges

Syntax: `GRANT <privileges> ON <object> TO <role>;`

### Database & schema level

```sql
GRANT CONNECT ON DATABASE company_db TO readonly;   -- may open a connection to this DB
GRANT USAGE   ON SCHEMA public       TO readonly;    -- may "see into" the schema (required before table grants matter)
GRANT CREATE  ON SCHEMA public       TO app_write;   -- may create new tables in this schema
```

### Table / column level

```sql
GRANT SELECT ON employees TO readonly;                       -- read one table
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;     -- read every existing table in the schema
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO app_write;
GRANT SELECT (name, department) ON employees TO readonly;    -- column-level: only these two columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_write;  -- needed for SERIAL inserts
```

### Function level

```sql
GRANT EXECUTE ON FUNCTION recalc_totals() TO app_write;
```

### Common table/view privileges

| Privilege | Allows |
|---|---|
| `SELECT` | Read rows (and reference the table in other queries) |
| `INSERT` | Add rows |
| `UPDATE` | Modify rows (can be column-scoped) |
| `DELETE` | Remove rows |
| `TRUNCATE` | Fast-empty the table |
| `REFERENCES` | Create a foreign key pointing at this table |
| `TRIGGER` | Create a trigger on this table |
| `ALL PRIVILEGES` | All of the above |

### `WITH GRANT OPTION` — let the grantee re-grant

```sql
GRANT SELECT ON employees TO analyst WITH GRANT OPTION;   -- analyst can now grant SELECT on employees to others
```

---

## 🚪 3. Future objects — `ALTER DEFAULT PRIVILEGES`

`GRANT ... ON ALL TABLES` only affects tables that **exist right now**. A table created tomorrow won't be covered. To auto-grant on future objects:

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_write;
```
> This says "from now on, whenever *I* create a table in `public`, automatically grant these." It applies to objects created by the role that runs the `ALTER DEFAULT PRIVILEGES` — usually run it as the role that owns/creates your schema objects (e.g. a migration role).

---

## ❌ 4. `REVOKE` — taking privileges back

Mirror of `GRANT`:

```sql
REVOKE INSERT, UPDATE, DELETE ON employees FROM app_write;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM readonly;
REVOKE readonly FROM analyst;                 -- remove analyst from the group
REVOKE ALL ON DATABASE company_db FROM PUBLIC;   -- tighten a default-open database
```

- `PUBLIC` is a built-in pseudo-role meaning "every role, including future ones." Historically Postgres grants `PUBLIC` some defaults (e.g. `CONNECT` on new databases, and pre-PG15, `CREATE` on the `public` schema). Hardening a database often starts with `REVOKE`-ing those.
- Revoking a privilege someone holds **through a group** doesn't work by naming the user — revoke it from the group, or remove them from the group.

---

## 🏗️ 5. A realistic setup — least-privilege app roles

```sql
-- 1. Group roles for job functions
CREATE ROLE readonly  NOLOGIN;
CREATE ROLE app_rw    NOLOGIN;

-- 2. Baseline access to the database & schema
GRANT CONNECT ON DATABASE company_db TO readonly, app_rw;
GRANT USAGE   ON SCHEMA  public      TO readonly, app_rw;

-- 3. Privileges per group
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;

-- 4. Cover future tables too
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;

-- 5. Actual login users, placed into a group
CREATE ROLE reporting_user WITH LOGIN PASSWORD '...';
GRANT readonly TO reporting_user;

CREATE ROLE api_service    WITH LOGIN PASSWORD '...';
GRANT app_rw TO api_service;
```

> Your application connects as `api_service` (can read/write data, **cannot** `DROP TABLE` or create roles). Your BI tool connects as `reporting_user` (read-only). A leaked read-only credential can't corrupt anything; a leaked app credential still can't alter the schema. That containment is the entire point of DCL.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| What is DCL? | Data Control Language — `GRANT` and `REVOKE`, managing permissions |
| User vs role in Postgres? | Same thing — a user is just a role `WITH LOGIN`. Roles can also act as groups |
| What is a privilege? | Permission for one action on one object — e.g. `SELECT` on a table, `EXECUTE` on a function |
| Why use group roles? | Grant privileges to a group once, add/remove users from the group — no per-user re-granting |
| Why doesn't `GRANT ... ON ALL TABLES` cover new tables? | It only affects existing tables; use `ALTER DEFAULT PRIVILEGES` for future ones |
| What is `PUBLIC`? | A pseudo-role meaning every role, including ones created later |
| What does `WITH GRANT OPTION` do? | Lets the grantee pass that same privilege on to other roles |

---

**Next up:** [13-Schema-Design-Normalization.md](13-Schema-Design-Normalization.md) — designing multi-table schemas: relationships, junction tables, and normal forms.
