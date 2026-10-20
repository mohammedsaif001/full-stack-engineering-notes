import { db } from "@/lib/db";
import { answers, questions, user } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users/[id] - Get user profile with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id;

    // Get user and profile
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
      with: {
        profile: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's recent questions (for display)
    const userQuestions = await db.query.questions.findMany({
      where: and(
        eq(questions.authorId, userId),
        eq(questions.isDeleted, false)
      ),
      orderBy: [desc(questions.createdAt)],
      limit: 10,
    });

    // Get user's recent answers (for display)
    const userAnswers = await db.query.answers.findMany({
      where: and(eq(answers.authorId, userId), eq(answers.isDeleted, false)),
      orderBy: [desc(answers.createdAt)],
      limit: 10,
      with: {
        question: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Use profile counts directly (they're updated on each action)
    const profileData = userData.profile || {
      questionsCount: 0,
      answersCount: 0,
      reputation: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          image: userData.image,
          createdAt: userData.createdAt,
        },
        profile: profileData,
        questions: userQuestions,
        answers: userAnswers,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
