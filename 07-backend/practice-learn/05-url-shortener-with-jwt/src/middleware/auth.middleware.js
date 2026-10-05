import AuthServices from "../services/auth.services.js";

const authenticationMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const sessionId = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!sessionId) return next();

    const user = await AuthServices.validateSession(sessionId);
    if (user) {
      req.user = user;
    }

    return next();
  } catch (error) {
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