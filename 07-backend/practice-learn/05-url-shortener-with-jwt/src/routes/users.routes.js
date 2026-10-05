import { Router } from "express";
import { shouldBeAuthenticated, shouldBeAdmin } from "../middleware/auth.middleware.js";
import UsersControllers from "../controllers/users.controller.js";

const router = Router();

// Get My Profile
router.get("/me", shouldBeAuthenticated, UsersControllers.getProfile);

// Get All Users (Admin only)
router.get(
  "/",
  shouldBeAuthenticated,
  shouldBeAdmin,
  UsersControllers.getAllUsers,
);

export default router;

