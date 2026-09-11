# Redis Pub/Sub — Scaling Real-Time State Across Servers

---

## 1. The Starting Point: State Lives in the Browser

Imagine a page with 100 checkboxes, shared by everyone who opens it — click one, everyone sees it flip.

The simplest version keeps the checkbox array **in the frontend**, in a JS variable, synced over a WebSocket connection directly between clients (or relayed through a single server that just forwards events).

This works, but only for the people who were already connected when the state was built up.

**The problem:** if someone joins *in the middle* — say, after 8 checkboxes have already been checked — their browser is a brand new instance. It has no memory of what happened before it connected. From its point of view, the checkbox grid might as well not exist yet. There is nowhere to *ask* "what's the current state?" — the state was never anywhere except inside the browser tabs of people who happened to be there from the start.

---

## 2. Moving State to the Backend

The fix is obvious once you see the gap: **the state can't live only in clients.** It needs a durable home — the backend.

Now, when a new client connects:
1. It asks the server, "what's the current state?"
2. The server has been tracking every change (in memory, say, a plain array on the server process).
3. The server sends that state back immediately.

The syncing issue from Section 1 is now resolved — a client joining mid-session gets caught up instantly, because the *server*, not the browser, is the source of truth.

---

## 3. But Now We Need More Than One Server

One server can only hold so many concurrent connections — say, it maxes out around 1,000 WebSocket connections. To handle more users, you **scale horizontally**: run more copies of the server, each handling its own batch of 1,000 connections.

Here's the new problem: **WebSockets are stateful, per-connection links.** A socket opened against Server A only exists on Server A. If a user connected to Server A clicks a checkbox, Server B has no way of knowing that happened — its connected clients never hear about it. Two servers running side by side, each internally consistent, but blind to each other.

### The naive fix: a parent above the children

One way to think about solving this: put a coordinating layer **on top** of the individual servers. Whenever a server needs to emit something, it tells its parent, and the parent fans that out to all the other children.

```
                 parent (coordinator)
                /         |         \
           server A   server B   server C
           (1,000)    (1,000)    (1,000)
```

Now each server can hold 1,000 connections, and the parent lets you add more servers underneath it — effectively multiplying capacity (1,000 servers × 1,000 connections each). If even the parent becomes a bottleneck, you could lift another coordinator above *that*, and so on — parents of parents, each fanning out to a layer of children below.

This is exactly the shape of the problem that **Redis pub/sub** solves for you, without you having to build and operate that custom tree of coordinators yourself.

---

## 4. Enter Redis Pub/Sub (via Valkey)

> **Terminology note:** In this project, the actual database running is **Valkey** (a Redis-compatible, open-source fork), not Redis itself. But the *mechanism* — publish/subscribe — is the same protocol Redis popularized, so this document (and the code) still talks about "Redis pub/sub," "the Redis channel," etc. Wherever you see "Redis" here, mentally substitute "Valkey" — they're API-compatible for everything used in this project.

Redis pub/sub gives you that fan-out coordinator, as a managed piece of infrastructure instead of something you build yourself:

- A server **publishes** a message onto a named **channel**.
- Every server that has **subscribed** to that channel receives the message — instantly, regardless of which physical server originally published it.

So instead of servers talking to each other directly, every server talks *only* to Redis. Redis is the single hub; the servers are all equally connected to it, and none of them need to know about each other at all.

```
  server A --publish-->  [ Redis channel ]  --message-->  server A (itself, via subscribe)
  server B --publish-->        |            --message-->  server B
  server C --publish-->        |            --message-->  server C
```

### The one-connection-per-direction rule

Here's a detail that trips people up: **a single Redis connection cannot both publish and subscribe.** Once a connection issues `SUBSCRIBE`, that connection is now dedicated to *receiving* messages — it can no longer issue normal commands like `PUBLISH`, `GET`, or `SET` on that same connection.

So the rule is: **you always need at least two separate connections** — one whose job is purely to publish, and one whose job is purely to subscribe. You cannot collapse them into one.

This project's `redis-connection.js` reflects that directly:

```javascript
// redis-connection.js
import Redis from "ioredis";

function createRedisConnection() {
  return new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  });
}

// Used only to PUBLISH checkbox-change events to other instances.
export const publisher = createRedisConnection();

// Used only to SUBSCRIBE to checkbox-change events from any instance
// (including this one). ioredis requires a connection in subscribe mode
// to be dedicated — it can't also run regular commands.
export const subscriber = createRedisConnection();

// Used for regular commands: rate-limit GET/SET and checkbox-state GET/SET.
// Kept separate from publisher/subscriber so pub/sub traffic never blocks
// or is blocked by state reads/writes.
export const data = createRedisConnection();
```

