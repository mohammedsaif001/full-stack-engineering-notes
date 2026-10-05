import crypto from "crypto";
import db from "../db/index.js";
import { sessionTable, usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

class AuthController {
  static async signup(req, res) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const [existingUser] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail));

      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists." });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hashedPassword = crypto
        .createHmac("sha256", salt)
        .update(password)
        .digest("hex");

      const [user] = await db
        .insert(usersTable)
        .values({
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          salt,
          role: "user",
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
        });

      return res.status(201).json({ user, message: "User created successfully." });
    } catch (error) {
      console.error("Signup Error:", error);
      return res.status(500).json({ message: "Internal server error during signup." });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const normalizedEmail = email.trim().toLowerCase();

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
        .where(eq(usersTable.email, normalizedEmail));

      if (!data) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const hashedPassword = crypto
        .createHmac("sha256", data.salt)
        .update(password)
        .digest("hex");

      if (hashedPassword !== data.password) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      // If an active session exists, return existing session ID
      if (data.sessionId && new Date(data.sessionExpiresAt) > new Date()) {
        return res.status(200).json({
          userId: data.id,
          sessionId: data.sessionId,
          message: "User logged in successfully.",
        });
      }

      // Create or update session with a 24-hour expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const [session] = await db
        .insert(sessionTable)
        .values({
          userId: data.id,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: sessionTable.userId,
          set: { expiresAt },
        })
        .returning({ id: sessionTable.id });

      return res.status(200).json({
        userId: data.id,
        sessionId: session.id,
        message: "User logged in successfully.",
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({ message: "Internal server error during login." });
    }
  }

  static async logout(req, res) {
    try {
      await db
        .delete(sessionTable)
        .where(eq(sessionTable.userId, req.user.id));

      return res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
      console.error("Logout Error:", error);
      return res.status(500).json({ message: "Internal server error during logout." });
    }
  }
}

export default AuthController;