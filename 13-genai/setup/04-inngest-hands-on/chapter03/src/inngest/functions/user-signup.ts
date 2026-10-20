import { inngest } from "../client";

export const sendWelcomeEmail = inngest.createFunction(
  {
    id: "send-welcome-email",
    name: "Send Welcome Email",
  },
  { event: "user/signup.completed" },

  async ({ event, step }) => {
    const { email, name, plan } = event.data;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`📧 WELCOME EMAIL WORKFLOW STARTED`);
    console.log(`${"=".repeat(50)}`);

    // Step 1: Prepare email content based on plan
    const emailContent = await step.run("prepare-email-content", async () => {
      console.log(`📝 Preparing email for ${name} (${plan} plan)`);

      const planBenefits = {
        free: "- Access to basic features\n- Community support",
        pro: "- All basic features\n- Priority support\n- Advanced analytics\n- 10GB storage",
        enterprise:
          "- Everything in Pro\n- Dedicated account manager\n- Unlimited storage\n- Custom integrations",
      };

      return {
        to: email,
        from: "noreply@example.com",
        subject: `Welcome to Our Platform, ${name}! 🎉`,
        body: `
Hi ${name},

Welcome to our platform! We're excited to have you on the ${plan.toUpperCase()} plan.

Your benefits:
${planBenefits[plan]}

Get started: https://app.example.com/dashboard

Questions? Reply to this email anytime.

Best regards,
The Team
        `.trim(),
      };
    });

    console.log(`✅ Email content prepared`);

    // Step 2: Send email (simulated with delay)
    await step.run("send-email-api", async () => {
      console.log(`📤 Sending email to ${emailContent.to}...`);

      // Simulate email service API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real app:
      // await emailService.send(emailContent);

      console.log(`✅ Email sent successfully!`);

      return { sent: true, messageId: `msg-${Date.now()}` };
    });

    // Step 3: Log email sent event (optional)
    await step.run("log-email-sent", async () => {
      console.log(`📊 Logging email sent event...`);

      // In real app: await analytics.track(...)

      return { logged: true };
    });

    console.log(`${"=".repeat(50)}`);
    console.log(`✅ WELCOME EMAIL WORKFLOW COMPLETED`);
    console.log(`${"=".repeat(50)}\n`);

    return {
      success: true,
      emailSent: true,
      recipient: email,
    };
  }
);

export const setupUserPreferences = inngest.createFunction(
  {
    id: "setup-user-preferences",
    name: "Setup User Preferences",
  },
  { event: "user/signup.completed" },
  async ({ event, step }) => {
    const { userId, plan, email } = event.data;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`⚙️  USER PREFERENCES WORKFLOW STARTED`);
    console.log(`${"=".repeat(50)}`);

    // Step 1: Create default preferences
    const preferences = await step.run("create-preferences", async () => {
      console.log(`🔧 Creating preferences for user ${userId}`);

      const defaultPreferences = {
        userId,
        notifications: {
          email: true,
          push: plan !== "free", // Only pro/enterprise get push
          sms: plan === "enterprise",
        },
        newsletter: plan !== "free",
        theme: "light",
        language: "en",
        timezone: "UTC",
      };

      // Simulate database write
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In real app:
      // await db.preferences.create(defaultPreferences);

      console.log(`✅ Preferences created:`, defaultPreferences);

      return defaultPreferences;
    });

    // Step 2: Send preferences confirmation email (only for pro/enterprise)
    if (plan !== "free") {
      await step.run("send-preferences-email", async () => {
        console.log(`📧 Sending preferences confirmation to ${email}`);

        await new Promise((resolve) => setTimeout(resolve, 800));

        console.log(`✅ Preferences email sent`);
      });
    }

    console.log(`${"=".repeat(50)}`);
    console.log(`✅ USER PREFERENCES WORKFLOW COMPLETED`);
    console.log(`${"=".repeat(50)}\n`);

    return {
      success: true,
      preferencesSetup: true,
      preferences,
    };
  }
);

export const trackSignupAnalytics = inngest.createFunction(
  {
    id: "track-signup-analytics",
    name: "Track Signup Analytics",
  },
  { event: "user/signup.completed" },
  async ({ event, step }) => {
    const { userId, plan, signupDate } = event.data;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`📊 ANALYTICS WORKFLOW STARTED`);
    console.log(`${"=".repeat(50)}`);

    await step.run("send-to-analytics", async () => {
      console.log(`📈 Tracking signup event for user ${userId}`);

      const analyticsData = {
        event: "user_signup",
        userId,
        properties: {
          plan,
          signupDate,
          source: "web",
          timestamp: new Date().toISOString(),
        },
      };

      // Simulate analytics API call
      await new Promise((resolve) => setTimeout(resolve, 700));

      // In real app:
      // await analytics.track(analyticsData);

      console.log(`✅ Analytics tracked:`, analyticsData);

      return analyticsData;
    });

    // Step 2: Update metrics dashboard
    await step.run("update-metrics", async () => {
      console.log(`📊 Updating real-time metrics...`);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // In real app:
      // await metricsService.increment('signups', { plan });

      console.log(`✅ Metrics updated`);
    });

    console.log(`${"=".repeat(50)}`);
    console.log(`✅ ANALYTICS WORKFLOW COMPLETED`);
    console.log(`${"=".repeat(50)}\n`);

    return {
      success: true,
      tracked: true,
    };
  }
);
