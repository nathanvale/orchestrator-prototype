---
slug: iterative-refinement
display_name: "Iterative Refinement"
one_liner: "A human-in-the-loop gate between plan generation and plan execution that lets users approve, modify, or cancel before any agent is dispatched."
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

iterative-refinement

## Quick Summary

Iterative Refinement is a human-in-the-loop gate between plan generation and plan execution. After the Orchestrator decomposes a user prompt into a task graph and writes a spec file, it stops and presents the plan for user review before dispatching any agents. The user can approve, modify, or cancel. No Builder is dispatched until the user has explicitly confirmed the plan. Combined with token estimation, this forms a two-part checkpoint: the user sees what will be done and approximately what it will cost, then agents run.

## When To Use

- Any multi-task orchestration where misunderstanding the scope could waste significant tokens
- When the decomposition step may produce a plan the user didn't intend
- When presenting the task graph before execution gives the user meaningful control over scope
- When token cost at scale warrants an informational estimate before dispatch

## Core Mechanism

The refinement loop runs across Steps 7 and 8 of the orchestration protocol.

**Step 7: Plan Refinement**

The Orchestrator presents the task graph from the spec file as a formatted table showing Task ID, Description, Dependencies, and Wave. Then asks: "Does this plan look right?"

The user has four options:

1. **Approve** -- plan is correct, proceed to Step 8
2. **Modify tasks** -- change task descriptions, split or merge tasks, adjust dependencies
3. **Add more detail** -- provide context the decomposition missed
4. **Cancel** -- halt orchestration entirely, emit `orchestration.cancelled`

If the user modifies or adds detail, the Orchestrator updates the spec file and re-presents the plan. The loop continues until the user approves or cancels. Emit `plan.approved` when the user confirms.

**Step 8: Token Estimation**

After plan approval, the Orchestrator presents a cost estimate:
- Base rate: approximately 4,500 tokens per task (builder + validator dispatches averaged across complexity)
- Formula: `N tasks x 4,500 tokens = ~Y total`

The estimate is informational -- no approval gate, no confirmation required. It is presented so the user has a mental model of scale before execution begins. After presenting the estimate, proceed immediately to task creation.

## Key Rules

1. No Builder is dispatched until the user approves the plan -- the refinement gate is mandatory.
2. Modifications during refinement must be written back to the spec file before agents run -- the spec file is the source of truth.
3. The token estimate is informational only -- do not add an approval gate after Step 7 already collected approval.
4. The refinement loop continues until explicit approval or explicit cancellation -- never proceed on ambiguous input.
5. Emit `plan.approved` when the user confirms and `orchestration.cancelled` when the user cancels.

## Implementation Notes

When the user modifies the plan, the Orchestrator updates the spec file and re-presents -- it does not discard and regenerate from scratch. The spec file must stay consistent with what the user approved. An in-memory plan that diverges from the spec file is a consistency bug that surfaces at wave boundaries when the spec is re-read.

The table format for presenting the task graph:

| Task ID | Description | Depends On | Wave |
|---------|-------------|------------|------|
| T1      | Define User types | -- | 1 |
| T2      | Implement GET /users | T1 | 2 |

The token estimate formula is approximate by design. The goal is a mental model of scale, not a precise budget. Present it as "~Y tokens" with the per-task assumption stated.

## Failure Modes

- **Proceeding without approval:** Dispatching agents before the user confirms the plan. The user discovers misunderstanding after tokens are spent.
- **Not writing modifications back to spec:** The Orchestrator updates an in-memory representation but not the spec file. Wave 2 re-reads the old spec and dispatches against the wrong plan.
- **Double approval gate:** Adding a confirmation step after the token estimate. The user already approved the plan in Step 7; a second gate is friction without benefit.
- **Loop without convergence:** The Orchestrator re-presents the plan after modifications without actually applying the changes. The user sees the same incorrect plan repeatedly.
- **Cancellation not emitted:** The orchestrator halts on cancellation but does not emit `orchestration.cancelled`. The observability dashboard shows an incomplete run with no explanation.

## Signals & Diagnostics

- **Pattern is needed:** Users report that agents ran on a misunderstood prompt; or significant tokens were spent on the wrong decomposition before the error was caught.
- **Pattern is working:** The plan presentation step occurs before any `agent.dispatched` event; `plan.approved` precedes the first Builder dispatch; modifications during refinement appear in the spec file on disk.
- **Pattern is failing:** `agent.dispatched` events appear without a preceding `plan.approved`; spec file content diverges from what the user confirmed; the loop repeats without applying stated modifications.

## Tradeoffs

**Gain:** Catches decomposition errors before any agent runs -- at near-zero cost. Users have explicit control over scope and can redirect the plan before tokens are committed. The token estimate gives users a cost frame before execution.

**Cost:** Adds a synchronous human interaction step between decomposition and execution. Fast-path prompts do not go through this gate (they bypass decomposition entirely). For users who trust the orchestrator's decomposition, this is friction.

## Related Patterns

- **Spec as Source of Truth** -- the spec file that gets presented and modified during refinement; modifications must be written back
- **Task DAG** -- the task graph structure that refinement presents to the user
- **Fast Path Gate** -- simple prompts bypass both decomposition and refinement entirely

## Source Anchors

Stage 3 (concept introduction and proof):
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L380-L460` -- plan presentation loop in Step 7, task graph table format, user approval/modify/cancel options
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L460-L490` -- token estimation in Step 8, plan.approved event emission
