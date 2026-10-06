import crypto from "crypto";
import db from "../db/index.js";
import { urlsTable } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

class UrlServices {
  /**
   * Helper function to generate a random 6-character short code
   */
  static generateRandomShortCode() {
    return crypto.randomBytes(3).toString("hex");
  }

  /**
   * Create a new short URL (Requires authentication)
   */
  static async createUrl({ url, customShortCode, userId }) {
    if (!url) {
      const error = new Error("URL is required.");
      error.statusCode = 400;
      throw error;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      const error = new Error("Invalid URL format. Please include http:// or https://");
      error.statusCode = 400;
      throw error;
    }

    let shortCode = customShortCode ? customShortCode.trim() : null;

    if (shortCode) {
      const [existing] = await db
        .select({ id: urlsTable.id })
        .from(urlsTable)
        .where(eq(urlsTable.shortCode, shortCode));

      if (existing) {
        const error = new Error("Custom short code is already taken.");
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Auto-generate unique short code
      let isUnique = false;
      while (!isUnique) {
        shortCode = this.generateRandomShortCode();
        const [existing] = await db
          .select({ id: urlsTable.id })
          .from(urlsTable)
          .where(eq(urlsTable.shortCode, shortCode));

        if (!existing) {
          isUnique = true;
        }
      }
    }

    const [newUrl] = await db
      .insert(urlsTable)
      .values({
        url: url.trim(),
        shortCode,
        userId,
      })
      .returning();

    return newUrl;
  }

  /**
   * Get original URL by short code and increment click count (Public)
   */
  static async getOriginalUrlAndIncrementClicks(shortCode) {
    const [urlRecord] = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.shortCode, shortCode));

    if (!urlRecord) {
      const error = new Error("Short URL not found.");
      error.statusCode = 404;
      throw error;
    }

    // Increment click count asynchronously
    await db
      .update(urlsTable)
      .set({ clicks: sql`${urlsTable.clicks} + 1` })
      .where(eq(urlsTable.id, urlRecord.id));

    return urlRecord;
  }

  /**
   * Get all URLs (Public)
   */
  static async getAllUrls() {
    const urls = await db.select().from(urlsTable);
    return urls;
  }

  /**
   * Get URL details by ID (Public)
   */
  static async getUrlById(id) {
    const [urlRecord] = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.id, id));

    if (!urlRecord) {
      const error = new Error("URL not found.");
      error.statusCode = 404;
      throw error;
    }

    return urlRecord;
  }

  /**
   * Get all URLs created by a specific user (Authenticated User)
   */
  static async getUserUrls(userId) {
    const urls = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.userId, userId));

    return urls;
  }

  /**
   * Update an existing short URL (Creator or Admin only)
   */
  static async updateUrl({ id, url, customShortCode, userId, userRole }) {
    const [existing] = await db
      .select()
      .from(urlsTable)
      .where(eq(urlsTable.id, id));

    if (!existing) {
      const error = new Error("URL not found.");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check: Only creator or admin can update
    if (existing.userId !== userId && userRole !== "admin") {
      const error = new Error("Forbidden! You can only update URLs created by you.");
      error.statusCode = 403;
      throw error;
    }

    const updates = {};

    if (url) {
      try {
        new URL(url);
        updates.url = url.trim();
      } catch (_) {
        const error = new Error("Invalid URL format.");
        error.statusCode = 400;
        throw error;
      }
    }

    if (customShortCode && customShortCode.trim() !== existing.shortCode) {
      const newCode = customShortCode.trim();
      const [taken] = await db
        .select({ id: urlsTable.id })
        .from(urlsTable)
        .where(eq(urlsTable.shortCode, newCode));

      if (taken) {
        const error = new Error("Custom short code is already in use.");
        error.statusCode = 400;
        throw error;
      }

      updates.shortCode = newCode;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const [updatedUrl] = await db
      .update(urlsTable)
      .set(updates)
      .where(eq(urlsTable.id, id))
      .returning();

    return updatedUrl;
  }

  /**
   * Delete a short URL (Creator or Admin only)
   */
  static async deleteUrl({ id, userId, userRole }) {
    const [existing] = await db
      .select({ id: urlsTable.id, userId: urlsTable.userId })
      .from(urlsTable)
      .where(eq(urlsTable.id, id));

    if (!existing) {
      const error = new Error("URL not found.");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check: Only creator or admin can delete
    if (existing.userId !== userId && userRole !== "admin") {
      const error = new Error("Forbidden! You can only delete URLs created by you.");
      error.statusCode = 403;
      throw error;
    }

    await db.delete(urlsTable).where(eq(urlsTable.id, id));

    return { message: "URL deleted successfully." };
  }
}

export default UrlServices;
