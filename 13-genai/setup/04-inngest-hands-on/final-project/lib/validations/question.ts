import { z } from "zod";

export const askQuestionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(15, "Title must be at least 15 characters")
    .max(150, "Title must be less than 150 characters"),
  body: z
    .string()
    .min(1, "Question body is required")
    .min(30, "Question body must be at least 30 characters"),
  images: z.array(z.string()),
});

export const submitAnswerSchema = z.object({
  content: z
    .string()
    .min(1, "Answer content is required")
    .min(30, "Answer must be at least 30 characters to be helpful"),
});
