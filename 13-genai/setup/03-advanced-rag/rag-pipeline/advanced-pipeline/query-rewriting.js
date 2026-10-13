/**
 * Rewrite a user's query into several variants to improve retrieval:
 *  - stepBack:   a broader, more general question (step-back prompting)
 *  - rewritten:  the same query with typos/grammar fixed and made explicit
 *  - subQueries: the query decomposed into 3 focused sub-questions
 *
 * @param {string} query
 * @returns {Promise<{ stepBack: string, rewritten: string, subQueries: string[] }>}
 */

import { openai } from "../../openai";
import { config } from "../../config";

export async function queryRewriting(query) {
  const completion = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "query_rewriting",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            stepBack: {
              type: "string",
              description:
                "A broader, higher-level 'step-back' question whose answer gives useful background for the original query.",
            },
            rewritten: {
              type: "string",
              description:
                "The original query with spelling/grammar fixed and made clear and self-contained. Preserve the original intent.",
            },
            subQueries: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "3 focused sub-questions that break down the original query and cover different angles or components of the request.",
            },
          },
          required: ["stepBack", "rewritten", "subQueries"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You are a query understanding assistant for a retrieval system. " +
          "Given a user's question, produce query variants that help retrieve relevant documents. " +
          "Apply three techniques: (1) step-back prompting -> one broader background question; " +
          "(2) query rewriting -> fix typos/grammar and make the query explicit and self-contained; " +
          "(3) sub-query decomposition -> break the query into exactly 3 focused sub-questions. " +
          "Respond ONLY with the structured JSON.",
      },
      {
        role: "user",
        content: query,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  return {
    stepBack: parsed.stepBack ?? "",
    rewritten: parsed.rewritten ?? query,
    // Guard against the model returning more/fewer than 3.
    subQueries: Array.isArray(parsed.subQueries)
      ? parsed.subQueries.slice(0, 3)
      : [],
  };
}
