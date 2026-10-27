# 23 — Agentic Workflows & Patterns: Planning, Reflection, Self-Correction & Persistent Memory

> **Cohort Series**: Generative AI Notes  
> **Topic**: The design patterns that turn "LLM + tools" into reliable autonomous systems — workflows vs agents, ReAct, Plan-and-Execute, Reflection, self-correction loops, and state persistence.  
> **Core Mental Model**: *Don't build an agent when a workflow will do.* Start with the simplest pattern that works, and add autonomy only where the task genuinely can't be scripted.  
> **Builds on**: [03 — Loops & Harness](03-Agentic-Terminology-Loops-Harness-Prompt-Engineering.md), [14 — Agent SDK](14-Agent-SDK-Architecture-Harness-MCP-And-Guardrails.md), [22 — Function Calling](22-Function-Calling-And-Tool-Use-Deep-Dive.md).

---

## 🧭 1. Workflow vs Agent: The Most Important Distinction

```
   WORKFLOW                                         AGENT
 (code controls the path)                      (LLM controls the path)

  Step 1 ─► Step 2 ─► Step 3                    ┌──► think ──► pick tool ──┐
  (fixed, predictable, cheap)                   │                          ▼
                                                └───── observe result ◄────┘
                                                (flexible, unpredictable, costly)
```

| | **Workflow** | **Agent** |
|---|---|---|
| Control flow | Hard-coded by developer | Decided by LLM at runtime |
| Predictability | High | Low–medium |
| Cost / latency | Low, bounded | Higher, variable |
| Debuggability | Easy (fixed steps) | Hard (non-deterministic paths) |
| Best for | Well-defined tasks | Open-ended tasks, unknown # of steps |

> [!IMPORTANT]
> **Rule of thumb (senior dev edition):** Try a **single LLM call + good prompt** first → then a **workflow** → only then a **full agent**. Every step up the ladder costs you reliability, money, and debuggability.

```
 Complexity ladder:
 [1 LLM call] ─► [Prompt chain] ─► [Router / Parallel] ─► [Orchestrator-Workers] ─► [Autonomous Agent]
   cheapest ─────────────────────────────────────────────────────────────────────► most powerful/risky
```

---

## 🧱 2. The Five Workflow Patterns (Building Blocks)

### Pattern 1 — Prompt Chaining
Break a task into fixed sequential steps; each LLM call processes the previous output. Add **gates** (programmatic checks) between steps.

```
 Input ─► [LLM: Outline] ─► gate: valid? ─► [LLM: Draft] ─► [LLM: Translate] ─► Output
```
*Example*: Generate marketing copy → check length/tone → translate to Hindi.

### Pattern 2 — Routing
Classify the input, then send it to a specialised prompt/model/handler.

```
              ┌─► Billing prompt (cheap model)
 Input ─► [Classifier] ─┼─► Tech-support prompt (RAG)
              └─► Refund flow (human gate)
```
*Example*: Easy queries → `gpt-4o-mini`, hard ones → a reasoning model. (Also the "intelligent query routing" in Note 08.)

### Pattern 3 — Parallelization
Run LLM calls simultaneously. Two flavours:
- **Sectioning** — split into independent subtasks (e.g. review code for *security* + *style* + *perf* in parallel).
- **Voting** — run the *same* task N times and aggregate (this is the **multi-model ensemble + judge** from Note 04).

### Pattern 4 — Orchestrator–Workers
A central LLM **dynamically decides** the subtasks, delegates to worker LLMs, and synthesises results. Unlike parallelization, the subtasks **aren't known in advance**.

```
                 ┌─► Worker: edit file A ─┐
 Task ─► [Orchestrator] ─► Worker: edit file B ─┼─► [Synthesiser] ─► Result
                 └─► Worker: edit file C ─┘
```
*Example*: "Fix this bug" → orchestrator discovers which files need changing.

### Pattern 5 — Evaluator–Optimizer (Generate → Critique → Refine)
One LLM generates, another evaluates against criteria and sends feedback until it passes. **This is the seed of Reflection (§5).**

