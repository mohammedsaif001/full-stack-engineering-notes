import { embedTexts } from "../../openai/index.js";
import { hydeDocument } from "./hyDe.js";
import { queryRewriting } from "./query-rewriting.js";
import { reciprocalRankFusion, searchByVector } from "./reciprocal-rank-fusion.js";

/**
 * Multi-query retrieval: expand the query into variants (typo-fixed, step-back,
 * a HyDE hypothetical document, and 3 sub-queries), search the vector store with
 * every variant, fuse the ranked result lists with Reciprocal Rank Fusion, and
 * keep the top `finalK`.
 *
 * @param {string} query
 * @returns {Promise<{ queries: object, chunks: Array<{id, text, source, chunkIndex, bestScore, rrfScore, matchedBy: string[]}> }>}
 */
export async function retrieveChunks(query) {
  // Generate the rewritten variants and the HyDE document in parallel.
  const [{ stepBack, rewritten, subQueries }, hyde] = await Promise.all([
    queryRewriting(query),
    hydeDocument(query),
  ]);

  // All variants we search with (labelled so we can see what matched what).
  const labelled = [
    { label: "rewritten", text: rewritten },
    { label: "stepBack", text: stepBack },
    { label: "hyde", text: hyde },
    ...subQueries.map((q, i) => ({ label: `subQuery${i + 1}`, text: q })),
  ].filter((q) => typeof q.text === "string" && q.text.trim().length > 0);

  // Embed all variants in one batched call, then search in parallel.
  const vectors = await embedTexts(labelled.map((q) => q.text));
  const resultsPerQuery = await Promise.all(vectors.map((v) => searchByVector(v)));

  // Fuse the ranked lists with RRF, then keep the top `finalK` chunks.
  const rankedLists = labelled.map((q, i) => ({ label: q.label, hits: resultsPerQuery[i] }));
  const fused = reciprocalRankFusion(rankedLists);
  const chunks = fused.slice(0, config.retrieval.finalK);

  return {
    queries: { original: query, rewritten, stepBack, hyde, subQueries },
    chunks,
  };
}