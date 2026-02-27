---
slug: dispatch-loop
display_name: "Dispatch Loop"
one_liner: "A central coordinator agent sequences task creation, Builder dispatch, and Validator dispatch without writing code itself."
intel_date: null
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---

## Pattern ID

dispatch-loop

## Quick Summary

The Dispatch Loop is the core orchestration cycle: one coordinator agent (the Orchestrator) receives a user prompt, creates a task, dispatches a Builder, dispatches a Validator, and reports the result. The coordinator never writes code. This "leader never codes" constraint is what makes the pattern extensible -- agent identity becomes a parameter rather than a dependency, enabling agent swapping in later stages without touching the dispatch logic.

## When To Use

- Any multi-agent workflow where a coordinator must sequence worker agents
- When you need to separate orchestration logic from implementation capability
- As the minimal viable unit for introducing independent verification into an agent pipeline
- When future agent swapping or parallel execution is anticipated -- the coordinator should not carry implementation coupling

## Core Mechanism

The Orchestrator follows a 5-step protocol:

1. **Parse** -- read the user prompt, identify intent, target files, acceptance criteria. Emit `orchestration.started`.
2. **Create task** -- create exactly one task via `TaskCreate`. The task description is the complete contract. Emit `task.created`.
3. **Dispatch Builder** -- use `foreground: true`. Emit `agent.dispatched` before, `agent.completed` after. Wait for completion before proceeding.
4. **Dispatch Validator** -- use `foreground: true`. Emit `agent.dispatched` before, `agent.completed` after. Wait for completion.
5. **Report result** -- parse the Validator's TaskUpdate for `VERDICT: PASS` or `VERDICT: FAIL`. Emit `verdict.received`, then `orchestration.completed`.

Both agents are dispatched with `foreground: true` -- a hard requirement. Background agents cannot call MCP tools (TaskGet, TaskUpdate, Read, Write, Bash), which both Builder and Validator require.

## Key Rules

1. The Orchestrator never writes code or modifies source files -- it only dispatches.
2. Both agents are dispatched `foreground: true`; background dispatch is not permitted in the base loop.
3. The task description written in Step 2 must be complete and self-contained -- the Builder should need no other context.
4. The Orchestrator waits for the Builder to complete before dispatching the Validator.
5. The Orchestrator waits for the Validator to complete before reporting results.
6. The Validator is always dispatched fresh -- no resume from a previous Validator dispatch.

## Implementation Notes

The 5-step protocol is defined in `.claude/skills/orchestrator/SKILL.md`. Steps reference `$BUILDER_AGENT` and `$VALIDATOR_AGENT` as variables set in the HOP Configuration block -- not hardcoded agent names.

Foreground dispatch is mandatory because MCP tool access is not available to background agents. Stage 8 introduces worktree isolation to enable parallelism within waves, but the base dispatch loop remains sequential.

Task creation precedes all agent dispatches. The task is the contract; the Orchestrator, Builder, and Validator all operate against the same task record.

Observability events (`orchestration.started`, `task.created`, `agent.dispatched`, `verdict.received`, etc.) are emitted at each step -- they form the audit trail that makes orchestration debuggable.

## Failure Modes

- **Orchestrator writes code:** The coordinator starts implementing instead of dispatching. Breaks agent-swapping extensibility and couples orchestration logic to implementation.
- **Background dispatch:** Dispatching agents with `foreground: false` silently breaks tool access. The Builder cannot write files; the Validator cannot update tasks.
- **Incomplete task description:** The task omits file paths, signatures, or acceptance criteria. The Builder must guess; the Validator checks against a contract never stated.
- **Racing dispatch:** Dispatching the Validator before the Builder completes. The Validator finds no implementation to check.
- **Skipping observability events:** Makes orchestration failures invisible with no audit trail.

## Signals & Diagnostics

- **Pattern is needed:** An agent is doing both implementation and verification, or the same agent dispatches and implements.
- **Pattern is working:** Observability events fire in order; the Validator always receives a completed Builder artifact; results are parseable binary verdicts.
- **Pattern is failing:** Validator returns before Builder completes; tool calls fail silently inside dispatched agents; task descriptions are incomplete causing repeated Validator failures.

## Tradeoffs

**Gain:** Clear separation between orchestration and implementation. The coordinator can be reasoned about independently of what agents do. Agent identities are swappable without changing dispatch logic. Sequential foreground execution guarantees the Validator always sees a complete Builder output.

**Cost:** Sequential foreground dispatch means no within-loop parallelism. Each task requires two full agent dispatches. Foreground constraint limits scalability until worktree isolation is introduced in a later stage.

## Related Patterns

- **Builder/Validator** -- the two agents dispatched by the loop; their roles and tool sets are defined there
- **Higher-Order Prompt** -- BUILDER_AGENT and VALIDATOR_AGENT are variables; the loop is the fixed wrapper
- **Wave Computation** -- extends the dispatch loop to execute multiple tasks in dependency order
- **Retry with Resume** -- wraps the dispatch loop with retry logic when VERDICT: FAIL is received

## Source Anchors

Stage 1 (concept introduction):
- `orchestration/1-dispatch:.claude/skills/orchestrator/SKILL.md:L1-L80` -- 5-step dispatch protocol, foreground dispatch, observability events

Stage 3 (full proof):
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L1-L120` -- dispatch loop with retry, clarifying questions, fast path integrated
