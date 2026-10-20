import { apiRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { inngest } from "@/lib/services/inngest";
import { answers, questions, questionTags, tags } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const generateAIAnswer = inngest.createFunction(
  {
    id: "generate-ai-answer",
    name: "Generate AI Answer for Question",
    concurrency: {
      limit: 10, // Max 10 concurrent AI calls
    },
  },
  { event: "question.created" },
  async ({ event, step }) => {
    const { questionId, title, body, images, authorId } = event.data;

    // Step 1: Generate presigned URLs for images if they exist
    const imageUrls = await step.run("generate-image-urls", async () => {
      if (!images || images.length === 0) {
        return [];
      }

      const urls = [];
      for (const imageKey of images) {
        try {
          const result = await apiRequest("/api/upload/image-url", {
            method: "POST",
            body: JSON.stringify({ key: imageKey }),
          });
          urls.push((result as { url: string }).url);
        } catch (error) {
          console.error(
            "Error generating presigned URL for image:",
            imageKey,
            error
          );
        }
      }
      return urls;
    });

    // Step 2: AI Tag Generation using GPT-5-mini
    const tagsResult = await step.ai.infer("generate-tags", {
      model: step.ai.models.openai({
        model: "gpt-5-mini",
      }),
      body: {
        messages: [
          {
            role: "system",
            content: `You are a tag generator for a Q&A platform. Return ONLY a JSON array of 3-5 relevant tags (lowercase, hyphenated). Focus on: programming languages, frameworks, technologies, concepts. Example: ["react", "javascript", "hooks"]`,
          },
          {
            role: "user",
            content: `Question Title: ${title}\n\nQuestion Body: ${body}`,
          },
        ],
      },
    });

    // Parse tags - handle markdown code blocks and plain JSON
    let generatedTags: string[] = [];
    try {
      let content = tagsResult.choices[0].message.content || "[]";

      // Remove markdown code blocks if present (```json ... ```)
      content = content
        .replace(/^```(?:json)?\s*\n?/gm, "")
        .replace(/\n?```$/gm, "")
        .trim();

      // Parse the JSON array
      const parsed: string[] = JSON.parse(content);

      if (Array.isArray(parsed)) {
        generatedTags = parsed.map((tag) => String(tag).toLowerCase());
      } else {
        console.warn("Expected array of tags, got:", typeof parsed);
        generatedTags = [];
      }
    } catch (e) {
      console.error(
        "Failed to parse tags:",
        e,
        "Content:",
        tagsResult.choices[0].message.content
      );
      generatedTags = [];
    }

    // Step 3: AI Answer Generation with Vision Support
    // Note: Inngest's types don't support vision content arrays, but the API does
    // We use type assertion to work around this limitation
    type VisionMessageContent =
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;

    const userMessageContent: VisionMessageContent =
      imageUrls && imageUrls.length > 0
        ? [
            { type: "text" as const, text: `${title}\n\n${body}` },
            ...imageUrls.map((url: string) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ]
        : `${title}\n\n${body}`;

    const answerResult = await step.ai.infer("generate-answer", {
      model: step.ai.models.openai({
        model: "gpt-5",
      }),
      body: {
        messages: [
          {
            role: "system",
            content: `You are an expert programming assistant on a Q&A platform similar to Stack Overflow. Provide accurate, helpful, and well-structured answers. Include:
- Clear explanation
- Code examples with proper formatting
- Best practices
- Potential pitfalls to avoid
${imageUrls && imageUrls.length > 0 ? "- Analyze any provided images and reference them in your answer" : ""}
Format your answer in Markdown.`,
          },
          {
            role: "user",
            content: userMessageContent as string, // Type assertion: API supports arrays but Inngest types don't
          },
        ],
      },
    });

    const aiAnswerContent = answerResult.choices[0].message.content;

    // Step 4: Save to Database
    await step.run("save-to-database", async () => {
      // Upsert tags and collect their IDs
      const tagIds = [];

      for (const tagName of generatedTags) {
        const slug = tagName;

        // Upsert tag in a single query
        const [tag] = await db
          .insert(tags)
          .values({
            name: tagName,
            slug: slug,
            usageCount: 1,
          })
          .onConflictDoUpdate({
            target: tags.slug,
            set: {
              usageCount: sql`${tags.usageCount} + 1`,
            },
          })
          .returning();

        tagIds.push(tag.id);
      }

      // Batch insert all junction table records at once
      if (tagIds.length > 0) {
        await db
          .insert(questionTags)
          .values(
            tagIds.map((tagId) => ({
              questionId,
              tagId,
            }))
          )
          .onConflictDoNothing(); // Prevent duplicate entries
      }

      // Update question to mark AI answer as generated
      await db
        .update(questions)
        .set({
          aiAnswerGenerated: true,
        })
        .where(eq(questions.id, questionId));

      // Insert AI answer
      await db.insert(answers).values({
        questionId,
        content: aiAnswerContent!,
        isAiGenerated: true,
        authorId: null,
      });
    });

    // Step 5: Notify User
    await step.run("send-notification", async () => {
      await inngest.send({
        name: "answer.created",
        data: {
          questionId,
          userId: authorId,
          answerType: "ai",
        },
      });
    });

    return {
      success: true,
      questionId,
      tagsGenerated: generatedTags,
      answerLength: aiAnswerContent?.length,
    };
  }
);
