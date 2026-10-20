import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import { helloWorld, multiStepDemo } from "./inngest/functions";

const app = express();
const port = 3000;

app.use(express.json({ limit: "4mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [helloWorld, multiStepDemo],
  })
);

app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    message: "Express + Inngest server running",
    endpoints: {
      inngest: "/api/inngest",
      test: "/test",
      testmulti: "/test-multi",
    },
  });
});

app.post("/test", async (req, res) => {
  try {
    console.log("Sending test event");
    const { ids } = await inngest.send({
      name: "test/hello.world",
      data: {
        name: req.body.name || "World",
        timestamp: new Date().toISOString(),
      },
    });
    console.log("Event send with ID", ids[0]);

    res.json({
      message: "Event send successfully",
      eventId: ids[0],
      tip: "check http://localhost:8288 to see function eexecution",
    });
  } catch (error) {
    console.error("❌ Error sending event:", error);
    res.status(500).json({
      error: "Failed to send event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/test-multi", async (req, res) => {
  try {
    console.log("Sending multi part demo event");
    const { ids } = await inngest.send({
      name: "demo/multistep",
      data: {
        userId: req.body.userId || "user123",
        action: "demo",
      },
    });

    console.log("Event send with ID", ids[0]);

    res.json({
      message: "Multi-step event sent successfully",
      eventId: ids[0],
      tip: "check http://localhost:8288 to see function eexecution",
    });
  } catch (error) {
    console.error("❌ Error sending event:", error);
    res.status(500).json({
      error: "Failed to send event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(port, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Express + Inngest Server Started");
  console.log("=".repeat(60));
  console.log(`✅ Server: http://localhost:${port}`);
  console.log(`📡 Inngest endpoint: http://localhost:${port}/api/inngest`);
  console.log(`🎛️  Inngest Dev UI: http://localhost:8288`);
  console.log("=".repeat(60));
  console.log("\n");
});
