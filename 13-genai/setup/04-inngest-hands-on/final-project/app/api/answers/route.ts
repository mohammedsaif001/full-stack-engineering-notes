import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { inngest } from "@/lib/services/inngest";
import { answers, userProfile } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/answers - Create a new answer
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { userId } = authResult;

    const body = await request.json();
    const { questionId, content } = body;

    if (!questionId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [newAnswer] = await db
      .insert(answers)
      .values({
        questionId: parseInt(questionId),
        content,
        authorId: userId,
        isAiGenerated: false,
      })
      .returning();

    // Update user's answer count in profile
    await db
      .update(userProfile)
      .set({
        answersCount: sql`${userProfile.answersCount} + 1`,
      })
      .where(eq(userProfile.userId, userId));

    // Get question details for notification
    const question = await db.query.questions.findFirst({
      where: (questions, { eq }) => eq(questions.id, questionId),
    });

    if (question) {
      // Emit event for notification
      await inngest.send({
        name: "answer.created",
        data: {
          questionId,
          userId: question.authorId,
          answerType: "human",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: newAnswer,
    });
  } catch (error) {
    console.error("Error creating answer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create answer" },
      { status: 500 }
    );
  }
}
