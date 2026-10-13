import { qdrant } from "../../config/db.js";
import { config } from "../../config/index.js";

/** Search Qdrant for the chunks most similar to a single embedding vector. */
export async function searchByVector(vector) {
  return qdrant.search(config.qdrant.collection, {
    vector,
    limit: config.retrieval.topK,
    with_payload: true,
  });
}

/**
 * Reciprocal Rank Fusion: combine several ranked result lists into one.
 * A chunk's fused score is the sum over each list it appears in of
 * 1 / (k + rank), where rank is its 1-based position in that list.
 * Chunks that rank highly across multiple queries bubble to the top.
 *
 * @param {Array<{ label: string, hits: any[] }>} rankedLists
 * @param {number} k
 */
export function reciprocalRankFusion(rankedLists, k = config.retrieval.rrfK) {
  const fused = new Map();

  for (const { label, hits } of rankedLists) {
    hits.forEach((h, index) => {
      const rank = index + 1; // 1-based
      const contribution = 1 / (k + rank);
      const existing = fused.get(h.id);

      if (existing) {
        existing.rrfScore += contribution;
        existing.bestScore = Math.max(existing.bestScore, h.score);
        existing.matchedBy.push(label);
      } else {
        fused.set(h.id, {
          id: h.id,
          text: h.payload?.text ?? "",
          source: h.payload?.source ?? null,
          chunkIndex: h.payload?.chunkIndex ?? null,
          bestScore: h.score, // best raw vector similarity, for reference
          rrfScore: contribution,
          matchedBy: [label],
        });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}