import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { answers, answerVotes, userProfile } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/answers/[id]/vote - Vote on an answer
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
    const { voteType } = await request.json();

    if (!voteType || !["upvote", "downvote"].includes(voteType)) {
      return NextResponse.json(
        { success: false, error: "Invalid vote type" },
        { status: 400 }
      );
    }

    // Check if user already voted
    const existingVote = await db.query.answerVotes.findFirst({
      where: and(
        eq(answerVotes.answerId, answerId),
        eq(answerVotes.userId, userId)
      ),
    });

    // Get the answer to know the author
    const answer = await db.query.answers.findFirst({
      where: eq(answers.id, answerId),
    });

    if (!answer) {
      return NextResponse.json(
        { success: false, error: "Answer not found" },
        { status: 404 }
      );
    }

    // Prevent voting on own answer
    if (answer.authorId === userId) {
      return NextResponse.json(
        { success: false, error: "Cannot vote on your own answer" },
        { status: 400 }
      );
    }

    // Note: Neon HTTP driver doesn't support db.transaction()
    // Using db.batch() to execute multiple operations atomically
    if (existingVote) {
      // If same vote type, remove the vote (toggle off)
      if (existingVote.voteType === voteType) {
        const voteChange = voteType === "upvote" ? -1 : 1;
        const repChange = voteType === "upvote" ? -10 : 2;

        if (answer.authorId) {
          await db.batch([
            db
              .delete(answerVotes)
              .where(
                and(
                  eq(answerVotes.answerId, answerId),
                  eq(answerVotes.userId, userId)
                )
              ),
            db
              .update(answers)
              .set({ votes: sql`${answers.votes} + ${voteChange}` })
              .where(eq(answers.id, answerId)),
            db
              .update(userProfile)
              .set({
                reputation: sql`${userProfile.reputation} + ${repChange}`,
              })
              .where(eq(userProfile.userId, answer.authorId)),
          ]);
        } else {
          await db.batch([
            db
              .delete(answerVotes)
              .where(
                and(
                  eq(answerVotes.answerId, answerId),
                  eq(answerVotes.userId, userId)
                )
              ),
            db
              .update(answers)
              .set({ votes: sql`${answers.votes} + ${voteChange}` })
              .where(eq(answers.id, answerId)),
          ]);
        }
      } else {
        // Change vote type
        const voteChange = voteType === "upvote" ? 2 : -2;
        const repChange = voteType === "upvote" ? 12 : -12;

        if (answer.authorId) {
          await db.batch([
            db
              .update(answerVotes)
              .set({ voteType: voteType as "upvote" | "downvote" })
              .where(
                and(
                  eq(answerVotes.answerId, answerId),
                  eq(answerVotes.userId, userId)
                )
              ),
            db
              .update(answers)
              .set({ votes: sql`${answers.votes} + ${voteChange}` })
              .where(eq(answers.id, answerId)),
            db
              .update(userProfile)
              .set({
                reputation: sql`${userProfile.reputation} + ${repChange}`,
              })
              .where(eq(userProfile.userId, answer.authorId)),
          ]);
        } else {
          await db.batch([
            db
              .update(answerVotes)
              .set({ voteType: voteType as "upvote" | "downvote" })
              .where(
                and(
                  eq(answerVotes.answerId, answerId),
                  eq(answerVotes.userId, userId)
                )
              ),
            db
              .update(answers)
              .set({ votes: sql`${answers.votes} + ${voteChange}` })
              .where(eq(answers.id, answerId)),
          ]);
        }
      }
    } else {
      // New vote
      const voteChange = voteType === "upvote" ? 1 : -1;
      const repChange = voteType === "upvote" ? 10 : -2;

      if (answer.authorId) {
        await db.batch([
          db.insert(answerVotes).values({
            answerId,
            userId,
            voteType: voteType as "upvote" | "downvote",
          }),
          db
            .update(answers)
            .set({ votes: sql`${answers.votes} + ${voteChange}` })
            .where(eq(answers.id, answerId)),
          db
            .update(userProfile)
            .set({
              reputation: sql`${userProfile.reputation} + ${repChange}`,
            })
            .where(eq(userProfile.userId, answer.authorId)),
        ]);
      } else {
        await db.batch([
          db.insert(answerVotes).values({
            answerId,
            userId,
            voteType: voteType as "upvote" | "downvote",
          }),
          db
            .update(answers)
            .set({ votes: sql`${answers.votes} + ${voteChange}` })
            .where(eq(answers.id, answerId)),
        ]);
      }
    }

    // Fetch updated answer with new vote count
    const updatedAnswer = await db.query.answers.findFirst({
      where: eq(answers.id, answerId),
    });

    // Check user's current vote after the operation
    const currentUserVote = await db.query.answerVotes.findFirst({
      where: and(
        eq(answerVotes.answerId, answerId),
        eq(answerVotes.userId, userId)
      ),
    });

    return NextResponse.json({
      success: true,
      message: "Vote recorded",
      votes: updatedAnswer?.votes || 0,
      userVote: currentUserVote?.voteType || null,
    });
  } catch (error) {
    console.error("Error voting on answer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to vote" },
      { status: 500 }
    );
  }
}
