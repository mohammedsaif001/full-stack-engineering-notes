import { config } from "../../config/index.js";
import { openai } from "../../openai.js";

/**
 * HyDE (Hypothetical Document Embeddings): ask the model to write a short,
 * plausible passage that answers the query as if it were an excerpt from a
 * relevant document. Embedding this hypothetical answer often lands closer to
 * the real documents in vector space than embedding the bare question.
 *
 * @param {string} query
 * @returns {Promise<string>}
 */
export async function hydeDocument(query) {
  const completion = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an expert writer. Write a concise, factual passage (3-5 sentences) that directly answers " +
          "the user's question, as if it were an excerpt from a relevant reference document. " +
          "Write confidently in a neutral, encyclopedic tone. Do not add disclaimers or say you are unsure.",
      },
      { role: "user", content: query },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}