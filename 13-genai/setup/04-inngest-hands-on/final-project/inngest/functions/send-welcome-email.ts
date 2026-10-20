import { inngest } from "@/lib/services/inngest";
import { Resend } from "resend";

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured - emails will not be sent");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export const sendWelcomeEmail = inngest.createFunction(
  {
    id: "send-welcome-email",
    name: "Send Welcome Email to New Users",
  },
  { event: "user.created" },
  async ({ event, step }) => {
    const { email, name, userId } = event.data;

    const resend = getResendClient();
    if (!resend) {
      console.log("📧 Skipping welcome email - Resend not configured");
      return { emailSent: false, reason: "Resend not configured" };
    }

    await step.run("send-email", async () => {
      const { data, error } = await resend.emails.send({
        from: "DevQuery Forum <onboarding@resend.dev>",
        to: email,
        subject: `Welcome to DevQuery Forum, ${name}!`,
        html: `
          <h1>Welcome to DevQuery Forum!</h1>
          <p>Hi ${name},</p>
          <p>Thanks for joining our community! Here's how to get started:</p>
          <ul>
            <li>Ask your first question and get instant AI-powered answers</li>
            <li>Browse questions from other developers</li>
            <li>Build your reputation by providing helpful answers</li>
          </ul>
          <p>Happy coding!</p>
        `,
      });

      if (error) {
        throw new Error(`Failed to send welcome email: ${error.message}`);
      }

      return data;
    });

    return { emailSent: true, recipient: email };
  }
);
