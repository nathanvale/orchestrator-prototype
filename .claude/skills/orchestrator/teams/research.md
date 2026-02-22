---
team: research
description: Research and synthesis team for web-sourced analysis tasks
builder: research-builder
validator: research-validator
---

# Research Team

Optimized for tasks that require gathering information from the web, synthesizing multiple sources, and producing structured analysis reports. The research builder has WebSearch and WebFetch tools; the research validator can spot-check citations via WebFetch.

## When to Use

Use `--team research` when the task involves:
- Comparing technologies, frameworks, or libraries
- Researching best practices or community consensus
- Producing decision briefs or recommendation reports
- Summarizing recent developments in a technical area
- Evaluating options before an architectural decision

## Agent Assignments

| Role | Agent | Model | Tools |
|------|-------|-------|-------|
| Builder | `research-builder` | sonnet | WebSearch, WebFetch, Read, Glob, Grep, Write, TaskGet, TaskUpdate |
| Validator | `research-validator` | haiku | WebFetch, Read, Glob, Grep, TaskGet, TaskUpdate (no Write/Edit/WebSearch) |

## Invocation

```bash
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research
/orchestrate "compare Bun vs Node.js for our use case" --team research
/orchestrate "what are the current best practices for JWT storage in SPAs" --team research
```

## Output

Research tasks produce markdown report files (typically in `docs/research/` or `specs/research/` per the task description). Reports follow a structured format: summary, findings, comparison table (if applicable), recommendation, and sources.

## Notes

- Research builder uses WebSearch to discover sources and WebFetch to read them in depth
- Research validator spot-checks at least 2 cited URLs to confirm they are real and accurate
- Source recency is a first-class concern -- sources older than 24 months are flagged
- The research validator does NOT have WebSearch; it can only verify citations, not find new sources
- The same orchestration protocol applies: DAG decomposition, waves, retry, plan refinement
