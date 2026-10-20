import { generateAIAnswer } from "@/inngest/functions/generate-ai-answer";
import { sendAnswerAcceptedNotification } from "@/inngest/functions/send-answer-accepted-notification";
import { sendAnswerNotification } from "@/inngest/functions/send-answer-notification";
import { sendWelcomeEmail } from "@/inngest/functions/send-welcome-email";
import { inngest } from "@/lib/services/inngest";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateAIAnswer,
    sendWelcomeEmail,
    sendAnswerNotification,
    sendAnswerAcceptedNotification,
  ],
});
