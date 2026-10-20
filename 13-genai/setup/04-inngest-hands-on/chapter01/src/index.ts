import express from "express";
import { serve } from "inngest/express";
import { Inngest } from "inngest";

// 1. Initialize Inngest Client
export const inngest = new Inngest({ id: "chapter-01-basics-app" });

// 2. Function 1: Hello World Event Listener
export const helloFunction = inngest.createFunction(
  { id: "hello-world", name: "Chapter 1: Hello World" },
  { event: "test/hello" },
  async ({ event }) => {
    console.log("👋 [Hello Function Triggered]");
    console.log("Event Name:", event.name);
    console.log("Event Data:", event.data);

    return {
      message: `Hello ${event.data.name || "World"}! Welcome to Inngest!`,
      receivedAt: new Date().toISOString(),
    };
  }
);

// 3. Function 2: Multi-Step Durable Workflow (step.run & step.sleep)
export const multiStepFunction = inngest.createFunction(
  { id: "multi-step-demo", name: "Chapter 1: Multi-Step Workflow" },
  { event: "demo/multistep" },
  async ({ event, step }) => {
    console.log("\n🚀 [Multi-Step Workflow Started]");

    // Step 1: First task checkpoint
    const result1 = await step.run("step-1-fetch-initial-data", async () => {
      console.log("  ⏳ Executing step 1...");
      return { data: "Important Data from Step 1", userId: event.data.userId || "anonymous" };
    });
    console.log("  ✅ Step 1 completed:", result1);

    // Step 2: Non-blocking durable sleep (5 seconds)
    console.log("  💤 Sleeping for 5 seconds (Serverless spins down)...");
    await step.sleep("wait-a-bit", "5s");
    console.log("  ⏰ Woke up from sleep!");

    // Step 3: Second task checkpoint (using result from Step 1)
    const result2 = await step.run("step-2-process-previous-result", async () => {
      console.log("  ⏳ Executing step 2...");
      return {
        processed: true,
        previousStepData: result1.data,
        processedAt: new Date().toISOString(),
      };
    });
    console.log("  ✅ Step 2 completed:", result2);

    return {
      message: "Multi-step workflow completed successfully!",
      results: [result1, result2],
    };
  }
);

// 4. Start Express Server to serve Inngest functions
const app = express();
const port = 3000;

app.use(express.json());

// Mount the Inngest serve handler
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [helloFunction, multiStepFunction],
  })
);

// Root Health & Info route
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    chapter: "Chapter 01: Inngest Basics & Multi-Step Workflows",
    endpoints: {
      inngestHandler: "POST/GET /api/inngest",
      triggerHello: "POST /test-hello",
      triggerMultiStep: "POST /test-multistep",
    },
    inngestDevUi: "http://localhost:8288",
  });
});

// Test Endpoint: Trigger Hello World
app.post("/test-hello", async (req, res) => {
  try {
    const { ids } = await inngest.send({
      name: "test/hello",
      data: { name: req.body.name || "Coder" },
    });
    res.json({
      success: true,
      message: "Event test/hello sent!",
      eventId: ids[0],
      checkAt: "http://localhost:8288",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Endpoint: Trigger Multi-Step Workflow
app.post("/test-multistep", async (req, res) => {
  try {
    const { ids } = await inngest.send({
      name: "demo/multistep",
      data: { userId: req.body.userId || "user_saif" },
    });
    res.json({
      success: true,
      message: "Event demo/multistep sent!",
      eventId: ids[0],
      checkAt: "http://localhost:8288",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Chapter 01: Inngest Basics Server Started");
  console.log("=".repeat(60));
  console.log(`📡 Express API:     http://localhost:${port}`);
  console.log(`🔌 Inngest Endpoint: http://localhost:${port}/api/inngest`);
  console.log(`🎛️  Inngest Dev UI:  http://localhost:8288`);
  console.log("=".repeat(60) + "\n");
});
