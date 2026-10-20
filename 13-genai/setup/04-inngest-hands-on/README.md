# ⚡ Inngest Mastery: Hands-On Course & Production Workflows

> **Part of**: Generative AI & Distributed Workflows Series (`13-genai`)  
> **Topic**: Durable Execution, Multi-Step Workflows, Event-Driven Fan-Out, Scheduled Cron Jobs, and AI Agent Orchestration.  
> **Architecture**: **Single unified `package.json`** for all learning chapters with zero dependency bloat and instant `npm run` scripts!

---

## 🧭 Course Overview

In modern AI engineering and distributed backends, long-running agent loops and multi-step pipelines fail when relying on naive `await` chains or fragile RabbitMQ + Redis setups.

This hands-on repository walks you step-by-step from Inngest basics to production event-driven architectures:

```
04-inngest-hands-on/
├── package.json               # 🌟 SINGLE CONSOLIDATED PACKAGE.JSON (Shared Dependencies)
├── tsconfig.json              # Unified TypeScript configuration
├── chapter01/                 # 🐣 Basics: Hello World, step.run & step.sleep
├── chapter02/                 # 🏛️ Express Integration & Clean Multi-Step Pipelines
├── chapter03/                 # 📢 Event-Driven Architecture & The Fan-Out Pattern
├── chapter04/                 # ⏰ Scheduled & Cron Workflows (Timezone-Aware)
└── final-project/             # 🚀 DevQuery Forum: Full-Stack Next.js 16 + Drizzle + AI Answers
```

---

## ⚡ Quick Start (Run in 60 Seconds)

### 1. Install Dependencies Once
From this directory (`13-genai/setup/04-inngest-hands-on/`):
```bash
npm install
```

### 2. Start the Local Inngest Dev Server (Terminal 1)
```bash
npm run inngest:dev
```
* Open your browser at **[http://localhost:8288](http://localhost:8288)** to view the live Inngest dashboard, visual event traces, and function execution history.

### 3. Run Any Chapter with a Single Command (Terminal 2)
```bash
# Run Chapter 1: Basics & Multi-Step Workflows
npm run dev:ch1

# Run Chapter 2: Clean Express Architecture & Sequential Steps
npm run dev:ch2

# Run Chapter 3: User Signup Event Fan-Out (1 Event -> 3 Parallel Functions)
npm run dev:ch3

# Run Chapter 4: Timezone-Aware Cron Jobs & Scheduled Workflows
npm run dev:ch4
```

---

## 📚 Chapter Breakdown

| Chapter | Topic | Primitives Covered | Test Endpoint |
| :--- | :--- | :--- | :--- |
| **[Chapter 01](./chapter01/README.md)** | **Inngest Basics** | `inngest.createFunction`, `step.run`, `step.sleep` | `POST /test-hello`<br>`POST /test-multistep` |
| **[Chapter 02](./chapter02/README.md)** | **Express Integration** | Clean modular architecture, `serve()`, step data passing | `POST /test`<br>`POST /test-multi` |
| **[Chapter 03](./chapter03/README.md)** | **Event Fan-Out Pattern** | `user/signup.completed` triggers 3 parallel functions | `POST /api/signup` |
| **[Chapter 04](./chapter04/README.md)** | **Cron & Schedules** | `TZ=America/New_York`, recurring jobs, dual event triggers | `POST /trigger/daily-sales`<br>`POST /trigger/cart-recovery` |
| **[Final Project](./final-project/README.md)**| **DevQuery Forum** | Full-stack Next.js 16 + Drizzle ORM + AI answer generation | Full Next.js App Router |

---

## 💡 The Core Mental Model: Why Inngest?

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           WHY DURABLE EXECUTION WINS                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  TRADITIONAL ASYNC (Node.js await chain):
  Step 1 (DB Insert) ──► Step 2 (Vectorize) ──► Step 3 (LLM Call: 💥 429 FAIL!)
  • Entire function crashes.
  • User retries ──► Step 1 runs AGAIN, creating DUPLICATE database records!

  DURABLE EXECUTION (Inngest):
  Step 1 (DB Insert) ──► Step 2 (Vectorize) ──► Step 3 (LLM Call: 💥 429 FAIL!)
  • Step 1 and Step 2 outputs are permanently cached in Inngest state.
  • Inngest automatically retries with exponential backoff.
  • Resumes DIRECTLY AT STEP 3! Zero duplicate database writes, 100% idempotent!
```

---

## 🛠️ Testing With Curl

### Test Chapter 1 Multi-Step:
```bash
curl -X POST http://localhost:3000/test-multistep \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_saif"}'
```

### Test Chapter 3 Fan-Out Signup:
```bash
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Saif",
    "email": "saif@example.com",
    "password": "secretpassword",
    "plan": "enterprise"
  }'
```

### Test Chapter 4 Cron Job On-Demand:
```bash
curl -X POST http://localhost:3000/trigger/daily-sales
```
