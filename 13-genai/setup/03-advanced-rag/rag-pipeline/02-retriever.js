import { config } from "../config/index.js";
import { qdrant } from "../config/db.js";
import { embedText, openai } from "../openai/index.js";

/**
 * RAG query pipeline: embed the query, search Qdrant for relevant chunks,
 * then ask the chat model to answer using only that retrieved context.
 * @param {string} query
 */
export async function answerQuery(query) {
  const collection = config.qdrant.collection;

  // 1. Embed the query.
  const vector = await embedText(query);

  // 2. Retrieve the most similar chunks from Qdrant.
  const hits = await qdrant.search(collection, {
    vector,
    limit: config.retrieval.topK,
    with_payload: true,
  });

  const sources = hits.map((h) => ({
    text: h.payload?.text ?? "",
    source: h.payload?.source ?? null,
    chunkIndex: h.payload?.chunkIndex ?? null,
    score: h.score,
  }));

  if (sources.length === 0) {
    return {
      query,
      answer: "I couldn't find anything relevant in the indexed documents.",
      sources: [],
    };
  }

  // 3. Build context and generate a grounded answer.
  const context = sources
    .map((s, i) => `[Chunk ${i + 1}] (source: ${s.source})\n${s.text}`)
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

  return { query, answer, sources };
}
