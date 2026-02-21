# Fast-Path Gate Pattern

**Introduced in: Stage 3 (Full Phase 1)**

---

## What It Is

The Fast-Path Gate is a complexity filter inserted early in the orchestration protocol. It evaluates whether a user prompt is simple enough to skip the full DAG pipeline -- task decomposition, spec file generation, wave computation, and multi-task execution -- and instead go directly to a single Builder + Validator pair with no spec file and no waves.

```
User Prompt
    |
    v
[Parse + Clarify]
    |
    v
[Fast-Path Gate] -- ALL criteria met? --> YES --> Direct Dispatch (Step 3b)
    |                                                      |
    NO                                                     v
    |                                          [Builder] --> [Validator] --> Report
    v
[Full DAG Pipeline]
(Steps 4-9: decompose, spec, waves, dispatch)
```

The gate is a hard check, not a heuristic score. Every criterion must pass. If any single criterion fails, the full DAG pipeline runs. This binary structure avoids a category of bugs where "mostly simple" prompts skip the spec file and then fail silently because the orchestrator had no written plan to recover from.

---

## How We Use It Here

The gate is evaluated in Step 3 of [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md), after parsing (Step 1) and optional clarification (Step 2).

**Fast-Path Criteria (all must be true):**

1. Single, self-contained change -- the implementation fits entirely within one logical unit
2. Affects 1-2 files at most
3. Estimated implementation under 20 lines of code
4. No dependencies between sub-tasks -- there is only one task
5. No new modules, types, or interfaces that other code will consume

**Qualifying examples:**
- "Add JSDoc to the `greet` function in `src/greeting.ts`"
- "Rename variable `usr` to `user` in `src/auth.ts`"
- "Fix the typo 'recieve' in `README.md`"
- "Change the default timeout from 5000 to 3000 in `src/config.ts`"

**Disqualifying examples:**
- "Add a `greet` function and export it from the index" -- new export, other code may depend on it
- "Rename `User` to `Account` across the codebase" -- affects many files
- "Add error handling to the fetch wrapper" -- likely affects call sites, not just the function

**Step 3b (fast path execution):**

When the gate passes, the Orchestrator:
1. Emits `fast-path.taken` event
2. Creates ONE task via `TaskCreate` (same as Stage 1 Step 2)
3. Dispatches ONE Builder with `foreground: true`
4. Dispatches ONE Validator with `foreground: true`
5. Reports result -- no spec file written, no wave tracking, no retry protocol

The fast path does not support retry-with-resume. If the Validator returns `VERDICT: FAIL` on a fast-path task, the Orchestrator immediately presents the failure to the user and asks whether to retry (resetting to Step 3) or abort. The absence of a spec file means there is no retry state to track.

**Why the fast path is preserved as an optimization, not a separate mode:**

Stage 1's dispatch loop was inherently a fast path -- it handled exactly one task with one Builder and one Validator. Stage 3 extends the protocol to handle complex multi-task prompts, but simple prompts should not pay the overhead of that extension. The fast-path gate keeps Stage 1 behavior alive inside Stage 3, routing simple prompts to the minimal path and complex prompts to the full pipeline.

---

## Where It Comes From

**Short-circuit evaluation in programming:** Languages that evaluate `A && B` by skipping B when A is false apply the same principle -- check the cheap condition first, avoid unnecessary work. The fast-path gate checks cheap structural criteria (file count, line estimate) before committing to expensive operations (spec file generation, DAG computation).

**Fast-path optimizations in network stacks:** Network I/O stacks distinguish between the fast path (common case: small packets, no fragmentation, local delivery) and the slow path (fragmented packets, remote routing, error handling). The fast path is heavily optimized because it handles the majority of traffic. The same reasoning applies here: most user prompts during development are simple, targeted changes. The common case should be fast.

**"Simple mode" in CI/CD pipelines:** Some CI systems detect that a change only affects documentation or test files and skip the full build pipeline, running only the relevant subset. The fast-path gate applies the same logic: if the change is provably small and isolated, skip the planning overhead.

**Compiler optimization passes:** Compilers detect when full analysis is unnecessary -- constant folding, dead code elimination, inlining decisions all have fast paths for trivially simple cases. The orchestration pipeline is analogous: full DAG decomposition is the general case; direct dispatch is the optimized case for inputs that meet the simplicity criteria.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Step 3 gate evaluation and Step 3b fast-path dispatch |
| [`docs/patterns/task-dag.md`](task-dag.md) | The full DAG pipeline the gate bypasses, including Fast Path Rules section |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 3 description and where fast path fits in the overall protocol |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | Stage 1 dispatch loop that the fast path preserves as an optimization |
