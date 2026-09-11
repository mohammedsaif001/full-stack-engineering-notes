import express from "express";
import http from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import { publisher, subscriber, data } from "./redis-connection.js";

const PORT = process.env.PORT ?? 8000;
const CHECKBOX_COUNT = 100;
const CHECKBOX_STATE_KEY = "checkbox:state";
const RATE_LIMIT_WINDOW_MS = 1000;
const CHECKBOX_CHANGE_CHANNEL = "internal-server:checkbox:change";

async function getCheckboxState() {
  const existing = await data.get(CHECKBOX_STATE_KEY);
  if (existing) return JSON.parse(existing);

  const initial = new Array(CHECKBOX_COUNT).fill(false);
  await data.set(CHECKBOX_STATE_KEY, JSON.stringify(initial));
  return initial;
}

async function setCheckboxValue(index, checked) {
  const state = await getCheckboxState();
  state[index] = checked;
  await data.set(CHECKBOX_STATE_KEY, JSON.stringify(state));
}

async function main() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  io.attach(server);

  await subscriber.subscribe(CHECKBOX_CHANGE_CHANNEL);
  subscriber.on("message", (channel, message) => {
    if (channel !== CHECKBOX_CHANGE_CHANNEL) return;
    const { index, checked } = JSON.parse(message);
    io.emit("server:checkbox:change", { index, checked });
  });

  io.on("connection", (socket) => {
    console.log("Socket connected", { id: socket.id });

    socket.on("client:checkbox:change", async (payload) => {
      const { index, checked } = payload;
      console.log(`[Socket:${socket.id}] client:checkbox:change`, payload);

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
      await setCheckboxValue(index, checked);
      await publisher.publish(
        CHECKBOX_CHANGE_CHANNEL,
        JSON.stringify({ index, checked }),
      );
    });
  });

  app.use(express.static(path.resolve("public")));

  app.get("/health", (req, res) => res.json({ healthy: true }));

  app.get("/checkboxes", async (req, res) => {
    const state = await getCheckboxState();
    res.json({ checkboxes: state });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main();
