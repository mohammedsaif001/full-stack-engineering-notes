# 07 — Retrieval-Augmented Generation (RAG): Architecture, Ingestion & Retrieval Pipelines

> **Cohort Series**: Generative AI Notes  
> **Topic**: Why LLMs Need RAG (Knowledge Cutoffs, Privacy, Context Limits), Ingestion vs. Query Pipelines, Chunking Strategies Across File Types (PDF, XML, VTT/SRT, Audio/Video), Grounding & Hallucination Mitigation, Frameworks (LangChain vs. LlamaIndex vs. Vanilla SDKs), and Line-by-Line Code Breakdown of Qdrant + OpenAI RAG.  
> **Golden Mental Model**: *"If you want to learn or build something in AI, always step back and see how your human brain does it."*

---

## 🧠 1. The Big Picture: How Does the Human Brain Do It?

Imagine you have to take an exam on **Company Tax Law for 2026**:
* **Option A (The Fine-Tuning / Retraining approach)**: You spend 6 months memorizing every 1,000-page tax law book cover-to-cover. If a new amendment passes tomorrow, your memory is already outdated, and memorizing it all over again is impossibly slow and expensive.
* **Option B (The RAG / Open-Book approach)**: You walk into the exam hall with your general intelligence intact. When a question asks: *"What is the deduction limit under Section 80C for 2026?"*, you don't guess:
  1. You flip open the **index / table of contents** of the tax book.
  2. You jump straight to the **2 relevant pages**.
  3. You read those 2 paragraphs, formulate your answer, and cite: *"According to Page 142 of the 2026 Tax Code..."*

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          THE HUMAN BRAIN ANALOGY                          │
├─────────────────────────────────────┬─────────────────────────────────────┤
│             VANILLA LLM             │           LLM WITH RAG              │
│       (Closed-Book Memory)          │         (Open-Book Exam)            │
├─────────────────────────────────────┼─────────────────────────────────────┤
│ • Relies only on past training data │ • LLM acts as the reasoning engine  │
│ • Prone to confident guessing       │ • Retrieves the exact page first    │
│ • Static; cannot learn live changes │ • Grounded in real, cited documents │
│ • Doesn't cite sources              │ • Verifiable (shows page & book)    │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

RAG stands for **Retrieval-Augmented Generation**:
1. **Retrieve**: Find the top-$k$ most relevant factual passages from your external knowledge base.
2. **Augment**: Inject those retrieved factual passages into the LLM's prompt context.
3. **Generate**: Ask the LLM to synthesize an answer strictly using the injected facts.

---

## ⚠️ 2. Why RAG? The 3 Fatal Flaws of Vanilla LLMs

Before building RAG, we must understand the three fundamental architectural limitations of pre-trained Foundation Models:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE 3 FATAL FLAWS OF RAW LLMs                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

     [ 1. KNOWLEDGE CUTOFF ]         [ 2. ENTERPRISE PRIVACY ]      [ 3. CONTEXT LIMITS & COSTS ]
     ┌───────────────────────┐       ┌───────────────────────┐      ┌───────────────────────────┐
     │ • Model trained up to │       │ • Proprietary docs,   │      │ • 100 PDFs = millions of  │
     │   a frozen date.      │       │   invoices & payroll  │        tokens.                   │
     │ • Blind to today's    │       │   must NOT train      │      │ • Extreme $$ cost/query.  │
     │   facts, news, or     │       │   public third-party  │      │ • Latency explodes.       │
     │   fresh database rows.│       │   AI models.          │      │ • "Lost in the Middle".   │
     └───────────────────────┘       └───────────────────────┘      └───────────────────────────┘
