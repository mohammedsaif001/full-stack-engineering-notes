# WebSockets & Socket.IO — Real-Time Communication, Rooms, and Scaling Limits

---

## 1. Why HTTP Isn't Enough

A normal HTTP server just **serves** something — it sits in a loop, always listening for requests:

```javascript
while (true) {
  // always listening to requests
}
```

The flow looks like this:

```
User ──request──► Server ──lookup──► DB
User ◄─response── Server
```

The user **opens** the request and also **closes** it. It's **one-way per exchange**: you ask, you get an answer, the connection for that exchange is done. If the server wants to tell the user something new (a new chat message, a live price update) without the user asking again, plain HTTP has no way to do that — the user would have to keep re-requesting ("polling").

```
User ──────► Server
User ◄────── Server
```

## 2. WebSockets — A Duplex Connection

A **WebSocket** is a connection that stays open and is **duplex** — data can flow **both directions at the same time** (client ⇄ server), over the same long-lived connection, without the client re-asking every time.

### How Connection Starts: The HTTP `101 Switching Protocols` Handshake

WebSockets don't start on a separate port or protocol from scratch. Every WebSocket connection begins as a standard HTTP request and upgrades:

1. **Client Requests Protocol Upgrade**:
   The browser sends a standard HTTP `GET` request with upgrade headers:
   ```http
   GET /socket.io/?transport=websocket HTTP/1.1
   Host: localhost:4214
   Connection: Upgrade
   Upgrade: websocket
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   ```

2. **Server Responds with `101 Switching Protocols`**:
   If the server agrees to switch protocols, it responds with status code **`101`**:
   ```http
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
   ```

3. **Protocol Switched**:
   From status `101` onward, HTTP is turned off on that TCP socket. The connection remains open for low-latency, two-way frame transmission.

## 3. Socket.IO — A Library Built on Top of WebSockets

**Socket.IO** is a library that wraps the raw WebSocket protocol and adds a higher-level abstraction on top of it. It gives you:

- **events** — named messages instead of raw byte frames
- **rooms** — grouping connections so you can target a subset of clients
- **broadcast** — sending to everyone (or everyone except the sender)
- automatic reconnection, fallbacks, and other conveniences the raw WebSocket API doesn't give you

---

## 4. Sockets vs the Server — Renaming the Actors

Here's the core problem this section solves: **if you just "send a message," it goes to everyone connected. How do you target one specific client?**

Socket.IO answers this by renaming the two sides of the connection:

- If five users are connected to one server, those five users are called **sockets** — not "users."
- The server they're all connected to is called **IO** (or "the io instance") — not "the server."

Each socket gets assigned a **unique socket ID** the moment it connects:

```
        ┌──────────────┐
socket(id=4)  socket(id=1)
     ╲            ╱
      ╲          ╱
       ┌────────┐
       │   IO   │
       └────────┘
      ╱          ╲
     ╱            ╲
socket(id=3)  socket(id=2)
```

### Targeting one specific socket

If socket `id=4` wants to send a message to socket `id=1`:

1. The client does: `io.emit("message", { to: 1, message: "Hello" })`
2. The server (IO) receives this, and does: `socket.emit(...)` targeted at socket `id=1`, forwarding whatever data it got.

In practice, using the actual Socket.IO API, you target a specific socket like this:

```javascript
// server-side: send directly to one specific socket by its id
io.to(socketId).emit("message", { from: senderSocketId, text: "Hello" });
```

### Sending to everyone

```javascript
io.emit("hello everyone");
```

### Broadcasting (everyone *except* the sender) — e.g. group chat

When you want to create a group effect — a message from one user shown to everyone else, but not echoed back to the sender — don't use `socket.emit(id, ...)` per recipient. Just do:

```javascript
socket.broadcast.emit("event name", value);
```

`socket.broadcast.emit` automatically sends to every connected socket **except** the one that triggered it.

### Broadcasting to a specific group only: Rooms

Broadcasting to *literally everyone* isn't always what you want — for a specific chat group, a specific document's collaborators, or a specific game lobby, you want to broadcast only to a **subset**. That's what **rooms** are for: an arbitrary named group that sockets can join, and you can broadcast to just that room instead of the whole server.

```javascript
// server-side
socket.join("room-123");

io.to("room-123").emit("eventName", data); // only sockets in this room receive it
```

---

## 5. Connection Lifecycle & Core Code Snippets (Quick Reference)

