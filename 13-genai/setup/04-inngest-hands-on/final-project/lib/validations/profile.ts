import { z } from "zod";

export const updateProfileSchema = z.object({
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  location: z.string().max(100, "Location must be 100 characters or less").optional(),
  website: z.string().url("Please enter a valid URL").or(z.literal("")).optional(),
  githubHandle: z.string()
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/, "Invalid GitHub username")
    .max(39, "GitHub username must be 39 characters or less")
    .or(z.literal(""))
    .optional(),
});