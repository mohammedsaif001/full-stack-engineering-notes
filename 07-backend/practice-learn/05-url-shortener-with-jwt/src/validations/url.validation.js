import { z } from "zod";

export const createUrlSchema = z.object({
  body: z.object({
    url: z
      .string({ required_error: "URL is required." })
      .trim()
      .url("Invalid URL format. Must include http:// or https://"),
    customShortCode: z
      .string()
      .trim()
      .min(3, "Custom short code must be at least 3 characters.")
      .max(50, "Custom short code cannot exceed 50 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Custom short code can only contain letters, numbers, hyphens, and underscores.")
      .optional()
      .or(z.literal("")),
  }),
});

export const updateUrlSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: "URL ID is required." })
      .uuid("Invalid URL ID format."),
  }),
  body: z.object({
    url: z
      .string()
      .trim()
      .url("Invalid URL format. Must include http:// or https://")
      .optional(),
    customShortCode: z
      .string()
      .trim()
      .min(3, "Custom short code must be at least 3 characters.")
      .max(50, "Custom short code cannot exceed 50 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Custom short code can only contain letters, numbers, hyphens, and underscores.")
      .optional()
      .or(z.literal("")),
  }),
});

export const getUrlByIdSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: "URL ID is required." })
      .uuid("Invalid URL ID format."),
  }),
});

export const redirectShortCodeSchema = z.object({
  params: z.object({
    shortCode: z
      .string({ required_error: "Short code is required." })
      .min(1, "Short code cannot be empty.")
      .max(50, "Short code cannot exceed 50 characters."),
  }),
});
