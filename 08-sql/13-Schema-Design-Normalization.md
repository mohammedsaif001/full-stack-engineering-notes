# Schema Design & Normalization
## Part 13 of 19 — Relationships, Junction Tables, and the Normal Forms

> Previous: [12-DCL-Roles-Grant-Revoke.md](12-DCL-Roles-Grant-Revoke.md)

---

## 📌 Executive Summary

- **Schema design** = identifying your **entities** (things worth a table: users, posts, orders) and the **relationships** between them, then expressing those relationships with **foreign keys**.
- Four relationship shapes: **one-to-one**, **one-to-many** (the common one), **many-to-one** (its mirror), and **many-to-many** — which always needs a **junction table** in the middle.
- **Normalization** = splitting data so each fact is stored **exactly once**. Its purpose is to prevent three **anomalies**: insertion, update, and deletion anomalies — all caused by duplicating the same fact across many rows.
- **1NF** → atomic column values, no repeating groups. **2NF** → no non-key column depends on only *part* of a composite key. **3NF** → no non-key column depends on another non-key column. "Every non-key column depends on **the key, the whole key, and nothing but the key**."
- Real systems sometimes **denormalize on purpose** — storing a redundant copy (a cached `like_count` on `posts`) to avoid an expensive `COUNT` on every read. That's a deliberate trade, made *after* a normalized design, not instead of one.

---

## 🧠 Core Analogy: One Fact, One Home

Imagine a school storing each student's *home city name and its pincode* directly on every enrolment row. The city "Pune → 411001" is now written on hundreds of rows.

- The city gets a new pincode → you must update **hundreds** of rows, and miss one → the data now contradicts itself (**update anomaly**).
- A new city opens but has no students yet → you **can't record it** anywhere, because the only place cities live is on an enrolment row (**insertion anomaly**).
- The last student from a tiny town leaves → deleting that enrolment row **erases the town's pincode** from your entire system (**deletion anomaly**).

The fix is a `cities` table where "Pune → 411001" lives **once**, and enrolments reference it by `city_id`. Normalization is just the discipline of giving every fact exactly one home.

---

## 🔗 1. The four relationship shapes

| Shape | Notation | Example | How it's modelled |
|---|---|---|---|
| **One-to-one** | `A — B` | one `user` ↔ one `account_settings` row | FK on either side, marked `UNIQUE` |
| **One-to-many** | `A < B` | one `user` writes many `posts` | FK on the "many" side (`posts.user_id`) |
| **Many-to-one** | `A > B` | many `comments` belong to one `post` | same as one-to-many, seen from the other end |
| **Many-to-many** | `A >< B` | many `users` like many `posts` | a **junction table** (`likes`) with an FK to each side |

**Key rule:** a foreign key always lives on the **"many"** side. A post has one author, so `user_id` goes on `posts`. A user has many posts, so there's no `post_id` on `users`.

---

## 2️⃣ Worked example — an Instagram-style schema

```sql
DROP TABLE IF EXISTS comments, likes, follows, posts, app_users CASCADE;

-- 1. USERS — the root entity everything else references
CREATE TABLE app_users (
    user_id    SERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. POSTS — one user → many posts (FK on the "many" side)
CREATE TABLE posts (
    post_id    SERIAL PRIMARY KEY,
    user_id    INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    caption    TEXT,
    image_url  VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LIKES — many-to-many junction table (users ↔ posts)
CREATE TABLE likes (
    like_id    SERIAL PRIMARY KEY,
    user_id    INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    post_id    INT REFERENCES posts(post_id)     ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, post_id)          -- a user may like a given post only ONCE
);

-- 4. COMMENTS — many-to-one to both users and posts
CREATE TABLE comments (
    comment_id   SERIAL PRIMARY KEY,
    user_id      INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    post_id      INT REFERENCES posts(post_id)     ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FOLLOWS — a self-referencing many-to-many (users following users)
CREATE TABLE follows (
    follower_id  INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    following_id INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)     -- composite PK: this exact pair can exist only once
);
```

Seeding + the constraint firing:

```sql
INSERT INTO app_users (username, email) VALUES
('shubham_codes', 'shubham@chaigram.in'),
('hitesh_ui',     'hitesh@chaigram.in'),
('piyush_travels','piyush@chaigram.in');

INSERT INTO posts (user_id, caption) VALUES
(1, 'Just deployed my first Postgres DB! #sql'),
(2, 'New UI for the app. Thoughts?'),
(3, 'Goa trip planning... again.');

INSERT INTO likes (user_id, post_id) VALUES (2, 1), (3, 1), (1, 2);

-- Try to like the same post twice as the same user:
INSERT INTO likes (user_id, post_id) VALUES (2, 1);
```
```text
ERROR:  duplicate key value violates unique constraint "likes_user_id_post_id_key"
DETAIL:  Key (user_id, post_id)=(2, 1) already exists.
```
> The `UNIQUE (user_id, post_id)` does its job — double-liking is impossible with **zero** application-level checks. The schema itself enforces the rule.

### Design notes from the fuller schema

