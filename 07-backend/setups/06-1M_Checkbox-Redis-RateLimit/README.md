# 1M Checkbox — Redis Pub/Sub + Rate Limiting

A shared 100-checkbox grid. Any client toggling a checkbox broadcasts that
change to every other connected client — even when clients are connected to
*different* running instances of this server — using Redis (Valkey) pub/sub.
Demonstrates horizontal scaling without sticky sessions or a shared socket.io
adapter: each instance independently subscribes to the same Redis channel.

## Architecture

- **3 separate ioredis connections** (`redis-connection.js`):
  - `publisher` — only publishes checkbox-change events
  - `subscriber` — only subscribes to checkbox-change events (ioredis requires
    a dedicated connection once it enters subscribe mode)
  - `data` — regular GET/SET commands: rate-limit timestamps and the
    checkbox-state array
- **State**: a single Redis key holding a JSON-stringified `boolean[100]`
  array
- **Rate limiting**: per-socket, keyed by `socket.id`, stored in Redis so it
  works correctly even if the same client reconnects to a different instance
  — a change is rejected with `server:error` if less than 1 second has
  passed since that socket's last accepted change
- **Optimistic UI**: the client flips a checkbox immediately on click, and
  only reverts it if the server rejects the change (`server:error`)

## Setup

1. Start Valkey:
   ```bash
   docker compose up -d
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:8000`.

## Demonstrating horizontal scaling

Run two (or more) instances on different ports, in separate terminals, both
pointed at the same Valkey instance.

On macOS/Linux (bash):
```bash
# terminal 1
export PORT=8000 && npm run dev

# terminal 2
export PORT=9000 && npm run dev
```

On Windows PowerShell:
```powershell
# terminal 1
$env:PORT=8000; npm run dev

# terminal 2
$env:PORT=9000; npm run dev
```

Open `http://localhost:8000` in one browser tab and `http://localhost:9000`
in another. Toggling a checkbox in either tab updates the other — the two
processes never talk to each other directly, only through Redis pub/sub.

## Rate limiting in action

Click the same checkbox twice within 1 second. The second click is rejected
server-side (`server:error`), and the client reverts its optimistic flip.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /checkboxes` | Current state of all 100 checkboxes |
| `client:checkbox:change` (socket event, client → server) | `{ index, checked }` |
| `server:checkbox:change` (socket event, server → client) | Broadcast of an accepted change |
| `server:error` (socket event, server → client) | `{ error }` — e.g. rate limited |