### 5.1 How Connection & Disconnection Work

1. **Making a Connection (HTTP 101 Handshake)**:
   - **Client**: Calling `const socket = io()` in the browser sends an HTTP `GET` request with `Connection: Upgrade` and `Upgrade: websocket` headers.
   - **Server Handshake**: The server responds with HTTP Status **`101 Switching Protocols`**, upgrading the TCP connection from HTTP to WebSocket.
   - **Server Listener**: `io.on("connection", (socket) => { ... })` receives the newly upgraded connection and assigns a unique `socket.id`.

2. **Disconnecting / Closing a Connection**:
   - **Client-side Manual Close**: Call `socket.disconnect()` to manually terminate the connection.
   - **Automatic Disconnect**: Closing the browser tab, refreshing the page, or losing network connectivity triggers a disconnect.
   - **Server-side Force Disconnect**: `socket.disconnect(true)` forces a client to disconnect from the server.
   - **Listening for Disconnect**: Both client and server listen to `socket.on("disconnect", (reason) => { ... })`.

---

### 5.2 Server-Side Code Snippet (`index.js`)

```javascript
import { createServer } from "node:http";
import express from "express";
import path from "node:path";
import { Server } from "socket.io";

const app = express();
app.use(express.static(path.resolve("public")));

const server = createServer(app);
const io = new Server(server); // Binds Socket.IO to HTTP server

// 1. Listen for new client connections
io.on("connection", (socket) => {
  console.log("Client connected. Socket ID:", socket.id);

  // 2. Listen for custom events from this client
  socket.on("user:message", (data) => {
    console.log(`Message from ${socket.id}:`, data);

    // Broadcast to ALL connected clients (including sender)
    io.emit("server:message", {
      text: data.text,
      senderId: socket.id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 3. Listen for client disconnection
  socket.on("disconnect", (reason) => {
    console.log(`Client ${socket.id} disconnected. Reason:`, reason);
  });
});

server.listen(4214, () => {
  console.log("Server running on http://localhost:4214");
});
```

---

### 5.3 Client-Side Code Snippet (`public/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Socket Client Quick Reference</title>
</head>
<body>
  <h1>Socket.IO Quick Chat</h1>
  
  <input type="text" id="msgInput" placeholder="Type a message..." />
  <button id="sendBtn">Send</button>
  <button id="closeBtn">Disconnect</button>

  <ul id="messages"></ul>

  <!-- 1. Load Socket.IO Client Library -->
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // 2. Connect to Server
    const socket = io();

    // 3. Connection Success Event
    socket.on("connect", () => {
      console.log("Connected to server! My Socket ID:", socket.id);
    });

    // 4. Send Message to Server
    document.getElementById("sendBtn").addEventListener("click", () => {
      const text = document.getElementById("msgInput").value;
      if (text) {
        socket.emit("user:message", { text: text });
        document.getElementById("msgInput").value = "";
      }
    });

    // 5. Receive Message from Server
    socket.on("server:message", (data) => {
      const li = document.createElement("li");
      const isSelf = data.senderId === socket.id;
      li.textContent = `${isSelf ? 'You' : data.senderId}: ${data.text} (${data.time})`;
      document.getElementById("messages").appendChild(li);
    });

    // 6. Manual Close Connection
    document.getElementById("closeBtn").addEventListener("click", () => {
      console.log("Closing connection manually...");
      socket.disconnect(); // Closes WebSocket connection
    });

    // 7. Handle Disconnection
    socket.on("disconnect", (reason) => {
      console.log("Disconnected from server. Reason:", reason);
    });
  </script>
</body>
</html>
```

---

## 6. Socket.IO API Reference

### Server-side

| What | Code |
|---|---|
| Listen for new connections | `io.on("connection", (socket) => { ... })` |
| Listen for a specific incoming event | `socket.on("eventName", (data) => { ... })` |
| Send to one specific client | `socket.emit("eventName", data)` (within that socket's own handler) or `io.to(socketId).emit(...)` |
| Send to **all** clients | `io.emit("eventName", data)` |
| Send to all **except** the sender | `socket.broadcast.emit("eventName", data)` |
| Send to a specific room | `io.to("roomName").emit("eventName", data)` |
| Join a room | `socket.join("roomName")` |
| Detect disconnect | `socket.on("disconnect", () => { ... })` |

### Client-side

| What | Code |
|---|---|
| Send an event | `socket.emit("eventName", data)` |
| Receive an event | `socket.on("eventName", (data) => { ... })` |
| Disconnect manually | `socket.disconnect()` |
| Reconnect | `socket.connect()` |

**Naming note:** in the browser, closing a socket is commonly exposed via `socket.close()` in some client libraries/UI contexts, but the standard Socket.IO client method is `socket.disconnect()`. On the server, you never call "close" on someone else's socket directly in normal use — you listen for their `disconnect` event.

### End-to-end example: client sends, server rebroadcasts, client receives

```javascript
// client → sends
socket.emit("user:message", message);

