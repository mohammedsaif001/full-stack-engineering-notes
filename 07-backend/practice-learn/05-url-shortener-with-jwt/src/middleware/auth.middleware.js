import db from "../db/index.js";
import { sessionTable, usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

const authenticationMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    // Extract token whether passed as "Bearer <token>" or raw "<token>"
    const sessionId = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!sessionId) return next();

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

    if (!sessionData) return next();

    // Verify session expiration
    if (new Date(sessionData.expiresAt) <= new Date()) {
      return next();
    }

    req.user = {
      id: sessionData.id,
      name: sessionData.name,
      email: sessionData.email,
      role: sessionData.role,
      sessionId: sessionData.sessionId,
    };

    return next();
  } catch (error) {
    // If DB query fails (e.g. invalid UUID format), fail safely to unauthenticated state
    return next();
  }
};

const shouldBeAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized! Please login first." });
};

const shouldBeAdmin = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }
  return res
    .status(403)
    .json({ message: "Forbidden! You are not authorized to perform this operation." });
};

export { authenticationMiddleware, shouldBeAuthenticated, shouldBeAdmin };