# Test Prompt: Research Team

**Stage:** 4
**Team:** research (via --team flag)
**Purpose:** Verify that --team research switches to the research agent team

## Prompt

```
/orchestrate "research the top 5 TypeScript testing frameworks, comparing features, community size, and performance" --team research
```

## Expected Behavior

1. **Team resolution:** `--team research` parsed and stripped from the prompt.
2. **team.resolved event:** `{ team: "research", builderAgent: "research-builder", validatorAgent: "research-validator" }`
3. **Clarifying questions:** Likely skipped (prompt is specific about scope, format, and comparison criteria).
4. **Fast path:** May or may not trigger depending on orchestrator assessment. A single research task could be fast-pathed; a decomposition into framework-specific sub-tasks would go full DAG.
5. **Builder dispatched:** `research-builder` agent (sonnet) -- with WebSearch and WebFetch tools.
6. **Validator dispatched:** `research-validator` agent (haiku) -- with WebFetch for source verification.
7. **Research-specific validation:** Coverage of 5 frameworks, citation quality, source recency.

## What This Tests

- --team flag parsing and stripping from the prompt
- Research team profile resolution
- research-builder dispatched instead of standard builder
- research-validator dispatched instead of standard validator
- WebSearch/WebFetch tools available to research agents
- Same 12-step protocol, different agents (HOP proof)

## Key Difference from Engineering

The only difference in the orchestration event stream is the agent names in `team.resolved` and `agent.dispatched` events. Everything else -- task creation, wave computation, spec file format, retry mechanics -- is identical.
