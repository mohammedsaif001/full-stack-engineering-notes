import "dotenv/config";
import express from "express";
import { and, eq, sql } from "drizzle-orm";
import { usersTable } from "./db/schema.js";
import db from "./db/index.js";

const PORT = process.env.PORT || 8000;
const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(2);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/users/and", async (req, res) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.name, "MS"), eq(usersTable.age, 1007)));
    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { age, email, name } = req.body;

    const data = await db
      .insert(usersTable)
      .values({ age, email, name })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
      });

    return res.status(201).json({
      data,
      message: "User Created Successfully",
    });
  } catch (error) {
    // Extract raw PostgreSQL error object
    const pgError = error.cause || error;

    // Code 23505 = Unique constraint violation (duplicate email)
    if (pgError.code === "23505") {
      return res.status(409).json({
        error: "A user with this email already exists",
      });
    }

    // Code 23502 = Not Null violation (missing required field)
    if (pgError.code === "23502") {
      return res.status(400).json({
        error: `Field '${pgError.column}' is required`,
      });
    }

    // Log the full unexpected error on the server console for debugging
    console.error("Unexpected DB Error:", error);

    // Return a clean fallback message to the client
    return res.status(500).json({
      error: "Internal Server Error",
    });
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
