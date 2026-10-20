import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import {
  dailySalesReport,
  abandonedCartRecovery,
} from "./inngest/functions/scheduled";

const app = express();
const port = 3000;

app.use(express.json());

// 1. Mount Inngest endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [dailySalesReport, abandonedCartRecovery],
  })
);

// 2. Info route
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    chapter: "Chapter 04: Scheduled & Cron Workflows with Inngest",
    cronSchedules: [
      { name: "Daily Sales Report", cron: "TZ=America/New_York 0 9 * * *" },
      { name: "Abandoned Cart Recovery", cron: "0 */2 * * *" },
    ],
    manualTestEndpoints: {
      triggerDailySales: "POST /trigger/daily-sales",
      triggerCartRecovery: "POST /trigger/cart-recovery",
    },
    inngestDevUi: "http://localhost:8288",
  });
});

// 3. Manual Test Trigger: Daily Sales Report
app.post("/trigger/daily-sales", async (req, res) => {
  try {
    const { ids } = await inngest.send({
      name: "admin/trigger.daily-report",
      data: { triggeredBy: "Manual Test Endpoint", timestamp: new Date().toISOString() },
    });
    res.json({
      success: true,
      message: "Daily Sales Report workflow manually triggered!",
      eventId: ids[0],
      checkAt: "http://localhost:8288",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Manual Test Trigger: Cart Recovery
app.post("/trigger/cart-recovery", async (req, res) => {
  try {
    const { ids } = await inngest.send({
      name: "admin/trigger.cart-recovery",
      data: { triggeredBy: "Manual Test Endpoint", timestamp: new Date().toISOString() },
    });
    res.json({
      success: true,
      message: "Abandoned Cart Recovery workflow manually triggered!",
      eventId: ids[0],
      checkAt: "http://localhost:8288",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log("\n" + "=".repeat(60));
  console.log("⏰ Chapter 04: Scheduled & Cron Workflows Server Started");
  console.log("=".repeat(60));
  console.log(`📡 Express API:     http://localhost:${port}`);
  console.log(`🔌 Inngest Endpoint: http://localhost:${port}/api/inngest`);
  console.log(`🎛️  Inngest Dev UI:  http://localhost:8288`);
  console.log("=".repeat(60) + "\n");
});
