# Plan: Agentic Dojo Skill

## Task Description

Build the `agentic-dojo` skill -- a Claude Code skill that packages all 9 orchestration patterns from stages 1-3 into a router-based knowledge system with two character-voiced interaction modes (Sensei and Reference). The skill uses a Higher-Order Prompt (HOP) architecture where SKILL.md is the fixed wrapper (classify, dispatch, synthesize) and mode/voice/pattern files are variable parameters. Also build a companion Pattern Advisor skill that recommends patterns based on plan descriptions.

The detailed source plan is at `docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md` on this branch. It has been through 5 review rounds (44 findings resolved) and contains the full architecture, file structure, test matrix, and acceptance criteria.

## Objective

When complete:
- `/dojo explain wave computation` teaches the wave computation pattern in Mr. Miyagi's voice
- `/dojo lookup retry` returns a structured YAML reference card in JARVIS's voice
- `/dojo` with no args shows a zero-state menu of modes and patterns
- `/advisor "my plan description"` recommends matching patterns in Alfred's voice
- All 9 pattern docs from `docs/patterns/` on `stage/3-full` are available as shared reference files
- Agent-native parity: every response includes a `dojo-envelope` block with routing metadata

## Problem Statement

The orchestrator-prototype has 9 pattern docs, a full skill, agent definitions, and specs across stages 1-3. This knowledge is scattered across files and branches -- useful for reading, but not queryable. The dojo makes it interactive and accessible.

## Solution Approach

A single skill whose SKILL.md is a HOP -- it classifies intent (mode + pattern), loads the right parameter files, and synthesizes the response. Mode files declare HOW to present (voice ID + synthesis template). Voice files declare HOW to sound. Pattern files declare WHAT to present (content with canonical slot maps). No file does two jobs.

### Branch Strategy

**Stay on the current branch.** Do NOT switch to or branch from `stage/3-full`.

Why: The plan file, spec, brainstorm, and all planning artifacts live on the current branch (`chore/fold-claude-code-guide-findings`). Switching to `stage/3-full` would lose access to all of them.

The 9 source pattern docs live on `stage/3-full` but are accessible via `git show`:
```bash
git show stage/3-full:docs/patterns/builder-validator.md
git show stage/3-full:docs/patterns/dispatch-loop.md
# etc.
```

The existing orchestrator SKILL.md (for conventions reference) is also accessible:
```bash
git show stage/3-full:.claude/skills/orchestrator/SKILL.md
```

All new dojo files are created directly on the current branch.

## Relevant Files

### Source Pattern Docs (on `stage/3-full`, access via `git show`)

Read these with `git show stage/3-full:docs/patterns/<filename>`:
- `docs/patterns/builder-validator.md`
- `docs/patterns/dispatch-loop.md`
- `docs/patterns/fast-path-gate.md`
- `docs/patterns/higher-order-prompt.md`
- `docs/patterns/iterative-refinement.md`
- `docs/patterns/retry-with-resume.md`
- `docs/patterns/spec-as-source-of-truth.md`
- `docs/patterns/task-dag.md`
- `docs/patterns/wave-computation.md`

### Convention References (on `stage/3-full`, access via `git show`)

- `.claude/skills/orchestrator/SKILL.md` -- existing 710-line skill (DO NOT copy its `use-when` pattern -- proven non-functional)
- `.claude/skills/orchestrator/references/dag-execution.md` -- existing reference file format

### Planning Artifacts (on current branch, direct file access)

- `docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md` -- the source plan (THE source of truth)
- `specs/agentic-dojo-skill.md` -- this spec

### Files to Modify (on current branch)

- `.claude/CLAUDE.md` -- add "Adding a New Pattern" checklist
- `.gitignore` -- add `test-results/`

### New Files to Create

**Dojo skill (5 files):**
- `.claude/skills/agentic-dojo/SKILL.md` -- the HOP router (~150-200 lines)
- `.claude/skills/agentic-dojo/references/mode-sensei.md` -- Sensei mode parameters
- `.claude/skills/agentic-dojo/references/mode-reference.md` -- Reference mode parameters
- `.claude/skills/agentic-dojo/references/voice-miyagi.md` -- Miyagi voice rules
- `.claude/skills/agentic-dojo/references/voice-jarvis.md` -- JARVIS voice rules