Notice there are actually **three** connections here, not two. Regular read/write commands (checking rate limits, reading/writing the checkbox array) can all share **one** connection — `GET` and `SET` don't have the publish/subscribe restriction, so they're free to live together on `data`. It's specifically **publish** and **subscribe** that each need their own dedicated connection, separate from each other and separate from everything else.

---

## 5. Wiring Pub/Sub Into the Checkbox Flow

When a socket emits a checkbox change, the server:

1. Rate-limits the request (see Section 7).
2. Writes the new state into Redis (via the `data` connection) — this is the durable source of truth from Section 2, now living in Redis instead of a single server's memory.
3. **Publishes** the change on a channel — this is the fan-out step from Section 3-4.

```javascript
// index.js
socket.on("client:checkbox:change", async (payload) => {
  const { index, checked } = payload;

  // ...rate limit check...

  await setCheckboxValue(index, checked);       // (3) write to Redis — durable state
  await publisher.publish(
    CHECKBOX_CHANGE_CHANNEL,
    JSON.stringify({ index, checked }),          // (4) tell every subscribed instance
  );
});
```

Every running instance — including the one that just published — has a `subscriber` connection listening on that same channel from the moment it started up:

```javascript
// index.js
await subscriber.subscribe(CHECKBOX_CHANGE_CHANNEL);
subscriber.on("message", (channel, message) => {
  if (channel !== CHECKBOX_CHANGE_CHANNEL) return;
  const { index, checked } = JSON.parse(message);
  io.emit("server:checkbox:change", { index, checked }); // fan out to THIS instance's sockets
});
```

This is the key mechanism: **the instance that made the change also receives its own publish back through the subscriber**, and re-broadcasts to its own locally-connected sockets the exact same way every other instance does. There's no special-casing "if I'm the one who made the change, emit directly instead of round-tripping through Redis" — every instance treats every change identically, whether it originated locally or on a completely different server. That symmetry is what makes it safe to add or remove server instances freely: nothing about the flow depends on how many instances exist or which one initiated the change.

---

## 6. Redis Also Becomes the Source of Truth for New Joiners

Section 2 solved "new client asks the server for current state" — but that assumed *one* server holding the full picture in memory.

Once multiple servers exist behind Redis, that assumption breaks: if 8 checkboxes get checked and then you spin up a brand-new server instance, that new instance has **nothing** in its own memory — it never saw those 8 changes happen, because they were published while it didn't exist yet.

The fix follows directly from Section 4's principle: **the durable source of truth has to live in Redis itself, not in any one server's memory.** So instead of each server tracking its own local copy of the checkbox array, every server reads and writes the *same* array, stored under one Redis key:

```javascript
// index.js
async function getCheckboxState() {
  const existing = await data.get(CHECKBOX_STATE_KEY);
  if (existing) return JSON.parse(existing);

  const initial = new Array(CHECKBOX_COUNT).fill(false);
  await data.set(CHECKBOX_STATE_KEY, JSON.stringify(initial));
  return initial;
}
```

A new instance starting up doesn't need to have witnessed any history — it just asks Redis for the current array, the same way a new *client* asks a running server via `GET /checkboxes`:

```javascript
// index.js
app.get("/checkboxes", async (req, res) => {
  const state = await getCheckboxState();
  res.json({ checkboxes: state });
});
```

This closes the loop from Section 1 all the way through: browser state → single-server state → Redis-backed state that's correct no matter how many servers exist or when they started.

---

## 7. The Next Problem: Too Many Rapid Changes

Once pub/sub is wired up, a single checkbox click no longer just updates one server — it triggers a publish, which every subscribed instance receives and re-broadcasts. If a user clicks rapidly (`tick tick tick tick tick`), and you have, say, 10 server instances all subscribed, each click fans out across the entire tree of servers. A user mashing checkboxes can flood the whole system with cross-instance traffic — a bad experience for everyone else sharing that infrastructure.

**Rate limiting** caps how often a single user (identified by `socket.id`) is allowed to trigger a change:

```javascript
// index.js
const rateLimitKey = `rate-limiting:${socket.id}`;
const lastOperationTime = await data.get(rateLimitKey);

if (lastOperationTime) {
  const timeElapsed = Date.now() - Number(lastOperationTime);
  if (timeElapsed < RATE_LIMIT_WINDOW_MS) {
    socket.emit("server:error", { error: "Please wait" });
    return;
  }
}

await data.set(rateLimitKey, Date.now());
```