```
 ┌─► [Generator] ──► draft ──► [Evaluator] ──pass?──► ✅ done
 │                                  │ no: feedback
 └──────────────────────────────────┘
```

---

## 🔁 3. ReAct: Reason + Act (The Core Agent Loop)

Introduced in Note 03. Here's the **full** picture of what the model sees each iteration.

```
 Thought:      "I need the user's order status. I should look up the user first."
 Action:       search_user({ email: "a@b.com" })
 Observation:  { id: 42, name: "Asha" }
 Thought:      "Now fetch their latest order."
 Action:       get_orders({ userId: 42, limit: 1 })
 Observation:  { id: "ORD-9", status: "shipped" }
 Thought:      "I have enough information."
 Final Answer: "Your order ORD-9 has shipped."
```

```js
// Minimal ReAct skeleton with native tool calling
async function react(goal, { maxSteps = 12 } = {}) {
  const messages = [{ role: "system", content: REACT_SYSTEM }, { role: "user", content: goal }];

  for (let i = 0; i < maxSteps; i++) {
    const res = await llm({ messages, tools });
    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls) return msg.content;                 // Final Answer
    for (const call of msg.tool_calls) {
      messages.push(await executeToolSafely(call));          // Observation
    }
  }
  return "⚠️ Step budget exhausted — escalating to human.";
}
```

| ✅ Strengths | ⚠️ Weaknesses |
|---|---|
| Adaptive — changes plan based on observations | **Myopic**: decides one step at a time, no global plan |
| Simple to implement | Can loop or wander on long tasks |
| Grounded in real tool results | Token cost grows each step (history re-sent) |

---

## 🗺️ 4. Planning Patterns

ReAct is *reactive*. For long, multi-step tasks, **separate planning from execution**.

### 4.1 Plan-and-Execute

```
 ┌───────────┐   plan: [s1,s2,s3,s4]   ┌────────────┐
 │  PLANNER  │ ──────────────────────► │  EXECUTOR  │ runs s1 (own small ReAct loop)
 │ (strong   │                         │ (cheaper   │ runs s2 …
 │  model)   │ ◄──── results ───────── │  model)    │
 └─────┬─────┘                         └────────────┘
       │ after each step: "Is the plan still valid?"
       ▼
   RE-PLAN if needed  ──►  FINAL SYNTHESIS
```

| Benefit | Detail |
|---|---|
| 💰 **Cost** | Expensive model plans once; cheap model executes |
| 🎯 **Focus** | Executor sees only its sub-step, not the whole mess |
| 🔎 **Transparency** | A visible plan can be shown/approved by the user (HITL) |

**Planner output should be structured** (use Zod, Note 02):

```js
const PlanSchema = z.object({
  goal: z.string(),
  steps: z.array(z.object({
    id: z.number(),
    description: z.string(),
    tool_hint: z.string().optional(),
    depends_on: z.array(z.number()),   // enables parallel execution of independent steps
  })),
});
```

### 4.2 Re-planning
A static plan breaks when reality differs (API down, empty search). After each step the planner gets `(plan, completed_steps, last_result)` and may **revise the remaining steps**.

### 4.3 Other Reasoning-Time Planning Techniques

| Technique | Idea | Cost |
|---|---|---|
| **Chain-of-Thought** (Note 02) | Think step by step in one pass | Low |
| **Self-Consistency** | Sample N CoT answers, take the **majority** vote | N× |
| **Tree-of-Thoughts** | Explore multiple reasoning branches, prune bad ones (search) | High |
| **Reasoning models** (o-series, Claude extended thinking) | Model does the deliberation **internally** | Billed as hidden "thinking tokens" |

> [!TIP]
> With modern **reasoning models**, you often *don't* need hand-rolled CoT/ToT prompting — the model plans internally. Don't write "think step by step" for them; instead give clear goals + constraints and let them think.

---

## 🪞 5. Reflection & Self-Correction

> **Reflection** = the model **critiques its own output** and improves it.  
> **Self-correction** = using *external feedback* (tests, linters, tool errors) to repair mistakes.

