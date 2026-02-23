---
slug: spec-hardening
display_name: "Spec Hardening"
one_liner: "Rewrite vague task descriptions into concrete, implementation-ready specs with resolved file paths, measurable acceptance criteria, and explicit function signatures before any builder is dispatched."
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---

## Pattern ID

spec-hardening

## Quick Summary

Spec Hardening is a pre-dispatch rewrite pass that eliminates ambiguity from task descriptions before any builder receives them. After plan approval and before token estimation, the orchestrator scans every task description for vague phrases, missing file paths, and unmeasurable criteria -- then rewrites them into concrete, implementation-ready specs. The original description is always preserved in a "Pre-Hardening" subsection. Hardening rewrites existing descriptions; it never adds new requirements.

## When To Use

- When task descriptions contain vague language ("handle appropriately", "as needed") that a builder could implement in multiple valid-but-incompatible ways
- When acceptance criteria are unmeasurable ("works correctly", "handles edge cases")
- When file paths in task descriptions are implied rather than explicit ("the types file", "the existing service")
- When reducing retry rates is a priority -- ambiguous specs are the leading cause of first-attempt builder failures

## Core Mechanism

The hardening pass runs in Step 7b, after plan approval (Step 7) and before token estimation (Step 8).

**Ambiguity signals that trigger a rewrite:**
- Vague phrases: "handle appropriately", "should work", "as needed"
- Filler language: "etc.", "similar", "and so on"
- Missing file paths: "the types file" instead of `src/types/user.ts`
- Implicit dependencies: "uses the existing service" without naming it
- Vague acceptance criteria: "works correctly", "handles edge cases"
- Unspecified error handling: "handle errors" without response format

**Rewrite rules (per signal):**
1. Resolve file paths by reading the codebase (Glob/Grep to find actual paths)
2. Replace vague language with concrete expectations
3. Enumerate implicit items (replace "etc." with the full list)
4. Add measurable acceptance criteria
5. Specify function signatures where descriptions say "a function to..."
6. Specify error responses where descriptions say "handle errors"

**Audit trail:** The original description is preserved in a "Pre-Hardening" subsection. Hardened sections are marked with a `[hardened]` annotation. The spec file always carries both versions.

**Fast path:** A mini-hardening pass also runs in Step 3b for fast-path tasks before builder dispatch.

## Key Rules

1. Hardening rewrites existing descriptions -- it never adds new requirements not implied by the original.
2. The original description must be preserved verbatim in a "Pre-Hardening" subsection.
3. Hardening resolves file paths by reading the codebase (Glob/Grep) -- not by guessing or inventing.
4. Acceptance criteria after hardening must be machine-verifiable: a validator can read a file and confirm them.
5. Mark all hardened sections with `[hardened]` so builders and validators can distinguish original from rewritten.
6. If a task description has no ambiguity signals, do not harden it -- leave it unchanged.

## Implementation Notes

The full spec hardening checklist (ambiguity signal taxonomy and rewrite rule examples) is in `.claude/skills/orchestrator/references/codex-escalation.md`.

**The hardening paradox:** The orchestrator is itself an LLM and can introduce new ambiguity while trying to remove it. Mitigations:
- Focused rewrite, not creative generation: resolve file paths by reading the codebase, not by inventing plausible paths.
- Original preserved: if hardening introduces an error, the builder can reference the original intent.
- Hardening clarifies, never expands: a requirement that is genuinely absent (not vague, but missing) is a decomposition problem from Step 4, not a hardening problem.

The cost model: one orchestrator reasoning pass per task at plan time vs. 1-3 extra builder+validator cycles per ambiguous task at execution time. For a 5-task orchestration where 2 tasks have ambiguous specs, hardening saves approximately 9,000-18,000 tokens.

## Failure Modes

- **Hardening adds new requirements:** The orchestrator "clarifies" a spec by expanding scope -- adding error cases the original never mentioned. Builders implement the expanded scope; the user is surprised.
- **Original description discarded:** Without the Pre-Hardening subsection, there is no reference if hardening introduced an error. Builders cannot determine the original intent.
- **File paths invented rather than resolved:** The orchestrator writes `src/services/token-service.ts` because it seems plausible, but the actual file is `src/lib/tokens.ts`. Builder fails immediately; Validator catches a non-existent import.
- **Hardening run after task dispatch begins:** Hardening must complete before any builder is dispatched. A builder receiving a partially-hardened spec cannot tell which criteria are firm.

## Signals & Diagnostics

- **Pattern is needed:** Builders are failing first-attempt validation on criteria that were ambiguous in the original spec; retry counts are consistently 2-3 per task; validators report "criterion is unclear" on their failure verdicts.
- **Pattern is working:** Task descriptions in the spec file contain concrete file paths, explicit function signatures, and measurable acceptance criteria; `[hardened]` annotations appear on rewritten sections; Pre-Hardening subsections preserve originals.
- **Pattern is failing:** Hardened descriptions contain invented file paths that don't exist; acceptance criteria after hardening are still vague ("handles errors properly"); the Pre-Hardening subsection is missing.

## Tradeoffs

**Gain:** Reduces retry rates by catching ambiguity before dispatch -- one orchestrator reasoning pass replaces multiple builder+validator retry cycles. Makes acceptance criteria machine-verifiable, improving validator precision. Works for both fast path and full DAG.

**Cost:** Adds an orchestrator reasoning step (latency + tokens). Requires codebase reads (Glob/Grep) to resolve file paths. Subject to the hardening paradox -- LLM clarifying its own LLM output.

## Related Patterns

- **Spec as Source of Truth** -- the spec file that hardening modifies; hardened descriptions replace the originals in the task entries
- **Difficulty Routing** -- companion pattern; hardening reduces failures for all builders, routing sends hard tasks to better engines
- **Retry with Resume** -- the retry loop that hardening aims to reduce; fewer ambiguous specs = fewer retry cycles

## Source Anchors

Stage 6 (concept introduction and proof):
- `orchestration/6-codex:.claude/skills/orchestrator/SKILL.md:L381-L410` -- Step 7b: spec hardening pass, ambiguity signals, rewrite rules, audit trail with Pre-Hardening subsection
- `orchestration/6-codex:.claude/skills/orchestrator/references/codex-escalation.md` -- Full ambiguity signal taxonomy and rewrite rule examples
