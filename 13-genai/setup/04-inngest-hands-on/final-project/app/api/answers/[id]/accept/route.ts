import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { inngest } from "@/lib/services/inngest";
import { answers, questions, userProfile } from "@/lib/db/schema";
import { and, eq, not, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/answers/[id]/accept - Accept/unaccept an answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { userId } = authResult;

    const { id } = await params;
    const answerId = parseInt(id);

    // Get the answer and its question
    const answer = await db.query.answers.findFirst({
      where: eq(answers.id, answerId),
      with: {
        question: true,
      },
    });

    if (!answer) {
      return NextResponse.json(
        { success: false, error: "Answer not found" },
        { status: 404 }
      );
    }

    // Only question author can accept answers
    if (answer.question.authorId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the question author can accept answers",
        },
        { status: 403 }
      );
    }

    // Cannot accept own answer
    if (answer.authorId === userId) {
      return NextResponse.json(
        { success: false, error: "You cannot accept your own answer" },
        { status: 400 }
      );
    }

    // Cannot accept AI-generated answers
    if (answer.isAiGenerated) {
      return NextResponse.json(
        { success: false, error: "AI-generated answers cannot be accepted" },
        { status: 400 }
      );
    }

    // Check if this answer is already accepted
    const isCurrentlyAccepted = answer.isAccepted;

    if (isCurrentlyAccepted) {
      // Unaccept the answer (toggle off)
      if (answer.authorId) {
        await db.batch([
          // Set isAccepted to false
          db
            .update(answers)
            .set({ isAccepted: false })
            .where(eq(answers.id, answerId)),
          // Remove acceptedAnswerId from question
          db
            .update(questions)
            .set({ acceptedAnswerId: null })
            .where(eq(questions.id, answer.questionId)),
          // Deduct reputation from answer author
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} - 15`,
            })
            .where(eq(userProfile.userId, answer.authorId)),
        ]);
      } else {
        await db.batch([
          // Set isAccepted to false
          db
            .update(answers)
            .set({ isAccepted: false })
            .where(eq(answers.id, answerId)),
          // Remove acceptedAnswerId from question
          db
            .update(questions)
            .set({ acceptedAnswerId: null })
            .where(eq(questions.id, answer.questionId)),
        ]);
      }

      return NextResponse.json({
        success: true,
        message: "Answer unaccepted",
        accepted: false,
      });
    } else {
      // Check if another answer is already accepted
      const previouslyAcceptedAnswer = await db.query.answers.findFirst({
        where: and(
          eq(answers.questionId, answer.questionId),
          eq(answers.isAccepted, true),
          not(eq(answers.id, answerId))
        ),
      });

      // Handle different scenarios for batch operations
      if (
        previouslyAcceptedAnswer &&
        previouslyAcceptedAnswer.authorId &&
        answer.authorId
      ) {
        // Both previous and new answer have authors
        await db.batch([
          db
            .update(answers)
            .set({ isAccepted: true })
            .where(eq(answers.id, answerId)),
          db
            .update(questions)
            .set({ acceptedAnswerId: answerId })
            .where(eq(questions.id, answer.questionId)),
          db
            .update(answers)
            .set({ isAccepted: false })
            .where(eq(answers.id, previouslyAcceptedAnswer.id)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} - 15`,
            })
            .where(eq(userProfile.userId, previouslyAcceptedAnswer.authorId)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} + 15`,
            })
            .where(eq(userProfile.userId, answer.authorId)),
        ]);
      } else if (
        previouslyAcceptedAnswer &&
        previouslyAcceptedAnswer.authorId
      ) {
        // Only previous answer has author
        await db.batch([
          db
            .update(answers)
            .set({ isAccepted: true })
            .where(eq(answers.id, answerId)),
          db
            .update(questions)
            .set({ acceptedAnswerId: answerId })
            .where(eq(questions.id, answer.questionId)),
          db
            .update(answers)
            .set({ isAccepted: false })
            .where(eq(answers.id, previouslyAcceptedAnswer.id)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} - 15`,
            })
            .where(eq(userProfile.userId, previouslyAcceptedAnswer.authorId)),
        ]);
      } else if (answer.authorId) {
        // Only new answer has author
        await db.batch([
          db
            .update(answers)
            .set({ isAccepted: true })
            .where(eq(answers.id, answerId)),
          db
            .update(questions)
            .set({ acceptedAnswerId: answerId })
            .where(eq(questions.id, answer.questionId)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} + 15`,
            })
            .where(eq(userProfile.userId, answer.authorId)),
        ]);
      } else {
        // Neither has author (shouldn't happen but handle it)
        await db.batch([
          db
            .update(answers)
            .set({ isAccepted: true })
            .where(eq(answers.id, answerId)),
          db
            .update(questions)
            .set({ acceptedAnswerId: answerId })
            .where(eq(questions.id, answer.questionId)),
        ]);
      }

      // Send notification to answer author
      if (answer.authorId) {
        await inngest.send({
          name: "answer.accepted",
          data: {
            answerId,
            questionId: answer.questionId,
            authorId: answer.authorId,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Answer accepted",
        accepted: true,
      });
    }
  } catch (error) {
    console.error("Error accepting answer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept answer" },
      { status: 500 }
    );
  }
}