Two things worth noticing:

- **The rate-limit key is stored in Redis, not in server memory.** That matters for the exact reason multiple servers exist in the first place: if this same user's *next* click happens to land on a different server instance (say, their WebSocket reconnected and landed on Server B instead of Server A), an in-memory rate limit on Server A would be invisible to Server B — the user could bypass the limit just by reconnecting. Because the rate-limit timestamp lives in Redis, every instance sees the same value, regardless of which one is handling this particular request.
- **This uses the `data` connection**, not `publisher` or `subscriber` — it's a plain `GET`/`SET`, unrelated to the pub/sub mechanism itself.

---

## 8. Quick Reference

| Term | One-line meaning |
|---|---|
| Publish | Send a message onto a named Redis channel. |
| Subscribe | Listen for messages on a named Redis channel. |
| Channel | The named topic that publishers send to and subscribers listen on — decouples senders from receivers entirely. |
| One connection, one job | A Redis connection in subscribe mode can't also run normal commands — publish, subscribe, and regular read/write each need their own connection. |
| Fan-out | One publish reaches every subscribed instance simultaneously, without the publisher knowing who or how many are listening. |
| Source of truth in Redis | State (the checkbox array) lives in Redis, not in any one server's memory — so any instance, old or brand new, sees the same state. |
| Distributed rate limiting | Rate-limit state also lives in Redis (keyed by `socket.id`), so the limit holds regardless of which server instance handles a given request. |
| Valkey | The actual database this project runs — a Redis-compatible fork. Everything here that says "Redis" applies to it unchanged. |

---

## 9. What's Implemented, and What's Still Missing

The current implementation (`07-backend/setups/06-1M_Checkbox-Redis-RateLimit`) covers:

- ✅ Three separate Redis connections (`publisher`, `subscriber`, `data`), matching the one-connection-per-job rule from Section 4.
- ✅ Checkbox state stored in Redis (`checkbox:state`), not in server memory — new instances and new clients both read from Redis, not from any one server's local state.
- ✅ Pub/sub relay: a change published by any instance reaches every instance's connected sockets, including its own.
- ✅ Rate limiting keyed by `socket.id`, stored in Redis so it holds across instances.

What's **not yet** solid, in order of how much it matters:

1. **The rate-limiter has a race condition.** `GET` the last timestamp, compare it, then `SET` a new one — these are three separate round-trips, not one atomic operation. If the same socket fires two changes fast enough that the second `client:checkbox:change` handler starts before the first one's `data.set(rateLimitKey, ...)` has completed, both requests can read the *same* stale `lastOperationTime` and both pass the check. The fix is to make the check-and-set atomic — e.g. `SET rate-limiting:<id> <now> NX PX 1000` (only sets if the key doesn't already exist, with a built-in expiry) instead of separate `GET` + `SET` calls.

2. **The frontend's "optimistic update" isn't really optimistic, and its revert logic is fragile.** `onCheckboxClick` fires on the native `change` event — meaning the browser has *already* flipped the checkbox by the time our code runs; we're not pre-emptively flipping anything ourselves, we're just reacting after the fact. That mostly reads the same as true optimistic UI, except for the revert path: on `server:error`, the code does `input.checked = !input.checked` — a blind invert of *whatever the checkbox currently shows*. If a `server:checkbox:change` broadcast for that same checkbox (from a different client) arrives in the small window between the click and the error, the blind invert flips the wrong value — reverting on top of someone else's legitimate update instead of undoing only this user's own optimistic guess. A more correct version would snapshot the checkbox's value *before* flipping it, and restore that exact snapshot on error, rather than inverting whatever the current DOM state happens to be.

3. **No automated multi-instance demo.** Horizontal scaling is demonstrated manually — run `PORT=8000 npm run dev` and `PORT=9000 npm run dev` in separate terminals (documented in that project's README). There's no `docker-compose.yml` service replication or process manager spinning up N instances automatically.

4. **`/checkboxes` is a one-time fetch, not continuous reconciliation.** A client fetches state once on page load. If a client's WebSocket silently drops and reconnects mid-session (not a full page reload), there's no logic to re-fetch state on reconnect — it relies entirely on catching every `server:checkbox:change` broadcast in real time, with no fallback resync if any of those are missed during a disconnect gap.

None of these break the core teaching point — the pub/sub fan-out and Redis-as-source-of-truth mechanism both work correctly, verified by running two live instances against real Valkey. They're the next layer of correctness on top of a working foundation.
