# Dispatch Loop Pattern

**Introduced in: Stage 1 (Minimum Viable Dispatch)**

---

## What It Is

The Dispatch Loop is the core orchestration cycle. A single coordinator agent (the Orchestrator) receives a user prompt, creates a task, hands it to a Builder, hands the same task to a Validator, and reports the result. The coordinator never writes code.

```
User Prompt
    |
    v
[Orchestrator]
    |-- TaskCreate --> Task #1
    |-- Dispatch --> [Builder] --> implements task --> TaskUpdate
    |-- Dispatch --> [Validator] --> verifies task --> VERDICT: PASS/FAIL
    |
    v
Report Result
```

The "leader never codes" constraint is not just a style preference -- it is what makes the pattern extensible. If the orchestrator wrote code, you would not be able to swap in a different builder in Stage 4 without rewriting the coordinator. Because the orchestrator only dispatches, you can change what gets dispatched (agent identity, model, tool set) without touching the dispatch logic itself.

---

## How We Use It Here

The orchestrator follows a 5-step protocol defined in [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md):

**Step 1: Parse the User Prompt**

Read the request carefully. Identify the intent, the target files and functions, any named exports or signatures mentioned, and the acceptance criteria -- what "done" looks like. Emit an `orchestration.started` event.

**Step 2: Create a Task**

Create exactly ONE task via `TaskCreate`. The task description must be complete: file paths, function signatures, named exports, JSDoc requirements, and all acceptance criteria. The task is the contract between orchestrator, builder, and validator. Emit a `task.created` event.

**Step 3: Dispatch the Builder**

Dispatch the `BUILDER_AGENT` using the Task tool with `foreground: true`. Emit `agent.dispatched` before dispatch, `agent.completed` after. Wait for the builder to finish before proceeding.

**Step 4: Dispatch the Validator**

Dispatch the `VALIDATOR_AGENT` using the Task tool with `foreground: true`. Emit `agent.dispatched` before dispatch, `agent.completed` after. Wait for the validator to finish before proceeding.

**Step 5: Report Result**

Parse the validator's `TaskUpdate` for `VERDICT: PASS` or `VERDICT: FAIL`. Emit `verdict.received`, then report to the user. Emit `orchestration.completed`.

### Why Foreground Dispatch?

Both agents are dispatched with `foreground: true`. This is a hard requirement, not a preference.

Background agents in Claude Code cannot call MCP tools -- they run in a restricted context without access to the tool infrastructure that TaskGet, TaskUpdate, Read, Write, and Bash require. Since both the Builder (needs Write/Edit/Bash) and Validator (needs Read/Bash/TaskUpdate) depend on these tools, foreground dispatch is the only option in Stage 1.

Stage 8 introduces parallel worktree execution. That stage will require a different approach to isolation. In Stage 1, foreground-and-wait is the simplest thing that works.

### Why the Orchestrator Never Writes Code

Three reasons, each corresponding to a future stage:

1. **Agent swapping (Stage 4):** If the orchestrator wrote code, you could not swap the builder for a research builder or an enterprise builder without modifying the orchestrator itself. Keeping the orchestrator dispatch-only means agent identity is a parameter, not a dependency.

2. **Parallel execution (Stage 8):** When multiple tasks can run concurrently, the orchestrator needs to dispatch several builders simultaneously and wait for all of them. This is only possible if the orchestrator has no file-writing responsibilities -- you cannot parallelize a coordinator that is also doing implementation work.

3. **Validator independence (permanent):** If the orchestrator wrote some of the code, the Validator would be checking the orchestrator's own work, which defeats the purpose of independent verification.

---

## Where It Comes From

**Leader/Swarm pattern:** The dominant multi-agent architecture in 2024-2025 has a leader agent that coordinates a swarm of worker agents. The leader holds context (the plan, the task list, the dependencies); the workers hold capability (writing, searching, validating). This separation is explicit in LangGraph's `supervisor` pattern, CrewAI's `manager` role, and AutoGen's `GroupChat` with a designated orchestrator.

**@joshuaday (X/Twitter):** "The orchestrator spawns disposable subagents -- they do one thing, report back, and are gone. The orchestrator holds the thread." This captures why foreground dispatch with TaskUpdate reporting works: the builder and validator are stateless workers; the orchestrator is the stateful coordinator.

**IndyDevDan's 4-layer architecture:** Commands -> Skills -> Sub-agents -> Tools. Commands are user-facing entry points (`/orchestrate`). Skills are reusable orchestration logic (the `SKILL.md`). Sub-agents are dispatched workers (Builder, Validator). Tools are the primitives (TaskCreate, Write, Read). Each layer has a distinct responsibility; mixing them causes the coupling problems the pattern is designed to avoid.

**Temporal / Dagster / LangGraph:** Production workflow orchestration systems all separate the coordinator (which holds state and manages execution flow) from the executor (which does the actual work). Temporal calls this the "workflow" vs. the "activity." Dagster calls it the "job" vs. the "op." The dispatch loop applies this principle at the agent level.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The two agents being dispatched -- their models, tools, and constraints |
| [`docs/patterns/higher-order-prompt.md`](higher-order-prompt.md) | Why BUILDER_AGENT and VALIDATOR_AGENT are variables in the dispatch protocol |
| [`docs/agents.md`](../agents.md) | Full agent catalog with model/tool tables |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Full stage roadmap, including what stages 2-8 add to this loop |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | The full 5-step dispatch protocol definition |
