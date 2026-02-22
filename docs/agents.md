# Agent Catalog

All agent definitions used in the HOP Orchestrator, organized by stage. Each agent entry lists its model, role, tool set, and key constraints. Side-by-side comparison shows why each choice was made.

---

## Stage 1: Engineering Team (Default)

Three agents operate in Stage 1. The Orchestrator is implicit (it runs as the skill invoker); the Builder and Validator are dispatched via the Task tool.

### Orchestrator

| Property | Value |
|----------|-------|
| Model | `claude-opus-4-6` (via `/orchestrate` command) |
| Role | Coordination-only leader. Creates tasks, dispatches agents, reports results. |
| Tools | Task, TaskCreate, TaskUpdate, TaskList, TaskGet, Bash |
| Disallowed | (enforced by convention, not disallowedTools -- the prompt says "never write code") |

**Key constraints:**
- Never writes code or modifies files
- Never dispatches itself
- Holds the thread -- all agent results flow back to the orchestrator
- Runs the full 5-step dispatch protocol defined in SKILL.md

### Builder

| Property | Value |
|----------|-------|
| Model | `claude-sonnet-4-5` |
| Role | Focused implementation agent |
| Tools | Read, Glob, Grep, Write, Edit, Bash, TaskGet, TaskUpdate |
| Disallowed | (none) |

**Key constraints:**
- Read before writing -- always inspect existing files before modifying them
- File boundaries are absolute -- only touch files mentioned in the task description
- Idempotent execution -- if the file already satisfies the requirements, report and stop
- Named exports only -- never use default exports
- JSDoc on every exported function
- Report changes via TaskUpdate with a concise summary

### Validator

| Property | Value |
|----------|-------|
| Model | `claude-haiku-4-5` |
| Role | Read-only verification agent |
| Tools | Read, Glob, Grep, Bash, TaskGet, TaskUpdate |
| Disallowed | Write, Edit, NotebookEdit |

**Key constraints:**
- Binary verdict -- every report ends with exactly `VERDICT: PASS` or `VERDICT: FAIL`
- Check everything listed -- do not skip criteria even if earlier checks already failed
- Specific failure feedback -- list exactly which checks failed and why
- Never suggest fixes -- describe the problem only; the orchestrator decides what to do next
- Structurally incapable of modifying files (disallowedTools enforced by runtime)

---

## Why These Models?

| Agent | Model | Reasoning |
|-------|-------|-----------|
| Orchestrator | Opus | Complex reasoning: must parse ambiguous prompts, decompose tasks, track dependencies across stages, handle retry and refinement decisions. Needs the highest capability. |
| Builder | Sonnet | Well-specified tasks: the orchestrator has already done the hard reasoning. The builder follows a clear brief. Sonnet handles this reliably at ~1/5th the cost of Opus. |
| Validator | Haiku | Mechanical checks: read files, confirm named exports exist, confirm JSDoc is present, confirm function signatures match. Haiku is fast, cheap, and sufficient. Roughly 1/60th the cost of Opus per token. |

The cost structure matters at scale. In a 10-task orchestration, you get 10 builder calls and 10 validator calls. If all 20 used Opus, the cost would be ~12x higher than the Builder=Sonnet, Validator=Haiku configuration. For Stage 1's single-task loop, this difference is small. By Stage 8 with parallel execution, it becomes significant.

---

## Stage 4 Preview: Research Team

Stage 4 introduces a second agent team to prove the HOP pattern -- that the same orchestrator can run different agents for different domains.

### Research Builder

| Property | Value |
|----------|-------|
| Model | `claude-sonnet-4-5` |
| Role | Research and synthesis agent |
| Tools | Read, Glob, Grep, Write, Edit, Bash, WebSearch, WebFetch, TaskGet, TaskUpdate |
| Disallowed | (none) |

**Key additions vs. Builder:** WebSearch and WebFetch give the research builder access to external sources. The core implementation constraints (named exports, JSDoc, file boundaries) remain identical.

### Research Validator

| Property | Value |
|----------|-------|
| Model | `claude-haiku-4-5` |
| Role | Research output verification agent |
| Tools | Read, Glob, Grep, Bash, WebFetch, TaskGet, TaskUpdate |
| Disallowed | Write, Edit, NotebookEdit |

**Key additions vs. Validator:** Checks research-specific criteria -- completeness of coverage, citation quality, source recency -- in addition to the standard structural checks.

### The HOP Proof

Switching from the engineering team to the research team requires changing exactly two lines in the HOP Configuration block in SKILL.md:

```
BUILDER_AGENT:    research-builder    (was: builder)
VALIDATOR_AGENT:  research-validator  (was: validator)
```

The 5-step dispatch protocol is identical. Task creation is identical. Observability events are identical. Result reporting is identical. Only the agent names change.

This is the proof that the orchestrator is agent-agnostic -- it is a true Higher-Order Prompt. The fixed wrapper (the dispatch logic) is completely decoupled from the variable parameters (the agent identities).

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/builder-validator.md`](patterns/builder-validator.md) | Deep dive on the Builder/Validator separation -- structural enforcement, model rationale, community sources |
| [`docs/patterns/dispatch-loop.md`](patterns/dispatch-loop.md) | How the Orchestrator coordinates Builder and Validator -- the 5-step protocol |
| [`docs/patterns/higher-order-prompt.md`](patterns/higher-order-prompt.md) | Why BUILDER_AGENT and VALIDATOR_AGENT are variables, not hardcoded names |
| [`specs/master-plan.md`](../specs/master-plan.md) | Full stage roadmap and key design decisions |
| [`.claude/agents/builder.md`](../.claude/agents/builder.md) | Builder agent definition file |
| [`.claude/agents/validator.md`](../.claude/agents/validator.md) | Validator agent definition file |