**Shared pattern library (9 files):**
- `.claude/references/patterns/pattern-builder-validator.md`
- `.claude/references/patterns/pattern-dispatch-loop.md`
- `.claude/references/patterns/pattern-higher-order-prompt.md`
- `.claude/references/patterns/pattern-task-dag.md`
- `.claude/references/patterns/pattern-wave-computation.md`
- `.claude/references/patterns/pattern-spec-as-source-of-truth.md`
- `.claude/references/patterns/pattern-retry-with-resume.md`
- `.claude/references/patterns/pattern-fast-path-gate.md`
- `.claude/references/patterns/pattern-iterative-refinement.md`

**Pattern Advisor skill (3 files):**
- `.claude/skills/pattern-advisor/SKILL.md` -- Advisor HOP wrapper
- `.claude/skills/pattern-advisor/references/mode-advisor.md` -- Advisor mode parameters
- `.claude/skills/pattern-advisor/references/voice-alfred.md` -- Alfred voice rules

## Implementation Phases

### Phase 1: Foundation

Create directory structure, the complete SKILL.md HOP, and stub files for all references so the router never points to missing files. Update `.claude/CLAUDE.md` with "Adding a New Pattern" checklist. NO branch switching.

### Phase 2: Core Implementation (Modes + Voices)

Write the 4 reference files that define how the dojo presents and sounds:
- `mode-sensei.md` -- teaching mode with section-ordering synthesis template, voice_id = miyagi
- `mode-reference.md` -- lookup mode with YAML output synthesis template, voice_id = jarvis
- `voice-miyagi.md` -- Mr. Miyagi voice rules (imperative framing)
- `voice-jarvis.md` -- JARVIS voice rules (imperative framing)

### Phase 3: Shared Pattern Library

Adapt all 9 source pattern docs into shared reference files at `.claude/references/patterns/`. Read source docs via `git show stage/3-full:docs/patterns/<slug>.md`. Each file gets canonical YAML frontmatter with the slot map.

### Phase 4: Integration & Polish (Testing)

Manual interactive smoke testing of the 29-test routing matrix. Envelope-based verification. Document results. Add `test-results/` to `.gitignore`. (Human-only -- not automated.)

### Phase 5: Pattern Advisor Skill

Build the companion skill with `name: advisor`, Alfred Pennyworth voice, pattern scoring, and `/dojo` handoff commands as copy-paste suggestions.

---

## SKILL.md Draft (Inline -- Complete Hardened Version)

This is the exact content for `.claude/skills/agentic-dojo/SKILL.md`. Builders should use this verbatim (the draft has been through 5 review rounds).

