# Test Prompt: Simple JSDoc

**Stage:** 3 (Full Phase 1)
**Complexity:** Low -- single file, single function, trivially simple

---

## Prompt

```
add JSDoc to the greet function in src/hello.ts
```

---

## Expected Behavior

1. **Orchestrator** parses the prompt and immediately identifies it as fully specific: target file named (`src/hello.ts`), target function named (`greet`), change type clear (add JSDoc comments), scope bounded (one function, ~5 lines).

2. **Clarification is skipped.** The prompt is specific enough to proceed without questions. No information is missing that would change the decomposition.

3. **Fast path triggers.** The orchestrator evaluates the fast path criteria -- single change, 1 file, < 20 lines, no dependencies -- and all criteria are met. Fast path is engaged.

4. **Direct dispatch.** One builder is dispatched (no spec file, no wave structure, no plan presentation). The builder adds JSDoc to the function. One validator checks the result.

5. **No DAG overhead.** The full decomposition pipeline (Steps 4-9 of the 12-step protocol) is bypassed entirely. This is the Stage 1 dispatch loop preserved as an optimization for simple prompts.

---

## What to Look For

**Observability events (full sequence):**

```
orchestration.started
clarification.skipped    { orchestrationId, reason: "prompt specifies file and function" }
fast_path.evaluated      { orchestrationId, triggered: true, reason: "single task, 1 file, < 20 lines" }
  agent.dispatched       (builder -- sonnet, foreground)
  agent.completed
  agent.dispatched       (validator -- haiku, foreground)
  agent.completed
  verdict.received       { verdict: "PASS" }
orchestration.completed
```

**Events that confirm fast path is working:**

- `clarification.skipped` fires -- the prompt is specific, no questions needed
- `fast_path.evaluated { triggered: true }` fires -- fast path engaged
- Exactly ONE `agent.dispatched` for the builder
- Exactly ONE `agent.dispatched` for the validator
- No `decomposition.completed` event anywhere in the log
- No `spec.written` event -- no spec file is created
- No `wave.started` event -- no wave structure used
- No `plan.presented` event -- no plan review step
- No `tokens.estimated` event -- estimation only happens on the full DAG path

**What the builder should produce:**

- JSDoc comment block added above the `greet` function in `src/hello.ts`
- Existing function signature and implementation unchanged
- JSDoc includes `@param`, `@returns`, and a description

**What the validator should check:**

- JSDoc block is syntactically valid TypeScript
- `@param` and `@returns` tags are present
- Function signature was not modified
- No other files were changed

---

## What NOT to See

- Clarifying questions for a prompt that already names the file and function
- `fast_path.evaluated { triggered: false }` -- adding JSDoc to one function meets every fast path criterion
- `decomposition.completed` -- fast path bypasses decomposition entirely
- `spec.written` -- no spec file is created for fast path dispatch
- `wave.started` -- no wave structure for fast path dispatch
- More than two `agent.dispatched` events (one builder, one validator)
- The orchestrator treating "add JSDoc" as a multi-task project requiring a dependency graph

---

## Why This Prompt

This is verification case #2 from `specs/master-plan.md` Stage 3. It is the canonical test for the fast path gate.

The prompt is deliberately the simplest meaningful change possible: one function, one file, one type of edit, zero dependencies. If the orchestrator runs full DAG decomposition on this prompt, it is burning tokens and adding latency for no reason -- the fast path exists to prevent exactly this.

The contrast with `vague-auth.md` is intentional. "Add authentication" and "add JSDoc to greet in src/hello.ts" sit at opposite ends of the specificity spectrum. The orchestrator must treat them differently: ask questions for the first, skip straight to dispatch for the second. Testing both prompts back-to-back validates that the routing logic discriminates correctly.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 3 verification case #2 -- this prompt is the canonical fast path test |
| [`specs/stage-3-full-phase-1.md`](../../specs/stage-3-full-phase-1.md) | Stage 3 spec -- Scenario 2: Simple Prompt section |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Steps 2-3b: clarification skip, fast path gate, fast path dispatch |
| [`docs/patterns/fast-path-gate.md`](../../docs/patterns/fast-path-gate.md) | Pattern: complexity filter for direct dispatch bypass -- the mechanism this prompt exercises |
| [`prompts/stage-3/vague-auth.md`](vague-auth.md) | Counterpart test -- vague prompt where clarification fires and fast path does not |
