---
title: "feat: Add /dojo:add-pattern skill - atomic pattern pipeline"
type: feat
status: active
date: 2026-02-22
origin: docs/brainstorms/2026-02-22-add-pattern-skill-brainstorm.md
---

# feat: Add /dojo:add-pattern skill - atomic pattern pipeline

## Overview

A single slash command (`/dojo:add-pattern`) that takes a pattern idea from raw notes to a fully integrated, battle-tested dojo pattern in one invocation. It dogfoods the orchestrator's own builder/validator dispatch to create patterns -- the dojo eating its own cooking.

One command. One approval checkpoint. One completion dopamine hit. The pipeline:

```
Input (any markdown or inline text)
  -> Step 1: Pre-flight + Plan
       - Collision check, slot mapping, plan review with user
  -> Step 2: Build + Validate
       - Builder dispatch, validator dispatch, retry on failure
  -> Step 3: Smoke + Report
       - Route verification, success output with "try it now" commands
  -> Done. Pattern is live.
```

## Problem Statement / Motivation

Adding a pattern to the dojo is currently a manual 6-step process documented in CLAUDE.md. It requires: writing a source doc, creating a reference file with YAML frontmatter, editing the dojo SKILL.md alias table, keyword table, and zero-state list, and updating the advisor scoring table. This process is error-prone (miss one table and the pattern is undiscoverable), not validated (no independent check), and doesn't enforce the source anchor contract.

The dojo is only as good as how easy it is to grow. If adding a pattern is friction-heavy, the library stagnates.

## Proposed Solution

A skill with its own lightweight dispatch loop (not the full 12-step orchestrator) that handles the fixed, known task structure of adding one pattern. It dispatches a builder agent to create all artifacts, then a validator agent to independently check conformance.

### Key design decisions (from brainstorm)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single source of truth | `.claude/references/patterns/` only | Humans read patterns through `/dojo`, not raw files. The slot contract format serves the HOP system. `docs/patterns/` is redundant. |
| Patterns are immutable | No update skill. Manual escape hatch for minor fixes. | Every pattern in the dojo is trustworthy. The validator's PASS is a permanent stamp of quality. |
| Input flexibility | Any markdown file or inline text | The skill extracts what maps to slots. Could be brainstorm notes, a plan doc, research notes, or a description in the conversation. |
| Collision check | Hard block if slug or aliases exist | Patterns are immutable. No overwrite, no merge. |
| Proof code requirement | Proof is part of the build. Source anchors point to real files with real line numbers. | No pattern ships without proof. The user approves anchors during plan review (semantic check). The validator checks structural validity only (files exist, lines in bounds). |
| Proof code location | Wherever it naturally fits | No dedicated `src/patterns/` directory. Source anchors are pointers, not copies. |
| Build method | Dogfood builder/validator dispatch | Independent verification. Retry with resume on failure. Observability gets the dispatch events. |
| Smoke test | Yes, after PASS | Run `/dojo explain <new-pattern>` to verify the full routing chain works end-to-end. |

## Technical Approach

### Architecture: Lightweight Dispatch Loop

The add-pattern skill implements its own dispatch loop rather than invoking the full `/orchestrate` protocol. Rationale: the task structure is fixed (always 1 builder task + 1 validator task), there's no DAG decomposition, no clarifying questions phase, no wave computation. The full 12-step orchestrator adds overhead without value for this use case.