```markdown
---
name: dojo
description: >-
  Pattern knowledge for agentic orchestration. Teaches dispatch loops,
  DAGs, wave computation, retry, HOP, builder-validator, iterative
  refinement, fast path, spec files, idempotency, topological sort,
  task decomposition, and agent coordination through two modes.
  Use when: the user asks about agentic patterns, orchestration concepts,
  dispatch loops, DAG execution, wave computation, retry logic, higher-order
  prompts, builder-validator, spec files, fast path, or iterative
  refinement. Also use when an agent queries for pattern guidance.
argument-hint: "e.g. 'explain wave computation' or 'lookup retry'"
allowed-tools: Read, Glob, Grep
---

# Agentic Dojo

A Higher-Order Prompt for pattern knowledge. This skill never generates
content itself -- it classifies intent, loads mode + pattern parameters,
and synthesizes them through scoped instructions.

This skill never writes code, creates files, or modifies the codebase.

IMPORTANT: Every response MUST end with a dojo-envelope block (see
Envelope Format below). Do not skip it.

---

## Step 1: Route

Classify mode and pattern from $ARGUMENTS. If empty or matches a
reserved keyword (help, list, patterns, modes, ?), emit zero-state
and stop.

Zero-state (max 12 lines):

Agentic Dojo -- pattern knowledge for orchestration

Modes:
  explain <pattern>    Sensei teaches the concept (default)
  lookup <pattern>     Quick reference with structured output

Patterns:
  builder-validator    dispatch-loop     higher-order-prompt
  task-dag             wave-computation  spec-as-source-of-truth
  retry-with-resume    fast-path-gate    iterative-refinement

Examples:
  /dojo explain wave computation    (short forms: wave, dag, spec, hop...)
  /dojo lookup retry-with-resume

### Mode Detection

Priority cascade (first match wins):

**1. Prefix override** -- if $ARGUMENTS starts with a prefix below,
strip it and use the mapped mode. Remaining text = pattern query.

| Prefix | Mode |
|--------|------|
| sensei: | sensei |
| explain: | sensei |
| reference: | reference |
| lookup: | reference |

**2. Trigger words** -- classify from the query text.

| Query Signals | Mode |
|---------------|------|
| explain, teach, how does, why does, understand, what is | Sensei |
| lookup, define, quick, list, yaml | Reference |
| (both Sensei and Reference signals present) | Sensei |
| (no clear signal) | Sensei |

Sensei is the default for human queries. Bare pattern slugs with no
conversation context (agent invocations) default to Reference.

### Pattern Detection

**1. Alias table** -- each alias matched as a complete word. No substring matching.

| Alias | Resolves To |
|-------|-------------|
| wave, waves | wave-computation |
| dag, graph | task-dag |
| retry, resume | retry-with-resume |
| hop | higher-order-prompt |
| fast, gate | fast-path-gate |
| spec, source-of-truth, source, plan-file | spec-as-source-of-truth |
| builder, validator | builder-validator |
| dispatch, loop | dispatch-loop |
| refine, iterate | iterative-refinement |

**2. Keyword table** -- if no alias matched.

| Keywords | Pattern | File |
|----------|---------|------|
| builder, validator, verify, executor, critic | Builder/Validator | .claude/references/patterns/pattern-builder-validator.md |
| dispatch, loop, coordinator, queue | Dispatch Loop | .claude/references/patterns/pattern-dispatch-loop.md |
| HOP, higher-order, parameterize, agent-agnostic | Higher-Order Prompt | .claude/references/patterns/pattern-higher-order-prompt.md |
| DAG, task graph, decompose, dependencies | Task DAG | .claude/references/patterns/pattern-task-dag.md |
| wave, topological, parallel, execution order | Wave Computation | .claude/references/patterns/pattern-wave-computation.md |
| spec, source of truth, plan file, persist | Spec as Source of Truth | .claude/references/patterns/pattern-spec-as-source-of-truth.md |
| retry, resume, failure, recover, idempotent | Retry with Resume | .claude/references/patterns/pattern-retry-with-resume.md |
| fast path, simple, skip, gate, threshold | Fast Path Gate | .claude/references/patterns/pattern-fast-path-gate.md |
| refine, iterate, clarify, improve, feedback | Iterative Refinement | .claude/references/patterns/pattern-iterative-refinement.md |
| (no pattern match) | -- | Show pattern index and ask user to clarify |

**3. Conversation fallback** -- if no pattern detected from $ARGUMENTS,
check if a pattern was discussed in the preceding conversation turns.

### Error Contract

| Condition | Message | Behavior |
|-----------|---------|----------|
| Unknown pattern | `Pattern "{input}" not found. Available: {list}. Did you mean "{closest}"?` | If input prefixes exactly one slug or alias, suggest it. Otherwise list all without a specific suggestion |
| Unknown mode | `Mode "{input}" not recognized. Available modes: explain (sensei), lookup (reference).` | Show both user-facing and internal names |
| Multiple patterns detected | `Multiple patterns detected: {list}. Which one would you like?` | List matches and ask user to pick. Do not auto-select |
| Missing synthesis slot | `[Not documented for this pattern]` | Inline substitution, do not fail |

If no pattern in the alias table, keyword table, or conversation
context matches the input, say so explicitly. Do not force-match a
low-confidence result. It is correct to say "Pattern not found" when
no pattern matches.

## What This Skill Does NOT Do

- Never writes code, creates files, or modifies the codebase
- Never executes scripts or runs commands
- Does not cover patterns from stages 4-9 (team profiles, HITL, parallel dispatch, etc.)
- Does not cover Parallel Dispatch (stage 8) -- distinct from wave-level parallelism
- Does not cover Difficulty Routing (stage 6) -- distinct from Fast Path Gate
- Does not replace the orchestrator skill -- this teaches patterns, that executes them
- Does not compare patterns side-by-side (v2 consideration)

## Step 2: Read

Read these three files in order:

1. The mode file matching the detected mode:
   - Sensei: `references/mode-sensei.md` -- note the Voice ID
   - Reference: `references/mode-reference.md` -- note the Voice ID
2. The pattern file from the File column in the keyword table above
3. The voice file matching the Voice ID from the mode file:
   - miyagi: `references/voice-miyagi.md`
   - jarvis: `references/voice-jarvis.md`

## Step 3: Synthesize

Generate the response:
- Line 1: breadcrumb [Mode | Pattern Display Name]
- Body: follow the mode's Synthesis Template, using the pattern's
  slot content as source material (reference by slot name, do not
  expand inline). Write in the voice specified by the voice file.
  Use imperative voice rules from the voice file -- they take precedence.
  If a slot has no content, write '[Not documented for this pattern]'.
- Do not add content, formatting, or structure beyond what the
  template and voice specify.

IMPORTANT: End every response with the routing envelope. Do not skip it.

## Worked Example

Input: /dojo explain wave computation

Step 1 (Route):
  "explain wave computation" is not a reserved keyword. Continue.
  No prefix override (no colon). Check trigger words.
  "explain" matches Sensei trigger. Mode = Sensei.
  "wave computation" matches alias "wave" -> wave-computation.
  Pattern = wave-computation. Route reason: trigger-word: explain

Step 2 (Read):
  1. Read references/mode-sensei.md. Voice ID = miyagi.
  2. Read .claude/references/patterns/pattern-wave-computation.md.
  3. Read references/voice-miyagi.md.

Step 3 (Synthesize):
  Line 1: [Sensei | Wave Computation]
  Body: Follow Sensei template sections in Miyagi voice using
        wave-computation slots as source material
  Last: dojo-envelope block with route metadata

## Envelope Format

Every response MUST end with a routing envelope in a fenced code block
using the `dojo-envelope` info string (not `yaml`):

\`\`\`dojo-envelope
mode_selected: sensei
pattern_selected: wave-computation
route_reason: "trigger-word: explain"
warnings: []
\`\`\`

`route_reason` values:
- `prefix-override: sensei:` (or `reference:`, `explain:`, `lookup:`)
- `exact-slug`
- `alias: wave`
- `trigger-word: explain`
- `conversation-context`
- `default`

No `confidence` field. Confidence is derivable from route_reason:
prefix-override and exact-slug are high, trigger-word and alias are
medium, default is low.
```