```

### 1. Knowledge Cutoff Dates (Frozen Memory)
An LLM is a frozen snapshot of the internet up to its training cutoff date (e.g., July 2024). It has zero knowledge of:
* Changes in your company policies yesterday.
* New code commits pushed to your repository 10 minutes ago.
* Live inventory, pricing, or order statuses.

### 2. Privacy & Security (Data Governance)
Organizations cannot and should not upload internal HR records, legal contracts, customer invoices, or NDA-protected source code to train public foundational models.
* With RAG, your documents **remain securely inside your private vector database / intranet**.
* You only send the **tiny, relevant paragraph** to the LLM during the exact query moment, never retraining the model.

### 3. Context Window Limits & "Context Stuffing"
Why can't we simply take 100 legal contracts and paste all of them into the prompt every time?
* **Financial Waste**: Sending 500,000 tokens per API call costs real dollars on every single message.
* **Extreme Latency**: Reading 1,000,000 tokens before answering adds 15–30 seconds of response lag.
* **The "Lost in the Middle" Effect**: Research shows LLMs pay strong attention to the beginning and end of a massive prompt, but consistently overlook or forget crucial details buried in the middle of giant contexts.

---

## 📐 3. The Architecture

A production RAG system is strictly separated into **two independent pipelines**:
1. **The Ingestion / Indexing Pipeline** (Offline / Write Phase): Prepares and indexes documents into searchable semantic vectors.
2. **The Retrieval / Query Pipeline** (Online / Read Phase): Takes the user's question, finds matching chunks, and generates a grounded response.

```
═════════════════════════════════════════════════════════════════════════════════════════════════════
PIPELINE 1: INGESTION & INDEXING (Offline Preparation — Done Once or on Ingestion Event)
═════════════════════════════════════════════════════════════════════════════════════════════════════

 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
 │ Raw Documents│     │ Text & Meta  │     │ Chunking     │     │ Embedding     │     │ Vector DB   │
 │ (PDF, Word,  │ ──> │ Extraction   │ ──> │ Strategy     │ ──> │ Model         │ ──> │ (Qdrant,    │
 │  XML, VTT)   │     │ (Document    │     │ (Split by    │     │ (text-embed-  │     │  Pinecone,  │
 │              │     │  Loader)     │     │  page/tokens)│     │  3-small)     │     │  pgvector)  │
 └──────────────┘     └──────────────┘     └──────────────┘     └───────────────┘     └─────────────┘
                                                  │                     │                    │
                                            [Chunk 1] ─────────> [0.12, 0.85, ...] ───>  Store Vectors
                                            [Chunk 2] ─────────> [0.44, 0.03, ...] ───>  + Metadata
                                            [Chunk 3] ─────────> [0.91, 0.72, ...] ───>  (page, book)


