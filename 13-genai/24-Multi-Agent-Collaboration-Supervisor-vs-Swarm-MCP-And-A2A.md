# 24 — Multi-Agent Collaboration: Supervisor vs Swarm, MCP & A2A

> **Cohort Series**: Generative AI Notes  
> **Topic**: When and how to split work across multiple cooperating agents — coordination topologies (Supervisor, Swarm/Handoff, Hierarchical, Pipeline), shared state, the MCP vs A2A protocol split, and the real-world failure modes.  
> **Core Mental Model**: *Multi-agent = microservices for LLMs.* Powerful when you need specialisation and parallelism; a **distributed-systems headache** when you don't. Start with one agent.  
> **Builds on**: [14 — Agent SDK](14-Agent-SDK-Architecture-Harness-MCP-And-Guardrails.md), [15 — MCP](15-Model-Context-Protocol-MCP-Architecture-Transports-And-Gateways.md), [23 — Agentic Patterns](23-Agentic-Workflows-And-Patterns-Planning-Reflection-Self-Correction.md).

---

## 🧭 1. Why Multiple Agents At All?

A single agent with 40 tools, a 10-page system prompt and 200K tokens of history gets **confused**. Splitting helps with:

| Problem in single agent | How multi-agent helps |
|---|---|
| 🧠 **Context overload** — too many tools/instructions | Each agent has a *small, focused* context |
| 🎯 **Tool-selection errors** (accuracy drops with many tools) | Each specialist sees only 3–8 relevant tools |
| 🔐 **Least privilege** | Billing agent can't touch the code-deploy tool |
| ⚡ **Latency** | Independent sub-agents run **in parallel** |
| 💰 **Cost** | Cheap model for simple agents, strong model only where needed |
| 🧪 **Testability** | Evaluate each specialist independently |

> [!WARNING]
> **Don't over-agent.** Every extra agent adds: a handoff (latency), context loss (information bottleneck), more tokens (each agent re-reads shared context), and non-determinism. Anthropic's own multi-agent research system used **~15× more tokens** than a chat. Use multi-agent only when the benefit clearly outweighs this.

```
  Rule: if ONE agent with good tools + good prompt works  →  STOP. Don't split.
        split only when you hit context limits, tool-confusion, or need parallelism.
```

---

## 🏗️ 2. The Four Coordination Topologies

### 2.1 Supervisor (Orchestrator / Manager) Pattern

A **central supervisor** receives the task, decides which worker handles what, collects results, and produces the final answer. **Workers never talk to each other** — all traffic goes through the supervisor.

```
                         ┌──────────────────┐
         User ─────────► │   SUPERVISOR     │ ◄───── final answer ─────► User
                         │ (plans, routes,  │
                         │  aggregates)     │
                         └──┬─────┬──────┬──┘
              delegate/     │     │      │     delegate/
              results       ▼     ▼      ▼     results
                      ┌───────┐ ┌───────┐ ┌───────┐
                      │Research│ │ Coder │ │Writer │   ← specialist workers
                      │ Agent  │ │ Agent │ │ Agent │
                      └───────┘ └───────┘ └───────┘
```

| ✅ Pros | ⚠️ Cons |
|---|---|
| Central control, easy to reason about & debug | Supervisor = **bottleneck + single point of failure** |
| One place for guardrails, budgets, logging | Supervisor context grows with every worker result |
| Clear audit trail | Extra LLM hop per delegation (latency/cost) |
| Natural fit for *workers-as-tools* | Supervisor can mis-route (routing quality = system quality) |

**Implementation trick — "agents as tools":** expose each worker to the supervisor *as a tool*. The supervisor uses plain function calling (Note 22) to "call" a specialist.

```js
// OpenAI Agents SDK style: sub-agent exposed as a tool (supervisor stays in control)
const researchAgent = new Agent({ name: "Researcher", instructions: "...", tools: [webSearch] });
const coderAgent    = new Agent({ name: "Coder",      instructions: "...", tools: [runCode] });

const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Break the task down. Delegate to specialists. Combine their outputs.",
  tools: [
    researchAgent.asTool({ toolName: "research", toolDescription: "Find facts on the web" }),
    coderAgent.asTool({ toolName: "write_code", toolDescription: "Write & test code" }),
  ],
});
```

### 2.2 Swarm / Handoff (Peer-to-Peer) Pattern

No boss. Each agent can **hand off control** to another agent, *transferring the conversation*. Whoever has control talks directly to the user.