---

## Canonical Pattern Frontmatter (Slot Contract)

Every pattern file includes this YAML frontmatter with an explicit slot map. All pattern files use identical slot key names.

```yaml
---
slug: <pattern-slug>
display_name: <Pattern Display Name>
one_liner: <Single sentence description>
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
```

Mode synthesis templates reference slots by name as section-ordering instructions. They do NOT use inline `{{pattern.*}}` expansion (breaks on multi-line content). Instead, each numbered item tells Step 3 which slot content to present and how to frame it.

## Mode File Structure

Mode files are variable parameters for the HOP. They declare WHAT the format is and WHICH voice to use. SKILL.md Step 3 uses these declarations to synthesize the response. Each ~80-120 lines.

```markdown
# [Mode Name] Mode

**Character:** [Name] ([Source])
**Purpose:** [When to use this mode]

---

## Voice ID

[Reference to a voice file, e.g., `miyagi` or `jarvis`]

## Synthesis Template

[Section-ordering instructions referencing slot names. Each numbered
item tells SKILL.md Step 3 which slot content to present and how
to frame it.]

Generate these sections in order:
1. [Section instruction referencing a slot name]
2. [Section instruction referencing a slot name]
...

## Constraints

[Do's, don'ts, and fallback rules for this mode]
```