// server → receives, then rebroadcasts
socket.on("user:message", (msg) => {
  io.emit("server:message", msg);
});

// client → receives
socket.on("server:message", (msg) => {
  // render msg in the UI
});
```

### Building a "read receipt" (grey/blue tick) feature

The same event-based pattern extends naturally to read receipts:

```javascript
// client, once a message is visibly read
socket.emit("user:message:read", { messageId });

// server, forwards to the original sender only
socket.on("user:message:read", ({ messageId }) => {
  const senderSocketId = getSenderSocketId(messageId); // your own lookup
  io.to(senderSocketId).emit("server:message:read", { messageId });
});

// client (original sender), flips the tick from grey to blue
socket.on("server:message:read", ({ messageId }) => {
  markMessageAsRead(messageId);
});
```

---

## 7. Broadcast Is Scary at Scale — the N² Fan-Out Problem

Broadcasting looks simple, but it hides a real cost. If you have **100 users in a room** and 1 user sends a message, that message must be delivered to the other 99 — that's 99 individual send operations for a single message. If instead **every one of the 100 users** sends a message, that's `100 × 99 ≈ 9,900` send operations. This is the **N² fan-out problem**: cost grows roughly with the square of the number of participants, not linearly.

- The payload being sent is generally called a **buffer**, since the data being pushed through the socket can be anything (text, JSON, binary).
- At real scale (say, 10,000 users wanting a broadcast), naively opening/emitting to 10,000 sockets per message is expensive — this is why large-scale real-time systems don't do a naive "loop and emit to everyone" as rooms grow large; they use more efficient fan-out strategies (pub/sub backplanes, sharding rooms across multiple server processes, etc.).

---

## 8. Why You Can't Just Open Unlimited Connections

### 8.1 Everything is a file

On Linux, the OS treats virtually everything as a file — including a network connection. A WebSocket connection you open is, under the hood, a **file** the OS is tracking.

- Every open connection is a new **file descriptor** — a number the OS hands your process to refer to that open resource.
- Regular HTTP servers typically serve everything through **one port**; WebSocket connections are still one port for the server, but **each individual client connection consumes its own file descriptor** and stays open (unlike a short HTTP request/response that closes immediately).

### 8.2 Idle connections aren't free

Every open connection has an idle baseline memory cost — roughly on the order of ~10KB per idle connection — and that number **doesn't include** your application/framework overhead, buffers, or any actual payload data (images, video, docs) flowing through it. So:

- Even a "bare minimum" 100,000 idle connections can require multiple gigabytes of memory just to hold the connections open — before your app has done anything with them.

### 8.3 The OS itself limits how many connections you can hold

There are layered limits, roughly:

- A **kernel-wide (global) limit** on how many files/connections the whole machine can have open at once.
- A **per-process limit** on how many file descriptors (hence connections) a single process can hold — historically often defaulted low (e.g. ~1024).
- These limits exist specifically to stop one runaway process from exhausting resources the whole machine needs — which is why production systems that need many concurrent connections must deliberately raise these limits rather than hitting them by accident.

### 8.4 Port range also limits you

A connection over the network is identified by a unique combination of **IP address + port**. On a single machine (single IP), the usable/ephemeral port range is roughly in the **tens of thousands** (commonly cited as somewhere around 35,000–60,000, i.e. on the order of 25,000 usable ports) — meaning a single machine, single IP, can only sustain on the order of that many distinct outbound/inbound connections at once, **no matter how much RAM you throw at it**. Adding RAM without addressing the port ceiling is wasted spend — the port range becomes the bottleneck, not memory.

### 8.5 Why production systems (WhatsApp, Discord-scale) run millions of connections anyway

Products operating at millions of concurrent real-time connections don't do it on one process/one port range — they:

- Raise OS-level connection limits deliberately (rather than hitting the accidental low defaults),
- Shard connections across many machines/processes (each with its own IP/port budget),
- And rely on efficient OS-level I/O event notification (rather than inefficient older polling models) so that checking "which of these many thousands of sockets has new data" is cheap instead of scanning every connection repeatedly.

Some ecosystems reach for frameworks/platforms specifically built around this problem (e.g. Elixir/Phoenix's actor-model concurrency, or managed real-time backends like Convex) precisely because handling extremely high concurrent-connection counts efficiently is a hard, specialized problem — not something you get for free from a naive single-process setup.

---

## 9. Quick Reference

| Term | One-line meaning |
|---|---|
| HTTP request/response | One-way per exchange — client asks, server answers, done. No server-initiated push. |
| WebSocket | A long-lived, duplex connection — data flows both directions at once. |
| Socket.IO | A library on top of WebSockets adding events, rooms, and broadcast helpers. |
| Socket | One individual connected client, with its own unique `socket.id`. |
| IO | The server-side instance managing all connected sockets. |
| `socket.emit` | Send an event to one specific socket. |
| `io.emit` | Send an event to every connected socket. |
| `socket.broadcast.emit` | Send to every socket except the sender. |
| Room | A named group of sockets you can broadcast to selectively via `io.to(room).emit(...)`. |
| N² fan-out problem | Broadcast cost grows roughly with the square of participants — expensive at scale. |
| File descriptor | The OS's handle/number for any open resource, including a socket connection. |
| `ulimit` | Controls how many resources (e.g. open files/connections) a process may use; has a soft (current) and hard (maximum allowed) limit. |
| Ephemeral port range | The limited pool of ports (roughly tens of thousands) available per IP for connections — a hard ceiling independent of RAM. |

### Suggested hands-on assignments
1. Build a small chat app: backend Socket.IO setup, connection handler, `user:message`/`user:typing` events, broadcast to a room, and a client that sends/receives and shows a typing indicator and read receipts.
2. Try creating 10,000 checkboxes in a page, attach a change-event listener to each, and wire each one to emit a WebSocket event on toggle — a good hands-on way to feel where the fan-out cost actually shows up.
3. Push further: try simulating 1,000,000 checkboxes/connections and observe where it breaks first (browser DOM, socket count, server memory).
4. Write a short note on the Linux file system model (everything is a file) to connect this networking limit back to the OS fundamentals.

---

## 10. Rooms in Depth — Building "WhatsApp Groups" Properly

Everything so far treated a room as "a name you can broadcast to." That's correct, but a real chat-group feature (think a WhatsApp group) needs more: creating the group, adding/removing members, sending only to that group, leaving it, and cleaning up properly when someone disconnects. This section covers the full lifecycle.

### 10.1 Every socket is already in a room — its own

The moment a socket connects, Socket.IO automatically puts it in a room named after its own `socket.id`. This is why `io.to(socketId).emit(...)` works for "send to one specific client" — you're technically just emitting to a room that happens to contain exactly one socket. Rooms aren't a separate concept bolted onto sockets; targeting one socket and targeting a group are **the same mechanism**.

### 10.2 Creating a "group" — joining a custom room

A WhatsApp group is really just: a room name, and a list of sockets that have joined it.

```javascript
// server
socket.on("group:create", ({ groupId, memberSocketIds }) => {
  // group creator joins
  socket.join(`group:${groupId}`);

  // (in a real app you'd look up each member's CURRENT socket id from a
  // userId -> socketId map, since a raw socket id from the client can't be trusted)
  memberSocketIds.forEach((id) => {
    const memberSocket = io.sockets.sockets.get(id);
    memberSocket?.join(`group:${groupId}`);
  });

  io.to(`group:${groupId}`).emit("group:created", { groupId });
});
```

**Naming convention**: prefix room names by type (`group:123`, `user:456`, `doc:789`) so you never accidentally collide a group id with a user id or a document id in the same namespace.

### 10.3 Sending a message only to that group

```javascript
socket.on("group:message", ({ groupId, text }) => {
  io.to(`group:${groupId}`).emit("group:message", {
    groupId,
    from: socket.id,
    text,
    time: Date.now(),
  });
});
```

Note this uses `io.to(...)`, not `socket.broadcast.to(...)` — the sender is a group member too and, just like in WhatsApp, **should see their own message appear** (usually rendered instantly client-side on send, then confirmed/reconciled when the server echo arrives).

### 10.4 Leaving a group

```javascript
socket.on("group:leave", ({ groupId }) => {
  socket.leave(`group:${groupId}`);
  io.to(`group:${groupId}`).emit("group:memberLeft", { socketId: socket.id });
});
```

### 10.5 Who's in the group right now?

```javascript
const room = io.sockets.adapter.rooms.get(`group:${groupId}`);
const memberCount = room ? room.size : 0;
```

### 10.6 The pitfall: rooms don't survive reconnects the way you'd assume

**This is the single most common bug junior engineers hit with rooms.** A `socket.id` is only valid for the lifetime of that specific TCP/WebSocket connection. Refresh the page, lose wifi for a second, or have the server restart — the client reconnects with a **brand new `socket.id`**, and it is in **zero rooms** again, including its own former groups.

```javascript
// WRONG assumption: "the user rejoins their groups automatically"
// Reality: they don't. You must rejoin them explicitly on every (re)connect.

