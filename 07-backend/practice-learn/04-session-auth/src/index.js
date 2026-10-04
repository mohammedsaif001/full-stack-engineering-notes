import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import db from './db/index.js';
import { sessionTable, usersTable } from "./db/schema.js";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());

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

    const [user] = await db
      .select({
        id: usersTable.id,
        password: usersTable.password,
        salt: usersTable.salt,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = crypto
      .createHmac("sha256", user.salt)
      .update(password)
      .digest("hex");
    if (hashedPassword !== user.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Check if an existing session exists for this user
    const [existingSession] = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.userId, user.id));

    if (existingSession) {
      if (new Date(existingSession.expiresAt) > new Date()) {
        return res.status(400).json({ message: "User is already logged in" });
      }
      // If the session has expired, remove it to allow re-login
      await db.delete(sessionTable).where(eq(sessionTable.userId, user.id));
    }

    const [session] = await db
      .insert(sessionTable)
      .values({
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning({ id: sessionTable.id });

    return res.status(200).json({
      userId: user.id,
      message: "User Logged In Successfully",
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Login Error:", error);
    if (error.code === "23505") {
      return res.status(400).json({ message: "User is already logged in" });
    }
    return res.status(500).json({ error: error.message });
  }
});


app.listen(process.env.PORT,(err)=>{
    if(err){
        console.log(err);
        return;
    }
    console.log(`Server is running on port ${process.env.PORT}`);
})