The skill IS the orchestrator for this specific job. Three steps (matching the dojo's own 3-step protocol -- Route/Read/Synthesize became Pre-flight+Plan/Build+Validate/Smoke+Report):

```
/dojo:add-pattern $ARGUMENTS
    |
    v
Step 1: Pre-flight + Plan
    - Parse input (detect file path or inline text -- no --from flag needed)
    - Derive slug via priority cascade (see Slug Derivation below)
    - Collision check (slug, aliases, keywords, advisor)
    - Read input markdown
    - LLM-driven slot mapping (extract content for 11 slots)
    - Tag each slot as [sourced] or [inferred] (see Slot Mapping below)
    - Propose: slug, display_name, one_liner, aliases, keywords
    - Propose: source anchors (identify proof code in repo)
    - Show plan to user for approval (numbered modification menu)
    - If rejected: user picks item number to change, loop
    - Progress: "[1/3] Pre-flight passed. No collisions. Plan approved."
    |
    v
Step 2: Build + Validate
    - Dispatch builder (pattern file + SKILL.md wiring + proof code)
    - Progress: "[2/3] Builder complete. N files created/modified. Validating..."
    - Dispatch validator (12-item checklist)
    - VERDICT: PASS or VERDICT: FAIL
    - On FAIL: retry builder with resume (up to 3x)
    - On exhaustion: report partial state, ask user (skip, provide guidance, abort)
    |
    v
Step 3: Smoke + Report
    - Invoke /dojo explain <new-pattern> via Skill tool
    - Confirm routing chain works (envelope has correct pattern_selected)
    - Progress: "[3/3] Validator: PASS. Smoke test passed. Pattern is live."
    - Report: success output with "try it now" commands (see Success Output below)
```

### Pre-flight Checks (Step 1)

**Input detection (smart -- no --from flag):**

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | `$ARGUMENTS` is empty | Show usage help and stop |
| 2 | `$ARGUMENTS` starts with a valid file path (Read succeeds) | Use file as input source |
| 3 | `$ARGUMENTS` is text | Accept as inline input |

The skill auto-detects whether the argument is a file path or inline text. No `--from` flag needed.

Example: `/dojo:add-pattern docs/brainstorms/my-pattern.md`
Example: `/dojo:add-pattern "A pattern for circuit-breaking agent calls"`

**Slug derivation (priority cascade):**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | YAML frontmatter `slug:` field in input file | `slug: circuit-breaker` |
| 2 | YAML frontmatter `topic:` field in input file | `topic: circuit-breaker` |
| 3 | First `# Heading` in input, slugified | `# Circuit Breaker` -> `circuit-breaker` |
| 4 | Ask user | "What slug? (kebab-case, e.g., `circuit-breaker`)" |

Slugify: lowercase, replace spaces with hyphens, strip non-alphanumeric except hyphens.

**Collision check (hard block on any match):**

| Check | How | Error message |
|-------|-----|---------------|
| Pattern file exists | Glob `.claude/references/patterns/pattern-<slug>.md` | "Pattern `<slug>` already exists. Patterns are immutable. To fix an existing pattern, see Pattern Maintenance in CLAUDE.md." |
| Slug in alias table | Grep dojo SKILL.md for slug in alias Resolves To column | "Slug `<slug>` is already an alias target in the dojo routing table." |
| Proposed aliases conflict | Grep dojo SKILL.md alias table for each proposed alias | "Alias `<alias>` is already owned by pattern `<existing-pattern>`." |
| Slug in keyword table | Grep dojo SKILL.md for slug in keyword Pattern column | "Pattern `<slug>` already has a keyword row in the dojo routing table." |
| Slug in advisor table | Grep advisor SKILL.md scoring table for slug | "Pattern `<slug>` already has an advisor scoring row." |

If any collision is found, the skill stops immediately with the error message (which points to Pattern Maintenance for existing patterns). No builder dispatch.

### Slot Mapping (Step 1, continued)

The skill reads the input markdown and uses LLM-driven extraction to populate the 11-slot contract. This is the core intellectual work -- the skill synthesizes raw notes into structured pattern content.

**Slot contract (all 11 required):**

```yaml
slots:
  pattern_id: "## Pattern ID"        # The slug
  quick_summary: "## Quick Summary"   # 1-2 paragraphs
  when_to_use: "## When To Use"       # Bullet list of conditions
  core_mechanism: "## Core Mechanism"  # Detailed how-it-works
  key_rules: "## Key Rules"           # Numbered invariants
  implementation_notes: "## Implementation Notes"  # Practical guidance
  failure_modes: "## Failure Modes"    # What goes wrong
  signals_diagnostics: "## Signals & Diagnostics"  # Three sub-signals
  tradeoffs: "## Tradeoffs"           # Gain vs Cost
  related_patterns: "## Related Patterns"  # Links to other patterns
  source_anchors: "## Source Anchors"  # File:line references to proof code
```

**Extraction approach:**
- The skill reads the full input content
- For each slot, it identifies relevant content from the input and synthesizes it into the slot's expected format
- Each slot is tagged as **[sourced]** (directly derived from input content) or **[inferred]** (generated by the skill because input didn't cover it). The plan review shows these tags so the user knows what to scrutinize
- If a slot has no corresponding input content, the skill notes it as a gap and asks the user during plan review
- The skill also proposes: aliases (2-4 short forms), keywords (4-6 discovery terms), and a scoring guide entry for the advisor

**Plan review format (shown to user):**

```
Pattern: <display_name> (<slug>)
One-liner: <one_liner>

Aliases: <alias1>, <alias2>, <alias3>
Keywords: <kw1>, <kw2>, <kw3>, <kw4>
Advisor scoring: High score when <characteristics>

Source anchors:
  - <file>:<lines> -- <description>
  - <file>:<lines> -- <description>

Slot preview:
  1. Quick Summary: <first 2 sentences>... [sourced]
  2. When To Use: <count> conditions [sourced]
  3. Core Mechanism: <first sentence>... [sourced]
  4. Key Rules: <count> rules [inferred]
  5. Implementation Notes: <first sentence>... [sourced]
  6. Failure Modes: <count> modes [inferred]
  7. Signals & Diagnostics: 3 sub-signals [inferred]
  8. Tradeoffs: Gain/Cost documented [sourced]
  9. Related Patterns: <count> links [inferred]
  10. Source Anchors: <count> anchors [sourced]

Files to create/modify:
  CREATE  .claude/references/patterns/pattern-<slug>.md
  MODIFY  .claude/skills/agentic-dojo/SKILL.md (alias + keyword + zero-state)
  MODIFY  .claude/skills/pattern-advisor/SKILL.md (scoring table)
  CREATE  <proof code files if any>

Approve? (yes / 1-10 to modify a slot / abort)
```

[sourced] = directly derived from input. [inferred] = generated by the skill. Inferred slots deserve extra scrutiny.

**Numbered modification menu:**
If the user enters a number (1-10) or says "modify":
- Show the full content of that slot
- Accept edits inline
- Re-present the plan with updates
- Loop until approved or aborted

This is faster than free-text "what do you want to change?" -- one number, one edit, back to the menu.

### Source Anchor Format

New format for all patterns added via this skill:

```markdown
## Source Anchors

- `.claude/agents/builder.md:L1-L25` -- Builder agent definition with tool constraints
- `.claude/agents/validator.md:L1-L20` -- Validator with disallowedTools enforcement
- `.claude/skills/orchestrator/SKILL.md:L45-L62` -- Dispatch loop implementation
```

**Format:** `<file-path>:L<start>-L<end>` followed by ` -- <description>`

Existing patterns (9) retain their current format (`Source: docs/patterns/<slug>.md on stage/3-full`) until a separate migration task updates them.

### SKILL.md Wiring Conventions

**Alias table** -- append new row, alphabetical by slug:
```
| <alias1>, <alias2> | <slug> |
```

**Keyword table** -- append new row, alphabetical by pattern name:
```
| <kw1>, <kw2>, <kw3>, <kw4> | <Display Name> | .claude/references/patterns/pattern-<slug>.md |
```

**Zero-state list** -- add slug to the 3-column grid, maintaining alphabetical order.

**Advisor scoring table** -- append new row:
```
| <slug> | <characteristic1> + <characteristic2> |
```

### Builder Task Description

The builder receives a single task with an explicit file list. **Critical: slot content from the approved plan must be copied verbatim into the pattern file.** The builder's job is assembly, not rewriting. The plan is the contract.

```
Create the pattern "<display_name>" (<slug>) for the Agentic Dojo.

IMPORTANT: Copy all slot content from the approved plan VERBATIM into
the pattern file. Do not rewrite, summarize, or "improve" the content.
The plan is the contract.

FILES TO CREATE:
- .claude/references/patterns/pattern-<slug>.md

FILES TO MODIFY:
- .claude/skills/agentic-dojo/SKILL.md
- .claude/skills/pattern-advisor/SKILL.md

PATTERN FILE CONTENT:
<full YAML frontmatter + 11 sections as specified in the plan>

SKILL.MD WIRING:
- Add alias row: | <aliases> | <slug> |
- Add keyword row: | <keywords> | <Display Name> | <file path> |
- Add <slug> to zero-state pattern list

ADVISOR WIRING:
- Add scoring row: | <slug> | <scoring description> |

SOURCE ANCHORS:
<anchors from the plan>

PROOF CODE:
<if new code needed, specify what to create and where>
```

### Validator Checklist (12 items)

The validator checks all of these. No short-circuiting -- check everything even if early checks fail.

1. Pattern slug is unique (not in alias table, keyword table, or existing pattern files)
2. Pattern file exists at `.claude/references/patterns/pattern-<slug>.md`
3. YAML frontmatter has all required fields: `slug`, `display_name`, `one_liner`, `slots`
4. All 11 slot keys exist in the frontmatter `slots` map
5. All 11 section headings (`##`) exist in the file body
6. No section is empty (each has at least one line of content below the heading)
7. Alias table in dojo SKILL.md has at least one alias for the new pattern
8. Keyword table in dojo SKILL.md has a row for the new pattern with correct file path
9. Zero-state pattern list in dojo SKILL.md includes the new slug
10. Source anchors reference files that exist in the repo
11. Source anchor line ranges are within file bounds
12. Advisor SKILL.md scoring table has a row for the new pattern

Semantic relevance of source anchors is NOT checked by the validator (Haiku can't reliably judge this). The user approves anchors during plan review in Step 1 -- that's the semantic check.

On VERDICT: FAIL, the validator lists every failed check with specifics.

### Retry Protocol

Same as the orchestrator's retry-with-resume:
- Up to 3 retries using `resume: agentId` to preserve builder context
- Validator feedback included in retry prompt
- On exhaustion: report partial state, then ask user (skip task, provide guidance, abort entirely)

**Partial state report on exhaustion:**
```
Builder failed validation after 3 retries.

Partial state (may need manual cleanup):
  CREATED  .claude/references/patterns/pattern-<slug>.md  [exists]
  MODIFIED .claude/skills/agentic-dojo/SKILL.md           [alias: yes, keyword: no, zero-state: no]
  MODIFIED .claude/skills/pattern-advisor/SKILL.md         [scoring: no]

What would you like to do? (skip / provide guidance / abort)
```

This tells the user exactly what was created so they can clean up if they abort.

### Progress Messages

Phase transitions emit progress messages to the user:

```
[1/3] Pre-flight passed. No collisions. Plan approved.
[2/3] Builder complete. 3 files created/modified. Validating...
[3/3] Validator: PASS. Smoke test passed. Pattern is live.
```

These come from the dispatch loop itself -- the skill emits them at each step boundary. Additionally, all builder and validator dispatches flow through the existing observability pipeline (emit-event.ts + Stop hooks), so the dashboard shows the pattern being built in real time.

### Success Output

After Step 3 completes, show:

```
Pattern "<display_name>" is live in the dojo.

Files created/modified:
  CREATE  .claude/references/patterns/pattern-<slug>.md
  MODIFY  .claude/skills/agentic-dojo/SKILL.md
  MODIFY  .claude/skills/pattern-advisor/SKILL.md

Source anchors:
  - <file>:<lines> -- <description>

Try it now:
  /dojo explain <slug>
  /dojo lookup <slug>
  /advisor "a problem that matches this pattern"
```

The "try it now" commands give the user an immediate dopamine hit -- the pattern is discoverable the moment it's created.

## System-Wide Impact

### Single Source of Truth Migration

This plan establishes `.claude/references/patterns/` as the single source of truth. The existing `docs/patterns/` directory (9 files) becomes redundant.

**Migration strategy:**
- `docs/patterns/` is NOT deleted in this plan (it's a separate cleanup task)
- New patterns created by `/dojo:add-pattern` will NOT have a `docs/patterns/` counterpart
- The "Adding a New Pattern" checklist in CLAUDE.md is updated to point to `/dojo:add-pattern`
- The old manual checklist is retained as a fallback section

### CLAUDE.md Updates

The "Adding a New Pattern" section changes from a manual 6-step checklist to:

```markdown
## Adding a New Pattern

Use `/dojo:add-pattern` to add patterns to the dojo. The skill handles:
collision detection, slot mapping, SKILL.md wiring, validator checks,
and smoke testing.

Input: any markdown file or inline description.
Example: `/dojo:add-pattern docs/brainstorms/my-pattern.md`

### Manual Fallback

If you need to add a pattern without the skill:

1. Create `.claude/references/patterns/pattern-<slug>.md` with YAML frontmatter
   (copy an existing pattern file as template -- verify `slots` map matches
   slot contract)
2. Add alias row to `.claude/skills/agentic-dojo/SKILL.md` Step 1 alias table
3. Add keyword row to SKILL.md Step 1 keyword table
4. Add slug to SKILL.md zero-state pattern list
5. If Pattern Advisor exists: add scoring row to advisor SKILL.md

### Pattern Maintenance (Escape Hatch)

Patterns are immutable once added. For minor fixes, edit manually:

| What changed | File to edit |
|---|---|
| Slot content (typo, wording) | `.claude/references/patterns/pattern-<slug>.md` |
| Alias wrong/missing | `.claude/skills/agentic-dojo/SKILL.md` alias table |
| Keyword wrong/missing | `.claude/skills/agentic-dojo/SKILL.md` keyword table |
| Source anchor lines shifted | Pattern file Source Anchors section |
| Advisor scoring issue | `.claude/skills/pattern-advisor/SKILL.md` scoring table |
```

### Interaction with Existing Skills

| Skill | Impact |
|-------|--------|
| `/dojo` | Gains new patterns in its routing tables. No code changes to dojo SKILL.md beyond table rows. |
| `/advisor` | Gains new patterns in its scoring table. No code changes beyond table rows. |
| `/orchestrate` | Not invoked. The add-pattern skill has its own dispatch loop. |

## Acceptance Criteria

### Functional Requirements

- [ ] `/dojo:add-pattern <file>` auto-detects file path and reads it
- [ ] `/dojo:add-pattern "<inline text>"` accepts inline descriptions
- [ ] Collision check blocks if slug, alias, keyword, or advisor row already exists
- [ ] Collision error messages point to Pattern Maintenance for existing patterns
- [ ] Slug derived via priority cascade (frontmatter slug > topic > heading > ask)
- [ ] Plan review shows numbered slots with [sourced]/[inferred] tags
- [ ] User can modify slots by number (numbered modification menu)
- [ ] Builder copies approved slot content verbatim into pattern file
- [ ] Builder wires dojo SKILL.md (alias table, keyword table, zero-state list)
- [ ] Builder wires advisor SKILL.md (scoring table row)
- [ ] Builder creates/identifies proof code with source anchors
- [ ] Validator independently checks all 12 checklist items
- [ ] Validator reports VERDICT: PASS or VERDICT: FAIL with specific failures
- [ ] Retry with resume works (up to 3x, then partial state report + user escalation)
- [ ] Smoke test: `/dojo explain <new-pattern>` works after PASS
- [ ] Success output includes "try it now" commands
- [ ] Progress messages at each step transition ([1/3], [2/3], [3/3])
- [ ] Pattern file is immutable after creation (no update mechanism)

### Non-Functional Requirements

- [ ] Skill SKILL.md under 250 lines (target -- extract to references if exceeded)
- [ ] Single task dispatch (not a multi-task DAG)
- [ ] Builder task description includes explicit file list
- [ ] Source anchors use `file:L<start>-L<end>` format
- [ ] All table insertions maintain alphabetical order

### Quality Gates

- [ ] End-to-end test: add a real pattern (pattern #10) using the skill
- [ ] Collision test: attempt to add an existing pattern (builder-validator)
- [ ] Alias collision test: propose an alias owned by another pattern
- [ ] Thin input test: provide minimal notes and verify the skill asks for more
- [ ] FAIL + retry test: intentionally cause a validator failure and verify retry works
- [ ] Smoke test confirms routing chain works

## Implementation Phases

### Phase 1: Skill skeleton + Step 1 (Commit 1)

Create the skill directory, SKILL.md with the 3-step protocol, pre-flight (collision checks, smart input detection, slug derivation), and plan generation (slot mapping with sourced/inferred tags, numbered modification menu).

**Files:**

| File | Action |
|------|--------|
| `.claude/skills/agentic-dojo/add-pattern/SKILL.md` | Create -- skill with 3-step dispatch protocol, Step 1 complete |
| `.claude/CLAUDE.md` | Modify -- update "Adding a New Pattern" section |

**Success criteria:**
- Skill exists and is invokable as `/dojo:add-pattern`
- Smart input detection works (file path vs inline text)
- Slug derivation follows priority cascade
- Collision check works (blocks on existing slug/alias/keyword/advisor)
- Plan review shows numbered slots with [sourced]/[inferred] tags
- User can modify by number and re-approve
- Empty arguments shows usage help

### Phase 2: Steps 2-3 dispatch + reporting (Commit 2)

Add the dispatch loop: builder creates artifacts (copying verbatim), validator checks the 12-item checklist, retry on failure, smoke test, progress messages, and success output with "try it now" commands.

**Files:**

| File | Action |
|------|--------|
| `.claude/skills/agentic-dojo/add-pattern/SKILL.md` | Modify -- add Steps 2-3 |

**Success criteria:**
- Builder creates pattern file with valid frontmatter + 11 sections (verbatim from plan)
- Builder wires dojo SKILL.md and advisor SKILL.md
- Validator checks all 12 items
- Retry with resume works, partial state reported on exhaustion
- Smoke test confirms routing works
- Progress messages at each step transition
- Success output includes "try it now" commands

### Phase 3: Pattern #10 end-to-end test (Commit 3)

Use the skill to add a real pattern. This proves the full pipeline works and produces the dojo's 10th pattern.

**Files:**

| File | Action |
|------|--------|
| `.claude/references/patterns/pattern-<slug>.md` | Create (by the skill) |
| `.claude/skills/agentic-dojo/SKILL.md` | Modify (by the skill -- routing tables) |
| `.claude/skills/pattern-advisor/SKILL.md` | Modify (by the skill -- scoring table) |
| Proof code files | Create/identify (by the skill) |

**Success criteria:**
- Pattern #10 is live in the dojo
- `/dojo explain <pattern-10>` works
- `/advisor` can recommend pattern #10
- Source anchors resolve to real code
- Success output shows "try it now" commands that actually work

## Alternative Approaches Considered

**1. Use the full `/orchestrate` protocol**
Rejected: The 12-step orchestrator handles clarifying questions, DAG decomposition, wave computation, spec files -- none of which apply. Adding a pattern is a fixed 1-task structure. A lightweight dispatch loop is cleaner and cheaper.

**2. Direct skill (no agents)**
Rejected: No independent validation. The builder/validator separation is the quality guarantee. Without it, structural errors slip through.

**3. Guided wizard (interactive slot-by-slot)**
Rejected: Too many context switches. The skill reads the input and proposes everything at once. One approval checkpoint, not eleven.

**4. Separate brainstorm/plan/add steps**
Rejected: Three commands = three context switches = pattern ideas dying in the gap. One command preserves momentum. (see brainstorm: DX/ADHD rationale)

**5. Dedicated `src/patterns/<slug>/` for proof code**
Rejected: Creates toy reproductions of things that already exist as working artifacts. The builder/validator pattern's proof IS the agent files. Source anchors are pointers, not copies. (see brainstorm: staff engineer DX analysis)

## Dependencies and Prerequisites

- Dojo SKILL.md must exist and be working (it does -- 219 lines on current branch)
- Advisor SKILL.md must exist (it does -- ~160 lines)
- Builder and validator agent definitions must exist (they do -- `.claude/agents/`)
- At least one pattern file must exist as a template (9 exist)

## Risk Analysis and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Builder produces slots with filler content | Medium | Low-quality pattern enters dojo | Plan review shows slot previews. User catches filler before approving. |
| Source anchor line numbers shift after adding | Medium | Anchors become stale | Documented in Pattern Maintenance. Manual fix is one section in one file. |
| Collision check misses an alias overlap | Low | Wrong pattern routed | Check all existing aliases before proposing new ones. Validator double-checks. |
| Builder fails to wire all 3 routing tables | Medium | Pattern undiscoverable | Validator checks all 3 tables independently. |
| Input markdown too thin for 11 slots | Medium | Skill generates weak content | Skill detects thin input during plan generation and flags gaps for user to fill. |
| SKILL.md becomes too long with table growth | Low | Routing degradation | Current SKILL.md is 219 lines (31 under ceiling). Each pattern adds ~3 lines. Room for ~10 more patterns. |
| Smoke test fails despite validator PASS | Low | Routing wiring error | Smoke test catches it. User sees the failure and can manually fix. |
| Partial builder completion (file created but tables not wired) | Medium | Orphaned pattern file | Validator catches missing table entries. Builder retry fixes. If all retries fail, partial state report shows exactly what exists for manual cleanup. |

## File Summary

**New files: 1**

| File | Role | Phase |
|------|------|-------|
| `.claude/skills/agentic-dojo/add-pattern/SKILL.md` | Add-pattern skill with 3-step dispatch protocol | 1-2 |

**Modified files: 1 (by the plan itself)**

| File | Changes | Phase |
|------|---------|-------|
| `.claude/CLAUDE.md` | Update "Adding a New Pattern" section + add Pattern Maintenance | 1 |

**Modified files: 3 (by the skill's builder on each invocation)**

| File | Changes | When |
|------|---------|------|
| `.claude/references/patterns/pattern-<slug>.md` | New pattern file | Each add-pattern run |
| `.claude/skills/agentic-dojo/SKILL.md` | Alias + keyword + zero-state rows | Each add-pattern run |
| `.claude/skills/pattern-advisor/SKILL.md` | Scoring table row | Each add-pattern run |

## Sources and References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-22-add-pattern-skill-brainstorm.md](../brainstorms/2026-02-22-add-pattern-skill-brainstorm.md) -- Key decisions carried forward: single source of truth (.claude/references/patterns/), pattern immutability, dogfood builder/validator dispatch, one-command pipeline, source anchors as pointers to real code

### Internal References

- Dojo SKILL.md: `.claude/skills/agentic-dojo/SKILL.md` (routing tables, slot contract)
- Advisor SKILL.md: `.claude/skills/pattern-advisor/SKILL.md` (scoring table)
- Pattern file template: `.claude/references/patterns/pattern-builder-validator.md` (slot contract example)
- Builder agent: `.claude/agents/builder.md` (tool constraints)
- Validator agent: `.claude/agents/validator.md` (disallowedTools)
- Orchestrator dispatch protocol: `.claude/skills/orchestrator/SKILL.md` (reference for dispatch loop)
- Existing manual checklist: `.claude/CLAUDE.md` "Adding a New Pattern" section

### Product Strategy Context

This skill is priority #1 in the product strategy (see brainstorm session 2026-02-22). The Agentic Dojo is a handcrafted pattern library with a HOP-powered delivery system. `/dojo:add-pattern` is the growth engine -- without it, the library stagnates.
