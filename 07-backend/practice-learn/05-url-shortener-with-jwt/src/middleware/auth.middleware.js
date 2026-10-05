import { verifyAccessToken } from "../utils/jwt.utils.js";

const authenticationMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    if (!token) return next();

    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
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