import { inngest } from "../client";

/**
 * 1. Daily Sales Report Cron Job
 * Runs every day at 9:00 AM New York time (0 9 * * *)
 */
export const dailySalesReport = inngest.createFunction(
  {
    id: "daily-sales-report",
    name: "Daily Sales & Metrics Report",
  },
  // Triggered automatically on schedule OR manually by event
  [
    { cron: "TZ=America/New_York 0 9 * * *" },
    { event: "admin/trigger.daily-report" },
  ],
  async ({ step }) => {
    console.log("\n📊 [Daily Sales Report Cron Triggered]");

    // Step 1: Query sales from database
    const salesData = await step.run("query-sales-metrics", async () => {
      console.log("  ⏳ Aggregating sales metrics across 24h...");
      return {
        totalRevenue: 24950.0,
        ordersCount: 142,
        topProduct: "Generative AI Masterclass",
        currency: "USD",
        period: "Last 24 Hours",
      };
    });
    console.log("  ✅ Sales Data Retrieved:", salesData);

    // Step 2: Generate PDF/HTML Summary
    const summary = await step.run("generate-summary-pdf", async () => {
      console.log("  📝 Compiling executive summary...");
      return {
        reportId: `rep_${Date.now()}`,
        status: "GENERATED",
        generatedAt: new Date().toISOString(),
      };
    });

    // Step 3: Send email to executive stakeholders
    await step.run("send-email-to-leadership", async () => {
      console.log("  📧 Dispatching email to leadership team...");
      return { sent: true, recipients: ["ceo@example.com", "cfo@example.com"] };
    });

    console.log("🎉 [Daily Sales Report Completed Successfully!]\n");
    return { success: true, report: summary, metrics: salesData };
  }
);

/**
 * 2. Abandoned Cart Recovery Cron Job
 * Runs every 2 hours (0 *\/2 * * *)
 */
export const abandonedCartRecovery = inngest.createFunction(
  {
    id: "abandoned-cart-recovery",
    name: "Abandoned Cart Recovery Scanner",
  },
  [
    { cron: "0 */2 * * *" },
    { event: "admin/trigger.cart-recovery" },
  ],
  async ({ step }) => {
    console.log("\n🛒 [Abandoned Cart Recovery Scanner Started]");

    // Step 1: Find users with carts abandoned in the last 2 hours
    const abandonedUsers = await step.run("scan-abandoned-carts", async () => {
      console.log("  🔎 Querying carts idle for > 2 hours...");
      return [
        { userId: "usr_101", email: "priya@example.com", cartValue: 120.0 },
        { userId: "usr_102", email: "rahul@example.com", cartValue: 85.5 },
      ];
    });

    console.log(`  🔍 Found ${abandonedUsers.length} abandoned carts`);

    // Step 2: Send discount coupon notifications
    const results = await step.run("send-recovery-emails", async () => {
      console.log("  💸 Sending 10% discount promo codes...");
      return abandonedUsers.map((u) => ({
        email: u.email,
        promoCode: "RECOVER10",
        sent: true,
      }));
    });

    console.log("🎉 [Abandoned Cart Recovery Completed!]\n");
    return { processedCarts: abandonedUsers.length, details: results };
  }
);