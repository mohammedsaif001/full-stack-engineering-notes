import dotenv from "dotenv";
import path from "path";
import { generateText, streamText, tool, stepCountIs, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// Load environment variables from setup/.env
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

// Ensure Google provider picks up GEMINI_API_KEY from .env if set
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
}

/**
 * 1. Basic Text Generation (generateText)
 * Unified interface across any provider (OpenAI, Google, Anthropic, etc.)
 */
async function runGenerateText() {
  console.log("=== 1. generateText Example ===");

  const { text, usage } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Explain why the sky is blue in 2 sentences.",
  });

  console.log("Response:", text);
  console.log("Token Usage:", usage);
  console.log();
}

/**
 * 2. Streaming Response (streamText)
 * Iterating over textStream for real-time output chunks
 */
async function runStreamText() {
  console.log("=== 2. streamText Example ===");

  const { textStream } = streamText({
    model: openai("gpt-4o-mini"),
    prompt: "Explain Event Loops in Node.js in 3 concise bullet points.",
  });

  process.stdout.write("Streaming: ");
  for await (const chunk of textStream) {
    process.stdout.write(chunk);
  }
  console.log("\n");
}

/**
 * 3. Structured Outputs with Zod (Type-safe schema validation)
 * Uses Output.object({ schema }) with generateText for strong type safety
 */
async function runStructuredOutput() {
  console.log("=== 3. Structured Output (Zod Schema) ===");

  const RiskSchema = z.object({
    risks: z.array(
      z.object({
        title: z.string().describe("Concise name of the risk"),
        category: z.enum(["technical", "security", "operational", "compliance"]),
        score: z.number().min(1).max(5).describe("Severity rating from 1 to 5"),
        mitigation: z.string().describe("Recommended mitigation step"),
      })
    ),
  });

  const { output } = await generateText({
    model: openai("gpt-4o-mini"),
    output: Output.object({ schema: RiskSchema }),
    prompt: `
      Analyze risks for launching a cloud-native SaaS product that stores medical records
      and relies on third-party webhook integrations.
    `,
  });

  console.log("Structured Object Output:");
  console.dir(output, { depth: null });
  console.log();
}

/**
 * 4. Tool Calling / Function Execution (tool + stepCountIs)
 * Model calls custom JavaScript functions, consumes their results, and provides final answer
 */
async function runToolCalling() {
  console.log("=== 4. Tool Calling Example ===");

  const { text, steps } = await generateText({
    model: openai("gpt-4o-mini"),
    stopWhen: stepCountIs(3), // allows tool execution step + final answer synthesis
    tools: {
      getWeather: tool({
        description: "Get the current temperature and conditions for a city",
        parameters: z.object({
          city: z.string().describe("City name"),
        }),
        execute: async ({ city }) => {
          // Simulated tool execution logic
          return { city, temperature: "24°C", condition: "Sunny", humidity: "45%" };
        },
      }),
    },
    prompt: "What is the weather currently in Tokyo and what should I wear?",
  });

  console.log(`Completed in ${steps.length} step(s).`);
  console.log("Final Response:\n", text);
  console.log();
}

/**
 * 5. Multi-Provider Flexibility (Swapping to Google Gemini)
 * The exact same Vercel AI SDK APIs work interchangeably with Gemini or Claude!
 */
async function runGoogleGeminiExample() {
  console.log("=== 5. Multi-Provider Flexibility (Google Gemini) ===");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.log("Skipped: No Google/Gemini API key configured.\n");
    return;
  }

  try {
    const { text } = await generateText({
      model: google("gemini-3.8-flash"),
      prompt: "Say 'Hello from Vercel AI SDK!' and give one quick coding tip in one sentence.",
    });
    console.log("Response:", text);
  } catch (err) {
    console.log("Google Gemini execution notice:", err.message);
  }
  console.log();
}

async function main() {
  try {
    await runGenerateText();
    await runStreamText();
    await runStructuredOutput();
    await runToolCalling();
    await runGoogleGeminiExample();
  } catch (err) {
    console.error("Execution error:", err);
  }
}

main();
