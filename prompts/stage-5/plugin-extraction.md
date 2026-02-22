# Stage 5 Test Prompt: Plugin Extraction

This stage's SKILL.md is identical to Stage 4. The orchestrator runs exactly the same way. Use any Stage 4 prompt to verify the orchestrator still works.

## Engineering Team Prompts (unchanged from Stage 4)

```
/orchestrate "add a greet function to src/hello.ts that accepts a name and returns a greeting string"
```

Expected flow:
1. Orchestrator resolves team (engineering, default)
2. Decomposes into task(s)
3. Writes spec file to specs/
4. Dispatches builder (sonnet) -> builder writes the function
5. Dispatches validator (haiku) -> validator reports VERDICT: PASS
6. Orchestrator reports result

```
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"
```

Expected flow:
1. Orchestrator resolves team (engineering, default)
2. Decomposes into 3 tasks with dependency DAG
3. Presents plan, estimates token cost
4. Executes wave by wave
5. Reports enhanced summary

## Research Team Prompts (HOP proof -- unchanged from Stage 4)

```
/orchestrate "research the top 5 TypeScript testing frameworks and compare them" --team research
```

Expected flow:
1. Orchestrator resolves team (research) -> reads teams/research.md
2. Sets BUILDER_AGENT=research-builder, VALIDATOR_AGENT=research-validator
3. Decomposes into research tasks
4. Dispatches research-builder (WebSearch + WebFetch) -> produces markdown report
5. Dispatches research-validator (WebFetch) -> spot-checks citations
6. Orchestrator reports result

## What to Look For

The SKILL.md is unchanged. The orchestrator should behave identically to Stage 4. If anything changed, something went wrong -- use `git diff orchestration/4-hop..orchestration/5-plugin` to check.
