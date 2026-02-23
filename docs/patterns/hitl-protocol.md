# HITL Protocol Pattern

**Introduced in: Stage 7 (HITL Bounce-Back + Persistence)**

---

## What It Is

HITL (Human-In-The-Loop) bounce-back is a structured protocol for pausing automated agent execution and consulting the human when the orchestrator encounters a decision it cannot resolve autonomously. Rather than failing silently, retrying blindly, or producing incorrect output, the orchestrator detects specific trigger conditions in agent output, presents a bounded set of resolution options, and resumes execution only after the human decides.

Bounce-back is NOT the same as retry. Retry is automated -- the orchestrator retries a failed task up to 3 times without human involvement. Bounce-back fires when the task cannot proceed at all without a human decision: conflicting requirements, architectural choices, scope discoveries, external failures, or structural decomposition errors.

```
Builder completes
        |
        v
Orchestrator scans output for trigger phrases
        |
        +-- No trigger -> Validator dispatch (normal flow)
        |
        +-- Trigger detected
                |
                v
        Update task status: "bounced"
        Write hydration checkpoint
        Emit hitl.bounced
                |
                v
        Present bounded options to user (AskUserQuestion)
        Wait for response
                |
                v
        Emit hitl.resolved
        Apply resolution
                |
                +-- "Proceed with guidance": re-dispatch builder with enriched description
                +-- "Skip this task": cascade-skip dependents
                +-- "Restructure tasks": rewrite task graph
                +-- "Abort orchestration": terminal state
```

---

## How We Use It Here

### Six Trigger Types

The orchestrator recognizes six trigger types, each representing a distinct class of decision:

| Trigger | Source | Severity | Example |
|---------|--------|----------|---------|
| `conflicting-requirements` | Builder | Blocking | "conflicts with the existing functional pattern" |
| `architectural-decision` | Builder | Blocking | "could be implemented as either a class or a module" |
| `scope-discovery` | Builder | Blocking | "this also requires changes to src/middleware/" |
| `external-dependency` | Builder | Blocking | "package not installed: pg" |
| `decomposition-error` | Builder | Blocking | "cannot implement this in isolation -- depends on unreleased task" |
| `design-concern` | Validator | Advisory | VERDICT: PASS + "technical debt: this pattern may not scale" |

**Blocking triggers** stop the task before the validator runs. The user must decide before execution resumes.

**Advisory triggers** fire after a VERDICT: PASS. The task passed but a concern was raised. The user can accept the concern or choose to address it.

### Bounded Resolution Options

The orchestrator never presents an open-ended "what should I do?" question. Every bounce-back uses bounded options:

**Blocking bounce-back:**
1. Proceed with guidance
2. Skip this task
3. Restructure tasks _(not offered for `external-dependency`)_
4. Abort orchestration

**Advisory bounce-back:**
1. Proceed (accept the concern and continue)
2. Restructure tasks (address the concern now)
3. Abort orchestration

Bounded options reduce cognitive load (ADHD-friendly), prevent ambiguous free-text responses, and keep the orchestration state machine deterministic.

### Cascade Skip

When a task is skipped (option 2), all tasks that transitively depend on it are also skipped. The orchestrator computes the transitive closure of the dependency graph from the skipped task and marks every reachable task as `skipped`. The skips are listed in the orchestrator's output so the user can see what was dropped.

Example: if `add-user-module` is skipped, and `add-user-routes` depends on `add-user-module`, and `add-integration-tests` depends on `add-user-routes`, then all three are marked `skipped`.

### Restructure Tasks Protocol

When the user chooses "Restructure tasks":
1. The orchestrator presents the current task graph
2. The user describes the desired changes in free text
3. The orchestrator rewrites the task graph section of the spec file
4. The updated plan is presented for review (same as Step 7 Plan Refinement)
5. On user confirmation, execution resumes from the current wave with the new graph

The spec file is the single source of truth -- restructuring updates the spec, not just in-context state.

---

## Why Bounded Options Matter

**The failure mode without bounds:** An orchestrator that says "what should I do?" gets answers like "just make it work" or "do whatever you think is best" -- which are as ambiguous as the original problem. The orchestrator then guesses, often incorrectly.

**The bound solution:** Present 2-4 concrete options. The user makes a real decision with clear consequences. The orchestrator applies a deterministic resolution. No guessing.

**The cognitive load argument:** A developer interrupted mid-task by an orchestrator question does not want to think through all possible courses of action. They want to see "here is what happened, here are your options" -- scan it, pick one, and get back to work.

---

## Where It Comes From

**Temporal workflow signals:** Temporal supports "signals" -- external inputs that can unblock a paused workflow. The bounce-back protocol is the Claude Code equivalent: the user's resolution is the signal that unblocks the paused task.

**Bounded rationality:** The bounded options design follows the bounded rationality principle -- people make better decisions when choices are constrained to a manageable set. Hick's Law: decision time increases logarithmically with the number of options. Keep it to 2-4.

**LLM agent interruption patterns:** Community patterns for long-running LLM agents consistently recommend checkpointing before any blocking operation and surfacing interruptions to the user with specific context -- not a generic "something went wrong" message. The trigger type + context excerpt + bounded options structure implements this directly.

---

## Source Anchors

Stage 7 proof:
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md` -- Step 10: bounce-back detection blocks (both builder and validator scans)
- `orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md` -- Full trigger catalog and resolution matrix

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/hydration-pattern.md`](hydration-pattern.md) | Persistence layer that makes bounce-back resumable |
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | Foundation: spec file as shared state |
| [`docs/patterns/retry-with-resume.md`](retry-with-resume.md) | Automated retry (distinct from bounce-back) |
| [`.claude/skills/orchestrator/references/hitl-protocol.md`](../../.claude/skills/orchestrator/references/hitl-protocol.md) | Trigger catalog, resolution matrix, resume protocol details |