io.on("connection", async (socket) => {
  const userId = socket.handshake.auth?.userId; // sent by client on connect
  const groupIds = await getGroupsForUser(userId); // your own DB lookup

  groupIds.forEach((groupId) => socket.join(`group:${groupId}`));
});
```

**Good practice**: never treat room membership as durable state on its own. The **source of truth for "who is in this group" is your database** (a `group_members` table/collection). Room joins are just an **in-memory cache of that truth for the current connection**, rebuilt every time a socket connects. If your server restarts, every room membership resets to empty until clients reconnect and rejoin.

### 10.7 Cleanup on disconnect

You don't need to manually call `socket.leave()` for every room on disconnect — Socket.IO does this automatically and fires this internally before your `disconnect` handler runs. What you usually *do* need to do manually is business-logic cleanup:

```javascript
socket.on("disconnect", () => {
  // Socket.IO already removed this socket from all its rooms by this point.
  // You still need to tell other group members this user went offline:
  const groupsTheyWereIn = getGroupsForSocket(socket.id); // your own tracking
  groupsTheyWereIn.forEach((groupId) => {
    io.to(`group:${groupId}`).emit("group:memberOffline", { socketId: socket.id });
  });
});
```

---

## 11. Concurrency — Three Different Problems That Get Lumped Together

"Concurrency" in a WebSocket system isn't one issue — it's three separate problems that show up at different scales. A senior engineer should be able to name which one they're dealing with.

### 11.1 Problem 1 — Multiple Server Instances (Horizontal Scaling)

The single biggest concurrency trap: **everything shown so far only works if there's exactly one server process.**

If you run two instances of your Node server behind a load balancer:

```
                     ┌──────────────┐