- **`stories`** — like `posts`, but with an *optional* `post_id` FK (nullable — a story can stand alone, or a "share to story" repost links back to a post).
- **`bookmarks`** — another many-to-many junction (`users` ↔ `posts`), a user "saving" a post.
- **`account_settings`** — a genuine **one-to-one**: `user_id` is both FK and `UNIQUE` (or the PK). Holds settings like `is_private BOOLEAN` that don't belong on the lean core `users` row.
- **Composite primary key** (as in `follows`): a PK spanning multiple columns. The *pair* `(follower_id, following_id)` must be unique — which naturally forbids "following the same person twice", no separate `UNIQUE` needed.

### A feed query — `JOIN` + `GROUP BY` together

```sql
-- Each post's caption alongside its like count
SELECT p.caption, COUNT(l.like_id) AS total_likes
FROM posts p
LEFT JOIN likes l ON p.post_id = l.post_id
GROUP BY p.post_id, p.caption;
```
```text
                caption                 | total_likes
----------------------------------------+-------------
 Just deployed my first Postgres DB! #sql|           2
 New UI for the app. Thoughts?          |           1
 Goa trip planning... again.            |           0
```
> `LEFT JOIN` keeps Piyush's zero-like post (`total_likes = 0`). An `INNER JOIN` would silently drop it — it has no matching row in `likes`.

---

## 3️⃣ The three anomalies (why we split tables)

The fresher instinct is one giant wide table. It causes:

| Anomaly | What goes wrong |
|---|---|
| **Insertion anomaly** | You can't record a new fact (a new course) without also inventing unrelated data, because the fact has nowhere of its own to live |
| **Update anomaly** | A fact is duplicated across many rows; changing it means changing *every* copy, and missing one leaves the data self-contradictory |
| **Deletion anomaly** | Deleting one row destroys *other*, unrelated information that happened to sit in the same row |

**The fix:** split into separate tables joined by foreign keys, so each fact is stored **once**, and relationships are expressed through keys — not by copying columns.

---

## 4️⃣ The normal forms

Each form builds on the previous. "Normalized" in practice usually means **3NF**.

### 1NF — First Normal Form

- Every column holds a **single, atomic value** — no comma-lists, no arrays-as-a-workaround, no `phone1, phone2, phone3` repeating groups.
- Each row is unique (there's a primary key).

**Violation:** a `students` row with `courses = 'Math, Physics, CS'`. **Fix:** a `student_courses` junction table, one row per (student, course).

### 2NF — Second Normal Form

- Is in 1NF, **and** every non-key column depends on the **whole** primary key — not just part of a composite key.
- Only relevant when the PK is composite.

**Violation:** table `enrollment(student_id, course_id, student_name, course_fee)` with PK `(student_id, course_id)`. `student_name` depends only on `student_id` (half the key); `course_fee` only on `course_id`. **Fix:** move `student_name` to `students`, `course_fee` to `courses`; `enrollment` keeps only `(student_id, course_id)` plus facts about the *pairing* (like `enrolled_on`).

### 3NF — Third Normal Form

- Is in 2NF, **and** no non-key column depends on **another non-key column** (no "transitive" dependency).

**Violation:** `employees(employee_id, name, department_id, department_name)`. `department_name` depends on `department_id`, which is not the key. **Fix:** a `departments(department_id, department_name)` table; `employees` keeps only `department_id`.

> The classic one-line summary of 3NF: *every non-key column must depend on **the key, the whole key, and nothing but the key**.*

**BCNF, 4NF, 5NF** exist for rarer edge cases (overlapping candidate keys, multi-valued dependencies). 3NF covers the overwhelming majority of real designs.

---

## 5️⃣ When to denormalize (deliberately)

Normalization optimises for **write correctness** and **storage**. It can cost read performance — computing a post's like count means a `COUNT` over `likes` on *every* feed render.

A deliberate denormalization: add a `like_count INT DEFAULT 0` column to `posts`, kept in sync by application code or a trigger. Reads get instant; writes do a bit more work; there's now a redundant fact that *could* drift.

Rules for doing it sanely:

- **Design normalized first.** Denormalize only when a measured read is too slow.
- **Pick one source of truth.** The `likes` table is authoritative; `posts.like_count` is a cache. Have a way to recompute it.
- **Keep it in sync in exactly one place** — a trigger, or one well-tested code path — never scattered.

---

## 🎓 Interview one-liners from this file

| Question | Answer |
|---|---|
| How do you model a many-to-many relationship? | A junction table with a foreign key to each side (often a composite PK of the two FKs) |
| Which side does a foreign key go on? | The "many" side — a post has one author, so `user_id` lives on `posts` |
| What are the three data anomalies? | Insertion, update, and deletion anomalies — all from duplicating a fact across rows |
| What is 1NF? | Atomic column values, no repeating groups, a primary key per row |
| One-line definition of 3NF? | Every non-key column depends on the key, the whole key, and nothing but the key |
| Why would you denormalize? | To avoid an expensive repeated computation on read (a cached count) — done deliberately after a normalized design |
| What is a composite primary key? | A primary key made of two or more columns whose combination must be unique |

---

**Next up:** [14-Indexing-Query-Performance.md](14-Indexing-Query-Performance.md) — B+Trees, `EXPLAIN ANALYZE`, and why an index turns a 52 ms query into 0.06 ms.