**Sensei synthesis template sections:**
1. Opening analogy (1-2 sentences connecting the pattern to everyday experience)
2. "Summary" -- present the pattern's Quick Summary slot
3. "How It Works" -- explain using the pattern's Core Mechanism slot
4. "Key Rules" -- present the pattern's Key Rules slot
5. "In Practice" -- walk through the pattern's Implementation Notes slot
6. "Watch Out" -- list the pattern's Failure Modes slot as pitfalls
7. "See Also" -- reference the pattern's Related Patterns slot

**Reference synthesis template:** Produces structured YAML output using pattern slots (pattern_id, display_name, one_liner, when_to_use, core_mechanism, key_rules, implementation_notes, failure_modes, related_patterns).

## Voice File Structure

Voice files are variable parameters for the HOP. They declare HOW to sound. Each ~60-100 lines.

```markdown
# [Voice Name]

**Character:** [Name] ([Source])
**Purpose:** [When to use this voice]

---

## Voice Rules

[Character description, voice personality, stance]

## Pacing

[Sentence length, rhythm, cadence]

## Lexicon

[Preferred terms, phrasing]

## Substitutions

| Instead of | Use |
|------------|-----|
| optimize | refine |
| algorithm | approach |

## Do / Don't

[Do's and don'ts -- use imperative framing: "Always X", "Never Y"]

## Quote Policy

[Paraphrase-first; short quotes only if allowed]
```

**Miyagi voice:** Martial arts/garden metaphors, short sentences, pauses via dashes, paraphrase only (no direct Miyagi quotes), warm but firm.

**JARVIS voice:** Technical precision, clipped sentences, measured lexicon, British understatement, no direct quotes.

**Alfred voice (advisor):** Experienced counsel, practical wisdom, dry wit, "might I suggest..." framing, understated tone, no direct quotes.

## Adding a New Pattern Checklist (for CLAUDE.md)

Append this to `.claude/CLAUDE.md`:

```markdown
## Adding a New Pattern

1. Write source doc in `docs/patterns/<slug>.md`
2. Create `.claude/references/patterns/pattern-<slug>.md` with YAML frontmatter
   (copy an existing pattern file as template -- verify `slots` map matches
   slot contract)
3. Add keyword row to `.claude/skills/agentic-dojo/SKILL.md` Step 2 pattern table
4. Add aliases to SKILL.md Step 2 alias table
5. Add slug to SKILL.md zero-state pattern list
6. If Pattern Advisor exists: verify advisor SKILL.md can score the new pattern
```

---

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
  - Name: builder-foundation
  - Role: Phase 1 -- directories, SKILL.md HOP, stubs, CLAUDE.md update
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-foundation
  - Role: Validate Phase 1 -- SKILL.md structure, frontmatter, stubs, line count, HOP purity
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Builder
  - Name: builder-modes
  - Role: Phase 2 -- write mode-sensei, mode-reference, voice-miyagi, voice-jarvis
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-modes
  - Role: Validate Phase 2 -- mode files are parameter declarations, voice files use imperative framing, line counts
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Builder
  - Name: builder-patterns
  - Role: Phase 3 -- adapt 9 pattern docs into shared references with canonical frontmatter
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-patterns
  - Role: Validate Phase 3 -- slot maps match contract, mode-agnostic, line counts, cross-check with mode templates
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Builder
  - Name: builder-advisor
  - Role: Phase 5 -- create Pattern Advisor skill, mode-advisor, voice-alfred
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-advisor
  - Role: Validate Phase 5 -- advisor SKILL.md, scoring logic, handoff commands, Alfred voice distinct
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.
- IMPORTANT: Do NOT switch branches. All work happens on the current branch.
- Source pattern docs are read via `git show stage/3-full:docs/patterns/<filename>`.

