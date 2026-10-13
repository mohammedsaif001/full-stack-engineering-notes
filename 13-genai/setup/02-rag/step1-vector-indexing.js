import path from "node:path";
import dotenv from "dotenv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

async function generateVectorEmbeddingsForFile(filepath) {
  // Load the PDF Content as document
  const loader = new PDFLoader(filepath);
  const document = await loader.load(); // Already chunks data page by page

  // Initialise the Embedding MoDAL
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  // The vector store
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: "indexing-rag-docs-practice",
    },
  );

  await vectorStore.addDocuments(document);
  console.log(`All the documents are indexed....`);
}

generateVectorEmbeddingsForFile("./docs-for-vector/dsa.pdf");
