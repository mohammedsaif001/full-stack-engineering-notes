import { Router } from 'express';
import AuthController from "../controllers/auth.controller.js";
import { shouldBeAuthenticated } from "../middleware/auth.middleware.js";

const router = Router();

// Signup endpoint
router.post("/signup", AuthController.signup);

// Login endpoint
router.post("/login", AuthController.login);

// Logout endpoint
router.post("/logout", shouldBeAuthenticated, AuthController.logout);

export default router;