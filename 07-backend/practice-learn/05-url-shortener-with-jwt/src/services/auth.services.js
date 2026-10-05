import crypto from "crypto";
import db from "../db/index.js";
import { sessionTable, usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

class AuthServices {
  static async createUser({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));

    if (existingUser) {
      const error = new Error("User with this email already exists.");
      error.statusCode = 400;
      throw error;
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

    return user;
  }

  static async loginUser({ email, password }) {
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
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      throw error;
    }

    const hashedPassword = crypto
      .createHmac("sha256", data.salt)
      .update(password)
      .digest("hex");

    if (hashedPassword !== data.password) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      throw error;
    }

    // Return active session if valid
    if (data.sessionId && new Date(data.sessionExpiresAt) > new Date()) {
      return {
        userId: data.id,
        sessionId: data.sessionId,
        isExisting: true,
      };
    }

    // Upsert session (24h expiry)
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

    return {
      userId: data.id,
      sessionId: session.id,
      isExisting: false,
    };
  }

  static async logoutUser(userId) {
    await db
      .delete(sessionTable)
      .where(eq(sessionTable.userId, userId));
  }

  static async validateSession(sessionId) {
    if (!sessionId) return null;

    const [sessionData] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        expiresAt: sessionTable.expiresAt,
        sessionId: sessionTable.id,
      })
      .from(sessionTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionTable.userId))
      .where(eq(sessionTable.id, sessionId));

    if (!sessionData) return null;

    if (new Date(sessionData.expiresAt) <= new Date()) {
      return null;
    }

    return {
      id: sessionData.id,
      name: sessionData.name,
      email: sessionData.email,
      role: sessionData.role,
      sessionId: sessionData.sessionId,
    };
  }
}

export default AuthServices;