═════════════════════════════════════════════════════════════════════════════════════════════════════
PIPELINE 2: RETRIEVAL & QUERYING (Online Phase — Executed on Every User Request)
═════════════════════════════════════════════════════════════════════════════════════════════════════

   User Query:
  "Why is there so much ghee in dosa?"
             │
             ▼
 ┌───────────────────────┐
 │   Embedding Model     │  ===> Converts query to Vector: [0.15, 0.82, 0.04, ...]
 └───────────────────────┘
             │
             ▼
 ┌───────────────────────┐
 │ Similarity Search     │  ===> Cosine / Dot Product against Vector DB
 │ in Vector Database    │       Finds top-k nearest matching chunks (k = 3 or 5)
 └───────────────────────┘
             │
             ▼
   Top-k Matching Chunks:
   [Chunk #42: "Crispiness in dosa batter comes from ghee frying...", Book: "South Indian Cooking", Page: 34]
             │
             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ PROMPT AUGMENTATION & GROUNDING (System Prompt)                                        │
 │                                                                                        │
 │ "You are an assistant. Answer strictly based on the following documents.               │
 │  Do NOT answer beyond this context. Always cite the page number and source book.       │
 │                                                                                        │
 │  DOCUMENTS:                                                                            │
 │  Source: South Indian Cooking | Page: 34 | Content: 'Crispiness in dosa batter...'     │
 │                                                                                        │
 │  USER QUESTION: Why is there so much ghee in dosa?"                                    │
 └────────────────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
 ┌───────────────────────┐
 │       LLM (GPT-4o)    │
 └───────────────────────┘
             │
             ▼
   Synthesized, Grounded Answer:
   "Ghee is used to achieve the signature crispy texture during high-heat batter frying.
    (Source: South Indian Cooking, Page 34)"
```

---

## 🧩 4. What Document Types Can We Chunk?

A common beginner misconception is that RAG only works on `.txt` and `.pdf` files. Modern RAG systems ingest **any format that can yield text, structured data, or multimodal embeddings**:

| Data Type | Common Formats | Ingestion & Extraction Method | Metadata Extracted |
| :--- | :--- | :--- | :--- |
| **Documents** | `.pdf`, `.docx`, `.epub` | Page-by-page loaders, optical OCR for scanned pages | `pageNumber`, `source`, `author`, `title` |
| **Markup & Web** | `.html`, `.xml`, `.md` | HTML/XML element tree parsers, Markdown header splitters | `url`, `tag`, `h1/h2/h3 hierarchy` |
| **Structured Data** | `.json`, `.csv`, `.sql` | Tabular row-to-text converters, JSON object key-value stringifiers | `rowId`, `table`, `columnHeaders` |
| **Video & Audio** | `.vtt`, `.srt`, `.mp3` | Subtitle parser / Whisper ASR speech-to-text with timestamps | `startTime`, `endTime`, `videoId`, `speaker` |
| **Code & Repos** | `.js`, `.ts`, `.py` | AST-aware splitters (splits by class, function, or block) | `filePath`, `functionName`, `commitHash` |
| **Scanned Images** | `.png`, `.jpg`, `.tiff` | Multimodal Vision LLMs (GPT-4o vision) or OCR (Tesseract) | `imageCoordinates`, `detectedText` |

### The Power of Video Transcripts (`.srt` / `.vtt`):
When chunking `.vtt` or `.srt` files from lectures, meetings, or YouTube videos:
* Each chunk keeps the `startTime` (e.g., `00:14:22`) and `endTime` (e.g., `00:15:30`).
* When the user asks a question, your RAG system can return: *"Here is your answer, discussed at timestamp [14:22] in Video 3."*

---

## ✂️ 5. Chunking Strategies: How to Slice Data Effectively

If you feed an entire 500-page book as one chunk, semantic similarity fails because the embedding vector gets diluted across 100 different topics.  
If you chunk 3 words per chunk, the model loses the entire sentence's meaning.

```
Original Sentence:
"Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient."

BAD CHUNKING (No Overlap):
[Chunk 1: "Node.js uses an event-driven,"]  |  [Chunk 2: "non-blocking I/O model that makes it"]
Result: The boundary between "event-driven" and "non-blocking" is severed; query for "event-driven non-blocking" misses both!

GOOD CHUNKING (Size: 50 tokens, Overlap: 15 tokens):
[Chunk 1: "Node.js uses an event-driven, non-blocking I/O model..."]
[Chunk 2: "...non-blocking I/O model that makes it lightweight and efficient."]
Result: The overlap acts as a semantic bridge, preserving context across seams!
```

### 1. Fixed-Size Chunking with Overlap
* Chunks text into fixed character or token counts (e.g., 500 characters with 100 characters overlap).
* **Pros**: Simple, fast.
* **Cons**: Can cut sentences or paragraphs in half.

### 2. Recursive Character Text Splitting (Recommended Default)
* Attempts to split by double newlines `\n\n` (paragraphs). If too big, falls back to single newlines `\n`, then spaces ` `, then characters.
* **Pros**: Preserves paragraphs and semantic units intact.

### 3. Document-Aware / Hierarchical Chunking
* Uses markdown headers (`#`, `##`, `###`) or PDF document tables of contents.
* Keeps header context attached to child paragraphs so the chunk knows: *"This paragraph belongs to Section 3.2: Database Migrations"*.

---

## 🎯 6. Grounding, Context Stuffing & Hallucination Mitigation

### What is Grounding?
**Grounding** means anchoring the LLM's response strictly to verifiable, retrieved facts rather than allowing it to rely on its wild statistical intuition.

### How to Prevent Hallucinations:
1. **The Strict System Boundary**:
   ```text
   You are an assistant. Answer the user strictly using the context provided below.
   If the answer is NOT present in the provided context, reply exactly:
   "I cannot find this information in the provided documents."
   Do NOT attempt to make up an answer.
   ```
2. **Provenance & Attributions (Page Numbers & Book Titles)**:
   By injecting metadata (`bookName`, `pageNumber`, `chapter`) alongside the raw text into the system prompt:
   ```json
   {
     "bookName": "dsa.pdf",
     "pageNumber": 14,
     "pageContent": "Binary search runs in O(log n) time..."
   }
   ```
   The LLM can quote the source directly:
   > *"Binary search runs in O(log n) time (Source: dsa.pdf, Page 14)."*
   This allows end-users to audit and verify answers in 2 clicks.

---

## 🛠️ 7. The Tooling Landscape: Why LangChain? What Are the Alternatives?

### Why LangChain Exists
LangChain is a high-level orchestration library. It gives developers ready-made abstractions so you don't have to reinvent the wheel:
* **Document Loaders**: 100+ pre-built loaders (`PDFLoader`, `DirectoryLoader`, `CheerioWebBaseLoader`, `S3Loader`).
* **Text Splitters**: Ready-to-use recursive splitters (`RecursiveCharacterTextSplitter`).
* **Vector Store Adapters**: Uniform APIs (`addDocuments`, `asRetriever`, `similaritySearch`) across 50+ vector DBs.

### The Downside of LangChain
* **Heavy Abstractions**: Deep layers of wrapper classes make debugging internal errors tricky (e.g., the peer dependency issues seen during install).
* **Rapid API Churn**: Deprecations between versions (`langchain` vs `@langchain/core` vs `@langchain/community`).

### Alternatives to LangChain

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE RAG TOOLKIT SPECTRUM                                 │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────┤
│           FRAMEWORK           │          BEST USED FOR        │         PROS / CONS      │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ **LlamaIndex**                │ Advanced RAG, Graph RAG,      │  King of RAG & search.   │
│ (Python & TS)                 │ complex data indexing         │  Better RAG-native APIs. │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ **LangChain**                 │ Multi-step agentic workflows, │  Huge ecosystem & tools. │
│ (@langchain/core, etc.)       │ broad integrations            │  Can feel overly complex.│
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ **Haystack (deepset)**        │ Production NLP pipelines,     │  Clean pipeline design;  │
│                               │ enterprise search             │  mostly Python-focused.  │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ **Vanilla SDKs**              │ Maximum performance, complete │  Zero abstractions, fast │
│ (Direct OpenAI + Qdrant SDK)  │ control, zero bloat           │  Must write own splitters│
└───────────────────────────────┴───────────────────────────────┴──────────────────────────┘
```

---

## 💻 8. Hands-On Code Breakdown: Step-by-Step

Let's dissect the two production scripts you wrote and executed in your setup.

### Part A: Ingestion Pipeline (`step1-vector-indexing.js`)

```javascript
import path from "node:path";
import dotenv from "dotenv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

async function generateVectorEmbeddingsForFile(filepath) {
  // 1. LOAD THE DOCUMENT:
  // PDFLoader reads the PDF binary and outputs an array of LangChain Document objects.
  // Each element represents one page and contains pageContent + metadata (pageNumber, source).
  const loader = new PDFLoader(filepath);
  const document = await loader.load(); 

  // 2. INITIALIZE EMBEDDING MODEL:
  // Prepares the model that translates English chunks into 1,536-dimensional float vectors.
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 3. CONNECT TO VECTOR STORE:
  // Connects to local Qdrant instance (running via Docker on port 6333).
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: "indexing-rag-docs-practice",
    },
  );

  // 4. EMBED AND STORE:
  // Sends pages to OpenAI -> receives embedding arrays -> stores vectors + metadata in Qdrant.
  await vectorStore.addDocuments(document);
  console.log(`All the documents are indexed....`);
}

