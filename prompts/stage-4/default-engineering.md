# Test Prompt: Default Engineering Team

**Stage:** 4
**Team:** engineering (default)
**Purpose:** Verify that the default engineering team works identically to Stage 3 behavior

## Prompt

```
/orchestrate "add a multiply function in src/math.ts that exports a multiply(a: number, b: number): number function with JSDoc"
```

## Expected Behavior

1. **Team resolution:** No `--team` flag present. Orchestrator defaults to `engineering` team profile.
2. **team.resolved event:** `{ team: "engineering", builderAgent: "builder", validatorAgent: "validator" }`
3. **Fast path:** Should trigger (single file, < 20 lines, no dependencies).
4. **Builder dispatched:** `builder` agent (sonnet) -- standard code implementation.
5. **Validator dispatched:** `validator` agent (haiku) -- standard structural verification.
6. **Verdict:** PASS (straightforward implementation).

## What This Tests

- Default team resolution when no --team flag is specified
- Backward compatibility with Stage 3 behavior
- team.resolved event fires even for the default team
- Engineering team agents are dispatched correctly
