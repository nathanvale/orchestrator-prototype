# Test Prompt: Hello World

**Stage:** 1 (Minimum Viable Dispatch)
**Complexity:** Minimal -- single file, single function, no dependencies

---

## Prompt

```
add a hello world function in src/hello.ts that exports a greet function
```

---

## Expected Behavior

1. **Orchestrator** parses the prompt: intent is to create `src/hello.ts` with an exported `greet` function. Creates 1 task with the full specification including file path, function signature, named export requirement, and JSDoc requirement.

2. **Builder** is dispatched. It reads `src/hello.ts` if it exists (idempotency check), then creates the file with a `greet` function that accepts a `name: string` parameter and returns a greeting string.

3. **Validator** is dispatched. It reads `src/hello.ts` and checks each acceptance criterion, reporting pass or fail per check. Concludes with `VERDICT: PASS` or `VERDICT: FAIL`.

4. **Orchestrator** reports the verdict to the user. If PASS: confirms what was built and where. If FAIL: lists the specific checks that failed from the Validator's report.

---

## What to Look For

When the builder creates `src/hello.ts`, verify:

- **Named export** -- `export function greet(...)` not `export default function greet(...)`
- **JSDoc** -- the `greet` function has a JSDoc comment explaining what it does
- **Correct signature** -- `greet(name: string): string` (takes a name, returns a greeting)
- **File location** -- file is at exactly `src/hello.ts`, not `src/Hello.ts` or `hello.ts`

When the validator reports, verify:

- The Validator checked all criteria (it should not skip any)
- The report uses `[PASS]` or `[FAIL]` per check
- The report ends with exactly `VERDICT: PASS` or `VERDICT: FAIL`
- If FAIL, the failing checks have specific reasons, not vague descriptions

---

## Why This Prompt

This is the simplest possible orchestration: one file, one function, one task, no dependencies. It isolates the core dispatch loop from all other complexity. If this works, Stage 1 works.

It is also the example prompt used in the Stage 1 verification in [`specs/master-plan.md`](../../specs/master-plan.md).

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/dispatch-loop.md`](../../docs/patterns/dispatch-loop.md) | The 5-step protocol being exercised here |
| [`docs/patterns/builder-validator.md`](../../docs/patterns/builder-validator.md) | Builder and Validator roles and constraints |
| [`prompts/stage-1/add-utility.md`](add-utility.md) | Next test prompt -- slightly more complex, tests 3 functions |
