import { db } from "@/lib/db";
import { inngest } from "@/lib/services/inngest";
import { questions, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured - emails will not be sent");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export const sendAnswerNotification = inngest.createFunction(
  {
    id: "send-answer-notification",
    name: "Notify User of New Answer",
  },
  { event: "answer.created" },
  async ({ event, step }) => {
    const { questionId, userId, answerType } = event.data;

    // Step 1: Get question and user details
    const details = await step.run("fetch-details", async () => {
      const question = await db.query.questions.findFirst({
        where: eq(questions.id, questionId),
      });

      const user = await db.query.user.findFirst({
        where: eq(userTable.id, userId),
      });

      return { question, user };
    });

    if (!details.question || !details.user) {
      return { success: false, reason: "Question or user not found" };
    }

    // Send email notification
    const emailSent = await step.run("send-email", async () => {
      const resend = getResendClient();
      if (!resend) {
        console.log(
          "📧 Skipping answer notification email - Resend not configured"
        );
        return false;
      }

      await resend.emails.send({
        from: "DevQuery Forum <notifications@resend.dev>",
        to: details.user!.email,
        subject: `New ${answerType === "ai" ? "AI" : ""} Answer on Your Question`,
        html: `
          <h2>New Answer on Your Question</h2>
          <p>Hi ${details.user!.name},</p>
          <p>Your question <strong>"${details.question!.title}"</strong> received a new ${answerType === "ai" ? "AI-generated" : ""} answer.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/questions/${questionId}">View Answer</a></p>
        `,
      });
      return true;
    });

    return { success: true, emailSent };
  }
);
