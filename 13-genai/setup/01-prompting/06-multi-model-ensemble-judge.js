/**
 * 06 — Multi-Model Orchestration: Fan-Out & LLM-as-a-Judge / Response Synthesis
 * 
 * Concepts Demonstrated:
 * 1. Multi-Model Fan-Out: Querying multiple frontier models (Google Gemini,
 *    Anthropic Claude, OpenAI GPT) concurrently via Promise.allSettled.
 * 2. LLM-as-a-Judge: Using an independent judge model to evaluate, critique,
 *    and score candidate answers against criteria (accuracy, clarity, depth).
 * 3. Mixture of Agents (MoA) / Response Fusion: Synthesizing the unique insights
 *    and strengths of all 3 models into a superior, unified final response.
 * 4. Structured Output with Zod: Guaranteeing typed JSON schema output for the
 *    evaluation scorecard and synthesized content.
 */

import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// Load environment variables from setup/.env
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

// 1. Initialize Clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// 2. Define Structured Output Schema for the Judge
const EnsembleJudgmentSchema = z.object({
  modelEvaluations: z.array(
    z.object({
      model: z.string().describe("Name of the model evaluated (e.g. Gemini, Claude, OpenAI)"),
      score: z.number().min(1).max(10).describe("Score out of 10 for quality, completeness, and clarity"),
      strengths: z.string().describe("Specific strengths of this response"),
      weaknesses: z.string().describe("Omissions, inaccuracies, or areas needing improvement"),
    })
  ).describe("Independent critique for each model's answer"),
  winner: z.object({
    model: z.string().describe("The name of the single best response"),
    reason: z.string().describe("Justification for why this model's response won"),
  }),
  synthesizedResponse: z.string().describe(
    "A comprehensive, superior response that takes the best ideas, examples, and nuances from all 3 models into one ultimate answer"
  ),
});

// 3. Worker Functions for Individual SDKs
async function queryGoogleGemini(prompt) {
  if (!gemini) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  const response = await gemini.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  return response.text || "No response text received from Gemini.";
}

async function queryAnthropicClaude(prompt) {
  if (!anthropic) {
    // Graceful fallback if ANTHROPIC_API_KEY is not yet in .env
    return (
      "[Simulated Claude Response - Add ANTHROPIC_API_KEY to .env for live API]\n" +
      "Claude perspective: When designing software architecture, maintainability and cognitive load " +
      "are often understated. Prefer clear domain boundaries and contracts early. If team size is under 20, " +
      "a modular monolith with strict internal boundaries provides 80% of microservice benefits with 20% of the operational overhead."
    );
  }

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "No text block in Claude response.";
}

async function queryOpenAI(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in .env");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content || "No response received from OpenAI.";
}

// 4. LLM Judge and Synthesizer Function
async function judgeAndSynthesize(prompt, candidateResponses) {
  const formattedCandidates = Object.entries(candidateResponses)
    .map(([modelName, content]) => `### Candidate: ${modelName}\n${content}\n`)
    .join("\n---\n\n");

  const judgePrompt = `
You are an expert AI evaluator and master synthesizer acting as the "LLM-as-a-Judge" and "Mixture-of-Agents Aggregator".

The user gave the following prompt:
"${prompt}"

Here are candidate responses from 3 different frontier models:
${formattedCandidates}

Your Tasks:
1. Objectively evaluate each candidate response: provide constructive strengths, weaknesses, and a score (1-10).
2. Choose the single best individual candidate ("winner") and explain why it won.
3. Synthesize an ultimate response ("synthesizedResponse"):
   - Combine the best points, unique angles, and technical depth from all candidates.
   - Remove any redundancies, fluff, or inaccuracies.
   - Produce a response that is clearly better than any single candidate alone.
`;

  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an impartial, highly rigorous AI architecture judge and expert technical editor.",
      },
      {
        role: "user",
        content: judgePrompt,
      },
    ],
    response_format: zodResponseFormat(EnsembleJudgmentSchema, "ensemble_judgment"),
  });

  return completion.choices[0]?.message?.parsed;
}

// 5. Main Orchestrator
async function runMultiModelEnsemble(prompt) {
  console.log("================================================================================");
  console.log("🚀 MULTI-MODEL ENSEMBLE ORCHESTRATOR & LLM-AS-A-JUDGE");
  console.log("================================================================================");
  console.log(`📌 User Prompt:\n"${prompt}"\n`);

  console.log("⏳ Step 1: Querying Google Gemini, Anthropic Claude, and OpenAI GPT in parallel...");

  const [geminiResult, claudeResult, openaiResult] = await Promise.allSettled([
    queryGoogleGemini(prompt),
    queryAnthropicClaude(prompt),
    queryOpenAI(prompt),
  ]);

  const candidateResponses = {
    "Google Gemini (gemini-3.6-flash)":
      geminiResult.status === "fulfilled"
        ? geminiResult.value
        : `[Error querying Gemini: ${geminiResult.reason?.message || geminiResult.reason}]`,

    "Anthropic Claude (claude-3-5-haiku)":
      claudeResult.status === "fulfilled"
        ? claudeResult.value
        : `[Error querying Claude: ${claudeResult.reason?.message || claudeResult.reason}]`,

    "OpenAI GPT (gpt-4o-mini)":
      openaiResult.status === "fulfilled"
        ? openaiResult.value
        : `[Error querying OpenAI: ${openaiResult.reason?.message || openaiResult.reason}]`,
  };

  console.log("\n📥 Step 2: Collected Candidate Responses:\n");
  for (const [model, text] of Object.entries(candidateResponses)) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`🤖 ${model}:`);
    console.log(text.slice(0, 300) + (text.length > 300 ? "...\n[truncated for display]" : ""));
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("⚖️  Step 3: Passing all 3 responses to OpenAI Judge for evaluation & synthesis...");

  const judgment = await judgeAndSynthesize(prompt, candidateResponses);

  console.log("\n================================================================================");
  console.log("📊 STEP 4: JUDGE EVALUATIONS & SCOREBOARD");
  console.log("================================================================================");

  judgment.modelEvaluations.forEach((evaluation) => {
    console.log(`\n🔹 Model: ${evaluation.model}`);
    console.log(`   Score: ${evaluation.score}/10`);
    console.log(`   Strengths: ${evaluation.strengths}`);
    console.log(`   Weaknesses: ${evaluation.weaknesses}`);
  });

  console.log("\n================================================================================");
  console.log(`🏆 WINNER: ${judgment.winner.model}`);
  console.log(`   Reason: ${judgment.winner.reason}`);
  console.log("================================================================================");

  console.log("\n================================================================================");
  console.log("✨ SYNTHESIZED MASTER RESPONSE (Combining the best of all 3):");
  console.log("================================================================================");
  console.log(judgment.synthesizedResponse);
  console.log("================================================================================\n");

  return judgment;
}

// Example Execution
const PROMPT =
  "Explain the core architectural trade-offs between Monoliths, Microservices, and Modular Monoliths for a fast-growing startup. Give a concrete recommendation for a team of 8 engineers.";

runMultiModelEnsemble(PROMPT);
