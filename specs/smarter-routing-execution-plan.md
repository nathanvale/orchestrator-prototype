# Plan: Smarter Routing for Agentic Dojo & Pattern Advisor

## Task Description

Implement the smarter routing plan from `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md`. This adds a query-type classifier, compare mode, conversation context resolution, and semantic signal extraction to the dojo and advisor skills. All changes are prompt-level (markdown files) -- no TypeScript code.

## Objective

When complete:
- `/dojo wave dag` routes to compare mode (not error)
- `/dojo explain that one` after an advisor response resolves from context
- `/dojo explain --context-pattern=task-dag` works for agents
- `/advisor "CI pipeline: lint, test, build, deploy"` detects structural signals
- Dojo envelopes emit `envelope_version: 2`, `query_type`, and `patterns_selected` (list)
- Advisor envelope emits `envelope_version: 2`
- Dojo SKILL.md stays under 250 lines (actual baseline: 243 lines)

## Problem Statement

The v1 routing is a lexical cascade that breaks on compound queries (2 patterns), follow-ups ("explain that one"), and cross-skill handoffs. The plan adds a deterministic classifier layer above the existing cascade without changing content delivery.

## Solution Approach

All changes are markdown edits to skill files and new reference files. No TypeScript or infrastructure. Validation includes structural checks plus manual smoke behavior checks from the hardened plan. The work decomposes into 5 builder tasks (sequential with validation after each) plus one final integration validation.

**Key constraint:** The dojo SKILL.md is already at 243 lines (the plan incorrectly says 207). The 250-line ceiling gives only 7 lines of headroom. The plan estimates +13 net lines. To stay under 250, more content must be extracted to reference files than the plan specifies, OR the plan's net delta must be reduced to +7 or fewer. Builders must count lines and report actuals.

## Relevant Files

**Files to modify:**
- `.claude/skills/agentic-dojo/SKILL.md` (243 lines) -- routing, envelope format, error contract, zero-state, stop hook
- `.claude/skills/pattern-advisor/SKILL.md` (171 lines) -- characteristic extraction, envelope format
- `.claude/skills/pattern-advisor/references/mode-advisor.md` (71 lines) -- Next Steps compare handoff example

**Files to create:**
- `.claude/skills/agentic-dojo/references/query-classifier.md` (~30 lines) -- classification table and rules
- `.claude/skills/agentic-dojo/references/context-resolution.md` (~20 lines) -- follow-up resolution algorithm
- `.claude/skills/agentic-dojo/references/mode-compare.md` (~80 lines) -- compare synthesis template

**Files to read for context (do NOT modify):**
- `.claude/skills/agentic-dojo/references/mode-sensei.md` (84 lines) -- template pattern to follow
- `.claude/skills/agentic-dojo/references/mode-reference.md` (76 lines) -- template pattern to follow
- `.claude/skills/agentic-dojo/references/voice-jarvis.md` (78 lines) -- compare voice
- `.claude/skills/agentic-dojo/references/voice-miyagi.md` (78 lines) -- sensei voice
- `.claude/skills/agentic-dojo/references/VOICE-CONTRACT.md` -- voice file contract
- `.claude/skills/pattern-advisor/references/mode-advisor.md` (71 lines) -- advisor template pattern
- `.claude/references/patterns/pattern-wave-computation.md` -- example pattern for testing templates
- `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` -- source of truth for all specifications

## Contract Packet (mandatory pre-read for every agent)

Before any builder or validator starts work, read these plan sections in full:
- `Improvement 1: Query-type classifier` (classifier rules and trigger vocabulary)
- `Improvement 2: Comparison mode` (mode structure + constraints)
- `Improvement 3: Conversation context resolution` (precedence and ordinal handling)
- `System-Wide Impact > Envelope schema evolution` (v2 fields + compatibility shim)
- `Acceptance Criteria` and `Quality Gates` (final authority for PASS/FAIL)

Additionally required by role:
- Builders editing mode files: read `.claude/skills/agentic-dojo/references/VOICE-CONTRACT.md`
- Builders/validators touching stop hooks: read current `.claude/skills/agentic-dojo/SKILL.md` stop hook block before any edit/check
- Validators: read this execution plan's `Acceptance Criteria` immediately before validation to avoid stale assumptions

If contract sources conflict, precedence is:
1. `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md`
2. `specs/smarter-routing-execution-plan.md`
3. Existing file conventions (`mode-sensei.md`, `mode-reference.md`, `mode-advisor.md`)

### New Files

