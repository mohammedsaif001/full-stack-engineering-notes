import { config } from "../config/index.js";
import { openai } from "../openai/index.js";
import { retrieveChunks } from "./advanced-pipeline/index.js";

/**
 * Advanced RAG query pipeline:
 * 1. Expand query (rewriting, step-back prompting, sub-queries, HyDE)
 * 2. Multi-query vector search & fusion via Reciprocal Rank Fusion (RRF)
 * 3. Generate grounded answer using top fused context chunks
 * @param {string} query
 */
export async function answerQuery(query) {
  // 1. Multi-query retrieval with Reciprocal Rank Fusion
  const { queries, chunks } = await retrieveChunks(query);

  if (!chunks || chunks.length === 0) {
    return {
      query,
      answer: "I couldn't find anything relevant in the indexed documents.",
      sources: [],
      queries,
    };
  }

  // 2. Build context and generate a grounded answer.
  const context = chunks
    .map(
      (s, i) =>
        `[Chunk ${i + 1}] (source: ${s.source}, RRF score: ${s.rrfScore.toFixed(4)}, matched by: ${s.matchedBy.join(", ")})\n${s.text}`
    )
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant. Answer the user's question using ONLY the provided context. " +
          "If the answer is not contained in the context, say you don't know. Be concise.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim() ?? "";

  return { query, answer, sources: chunks, queries };
}

