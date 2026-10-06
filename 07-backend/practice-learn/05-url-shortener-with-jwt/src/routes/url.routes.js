import { Router } from "express";
import UrlController from "../controllers/url.controller.js";
import { shouldBeAuthenticated } from "../middleware/auth.middleware.js";

const router = Router();

// Public: View all short URLs
router.get("/", UrlController.getAllUrls);

// Authenticated: View URLs created by logged-in user
router.get("/my-urls", shouldBeAuthenticated, UrlController.getMyUrls);

// Public: View URL details by ID
router.get("/:id", UrlController.getUrlById);

// Authenticated: Create a new short URL
router.post("/", shouldBeAuthenticated, UrlController.createShortUrl);

// Authenticated: Update short URL (Only creator or admin)
router.put("/:id", shouldBeAuthenticated, UrlController.updateUrl);

// Authenticated: Delete short URL (Only creator or admin)
router.delete("/:id", shouldBeAuthenticated, UrlController.deleteUrl);

export default router;
