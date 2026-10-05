import crypto from "crypto";
import db from "../db/index.js";
import { usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateAuthTokens, verifyRefreshToken } from "../utils/jwt.utils.js";

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
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        password: usersTable.password,
        salt: usersTable.salt,
      })
      .from(usersTable)
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

    const { accessToken, refreshToken } = generateAuthTokens(data);

    return {
      userId: data.id,
      accessToken,
      refreshToken,
    };
  }

  static async refreshTokens({ refreshToken }) {
    if (!refreshToken) {
      const error = new Error("Refresh token is required.");
      error.statusCode = 400;
      throw error;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      const error = new Error("Invalid or expired refresh token.");
      error.statusCode = 401;
      throw error;
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.id));

    if (!user) {
      const error = new Error("User associated with token no longer exists.");
      error.statusCode = 404;
      throw error;
    }

    const tokens = generateAuthTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  static async logoutUser(userId) {
    return { message: "Logged out successfully." };
  }
}

export default AuthServices;
