import { db } from "@/lib/db";
import { inngest } from "@/lib/services/inngest";
import {
  questions,
  user as userTable,
  answers,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured - emails will not be sent");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export const sendAnswerAcceptedNotification = inngest.createFunction(
  {
    id: "send-answer-accepted-notification",
    name: "Notify User Their Answer Was Accepted",
  },
  { event: "answer.accepted" },
  async ({ event, step }) => {
    const { questionId, authorId, answerId } = event.data;

    // Step 1: Get question, answer, and user details
    const details = await step.run("fetch-details", async () => {
      const question = await db.query.questions.findFirst({
        where: eq(questions.id, questionId),
      });

      const answer = await db.query.answers.findFirst({
        where: eq(answers.id, answerId),
      });

      const user = await db.query.user.findFirst({
        where: eq(userTable.id, authorId),
      });

      return { question, answer, user };
    });

    if (!details.question || !details.user || !details.answer) {
      return { success: false, reason: "Question, answer, or user not found" };
    }

    // Send email notification
    const emailSent = await step.run("send-email", async () => {
      const resend = getResendClient();
      if (!resend) {
        console.log(
          "📧 Skipping answer accepted email - Resend not configured"
        );
        return false;
      }

      await resend.emails.send({
        from: "DevQuery Forum <notifications@resend.dev>",
        to: details.user!.email,
        subject: "Your Answer Was Accepted!",
        html: `
          <h2>Congratulations! Your Answer Was Accepted</h2>
          <p>Hi ${details.user!.name},</p>
          <p>Your answer to the question <strong>"${details.question!.title}"</strong> was marked as the accepted answer!</p>
          <p>You earned <strong>+15 reputation points</strong> for this achievement.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/questions/${questionId}#answer-${answerId}">View Your Answer</a></p>
        `,
      });
      return true;
    });

    return { success: true, emailSent };
  }
);
