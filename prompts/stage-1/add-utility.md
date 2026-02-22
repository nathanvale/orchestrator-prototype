# Test Prompt: String Utilities

**Stage:** 1 (Minimum Viable Dispatch)
**Complexity:** Low-medium -- single file, three functions, specific signatures required

---

## Prompt

```
add a string utility module in src/utils/string-utils.ts with capitalize, slugify, and truncate functions
```

---

## Expected Behavior

1. **Orchestrator** parses the prompt: intent is to create `src/utils/string-utils.ts` with three exported functions -- `capitalize`, `slugify`, and `truncate`. Creates 1 task with the full specification including file path, all three function names, named export requirement, JSDoc requirement for each, and acceptance criteria per function.

2. **Builder** is dispatched. It checks if `src/utils/string-utils.ts` exists (idempotency check), creates the `src/utils/` directory if needed, then creates the file with all three functions as named exports with JSDoc.

3. **Validator** is dispatched. It reads `src/utils/string-utils.ts` and checks each function against the acceptance criteria. Concludes with `VERDICT: PASS` or `VERDICT: FAIL`.

4. **Orchestrator** reports the verdict to the user.

---

## What to Look For

When the builder creates `src/utils/string-utils.ts`, verify:

- **All three functions exported** -- `capitalize`, `slugify`, `truncate` are all present as named exports
- **Named exports only** -- none use `export default`
- **JSDoc on each** -- all three functions have JSDoc comments explaining parameters and return value
- **Correct file path** -- file is at exactly `src/utils/string-utils.ts` (kebab-case, correct directory)
- **No extra exports** -- builder should not add functions beyond the three specified

When the validator reports, verify:

- All three functions are checked individually (not as a group)
- The report uses `[PASS]` or `[FAIL]` per check
- If any function is missing, the validator reports `[FAIL]` for that specific function's check
- The report ends with exactly `VERDICT: PASS` or `VERDICT: FAIL`

---

## Function Expectations

The prompt is intentionally underspecified on signatures -- this tests whether the orchestrator produces a task description complete enough for the builder to make reasonable implementation choices.

Expected signatures (reasonable defaults):

```typescript
/** Capitalizes the first letter of a string. */
export function capitalize(str: string): string

/** Converts a string to a URL-safe slug (lowercase, hyphens instead of spaces). */
export function slugify(str: string): string

/** Truncates a string to a maximum length, appending an ellipsis if truncated. */
export function truncate(str: string, maxLength: number): string
```

The validator should check that functions exist and are exported -- not that they implement a specific algorithm. Implementation details are the builder's responsibility.

---

## Why This Prompt

This prompt adds a small amount of complexity over `hello-world.md`: a new directory (`src/utils/`), three functions instead of one, and underspecified signatures that the orchestrator must interpret. It tests:

- Whether the orchestrator's task description is complete enough for three functions
- Whether the builder handles directory creation correctly
- Whether the validator checks all three functions independently

If `hello-world.md` passes but this fails, the issue is likely in how the orchestrator specifies multi-function tasks -- not in the dispatch loop itself.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/dispatch-loop.md`](../../docs/patterns/dispatch-loop.md) | The 5-step protocol being exercised here |
| [`docs/patterns/builder-validator.md`](../../docs/patterns/builder-validator.md) | Builder and Validator roles and constraints |
| [`prompts/stage-1/hello-world.md`](hello-world.md) | Simpler starting point -- single file, single function |
