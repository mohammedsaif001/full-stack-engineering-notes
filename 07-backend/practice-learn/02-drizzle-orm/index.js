import "dotenv/config";
import express from "express";
import { usersTable } from "./db/schema.js";
import db from "./db/index.js";

const PORT = process.env.PORT || 8000;

const app = express();

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/users", async (req, res) => {
  const users = await db.select().from(usersTable);
  res.status(200).json(users);
});

app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
