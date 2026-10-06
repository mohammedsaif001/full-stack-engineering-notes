import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required." })
      .trim()
      .min(2, "Name must be at least 2 characters long.")
      .max(255, "Name cannot exceed 255 characters."),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .email("Invalid email address format."),
    password: z
      .string({ required_error: "Password is required." })
      .min(6, "Password must be at least 6 characters long."),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .email("Invalid email address format."),
    password: z
      .string({ required_error: "Password is required." })
      .min(1, "Password cannot be empty."),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: "Refresh token is required." })
      .min(1, "Refresh token cannot be empty."),
  }),
});