```
   User ──► [Triage Agent] ──handoff──► [Billing Agent] ──handoff──► [Refund Agent] ──► User
                 │                                                        ▲
                 └────────────handoff──► [Tech Support Agent] ────────────┘
```

```js
// A "handoff" is literally a tool call that returns another agent
const refundAgent  = new Agent({ name: "Refunds",  instructions: "Process refunds. Verify order first." , tools: [issueRefund] });
const billingAgent = new Agent({ name: "Billing",  instructions: "Answer billing questions.", handoffs: [refundAgent] });
const triageAgent  = new Agent({
  name: "Triage",
  instructions: "Greet the user, understand the issue, then hand off to the right specialist.",
  handoffs: [billingAgent, techAgent],
});
```

| ✅ Pros | ⚠️ Cons |
|---|---|
| No central bottleneck; **fewer LLM hops** (one agent talks to user directly) | Harder to trace *who's in control*; can **ping-pong** forever |
| Natural for customer-support / conversational flows | Global guardrails/budgets must be enforced per agent |
| Lightweight & simple to build | Context transfer decisions: pass **full history or a summary?** |

### 2.3 Hierarchical (Tree of Supervisors)

Supervisors **of supervisors** — for very large systems.

```
                    ┌────────────────┐
                    │ CEO Supervisor │
                    └───┬────────┬───┘
              ┌─────────▼─┐    ┌─▼──────────┐
              │ Research  │    │ Engineering│   ← team leads (mid-level supervisors)
              │   Lead    │    │    Lead    │
              └──┬─────┬──┘    └──┬──────┬──┘
              Web  Papers      Coder  Tester      ← leaf workers
```
Use when one supervisor would otherwise manage >7–10 workers (same reason org charts exist).

### 2.4 Pipeline / Sequential (Assembly Line)

Fixed order: Agent A → Agent B → Agent C. Basically **prompt chaining where each stage is an agent**.

```
 [Planner] ──► [Researcher] ──► [Writer] ──► [Reviewer] ──► Output
```
Deterministic, cheap, easy to test — choose this when the stages are known.

---

## ⚔️ 3. Supervisor vs Swarm — Head-to-Head

| Dimension | **Supervisor** | **Swarm / Handoff** |
|---|---|---|
| Control | Centralised | Decentralised |
| Who talks to user? | Always the supervisor | Whichever agent holds control |
| Latency | Higher (extra hop each delegation) | Lower (direct) |
| Debuggability | ✅ Easier (single trace root) | ⚠️ Harder (distributed control) |
| Parallelism | ✅ Easy (fan-out from supervisor) | ⚠️ Mostly sequential |
| Risk of loops | Low (supervisor bounds it) | Higher (A↔B ping-pong) |
| Context handling | Workers get *task-scoped* context | Full conversation usually transferred |
| Best for | Research, complex projects, **parallel subtasks** | Support routing, conversational flows |
| Analogy | 🏢 Manager assigning tasks to team | ☎️ Call-centre transferring your call |

```
 SUPERVISOR: Manager → asks Analyst → asks Writer → compiles report → gives YOU the report.
 SWARM:      Receptionist → transfers you to Billing → Billing transfers you to Refunds → Refunds talks to YOU.
```

---

## 🗃️ 4. Shared State & Communication

How do agents pass information?

| Mechanism | How | Trade-off |
|---|---|---|
| **Message passing** | Output text of A becomes input of B | Simple; lossy (info bottleneck) |
| **Shared scratchpad / blackboard** | All agents read/write a common state object | Rich; risk of noise + conflicting writes |
| **Structured handoff payload** | Zod-typed object `{task, context, constraints}` | ✅ Precise, validated, debuggable |
| **External memory / artifacts** | Write files/DB rows; pass **references** | ✅ Avoids bloating context; best for large outputs |

```js
// Typed handoff contract — never pass raw "figure it out" blobs between agents
const HandoffSchema = z.object({
  task: z.string(),
  context_summary: z.string().max(1500),      // compressed, not full history
  constraints: z.array(z.string()),
  artifact_refs: z.array(z.string()),         // e.g. ["s3://bucket/report-draft.md"]
  expected_output: z.string(),
});
```

> [!TIP]
> **The "telephone game" problem:** every agent-to-agent summary loses detail. Prefer **passing references to artifacts** (file paths, doc IDs, DB keys) over re-summarising large outputs through the LLM.

