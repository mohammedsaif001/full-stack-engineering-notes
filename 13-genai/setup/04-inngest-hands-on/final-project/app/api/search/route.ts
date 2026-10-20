import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import { ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/search - Simple search for questions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Simple case-insensitive search in title and body
    const searchPattern = `%${query}%`;

    const resultsData = await db.query.questions.findMany({
      where: or(
        ilike(questions.title, searchPattern),
        ilike(questions.body, searchPattern)
      ),
      limit: 20,
      orderBy: questions.createdAt,
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
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
    const results = resultsData.map((q) => ({
      id: q.id,
      title: q.title,
      body: q.body,
      tags: q.questionTags.map((qt) => qt.tag.name),
      images: q.images,
      views: q.views,
      votes: q.votes,
      createdAt: q.createdAt,
      author: q.author,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search questions" },
      { status: 500 }
    );
  }
}