### 1. Create Directory Structure and SKILL.md
- **Task ID**: create-foundation
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Do NOT switch branches. Work on the current branch.
- Create directories: `.claude/references/patterns/`, `.claude/skills/agentic-dojo/references/`, `.claude/skills/pattern-advisor/references/`
- Write `.claude/skills/agentic-dojo/SKILL.md` using the SKILL.md Draft from this spec (copy verbatim from the "SKILL.md Draft" section above). NOTE: the escaped backticks `\`\`\`` in the Envelope Format section should be written as actual triple backticks in the output file.
- Create stub files for all 4 dojo references (mode-sensei, mode-reference, voice-miyagi, voice-jarvis) -- each stub should have a `# [Name]` header and a one-liner placeholder like "Content will be added in Phase 2."
- Create 9 pattern stubs at `.claude/references/patterns/pattern-*.md` -- each with YAML frontmatter containing `slug`, `display_name`, `one_liner: "Stub -- content will be added in Phase 3"` and a placeholder body
- Read `.claude/CLAUDE.md` and append the "Adding a New Pattern" checklist from this spec
- Commit with message: `feat(dojo): add SKILL.md HOP router and directory structure`

### 2. Validate Foundation
- **Task ID**: validate-foundation
- **Depends On**: create-foundation
- **Assigned To**: validator-foundation
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify `.claude/skills/agentic-dojo/SKILL.md` exists and is under 250 lines
- Verify SKILL.md frontmatter has: `name: dojo`, `description` (with inline trigger conditions), `argument-hint`, `allowed-tools: Read, Glob, Grep` -- NO `use-when` field
- Verify SKILL.md has 3-step structure: Step 1 (Route), Step 2 (Read), Step 3 (Synthesize)
- Verify SKILL.md contains zero mode-specific conditionals (HOP purity -- no "if Reference mode" or "if Sensei mode")
- Verify envelope instruction appears twice (once near top: "Every response MUST end with", once at end of Step 3: "End every response with")
- Verify SKILL.md has: error contract table, "What This Skill Does NOT Do" section, worked example, envelope format section
- Verify all 4 dojo reference stubs exist in `.claude/skills/agentic-dojo/references/`
- Verify all 9 pattern stubs exist in `.claude/references/patterns/`
- Verify `.claude/CLAUDE.md` has "Adding a New Pattern" section
- Report PASS or FAIL with specific failures listed

### 3. Write Mode and Voice Files
- **Task ID**: write-modes-voices
- **Depends On**: validate-foundation
- **Assigned To**: builder-modes
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read this spec file (`specs/agentic-dojo-skill.md`) for mode/voice file structures and content guidance
- Read the detailed plan at `docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md` for additional context on mode/voice specs (Phase 2 section)
- Replace stub `references/mode-sensei.md` with full teaching mode parameter declaration (~80-120 lines): Character: Mr. Miyagi, voice_id: miyagi, synthesis template as section-ordering instructions (see Sensei synthesis template sections in this spec), constraints
- Replace stub `references/mode-reference.md` with full lookup mode parameter declaration (~80-120 lines): Character: JARVIS, voice_id: jarvis, synthesis template producing structured YAML output, constraints
- Replace stub `references/voice-miyagi.md` with Miyagi voice rules (~60-100 lines): Use imperative framing ("Always use...", "Never say..."), pacing (short sentences, pauses via dashes), lexicon (martial arts metaphors, garden metaphors), substitution table, Do/Don't, quote policy (paraphrase only, no direct Miyagi quotes)
- Replace stub `references/voice-jarvis.md` with JARVIS voice rules (~60-100 lines): Use imperative framing, pacing (precise, clipped), lexicon (technical, measured), substitution table, Do/Don't, quote policy (no direct quotes)
- Commit with message: `feat(dojo): add mode and voice reference files`