Client A ──────────► │  Server  #1  │ ← Client A's socket lives HERE
                     └──────────────┘
                     ┌──────────────┐
Client B ──────────► │  Server  #2  │ ← Client B's socket lives HERE
                     └──────────────┘
```

If Client A emits a message and your handler does `io.emit(...)` or `io.to("group:123").emit(...)`, **that only reaches sockets connected to Server #1.** Server #2 has no idea the event happened — Client B never receives it, even though they're in the same group. `io`'s in-memory room registry is **per-process**, not shared across instances.

**The fix: the Socket.IO Redis Adapter.** Each server instance connects to a shared Redis instance; when one instance calls `io.emit(...)` or `io.to(room).emit(...)`, the adapter publishes that event through Redis pub/sub, and **every** server instance receives it and forwards it to its own locally-connected sockets.

```javascript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
// From here on, io.to(room).emit(...) reaches sockets on ANY server instance.
```

**Sticky sessions**: if you're using long-polling as a fallback transport (Socket.IO does this by default when WebSocket upgrade fails), a single logical connection can be made of multiple underlying HTTP requests — these **must** be routed to the same server instance, or the handshake breaks. Your load balancer needs **sticky sessions** (session affinity, usually by cookie or source IP) configured. Pure WebSocket-only connections don't strictly need this once upgraded, but the initial handshake sequence still benefits from it, and Socket.IO's own docs require it unless you disable the polling transport entirely.

### 11.2 Problem 2 — Race Conditions Inside a Single Connection

Each socket's event handlers can run concurrently if they're `async`. Two events arriving close together on the *same* socket can interleave in ways you don't expect if a handler does a slow operation (DB call) before finishing its work.

```javascript
// BUGGY: two rapid "group:join" events for the same user could both pass
// the "already a member?" check before either one finishes writing to the DB
socket.on("group:join", async ({ groupId }) => {
  const alreadyMember = await db.isMember(socket.userId, groupId); // slow
  if (!alreadyMember) {
    await db.addMember(socket.userId, groupId); // both calls can reach here
  }
});
```

**Fix patterns**:
- Make the DB operation itself idempotent (`INSERT ... ON CONFLICT DO NOTHING` / upsert) instead of "check-then-write."
- Or maintain a simple in-memory lock/queue per user for critical sections if the DB can't be made idempotent.

```javascript
// Idempotent version — no race window, regardless of arrival order
socket.on("group:join", async ({ groupId }) => {
  await db.addMemberIfNotExists(socket.userId, groupId); // atomic upsert
});
```

### 11.3 Problem 3 — Backpressure (a Slow Client Can't Keep Up)

If your server emits data faster than a client can consume it (e.g. a live feed, bulk history replay, a slow mobile connection), the data queues up in Socket.IO's internal buffer for that socket. This buffer **isn't unlimited** — if it keeps growing because the client never catches up, that socket accumulates memory that never frees, effectively becoming a slow memory leak per bad connection, multiplied across every slow client.

**Good practices**:
- **Don't blast large payloads/history over the socket in one shot.** Paginate — send the last N messages via a normal HTTP/REST call on load, use the socket only for genuinely live/incremental updates.
- **Throttle high-frequency emits** (e.g. typing indicators, cursor position, live metrics) — emit at a fixed interval (e.g. every 100–200ms) rather than on every single underlying event.
- **Use acknowledgements for anything that must be confirmed delivered** (see §12.4) instead of assuming a fire-and-forget `emit` always lands immediately.
- **Set `maxHttpBufferSize`** (a Socket.IO server option) to cap the maximum size of a single incoming message, so one misbehaving/malicious client can't send a huge payload and blow up server memory.

```javascript
const io = new Server(server, {
  maxHttpBufferSize: 1e6, // 1 MB cap per message
});
```

---

## 12. Error Handling — Connection-Level and Application-Level

### 12.1 Connection-level errors (the handshake itself fails)

```javascript
// client
const socket = io({
  auth: { token: getUserAuthToken() },
});