- `.claude/skills/agentic-dojo/references/query-classifier.md`
- `.claude/skills/agentic-dojo/references/context-resolution.md`
- `.claude/skills/agentic-dojo/references/mode-compare.md`

## Implementation Phases

### Phase 1: Foundation (Tasks 1-2)
Create the two extracted reference files: query-classifier.md and context-resolution.md. These are self-contained and define the routing logic that SKILL.md will reference.

### Phase 2: Core Implementation (Tasks 3-4)
Create mode-compare.md, then edit dojo SKILL.md to wire everything together: add reference reads, update zero-state, update envelope format, update error contract, update stop hook. This is the most sensitive task because of the 250-line ceiling.

### Phase 3: Advisor & Integration (Tasks 5-6)
Add semantic signals to advisor SKILL.md, then run full integration validation across all files.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. Use Task and Task* tools only.
- Take note of the session id (agentId) of each team member for resume operations.

### Model Selection Guide

| Role | Model | Rationale |
|------|-------|-----------|
| All builders | sonnet | Executes well-specified tasks reliably |
| All validators | haiku | Mechanical checks: read files, run commands, report PASS/FAIL |

### Team Members

- Builder
  - Name: builder-classifier
  - Role: Create query-classifier.md and context-resolution.md reference files
  - Agent Type: agentic-orchestration:builder
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-compare-mode
  - Role: Create mode-compare.md reference file
  - Agent Type: agentic-orchestration:builder
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-dojo-skill
  - Role: Edit dojo SKILL.md (routing, envelope, errors, stop hook, zero-state)
  - Agent Type: agentic-orchestration:builder
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-advisor-skill
  - Role: Edit advisor SKILL.md (semantic signals, envelope version)
  - Agent Type: agentic-orchestration:builder
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-files
  - Role: Validate each builder's output against plan spec
  - Agent Type: agentic-orchestration:validator
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-integration
  - Role: Final cross-file integration validation
  - Agent Type: agentic-orchestration:validator
  - Model: haiku
  - Resume: true

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.
- Every validator task must produce a gate artifact entry before the next task can start.
- Gate artifact file: `specs/reviews/smarter-routing-execution-gates.md`
- Gate entry format (required): `Task ID`, `Status: PASS|FAIL`, `Checklist`, `Blocking Issues`, `Line Counts` (when relevant), `Timestamp`.

