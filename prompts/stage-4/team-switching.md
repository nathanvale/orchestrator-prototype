# Stage 4 Test: Team Switching via --team Flag

## What This Tests

That the `--team` flag correctly selects a team profile, resolves agent identities, and threads those identities through the full orchestration run -- including events, spec file, plan presentation, and final report.

## Test Prompt

```
/orchestrate "research the top 3 TypeScript build tools (Bun, esbuild, tsc) and compare their performance, ecosystem support, and DX" --team research
```

## Expected Behavior

1. **Step 1:** Orchestrator detects `--team research`, reads `.claude/skills/orchestrator/teams/research.md`, sets `BUILDER_AGENT=research-builder` and `VALIDATOR_AGENT=research-validator`
2. **team.resolved event:** `{ team: "research", builderAgent: "research-builder", validatorAgent: "research-validator" }`
3. **Clarifying questions:** Prompt is specific enough -- should skip (topic, scope, and comparison dimensions are clear)
4. **Fast path gate:** NOT triggered -- this requires multi-source research and synthesis across 3 tools
5. **Plan presentation:** Table shows task graph AND team identity: `Team: research | Builder: research-builder | Validator: research-validator`
6. **Builder dispatch:** `research-builder` agent is used (not `builder`)
7. **Validator dispatch:** `research-validator` agent is used (not `validator`)
8. **Final report:** Includes `Team: research` and notes research-builder/research-validator agents used

## Pass Criteria

- [ ] `team.resolved` event emitted before `orchestration.started`
- [ ] Plan presentation shows team identity
- [ ] `agent.dispatched` events show `agentType: "research-builder"` for builder role
- [ ] `agent.dispatched` events show `agentType: "research-validator"` for validator role
- [ ] Final report includes team name and agent names
- [ ] Research output file is written (not code -- a markdown report)

## Fail Signals

- `agentType: "builder"` appearing in events instead of `agentType: "research-builder"`
- No `team.resolved` event emitted
- Team identity missing from plan presentation or final report
- Code files written instead of research report files
