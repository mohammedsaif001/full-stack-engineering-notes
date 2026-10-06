import "dotenv/config";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/users.routes.js";
import urlRoutes from "./routes/url.routes.js";
import UrlController from "./controllers/url.controller.js";
import { validate } from "./middleware/validate.middleware.js";
import { redirectShortCodeSchema } from "./validations/url.validation.js";
import { createServer } from "node:http";
import app from "./app/express-app.js";

const server = createServer(app);

// Auth Routes
app.use("/", authRoutes);

// User Routes
app.use("/users", userRoutes);

// URL Shortener Routes
app.use("/urls", urlRoutes);

// Public Short Code Redirection Endpoint
app.get("/:shortCode", validate(redirectShortCodeSchema), UrlController.redirectToOriginalUrl);

// Health check endpoint
app.get("/health", (req, res) => {
  return res
    .status(200)
    .json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
