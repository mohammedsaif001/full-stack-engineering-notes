import path from "node:path";
import dotenv from "dotenv";
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai';


dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function query(userQuery) { 
    // Conver User Query to Vector Embeddings?
    // Initialize the embedding model

    const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  });

   // Use the similar embedding model that was used to index the documents
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: "indexing-rag-docs-practice",
    },
    );
    

 // get simialr vectors and chunks?
    const vectorRetriever = vectorStore.asRetriever({ k: 5 });
    const results = await vectorRetriever.invoke(userQuery);

  // feed those chunks to llm model and do a simple chat with {userQuery}
  const SYSTEM_PROMPT = `
    You are an expert in answereing user query based on the provided context about document.
    Do not answere anything beyond what is not provided.

    Always also answer the user in short and tell on which page number that content is available and also name of the book

    User Documents:
    ${results.map((e) => JSON.stringify({ bookName: e.metadata.source, pageContent: e.pageContent, pageNumber: e.metadata.loc.pageNumber })).join('\n\n')}
  `;

  const llmResponse = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userQuery },
    ],
  });

  console.log(`LLM Response:`, llmResponse.choices[0].message.content);
}   

query('Do in really need test cases in my application and what are the types of testing do i have')