# Real-World Schema Design & Normalization
## Instagram-Style Case Study, Relationships, and Data Anomalies

> Previous: [07-Transactions-ACID-Row-Locking-Concurrency.md](07-Transactions-ACID-Row-Locking-Concurrency.md)

---

## 🏛️ 1. Real-World Schema Design (Instagram-Style Case Study)

Designing a schema means identifying entities and the **relationships** between them:
- **One-to-One** (`—`): e.g., one `user` has exactly one `account_setting` row.
- **One-to-Many** (`<`): e.g., one `user` can author many `posts`.
- **Many-to-One** (`>`): the inverse view of one-to-many (e.g., many `comments` belong to one `post`).
- **Many-to-Many**: requires a **junction/join table** in between (e.g., `likes` connecting `users` ↔ `posts`).

```sql
DROP TABLE IF EXISTS comments, likes, follows, posts, app_users CASCADE;

-- 1. USERS — the root entity everything else references
CREATE TABLE app_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. POSTS — One user -> Many posts
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    caption TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. LIKES — Many-to-Many junction table (users <-> posts)
CREATE TABLE likes (
    like_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)   -- a user can like a given post only ONCE
);

-- 4. COMMENTS
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. FOLLOWS — a self-referencing Many-to-Many (users following users)
CREATE TABLE follows (
    follower_id INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    following_id INT REFERENCES app_users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)   -- composite primary key: this exact pair can only exist once
);
```
```text
DROP TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
```

```sql
-- Seed data
INSERT INTO app_users (username, email) VALUES
('shubham_codes',  'shubham@chaigram.in'),
('hitesh_ui',      'hitesh@chaigram.in'),
('piyush_travels', 'piyush@chaigram.in');

INSERT INTO posts (user_id, caption) VALUES
(1, 'Just deployed my first Postgres DB! #coding #sql'),
(2, 'New UI design for the app. Thoughts?'),
(3, 'Goa trip planning... again.');

INSERT INTO likes (user_id, post_id) VALUES
(2, 1),  -- Hitesh likes Shubham's post
(3, 1),  -- Piyush likes Shubham's post
(1, 2);  -- Shubham likes Hitesh's post

INSERT INTO comments (user_id, post_id, comment_text) VALUES
(2, 1, 'Great job bro!'),
(1, 3, 'Kab chal rahe hain?');
```
```text
INSERT 0 3
INSERT 0 3
INSERT 0 3
INSERT 0 2
```

```sql
-- Trying to like the same post twice as the same user:
INSERT INTO likes (user_id, post_id) VALUES (2, 1);
```
```text
ERROR:  duplicate key value violates unique constraint "likes_user_id_post_id_key"
DETAIL:  Key (user_id, post_id)=(2, 1) already exists.
```
> This is the `UNIQUE(user_id, post_id)` constraint doing exactly its job — Hitesh (`user_id = 2`) already liked post 1 once; the schema itself makes double-liking impossible, with no application-level check needed.

### Fuller design notes from the extended Instagram schema (stories, bookmarks, account settings)
- **`stories`**: like `posts`, but with an optional `post_id INT FK` (nullable — a story can exist independently of a post, e.g. a "share to story" repost links back).
- **`bookmarks`**: another many-to-many junction table, connecting `users` ↔ `posts` (a user "saving" a post).
- **`account_settings`**: a genuine **one-to-one** relationship — `users.id — account_settings.id`, holding settings like `is_account_private BOOLEAN` that don't belong on the core `users` row itself (keeps the main table lean).
- **`likes` / `comments` / `follows`**: all **many-to-many**, resolved via a join table with two Foreign Keys pointing back to the entities being connected.
- **Composite Primary Key** (as used in `follows`): a primary key made of **more than one column together** — here, the *pair* `(follower_id, following_id)` must be unique, which naturally prevents "following the same person twice," without needing a separate `UNIQUE` constraint.

### A feed query using JOIN + GROUP BY together
```sql
-- Get each post's caption alongside its total like count
SELECT p.caption, COUNT(l.like_id) AS total_likes
FROM posts p
LEFT JOIN likes l ON p.post_id = l.post_id
GROUP BY p.post_id, p.caption;
```
```text
                       caption                        | total_likes
-------------------------------------------------------+-------------
 Just deployed my first Postgres DB! #coding #sql      |           2
 New UI design for the app. Thoughts?                  |           1
 Goa trip planning... again.                           |           0
```
`LEFT JOIN` here ensures posts with **zero** likes still show up (Piyush's Goa post, `total_likes = 0`) instead of disappearing, which an `INNER JOIN` would cause — `INNER JOIN` would have silently dropped that row entirely since it has no matching row in `likes`.

---

## ⚠️ 2. Normalization & Data Anomalies (Why We Split Tables At All)

A fresher's natural instinct is often to cram everything into one giant table (e.g., storing a student's every assignment score as extra columns on the `students` row). This causes three classic anomalies that schema design (normalization) exists to prevent:

| Anomaly | What goes wrong |
|---|---|
| **Insertion anomaly** | You can't add a new fact (e.g., a new course) without also being forced to insert unrelated/incomplete data, because the fact has nowhere else to live. |
| **Update anomaly** | The same piece of information is duplicated across many rows; updating it means you must update **every** duplicate, and missing even one leaves the data inconsistent. |
| **Deletion anomaly** | Deleting one row accidentally destroys *other*, unrelated information that happened to be stored alongside it. |

**The fix**: split data into separate tables connected by Foreign Keys (exactly the `students` / `internships`, or `users` / `posts` / `likes` pattern above) so each fact is stored **once**, in one place, and relationships are expressed through keys — not by duplicating columns.

---

**Next up:** [09-Complete-SQL-Command-Clause-Reference.md](09-Complete-SQL-Command-Clause-Reference.md) — every SQL keyword and clause, in one place.