### 4. Validate Mode and Voice Files
- **Task ID**: validate-modes-voices
- **Depends On**: write-modes-voices
- **Assigned To**: validator-modes
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify both mode files are parameter declarations (voice ID + synthesis template + constraints) -- NOT synthesis logic
- Verify mode-sensei has voice_id = miyagi (or equivalent), synthesis template as numbered section-ordering referencing slot names
- Verify mode-reference has voice_id = jarvis (or equivalent), synthesis template producing YAML output
- Verify both voice files use imperative framing ("Always...", "Never...") not passive descriptions
- Verify each mode file is 80-120 lines, each voice file is 60-100 lines
- Verify no mode file contains synthesis logic -- that belongs in SKILL.md Step 3
- Verify SKILL.md still contains zero mode-specific logic after mode files are written
- Report PASS or FAIL

### 5. Write Shared Pattern Library
- **Task ID**: write-patterns
- **Depends On**: validate-modes-voices
- **Assigned To**: builder-patterns
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- IMPORTANT: Read source pattern docs via `git show stage/3-full:docs/patterns/<filename>` (they are NOT in the working tree)
- Read all 9 source docs: `git show stage/3-full:docs/patterns/builder-validator.md`, etc.
- Read mode-sensei.md and mode-reference.md synthesis templates to know which slot keys are referenced
- For each of the 9 patterns, replace the stub at `.claude/references/patterns/pattern-<slug>.md` with the full adapted version:
  - YAML frontmatter: `slug`, `display_name`, `one_liner`, and `slots` map with all canonical keys (pattern_id, quick_summary, when_to_use, core_mechanism, key_rules, implementation_notes, failure_modes, signals_diagnostics, tradeoffs, related_patterns, source_anchors)
  - Body sections matching the slot map headings
  - Content adapted from the source doc -- no content lost, but reformatted to match slot contract
  - Mode-agnostic: no presentation framing, just neutral content
  - Target: 80-120 lines each
- Cross-check: every slot key referenced in mode synthesis templates exists in every pattern's frontmatter `slots` map
- Commit with message: `feat(dojo): add shared pattern library with canonical slot maps`

### 6. Validate Pattern Library
- **Task ID**: validate-patterns
- **Depends On**: write-patterns
- **Assigned To**: validator-patterns
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify all 9 pattern files exist at `.claude/references/patterns/pattern-*.md`
- Verify each has YAML frontmatter with `slug`, `display_name`, `one_liner`, and `slots` map
- Verify all `slots` maps use identical key names matching the slot contract: pattern_id, quick_summary, when_to_use, core_mechanism, key_rules, implementation_notes, failure_modes, signals_diagnostics, tradeoffs, related_patterns, source_anchors
- Verify each file is 80-120 lines
- Verify no mode-specific content in pattern files (no "In Sensei mode...", no presentation framing)
- Verify cross-links from SKILL.md pattern table File column point to existing files
- Spot-check 2-3 patterns: run `git show stage/3-full:docs/patterns/<slug>.md` and verify no source content was lost in adaptation
- Report PASS or FAIL

### 7. Build Pattern Advisor Skill
- **Task ID**: build-advisor
- **Depends On**: validate-patterns
- **Assigned To**: builder-advisor
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read this spec and the plan document Phase 5 section for advisor specs
- Write `.claude/skills/pattern-advisor/SKILL.md` with `name: advisor` frontmatter -- classification logic that extracts plan characteristics from $ARGUMENTS, scores each pattern using When To Use and Signals & Diagnostics slots, loads top 3 patterns
- Write `references/mode-advisor.md` -- synthesis template with ranked recommendations and `/dojo` commands as copy-paste suggestions in "Next Steps"
- Write `references/voice-alfred.md` -- Alfred Pennyworth voice rules (experienced counsel, practical wisdom, dry wit, "might I suggest..." framing), imperative framing
- Add `test-results/` to `.gitignore`
- Commit with message: `feat(advisor): add pattern advisor skill with Alfred voice`

