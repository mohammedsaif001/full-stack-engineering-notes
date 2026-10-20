import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import {
  sendWelcomeEmail,
  setupUserPreferences,
  trackSignupAnalytics,
} from "./inngest/functions/user-signup";



const app = express();
const port = 3000;

app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [sendWelcomeEmail, setupUserPreferences, trackSignupAnalytics],
  })
);

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

const users: User[] = [];

app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    message: "User Signup System with Inngest",
    endpoints: {
      signup: "POST /api/signup",
      users: "GET /api/users",
      inngest: "/api/inngest",
    },
    stats: {
      totalUsers: users.length,
      usersByPlan: {
        free: users.filter((u) => u.plan === "free").length,
        pro: users.filter((u) => u.plan === "pro").length,
        enterprise: users.filter((u) => u.plan === "enterprise").length,
      },
    },
  });
});


app.post("/api/signup", async (req, res) => {
  try {
    const { email, name, password, plan = "free" } = req.body;

    // Validation
    if (!email || !name || !password) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["email", "name", "password"],
      });
    }

    if (!["free", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({
        error: "Invalid plan",
        validPlans: ["free", "pro", "enterprise"],
      });
    }

    // Check if user already exists
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        userId: existingUser.id,
      });
    }

    // Create user
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      password: "***", // In real app: hash with bcrypt!
      plan,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    console.log(`\n✅ User created: ${newUser.id} (${newUser.email})`);

    // 🎯 KEY MOMENT: Send event to Inngest
    // This ONE event will trigger THREE (there could be many more) functions in parallel!
    const { ids } = await inngest.send({
      name: "user/signup.completed",
      data: {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
        signupDate: newUser.createdAt,
      },
    });

    console.log(`📤 Event sent: user/signup.completed (ID: ${ids[0]})`);
    console.log(
      `🚀 Triggered functions: sendWelcomeEmail, setupUserPreferences, trackSignupAnalytics\n`
    );

    // Return response immediately (don't wait for background jobs)
    res.status(201).json({
      success: true,
      message:
        "User created successfully! Welcome email and setup are being processed.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
        createdAt: newUser.createdAt,
      },
      eventId: ids[0],
      tip: "Check http://localhost:8288 to see the functions executing!",
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({
      error: "Failed to create user",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});