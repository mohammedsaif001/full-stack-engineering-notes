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
