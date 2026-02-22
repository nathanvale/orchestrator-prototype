# Review Summary: Agentic Dojo Remediation Plan

**Date:** 2026-02-22
**Plan:** `docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md`
**Passes:** 3 (sequential, each building on prior findings)

## Verdicts

| Pass | Persona | Verdict |
|------|---------|---------|
| 1 | AI Prompting Expert | APPROVE WITH CONDITIONS |
| 2 | AI Prompting Expert #2 | APPROVE WITH CONDITIONS |
| 3 | DX Expert | APPROVE WITH CONDITIONS |

**Overall:** Plan is approved for implementation once critical issues are addressed.

---

## Critical Issues (9 total -- must fix before implementation)

| # | Pass | Category | Issue | Suggested Fix |
|---|------|----------|-------|---------------|
| C1 | 1 | Slot contract | Slot name mismatch across frontmatter, slot contract, and mode templates | Create one canonical slot name registry; reconcile all three sources |
| C2 | 1 | Routing | Mode alias resolution ambiguous -- "alias" overloaded between Steps 1 and 2 | Explicit mode alias table in Step 1 with sub-steps 1a/1b |
| C3 | 1 | Validation | Runtime template validation (3d) unreliable at inference time | Move to static guarantee at authoring time; simplify 3d to fallback substitution |
| C4 | 2 | Synthesis | Steps 3d-3g lack tool-call boundaries and will fuse into single pass | Restructure into 2 phases (validate + generate), not 4 steps |
| C5 | 2 | Templates | Inline {{pattern.*}} expansion collapses instruction/data boundary | Use slot name references (pointers), not inline content expansion |
| C6 | 2 | Parsing | Two YAML blocks in Reference mode (content + envelope) create ambiguity | Use distinctive fence for envelope (e.g., ```envelope info string) |
| C7 | 3 | DX | No help/list escape hatch -- `/dojo help` falls through to fuzzy matching | Add reserved keyword list that triggers zero-state |
| C8 | 3 | Maintenance | No author checklist for adding pattern #10 (5 touch points, 3 files) | Add "Adding a New Pattern" checklist to CLAUDE.md |
| C9 | 3 | Debugging | No way to diagnose routing decisions -- breadcrumb shows what, not why | Add --verbose/--trace to test harness; save raw JSON responses |

---

## Important Observations (12 total -- should fix, non-blocking)

| # | Pass | Issue |
|---|------|-------|
| I1 | 1 | Agent detection infeasible -- use explicit `--agent` flag instead of "no prior human turn" |
| I2 | 1 | Multi-word alias matching semantics undefined -- use single-token aliases |
| I3 | 1 | Confidence calc has no home in 3a-3g chain -- add metadata accumulation step between Steps 2-3 |
| I4 | 1 | "Did you mean?" algorithm under-specified -- use prefix matching for determinism |
| I5 | 2 | File read order bias -- reorder to pattern (data) -> voice -> mode (structure last) |
| I6 | 2 | Error contract missing partial pattern match disambiguation |
| I7 | 2 | Confidence field has no downstream consumer in v1 -- cut or define a consumer |
| I8 | 2 | "Does NOT" section at end makes Claude overly cautious -- move before Step 3 |
| I9 | 3 | Sonnet model creates quality ceiling for Sensei teaching -- document rationale in command |
| I10 | 3 | Alias table not discoverable from zero-state -- add hint to examples section |
| I11 | 3 | "source of truth" as natural language fails -- add `source-of-truth` and `source` as aliases |
| I12 | 3 | Test harness has no subset flags -- add `--happy`, `--edge`, `--routing` categories |

---

## Nice-to-Haves (9 total)

| # | Pass | Suggestion |
|---|------|------------|
| N1 | 1 | Dry-run flag for test harness (skip synthesis, check routing only) |
| N2 | 1 | Reconcile voice_id extraction: frontmatter vs H2 section |
| N3 | 1 | Voice substitution rules are soft hints -- don't test for them |
| N4 | 2 | Add worked example (15-20 lines) to SKILL.md |
| N5 | 2 | Voice substitution should use lookup table, not prose |
| N6 | 2 | Make breadcrumb HTML comment for invisible parsing |
| N7 | 3 | Dynamic zero-state showing only patterns with existing files |
| N8 | 3 | `/dojo compare` mode for v2 |
| N9 | 3 | Pattern frontmatter `one_liner` field for dynamic zero-state descriptions |

---

## Residual Risk (from DX Expert synthesis)

1. **Untested model-prompt interaction** -- No reviewer can predict how sonnet performs on Sensei teaching with these voice constraints. Needs at least one live end-to-end test before full 20-file implementation.
2. **Maintenance drift between skills** -- Advisor and dojo share pattern slugs with no mechanical coupling. A rename in one silently breaks the other. No test catches this.

---

## Review Files

- [Pass 1: AI Prompting Expert](pass-1-ai-prompting-expert.md)
- [Pass 2: AI Prompting Expert #2](pass-2-ai-prompting-expert.md)
- [Pass 3: DX Expert](pass-3-dx-expert.md)
