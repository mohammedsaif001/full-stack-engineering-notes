import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { questions, questionVotes, userProfile } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/questions/[id]/vote - Vote on a question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { userId } = authResult;

    const { id } = await params;
    const questionId = parseInt(id);
    const { voteType } = await request.json();

    if (!voteType || !["upvote", "downvote"].includes(voteType)) {
      return NextResponse.json(
        { success: false, error: "Invalid vote type" },
        { status: 400 }
      );
    }

    // Check if user already voted
    const existingVote = await db.query.questionVotes.findFirst({
      where: and(
        eq(questionVotes.questionId, questionId),
        eq(questionVotes.userId, userId)
      ),
    });

    // Get the question to know the author
    const question = await db.query.questions.findFirst({
      where: eq(questions.id, questionId),
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }

    // Prevent voting on own question
    if (question.authorId === userId) {
      return NextResponse.json(
        { success: false, error: "Cannot vote on your own question" },
        { status: 400 }
      );
    }

    // Note: Neon HTTP driver doesn't support db.transaction()
    // Using db.batch() to execute multiple operations atomically
    if (existingVote) {
      // If same vote type, remove the vote (toggle off)
      if (existingVote.voteType === voteType) {
        const voteChange = voteType === "upvote" ? -1 : 1;
        const repChange = voteType === "upvote" ? -5 : 2;

        await db.batch([
          db
            .delete(questionVotes)
            .where(
              and(
                eq(questionVotes.questionId, questionId),
                eq(questionVotes.userId, userId)
              )
            ),
          db
            .update(questions)
            .set({ votes: sql`${questions.votes} + ${voteChange}` })
            .where(eq(questions.id, questionId)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} + ${repChange}`,
            })
            .where(eq(userProfile.userId, question.authorId)),
        ]);
      } else {
        // Change vote type
        const voteChange = voteType === "upvote" ? 2 : -2;
        const repChange = voteType === "upvote" ? 7 : -7;

        await db.batch([
          db
            .update(questionVotes)
            .set({ voteType: voteType as "upvote" | "downvote" })
            .where(
              and(
                eq(questionVotes.questionId, questionId),
                eq(questionVotes.userId, userId)
              )
            ),
          db
            .update(questions)
            .set({ votes: sql`${questions.votes} + ${voteChange}` })
            .where(eq(questions.id, questionId)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} + ${repChange}`,
            })
            .where(eq(userProfile.userId, question.authorId)),
        ]);
      }
    } else {
      // New vote
      const voteChange = voteType === "upvote" ? 1 : -1;
      const repChange = voteType === "upvote" ? 5 : -2;

      await db.batch([
        db.insert(questionVotes).values({
          questionId,
          userId,
          voteType: voteType as "upvote" | "downvote",
        }),
        db
          .update(questions)
          .set({ votes: sql`${questions.votes} + ${voteChange}` })
          .where(eq(questions.id, questionId)),
        db
          .update(userProfile)
          .set({
            reputation: sql`${userProfile.reputation} + ${repChange}`,
          })
          .where(eq(userProfile.userId, question.authorId)),
      ]);
    }

    // Fetch updated question with new vote count
    const updatedQuestion = await db.query.questions.findFirst({
      where: eq(questions.id, questionId),
    });

    // Check user's current vote after the operation
    const currentUserVote = await db.query.questionVotes.findFirst({
      where: and(
        eq(questionVotes.questionId, questionId),
        eq(questionVotes.userId, userId)
      ),
    });

    return NextResponse.json({
      success: true,
      message: "Vote recorded",
      votes: updatedQuestion?.votes || 0,
      userVote: currentUserVote?.voteType || null,
    });
  } catch (error) {
    console.error("Error voting on question:", error);
    return NextResponse.json(
      { success: false, error: "Failed to vote" },
      { status: 500 }
    );
  }
}
