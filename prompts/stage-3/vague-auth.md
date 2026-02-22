# Test Prompt: Vague Auth

**Stage:** 3 (Full Phase 1)
**Complexity:** Medium -- vague scope requires clarification before decomposition

---

## Prompt

```
add authentication
```

---

## Expected Behavior

1. **Orchestrator** detects ambiguity immediately after parsing: no target files specified, no auth strategy named (JWT? sessions? OAuth?), no session handling preference given, scope is maximally vague.

2. **Clarifying questions** are asked via AskUserQuestion before any decomposition begins. The questions should be specific and actionable -- not generic. Examples of what good questions look like:
   - "Which authentication strategy? JWT tokens, session cookies, or OAuth provider?"
   - "Which files or routes should be protected?"
   - "Should sessions persist server-side, or is stateless (JWT) preferred?"

3. **User provides answers** (e.g., "JWT, protect the /api routes, stateless"). The orchestrator re-parses the original prompt enriched with this context.

4. **Decomposition proceeds** with the enriched prompt. Task descriptions and acceptance criteria should reference JWT specifically -- the clarification answers must be reflected in the decomposition output.

5. **Execution continues normally** from this point: spec written, plan presented, waves executed.

---

## What to Look For

**Clarification events:**

```
orchestration.started
clarification.started    { orchestrationId }
  (AskUserQuestion called -- 2-3 specific options or questions)
clarification.completed  { orchestrationId, questionsAsked: 2 }
```

**Enriched decomposition:**

```
decomposition.completed  { taskCount: N, waveCount: N }
spec.written             { specPath: "specs/authentication.md" }
```

- The spec file task descriptions should reference the specific auth strategy chosen (e.g., JWT), not the original vague "add authentication"
- Task IDs should be specific: `implement-jwt-middleware`, `protect-api-routes`, not `task-1`, `task-2`

**AskUserQuestion call quality:**

- The tool should be called with 2-4 focused options, not a single open-ended "tell me more"
- Each question maps to a real decomposition decision (strategy affects which libraries to use; target files affect which tasks exist; session handling affects spec criteria)

**Fast path evaluation:**

```
fast_path.evaluated      { triggered: false, reason: "authentication is multi-task, not trivially simple" }
```

Authentication is inherently multi-step -- middleware, route protection, token handling, tests -- so fast path must NOT trigger even after clarification narrows the scope.

---

## What NOT to See

- Orchestrator proceeding to decomposition without asking any questions
- `clarification.skipped` -- "add authentication" IS vague; skipping clarification would be incorrect behavior
- Generic questions like "Can you tell me more about what you want?" -- questions must map to concrete decomposition decisions
- `fast_path.evaluated { triggered: true }` -- authentication is always multi-task
- Task descriptions in the spec that still say "add authentication" without incorporating the user's answers

---

## Why This Prompt

This is verification case #1 from `specs/master-plan.md` Stage 3. It is the canonical test for the clarifying questions capability.

"Add authentication" is deliberately the most ambiguous possible prompt for a meaningful feature. It has no files, no strategy, no scope, and at least three valid interpretations (JWT, sessions, OAuth). A well-functioning orchestrator must detect this ambiguity and resolve it before spending tokens on a decomposition that might produce entirely wrong tasks.

The test validates two things together: (1) ambiguity detection fires on the right signals, and (2) the user's answers are actually incorporated -- not just acknowledged and ignored.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 3 verification case #1 -- this prompt is the canonical clarifying questions test |
| [`specs/stage-3-full-phase-1.md`](../../specs/stage-3-full-phase-1.md) | Stage 3 spec -- Scenario 1: Vague Prompt section |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Step 2: Clarifying Questions -- the protocol step this prompt exercises |
| [`docs/patterns/iterative-refinement.md`](../../docs/patterns/iterative-refinement.md) | Pattern: clarifying questions and plan review as a class of HITL interactions |
| [`prompts/stage-3/simple-jsdoc.md`](simple-jsdoc.md) | Counterpart test -- specific prompt where clarification should be skipped |