```
 ┌─────────────────────────────────────────────────────────────┐
 │  1. GENERATE   draft = LLM(task)                            │
 │  2. CRITIQUE   critique = LLM("List flaws in: " + draft)    │
 │  3. REVISE     draft2 = LLM(task + draft + critique)        │
 │  4. STOP when critique says "no major issues" OR max rounds │
 └─────────────────────────────────────────────────────────────┘
```

### Two very different kinds — know the difference!

| | **Intrinsic reflection** | **Grounded self-correction** |
|---|---|---|
| Feedback source | The LLM's own opinion | **Objective signal**: test results, compiler errors, schema validation, SQL error |
| Reliability | ⚠️ Weak — models are bad at spotting their *own* mistakes without new info | ✅ Strong — real ground truth |
| Example | "Re-read your essay and improve it" | "Tests failed with `TypeError` at line 12 — fix it" |

> [!IMPORTANT]
> **Research-backed caution:** pure self-critique without external signal often yields **little or no gain** (and sometimes makes answers worse). The big wins come from **grounded feedback**. That's why coding agents (Cursor, Devin, Claude Code) work so well — they have a compiler and test suite as an oracle.

### Grounded self-correction example (SQL agent)

```js
async function textToSql(question, { maxAttempts = 3 } = {}) {
  let feedback = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const sql = await llm(`Schema:\n${SCHEMA}\nQuestion: ${question}\n${feedback}\nReturn ONLY SQL.`);

    try {
      return await db.query(sql);                      // 👍 success
    } catch (err) {
      // 🔁 feed the REAL database error back — this is the grounded signal
      feedback = `Your previous SQL:\n${sql}\nfailed with: ${err.message}\nFix it.`;
    }
  }
  throw new Error("Could not produce valid SQL after retries");
}
```

### Reflexion (verbal reinforcement)
After a **failed episode**, the agent writes a short *lesson learned* into memory (`"Last time I forgot to filter by tenantId and got wrong rows"`) and re-reads it on the next attempt. No weight updates — just **memory of mistakes**.

### Guardrails for reflection loops
- ✋ **Max iterations** (2–3 is usually the sweet spot — returns diminish fast).
- 📉 **Stop on no-improvement** (critique ≈ identical to last round).
- 💸 **Budget cap** — each round re-sends context and costs tokens.
- ⚖️ Use a **separate judge/critic prompt** (ideally a different model) to reduce self-agreement bias.

---

## 🧠 6. Memory Persistence & State (Surviving Crashes and Restarts)

An agent that only lives in process memory **dies with the process**. Production agents need *durable state*.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     LAYERS OF AGENT STATE                                │
├────────────────────┬─────────────────────────────────────────────────────┤
│ Working memory     │ Current messages[] / scratchpad (this run)         │
│ Short-term / thread│ Conversation history keyed by threadId (DB/Redis)  │
│ Checkpoints        │ Full graph/loop state after EVERY step → resumable │
│ Long-term memory   │ Facts, preferences across sessions (Mem0, vectors) │
└────────────────────┴─────────────────────────────────────────────────────┘
```

> Long-term semantic memory is covered in depth in [10 — Memory in AI Agents](10-Memory-In-AI-Agents.md) and [19 — Mem0](19-Mem0-The-Memory-Layer-For-AI-Agents-Architecture-And-Setup.md). Here we focus on **execution state**.

### Checkpointing = save-game for agents

```js
// After every step, persist enough to resume deterministically
await db.insert(agentRuns).values({
  runId, step: i,
  messages: JSON.stringify(messages),
  plan: JSON.stringify(plan),
  status: "running",           // running | waiting_human | done | failed
  updatedAt: new Date(),
});