### 1. Create query-classifier.md
- **Task ID**: create-query-classifier
- **Depends On**: none
- **Assigned To**: builder-classifier
- **Agent Type**: agentic-orchestration:builder
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` sections: "Improvement 1: Query-type classifier" (lines 113-167)
- Read existing mode files (`mode-sensei.md`, `mode-reference.md`) to understand the reference file style
- Create `.claude/skills/agentic-dojo/references/query-classifier.md` (~30 lines) containing:
  - Two-pass resolution instructions (Step 1a: aliases, Step 1b: classify)
  - Classification rules table (7 rows: compare prefix/trigger, 2 explicit + compare, 2 explicit no compare, --context-pattern flag, pronoun/reference, 3+ explicit, everything else)
  - Compare trigger words: "compare", "vs", "versus", "difference between", "differ from", "in common", "overlap", "similarities"
  - Pronoun/reference triggers: "that one", "those", "it", ordinal refs ("first/second/third")
  - Classifier-to-mode mapping table (single, compare, follow-up, structured follow-up, disambiguation)
  - Recursion guard note: re-classification after context resolution MUST NOT produce another follow-up
- Target: ~30 lines, clear and concise
- File should NOT have frontmatter -- it's a routing policy reference, not a mode file

### 2. Create context-resolution.md
- **Task ID**: create-context-resolution
- **Depends On**: none
- **Assigned To**: builder-classifier
- **Agent Type**: agentic-orchestration:builder
- **Model**: sonnet
- **Parallel**: false (sequential execution required by this plan)
- Read `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` sections: "Improvement 3: Conversation context resolution" (lines 235-303)
- Create `.claude/skills/agentic-dojo/references/context-resolution.md` (~20 lines) containing:
  - 1-message lookback algorithm (check most recent assistant message for dojo-envelope or advisor-envelope)
  - Ordinal resolution: if advisor ranked list present and user says "first/second/third", resolve to ranked_patterns[N-1]
  - `--context-pattern=<slug>` handling: skip envelope resolution entirely, extract slug directly, validate slug exists
  - Cross-skill bridge: parse advisor-envelope -> ranked_patterns[0].slug (or ordinal)
  - Precedence contract table (5 rows from plan lines 284-290)
  - Warning: requires main-thread conversation access (context: fork would break this)
- Target: ~20 lines

### 3. Validate reference files
- **Task ID**: validate-reference-files
- **Depends On**: create-query-classifier, create-context-resolution
- **Assigned To**: validator-files
- **Agent Type**: agentic-orchestration:validator
- **Model**: haiku
- **Parallel**: false
- Read both new files and verify:
  - `query-classifier.md` contains all 7 classification rules from the plan
  - `query-classifier.md` includes expanded compare triggers ("in common", "overlap", "similarities")
  - `query-classifier.md` includes ordinal refs in follow-up triggers
  - `context-resolution.md` contains precedence contract (all 5 cases)
  - `context-resolution.md` includes ordinal resolution for advisor ranked list
  - `context-resolution.md` includes `--context-pattern` handling
  - `context-resolution.md` includes context:fork warning
  - Neither file has frontmatter (they're routing policy, not modes)
  - Both files are concise (~30 and ~20 lines respectively)
- Write gate artifact entry for `validate-reference-files` in `specs/reviews/smarter-routing-execution-gates.md`
- If FAIL: do not proceed; reopen `create-query-classifier` and/or `create-context-resolution`

### 4. Create mode-compare.md
- **Task ID**: create-mode-compare
- **Depends On**: validate-reference-files
- **Assigned To**: builder-compare-mode
- **Agent Type**: agentic-orchestration:builder
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` section: "Improvement 2: Comparison mode" (lines 169-233)
- Read `mode-sensei.md` and `mode-reference.md` for structural template (header, Voice ID section, Synthesis Template, Constraints)
- Read `VOICE-CONTRACT.md` for voice file conventions
- Create `.claude/skills/agentic-dojo/references/mode-compare.md` (~80 lines) containing:
  - Header: `# Compare Mode` with Character (JARVIS) and Purpose
  - Voice ID: `jarvis`
  - Synthesis Template with 7 sections: Breadcrumb, At a Glance table, How They Differ, When To Choose Which, Key Rules (combined), Watch Out (comparative), See Also (deduplicated)
  - Constraints section: max 2 patterns, same-pattern error, ignores prefix overrides, JARVIS voice applies, word target ~600
  - Follow the same structural pattern as mode-sensei.md (Voice ID section, Synthesis Template, Constraints)
- Target: ~80 lines

