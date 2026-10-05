import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import db from './db/index.js';
import { sessionTable, usersTable } from "./db/schema.js";
import { eq } from "drizzle-orm";
import {
  authenticationMiddleware,
  shouldBeAdmin,
  shouldBeAuthenticated,
} from "./middleware/auth.middleware.js";

const app = express();
app.use(express.json());
app.use(authenticationMiddleware);

app.get("/health", (req, res) => {
  return res.send("OK");
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = crypto
      .createHmac("sha256", salt)
      .update(password)
      .digest("hex");

    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (dbUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email,
        password: hashedPassword,
        salt,
        role: "user",
      })
      .returning({ id: usersTable.id });

    return res.status(201).json({ user, message: "User Created Successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 1st DB Call: Fetch user AND any existing session in ONE JOIN query
    const [data] = await db
      .select({
        id: usersTable.id,
        password: usersTable.password,
        salt: usersTable.salt,
        sessionId: sessionTable.id,
        sessionExpiresAt: sessionTable.expiresAt,
      })
      .from(usersTable)
      .leftJoin(sessionTable, eq(sessionTable.userId, usersTable.id))
      .where(eq(usersTable.email, email));

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = crypto
      .createHmac("sha256", data.salt)
      .update(password)
      .digest("hex");

    if (hashedPassword !== data.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Check if user has an active (non-expired) session
    if (data.sessionId && new Date(data.sessionExpiresAt) > new Date()) {
      return res.status(400).json({ message: "User is already logged in" });
    }

    // 2nd DB Call: Create or update session atomically
    const [session] = await db
      .insert(sessionTable)
      .values({
        userId: data.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoUpdate({
        target: sessionTable.userId,
        set: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      })
      .returning({ id: sessionTable.id });

    return res.status(200).json({
      userId: data.id,
      message: "User Logged In Successfully",
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/users", shouldBeAuthenticated, shouldBeAdmin, async (req, res) => {
  const data = await db.select().from(usersTable);

  return res.status(200).json(data);
});


app.listen(process.env.PORT,(err)=>{
    if(err){
        console.log(err);
        return;
    }
    console.log(`Server is running on port ${process.env.PORT}`);
})