### Graph-based orchestration (LangGraph model)
Model the system as a **state machine / graph**: nodes = agents or functions, edges = (conditional) transitions, shared **state** object + **checkpointer**.

```
          ┌──────────┐   needs_research   ┌────────────┐
 START ──►│ supervisor├──────────────────►│ researcher │──┐
          └────┬─────┘                    └────────────┘  │
               │ needs_code    ┌────────┐                 │
               ├──────────────►│ coder  │─────────────────┤
               │               └────────┘                 │
               │ done                                     │
               ▼                                          ▼
              END ◄───────────────────────────── back to supervisor
```
Explicit graphs give you **deterministic control, cycles, persistence (Note 23 §6), and human-in-the-loop** interrupts.

---

## 🔌 5. MCP vs A2A: Two Different Protocol Layers

These get confused constantly. They solve **different problems**.

```
                    ┌────────────────────────────────────────────┐
   AGENT  ◄── MCP ─►│  Tools, data, prompts  (vertical)          │  "How does an agent use TOOLS?"
                    └────────────────────────────────────────────┘

   AGENT  ◄── A2A ─►  OTHER AGENT                (horizontal)       "How do AGENTS talk to AGENTS?"
```

| | **MCP** (Model Context Protocol) | **A2A** (Agent2Agent Protocol) |
|---|---|---|
| Originated by | Anthropic (Nov 2024) | Google (Apr 2025) → now under the Linux Foundation |
| Connects | Agent ⇄ **tools / data / resources** | Agent ⇄ **another (opaque) agent** |
| Direction | Vertical (agent to capability) | Horizontal (peer to peer) |
| Counterpart is | A deterministic function/server | An autonomous agent with its own reasoning |
| Discovery | Server lists tools/resources/prompts | **Agent Card** (`/.well-known/agent.json`) advertises skills, endpoint, auth |
| Interaction | Request → result | **Task lifecycle** (submitted → working → input-required → completed), streaming, long-running |
| Transport | stdio / Streamable HTTP | HTTP + JSON-RPC, SSE streaming, webhooks |
| Analogy | USB-C port 🔌 | Phone network 📞 between companies |

> **Mental shortcut:** *MCP gives an agent hands; A2A lets agents shake hands.*  
> They're **complementary**: Agent A discovers Agent B via A2A, and Agent B uses its own tools via MCP.

```
  Your Travel Agent ──A2A──► Airline Agent (opaque, other company) ──MCP──► Booking DB / Payments API
```

A2A matters when agents are built by **different teams/vendors/frameworks** and you can't (or shouldn't) share their internals. Inside one codebase, plain function calls / handoffs are simpler.

---

## 🧩 6. Framework Landscape (What to Pick)

| Framework | Style | Strength | Watch out |
|---|---|---|---|
| **OpenAI Agents SDK** (`@openai/agents`) | Agents + `handoffs` + `asTool` + guardrails + tracing | Minimal, production-ready, built-in tracing | Best on OpenAI models |
| **LangGraph** | Explicit graph/state machine | Control, checkpoints, HITL, cycles | More boilerplate |
| **CrewAI** | Role-based "crew" (role/goal/backstory) | Fast prototyping of team metaphors | Less control over flow |
| **AutoGen / AG2** | Conversational multi-agent chat | Research, agent debates | Chatty → token heavy |
| **Claude Agent SDK / subagents** | Harness with spawnable sub-agents + MCP + skills | Coding/long-horizon tasks, isolated sub-agent contexts | — |
| **Vercel AI SDK** | Lightweight multi-step tool loops (`maxSteps`) | Great TS/web DX | Not a full orchestration framework |
| **From scratch** (our `agent-sdk-from-scratch`) | Your own loop + handoff signal | Full understanding, zero magic | You maintain everything |

> [!NOTE]
> Frameworks change monthly. Learn the **topologies** (this note) — they transfer across every framework.

---

## 💻 7. Hands-On: Supervisor with Parallel Workers (Node.js)

A hand-rolled supervisor to show there's no magic.

