import UrlServices from "../services/url.services.js";

class UrlController {
  /**
   * Create a new short URL (Authenticated users only)
   */
  static async createShortUrl(req, res) {
    try {
      const { url, customShortCode } = req.body;
      const userId = req.user.id;

      const newUrl = await UrlServices.createUrl({
        url,
        customShortCode,
        userId,
      });

      return res.status(201).json({
        url: newUrl,
        message: "Short URL created successfully.",
      });
    } catch (error) {
      console.error("Create Short URL Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error." });
    }
  }

  /**
   * Redirect to original URL using short code (Public for everyone)
   */
  static async redirectToOriginalUrl(req, res) {
    try {
      const { shortCode } = req.params;
      const urlRecord = await UrlServices.getOriginalUrlAndIncrementClicks(shortCode);

      // Perform HTTP 302 redirect to target URL
      return res.redirect(urlRecord.url);
    } catch (error) {
      console.error("Redirect Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error." });
    }
  }

  /**
   * Get all URLs (Public for everyone)
   */
  static async getAllUrls(req, res) {
    try {
      const urls = await UrlServices.getAllUrls();
      return res.status(200).json(urls);
    } catch (error) {
      console.error("Get All URLs Error:", error);
      return res
        .status(500)
        .json({ message: "Internal server error while fetching URLs." });
    }
  }

  /**
   * Get URL details by ID (Public for everyone)
   */
  static async getUrlById(req, res) {
    try {
      const { id } = req.params;
      const urlRecord = await UrlServices.getUrlById(id);
      return res.status(200).json(urlRecord);
    } catch (error) {
      console.error("Get URL By ID Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error." });
    }
  }

  /**
   * Get URLs created by current logged-in user (Authenticated users only)
   */
  static async getMyUrls(req, res) {
    try {
      const userId = req.user.id;
      const urls = await UrlServices.getUserUrls(userId);
      return res.status(200).json(urls);
    } catch (error) {
      console.error("Get My URLs Error:", error);
      return res
        .status(500)
        .json({ message: "Internal server error while fetching your URLs." });
    }
  }

  /**
   * Update short URL (Creator or Admin only)
   */
  static async updateUrl(req, res) {
    try {
      const { id } = req.params;
      const { url, customShortCode } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const updatedUrl = await UrlServices.updateUrl({
        id,
        url,
        customShortCode,
        userId,
        userRole,
      });

      return res.status(200).json({
        url: updatedUrl,
        message: "Short URL updated successfully.",
      });
    } catch (error) {
      console.error("Update URL Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error." });
    }
  }

  /**
   * Delete short URL (Creator or Admin only)
   */
  static async deleteUrl(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await UrlServices.deleteUrl({
        id,
        userId,
        userRole,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Delete URL Error:", error);
      const statusCode = error.statusCode || 500;
      return res
        .status(statusCode)
        .json({ message: error.message || "Internal server error." });
    }
  }
}

export default UrlController;