socket.on("connect_error", (err) => {
  // fires when the initial connection/handshake fails —
  // wrong URL, server down, or rejected by server-side auth middleware
  console.error("Could not connect:", err.message);
});
```

### 12.2 Authenticating a connection (and rejecting bad ones cleanly)

A WebSocket connection isn't a normal HTTP request-per-call, so you can't just check auth per request — you authenticate **once, at handshake time**, using Socket.IO middleware:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const claims = verifyJwt(token, publicKey); // from note 08
    socket.userId = claims.sub; // stash it on the socket for later handlers
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});
```

If `next(new Error(...))` is called, the connection is refused, and the client's `connect_error` handler above fires with that message. **This is the correct place to authenticate a socket** — not inside individual event handlers.

### 12.3 Reconnection behavior (built in, but worth knowing)

The client automatically retries with backoff by default. You can tune it:

```javascript
const socket = io({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,       // start at 1s
  reconnectionDelayMax: 5000,    // cap backoff at 5s
});

socket.on("reconnect_attempt", (attempt) => console.log("Retrying…", attempt));
socket.on("reconnect_failed", () => console.log("Gave up reconnecting"));
```

Remember §10.6: a reconnect means a new `socket.id` and empty room membership — your `connection` handler needs to rejoin the user's rooms from the DB every time, not just on first connect.

### 12.4 Application-level errors — inside event handlers

**Never let an event handler throw unhandled.** Unlike an Express route, there's no global error middleware catching it for you by default — an uncaught exception inside a synchronous handler can crash the process, and inside an async handler it becomes a silent unhandled rejection.

```javascript
socket.on("group:message", async ({ groupId, text }) => {
  try {
    if (!text || text.length > 2000) {
      throw new Error("Message must be 1–2000 characters");
    }
    await saveMessage(groupId, socket.userId, text);
    io.to(`group:${groupId}`).emit("group:message", { groupId, from: socket.userId, text });
  } catch (err) {
    // report the error back to the SENDER only, not the whole room
    socket.emit("error", { context: "group:message", message: err.message });
  }
});
```

### 12.5 Acknowledgements — getting a real success/failure result back

