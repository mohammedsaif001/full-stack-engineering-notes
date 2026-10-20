import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { answers, questions, userProfile } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/answers/[id] - Soft delete an answer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { userId } = authResult;

    const { id } = await params;
    const answerId = parseInt(id);

    // Get the answer
    const answer = await db.query.answers.findFirst({
      where: eq(answers.id, answerId),
    });

    if (!answer) {
      return NextResponse.json(
        { success: false, error: "Answer not found" },
        { status: 404 }
      );
    }

    // Verify ownership - only answer author can delete
    if (answer.authorId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the answer author can delete this answer" },
        { status: 403 }
      );
    }

    // Cannot delete AI-generated answers (they have no author anyway)
    if (answer.isAiGenerated) {
      return NextResponse.json(
        { success: false, error: "AI-generated answers cannot be deleted" },
        { status: 400 }
      );
    }

    // Execute database operations in a batch
    if (answer.isAccepted && answer.authorId) {
      // Answer is accepted and has an author
      await db.batch([
        db
          .update(answers)
          .set({ isDeleted: true })
          .where(eq(answers.id, answerId)),
        db
          .update(userProfile)
          .set({
            answersCount: sql`${userProfile.answersCount} - 1`,
          })
          .where(eq(userProfile.userId, answer.authorId)),
        db
          .update(questions)
          .set({ acceptedAnswerId: null })
          .where(eq(questions.id, answer.questionId)),
      ]);
    } else if (answer.isAccepted) {
      // Answer is accepted but has no author
      await db.batch([
        db
          .update(answers)
          .set({ isDeleted: true })
          .where(eq(answers.id, answerId)),
        db
          .update(questions)
          .set({ acceptedAnswerId: null })
          .where(eq(questions.id, answer.questionId)),
      ]);
    } else if (answer.authorId) {
      // Answer has an author but is not accepted
      await db.batch([
        db
          .update(answers)
          .set({ isDeleted: true })
          .where(eq(answers.id, answerId)),
        db
          .update(userProfile)
          .set({
            answersCount: sql`${userProfile.answersCount} - 1`,
          })
          .where(eq(userProfile.userId, answer.authorId)),
      ]);
    } else {
      // Answer has no author and is not accepted
      await db
        .update(answers)
        .set({ isDeleted: true })
        .where(eq(answers.id, answerId));
    }

    return NextResponse.json({
      success: true,
      message: "Answer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting answer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete answer" },
      { status: 500 }
    );
  }
}