### 5. Validate mode-compare.md
- **Task ID**: validate-mode-compare
- **Depends On**: create-mode-compare
- **Assigned To**: validator-files
- **Agent Type**: agentic-orchestration:validator
- **Model**: haiku
- **Parallel**: false
- Read `mode-compare.md` and verify:
  - Has Voice ID section with value `jarvis`
  - Has Synthesis Template with all 7 sections from the plan
  - Has Constraints section covering: max 2 patterns, same-pattern error, prefix override behavior, voice applicability
  - Structural consistency with `mode-sensei.md` and `mode-reference.md` (same section hierarchy)
  - No frontmatter (mode files don't have frontmatter -- check existing mode files to confirm)
  - Line count is ~80 (within 60-100 range)
- Write gate artifact entry for `validate-mode-compare` in `specs/reviews/smarter-routing-execution-gates.md`
- If FAIL: do not proceed; reopen `create-mode-compare`

### 6. Edit dojo SKILL.md
- **Task ID**: edit-dojo-skill
- **Depends On**: validate-mode-compare
- **Assigned To**: builder-dojo-skill
- **Agent Type**: agentic-orchestration:builder
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` fully for all SKILL.md change specifications
- Read current `.claude/skills/agentic-dojo/SKILL.md` (243 lines) completely before any edits
- **CRITICAL: Final line count must be <= 250 lines. Current baseline is 243, not 207.**
- Make these edits:

  **Frontmatter (lines 1-30):**
  - Update `argument-hint` to include compare example and --context-pattern example
  - Update Stop hook: change `pattern_selected` check to accept both `pattern_selected` and `patterns_selected` (compatibility window)

  **Zero-state (lines 52-70):**
  - Add `compare <pattern> <pattern>` to Modes section
  - Add compare example to Examples section

  **Step 1: Route (after line 49, before Mode Detection):**
  - Add instruction to read `references/query-classifier.md` after reserved-keyword check
  - Add instruction to read `references/context-resolution.md` when query_type = follow-up

  **Error Contract (lines 152-164):**
  - Change "Multiple patterns detected" row: 2 explicit = compare route, 3+ explicit = disambiguation
  - Add new row: "Compare with same pattern twice" = error
  - Update disambiguation message to be mode-neutral: "Which pair for compare, which one for explain or lookup?"
  - Add tip to "Unknown pattern" error: "Try /advisor for recommendations"

  **"Does NOT Do" section (line 171):**
  - Remove "Does not compare patterns side-by-side (v2 consideration)" -- it does now

  **Step 2: Read (lines 173-184):**
  - Add compare mode reading: when mode = compare, read mode-compare.md + pattern-A file + pattern-B file + voice-jarvis.md
  - Make pattern reads plural-aware (read 1 or 2 pattern files depending on query type)

  **Envelope Format (lines 221-243):**
  - Add `envelope_version: 2` field
  - Add `query_type` field (values: single, compare, follow-up, disambiguation)
  - Change `pattern_selected` to `patterns_selected` (list)
  - Add `pattern_selected` compatibility shim (= first item of patterns_selected)
  - Add `context_source` field (when follow-up resolved)
  - Add envelope extraction contract regex
  - Update route_reason values list to include "compare-trigger:", "context-resolution:", "structured-follow-up:"

  **After editing:** Count total lines with `wc -l`. If over 250, extract more content to reference files. Report final line count.

### 7. Validate dojo SKILL.md
- **Task ID**: validate-dojo-skill
- **Depends On**: edit-dojo-skill
- **Assigned To**: validator-files
- **Agent Type**: agentic-orchestration:validator
- **Model**: haiku
- **Parallel**: false
- Read the edited SKILL.md and verify:
  - Line count <= 250 (run `wc -l`)
  - Stop hook checks for both `pattern_selected` and `patterns_selected`
  - Zero-state includes compare mode and example
  - Argument-hint includes compare and --context-pattern examples
  - Step 1 references query-classifier.md and context-resolution.md
  - Error contract has: 2-explicit=compare, 3+=disambiguation, same-pattern=error, mode-neutral disambiguation text, /advisor tip
  - "Does NOT Do" no longer mentions compare
  - Step 2 handles compare mode (reads 2 pattern files + mode-compare + voice-jarvis)
  - Envelope format includes all v2 fields (envelope_version, query_type, patterns_selected, pattern_selected shim, context_source)
  - Envelope extraction regex is documented
  - route_reason values include new types
- Write gate artifact entry for `validate-dojo-skill` in `specs/reviews/smarter-routing-execution-gates.md`
- Include explicit line count in gate entry (`wc -l .claude/skills/agentic-dojo/SKILL.md`)
- If FAIL: do not proceed; reopen `edit-dojo-skill`

### 8. Edit advisor SKILL.md
- **Task ID**: edit-advisor-skill
- **Depends On**: validate-dojo-skill
- **Assigned To**: builder-advisor-skill
- **Agent Type**: agentic-orchestration:builder
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` section: "Improvement 4: Semantic signal extraction" (lines 305-330)
- Read current `.claude/skills/pattern-advisor/SKILL.md` (171 lines)
- Make these edits:

  **After Characteristic Extraction table (after line 94):**
  - Add 3-line structural signal guidance:
    ```
    After keyword extraction, also detect structural signals:
    - Sequential/pipeline language ("first... then... finally") -> dependencies, multiple-tasks
    - Role differentiation ("one builds, another checks") -> verification-needed
    - Error narratives, iteration loops, scale/batch language -> map to closest characteristic
    ```

  **Envelope Format (lines 152-171):**
  - Add `envelope_version: 2` field to the example envelope
  - Add envelope extraction contract regex (same as dojo)

  **Next Steps in mode-advisor.md (separate file):**
  - Read `mode-advisor.md` and add `/dojo compare <slug-a> <slug-b>` to the Next Steps command examples

### 9. Validate advisor SKILL.md
- **Task ID**: validate-advisor-skill
- **Depends On**: edit-advisor-skill
- **Assigned To**: validator-files
- **Agent Type**: agentic-orchestration:validator
- **Model**: haiku
- **Parallel**: false
- Read the edited advisor SKILL.md and verify:
  - Structural signal guidance appears after characteristic extraction table (3 lines)
  - Envelope includes `envelope_version: 2`
  - Envelope extraction regex is documented
  - Existing characteristic extraction table is unchanged
  - Existing scoring guide is unchanged
- Read `mode-advisor.md` and verify:
  - Next Steps includes `/dojo compare` command example
- Write gate artifact entry for `validate-advisor-skill` in `specs/reviews/smarter-routing-execution-gates.md`
- Include explicit line counts for advisor files in gate entry
- If FAIL: do not proceed; reopen `edit-advisor-skill`

### 10. Final Integration Validation
- **Task ID**: validate-integration
- **Depends On**: validate-advisor-skill
- **Assigned To**: validator-integration
- **Agent Type**: agentic-orchestration:validator
- **Model**: haiku
- **Parallel**: false
- Cross-file consistency checks:
  - Dojo SKILL.md references `query-classifier.md` -- verify that file exists and contains the expected classification rules
  - Dojo SKILL.md references `context-resolution.md` -- verify that file exists and contains the expected resolution algorithm
  - Dojo SKILL.md references `mode-compare.md` -- verify that file exists with Voice ID = jarvis
  - Compare mode references `voice-jarvis.md` -- verify voice file exists (it does, pre-existing)
  - All dojo envelope examples use `envelope_version: 2`, `query_type`, and `patterns_selected` (list)
  - Advisor envelope example uses `envelope_version: 2`
  - Dojo stop hook validates both `pattern_selected` and `patterns_selected`
  - No file exceeds its line budget (dojo SKILL.md <= 250, advisor SKILL.md <= 200)
  - Grep all files for `pattern_selected` (singular, not in `patterns_selected`) to verify only the compatibility shim uses it
  - Verify mode-compare.md follows the same structural pattern as mode-sensei.md (Voice ID, Synthesis Template, Constraints)
  - Report final line counts for all 5 modified/created files
- Confirm all prior gate entries exist and are PASS before issuing final PASS
- Write final gate artifact entry for `validate-integration` in `specs/reviews/smarter-routing-execution-gates.md`

## Acceptance Criteria

- [ ] `query-classifier.md` exists with 7 classification rules, expanded compare triggers, ordinal follow-up triggers
- [ ] `context-resolution.md` exists with precedence contract, ordinal resolution, --context-pattern handling, context:fork warning
- [ ] `mode-compare.md` exists with JARVIS voice, 7-section template, constraints
- [ ] Dojo SKILL.md <= 250 lines with all v2 changes (classifier refs, compare in Step 2, envelope v2, updated errors, updated stop hook)
- [ ] Dojo stop hook accepts both `pattern_selected` and `patterns_selected`
- [ ] Advisor SKILL.md has 3-line semantic signal guidance and envelope_version: 2
- [ ] mode-advisor.md Next Steps includes `/dojo compare` example
- [ ] Dojo envelope examples use v2 format with `patterns_selected` as list
- [ ] Advisor envelope example uses `envelope_version: 2`
- [ ] Zero-state shows compare mode with example
- [ ] "Does NOT Do" no longer mentions compare as v2
- [ ] Error contract distinguishes 2-explicit (compare) from 3+ (disambiguation) from keyword ambiguity
- [ ] `specs/reviews/smarter-routing-execution-gates.md` contains PASS entries for tasks 3, 5, 7, 9, and 10

## Validation Commands

No TypeScript in scope -- all files are markdown. Validation is structural:
- `wc -l` on all modified files to verify line budgets
- `grep -r "pattern_selected" .claude/skills/` to verify singular form only in compatibility shim
- Visual inspection of file structure and content against plan spec
- Manual smoke behavior checks for key flows:
  - `/dojo wave dag` routes to compare
  - `/dojo compare wave wave` produces same-pattern error
  - Follow-up resolution after advisor and dojo envelopes
  - Invalid `--context-pattern` produces hard error
  - Similarity-language compare trigger (for example: "in common")

## Notes

- **Line budget is the #1 risk.** The plan says baseline is 207 but actual is 243. With +13 net change that's 256 -- over the 250 ceiling. The builder for task 6 MUST track line count and may need to extract more content to reference files.
- **This is all markdown.** No TypeScript or infrastructure changes. Validation is structural plus manual smoke behavior checks.
- **The plan has been through 3 review passes** (Architect, Skeptic, DX Advocate). Review feedback has already been incorporated into the plan: compatibility shim for pattern_selected, expanded compare triggers, ordinal follow-up handling, precedence contract, stop-hook update requirement.
- **mode-advisor.md edit** (adding compare to Next Steps) is a separate file from advisor SKILL.md but assigned to the same builder for task 8.
- **Sequential execution is mandatory.** Each builder's output must be validated before the next builder starts, because later tasks depend on earlier files existing and being correct.
