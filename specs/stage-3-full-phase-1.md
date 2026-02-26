# Stage 3: Full Phase 1

## Task Description

Stage 3 completes the Phase 1 feature set by adding six capabilities to the orchestrator: retry with resume, clarifying questions, fast path gate, iterative plan refinement, token cost estimation, and enhanced summary reporting. Stage 3 transforms the orchestrator from "can coordinate a plan" to "can handle real-world ambiguity, failure, and user interaction."

**Reference:** [Master Plan - Stage 3](./master-plan.md#stage-3-full-phase-1)

---

## Objective

When complete, the orchestrator handles four distinct scenarios:

1. **Vague prompt** (`/orchestrate "add authentication"`) -- asks clarifying questions before decomposing
2. **Simple prompt** (`/orchestrate "add JSDoc to greet function"`) -- fast path: skips DAG, dispatches directly
3. **Failed validation** -- retries the builder up to 3x with `resume: agentId`, then asks user
4. **Full multi-task flow** -- decomposes, shows plan for refinement, estimates tokens, executes waves, reports summary

---

## Problem Statement

Stage 2 processes all prompts identically (full DAG decomposition), stops on first failure (no retry), and never interacts with the user mid-flow. Real-world prompts are vague, some are trivially simple, and builders sometimes produce imperfect output. Stage 3 adds the human-in-the-loop interactions and error recovery that make the orchestrator usable beyond curated test prompts.

---

## Solution Approach

Insert new protocol steps into the existing 8-step SKILL.md dispatch protocol:

- **Clarifying questions** after Step 1 (Parse) -- detect ambiguity, ask user via AskUserQuestion, re-parse with answers
- **Fast path gate** after clarifying questions -- detect trivial prompts, skip to direct dispatch
- **Plan refinement** after Step 4 (Write Spec) -- show plan to user, accept edits via AskUserQuestion
- **Token estimation** after plan refinement -- estimate cost, present to user (informational only)
- **Retry with resume** in Step 6 (Execute Waves) -- on FAIL, retry 3x using `resume: agentId` before asking user
- **Enhanced summary** in Step 8 (Report) -- richer output with retry stats, cost actuals, fast path indicator

The result is a 12-step protocol (expanded from Stage 2's 8 steps). Fast path dispatch (Step 3b) is a short-circuit that preserves the Stage 1 single-task loop as an optimization for trivially simple prompts.

### New Observability Events

| Event | When | Payload |
|-------|------|---------|
| `clarification.started` | Step 2 begins | `{ orchestrationId }` |
| `clarification.completed` | User answered questions | `{ orchestrationId, questionsAsked: N }` |
| `clarification.skipped` | Prompt was specific enough | `{ orchestrationId, reason }` |
| `fast_path.evaluated` | Step 3 completes | `{ orchestrationId, triggered: bool, reason }` |
| `plan.presented` | Step 7 begins | `{ orchestrationId, taskCount, waveCount }` |
| `plan.approved` | User approves plan | `{ orchestrationId }` |
| `plan.modified` | User requests changes | `{ orchestrationId, modifications }` |
| `orchestration.cancelled` | User cancels | `{ orchestrationId, reason }` |
| `tokens.estimated` | Step 8 completes | `{ orchestrationId, estimatedTokens, breakdown }` |
| `retry.started` | Retry attempt begins | `{ orchestrationId, taskId, attempt, maxAttempts }` |
| `retry.succeeded` | Retry attempt passes | `{ orchestrationId, taskId, attempt }` |
| `retry.exhausted` | 3 retries all failed | `{ orchestrationId, taskId }` |

---

## Files Created / Modified

Each numbered group maps to one commit in the branch history.

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `.claude/skills/orchestrator/SKILL.md` | Modified | Full skill rewrite -- 8 steps extended to 12 steps with all Stage 3 capabilities |
| 1 | `.claude/skills/orchestrator/references/dag-execution.md` | Modified | Add retry protocol, fast path rules, clarifying question heuristics, token estimation model |
| 1 | `.claude/CLAUDE.md` | Modified | Update project description to reflect Stage 3 capabilities |
| 2 | `docs/patterns/retry-with-resume.md` | Created | Pattern doc: retry on FAIL using `resume: agentId` to preserve builder context |
| 2 | `docs/patterns/fast-path-gate.md` | Created | Pattern doc: complexity filter routing simple prompts to direct dispatch |
| 2 | `docs/patterns/iterative-refinement.md` | Created | Pattern doc: plan review loop -- present, modify, approve before executing |
| 3 | `specs/stage-3-full-phase-1.md` | Created | This file -- stage spec |
| 3 | `prompts/stage-3/vague-auth.md` | Created | Test prompt: vague scope triggers clarifying questions |
| 3 | `prompts/stage-3/simple-jsdoc.md` | Created | Test prompt: specific single-file task triggers fast path |
| 3 | `prompts/stage-3/multi-task-retry.md` | Created | Test prompt: vague acceptance criteria trigger retry protocol |
| 4 | `specs/master-plan.md` | Modified | Mark Stage 3 complete, update file tables |

---

## Verification

### Scenario 1: Vague Prompt -- Clarifying Questions

**Prompt:** `add authentication`

**Expected behavior:**

1. Orchestrator detects ambiguity: no files specified, no auth strategy named, vague scope
2. Emits `clarification.started`
3. Asks 2-4 specific questions via AskUserQuestion (auth strategy: JWT/sessions/OAuth?, target files?, session handling?)
4. User answers; orchestrator re-parses with enriched context
5. Emits `clarification.completed { questionsAsked: N }`
6. Continues to decomposition with the enriched prompt

**Should NOT see:** Orchestrator proceeding without questions; generic "can you tell me more?" questions; `clarification.skipped`

---

### Scenario 2: Simple Prompt -- Fast Path

**Prompt:** `add JSDoc to the greet function in src/hello.ts`

**Expected behavior:**

1. Orchestrator parses -- specific file, specific function, clear scope
2. Emits `clarification.skipped` (prompt is not ambiguous)
3. Evaluates fast path criteria: single task, 1 file, < 20 lines, no dependencies -- all met
4. Emits `fast_path.evaluated { triggered: true, reason: "single task, 1 file, < 20 lines" }`
5. Dispatches one builder + one validator directly (no spec file, no waves, no plan refinement)

**Should NOT see:** Clarifying questions; `decomposition.completed`; `spec.written`; `wave.started`; more than two `agent.dispatched` events

---

### Scenario 3: Failed Validation -- Retry Protocol

**Prompt:** Multi-task prompt where one task has acceptance criteria vague enough to trigger FAIL

**Expected behavior:**

1. Full DAG decomposition runs normally
2. During wave execution, validator returns `VERDICT: FAIL` for a task
3. Orchestrator emits `retry.started { attempt: 1, maxAttempts: 3 }`
4. Builder re-dispatched using `resume: agentId` with validator feedback in the prompt
5. Validator re-evaluated (fresh, no resume)
6. On PASS: emits `retry.succeeded`; on continued FAIL: increments attempt, loops
7. After 3 failed attempts: emits `retry.exhausted`, asks user via AskUserQuestion

**Should NOT see:** Immediate stop on first FAIL (Stage 2 behavior); retry without `resume`; retry without passing validator feedback to the builder

---

### Scenario 4: Full Multi-Task Flow

**Prompt:** A 4-5 task orchestration with clear dependencies

**Expected behavior:**

1. Clarifying questions may or may not trigger (depends on prompt specificity)
2. Fast path does NOT trigger (multi-task)
3. Full decomposition, spec written, plan presented to user
4. Token estimate shown
5. Waves execute; retry protocol available if needed
6. Enhanced summary report with retry stats, token actuals, duration

---

## What to Look For

### Clarifying Questions (Scenario 1)

```
orchestration.started
clarification.started
  (AskUserQuestion called with 2-4 specific options)
clarification.completed  { questionsAsked: 2 }
decomposition.completed  { taskCount: N, waveCount: N }
spec.written             { specPath: "specs/..." }
...
```

Key signal: the enriched prompt fed into decomposition should reflect the user's answers (e.g., if user said "JWT", decomposition tasks should reference JWT explicitly).

### Fast Path (Scenario 2)

```
orchestration.started
clarification.skipped    { reason: "prompt specifies file and function" }
fast_path.evaluated      { triggered: true, reason: "single task, 1 file, < 20 lines" }
  agent.dispatched       (builder)
  agent.completed
  agent.dispatched       (validator)
  agent.completed
  verdict.received       { verdict: "PASS" }
orchestration.completed
```

Key signal: no `decomposition.completed`, no `spec.written`, no `wave.started` -- the full DAG overhead is bypassed entirely.

### Retry Protocol (Scenario 3)

```
...
wave.started             { waveNumber: N }
  agent.dispatched       (builder, attempt 1)
  agent.completed
  agent.dispatched       (validator)
  agent.completed
  verdict.received       { verdict: "FAIL" }
  retry.started          { taskId: "...", attempt: 1, maxAttempts: 3 }
  agent.dispatched       (builder, resumed -- same agentId)
  agent.completed
  agent.dispatched       (validator, fresh)
  agent.completed
  verdict.received       { verdict: "PASS" }
  retry.succeeded        { taskId: "...", attempt: 1 }
wave.completed
...
```

Or if all retries fail:
```
  retry.exhausted        { taskId: "..." }
  (AskUserQuestion: "skip / provide guidance / abort")
```

Key signals: builder uses `resume: agentId` on retry (not a fresh dispatch); validator always fresh; validator feedback is present in the retry builder prompt.

### Plan Refinement + Token Estimation (Scenario 4)

```
spec.written             { specPath: "..." }
plan.presented           { taskCount: N, waveCount: N }
  (AskUserQuestion: "Approve / Modify tasks / Add more detail / Cancel")
plan.approved            { orchestrationId }
tokens.estimated         { estimatedTokens: N, breakdown: {...} }
task.created             (x N tasks)
spec.reread              { waveNumber: 1 }
wave.started             ...
```

Key signal: user is shown the plan before any agents are dispatched. `plan.presented` fires after `spec.written` and before any `task.created`.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`specs/master-plan.md`](./master-plan.md) | Stage 3 section, verification cases, branch strategy |
| [`specs/stage-2-multi-task-dag.md`](./stage-2-multi-task-dag.md) | Stage 2 spec -- the foundation Stage 3 extends |
| [`.claude/skills/orchestrator/SKILL.md`](../.claude/skills/orchestrator/SKILL.md) | The 12-step protocol this stage defines |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../.claude/skills/orchestrator/references/dag-execution.md) | DAG reference, updated with retry protocol and fast path rules |
| [`docs/patterns/retry-with-resume.md`](../docs/patterns/retry-with-resume.md) | Pattern: retry on FAIL using resume for context preservation |
| [`docs/patterns/fast-path-gate.md`](../docs/patterns/fast-path-gate.md) | Pattern: complexity filter for direct dispatch bypass |
| [`docs/patterns/iterative-refinement.md`](../docs/patterns/iterative-refinement.md) | Pattern: plan review loop before execution |
| [`prompts/stage-3/vague-auth.md`](../prompts/stage-3/vague-auth.md) | Test prompt: verification case #1 (clarifying questions) |
| [`prompts/stage-3/simple-jsdoc.md`](../prompts/stage-3/simple-jsdoc.md) | Test prompt: verification case #2 (fast path) |
| [`prompts/stage-3/multi-task-retry.md`](../prompts/stage-3/multi-task-retry.md) | Test prompt: verification case #3 (retry protocol) |