```js
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const client = new OpenAI();

// 1️⃣ Specialist workers = small focused prompts/agents
const workers = {
  researcher: (task) => runAgent({ system: "You are a meticulous web researcher.", tools: [webSearch], task }),
  analyst:    (task) => runAgent({ system: "You analyse data and report numbers.",  tools: [runPython], task }),
  writer:     (task) => runAgent({ system: "You write crisp executive summaries.", tools: [],          task }),
};

// 2️⃣ Supervisor produces a STRUCTURED delegation plan
const PlanSchema = z.object({
  subtasks: z.array(z.object({
    worker: z.enum(["researcher", "analyst", "writer"]),
    task: z.string(),
    depends_on: z.array(z.number()),      // indexes of subtasks whose output is needed
  })),
});

async function supervisor(goal) {
  const plan = (await client.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Split the goal into subtasks for the available workers." },
      { role: "user", content: goal },
    ],
    response_format: zodResponseFormat(PlanSchema, "plan"),
  })).choices[0].message.parsed;

  // 3️⃣ Execute in dependency order; independent subtasks run in PARALLEL
  const results = [];
  const done = new Set();
  while (done.size < plan.subtasks.length) {
    const ready = plan.subtasks
      .map((s, i) => ({ ...s, i }))
      .filter((s) => !done.has(s.i) && s.depends_on.every((d) => done.has(d)));

    await Promise.all(ready.map(async (s) => {
      const upstream = s.depends_on.map((d) => results[d]).join("\n---\n");
      results[s.i] = await workers[s.worker](`${s.task}\n\nContext from earlier steps:\n${upstream}`);
      done.add(s.i);
    }));
  }

  // 4️⃣ Final synthesis
  return results.at(-1);
}
```

---

## ⚠️ 8. Multi-Agent Failure Modes (and Fixes)

| Failure | What happens | Mitigation |
|---|---|---|
| **Infinite handoff loop** | A→B→A→B… | Max handoff depth; track visited agents; supervisor arbitration |
| **Information bottleneck** | Detail lost between agents | Typed handoff payloads; pass artifact refs |
| **Duplicate work** | Two workers research the same thing | Supervisor assigns **non-overlapping scopes** explicitly |
| **Conflicting outputs** | Workers disagree | Judge/arbiter agent or deterministic merge rule |
| **Error cascade** | One bad worker output poisons the rest | Validate each handoff with Zod + critic step |
| **Cost explosion** | N agents × long contexts | Per-agent token budget; cheap models for workers; parallel not sequential |
| **Prompt-injection spread** | Injected text in Agent A's tool output propagates to B/C | Sanitise at every boundary; treat inter-agent messages as **untrusted** (Note 05) |
| **Privilege escalation** | Low-priv agent tricks high-priv agent | Authorisation checked in tools, never "agent trusts agent" |
| **Debugging hell** | Can't tell which agent erred | Distributed **tracing** with a root trace ID (Note 25) |

> [!IMPORTANT]
> **Security rule for multi-agent:** *Messages between agents are untrusted input.* A compromised/injected sub-agent can ask the supervisor to do anything its text can convince it of. Enforce permissions **in the tool layer per end user**, not by trusting upstream agents.

---

## 🧭 9. Decision Guide

```
 Single agent works?  ──yes──►  STOP. Ship it.
        │ no
        ▼
 Stages fixed & known?  ──yes──►  PIPELINE
        │ no
        ▼
 Need parallel subtasks / research / one accountable owner?  ──yes──►  SUPERVISOR
        │ no
        ▼
 Conversational routing between domain experts (support-style)?  ──yes──►  SWARM / HANDOFF
        │
 >10 workers?  ──►  HIERARCHICAL
 Cross-vendor / cross-org agents?  ──►  add A2A
 Agents need tools/data?  ──►  MCP
```

---

## 📋 The 1-Minute Summary Cheat Sheet

| Term | Plain English | Analogy |
|---|---|---|
| **Multi-agent system** | Several specialised agents cooperating | A team vs a lone freelancer |
| **Supervisor** | Central agent delegates + aggregates | Project manager |
| **Swarm / Handoff** | Agents pass control peer-to-peer | Call-centre transfer |
| **Hierarchical** | Supervisors of supervisors | Org chart |
| **Pipeline** | Fixed sequence of agents | Factory assembly line |
| **Agent-as-tool** | Sub-agent wrapped as a callable function | Hiring a contractor via a work order |
| **Shared state / blackboard** | Common data store agents read/write | Team whiteboard |
| **MCP** | Standard for agent ⇄ tools/data | USB-C port |
| **A2A** | Standard for agent ⇄ agent | Phone network between companies |
| **Agent Card** | JSON "business card" advertising an agent's skills | LinkedIn profile for bots |
| **Handoff loop** | Agents bounce task forever | Two people saying "after you!" at a door |
