"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userProfile } from "@/lib/db/schema";
import { updateProfileSchema } from "@/lib/validations/profile";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { z } from "zod";

export async function updateProfile(
  formData: z.infer<typeof updateProfileSchema>
) {
  try {
    // For server actions, we need to get session differently
    // Let's use the headers from the current request context
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to update your profile",
      };
    }

    // Validate input
    const validatedData = updateProfileSchema.safeParse(formData);
    if (!validatedData.success) {
      return {
        success: false,
        error: "Invalid input",
        details: validatedData.error.format(),
      };
    }

    const { bio, location, website, githubHandle } = validatedData.data;

    // Check if user profile exists
    const existingProfile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, session.user.id),
    });

    if (existingProfile) {
      // Update existing profile
      await db
        .update(userProfile)
        .set({
          bio: bio || null,
          location: location || null,
          website: website || null,
          githubHandle: githubHandle || null,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.userId, session.user.id));
    } else {
      // Create new profile
      await db.insert(userProfile).values({
        userId: session.user.id,
        username: session.user.email?.split("@")[0] || "user", // Fallback username
        bio: bio || null,
        location: location || null,
        website: website || null,
        githubHandle: githubHandle || null,
        reputation: 0,
        questionsCount: 0,
        answersCount: 0,
      });
    }

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: "Failed to update profile",
    };
  }
}