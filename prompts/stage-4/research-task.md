# Stage 4 Test: Research Team End-to-End

## What This Tests

That the research team produces a valid structured research report, with real citations that the research-validator can spot-check. This is the HOP proof: the same orchestration protocol runs, but with completely different agent behavior -- web research instead of code implementation.

## Test Prompt

```
/orchestrate "research the current state of Bun as a Node.js replacement: adoption rate, ecosystem compatibility, known limitations, and community sentiment as of 2025" --team research
```

## Expected Behavior

1. **Team resolution:** `research-builder` and `research-validator` resolved from research profile
2. **Clarifying questions:** Topic and scope are specific -- should skip
3. **Fast path:** NOT triggered (multi-source research requiring synthesis)
4. **Decomposition:** Likely 3-4 tasks:
   - Research adoption and production usage
   - Research ecosystem compatibility and known limitations
   - Research community sentiment
   - Synthesize into final report
5. **Research builder behavior:** Uses WebSearch to find sources, WebFetch to read them, writes a structured markdown report
6. **Research validator behavior:** Reads the report, uses WebFetch to spot-check 2+ URLs, verifies coverage of all research questions
7. **Output:** A markdown file in `specs/research/` or `docs/research/` with findings, comparison, and sources

## Pass Criteria

- [ ] Research report file is written (markdown, not code)
- [ ] Report contains a Sources section with real URLs
- [ ] Report addresses all four research dimensions (adoption, compatibility, limitations, sentiment)
- [ ] Research validator spot-checks at least 2 URLs via WebFetch
- [ ] VERDICT: PASS from research-validator
- [ ] Final report from orchestrator notes team, builder/validator agents, and output file path

## Fail Signals

- Code files written instead of research report
- Sources section missing or containing fabricated URLs
- Research validator gives PASS without verifying any URLs
- Only one research dimension addressed
- Validator uses WebSearch (it should only use WebFetch to verify existing citations)

## HOP Proof Observation

The event stream for this test should be structurally identical to any engineering team run -- same events in the same order, same retry protocol, same plan presentation. Only the `agentType` fields in `agent.dispatched` events differ. This is the proof that the orchestration wrapper is domain-agnostic.
