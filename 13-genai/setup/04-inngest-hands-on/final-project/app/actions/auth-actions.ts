"use server";

import { inngest } from "@/lib/services/inngest";

export async function sendWelcomeEmailEvent(
  userId: string,
  email: string,
  name: string
) {
  try {
    await inngest.send({
      name: "user.created",
      data: {
        userId,
        email,
        name,
      },
    });
  } catch (error) {
    // Log but don't fail - welcome email is optional
    console.error("Failed to send welcome email event:", error);
  }
}
