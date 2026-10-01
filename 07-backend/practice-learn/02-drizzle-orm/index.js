import "dotenv/config";
import express from "express";
import { sql } from "drizzle-orm";
import { usersTable } from "./db/schema.js";
import db from "./db/index.js";

const PORT = process.env.PORT || 8000;
const app = express();

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Verify connection & start server
async function init() {
  try {
    // Ping PostgreSQL to verify DB credentials & connection
    await db.execute(sql`SELECT 1`);
    console.log("✅ Successfully connected to PostgreSQL database!");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
}

init();
