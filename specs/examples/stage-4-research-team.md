# Example Spec: Research Team Orchestration

**Stage:** 4
**Team:** research
**Purpose:** Shows what a research team orchestration spec looks like

This is an example of the spec file the orchestrator would write for a research task using `--team research`. The format is identical to engineering team specs -- only the agent names differ in the execution log.

---

# Orchestration Spec: TypeScript Testing Frameworks Research

## Prompt

research the top 5 TypeScript testing frameworks, comparing features, community size, and performance

## Task Graph

| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|
| research-framework-landscape | Survey the TypeScript testing framework landscape | (none) | 1 | completed |
| deep-dive-top-frameworks | Deep dive into the top 5 frameworks | research-framework-landscape | 2 | completed |
| compare-and-synthesize | Compare frameworks across criteria and write synthesis | deep-dive-top-frameworks | 3 | completed |

## Tasks

### research-framework-landscape

- Subject: Survey the TypeScript testing framework landscape
- Dependencies: (none)
- Wave: 1
- Status: completed
- Retries: 0

**Description:**
Use WebSearch to identify the most popular TypeScript testing frameworks as of 2025-2026. Look at npm download stats, GitHub stars, and community mentions. Identify the top 5 by combined popularity metrics. Write findings to `src/research/framework-landscape.md`.

**Acceptance Criteria:**
- At least 8-10 frameworks surveyed before narrowing to top 5
- Each framework listed with npm weekly downloads and GitHub stars
- Sources cited with URLs
- Findings written to `src/research/framework-landscape.md`

### deep-dive-top-frameworks

- Subject: Deep dive into the top 5 frameworks
- Dependencies: research-framework-landscape
- Wave: 2
- Status: completed
- Retries: 0

**Description:**
For each of the top 5 frameworks identified in the landscape survey, research: key features, TypeScript support quality, community size (Discord/GitHub discussions), performance benchmarks, and notable limitations. Write findings to `src/research/framework-details.md`.

**Acceptance Criteria:**
- All 5 frameworks covered with equal depth
- Features, community, and performance sections for each
- At least 2 sources per framework
- Conflicting information disclosed rather than hidden

### compare-and-synthesize

- Subject: Compare frameworks across criteria and write synthesis
- Dependencies: deep-dive-top-frameworks
- Wave: 3
- Status: completed
- Retries: 0

**Description:**
Create a comparison table and written synthesis comparing all 5 frameworks across: features, community size, performance, TypeScript support, and learning curve. Write to `src/research/framework-comparison.md`.

**Acceptance Criteria:**
- Comparison table with all 5 frameworks and all criteria
- Written synthesis highlighting tradeoffs
- Recommendation section with use-case-based guidance
- All sources compiled into a bibliography

## Execution Log

### Wave 1

- Task `research-framework-landscape`: research-builder dispatched -> research-builder completed -> research-validator dispatched -> research-validator completed -> VERDICT: PASS

### Wave 2

- Task `deep-dive-top-frameworks`: research-builder dispatched -> research-builder completed -> research-validator dispatched -> research-validator completed -> VERDICT: PASS

### Wave 3

- Task `compare-and-synthesize`: research-builder dispatched -> research-builder completed -> research-validator dispatched -> research-validator completed -> VERDICT: PASS

## Result

All 3 tasks completed across 3 waves.

Execution summary:
- Tasks passed on first attempt: 3
- Tasks passed after retry: 0
- Tasks skipped after retry exhaustion: 0
- Total retries performed: 0

Files created or modified:
- `src/research/framework-landscape.md` -- initial framework survey with popularity metrics
- `src/research/framework-details.md` -- detailed analysis of top 5 frameworks
- `src/research/framework-comparison.md` -- comparison table and synthesis with recommendations

Fast path: no
Clarifying questions asked: 0
Team: research
