# Builder/Validator Pattern

**Introduced in: Stage 1 (Minimum Viable Dispatch)**

---

## What It Is

The Builder/Validator pattern separates implementation from verification. One agent writes code; a different agent checks it. They never share responsibilities.

This is "executor/critic" separation at the agent level. The key structural enforcement is `disallowedTools`: the Validator's agent definition explicitly removes Write, Edit, and NotebookEdit from its available tool set. It is architecturally incapable of modifying files -- not just instructed not to, but prevented by the runtime.

The Validator's verdict is always binary: `VERDICT: PASS` or `VERDICT: FAIL`. No partial verdicts. No "it mostly works." This binary constraint forces the Validator to be precise about what it checks and forces the Builder to be precise about what it ships.

---

## How We Use It Here

### Builder

| Property | Value |
|----------|-------|
| Model | `claude-sonnet-4-5` |
| Role | Focused implementation agent |
| Tools | Read, Glob, Grep, Write, Edit, Bash, TaskGet, TaskUpdate |
| Disallowed | (none) |

**Key rules:**
- Read before writing -- always inspect existing files before modifying them
- File boundaries are absolute -- only touch files mentioned in the task description
- Idempotent execution -- if the file already satisfies the requirements, report that and stop
- Named exports only -- never use default exports
- JSDoc on every exported function
- Report changes via TaskUpdate with a concise summary of what was created or modified

### Validator

| Property | Value |
|----------|-------|
| Model | `claude-haiku-4-5` |
| Role | Read-only verification agent |
| Tools | Read, Glob, Grep, Bash, TaskGet, TaskUpdate |
| Disallowed | Write, Edit, NotebookEdit |

**Key rules:**
- Binary verdict -- every report ends with exactly `VERDICT: PASS` or `VERDICT: FAIL`
- Specific feedback on failure -- list exactly which checks failed and why
- Check everything listed -- do not skip criteria even if earlier checks already failed
- Never suggest fixes -- describe the problem only; the orchestrator decides what happens next

### Why Different Models?

Using the same model for both agents would work, but it would be wasteful. Validation is a mechanical check -- read files, confirm presence of named exports, confirm JSDoc exists, confirm function signatures match. Haiku is fast and cheap, and it's more than capable of this. Using Opus or Sonnet for validation would be like hiring a senior engineer to run a linter.

See the "Why These Models?" table in [`docs/agents.md`](../agents.md) for the full cost/capability breakdown.

### Structural Enforcement vs. Instruction

The critical design choice here is `disallowedTools`. You could instruct the Validator: "You must not write files." But instructions can be overridden by confused reasoning or malformed prompts. `disallowedTools` removes the capability at the tool-call level -- the Claude Code runtime will reject any Write/Edit/NotebookEdit call from a Validator agent regardless of what the prompt says.

This is the difference between policy and architecture. The Builder/Validator separation is not a convention -- it is enforced by the system.

---

## Where It Comes From

The "one writes, another reviews" structure has converged independently across the major multi-agent frameworks:

- **CrewAI** uses a Crew of agents with defined roles. The standard pattern is a Writer/Reviewer pair where the Reviewer has no output tools.
- **LangGraph** models this as a graph with separate executor and critic nodes; edges enforce that the critic receives the executor's output as read-only context.
- **AutoGen** popularized the "Conversable Agent" pattern where a UserProxyAgent (executor) and AssistantAgent (critic) alternate turns.

The **Google Research 180-configuration study** on multi-agent systems found that performance saturates at around 4 agents for most tasks. Beyond that, coordination overhead outweighs capability gains. The Builder/Validator pair (2 agents) is the minimal useful unit -- below it, you have no verification; above it, you're adding complexity before you've proven the baseline works.

**PubNub's multi-agent best practices** emphasize narrow scope: each agent should do one thing and be evaluated on that one thing. Splitting implementation and verification into separate agents with separate models makes this concrete -- neither agent can drift into the other's territory.

The **3-agent Planner/Executor/Critic** pattern (common in community discussions) is what Stage 1 approximates. The Orchestrator is the Planner, the Builder is the Executor, and the Validator is the Critic. Stage 1 collapses the Planner's planning into a single dispatch cycle; Stages 2-3 expand it into DAG computation and iterative refinement.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/agents.md`](../agents.md) | Full agent catalog with model/tool tables and cost rationale |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | How the orchestrator coordinates Builder and Validator |
| [`docs/patterns/higher-order-prompt.md`](higher-order-prompt.md) | Why BUILDER_AGENT and VALIDATOR_AGENT are variables, not hardcoded names |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Full stage roadmap and key design decisions |
