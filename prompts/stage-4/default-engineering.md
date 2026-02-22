# Stage 4 Test: Default Engineering Team

## What This Tests

That the engineering team is used by default when no `--team` flag is present, and that team resolution still occurs and is emitted correctly even for the default case.

## Test Prompt

```
/orchestrate "add a multiply function to src/hello.ts that takes two numbers and returns their product, with JSDoc and a test in tests/hello.test.ts"
```

## Expected Behavior

1. **Step 1:** No `--team` flag detected. Orchestrator defaults TEAM to `engineering`, reads `.claude/skills/orchestrator/teams/engineering.md`, sets `BUILDER_AGENT=builder` and `VALIDATOR_AGENT=validator`
2. **team.resolved event:** `{ team: "engineering", builderAgent: "builder", validatorAgent: "validator" }`
3. **Fast path gate:** Might be fast path (2 files, < 20 lines) OR full DAG if the orchestrator decides the test file adds enough complexity. Either path is acceptable.
4. **Builder dispatch:** Standard `builder` agent is used
5. **Validator dispatch:** Standard `validator` agent is used
6. **Final report:** Team shown as `engineering`

## Pass Criteria

- [ ] `team.resolved` event emitted with `team: "engineering"` (even though it's the default)
- [ ] `BUILDER_AGENT` resolves to `builder` (from team profile, not hardcoded)
- [ ] `VALIDATOR_AGENT` resolves to `validator` (from team profile, not hardcoded)
- [ ] `src/hello.ts` is updated with `multiply` function and JSDoc
- [ ] `tests/hello.test.ts` is updated with a test for `multiply`
- [ ] Final report mentions engineering team

## Fail Signals

- No `team.resolved` event (the default team must still go through team resolution)
- Team identity missing from final report
- Agent names appear without being sourced from the profile
