import crypto from "node:crypto";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "../config/index.js";
import { qdrant, ensureCollection } from "../config/db.js";
import { embedTexts } from "../openai/index.js";

/**
 * Full indexing pipeline for an uploaded PDF using LangChain loaders & splitters:
 * 1. PDFLoader: parses PDF and extracts per-page text & metadata.
 * 2. RecursiveCharacterTextSplitter: splits text cleanly on paragraph/sentence boundaries.
 * 3. OpenAI batch embeddings.
 * 4. Qdrant vector upsert with rich metadata (page numbers, source, etc.).
 */
export async function indexPDF({ filePath, originalName }) {
  await ensureCollection();
  const collection = config.qdrant.collection;

  // 1. Load PDF pages
  const loader = new PDFLoader(filePath);
  const rawDocs = await loader.load();

  if (rawDocs.length === 0) {
    return { chunks: 0, message: "No extractable text found in PDF" };
  }

  // 2. Intelligent Recursive Text Splitting
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunking.chunkSize,
    chunkOverlap: config.chunking.chunkOverlap,
  });
  const splitDocs = await splitter.splitDocuments(rawDocs);

  if (splitDocs.length === 0) {
    return { chunks: 0, message: "No chunks generated from document" };
  }

  const chunkTexts = splitDocs.map((doc) => doc.pageContent);

  // 3. Batch generate embeddings
  const vectors = await embedTexts(chunkTexts);

  // 4. Construct Qdrant points with page number metadata
  const points = splitDocs.map((doc, i) => ({
    id: crypto.randomUUID(),
    vector: vectors[i],
    payload: {
      text: doc.pageContent,
      source: originalName,
      filePath,
      pageNumber: doc.metadata?.loc?.pageNumber ?? null,
      chunkIndex: i,
    },
  }));

  // 5. Upsert to Qdrant
  await qdrant.upsert(collection, {
    points,
    wait: true,
  });

  return { chunks: points.length, collection };
}
