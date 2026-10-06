import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import { shouldBeAuthenticated } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validations/auth.validation.js";

const router = Router();

// Signup endpoint
router.post("/signup", validate(signupSchema), AuthController.signup);

// Login endpoint
router.post("/login", validate(loginSchema), AuthController.login);

// Refresh Token endpoint
router.post("/refresh", validate(refreshTokenSchema), AuthController.refresh);

// Logout endpoint
router.post("/logout", shouldBeAuthenticated, AuthController.logout);

export default router;