### 8. Validate Pattern Advisor
- **Task ID**: validate-advisor
- **Depends On**: build-advisor
- **Assigned To**: validator-advisor
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify `.claude/skills/pattern-advisor/SKILL.md` exists with `name: advisor` frontmatter
- Verify advisor uses shared pattern files at `.claude/references/patterns/` via explicit Read paths
- Verify synthesis template includes `/dojo` commands as copy-paste suggestions in Next Steps
- Verify voice-alfred.md is distinct from voice-miyagi.md and voice-jarvis.md
- Verify `test-results/` is in `.gitignore`
- Report PASS or FAIL

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: validate-advisor
- **Assigned To**: validator-foundation
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Count total new files -- should be 17
- Verify dojo SKILL.md under 250 lines
- Verify no `use-when` frontmatter in any SKILL.md
- Verify both SKILL.md files use `name:` to create slash commands (no separate command files)
- Verify shared pattern library at `.claude/references/patterns/` (9 files)
- Verify dojo-specific references in `.claude/skills/agentic-dojo/references/` (4 files)
- Verify advisor references in `.claude/skills/pattern-advisor/references/` (2 files)
- Verify `.claude/CLAUDE.md` has "Adding a New Pattern" section
- Verify envelope instruction appears twice in dojo SKILL.md (bracket pattern)
- Spot-check HOP purity: SKILL.md has zero mode-specific conditionals
- Report comprehensive PASS or FAIL with summary of all checks

## Acceptance Criteria

### Functional Requirements
- SKILL.md is a HOP with 3-step structure: Route, Read, Synthesize
- SKILL.md frontmatter uses `name: dojo`, `description` with inline triggers, `argument-hint`, `allowed-tools` -- no `use-when`
- Router has explicit defaults: no mode signal -> Sensei, no pattern match -> ask, empty args -> zero-state
- Mode detection priority cascade: prefix override > trigger word > default
- Pattern detection via alias table + keyword table + conversation fallback
- Both mode files are parameter declarations (voice ID + synthesis template + constraints)
- Both voice files use imperative framing
- SKILL.md contains zero mode-specific logic (HOP purity)
- Reference mode produces structured YAML output
- All 9 pattern files have canonical frontmatter slot maps
- Error contract handles: unknown pattern, unknown mode, multiple patterns, missing slot
- Routing envelope uses `dojo-envelope` info string with `route_reason`
- Envelope instruction bracketed (top + bottom)
- Pattern Advisor produces ranked recommendations with `/dojo` copy-paste handoffs

### Non-Functional Requirements
- SKILL.md under 250 lines (hard ceiling)
- Mode files 80-120 lines each
- Voice files 60-100 lines each
- Pattern files 80-120 lines each
- `allowed-tools: Read, Glob, Grep` (knowledge skill, not execution)
- Progressive disclosure -- only needed files loaded

## Validation Commands

- `wc -l .claude/skills/agentic-dojo/SKILL.md` -- verify under 250 lines
- `grep -c 'use-when' .claude/skills/agentic-dojo/SKILL.md` -- should be 0
- `grep 'name: dojo' .claude/skills/agentic-dojo/SKILL.md` -- should match
- `ls .claude/references/patterns/pattern-*.md | wc -l` -- should be 9
- `ls .claude/skills/agentic-dojo/references/ | wc -l` -- should be 4
- `ls .claude/skills/pattern-advisor/references/ | wc -l` -- should be 2

## Notes

- Do NOT switch branches. All work happens on the current branch (`chore/fold-claude-code-guide-findings`).
- Source pattern docs on `stage/3-full` are accessed via `git show stage/3-full:docs/patterns/<filename>`.
- The orchestrator SKILL.md on `stage/3-full` is 710 lines and uses `use-when` -- do NOT follow that convention for the dojo (proven non-functional per spike).
- Phase 4 (manual interactive testing) is excluded from team execution -- it requires a human in interactive Claude Code. The 29-test routing matrix is documented in the plan for Nathan to execute manually.
- The plan document at `docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md` is the full source of truth with all architecture decisions, review history, and v2 backlog. This spec inlines the critical content but the plan has additional depth.
