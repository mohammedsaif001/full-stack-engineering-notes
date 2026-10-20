# Chapter 02 — Express Integration & Clean Architecture

> **Goal**: Structure a production-ready Express application with Inngest by separating client configuration, function definitions, and HTTP routes.

---

## 🎯 What You Will Learn
1. **Separation of Concerns**: Storing your Inngest client in `src/inngest/client.ts` and functions in `src/inngest/functions.ts`.
2. How the `serve()` middleware works with Express:
   ```typescript
   app.use("/api/inngest", serve({ client: inngest, functions: [helloWorld, multiStepDemo] }));
   ```
3. Passing data down sequential steps using return values (`const step1Result = await step.run(...)`).

---

## 🚀 How to Run

### Step 1: Start the Inngest Dev Server (Terminal 1)
```bash
npm run inngest:dev
```

### Step 2: Start Chapter 2 Express Server (Terminal 2)
```bash
npm run dev:ch2
```

---

## 🧪 Testing the Endpoints

### 1. Trigger the Single-Step Greeting
```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"name": "Developer"}'
```

### 2. Trigger the Multi-Step Processing Pipeline
```bash
curl -X POST http://localhost:3000/test-multi \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_premium_99"}'
```
* **Step Breakdown**:
  * Step 1: `fetch-data` (simulates 1-second database latency).
  * Step 2: `process-data` (transforms `step1Result.data`).
  * Sleep: Waits 3 seconds.
  * Step 3: `save-result` (persists to database).
