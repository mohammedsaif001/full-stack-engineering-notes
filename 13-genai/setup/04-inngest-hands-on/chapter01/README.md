# Chapter 01 — Inngest Basics: Hello World & Multi-Step Workflows

> **Goal**: Learn the fundamental primitives of durable execution: initializing the client, creating functions, handling events, and checkpointing steps with `step.run()` and `step.sleep()`.

---

## 🎯 What You Will Learn
1. How to create an Inngest client (`new Inngest({ id: "..." })`).
2. Creating an event-triggered background function (`inngest.createFunction`).
3. Using `step.run()` to create an **idempotent, durable checkpoint**.
4. Using `step.sleep()` for non-blocking serverless delays that cost $0 while waiting.
5. Serving Inngest over standard Express HTTP routes with `serve({ client, functions })`.

---

## 🚀 How to Run

### Step 1: Start the Inngest Dev Server (Terminal 1)
From the root `04-inngest-hands-on` directory:
```bash
npm run inngest:dev
```
Open **http://localhost:8288** in your browser to view the Inngest Dev Server UI.

### Step 2: Start Chapter 1 Express Server (Terminal 2)
```bash
npm run dev:ch1
```

---

## 🧪 Testing the Endpoints

### 1. Trigger the Single-Step Hello World Function
```bash
curl -X POST http://localhost:3000/test-hello \
  -H "Content-Type: application/json" \
  -d '{"name": "Saif"}'
```
* **What happens**: The `test/hello` event is emitted. Inngest immediately captures it and runs `helloFunction`. Check `http://localhost:8288` to see the payload!

### 2. Trigger the Multi-Step Durable Workflow
```bash
curl -X POST http://localhost:3000/test-multistep \
  -H "Content-Type: application/json" \
  -d '{"userId": "saif_007"}'
```
* **Execution Flow**:
  1. `step.run("step-1-fetch-initial-data")` runs and memoizes its result.
  2. `step.sleep("wait-a-bit", "5s")` pauses the function for 5 seconds without blocking the Node.js event loop.
  3. `step.run("step-2-process-previous-result")` resumes execution, reading the memoized output from Step 1.
