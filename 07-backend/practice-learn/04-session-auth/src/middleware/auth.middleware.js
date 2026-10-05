import db from "../db/index.js";
import { sessionTable, usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

const authenticationMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) return next();
    
  const [user] = await db
    .select({
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(sessionTable)
    .where(eq(sessionTable.id, authorization))
    .innerJoin(usersTable, eq(usersTable.id, sessionTable.userId));

  req.user = user;

  return next();
};

const shouldBeAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized! Please Login First" });
};

const shouldBeAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  }
  return res
    .status(403)
    .json({ message: "You are not authorized to perform this operation" });
};

export { authenticationMiddleware, shouldBeAuthenticated, shouldBeAdmin };