generateVectorEmbeddingsForFile("./docs-for-vector/dsa.pdf");
```

---

### Part B: Query & Retrieval Pipeline (`step2-query.js`)

```javascript
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
  // 1. MUST USE THE EXACT SAME EMBEDDING MODEL:
  // The query vector space must match the indexed vector space!
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 2. ATTACH TO QDRANT COLLECTION:
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: "indexing-rag-docs-practice",
    },
  );

  // 3. RETRIEVE TOP-K MATCHING CHUNKS:
  // Converts userQuery into an embedding, performs Cosine search, returns top 5 chunks.
  const vectorRetriever = vectorStore.asRetriever({ k: 5 });
  const results = await vectorRetriever.invoke(userQuery);

  // 4. GROUNDING & PROMPT AUGMENTATION:
  // Injects retrieved text + page numbers + file source into the system prompt.
  const SYSTEM_PROMPT = `
    You are an expert in answering user queries based on the provided document context.
    Do not answer anything beyond what is provided in the documents.

    Always answer the user concisely, cite the page number where the content is found,
    and specify the name of the book/file.

    User Documents:
    ${results.map((e) => JSON.stringify({ 
        bookName: e.metadata.source, 
        pageContent: e.pageContent, 
        pageNumber: e.metadata.loc?.pageNumber 
      })).join('\n\n')}
  `;

  // 5. GENERATE FINAL GROUNDED RESPONSE:
  const llmResponse = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userQuery },
    ],
  });

  console.log(`LLM Response:`, llmResponse.choices[0].message.content);
}   

query('Do I really need test cases in my application and what are the types of testing do I have?');
```

---

## ⚡ 9. Summary Cheat Sheet

| Question | Answer |
| :--- | :--- |
| **Why not just retrain/fine-tune the model?** | Fine-tuning teaches *style/formatting*, not reliable factual recall. Retraining is slow, expensive, and cannot handle daily document updates. |
| **Why not put everything in the system prompt?** | Token cost explosion, high latency, context window limits, and the "Lost in the Middle" attention degradation. |
| **Why must the embedding model match?** | Query vectors and document vectors must exist within the exact same mathematical dimensional coordinate system. |
| **How does RAG eliminate hallucinations?** | By constraining the LLM to synthesize only facts found in the retrieved context, with mandatory source and page citations. |
| **What comes next?** | **Advanced RAG** (Query rewriting, HyDE, Cross-Encoder reranking, Parent-Child chunking) and **Vectorless RAG** (BM25, GraphRAG, SQL). |
