import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import { inngest } from "@/lib/services/inngest";
import { questions, userProfile } from "@/lib/db/schema";
import { askQuestionSchema } from "@/lib/validations/question";
import { desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/questions - List all questions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const questionsData = await db.query.questions.findMany({
      where: eq(questions.isDeleted, false),
      orderBy: [desc(questions.createdAt)],
      limit,
      offset,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        questionTags: {
          with: {
            tag: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to match the expected format
    const allQuestions = questionsData.map((q) => ({
      id: q.id,
      title: q.title,
      body: q.body,
      tags: q.questionTags.map((qt) => qt.tag.name),
      views: q.views,
      votes: q.votes,
      aiAnswerGenerated: q.aiAnswerGenerated,
      createdAt: q.createdAt,
      author: q.author,
    }));

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(questions)
      .where(eq(questions.isDeleted, false));

    return NextResponse.json({
      success: true,
      data: {
        questions: allQuestions,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST /api/questions - Create a new question
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { userId } = authResult;

    const body = await request.json();
    const validationResult = askQuestionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { title, body: questionBody, images } = validationResult.data;

    const [newQuestion] = await db
      .insert(questions)
      .values({
        title,
        body: questionBody,
        images: images || [],
        authorId: userId,
      })
      .returning();

    // Update user's question count in profile
    await db
      .update(userProfile)
      .set({
        questionsCount: sql`${userProfile.questionsCount} + 1`
      })
      .where(eq(userProfile.userId, userId));

    // Emit event for AI answer generation
    await inngest.send({
      name: "question.created",
      data: {
        questionId: newQuestion.id,
        title: newQuestion.title,
        body: newQuestion.body,
        images: newQuestion.images,
        authorId: newQuestion.authorId,
      },
    });

    return NextResponse.json({
      success: true,
      data: newQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create question" },
      { status: 500 }
    );
  }
}