// On restart:
const last = await db.query.agentRuns.findFirst({ where: eq(agentRuns.runId, runId), orderBy: desc(agentRuns.step) });
messages = JSON.parse(last.messages);   // resume from step i+1, don't redo paid LLM calls
```

**Why it matters**

| Need | Solved by checkpoints |
|---|---|
| Server crash mid-run | Resume instead of restart (don't re-pay for 20 LLM calls) |
| **Human-in-the-loop** pause | Run sleeps in `waiting_human`; resumes hours later |
| **Time-travel debugging** | Replay/fork from step N with a different prompt |
| Long-running tasks | Hours/days — survive deploys |

> 🔗 This is exactly what **Inngest** gave us in [Note 13](13-Inngest-Durable-Execution-Workflows-And-AI-Agents.md): `step.run()` memoises each step so a retry never re-executes completed LLM/tool calls. LangGraph has built-in *checkpointers* (Postgres/SQLite/Redis) for the same purpose.

### Human-in-the-Loop as a state machine

```
 running ──► needs approval ──► [persist + notify] ──► waiting_human
                                                          │ approve / edit / reject
                                                          ▼
                                                     resume from checkpoint
```

---

## 🧰 7. Choosing a Pattern (Decision Guide)

```
                         ┌──────────────────────────────┐
                         │  Is the step sequence known? │
                         └───────────┬──────────────────┘
                   yes ──────────────┤────────────── no
                    ▼                                 ▼
            WORKFLOW (chain/route/parallel)    Is it long / multi-step?
                                              yes ─────────┤──────── no
                                               ▼                      ▼
                                      PLAN-AND-EXECUTE            plain ReAct
                                      (+ re-plan, HITL)           (+ MAX_STEPS)
                                               │
                         Output quality critical + objective checker exists?
                                               ▼
                                   ADD grounded self-correction loop
```

| Situation | Pattern |
|---|---|
| Fixed multi-stage content pipeline | Prompt chaining |
| Mixed query types, cost control | Routing |
| Independent checks / need confidence | Parallelization (voting) |
| Unknown subtasks (e.g. multi-file edit) | Orchestrator–Workers |
| Quality bar + clear rubric | Evaluator–Optimizer |
| Open-ended tool use | ReAct agent |
| Long horizon, expensive model | Plan-and-Execute |
| Code / SQL / structured output with a validator | Grounded self-correction |

---

## ⚠️ 8. Failure Modes of Agentic Systems

| Failure | Symptom | Mitigation |
|---|---|---|
| **Infinite loop** | Same tool call repeated | `MAX_STEPS`, dedupe identical (name+args) calls |
| **Goal drift** | Agent wanders off task after many steps | Re-inject goal each turn; planner checkpoints |
| **Context rot** | Quality drops as history balloons | Summarise/compact; offload to memory |
| **Compounding errors** | 95% per step × 10 steps ≈ **60%** overall success | Fewer steps, validators between steps |
| **Tool misuse** | Wrong tool / hallucinated args | Better descriptions, Zod validation, fewer tools |
| **Runaway cost** | $$$ burned overnight | Token + time + step budgets, alerts (Note 25) |
| **Silent failure** | Agent claims success without doing it | Verify side effects with a separate check/tool |

> **Compounding math:** if each step is 95% reliable, a 10-step chain succeeds `0.95^10 ≈ 60%`. That's why *shorter, validated* chains beat long autonomous ones.

---

## 📋 The 1-Minute Summary Cheat Sheet

| Term | Plain English | Analogy |
|---|---|---|
| **Workflow** | Developer-scripted LLM steps | Assembly line |
| **Agent** | LLM picks its own next step | Freelancer given a goal |
| **Prompt chaining** | Output of step N feeds step N+1 | Relay race |
| **Routing** | Classify then dispatch | Hospital triage desk |
| **Orchestrator–Workers** | Boss LLM delegates unknown subtasks | Project manager + team |
| **Evaluator–Optimizer** | Generate → critique → refine | Writer + editor |
| **ReAct** | Think → Act → Observe loop | Detective following clues |
| **Plan-and-Execute** | Plan first, execute steps, re-plan | Architect drawing blueprints before builders start |
| **Reflection** | Model critiques own output | Proofreading your own essay |
| **Self-correction (grounded)** | Fix using test/compiler errors | Fixing code until CI is green |
| **Reflexion** | Store lessons from failed attempts | Keeping a "mistakes diary" |
| **Checkpoint** | Save agent state each step | Video-game save point |