A plain `emit` is fire-and-forget — you don't know if it was received or processed. For anything where the sender needs confirmation (message actually saved, group actually joined), use an **acknowledgement callback**, which behaves like a mini request/response over the socket:

```javascript
// client
socket.emit("group:message", { groupId, text }, (response) => {
  if (response.ok) {
    console.log("Delivered, id:", response.messageId);
  } else {
    console.error("Failed:", response.error);
  }
});
```

```javascript
// server
socket.on("group:message", async ({ groupId, text }, callback) => {
  try {
    if (!text) throw new Error("Empty message");
    const saved = await saveMessage(groupId, socket.userId, text);
    io.to(`group:${groupId}`).emit("group:message", saved);
    callback?.({ ok: true, messageId: saved.id });
  } catch (err) {
    callback?.({ ok: false, error: err.message });
  }
});
```

Use acknowledgements for anything that changes state (sending a message, joining a group, marking as read) — reserve plain `emit` for pure broadcast/notification traffic where no individual confirmation is needed (typing indicators, presence pings).

### 12.6 Good practices summary (senior checklist)

- **Authenticate at the handshake** (`io.use` middleware), not inside individual handlers.
- **Treat the database as the source of truth for room membership** — rejoin rooms from the DB on every connect, never assume rooms persist across reconnects.
- **Wrap every async handler body in try/catch**, and report failures back to the sender via `socket.emit("error", ...)` or an acknowledgement callback — never let a handler throw unhandled.
- **Use acknowledgement callbacks for anything that must be confirmed** (message sent, group joined); use plain `emit` only for best-effort/broadcast traffic.
- **Make "check then write" operations idempotent** (upsert) instead of relying on ordering between concurrent events from the same client.
- **Deploy the Redis adapter (or equivalent) the moment you run more than one server instance** — without it, rooms and broadcasts silently only work for whoever happens to be on the same instance as the sender, which is a very easy bug to miss in local dev (where there's always exactly one instance) and only surfaces in production.
- **Configure sticky sessions on the load balancer** if long-polling fallback is enabled.
- **Cap payload size** (`maxHttpBufferSize`) and **throttle high-frequency emits** to protect against backpressure/memory growth from slow or malicious clients.
- **Namespace room names by type** (`group:`, `user:`, `doc:`) to avoid id collisions across different kinds of rooms.

---

## 13. Extended Quick Reference

| Term | One-line meaning |
|---|---|
| Default per-socket room | Every socket auto-joins a room named after its own `socket.id` — this is how `io.to(socketId)` works. |
| `socket.leave(room)` | Removes the socket from a room; happens automatically for all rooms on disconnect. |
| `io.sockets.adapter.rooms.get(room)` | Inspect current membership/size of a room. |
| Redis adapter | Lets `io.emit`/`io.to(room).emit` reach sockets connected to **other server instances**, via Redis pub/sub — required once you run more than one server process. |
| Sticky sessions | Load-balancer setting that keeps a client's polling-transport requests routed to the same server instance during handshake. |
| Race condition (per-socket) | Two concurrent async events on the same socket both passing a stale check before either finishes writing — fix with idempotent writes, not more checks. |
| Backpressure | A slow client can't keep up with server emits, causing the socket's internal send buffer to grow — mitigate with pagination, throttling, and payload caps. |
| `io.use(middleware)` | Runs once per socket at handshake time — the correct place to authenticate a connection. |
| `connect_error` | Client-side event fired when the handshake itself is rejected or fails. |
| Acknowledgement callback | An `emit(event, data, callback)` pattern that gives you a real success/failure response, unlike fire-and-forget `emit`. |

### Suggested hands-on assignments (advanced)
1. Run two instances of your chat server locally on different ports, put them behind a simple round-robin proxy, and reproduce the "message doesn't reach everyone" bug — then fix it with the Redis adapter and confirm it now works.
2. Build the WhatsApp-style group flow end to end: create group, add/remove members, send group-only messages, leave group, and correctly rejoin all of a user's groups after a forced reconnect (kill and restart the server while a client is connected).
3. Add `io.use` handshake authentication using the JWT/public-key verification from note 08, and confirm an invalid token is rejected at connection time, not inside a handler.
4. Deliberately trigger a race: fire two `group:join` events for the same user back-to-back and prove the "check then write" version double-inserts, then fix it with an idempotent upsert.
5. Add acknowledgement callbacks to `group:message` and simulate a save failure (throw inside the handler) — confirm the sender sees the failure and no other group member receives the broken message.
